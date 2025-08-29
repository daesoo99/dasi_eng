/**
 * SpeechProcessingService - 음성 처리 비즈니스 로직 전용 서비스
 * 목적: 음성 인식 및 합성 관련 비즈니스 로직을 캡슐화
 */

import { 
  ISpeechRecognitionAdapter, 
  ISpeechSynthesisAdapter,
  RecognitionResult,
  SynthesisOptions,
  RecognitionOptions 
} from '@/adapters/BrowserAPIAdapter';

export interface SpeechProcessingOptions {
  recognitionLanguage?: string;
  synthesisLanguage?: string;
  speechRate?: number;
  confidenceThreshold?: number;
}

export interface ProcessingResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: string;
}

export class SpeechProcessingService {
  private recognitionAdapter: ISpeechRecognitionAdapter;
  private synthesisAdapter: ISpeechSynthesisAdapter;
  
  // 기본 설정
  private defaultOptions: SpeechProcessingOptions = {
    recognitionLanguage: 'en-US',
    synthesisLanguage: 'ko-KR',
    speechRate: 0.9,
    confidenceThreshold: 0.6
  };

  constructor(
    recognitionAdapter: ISpeechRecognitionAdapter,
    synthesisAdapter: ISpeechSynthesisAdapter,
    options: Partial<SpeechProcessingOptions> = {}
  ) {
    this.recognitionAdapter = recognitionAdapter;
    this.synthesisAdapter = synthesisAdapter;
    this.defaultOptions = { ...this.defaultOptions, ...options };
    
    console.log('[SpeechProcessingService] Initialized with options:', this.defaultOptions);
  }

