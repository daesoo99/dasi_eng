/**
 * MockSpeechProcessingService - 테스트용 음성 처리 서비스 Mock
 * 목적: 실제 Web API 없이 음성 처리 로직 테스트
 */

import type { ISpeechProcessingService } from '@/container/ServiceContainer';

export class MockSpeechProcessingService implements ISpeechProcessingService {
  // Mock 동작을 제어하기 위한 설정
  public mockConfig = {
    shouldFailSpeak: false,
    shouldFailRecognition: false,
    recognitionResult: 'Hello world',
    recognitionConfidence: 0.95,
    speechDelay: 100, // ms
    recognitionDelay: 500, // ms
  };

  // 호출 추적을 위한 스파이 기능
  public calls = {
    speakQuestion: 0,
    speakAnswer: 0,
    recognizeSpeech: 0,
    stopRecognition: 0,
    pauseSpeech: 0,
    resumeSpeech: 0,
    stopAllSpeech: 0,
    cleanup: 0,
  };

  // Mock 상태
  private isRecognizing = false;
  private isSpeaking = false;
  private isPaused = false;

  async speakQuestion(questionText: string, _options?: any): Promise<any> {
    this.calls.speakQuestion++;
    console.log(`[MockSpeechService] Speaking question: "${questionText}"`);
    
    if (this.mockConfig.shouldFailSpeak) {
      throw new Error('Mock: Speech synthesis failed');
    }

    this.isSpeaking = true;
    
    // 비동기 처리 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, this.mockConfig.speechDelay));
    
    this.isSpeaking = false;
    return { success: true, text: questionText };
  }

  async speakAnswer(answerText: string, _options?: any): Promise<any> {
    this.calls.speakAnswer++;
    console.log(`[MockSpeechService] Speaking answer: "${answerText}"`);
    
    if (this.mockConfig.shouldFailSpeak) {
      throw new Error('Mock: Answer speech synthesis failed');
    }

    this.isSpeaking = true;
    
    // 비동기 처리 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, this.mockConfig.speechDelay));
    
    this.isSpeaking = false;
    return { success: true, text: answerText };
  }

  async recognizeSpeech(
    onResult: Function, 
    onError?: Function, 
    _options?: any
  ): Promise<any> {
    this.calls.recognizeSpeech++;
    console.log('[MockSpeechService] Starting speech recognition');
    
    if (this.mockConfig.shouldFailRecognition) {
      const error = new Error('Mock: Speech recognition failed');
      if (onError) {
        onError(error);
      }
      throw error;
    }

    this.isRecognizing = true;
    
    // 비동기 인식 결과 시뮬레이션
    setTimeout(() => {
      if (this.isRecognizing) {
        console.log(`[MockSpeechService] Recognition result: "${this.mockConfig.recognitionResult}"`);
        onResult(this.mockConfig.recognitionResult, this.mockConfig.recognitionConfidence);
        this.isRecognizing = false;
      }
    }, this.mockConfig.recognitionDelay);

    return { success: true, started: true };
  }

  stopRecognition(): void {
    this.calls.stopRecognition++;
    console.log('[MockSpeechService] Stopping recognition');
    this.isRecognizing = false;
  }

  pauseSpeech(): void {
    this.calls.pauseSpeech++;
    console.log('[MockSpeechService] Pausing speech');
    this.isPaused = true;
  }

  resumeSpeech(): void {
    this.calls.resumeSpeech++;
    console.log('[MockSpeechService] Resuming speech');
    this.isPaused = false;
  }

  stopAllSpeech(): void {
    this.calls.stopAllSpeech++;
    console.log('[MockSpeechService] Stopping all speech');
    this.isSpeaking = false;
    this.isRecognizing = false;
    this.isPaused = false;
  }

  cleanup(): void {
    this.calls.cleanup++;
    console.log('[MockSpeechService] Cleanup called');
    this.stopAllSpeech();
  }

  // 테스트 유틸리티 메서드들
  public reset(): void {
    console.log('[MockSpeechService] Resetting mock state');
    
    this.calls = {
      speakQuestion: 0,
      speakAnswer: 0,
      recognizeSpeech: 0,
      stopRecognition: 0,
      pauseSpeech: 0,
      resumeSpeech: 0,
      stopAllSpeech: 0,
      cleanup: 0,
    };

    this.mockConfig = {
      shouldFailSpeak: false,
      shouldFailRecognition: false,
      recognitionResult: 'Hello world',
      recognitionConfidence: 0.95,
      speechDelay: 100,
      recognitionDelay: 500,
    };

    this.isRecognizing = false;
    this.isSpeaking = false;
    this.isPaused = false;
  }

  public getState() {
    return {
      isRecognizing: this.isRecognizing,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
    };
  }

  public getCallCount(method: keyof typeof this.calls): number {
    return this.calls[method];
  }

  public expectCalled(method: keyof typeof this.calls, times: number = 1): boolean {
    return this.calls[method] === times;
  }

  public setRecognitionResult(result: string, confidence: number = 0.95): void {
    this.mockConfig.recognitionResult = result;
    this.mockConfig.recognitionConfidence = confidence;
  }

  public simulateRecognitionError(): void {
    this.mockConfig.shouldFailRecognition = true;
  }

  public simulateSpeechError(): void {
    this.mockConfig.shouldFailSpeak = true;
  }
}