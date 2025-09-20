/**
 * SpeechSynthesisAdapter - Web Speech Synthesis API 래핑
 * 목적: Text-to-Speech 기능을 추상화하여 useSpeech 의존성 제거
 */

import {
  ISpeechSynthesisAdapter,
  AdapterResult,
  SynthesisOptions
} from './BrowserAPIAdapter';

export class SpeechSynthesisAdapter implements ISpeechSynthesisAdapter {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private isInitialized = false;
  
  // 음성 목록 캐시
  private voiceCache: SpeechSynthesisVoice[] = [];
  private voiceCacheTime = 0;
  private readonly VOICE_CACHE_DURATION = 60000; // 1분

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.isInitialized = true;
        this.setupEventHandlers();
        console.log('[SpeechSynthesisAdapter] Initialized successfully');
      } else {
        console.warn('[SpeechSynthesisAdapter] Speech synthesis not supported');
      }
    } catch (error) {
      console.error('[SpeechSynthesisAdapter] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.synth) return;

    // 음성 목록이 로드될 때까지 기다림
    this.synth.onvoiceschanged = () => {
      console.log('[SpeechSynthesisAdapter] Voices updated');
      this.refreshVoiceCache();
    };
  }

  private refreshVoiceCache(): void {
    if (this.synth) {
      this.voiceCache = this.synth.getVoices();
      this.voiceCacheTime = Date.now();
      console.log(`[SpeechSynthesisAdapter] Voice cache updated: ${this.voiceCache.length} voices`);
    }
  }

  // Public Methods

  isSupported(): boolean {
    return this.isInitialized && this.synth !== null;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];

    // 캐시된 음성 목록이 유효한지 확인
    const now = Date.now();
    if (this.voiceCache.length === 0 || (now - this.voiceCacheTime) > this.VOICE_CACHE_DURATION) {
      this.refreshVoiceCache();
    }

    return this.voiceCache;
  }

  async speak(text: string, options: SynthesisOptions = {}): Promise<AdapterResult<void>> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Speech synthesis not supported'
      };
    }

    if (!text.trim()) {
      return {
        success: false,
        error: 'Text cannot be empty'
      };
    }

    try {
      // 기존 음성 중지 및 큐 정리
      this.cancel();

      return new Promise((resolve) => {
        const utterance = this.createUtterance(text, options);
        
        // 이벤트 핸들러 설정
        utterance.onend = () => {
          console.log('[SpeechSynthesisAdapter] Speech completed');
          this.handleUtteranceEnd(utterance);
          resolve({ success: true });
        };

        utterance.onerror = (event) => {
          console.error('[SpeechSynthesisAdapter] Speech error:', event.error);
          this.handleUtteranceEnd(utterance);
          resolve({ 
            success: false, 
            error: `TTS error: ${event.error}` 
          });
        };

        utterance.onstart = () => {
          console.log('[SpeechSynthesisAdapter] Speech started');
        };

        utterance.onpause = () => {
          console.log('[SpeechSynthesisAdapter] Speech paused');
        };

        utterance.onresume = () => {
          console.log('[SpeechSynthesisAdapter] Speech resumed');
        };

        // 큐에 추가하고 재생
        this.currentUtterance = utterance;
        this.utteranceQueue.push(utterance);
        this.synth!.speak(utterance);

        console.log('[SpeechSynthesisAdapter] Speech queued:', {
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          options
        });
      });

    } catch (error) {
      console.error('[SpeechSynthesisAdapter] Failed to speak:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown speech error'
      };
    }
  }

  private createUtterance(text: string, options: SynthesisOptions): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 옵션 적용
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    // 음성 설정
    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      // 언어에 맞는 기본 음성 선택
      const voices = this.getVoices();
      const langCode = utterance.lang || 'en-US';
      const matchingVoice = voices.find(voice =>
        voice.lang.startsWith(langCode?.split('-')[0] || 'en')
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    return utterance;
  }

  private handleUtteranceEnd(utterance: SpeechSynthesisUtterance): void {
    // 현재 발화 초기화
    if (this.currentUtterance === utterance) {
      this.currentUtterance = null;
    }

    // 큐에서 제거
    this.removeFromQueue(utterance);

    // 이벤트 핸들러 정리
    utterance.onend = null;
    utterance.onerror = null;
    utterance.onstart = null;
    utterance.onpause = null;
    utterance.onresume = null;
  }

  pause(): void {
    if (this.isSupported() && this.synth!.speaking) {
      this.synth!.pause();
      console.log('[SpeechSynthesisAdapter] Speech paused');
    }
  }

  resume(): void {
    if (this.isSupported() && this.synth!.paused) {
      this.synth!.resume();
      console.log('[SpeechSynthesisAdapter] Speech resumed');
    }
  }

  cancel(): void {
    if (!this.isSupported()) return;

    try {
      this.synth!.cancel();
      this.currentUtterance = null;
      this.clearQueue();
      console.log('[SpeechSynthesisAdapter] Speech cancelled');
    } catch (error) {
      console.warn('[SpeechSynthesisAdapter] Error cancelling speech:', error);
    }
  }

  isPaused(): boolean {
    return this.isSupported() && this.synth!.paused;
  }

  isSpeaking(): boolean {
    return this.isSupported() && this.synth!.speaking;
  }

  private clearQueue(): void {
    // 큐의 모든 발화에 대해 이벤트 핸들러 정리
    this.utteranceQueue.forEach(utterance => {
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onstart = null;
      utterance.onpause = null;
      utterance.onresume = null;
    });
    
    this.utteranceQueue = [];
  }

  private removeFromQueue(utterance: SpeechSynthesisUtterance): void {
    const index = this.utteranceQueue.indexOf(utterance);
    if (index > -1) {
      this.utteranceQueue.splice(index, 1);
    }
  }

  cleanup(): void {
    console.log('[SpeechSynthesisAdapter] Cleaning up...');
    
    // 모든 음성 중지
    this.cancel();
    
    // 이벤트 핸들러 제거
    if (this.synth) {
      this.synth.onvoiceschanged = null;
    }
    
    // 캐시 정리
    this.voiceCache = [];
    this.voiceCacheTime = 0;
    
    console.log('[SpeechSynthesisAdapter] Cleanup completed');
  }

  // 유틸리티 메서드들
  
  /**
   * 특정 언어의 음성 목록 가져오기
   */
  getVoicesByLanguage(language: string): SpeechSynthesisVoice[] {
    return this.getVoices().filter(voice => 
      voice.lang.toLowerCase().startsWith(language.toLowerCase())
    );
  }

  /**
   * 기본 음성 가져오기
   */
  getDefaultVoice(language?: string): SpeechSynthesisVoice | null {
    const voices = language ? this.getVoicesByLanguage(language) : this.getVoices();
    return voices.find(voice => voice.default) || voices[0] || null;
  }

  /**
   * 현재 상태 정보
   */
  getStatus(): {
    isSupported: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    queueLength: number;
    availableVoices: number;
  } {
    return {
      isSupported: this.isSupported(),
      isSpeaking: this.isSpeaking(),
      isPaused: this.isPaused(),
      queueLength: this.utteranceQueue.length,
      availableVoices: this.getVoices().length
    };
  }
}