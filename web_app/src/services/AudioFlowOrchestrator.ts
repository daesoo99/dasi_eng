/**
 * AudioFlowOrchestrator - 오디오 플로우 전체 조율 서비스
 * 목적: TTS → Beep → Recording → Processing 플로우를 중앙에서 관리
 */

import { SpeechProcessingService, ProcessingResult } from './SpeechProcessingService';
import { AudioTimerService } from './AudioTimerService';
import { 
  IAudioContextAdapter, 
  BeepOptions, 
  AdapterResult 
} from '@/adapters/BrowserAPIAdapter';

export type FlowState = 'idle' | 'tts' | 'beep' | 'recording' | 'processing' | 'timeout';

export interface FlowOptions {
  recordingDuration?: number;
  beepOptions?: BeepOptions;
  ttsOptions?: {
    questionLanguage?: string;
    answerLanguage?: string;
    speechRate?: number;
  };
}

export interface FlowCallbacks {
  onStateChange: (state: FlowState) => void;
  onTimeUpdate: (remainingTime: number) => void;
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout: () => void;
  onError?: (error: string) => void;
}

export interface FlowStatus {
  currentState: FlowState;
  remainingTime: number;
  isPaused: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
}

export class AudioFlowOrchestrator {
  private speechService: SpeechProcessingService;
  private timerService: AudioTimerService;
  private audioContextAdapter: IAudioContextAdapter;
  
  private currentState: FlowState = 'idle';
  private isPaused = false;
  private callbacks: FlowCallbacks;
  private options: FlowOptions;
  
  // 기본 설정
  private defaultOptions: Required<FlowOptions> = {
    recordingDuration: 10,
    beepOptions: {
      frequency: 800,
      duration: 0.5,
      volume: 0.3,
      waveType: 'sine'
    },
    ttsOptions: {
      questionLanguage: 'ko-KR',
      answerLanguage: 'en-US',
      speechRate: 0.9
    }
  };

  constructor(
    speechService: SpeechProcessingService,
    timerService: AudioTimerService,
    audioContextAdapter: IAudioContextAdapter,
    callbacks: FlowCallbacks,
    options: FlowOptions = {}
  ) {
    this.speechService = speechService;
    this.timerService = timerService;
    this.audioContextAdapter = audioContextAdapter;
    this.callbacks = callbacks;
    this.options = { ...this.defaultOptions, ...options };
    
    console.log('[AudioFlowOrchestrator] Initialized with options:', this.options);
  }

  /**
   * 메인 플로우 시작: TTS → Beep → Recording
   */
  async startFlow(questionText: string): Promise<ProcessingResult> {
    try {
      const validationResult = this.validateFlowStart(questionText);
      if (!validationResult.success) {
        return validationResult;
      }

      this.initializeFlow();
      
      return await this.executeFlowSequence(questionText);

    } catch (error) {
      return this.handleFlowError(error);
    }
  }

  /**
   * 플로우 시작 전 검증
   */
  private validateFlowStart(questionText: string): ProcessingResult {
    console.log('[AudioFlowOrchestrator] Starting flow with:', questionText);
    
    if (!questionText.trim()) {
      return {
        success: false,
        error: 'Question text cannot be empty'
      };
    }

    if (this.currentState !== 'idle') {
      return {
        success: false,
        error: 'Flow already in progress'
      };
    }

    return { success: true };
  }

  /**
   * 플로우 초기화
   */
  private initializeFlow(): void {
    this.setState('tts');
    this.setPaused(false);
  }

  /**
   * 순차적 플로우 실행: TTS → Beep → Recording
   */
  private async executeFlowSequence(questionText: string): Promise<ProcessingResult> {
    // 1단계: TTS 재생
    const ttsResult = await this.executeTTSPhase(questionText);
    if (!ttsResult.success) {
      return ttsResult;
    }

    // 2단계: Beep 재생
    const beepResult = await this.executeBeepPhase();
    if (!beepResult.success) {
      return beepResult;
    }

    // 3단계: 녹음 시작
    const recordingResult = await this.executeRecordingPhase();
    if (!recordingResult.success) {
      return recordingResult;
    }

    return { success: true };
  }

  /**
   * TTS 단계 실행
   */
  private async executeTTSPhase(questionText: string): Promise<ProcessingResult> {
    const ttsResult = await this.playQuestion(questionText);
    
    if (!ttsResult.success) {
      return ttsResult;
    }
    
    if (this.isPaused) {
      return {
        success: false,
        error: 'Flow paused during TTS phase'
      };
    }

    return { success: true };
  }

  /**
   * Beep 단계 실행
   */
  private async executeBeepPhase(): Promise<ProcessingResult> {
    const beepResult = await this.playBeep();
    
    if (!beepResult.success) {
      return beepResult;
    }
    
    if (this.isPaused) {
      return {
        success: false,
        error: 'Flow paused during beep phase'
      };
    }

    return { success: true };
  }

  /**
   * 녹음 단계 실행
   */
  private async executeRecordingPhase(): Promise<ProcessingResult> {
    return await this.startRecording();
  }

