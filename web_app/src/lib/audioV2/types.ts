export type SessionState = 
  | 'IDLE'
  | 'INIT' 
  | 'PREPARE'
  | 'PROMPT'
  | 'THINK'
  | 'BEEP'
  | 'RECORD'
  | 'ASR'
  | 'SCORE'
  | 'FEEDBACK'
  | 'COMPLETE'
  | 'ERROR'
  | 'CANCELLED';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AudioError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
  details?: any;
}

export interface SessionCallbacks {
  onStateChange?: (state: SessionState) => void;
  onError?: (error: AudioError) => void;
  onResult?: (result: any) => void;
  onProgress?: (progress: number) => void;
}

export interface AudioConfig {
  level: number;
  thinkTime: number;
  recordTime: number;
  promptDelay: number;
  beepDuration: number;
  enableVAD: boolean;
  vadThreshold: number;
  preRollTime: number;
  graceLateTime: number;
}

export interface SessionResult {
  transcript: string;
  confidence: number;
  audioBlob?: Blob;
  duration: number;
  metadata?: any;
}