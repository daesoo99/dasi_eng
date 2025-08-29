/**
 * Web Speech API 플러그인 구현
 * @description 브라우저의 Web Speech API를 사용하는 플러그인
 */

import { BasePlugin } from '@/plugins/core/BasePlugin';
import { 
  ISpeechPlugin, 
  SpeechPluginConfig, 
  SpeechProcessingState,
  SpeechPluginEvent,
  SpeechEventHandler 
} from './ISpeechPlugin';
import { 
  SpeechResult, 
  SpeechRecognitionResult,
  SpeechResultCallback 
} from '@/types/services';
import { 
  NonEmptyString, 
  PositiveNumber, 
  Result, 
  Ok, 
  Err,
  assertNonEmptyString,
  assertPositiveNumber 
} from '@/types/core';

/**
 * Web Speech API 플러그인
 */
export class WebSpeechPlugin extends BasePlugin implements ISpeechPlugin {
  private _processingState: SpeechProcessingState = 'idle';
  private speechSynthesis?: SpeechSynthesis;
  private speechRecognition?: SpeechRecognition;
  private audioContext?: AudioContext;
  
  // 현재 처리 중인 작업들
  private currentUtterance?: SpeechSynthesisUtterance;
  private currentRecognition?: SpeechRecognition;
  
  // 이벤트 핸들러들
  private speechEventHandlers = new Set<SpeechEventHandler>();
  
  constructor() {
    super({
      name: assertNonEmptyString('web-speech', 'plugin name'),
      version: assertNonEmptyString('1.0.0', 'plugin version'),
      description: 'Web Speech API plugin for TTS and Speech Recognition',
      author: 'DaSi Team',
      tags: ['speech', 'tts', 'recognition', 'web-api']
    });
  }

  get processingState(): SpeechProcessingState {
    return this._processingState;
  }

  private setProcessingState(state: SpeechProcessingState): void {
    if (this._processingState !== state) {
      this._processingState = state;
      this.emitSpeechEvent({
        type: 'stateChange',
        timestamp: Date.now(),
        data: { state }
      });
    }
  }

