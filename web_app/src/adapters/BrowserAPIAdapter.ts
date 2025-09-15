/**
 * BrowserAPIAdapter - 브라우저 API 추상화 인터페이스
 * 목적: I/O 계층과 비즈니스 로직 분리, 테스트 가능성 증대
 */

// 공통 인터페이스
export interface AdapterResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 음성 인식 결과
export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// 음성 인식 옵션
export interface RecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// 음성 합성 옵션
export interface SynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

// 오디오 컨텍스트 설정
export interface BeepOptions {
  frequency?: number;
  duration?: number;
  volume?: number;
  waveType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

/**
 * 음성 인식 어댑터 인터페이스
 */
export interface ISpeechRecognitionAdapter {
  isSupported(): boolean;
  startRecognition(options?: RecognitionOptions): Promise<AdapterResult<RecognitionResult>>;
  stopRecognition(): void;
  onResult(callback: (result: RecognitionResult) => void): void;
  onError(callback: (error: string) => void): void;
  onEnd(callback: () => void): void;
  cleanup(): void;
}

/**
 * 음성 합성 어댑터 인터페이스
 */
export interface ISpeechSynthesisAdapter {
  isSupported(): boolean;
  getVoices(): SpeechSynthesisVoice[];
  speak(text: string, options?: SynthesisOptions): Promise<AdapterResult<void>>;
  pause(): void;
  resume(): void;
  cancel(): void;
  isPaused(): boolean;
  isSpeaking(): boolean;
  cleanup(): void;
}

/**
 * 오디오 컨텍스트 어댑터 인터페이스
 */
export interface IAudioContextAdapter {
  isSupported(): boolean;
  createBeep(options?: BeepOptions): Promise<AdapterResult<void>>;
  stopBeep(): void;
  getContext(): AudioContext | null;
  cleanup(): void;
}

/**
 * 미디어 레코더 어댑터 인터페이스
 */
export interface IMediaRecorderAdapter {
  isSupported(): boolean;
  startRecording(options?: any): Promise<AdapterResult<void>>;
  stopRecording(): Promise<AdapterResult<Blob>>;
  isRecording(): boolean;
  cleanup(): void;
}