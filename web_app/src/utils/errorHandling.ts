/**
 * @fileoverview 포괄적인 에러 처리 유틸리티
 * @description AI 면접 시뮬레이터에서 발생하는 모든 종류의 에러를 체계적으로 처리
 * @author DaSiStart Team
 * @version 1.0.0
 */

// 에러 타입 열거형
export enum ErrorType {
  // API 관련 에러
  API_CONNECTION = 'API_CONNECTION',
  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_VALIDATION = 'API_VALIDATION',

  // 음성 처리 에러
  SPEECH_NOT_SUPPORTED = 'SPEECH_NOT_SUPPORTED',
  SPEECH_PERMISSION_DENIED = 'SPEECH_PERMISSION_DENIED',
  SPEECH_NO_AUDIO = 'SPEECH_NO_AUDIO',
  SPEECH_NETWORK_ERROR = 'SPEECH_NETWORK_ERROR',
  SPEECH_SERVICE_ERROR = 'SPEECH_SERVICE_ERROR',

  // TTS 에러
  TTS_NOT_SUPPORTED = 'TTS_NOT_SUPPORTED',
  TTS_SYNTHESIS_ERROR = 'TTS_SYNTHESIS_ERROR',
  TTS_VOICE_NOT_FOUND = 'TTS_VOICE_NOT_FOUND',

  // 면접 세션 에러
  INTERVIEW_SESSION_INVALID = 'INTERVIEW_SESSION_INVALID',
  INTERVIEW_SESSION_EXPIRED = 'INTERVIEW_SESSION_EXPIRED',
  INTERVIEW_CONFIG_INVALID = 'INTERVIEW_CONFIG_INVALID',

  // 브라우저 호환성 에러
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  FEATURE_NOT_SUPPORTED = 'FEATURE_NOT_SUPPORTED',

  // 일반 에러
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// 에러 심각도 등급
export enum ErrorSeverity {
  LOW = 'low',        // 사용자 경험에 미미한 영향
  MEDIUM = 'medium',  // 일부 기능 제한
  HIGH = 'high',      // 주요 기능 불가
  CRITICAL = 'critical' // 앱 사용 불가
}

// 사용자 액션 타입
export enum UserAction {
  RETRY = 'retry',
  RELOAD = 'reload',
  CONTACT_SUPPORT = 'contact_support',
  USE_FALLBACK = 'use_fallback',
  UPDATE_BROWSER = 'update_browser',
  ENABLE_PERMISSIONS = 'enable_permissions',
  CHECK_NETWORK = 'check_network'
}

// 구조화된 에러 인터페이스
export interface StructuredError {
  readonly type: ErrorType;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly userMessage: string;
  readonly suggestedActions: UserAction[];
  readonly timestamp: number;
  readonly context?: Record<string, any>;
  readonly originalError?: Error;
  readonly stackTrace?: string;
  readonly sessionInfo?: {
    userAgent: string;
    url: string;
    timestamp: number;
  };
}

// 에러 컨텍스트 인터페이스
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * 메인 에러 처리 클래스
 * 모든 에러를 중앙에서 관리하고 적절한 처리 방법 제공
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: StructuredError[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 에러를 구조화된 형태로 변환
   */
  public createStructuredError(
    type: ErrorType,
    originalError: Error | string,
    context?: ErrorContext
  ): StructuredError {
    const errorConfig = this.getErrorConfiguration(type);
    const message = typeof originalError === 'string' ? originalError : originalError.message;

    const structuredError: StructuredError = {
      type,
      severity: errorConfig.severity,
      message,
      userMessage: errorConfig.userMessage,
      suggestedActions: errorConfig.suggestedActions,
      timestamp: Date.now(),
      context,
      originalError: typeof originalError === 'string' ? undefined : originalError,
      stackTrace: typeof originalError === 'string' ? undefined : originalError.stack,
      sessionInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    this.logError(structuredError);
    return structuredError;
  }

  /**
   * API 에러 처리
   */
  public handleApiError(error: any, context?: ErrorContext): StructuredError {
    let errorType: ErrorType;
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorType = ErrorType.API_TIMEOUT;
    } else if (error.response?.status === 401) {
      errorType = ErrorType.API_UNAUTHORIZED;
    } else if (error.response?.status === 403) {
      errorType = ErrorType.API_FORBIDDEN;
    } else if (error.response?.status === 404) {
      errorType = ErrorType.API_NOT_FOUND;
    } else if (error.response?.status >= 500) {
      errorType = ErrorType.API_SERVER_ERROR;
    } else if (error.response?.status >= 400) {
      errorType = ErrorType.API_VALIDATION;
    } else if (!navigator.onLine) {
      errorType = ErrorType.NETWORK_ERROR;
    } else {
      errorType = ErrorType.API_CONNECTION;
    }

    return this.createStructuredError(errorType, error, {
      ...context,
      additionalData: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }
    });
  }

