/**
 * 단순화된 플러그인 시스템 (최소 구성)
 * @description Rule of Three 원칙에 따른 최소한의 추상화
 */

// ===== 표준화된 에러 시스템 =====
export type ErrCode =
  | 'E_PERMISSION'     // 권한 거부
  | 'E_UNSUPPORTED'    // 지원하지 않는 기능
  | 'E_TIMEOUT'        // 타임아웃
  | 'E_ABORTED'        // 사용자 취소
  | 'E_NETWORK'        // 네트워크 오류
  | 'E_INVALID_INPUT'  // 잘못된 입력
  | 'E_INTERNAL';      // 내부 오류

export type Result<T> =
  | { ok: true; data: T }
  | { 
      ok: false; 
      code: ErrCode; 
      retryable?: boolean; 
      cause?: string; 
      details?: unknown;
    };

// ===== 간소화된 플러그인 인터페이스 =====
export interface ISimplePlugin {
  readonly name: string;
  readonly version: string;
  
  // 필수 메서드만
  initialize?(config?: Record<string, unknown>): Promise<Result<void>>;
  dispose?(): Promise<Result<void>>;
}

// ===== Speech 플러그인 인터페이스 =====
export interface SpeechOptions {
  readonly language?: string;
  readonly rate?: number;
  readonly signal?: AbortSignal; // 취소 지원
}

export interface RecognitionOptions {
  readonly language?: string;
  readonly maxDuration?: number;
  readonly continuous?: boolean;
  readonly signal?: AbortSignal; // 취소 지원
}

export interface SpeechResult {
  readonly duration: number; // ms
  readonly actualText?: string; // 실제 발음된 텍스트
}

export interface RecognitionResult {
  readonly transcript: string;
  readonly confidence: number; // 0-1
  readonly isFinal: boolean;
}

export interface ISpeechPlugin extends ISimplePlugin {
  // TTS
  speakText(text: string, opts?: SpeechOptions): Promise<Result<SpeechResult>>;
  
  // STT  
  recognizeSpeech(opts?: RecognitionOptions): Promise<Result<RecognitionResult>>;
  
  // 신호음
  playBeep(frequency?: number, duration?: number): Promise<Result<void>>;
  
  // 제어
  stopAll(reason?: 'user' | 'navigate' | 'error'): Result<void>;
  isProcessing(): boolean;
}

// ===== 단순화된 플러그인 관리자 =====
class SimplePluginManager {
  private plugins = new Map<string, ISimplePlugin>();
  
  /**
   * 플러그인 등록 (직접)
   */
  register<T extends ISimplePlugin>(name: string, plugin: T): Result<void> {
    if (this.plugins.has(name)) {
      return { 
        ok: false, 
        code: 'E_INVALID_INPUT',
        cause: `Plugin '${name}' already registered` 
      };
    }
    
    this.plugins.set(name, plugin);
    return { ok: true, data: undefined };
  }

  /**
   * 플러그인 가져오기 (타입 안전)
   */
  get<T extends ISimplePlugin>(name: string): Result<T> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return { 
        ok: false, 
        code: 'E_INVALID_INPUT',
        cause: `Plugin '${name}' not found` 
      };
    }
    return { ok: true, data: plugin as T };
  }

  /**
   * 모든 플러그인 초기화
   */
  async initializeAll(config?: Record<string, unknown>): Promise<Result<void>> {
    const errors: string[] = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.initialize) {
        const result = await plugin.initialize(config);
        if (!result.ok) {
          errors.push(`${name}: ${result.cause || result.code}`);
        }
      }
    }
    
    if (errors.length > 0) {
      return { 
        ok: false, 
        code: 'E_INTERNAL',
        cause: `Failed to initialize plugins: ${errors.join(', ')}`,
        details: { failedPlugins: errors }
      };
    }
    
    return { ok: true, data: undefined };
  }

  /**
   * 모든 플러그인 정리
   */
  async disposeAll(): Promise<Result<void>> {
    const errors: string[] = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.dispose) {
        const result = await plugin.dispose();
        if (!result.ok) {
          errors.push(`${name}: ${result.cause || result.code}`);
        }
      }
    }
    
    this.plugins.clear();
    
    if (errors.length > 0) {
      return { 
        ok: false, 
        code: 'E_INTERNAL',
        cause: `Failed to dispose plugins: ${errors.join(', ')}`,
        details: { failedPlugins: errors }
      };
    }
    
    return { ok: true, data: undefined };
  }

  /**
   * 등록된 플러그인 목록
   */
  list(): readonly string[] {
    return Array.from(this.plugins.keys());
  }
}

// ===== 전역 인스턴스 =====
export const simplePluginManager = new SimplePluginManager();

// ===== 유틸리티 함수들 =====
export const Ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const Err = (
  code: ErrCode, 
  cause?: string, 
  options?: { retryable?: boolean; details?: unknown }
): Result<never> => ({
  ok: false,
  code,
  cause,
  retryable: options?.retryable,
  details: options?.details
});

// 일반적인 에러들
export const CommonErrors = {
  PERMISSION_DENIED: (details?: string) => 
    Err('E_PERMISSION', 'Permission denied', { details }),
    
  UNSUPPORTED: (feature?: string) => 
    Err('E_UNSUPPORTED', `Feature not supported: ${feature || 'unknown'}`),
    
  TIMEOUT: (duration?: number) => 
    Err('E_TIMEOUT', `Operation timed out after ${duration || 0}ms`, { retryable: true }),
    
  ABORTED: (reason?: string) => 
    Err('E_ABORTED', `Operation aborted: ${reason || 'user request'}`),
    
  NETWORK: (details?: string) => 
    Err('E_NETWORK', `Network error: ${details || 'connection failed'}`, { retryable: true }),
    
  INVALID_INPUT: (param?: string) => 
    Err('E_INVALID_INPUT', `Invalid input: ${param || 'unknown parameter'}`),
    
  INTERNAL: (details?: string) => 
    Err('E_INTERNAL', `Internal error: ${details || 'unknown'}`)
};

// ===== AbortController 유틸리티 =====
export class TimeoutController {
  private controller = new AbortController();
  private timeoutId?: NodeJS.Timeout;
  
  constructor(timeoutMs?: number) {
    if (timeoutMs && timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        this.abort('timeout');
      }, timeoutMs);
    }
  }
  
  get signal(): AbortSignal {
    return this.controller.signal;
  }
  
  abort(reason?: string): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.controller.abort(reason);
  }
  
  dispose(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

/**
 * Promise에 취소 기능 추가
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<Result<T>> {
  return new Promise((resolve) => {
    const timeoutController = new TimeoutController(timeoutMs);
    
    // 외부 signal이 있으면 연결
    if (signal) {
      signal.addEventListener('abort', () => {
        timeoutController.abort('external');
      });
    }
    
    // 취소 처리
    timeoutController.signal.addEventListener('abort', () => {
      const reason = (timeoutController.signal as any).reason || 'unknown';
      if (reason === 'timeout') {
        resolve(CommonErrors.TIMEOUT(timeoutMs));
      } else {
        resolve(CommonErrors.ABORTED(reason));
      }
    });
    
    // 실제 작업 실행
    promise
      .then((data) => {
        if (!timeoutController.signal.aborted) {
          resolve(Ok(data));
        }
      })
      .catch((error) => {
        if (!timeoutController.signal.aborted) {
          resolve(CommonErrors.INTERNAL(error.message));
        }
      })
      .finally(() => {
        timeoutController.dispose();
      });
  });
}