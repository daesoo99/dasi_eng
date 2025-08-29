/**
 * 상태 머신 타입 정의
 * 목적: AudioFlow 상태 머신의 모든 타입을 중앙 관리
 */

export type FlowState = 'idle' | 'tts' | 'beep' | 'recording' | 'processing' | 'timeout';

export type FlowAction = 'start' | 'pause' | 'resume' | 'stop' | 'timeout' | 'complete';

export interface ActionResult {
  success: boolean;
  error?: string;
  newState?: FlowState;
}

export interface StateDisplayInfo {
  message: string;
  progressPercent?: number;
  statusColor: string;
  icon: string;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  showProgress: boolean;
}

export interface StateTransition {
  from: FlowState;
  to: FlowState;
  action: FlowAction;
  condition?: () => boolean;
}

export interface FlowCallbacks {
  onStateChange: (state: FlowState) => void;
  onTimeUpdate: (timeRemaining: number) => void;
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout: () => void;
  onError: (error: string) => void;
}

export interface StateMachineContext {
  remainingTime: number;
  isPaused: boolean;
  currentText?: string;
  answerText?: string;
  recordingDuration: number;
}