  protected async onInitialize(config: SpeechPluginConfig): Promise<Result<void>> {
    return this.safeAsync(async () => {
      // Web Speech API 지원 확인
      if (!window.speechSynthesis) {
        throw new Error('SpeechSynthesis not supported');
      }

      // SpeechRecognition 지원 확인 (선택적)
      const SpeechRecognitionConstructor = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionConstructor) {
        console.warn('SpeechRecognition not supported - TTS only mode');
      }

      this.speechSynthesis = window.speechSynthesis;
      
      if (SpeechRecognitionConstructor) {
        this.speechRecognition = new SpeechRecognitionConstructor();
        this.setupRecognition();
      }

      // AudioContext for beep sounds
      if (window.AudioContext || (window as any).webkitAudioContext) {
        const AudioContextConstructor = window.AudioContext || 
                                       (window as any).webkitAudioContext;
        this.audioContext = new AudioContextConstructor();
      }

      console.log('WebSpeechPlugin initialized successfully');
    }, 'Failed to initialize WebSpeechPlugin');
  }

  protected async onDispose(): Promise<Result<void>> {
    return this.safeAsync(async () => {
      // 모든 처리 중지
      this.stopAll();
      
      // AudioContext 정리
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      // 이벤트 핸들러 정리
      this.speechEventHandlers.clear();
      
      this.speechSynthesis = undefined;
      this.speechRecognition = undefined;
      this.audioContext = undefined;
      
      console.log('WebSpeechPlugin disposed successfully');
    }, 'Failed to dispose WebSpeechPlugin');
  }

  protected validateConfig(config: SpeechPluginConfig): Result<void> {
    try {
      if (config.speechRate && (config.speechRate <= 0 || config.speechRate > 3)) {
        return Err(new Error('speechRate must be between 0 and 3'));
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  private setupRecognition(): void {
    if (!this.speechRecognition) return;

    const config = this.getConfig() as SpeechPluginConfig;
    
    this.speechRecognition.continuous = config.enableContinuous ?? false;
    this.speechRecognition.interimResults = config.enableInterimResults ?? true;
    this.speechRecognition.lang = config.recognitionLanguage || 'ko-KR';
  }

  /**
   * TTS 구현
   */
  async speakText(
    text: NonEmptyString, 
    options: {
      language?: NonEmptyString;
      rate?: PositiveNumber;
      volume?: number;
      pitch?: number;
    } = {}
  ): Promise<Result<SpeechResult>> {
    if (!this.speechSynthesis) {
      return Err(new Error('Speech synthesis not available'));
    }

    if (this._processingState === 'speaking') {
      return Err(new Error('Already speaking'));
    }

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const config = this.getConfig() as SpeechPluginConfig;
        
        // 설정 적용
        utterance.lang = options.language || config.synthesisLanguage || 'ko-KR';
        utterance.rate = options.rate || config.speechRate || 1.0;
        utterance.volume = options.volume ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;

        const startTime = Date.now();
        
        utterance.onstart = () => {
          this.setProcessingState('speaking');
          this.emitSpeechEvent({
            type: 'start',
            timestamp: Date.now()
          });
        };

        utterance.onend = () => {
          this.setProcessingState('idle');
          const duration = Date.now() - startTime;
          
          this.emitSpeechEvent({
            type: 'end',
            timestamp: Date.now()
          });

          resolve(Ok({
            success: true,
            duration: duration as PositiveNumber
          }));
        };

        utterance.onerror = (event) => {
          this.setProcessingState('error');
          const error = `TTS error: ${event.error}`;
          
          this.emitSpeechEvent({
            type: 'error',
            timestamp: Date.now(),
            data: { error }
          });

          resolve(Err(new Error(error)));
        };

        this.currentUtterance = utterance;
        this.speechSynthesis!.speak(utterance);
        
      } catch (error) {
        this.setProcessingState('error');
        resolve(Err(error as Error));
      }
    });
  }

  /**
   * 음성 인식 구현
   */
  async recognizeSpeech(
    options: {
      language?: NonEmptyString;
      maxDuration?: PositiveNumber;
      continuous?: boolean;
      interimResults?: boolean;
    } = {}
  ): Promise<Result<SpeechRecognitionResult>> {
    if (!this.speechRecognition) {
      return Err(new Error('Speech recognition not available'));
    }

    if (this._processingState === 'listening') {
      return Err(new Error('Already listening'));
    }

    return new Promise((resolve) => {
      try {
        const recognition = this.speechRecognition!;
        const config = this.getConfig() as SpeechPluginConfig;
        
        // 설정 적용
        recognition.lang = options.language || config.recognitionLanguage || 'ko-KR';
        recognition.continuous = options.continuous ?? false;
        recognition.interimResults = options.interimResults ?? true;

        let finalTranscript = '';
        let maxConfidence = 0;
        let hasResult = false;
        
        const cleanup = () => {
          this.setProcessingState('idle');
          this.currentRecognition = undefined;
        };

        recognition.onstart = () => {
          this.setProcessingState('listening');
          this.emitSpeechEvent({
            type: 'start',
            timestamp: Date.now()
          });
        };

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
              maxConfidence = Math.max(maxConfidence, result[0].confidence);
              hasResult = true;
            }

            this.emitSpeechEvent({
              type: 'result',
              timestamp: Date.now(),
              data: {
                transcript: result[0].transcript as NonEmptyString,
                confidence: result[0].confidence
              }
            });
          }
        };

        recognition.onend = () => {
          cleanup();
          
          this.emitSpeechEvent({
            type: 'end',
            timestamp: Date.now()
          });

          if (hasResult && finalTranscript.trim()) {
            resolve(Ok({
              success: true,
              transcript: finalTranscript.trim() as NonEmptyString,
              confidence: maxConfidence,
              isFinal: true
            }));
          } else {
            resolve(Ok({
              success: false,
              error: 'No speech detected'
            }));
          }
        };

        recognition.onerror = (event) => {
          cleanup();
          const error = `Speech recognition error: ${event.error}`;
          
          this.emitSpeechEvent({
            type: 'error',
            timestamp: Date.now(),
            data: { error }
          });

          resolve(Err(new Error(error)));
        };

        // 타임아웃 처리
        if (options.maxDuration) {
          setTimeout(() => {
            if (this._processingState === 'listening') {
              recognition.stop();
            }
          }, options.maxDuration);
        }

        this.currentRecognition = recognition;
        recognition.start();
        
      } catch (error) {
        this.setProcessingState('error');
        resolve(Err(error as Error));
      }
    });
  }

  /**
   * 실시간 음성 인식 시작
   */
  startListening(
    onResult: SpeechResultCallback,
    options: {
      language?: NonEmptyString;
      continuous?: boolean;
      interimResults?: boolean;
    } = {}
  ): Result<void> {
    if (!this.speechRecognition) {
      return Err(new Error('Speech recognition not available'));
    }

    if (this._processingState === 'listening') {
      return Err(new Error('Already listening'));
    }

    try {
      const recognition = this.speechRecognition;
      const config = this.getConfig() as SpeechPluginConfig;
      
      recognition.lang = options.language || config.recognitionLanguage || 'ko-KR';
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          onResult(
            result[0].transcript as NonEmptyString,
            result[0].confidence
          );
        }
      };

      recognition.onstart = () => {
        this.setProcessingState('listening');
      };

      recognition.onend = () => {
        this.setProcessingState('idle');
        // 자동 재시작 (continuous 모드에서)
        if (options.continuous && config.autoRestart) {
          setTimeout(() => {
            if (this._processingState === 'idle') {
              recognition.start();
            }
          }, 100);
        }
      };

      recognition.onerror = (event) => {
        this.setProcessingState('error');
        console.error('Speech recognition error:', event.error);
      };

      this.currentRecognition = recognition;
      recognition.start();
      
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 음성 인식 중지
   */
  stopListening(): Result<void> {
    if (!this.currentRecognition) {
      return Ok(undefined);
    }

    try {
      this.currentRecognition.stop();
      this.currentRecognition = undefined;
      this.setProcessingState('idle');
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 신호음 재생
   */
  async playBeep(
    options: {
      frequency?: PositiveNumber;
      duration?: PositiveNumber;
      volume?: number;
    } = {}
  ): Promise<Result<void>> {
    if (!this.audioContext) {
      return Err(new Error('AudioContext not available'));
    }

    return this.safeAsync(async () => {
      const context = this.audioContext!;
      const frequency = options.frequency || (800 as PositiveNumber);
      const duration = options.duration || (200 as PositiveNumber);
      const volume = options.volume ?? 0.3;

      // AudioContext가 suspended 상태면 resume
      if (context.state === 'suspended') {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration / 1000);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration / 1000);
      
      return new Promise<void>((resolve) => {
        oscillator.onended = () => resolve();
      });
    }, 'Failed to play beep');
  }

  /**
   * 모든 처리 중지
   */
  stopAll(): Result<void> {
    try {
      // TTS 중지
      if (this.speechSynthesis && this._processingState === 'speaking') {
        this.speechSynthesis.cancel();
        this.currentUtterance = undefined;
      }

      // 음성 인식 중지
      if (this.currentRecognition && this._processingState === 'listening') {
        this.currentRecognition.stop();
        this.currentRecognition = undefined;
      }

      this.setProcessingState('idle');
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 처리 중인지 확인
   */
  isProcessing(): boolean {
    return this._processingState !== 'idle';
  }

  /**
   * 지원 언어 목록
   */
  async getSupportedLanguages(): Promise<Result<readonly string[]>> {
    return this.safeAsync(async () => {
      // Web Speech API는 정확한 언어 목록을 제공하지 않으므로 일반적인 언어들 반환
      return [
        'ko-KR', 'en-US', 'en-GB', 'ja-JP', 'zh-CN', 'zh-TW',
        'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU'
      ];
    }, 'Failed to get supported languages');
  }

  /**
   * 사용 가능한 음성 목록
   */
  async getAvailableVoices(): Promise<Result<readonly SpeechSynthesisVoice[]>> {
    if (!this.speechSynthesis) {
      return Err(new Error('Speech synthesis not available'));
    }

    return this.safeAsync(async () => {
      return new Promise<readonly SpeechSynthesisVoice[]>((resolve) => {
        const getVoices = () => {
          const voices = this.speechSynthesis!.getVoices();
          if (voices.length > 0) {
            resolve(voices);
          } else {
            // 일부 브라우저에서는 비동기적으로 로드됨
            setTimeout(getVoices, 100);
          }
        };
        getVoices();
      });
    }, 'Failed to get available voices');
  }

  /**
   * Speech 이벤트 핸들러 등록
   */
  onSpeechEvent(handler: SpeechEventHandler): void {
    this.speechEventHandlers.add(handler);
  }

  /**
   * Speech 이벤트 핸들러 제거
   */
  offSpeechEvent(handler: SpeechEventHandler): void {
    this.speechEventHandlers.delete(handler);
  }

  /**
   * Speech 이벤트 발생
   */
  private emitSpeechEvent(event: SpeechPluginEvent): void {
    this.speechEventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Speech event handler error:', error);
      }
    });
  }
}