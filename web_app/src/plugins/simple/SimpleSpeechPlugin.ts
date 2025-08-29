/**
 * 단순화된 Speech 플러그인
 * @description 과도한 추상화 제거, 취소 지원, 표준 에러 처리
 */

import { 
  ISpeechPlugin, 
  SpeechOptions, 
  RecognitionOptions,
  SpeechResult, 
  RecognitionResult,
  Result,
  Ok,
  CommonErrors,
  withTimeout,
  TimeoutController
} from './SimplePluginSystem';

/**
 * 웹 브라우저 Speech API를 사용하는 단순한 구현
 */
export class SimpleSpeechPlugin implements ISpeechPlugin {
  readonly name = 'simple-speech';
  readonly version = '1.0.0';
  
  private synthesis?: SpeechSynthesis;
  private recognition?: SpeechRecognition;
  private audioContext?: AudioContext;
  
  // 현재 실행 중인 작업들 (취소용)
  private currentSpeech?: {
    utterance: SpeechSynthesisUtterance;
    controller: AbortController;
  };
  
  private currentRecognition?: {
    recognition: SpeechRecognition;
    controller: AbortController;
  };

  /**
   * 초기화
   */
  async initialize(): Promise<Result<void>> {
    try {
      // Speech Synthesis 확인
      if (!window.speechSynthesis) {
        return CommonErrors.UNSUPPORTED('speechSynthesis');
      }
      this.synthesis = window.speechSynthesis;

      // Speech Recognition 확인 (선택적)
      const SpeechRecognition = window.SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
      }

      // AudioContext 확인 (신호음용)
      const AudioContext = window.AudioContext || 
                           (window as any).webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }

      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Initialization failed: ${error}`);
    }
  }

  /**
   * 정리
   */
  async dispose(): Promise<Result<void>> {
    try {
      // 모든 작업 중지
      this.stopAll('dispose');
      
      // AudioContext 정리
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Dispose failed: ${error}`);
    }
  }

  /**
   * 텍스트 음성 변환 (취소 지원)
   */
  async speakText(text: string, opts: SpeechOptions = {}): Promise<Result<SpeechResult>> {
    if (!this.synthesis) {
      return CommonErrors.UNSUPPORTED('speechSynthesis');
    }

    if (!text.trim()) {
      return CommonErrors.INVALID_INPUT('text cannot be empty');
    }

    // 기존 음성 중지
    if (this.currentSpeech) {
      this.currentSpeech.controller.abort('new-request');
    }

    const controller = new AbortController();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 설정 적용
    if (opts.language) utterance.lang = opts.language;
    if (opts.rate) utterance.rate = Math.max(0.1, Math.min(10, opts.rate));

    this.currentSpeech = { utterance, controller };

    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;

      const cleanup = () => {
        if (this.currentSpeech?.utterance === utterance) {
          this.currentSpeech = undefined;
        }
        resolved = true;
      };

      // 취소 처리
      const handleAbort = () => {
        if (resolved) return;
        cleanup();
        this.synthesis!.cancel();
        resolve(CommonErrors.ABORTED(controller.signal.reason || 'unknown'));
      };

      // 외부 signal 연결
      if (opts.signal) {
        opts.signal.addEventListener('abort', handleAbort);
      }
      
      controller.signal.addEventListener('abort', handleAbort);

      // 음성 이벤트 처리
      utterance.onstart = () => {
        if (resolved) return;
        console.log(`[Speech] Started: "${text}"`);
      };

      utterance.onend = () => {
        if (resolved) return;
        cleanup();
        
        const duration = Date.now() - startTime;
        resolve(Ok({
          duration,
          actualText: text
        }));
      };

      utterance.onerror = (event) => {
        if (resolved) return;
        cleanup();
        
        const errorMap: Record<string, typeof CommonErrors[keyof typeof CommonErrors]> = {
          'not-allowed': CommonErrors.PERMISSION_DENIED,
          'network': CommonErrors.NETWORK,
          'synthesis-unavailable': CommonErrors.UNSUPPORTED,
          'synthesis-failed': CommonErrors.INTERNAL,
          'language-unavailable': () => CommonErrors.UNSUPPORTED(`language: ${opts.language}`),
          'voice-unavailable': CommonErrors.UNSUPPORTED,
          'text-too-long': () => CommonErrors.INVALID_INPUT('text too long'),
          'rate-not-supported': () => CommonErrors.INVALID_INPUT(`rate: ${opts.rate}`),
          'interrupted': CommonErrors.ABORTED,
          'paused': CommonErrors.ABORTED
        };

        const errorFn = errorMap[event.error] || CommonErrors.INTERNAL;
        resolve(typeof errorFn === 'function' ? errorFn() : errorFn(`TTS error: ${event.error}`));
      };

      try {
        this.synthesis!.speak(utterance);
      } catch (error) {
        if (resolved) return;
        cleanup();
        resolve(CommonErrors.INTERNAL(`Speech failed: ${error}`));
      }
    });
  }

  /**
   * 음성 인식 (취소 지원)
   */
  async recognizeSpeech(opts: RecognitionOptions = {}): Promise<Result<RecognitionResult>> {
    if (!this.recognition) {
      return CommonErrors.UNSUPPORTED('speechRecognition');
    }

    // 기존 인식 중지
    if (this.currentRecognition) {
      this.currentRecognition.controller.abort('new-request');
    }

    const controller = new AbortController();
    const recognition = new (window.SpeechRecognition || 
                            (window as any).webkitSpeechRecognition)();
    
    // 설정 적용
    recognition.lang = opts.language || 'ko-KR';
    recognition.continuous = opts.continuous || false;
    recognition.interimResults = true;

    this.currentRecognition = { recognition, controller };

    const recognitionPromise = new Promise<RecognitionResult>((resolve, reject) => {
      let finalTranscript = '';
      let maxConfidence = 0;
      let resolved = false;

      const cleanup = () => {
        if (this.currentRecognition?.recognition === recognition) {
          this.currentRecognition = undefined;
        }
        resolved = true;
      };

      // 취소 처리
      const handleAbort = () => {
        if (resolved) return;
        cleanup();
        try { recognition.stop(); } catch {}
        reject(new Error('aborted'));
      };

      if (opts.signal) {
        opts.signal.addEventListener('abort', handleAbort);
      }
      
      controller.signal.addEventListener('abort', handleAbort);

      // 타임아웃 처리
      let timeoutId: NodeJS.Timeout | undefined;
      if (opts.maxDuration && opts.maxDuration > 0) {
        timeoutId = setTimeout(() => {
          if (resolved) return;
          cleanup();
          try { recognition.stop(); } catch {}
          reject(new Error('timeout'));
        }, opts.maxDuration);
      }

      recognition.onstart = () => {
        console.log('[Speech Recognition] Started');
      };

      recognition.onresult = (event) => {
        if (resolved) return;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            maxConfidence = Math.max(maxConfidence, result[0].confidence);
          }
        }
      };

      recognition.onend = () => {
        if (resolved) return;
        cleanup();
        if (timeoutId) clearTimeout(timeoutId);
        
        if (finalTranscript.trim()) {
          resolve({
            transcript: finalTranscript.trim(),
            confidence: maxConfidence,
            isFinal: true
          });
        } else {
          reject(new Error('no-speech'));
        }
      };

      recognition.onerror = (event) => {
        if (resolved) return;
        cleanup();
        if (timeoutId) clearTimeout(timeoutId);
        
        reject(new Error(event.error));
      };

      try {
        recognition.start();
      } catch (error) {
        cleanup();
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    });

    // withTimeout으로 감싸서 표준 Result 반환
    return withTimeout(recognitionPromise, opts.maxDuration || 30000, opts.signal)
      .then(result => {
        if (!result.ok) {
          // 에러 타입별 매핑
          if (result.code === 'E_TIMEOUT') return result;
          if (result.code === 'E_ABORTED') return result;
          
          const cause = result.cause || 'unknown';
          if (cause.includes('not-allowed')) return CommonErrors.PERMISSION_DENIED();
          if (cause.includes('network')) return CommonErrors.NETWORK();
          if (cause.includes('no-speech')) return CommonErrors.INVALID_INPUT('no speech detected');
          
          return CommonErrors.INTERNAL(cause);
        }
        return result;
      });
  }

  /**
   * 신호음 재생 (취소 지원)
   */
  async playBeep(frequency = 800, duration = 200): Promise<Result<void>> {
    if (!this.audioContext) {
      return CommonErrors.UNSUPPORTED('audioContext');
    }

    try {
      const context = this.audioContext;
      
      // AudioContext 활성화
      if (context.state === 'suspended') {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // 부드러운 페이드 인/아웃
      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
      
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
      
      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Beep failed: ${error}`);
    }
  }

  /**
   * 모든 작업 중지
   */
  stopAll(reason: 'user' | 'navigate' | 'error' = 'user'): Result<void> {
    try {
      // TTS 중지
      if (this.currentSpeech) {
        this.currentSpeech.controller.abort(reason);
        this.synthesis?.cancel();
      }

      // STT 중지
      if (this.currentRecognition) {
        this.currentRecognition.controller.abort(reason);
      }

      return Ok(undefined);
    } catch (error) {
      return CommonErrors.INTERNAL(`Stop failed: ${error}`);
    }
  }

  /**
   * 처리 중인지 확인
   */
  isProcessing(): boolean {
    return !!(this.currentSpeech || this.currentRecognition);
  }
}

// ===== React Hook (단순화된 버전) =====
import { useState, useEffect, useCallback } from 'react';
import { simplePluginManager } from './SimplePluginSystem';

export function useSimpleSpeech() {
  const [plugin, setPlugin] = useState<SimpleSpeechPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        // 플러그인 생성 및 등록 (한 번만)
        let speechPlugin = simplePluginManager.get<SimpleSpeechPlugin>('speech');
        if (!speechPlugin.ok) {
          const newPlugin = new SimpleSpeechPlugin();
          const registerResult = simplePluginManager.register('speech', newPlugin);
          if (!registerResult.ok) {
            throw new Error(registerResult.cause);
          }
          
          const initResult = await newPlugin.initialize();
          if (!initResult.ok) {
            throw new Error(initResult.cause);
          }
          
          setPlugin(newPlugin);
        } else {
          setPlugin(speechPlugin.data);
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const speakText = useCallback(async (
    text: string, 
    options?: SpeechOptions
  ): Promise<boolean> => {
    if (!plugin) return false;
    
    const result = await plugin.speakText(text, options);
    if (!result.ok) {
      setError(result.cause || result.code);
      return false;
    }
    
    return true;
  }, [plugin]);

  const recognizeSpeech = useCallback(async (
    options?: RecognitionOptions
  ): Promise<{ success: boolean; transcript?: string; confidence?: number }> => {
    if (!plugin) return { success: false };
    
    const result = await plugin.recognizeSpeech(options);
    if (!result.ok) {
      setError(result.cause || result.code);
      return { success: false };
    }
    
    return {
      success: true,
      transcript: result.data.transcript,
      confidence: result.data.confidence
    };
  }, [plugin]);

  const playBeep = useCallback(async (): Promise<boolean> => {
    if (!plugin) return false;
    
    const result = await plugin.playBeep();
    if (!result.ok) {
      setError(result.cause || result.code);
      return false;
    }
    
    return true;
  }, [plugin]);

  const stopAll = useCallback((): boolean => {
    if (!plugin) return false;
    
    const result = plugin.stopAll('user');
    if (!result.ok) {
      setError(result.cause || result.code);
      return false;
    }
    
    return true;
  }, [plugin]);

  return {
    // 상태
    isLoading,
    error,
    isProcessing: plugin?.isProcessing() || false,
    
    // 메서드
    speakText,
    recognizeSpeech,
    playBeep,
    stopAll,
    
    // 직접 플러그인 접근 (고급 사용)
    plugin
  };
}