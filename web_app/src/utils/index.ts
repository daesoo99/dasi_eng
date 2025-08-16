/**
 * @fileoverview 유틸리티 모듈의 중앙 집중식 익스포트
 * @description 기본 유틸리티 함수들
 * @author DaSiStart Team
 * @version 1.0.0
 */

// 기본 로깅 함수
export const logger = {
  info: (message: string, category?: string) => console.log(`[INFO]${category ? `[${category}]` : ''} ${message}`),
  warn: (message: string, category?: string) => console.warn(`[WARN]${category ? `[${category}]` : ''} ${message}`),
  error: (message: string, category?: string) => console.error(`[ERROR]${category ? `[${category}]` : ''} ${message}`),
  debug: (message: string, category?: string) => console.debug(`[DEBUG]${category ? `[${category}]` : ''} ${message}`)
};

// 기본 에러 핸들러
export const errorHandler = {
  handle: (error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  }
};

// API 에러 핸들링 함수
export const handleApiError = (error: any, context?: any) => {
  const errorMessage = error?.response?.data?.message || error?.message || 'API Error';
  logger.error(`API Error: ${errorMessage}`, 'API');
  return {
    success: false,
    error: errorMessage,
    timestamp: Date.now()
  };
};

// 기본 성능 모니터
export const performanceMonitor = {
  start: (label: string) => console.time(label),
  end: (label: string) => console.timeEnd(label),
  mark: (label: string) => logger.debug(`Performance mark: ${label}`)
};

// 로그 카테고리 상수
export const LogCategory = {
  AUDIO: 'AUDIO',
  API: 'API',
  PERFORMANCE: 'PERFORMANCE',
  USER_INTERACTION: 'USER_INTERACTION',
  ERROR: 'ERROR'
} as const;

// 에러 타입 상수
export const ErrorType = {
  API_CONNECTION: 'API_CONNECTION',
  API_TIMEOUT: 'API_TIMEOUT',
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  SPEECH_PERMISSION_DENIED: 'SPEECH_PERMISSION_DENIED',
  SPEECH_NOT_SUPPORTED: 'SPEECH_NOT_SUPPORTED',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED'
} as const;

// DaSi 모니터링 클래스 (간소화)
export class DaSiStartMonitoring {
  private static instance: DaSiStartMonitoring | null = null;
  private isInitialized = false;

  private constructor() {
    this.setupSystemInfo();
    this.startPerformanceMonitoring();
  }

  static getInstance(): DaSiStartMonitoring {
    if (!DaSiStartMonitoring.instance) {
      DaSiStartMonitoring.instance = new DaSiStartMonitoring();
    }
    return DaSiStartMonitoring.instance;
  }

  private setupSystemInfo(): void {
    try {
      logger.info('DaSi monitoring system initialized', LogCategory.PERFORMANCE);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to setup system info:', error);
    }
  }

  private startPerformanceMonitoring(): void {
    try {
      performanceMonitor.start('DaSi-Session');
      logger.info('Performance monitoring started', LogCategory.PERFORMANCE);
    } catch (error) {
      console.error('Failed to start performance monitoring:', error);
    }
  }

  public logUserAction(action: string, details?: any): void {
    logger.info(`User action: ${action}`, LogCategory.USER_INTERACTION);
    if (details) {
      logger.debug(`Action details: ${JSON.stringify(details)}`, LogCategory.USER_INTERACTION);
    }
  }

  public reportError(error: any, context?: string): void {
    errorHandler.handle(error, context);
    logger.error(`Error reported: ${error.message || error}`, LogCategory.ERROR);
  }
}

// 자동 초기화
setTimeout(() => {
  try {
    DaSiStartMonitoring.getInstance();
  } catch (error) {
    console.warn('DaSi monitoring initialization failed:', error);
  }
}, 100);

// 기본 익스포트
export default {
  logger,
  errorHandler,
  performanceMonitor,
  LogCategory,
  ErrorType,
  DaSiStartMonitoring
};