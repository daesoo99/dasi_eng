/**
 * SpeechRecognitionAdapter - Web Speech API 래핑
 * 목적: Web Speech Recognition API를 추상화하여 테스트 가능하고 의존성 분리된 구조 제공
 */

import {
  ISpeechRecognitionAdapter,
  AdapterResult,
  RecognitionResult,
  RecognitionOptions
} from './BrowserAPIAdapter';

export class SpeechRecognitionAdapter implements ISpeechRecognitionAdapter {
  private recognition: SpeechRecognition | null = null;
  private isInitialized = false;
  
  // 콜백 저장
  private resultCallback: ((result: RecognitionResult) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private endCallback: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('[SpeechRecognitionAdapter] Speech recognition not supported');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.setupDefaultConfiguration();
      this.setupEventHandlers();
      this.isInitialized = true;
      
      console.log('[SpeechRecognitionAdapter] Initialized successfully');
    } catch (error) {
      console.error('[SpeechRecognitionAdapter] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  private setupDefaultConfiguration(): void {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = 'en-US';
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      try {
        const result = event.results[0];
        if (result && this.resultCallback) {
          const transcript = result[0].transcript.trim();
          const confidence = result[0].confidence || 0.8;
          
          console.log('[SpeechRecognitionAdapter] Recognition result:', {
            transcript,
            confidence,
            isFinal: result.isFinal
          });

          this.resultCallback({
            transcript,
            confidence,
            isFinal: result.isFinal
          });
        }
      } catch (error) {
        console.error('[SpeechRecognitionAdapter] Result processing error:', error);
        this.handleError('Result processing failed');
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[SpeechRecognitionAdapter] Recognition error:', event.error);
      this.handleError(event.error);
    };

    this.recognition.onend = () => {
      console.log('[SpeechRecognitionAdapter] Recognition ended');
      if (this.endCallback) {
        this.endCallback();
      }
    };

    this.recognition.onstart = () => {
      console.log('[SpeechRecognitionAdapter] Recognition started');
    };

    this.recognition.onnomatch = () => {
      console.warn('[SpeechRecognitionAdapter] No speech match found');
      this.handleError('No speech recognized');
    };
  }

  private handleError(errorMessage: string): void {
    if (this.errorCallback) {
      this.errorCallback(errorMessage);
    }
  }

  // Public Methods

  isSupported(): boolean {
    return this.isInitialized && this.recognition !== null;
  }

  async startRecognition(options?: RecognitionOptions): Promise<AdapterResult<RecognitionResult>> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Speech recognition not supported or not initialized'
      };
    }

    try {
      // 옵션 적용
      if (options) {
        this.applyOptions(options);
      }

      // 기존 인식이 진행 중이면 중지
      this.stopRecognition();

      return new Promise((resolve) => {
        // 임시로 result callback 설정
        const originalCallback = this.resultCallback;
        
        this.resultCallback = (result: RecognitionResult) => {
          // 원래 콜백도 실행
          if (originalCallback) {
            originalCallback(result);
          }
          
          // Promise resolve
          resolve({
            success: true,
            data: result
          });
        };

        // 에러 콜백 설정
        const originalErrorCallback = this.errorCallback;
        this.errorCallback = (error: string) => {
          // 원래 콜백도 실행
          if (originalErrorCallback) {
            originalErrorCallback(error);
          }
          
          // Promise resolve with error
          resolve({
            success: false,
            error
          });
        };

        // 인식 시작
        this.recognition!.start();
        console.log('[SpeechRecognitionAdapter] Started recognition with options:', options);
      });

    } catch (error) {
      console.error('[SpeechRecognitionAdapter] Failed to start recognition:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private applyOptions(options: RecognitionOptions): void {
    if (!this.recognition) return;

    if (options.language) {
      this.recognition.lang = options.language;
    }
    
    if (typeof options.continuous === 'boolean') {
      this.recognition.continuous = options.continuous;
    }
    
    if (typeof options.interimResults === 'boolean') {
      this.recognition.interimResults = options.interimResults;
    }
    
    if (options.maxAlternatives) {
      this.recognition.maxAlternatives = options.maxAlternatives;
    }
  }

  stopRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log('[SpeechRecognitionAdapter] Recognition stopped');
      } catch (error) {
        console.warn('[SpeechRecognitionAdapter] Error stopping recognition:', error);
      }
    }
  }

  onResult(callback: (result: RecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.endCallback = callback;
  }

  cleanup(): void {
    console.log('[SpeechRecognitionAdapter] Cleaning up...');
    
    this.stopRecognition();
    
    // 콜백 제거
    this.resultCallback = null;
    this.errorCallback = null;
    this.endCallback = null;
    
    // 이벤트 핸들러 제거
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.onstart = null;
      this.recognition.onnomatch = null;
    }
    
    console.log('[SpeechRecognitionAdapter] Cleanup completed');
  }
}

// 글로벌 타입 선언 확장
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}