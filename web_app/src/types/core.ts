/**
 * 핵심 타입 정의 - 강화된 타입 안정성
 */

// Utility Types
export type NonEmptyString = string & { readonly __brand: unique symbol };
export type PositiveNumber = number & { readonly __brand: unique symbol };
export type Timestamp = number & { readonly __brand: unique symbol };

// Type Guards
export const isNonEmptyString = (value: string): value is NonEmptyString => 
  value.trim().length > 0;

export const isPositiveNumber = (value: number): value is PositiveNumber => 
  value > 0 && Number.isFinite(value);

export const isValidTimestamp = (value: number): value is Timestamp => 
  Number.isInteger(value) && value > 0;

// Result Pattern for Better Error Handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T>(data: T): Result<T, never> => ({ success: true, data });
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Option Pattern for Nullable Values
export type Option<T> = T | null;
export type Some<T> = NonNullable<T>;
export type None = null;

export const isSome = <T>(value: Option<T>): value is Some<T> => value !== null;
export const isNone = <T>(value: Option<T>): value is None => value === null;

// Strict Object Types
export type StrictObject<T> = {
  readonly [K in keyof T]-?: T[K];
};

// Configuration Types with Validation
export interface AudioConfiguration {
  readonly recordingDuration: PositiveNumber;
  readonly speechRate: PositiveNumber;
  readonly beepFrequency: PositiveNumber;
  readonly beepDuration: PositiveNumber;
}

export interface SpeechOptions {
  readonly recognitionLanguage: NonEmptyString;
  readonly synthesisLanguage: NonEmptyString;
  readonly speechRate: PositiveNumber;
}

// Service State Types
export type ServiceState = 'idle' | 'processing' | 'error' | 'disposed';

export interface ServiceStatus {
  readonly state: ServiceState;
  readonly lastUpdated: Timestamp;
  readonly error?: string;
}

// Event Types
export interface AudioEvent {
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly data?: Record<string, unknown>;
}

export type AudioEventHandler<T extends AudioEvent = AudioEvent> = (event: T) => void;

// Async Operation Types
export interface AsyncOperation<T> {
  readonly id: NonEmptyString;
  readonly startTime: Timestamp;
  readonly promise: Promise<Result<T>>;
}

// Quality Assurance Types
export interface QualityMetrics {
  readonly accuracy: number; // 0-1
  readonly confidence: number; // 0-1
  readonly responseTime: PositiveNumber; // ms
  readonly errorRate: number; // 0-1
}

// Validation Functions
export const createAudioConfiguration = (config: {
  recordingDuration: number;
  speechRate: number;
  beepFrequency: number;
  beepDuration: number;
}): Result<AudioConfiguration> => {
  const errors: string[] = [];
  
  if (!isPositiveNumber(config.recordingDuration)) {
    errors.push('Recording duration must be positive');
  }
  
  if (!isPositiveNumber(config.speechRate) || config.speechRate > 3) {
    errors.push('Speech rate must be between 0 and 3');
  }
  
  if (!isPositiveNumber(config.beepFrequency) || config.beepFrequency > 2000) {
    errors.push('Beep frequency must be between 0 and 2000 Hz');
  }
  
  if (!isPositiveNumber(config.beepDuration) || config.beepDuration > 5000) {
    errors.push('Beep duration must be between 0 and 5000 ms');
  }
  
  if (errors.length > 0) {
    return Err(new Error(errors.join('; ')));
  }
  
  return Ok({
    recordingDuration: config.recordingDuration as PositiveNumber,
    speechRate: config.speechRate as PositiveNumber,
    beepFrequency: config.beepFrequency as PositiveNumber,
    beepDuration: config.beepDuration as PositiveNumber,
  });
};

export const createSpeechOptions = (options: {
  recognitionLanguage: string;
  synthesisLanguage: string;
  speechRate: number;
}): Result<SpeechOptions> => {
  const errors: string[] = [];
  
  if (!isNonEmptyString(options.recognitionLanguage)) {
    errors.push('Recognition language is required');
  }
  
  if (!isNonEmptyString(options.synthesisLanguage)) {
    errors.push('Synthesis language is required');
  }
  
  if (!isPositiveNumber(options.speechRate) || options.speechRate > 3) {
    errors.push('Speech rate must be between 0 and 3');
  }
  
  if (errors.length > 0) {
    return Err(new Error(errors.join('; ')));
  }
  
  return Ok({
    recognitionLanguage: options.recognitionLanguage as NonEmptyString,
    synthesisLanguage: options.synthesisLanguage as NonEmptyString,
    speechRate: options.speechRate as PositiveNumber,
  });
};

// Event Factory
export const createAudioEvent = <T extends Record<string, unknown>>(
  type: string,
  data?: T
): AudioEvent => ({
  type,
  timestamp: Date.now() as Timestamp,
  data,
});

// Async Operation Factory
export const createAsyncOperation = <T>(
  id: string,
  operation: () => Promise<Result<T>>
): Result<AsyncOperation<T>> => {
  if (!isNonEmptyString(id)) {
    return Err(new Error('Operation ID is required'));
  }
  
  return Ok({
    id: id as NonEmptyString,
    startTime: Date.now() as Timestamp,
    promise: operation(),
  });
};

// Type Assertion Helpers
export const assertNonEmptyString = (value: string, name: string): NonEmptyString => {
  if (!isNonEmptyString(value)) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
};

export const assertPositiveNumber = (value: number, name: string): PositiveNumber => {
  if (!isPositiveNumber(value)) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
};