  /**
   * 플로우 에러 처리
   */
  private handleFlowError(error: unknown): ProcessingResult {
    console.error('[AudioFlowOrchestrator] Flow error:', error);
    
    this.setState('idle');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown flow error';
    this.callbacks.onError?.(errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * 1단계: 문제 음성 재생 (한국어)
   */
  private async playQuestion(questionText: string): Promise<ProcessingResult> {
    console.log('[AudioFlowOrchestrator] Playing question TTS');
    
    const result = await this.speechService.speakQuestion(questionText, {
      lang: this.options.ttsOptions?.questionLanguage,
      rate: this.options.ttsOptions?.speechRate
    });

    if (!result.success) {
      this.callbacks.onError?.(result.error || 'Failed to play question');
    }

    return result;
  }

  /**
   * 2단계: Beep 재생
   */
  private async playBeep(): Promise<ProcessingResult> {
    try {
      console.log('[AudioFlowOrchestrator] Playing beep');
      this.setState('beep');

      const result = await this.audioContextAdapter.createBeep(this.options.beepOptions);
      
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to play beep'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Beep creation error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 3단계: 녹음 및 타이머 시작
   */
  private async startRecording(): Promise<ProcessingResult> {
    try {
      console.log('[AudioFlowOrchestrator] Starting recording phase');
      this.setState('recording');

      // 타이머 시작
      this.timerService.start(
        this.options.recordingDuration!,
        (remainingTime) => this.callbacks.onTimeUpdate(remainingTime),
        () => this.handleTimeout()
      );

      // 음성 인식 시작
      const result = await this.speechService.recognizeSpeech(
        (transcript, confidence) => this.handleSpeechResult(transcript, confidence),
        (error) => this.callbacks.onError?.(error)
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording start error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 음성 인식 결과 처리
   */
  private handleSpeechResult(transcript: string, confidence: number): void {
    console.log('[AudioFlowOrchestrator] Speech result received:', { transcript, confidence });
    
    this.timerService.stop();
    this.setState('processing');
    
    // 잠시 후 결과 전달 및 상태 초기화
    setTimeout(() => {
      this.callbacks.onSpeechResult(transcript, confidence);
      this.setState('idle');
    }, 100);
  }

  /**
   * 타임아웃 처리
   */
  private handleTimeout(): void {
    console.log('[AudioFlowOrchestrator] Handling timeout');
    
    this.setState('timeout');
    this.speechService.stopRecognition();
    
    // 1.5초 후 타임아웃 콜백 호출
    setTimeout(() => {
      this.callbacks.onTimeout();
      this.setState('idle');
    }, 1500);
  }

  /**
   * 정답 재생 및 다음 단계 진행
   */
  async playAnswerAndNext(answerText?: string): Promise<void> {
    if (answerText) {
      try {
        console.log('[AudioFlowOrchestrator] Playing answer:', answerText);
        this.setState('processing');
        
        const result = await this.speechService.speakAnswer(answerText, {
          lang: this.options.ttsOptions?.answerLanguage,
          rate: this.options.ttsOptions?.speechRate
        });

        if (!result.success) {
          console.error('[AudioFlowOrchestrator] Answer TTS error:', result.error);
        }

        // 1초 후 다음 문제로
        setTimeout(() => {
          this.setState('idle');
          this.callbacks.onTimeout();
        }, 1000);

      } catch (error) {
        console.error('[AudioFlowOrchestrator] Answer playback error:', error);
        this.setState('idle');
        this.callbacks.onTimeout();
      }
    } else {
      this.setState('idle');
      this.callbacks.onTimeout();
    }
  }

  /**
   * 플로우 일시정지
   */
  pauseFlow(): void {
    console.log(`[AudioFlowOrchestrator] Pausing flow at state: ${this.currentState}`);
    
    switch (this.currentState) {
      case 'tts':
        this.speechService.pauseSpeech();
        break;
      case 'beep':
        this.audioContextAdapter.stopBeep();
        break;
      case 'recording':
        this.timerService.pause();
        break;
    }
    
    this.setPaused(true);
  }

  /**
   * 플로우 재개
   */
  resumeFlow(): void {
    console.log(`[AudioFlowOrchestrator] Resuming flow at state: ${this.currentState}`);
    
    switch (this.currentState) {
      case 'tts':
        this.speechService.resumeSpeech();
        break;
      case 'recording':
        this.timerService.resume();
        break;
    }
    
    this.setPaused(false);
  }

  /**
   * 플로우 중지
   */
  stopFlow(): void {
    console.log('[AudioFlowOrchestrator] Stopping flow');
    
    this.timerService.stop();
    this.speechService.stopAllSpeech();
    this.audioContextAdapter.stopBeep();
    
    this.setState('idle');
    this.setPaused(false);
  }

  /**
   * 현재 상태 조회
   */
  getStatus(): FlowStatus {
    return {
      currentState: this.currentState,
      remainingTime: this.timerService.getRemainingTime(),
      isPaused: this.isPaused,
      canPause: this.currentState !== 'idle' && !this.isPaused,
      canResume: this.isPaused,
      canStop: this.currentState !== 'idle'
    };
  }

  /**
   * 옵션 업데이트
   */
  updateOptions(newOptions: Partial<FlowOptions>): void {
    this.options = { ...this.options, ...newOptions };
    console.log('[AudioFlowOrchestrator] Options updated:', this.options);
  }

  /**
   * 상태 변경 내부 메서드
   */
  private setState(newState: FlowState): void {
    if (this.currentState !== newState) {
      console.log(`[AudioFlowOrchestrator] State change: ${this.currentState} → ${newState}`);
      this.currentState = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  /**
   * 일시정지 상태 변경 내부 메서드
   */
  private setPaused(paused: boolean): void {
    if (this.isPaused !== paused) {
      this.isPaused = paused;
      console.log(`[AudioFlowOrchestrator] Pause state changed: ${paused}`);
    }
  }

  /**
   * 리소스 정리
   */
  cleanup(): void {
    console.log('[AudioFlowOrchestrator] Cleaning up...');
    this.stopFlow();
    console.log('[AudioFlowOrchestrator] Cleanup completed');
  }
}