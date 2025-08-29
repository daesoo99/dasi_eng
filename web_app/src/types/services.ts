/**
 * 서비스 인터페이스 타입 정의 - 강화된 타입 안정성
 */

import { Result, Option, NonEmptyString, PositiveNumber, Timestamp, AudioEvent } from './core';

// Base Service Interface
export interface IBaseService {
  readonly id: NonEmptyString;
  readonly isDisposed: boolean;
  cleanup(): Promise<void>;
}

// Audio Flow State Machine Types
export type FlowState = 
  | 'idle' 
  | 'tts' 
  | 'beep' 
  | 'recording' 
  | 'processing' 
  | 'timeout' 
  | 'answer_tts';

export interface StateMachineContext {
  readonly remainingTime: PositiveNumber;
  readonly recordingDuration: PositiveNumber;
  readonly isPaused: boolean;
  readonly koreanText?: NonEmptyString;
  readonly answerText?: NonEmptyString;
  readonly speechResult?: {
    readonly transcript: NonEmptyString;
    readonly confidence: number; // 0-1
  };
}

export interface FlowCallbacks {
  readonly onStateChange?: (newState: FlowState) => void;
  readonly onTimeUpdate?: (remainingTime: PositiveNumber) => void;
  readonly onSpeechResult?: (transcript: NonEmptyString, confidence: number) => void;
  readonly onTimeout?: () => void;
  readonly onError?: (error: string) => void;
}

export interface ActionResult {
  readonly success: boolean;
  readonly error?: NonEmptyString;
  readonly newState?: FlowState;
}

export interface DisplayInfo {
  readonly message: NonEmptyString;
  readonly progressPercent?: number; // 0-100
  readonly statusColor: NonEmptyString;
  readonly icon: NonEmptyString;
  readonly canPause: boolean;
  readonly canResume: boolean;
  readonly canStop: boolean;
  readonly showProgress: boolean;
}

export interface IAudioFlowStateMachine extends IBaseService {
  getCurrentState(): FlowState;
  getContext(): Readonly<StateMachineContext>;
  getAllowedActions(): readonly string[];
  
  startFlow(koreanText: NonEmptyString): Promise<ActionResult>;
  pauseFlow(): ActionResult;
  resumeFlow(): ActionResult;
  stopFlow(): ActionResult;
  
  executeAction(action: NonEmptyString): Promise<ActionResult>;
  playAnswerAndNext(answerText?: NonEmptyString): Promise<void>;
  
  getDisplayInfo(): DisplayInfo;
  updateContext(updates: Partial<StateMachineContext>): void;
}

// Speech Processing Service Types
export type SpeechOperation = 'tts' | 'recognition' | 'beep';

export interface SpeechResult {
  readonly success: boolean;
  readonly error?: NonEmptyString;
  readonly duration?: PositiveNumber; // ms
}

export interface SpeechRecognitionResult {
  readonly success: boolean;
  readonly transcript?: NonEmptyString;
  readonly confidence?: number; // 0-1
  readonly error?: NonEmptyString;
  readonly isFinal?: boolean;
}

export type SpeechResultCallback = (
  transcript: NonEmptyString, 
  confidence: number
) => void;

export interface ISpeechProcessingService extends IBaseService {
  speakText(
    text: NonEmptyString, 
    language?: NonEmptyString, 
    rate?: PositiveNumber
  ): Promise<SpeechResult>;
  
  recognizeSpeech(
    language?: NonEmptyString,
    duration?: PositiveNumber,
    onResult?: SpeechResultCallback
  ): Promise<SpeechRecognitionResult>;
  
  playBeep(
    frequency?: PositiveNumber,
    duration?: PositiveNumber
  ): Promise<void>;
  
  stopAllSpeech(): void;
  cancelRecognition(): void;
  
  isProcessing(): boolean;
  getCurrentOperation(): Option<SpeechOperation>;
}

// Score Calculation Service Types
export interface QualityResult {
  readonly score: number; // 0-100
  readonly feedback: readonly string[];
  readonly suggestions: readonly string[];
  readonly metrics: {
    readonly accuracy: number; // 0-1
    readonly fluency: number; // 0-1
    readonly pronunciation: number; // 0-1
    readonly grammar: number; // 0-1
  };
}

export interface ScoreInput {
  readonly userInput: NonEmptyString;
  readonly expectedAnswer: NonEmptyString;
  readonly confidence: number; // 0-1
  readonly responseTime: PositiveNumber; // ms
}

export interface IScoreCalculationService extends IBaseService {
  calculateQuality(input: ScoreInput): Promise<Result<QualityResult>>;
  updateSRSFactor(
    cardId: NonEmptyString,
    quality: number,
    previousFactor: number
  ): Promise<Result<number>>;
  
  getPerformanceHistory(
    userId: NonEmptyString,
    limit?: PositiveNumber
  ): Promise<Result<readonly QualityResult[]>>;
}

