/**
 * Speech Processing 플러그인 인터페이스
 * @description 음성 처리 관련 플러그인들이 구현해야 하는 인터페이스
 */

import { IPlugin } from '@/plugins/core/IPlugin';
import { 
  SpeechResult, 
  SpeechRecognitionResult,
  SpeechResultCallback 
} from '@/types/services';
import { NonEmptyString, PositiveNumber, Result } from '@/types/core';

// Speech 플러그인 설정
export interface SpeechPluginConfig {
  readonly recognitionLanguage?: NonEmptyString;
  readonly synthesisLanguage?: NonEmptyString;
  readonly speechRate?: PositiveNumber;
  readonly enableContinuous?: boolean;
  readonly enableInterimResults?: boolean;
  readonly autoRestart?: boolean;
}

// Speech 처리 상태
export type SpeechProcessingState = 
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'error';

// Speech 이벤트
export interface SpeechPluginEvent {
  readonly type: 'stateChange' | 'result' | 'error' | 'start' | 'end';
  readonly timestamp: number;
  readonly data?: {
    readonly state?: SpeechProcessingState;
    readonly transcript?: NonEmptyString;
    readonly confidence?: number;
    readonly error?: string;
  };
}

export type SpeechEventHandler = (event: SpeechPluginEvent) => void;

/**
 * Speech Processing 플러그인 인터페이스
 */
export interface ISpeechPlugin extends IPlugin {
  // 현재 처리 상태
  readonly processingState: SpeechProcessingState;
  
  // TTS (Text-to-Speech) 기능
  speakText(
    text: NonEmptyString, 
    options?: {
      language?: NonEmptyString;
      rate?: PositiveNumber;
      volume?: number; // 0-1
      pitch?: number;  // 0-2
    }
  ): Promise<Result<SpeechResult>>;
  
  // 음성 인식 기능
  recognizeSpeech(
    options?: {
      language?: NonEmptyString;
      maxDuration?: PositiveNumber;
      continuous?: boolean;
      interimResults?: boolean;
    }
  ): Promise<Result<SpeechRecognitionResult>>;
  
  // 실시간 음성 인식 시작
  startListening(
    onResult: SpeechResultCallback,
    options?: {
      language?: NonEmptyString;
      continuous?: boolean;
      interimResults?: boolean;
    }
  ): Result<void>;
  
  // 음성 인식 중지
  stopListening(): Result<void>;
  
  // 신호음 재생
  playBeep(
    options?: {
      frequency?: PositiveNumber;
      duration?: PositiveNumber;
      volume?: number; // 0-1
    }
  ): Promise<Result<void>>;
  
  // 모든 음성 처리 중지
  stopAll(): Result<void>;
  
  // 음성 처리 중인지 확인
  isProcessing(): boolean;
  
  // 지원하는 언어 목록 반환
  getSupportedLanguages(): Promise<Result<readonly string[]>>;
  
  // 사용 가능한 음성 목록 반환 (TTS)
  getAvailableVoices(): Promise<Result<readonly SpeechSynthesisVoice[]>>;
  
  // Speech 이벤트 핸들러
  onSpeechEvent(handler: SpeechEventHandler): void;
  offSpeechEvent(handler: SpeechEventHandler): void;
}

// Speech 플러그인 팩토리
export interface ISpeechPluginFactory {
  readonly pluginType: 'speech';
  readonly implementation: 'web' | 'mock' | 'custom';
  create(config?: SpeechPluginConfig): Promise<Result<ISpeechPlugin>>;
  validateConfig(config: SpeechPluginConfig): Result<void>;
  
  // 브라우저 지원 확인
  isSupported(): boolean;
  
  // 권한 요청
  requestPermissions(): Promise<Result<void>>;
}