  /**
   * 음성 인식 에러 처리
   */
  public handleSpeechError(error: string | Event, context?: ErrorContext): StructuredError {
    let errorType: ErrorType;
    let errorMessage: string;

    if (typeof error === 'string') {
      errorMessage = error;
      errorType = ErrorType.SPEECH_SERVICE_ERROR;
    } else {
      const speechError = error as any;
      errorMessage = `Speech recognition error: ${speechError.error}`;
      
      switch (speechError.error) {
        case 'not-allowed':
          errorType = ErrorType.SPEECH_PERMISSION_DENIED;
          break;
        case 'no-speech':
        case 'audio-capture':
          errorType = ErrorType.SPEECH_NO_AUDIO;
          break;
        case 'network':
          errorType = ErrorType.SPEECH_NETWORK_ERROR;
          break;
        case 'service-not-allowed':
          errorType = ErrorType.SPEECH_NOT_SUPPORTED;
          break;
        default:
          errorType = ErrorType.SPEECH_SERVICE_ERROR;
      }
    }

    return this.createStructuredError(errorType, errorMessage, context);
  }

  /**
   * 브라우저 호환성 에러 처리
   */
  public handleBrowserCompatibilityError(feature: string, context?: ErrorContext): StructuredError {
    return this.createStructuredError(
      ErrorType.BROWSER_NOT_SUPPORTED,
      `${feature} is not supported in this browser`,
      {
        ...context,
        additionalData: {
          feature,
          userAgent: navigator.userAgent,
          browserInfo: this.getBrowserInfo()
        }
      }
    );
  }

  /**
   * 에러 복구 시도
   */
  public async attemptRecovery(error: StructuredError): Promise<boolean> {
    switch (error.type) {
      case ErrorType.API_TIMEOUT:
      case ErrorType.API_CONNECTION:
        // 연결 재시도
        return this.retryConnection();
      
      case ErrorType.SPEECH_PERMISSION_DENIED:
        // 권한 재요청
        return this.requestMicrophonePermission();
      
      case ErrorType.NETWORK_ERROR:
        // 네트워크 상태 확인
        return this.checkNetworkConnection();
      
      default:
        return false;
    }
  }