// Audio Timer Service Types
export interface TimerState {
  readonly remainingTime: PositiveNumber;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}

export type TimerCallback = () => void;
export type TimerTickCallback = (remainingTime: PositiveNumber) => void;

export interface IAudioTimerService extends IBaseService {
  start(
    duration: PositiveNumber,
    onTick: TimerTickCallback,
    onComplete: TimerCallback
  ): void;
  
  pause(): void;
  resume(): void;
  stop(): void;
  
  getState(): TimerState;
  isPaused(): boolean;
  isRunning(): boolean;
}

// Adapter Factory Types
export interface ISpeechSynthesisAdapter {
  speak(text: NonEmptyString, options?: {
    language?: NonEmptyString;
    rate?: PositiveNumber;
    volume?: number; // 0-1
  }): Promise<SpeechResult>;
  
  cancel(): void;
  pause(): void;
  resume(): void;
  
  getVoices(): readonly SpeechSynthesisVoice[];
}

export interface ISpeechRecognitionAdapter {
  start(options: {
    language: NonEmptyString;
    continuous?: boolean;
    interimResults?: boolean;
  }): Promise<SpeechRecognitionResult>;
  
  stop(): void;
  abort(): void;
  
  onResult(callback: SpeechResultCallback): void;
  onError(callback: (error: Event) => void): void;
}

export interface IAudioContextAdapter {
  createBeep(frequency: PositiveNumber, duration: PositiveNumber): Promise<void>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
}

export interface IAdapterFactory {
  createSpeechSynthesisAdapter(): ISpeechSynthesisAdapter;
  createSpeechRecognitionAdapter(): ISpeechRecognitionAdapter;
  createAudioContextAdapter(): IAudioContextAdapter;
}

// Service Container Types
export interface ServiceConfiguration {
  readonly speechOptions?: {
    readonly recognitionLanguage?: NonEmptyString;
    readonly synthesisLanguage?: NonEmptyString;
    readonly speechRate?: PositiveNumber;
  };
  readonly mockMode?: boolean;
  readonly enablePerformanceLogging?: boolean;
}

export interface IServiceContainer {
  createAudioFlowStateMachine(
    callbacks: FlowCallbacks,
    recordingDuration?: PositiveNumber
  ): IAudioFlowStateMachine;
  
  createSpeechProcessingService(): ISpeechProcessingService;
  createScoreCalculationService(): IScoreCalculationService;
  createAudioTimerService(): IAudioTimerService;
  
  getAdapterFactory(): IAdapterFactory;
  getConfiguration(): Readonly<ServiceConfiguration>;
}

// Hook Types
export interface FlowController {
  readonly flowState: FlowState;
  readonly remainingTime: PositiveNumber;
  readonly isPaused: boolean;
  
  readonly startFlow: (koreanText: NonEmptyString) => Promise<void>;
  readonly pauseFlow: () => void;
  readonly resumeFlow: () => void;
  readonly stopFlow: () => void;
  readonly playAnswerAndNext: (answerText?: NonEmptyString) => Promise<void>;
  
  readonly getDisplayInfo: () => DisplayInfo;
  readonly getAllowedActions: () => readonly string[];
}

export interface UseAudioFlowControllerProps {
  readonly onSpeechResult: (transcript: NonEmptyString, confidence: number) => void;
  readonly onTimeout?: () => void;
  readonly recordingDuration?: PositiveNumber;
  readonly speechOptions?: ServiceConfiguration['speechOptions'];
  readonly serviceContainer?: IServiceContainer;
}

// Event System Types
export interface AudioFlowEvent extends AudioEvent {
  readonly type: 'stateChange' | 'speechResult' | 'timeout' | 'error';
}

export interface StateChangeEvent extends AudioFlowEvent {
  readonly type: 'stateChange';
  readonly data: {
    readonly previousState: FlowState;
    readonly newState: FlowState;
    readonly timestamp: Timestamp;
  };
}

export interface SpeechResultEvent extends AudioFlowEvent {
  readonly type: 'speechResult';
  readonly data: {
    readonly transcript: NonEmptyString;
    readonly confidence: number;
    readonly isFinal: boolean;
    readonly timestamp: Timestamp;
  };
}

// Component Props Types with Strong Typing
export interface AutoSpeakingFlowV2Props {
  readonly currentCard: {
    readonly id: NonEmptyString;
    readonly front_ko?: NonEmptyString;
    readonly kr?: NonEmptyString;
    readonly target_en?: NonEmptyString;
  } | null;
  readonly onSpeechResult: (transcript: NonEmptyString, confidence: number) => void;
  readonly onTimeout?: () => void;
  readonly isActive: boolean;
  readonly recordingDuration?: PositiveNumber;
  readonly serviceContainer?: IServiceContainer;
}