  /**
   * 한국어 문제 텍스트를 음성으로 재생
   */
  async speakQuestion(questionText: string, options?: Partial<SynthesisOptions>): Promise<ProcessingResult> {
    try {
      if (!questionText.trim()) {
        return {
          success: false,
          error: 'Question text cannot be empty'
        };
      }

      const synthesisOptions: SynthesisOptions = {
        lang: this.defaultOptions.synthesisLanguage,
        rate: this.defaultOptions.speechRate,
        pitch: 1.0,
        volume: 1.0,
        ...options
      };

      console.log('[SpeechProcessingService] Speaking question:', {
        text: questionText.substring(0, 30) + '...',
        options: synthesisOptions
      });

      const result = await this.synthesisAdapter.speak(questionText, synthesisOptions);
      
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to speak question'
        };
      }

    } catch (error) {
      console.error('[SpeechProcessingService] Question speech error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown speech error'
      };
    }
  }

  /**
   * 영어 답변 텍스트를 음성으로 재생
   */
  async speakAnswer(answerText: string, options?: Partial<SynthesisOptions>): Promise<ProcessingResult> {
    try {
      if (!answerText.trim()) {
        return {
          success: false,
          error: 'Answer text cannot be empty'
        };
      }

      const synthesisOptions: SynthesisOptions = {
        lang: this.defaultOptions.recognitionLanguage, // 영어로 답변
        rate: this.defaultOptions.speechRate,
        pitch: 1.0,
        volume: 1.0,
        ...options
      };

      console.log('[SpeechProcessingService] Speaking answer:', {
        text: answerText.substring(0, 30) + '...',
        options: synthesisOptions
      });

      const result = await this.synthesisAdapter.speak(answerText, synthesisOptions);
      
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to speak answer'
        };
      }

    } catch (error) {
      console.error('[SpeechProcessingService] Answer speech error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown speech error'
      };
    }
  }

  /**
   * 사용자 음성 인식 처리
   */
  async recognizeSpeech(
    onResult: (transcript: string, confidence: number) => void,
    onError?: (error: string) => void,
    options?: Partial<RecognitionOptions>
  ): Promise<ProcessingResult> {
    try {
      // 지원 여부 확인
      const supportResult = this.validateRecognitionSupport();
      if (!supportResult.success) {
        return supportResult;
      }

      // 옵션 설정
      const recognitionOptions = this.prepareRecognitionOptions(options);
      console.log('[SpeechProcessingService] Starting speech recognition:', recognitionOptions);

      // 이벤트 핸들러 설정
      this.setupRecognitionEventHandlers(onResult, onError);

      // 인식 시작
      return await this.startSpeechRecognition(recognitionOptions);

    } catch (error) {
      return this.handleRecognitionError(error);
    }
  }

  /**
   * 음성 인식 지원 여부 검증
   */
  private validateRecognitionSupport(): ProcessingResult {
    if (!this.recognitionAdapter.isSupported()) {
      return {
        success: false,
        error: 'Speech recognition not supported'
      };
    }
    
    return { success: true };
  }

  /**
   * 음성 인식 옵션 준비
   */
  private prepareRecognitionOptions(options?: Partial<RecognitionOptions>): RecognitionOptions {
    return {
      language: this.defaultOptions.recognitionLanguage,
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      ...options
    };
  }

  /**
   * 음성 인식 이벤트 핸들러 설정
   */
  private setupRecognitionEventHandlers(
    onResult: (transcript: string, confidence: number) => void,
    onError?: (error: string) => void
  ): void {
    // 결과 처리 핸들러
    this.recognitionAdapter.onResult((result: RecognitionResult) => {
      this.handleRecognitionResult(result, onResult, onError);
    });

    // 에러 처리 핸들러
    this.recognitionAdapter.onError((error: string) => {
      console.error('[SpeechProcessingService] Recognition error:', error);
      if (onError) {
        onError(error);
      }
    });

    // 종료 처리 핸들러
    this.recognitionAdapter.onEnd(() => {
      console.log('[SpeechProcessingService] Recognition ended');
    });
  }

  /**
   * 음성 인식 결과 처리
   */
  private handleRecognitionResult(
    result: RecognitionResult,
    onResult: (transcript: string, confidence: number) => void,
    onError?: (error: string) => void
  ): void {
    console.log('[SpeechProcessingService] Recognition result received:', {
      transcript: result.transcript,
      confidence: result.confidence,
      isFinal: result.isFinal
    });

    // 신뢰도 검증
    if (this.isConfidenceAcceptable(result.confidence)) {
      onResult(result.transcript, result.confidence);
    } else {
      this.handleLowConfidenceResult(result.confidence, onError);
    }
  }

  /**
   * 신뢰도 수준 검증
   */
  private isConfidenceAcceptable(confidence: number): boolean {
    return confidence >= this.defaultOptions.confidenceThreshold!;
  }

  /**
   * 낮은 신뢰도 결과 처리
   */
  private handleLowConfidenceResult(confidence: number, onError?: (error: string) => void): void {
    console.warn('[SpeechProcessingService] Low confidence result ignored:', {
      confidence: confidence,
      threshold: this.defaultOptions.confidenceThreshold
    });
    
    if (onError) {
      onError(`Low confidence: ${confidence}`);
    }
  }

  /**
   * 음성 인식 시작
   */
  private async startSpeechRecognition(options: RecognitionOptions): Promise<ProcessingResult> {
    const startResult = await this.recognitionAdapter.startRecognition(options);
    
    if (startResult.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: startResult.error || 'Failed to start recognition'
      };
    }
  }

  /**
   * 음성 인식 에러 처리
   */
  private handleRecognitionError(error: unknown): ProcessingResult {
    console.error('[SpeechProcessingService] Recognition setup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown recognition error'
    };
  }

  /**
   * 음성 인식 중지
   */
  stopRecognition(): void {
    console.log('[SpeechProcessingService] Stopping speech recognition');
    this.recognitionAdapter.stopRecognition();
  }

  /**
   * 음성 합성 일시정지
   */
  pauseSpeech(): void {
    console.log('[SpeechProcessingService] Pausing speech synthesis');
    this.synthesisAdapter.pause();
  }

  /**
   * 음성 합성 재개
   */
  resumeSpeech(): void {
    console.log('[SpeechProcessingService] Resuming speech synthesis');
    this.synthesisAdapter.resume();
  }

  /**
   * 모든 음성 작업 중지
   */
  stopAllSpeech(): void {
    console.log('[SpeechProcessingService] Stopping all speech operations');
    this.synthesisAdapter.cancel();
    this.recognitionAdapter.stopRecognition();
  }

  /**
   * 서비스 상태 확인
   */
  getStatus(): {
    recognitionSupported: boolean;
    synthesisSupported: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
  } {
    return {
      recognitionSupported: this.recognitionAdapter.isSupported(),
      synthesisSupported: this.synthesisAdapter.isSupported(),
      isSpeaking: this.synthesisAdapter.isSpeaking(),
      isPaused: this.synthesisAdapter.isPaused()
    };
  }

  /**
   * 설정 업데이트
   */
  updateOptions(options: Partial<SpeechProcessingOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    console.log('[SpeechProcessingService] Options updated:', this.defaultOptions);
  }

  /**
   * 현재 설정 조회
   */
  getOptions(): SpeechProcessingOptions {
    return { ...this.defaultOptions };
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    console.log('[SpeechProcessingService] Cleaning up...');
    this.stopAllSpeech();
    this.recognitionAdapter.cleanup();
    this.synthesisAdapter.cleanup();
    console.log('[SpeechProcessingService] Cleanup completed');
  }
}