  /**
   * 에러 로깅
   */
  private logError(error: StructuredError): void {
    // 로그 크기 관리
    if (this.errorLog.length >= this.maxLogSize) {
      this.errorLog.shift();
    }
    
    this.errorLog.push(error);
    
    // 콘솔에 구조화된 로그 출력
    console.group(`🚨 [${error.severity.toUpperCase()}] ${error.type}`);
    console.error('User Message:', error.userMessage);
    console.error('Technical Message:', error.message);
    console.error('Suggested Actions:', error.suggestedActions);
    if (error.context) {
      console.error('Context:', error.context);
    }
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.groupEnd();

    // 심각한 에러는 외부 로깅 서비스로 전송 (구현 예정)
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.sendToExternalLogging(error);
    }
  }

  /**
   * 에러 설정 가져오기
   */
  private getErrorConfiguration(type: ErrorType): {
    severity: ErrorSeverity;
    userMessage: string;
    suggestedActions: UserAction[];
  } {
    const configs = {
      [ErrorType.API_CONNECTION]: {
        severity: ErrorSeverity.HIGH,
        userMessage: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.',
        suggestedActions: [UserAction.CHECK_NETWORK, UserAction.RETRY]
      },
      [ErrorType.API_TIMEOUT]: {
        severity: ErrorSeverity.MEDIUM,
        userMessage: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        suggestedActions: [UserAction.RETRY]
      },
      [ErrorType.SPEECH_PERMISSION_DENIED]: {
        severity: ErrorSeverity.HIGH,
        userMessage: '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.',
        suggestedActions: [UserAction.ENABLE_PERMISSIONS, UserAction.RELOAD]
      },
      [ErrorType.SPEECH_NOT_SUPPORTED]: {
        severity: ErrorSeverity.CRITICAL,
        userMessage: '이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.',
        suggestedActions: [UserAction.UPDATE_BROWSER]
      },
      [ErrorType.BROWSER_NOT_SUPPORTED]: {
        severity: ErrorSeverity.CRITICAL,
        userMessage: '지원되지 않는 브라우저입니다. 최신 Chrome 또는 Edge 브라우저를 사용해주세요.',
        suggestedActions: [UserAction.UPDATE_BROWSER]
      },
      [ErrorType.INTERVIEW_SESSION_EXPIRED]: {
        severity: ErrorSeverity.MEDIUM,
        userMessage: '면접 세션이 만료되었습니다. 새로운 면접을 시작해주세요.',
        suggestedActions: [UserAction.RELOAD]
      }
    };

    return configs[type] || {
      severity: ErrorSeverity.MEDIUM,
      userMessage: '예상치 못한 오류가 발생했습니다.',
      suggestedActions: [UserAction.RETRY, UserAction.RELOAD]
    };
  }

  /**
   * 브라우저 정보 수집
   */
  private getBrowserInfo() {
    const ua = navigator.userAgent;
    return {
      isChrome: /Chrome/.test(ua),
      isEdge: /Edg/.test(ua),
      isFirefox: /Firefox/.test(ua),
      isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
      isMobile: /Mobile|Android|iOS/.test(ua),
      version: ua.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/)?.[1] || 'unknown'
    };
  }

  /**
   * 연결 재시도
   */
  private async retryConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 마이크 권한 요청
   */
  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 네트워크 연결 확인
   */
  private async checkNetworkConnection(): Promise<boolean> {
    return navigator.onLine;
  }

  /**
   * 외부 로깅 서비스 전송 (구현 예정)
   */
  private sendToExternalLogging(error: StructuredError): void {
    // TODO: 외부 로깅 서비스(Sentry, LogRocket 등) 연동
    console.log('Sending critical error to external logging service:', error);
  }

  /**
   * 에러 로그 내보내기
   */
  public getErrorLogs(): StructuredError[] {
    return [...this.errorLog];
  }

  /**
   * 에러 통계 생성
   */
  public getErrorStatistics() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byType: {} as Record<ErrorType, number>,
      recent: this.errorLog.filter(e => Date.now() - e.timestamp < 3600000) // 1시간 이내
    };

    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

// 편의 함수들
export const errorHandler = ErrorHandler.getInstance();

export const handleError = (
  type: ErrorType,
  error: Error | string,
  context?: ErrorContext
): StructuredError => {
  return errorHandler.createStructuredError(type, error, context);
};

export const handleApiError = (error: any, context?: ErrorContext): StructuredError => {
  return errorHandler.handleApiError(error, context);
};

export const handleSpeechError = (error: string | Event, context?: ErrorContext): StructuredError => {
  return errorHandler.handleSpeechError(error, context);
};

export const attemptErrorRecovery = async (error: StructuredError): Promise<boolean> => {
  return errorHandler.attemptRecovery(error);
};

// React 에러 바운더리용 유틸리티
export const createErrorBoundaryError = (error: Error, errorInfo: any): StructuredError => {
  return errorHandler.createStructuredError(
    ErrorType.UNKNOWN_ERROR,
    error,
    {
      component: 'ErrorBoundary',
      additionalData: {
        componentStack: errorInfo.componentStack
      }
    }
  );
};

export default ErrorHandler;