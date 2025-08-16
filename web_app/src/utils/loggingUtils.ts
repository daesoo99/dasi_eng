/**
 * @fileoverview 구조화된 로깅 시스템
 * @description AI 면접 시뮬레이터의 모든 로그를 체계적으로 관리하고 분석
 * @author DaSiStart Team
 * @version 1.0.0
 */

// 로그 레벨 정의
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

// 로그 카테고리 정의
export enum LogCategory {
  SYSTEM = 'system',
  API = 'api',
  SPEECH = 'speech',
  INTERVIEW = 'interview',
  USER_ACTION = 'user_action',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  ANALYTICS = 'analytics'
}

// 로그 엔트리 인터페이스
export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly category: LogCategory;
  readonly message: string;
  readonly data?: Record<string, any>;
  readonly context?: {
    userId?: string;
    sessionId?: string;
    interviewId?: string;
    component?: string;
    action?: string;
    userAgent?: string;
    url?: string;
  };
  readonly tags?: string[];
  readonly stackTrace?: string;
  readonly correlationId?: string;
}

// 로그 필터 인터페이스
export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  startTime?: number;
  endTime?: number;
  tags?: string[];
  searchText?: string;
}

// 로그 통계 인터페이스
export interface LogStatistics {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  errorRate: number;
  criticalCount: number;
  recentErrors: LogEntry[];
  topErrors: Array<{ message: string; count: number }>;
}

/**
 * 구조화된 로거 클래스
 * 모든 애플리케이션 로그를 중앙에서 관리
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private logs: LogEntry[] = [];
  private readonly maxLogsCount = 5000;
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private enableConsoleOutput = true;
  private enableLocalStorage = true;
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadLogsFromStorage();
    this.setupPeriodicCleanup();
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 로컬 스토리지에서 로그 불러오기
   */
  private loadLogsFromStorage(): void {
    if (!this.enableLocalStorage) return;

    try {
      const savedLogs = localStorage.getItem('dasistart_logs');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        // 24시간 이내 로그만 복원
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        this.logs = parsedLogs.filter((log: LogEntry) => log.timestamp > cutoffTime);
      }
    } catch (error) {
      console.warn('로그 복원 실패:', error);
    }
  }

  /**
   * 로컬 스토리지에 로그 저장
   */
  private saveLogsToStorage(): void {
    if (!this.enableLocalStorage) return;

    try {
      // 최근 1000개 로그만 저장
      const logsToSave = this.logs.slice(-1000);
      localStorage.setItem('dasistart_logs', JSON.stringify(logsToSave));
    } catch (error) {
      console.warn('로그 저장 실패:', error);
    }
  }

  /**
   * 주기적 정리 설정
   */
  private setupPeriodicCleanup(): void {
    // 5분마다 오래된 로그 정리
    setInterval(() => {
      this.cleanupOldLogs();
      this.saveLogsToStorage();
    }, 5 * 60 * 1000);
  }

  /**
   * 오래된 로그 정리
   */
  private cleanupOldLogs(): void {
    // 24시간 이전 로그 제거
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);

    // 최대 개수 초과 시 오래된 로그부터 제거
    if (this.logs.length > this.maxLogsCount) {
      this.logs = this.logs.slice(-this.maxLogsCount);
    }
  }

  /**
   * 로그 엔트리 생성
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      context: {
        sessionId: this.sessionId,
        userId: this.userId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      },
      tags,
      correlationId: this.generateCorrelationId()
    };

    // 에러 레벨의 경우 스택 트레이스 추가
    if (level >= LogLevel.ERROR) {
      entry.stackTrace = new Error().stack;
    }

    return entry;
  }

  /**
   * 로그 ID 생성
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 상관관계 ID 생성
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 로그 기록
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    // 현재 로그 레벨보다 낮은 레벨은 무시
    if (level < this.currentLogLevel) {
      return;
    }

    const entry = this.createLogEntry(level, category, message, data, context, tags);
    this.logs.push(entry);

    // 콘솔 출력
    if (this.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // 중요한 로그는 즉시 저장
    if (level >= LogLevel.ERROR) {
      this.saveLogsToStorage();
    }

    // 외부 로깅 서비스 전송 (구현 예정)
    if (level >= LogLevel.CRITICAL) {
      this.sendToExternalService(entry);
    }
  }

  /**
   * 콘솔 출력
   */
  private outputToConsole(entry: LogEntry): void {
    const levelEmoji = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: '📝',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🚨'
    };

    const categoryColor = {
      [LogCategory.SYSTEM]: 'color: #666',
      [LogCategory.API]: 'color: #2196F3',
      [LogCategory.SPEECH]: 'color: #4CAF50',
      [LogCategory.INTERVIEW]: 'color: #FF9800',
      [LogCategory.USER_ACTION]: 'color: #9C27B0',
      [LogCategory.PERFORMANCE]: 'color: #F44336',
      [LogCategory.SECURITY]: 'color: #E91E63',
      [LogCategory.ANALYTICS]: 'color: #00BCD4'
    };

    const logMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.CRITICAL]: console.error
    }[entry.level];

    const timestamp = new Date(entry.timestamp).toISOString();
    const header = `${levelEmoji[entry.level]} [${timestamp}] ${entry.category.toUpperCase()}`;

    if (entry.data) {
      console.group(`%c${header}: ${entry.message}`, categoryColor[entry.category]);
      console.log('Data:', entry.data);
      if (entry.context) console.log('Context:', entry.context);
      if (entry.tags) console.log('Tags:', entry.tags);
      console.groupEnd();
    } else {
      logMethod(`%c${header}: ${entry.message}`, categoryColor[entry.category]);
    }
  }

  /**
   * 외부 서비스로 전송 (구현 예정)
   */
  private sendToExternalService(entry: LogEntry): void {
    // TODO: Sentry, LogRocket 등 외부 로깅 서비스 연동
    console.log('Sending critical log to external service:', entry);
  }

  // 공개 메서드들

  /**
   * 디버그 로그
   */
  public debug(
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    this.log(LogLevel.DEBUG, category, message, data, context, tags);
  }

  /**
   * 정보 로그
   */
  public info(
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    this.log(LogLevel.INFO, category, message, data, context, tags);
  }

  /**
   * 경고 로그
   */
  public warn(
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    this.log(LogLevel.WARN, category, message, data, context, tags);
  }

  /**
   * 에러 로그
   */
  public error(
    category: LogCategory,
    message: string,
    error?: Error,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    const data = error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    } : undefined;

    this.log(LogLevel.ERROR, category, message, data, context, tags);
  }

  /**
   * 중요 로그
   */
  public critical(
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    context?: Partial<LogEntry['context']>,
    tags?: string[]
  ): void {
    this.log(LogLevel.CRITICAL, category, message, data, context, tags);
  }

  /**
   * 사용자 설정
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public setConsoleOutput(enabled: boolean): void {
    this.enableConsoleOutput = enabled;
  }

  public setLocalStorage(enabled: boolean): void {
    this.enableLocalStorage = enabled;
  }

  /**
   * 로그 조회
   */
  public getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }

      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }

      if (filter.tags && filter.tags.length > 0) {
        filteredLogs = filteredLogs.filter(log => 
          log.tags?.some(tag => filter.tags!.includes(tag))
        );
      }

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data || {}).toLowerCase().includes(searchLower)
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 로그 통계 생성
   */
  public getStatistics(timeRangeHours = 24): LogStatistics {
    const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > cutoffTime);

    const stats: LogStatistics = {
      total: recentLogs.length,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {} as Record<LogCategory, number>,
      errorRate: 0,
      criticalCount: 0,
      recentErrors: [],
      topErrors: []
    };

    // 레벨별 통계
    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        stats.byLevel[level] = recentLogs.filter(log => log.level === level).length;
      }
    });

    // 카테고리별 통계
    Object.values(LogCategory).forEach(category => {
      stats.byCategory[category] = recentLogs.filter(log => log.category === category).length;
    });

    // 에러율 계산
    const errorCount = stats.byLevel[LogLevel.ERROR] + stats.byLevel[LogLevel.CRITICAL];
    stats.errorRate = recentLogs.length > 0 ? (errorCount / recentLogs.length) * 100 : 0;
    stats.criticalCount = stats.byLevel[LogLevel.CRITICAL];

    // 최근 에러들
    stats.recentErrors = recentLogs
      .filter(log => log.level >= LogLevel.ERROR)
      .slice(0, 10);

    // 자주 발생하는 에러들
    const errorMessages = recentLogs
      .filter(log => log.level >= LogLevel.ERROR)
      .reduce((acc, log) => {
        const key = log.message.substring(0, 100); // 첫 100자만 키로 사용
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    stats.topErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return stats;
  }

  /**
   * 로그 내보내기
   */
  public exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV 형태로 내보내기
      const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'sessionId'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          LogLevel[log.level],
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.context?.userId || '',
          log.context?.sessionId || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  /**
   * 로그 클리어
   */
  public clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  /**
   * 현재 세션 정보
   */
  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.logs.length > 0 ? this.logs[0].timestamp : Date.now(),
      logCount: this.logs.length,
      currentLevel: this.currentLogLevel
    };
  }
}

// 편의 함수들
export const logger = StructuredLogger.getInstance();

export const logDebug = (category: LogCategory, message: string, data?: any, context?: any) => {
  logger.debug(category, message, data, context);
};

export const logInfo = (category: LogCategory, message: string, data?: any, context?: any) => {
  logger.info(category, message, data, context);
};

export const logWarn = (category: LogCategory, message: string, data?: any, context?: any) => {
  logger.warn(category, message, data, context);
};

export const logError = (category: LogCategory, message: string, error?: Error, context?: any) => {
  logger.error(category, message, error, context);
};

export const logCritical = (category: LogCategory, message: string, data?: any, context?: any) => {
  logger.critical(category, message, data, context);
};

// 특정 도메인용 로거들
export const apiLogger = {
  request: (endpoint: string, method: string, data?: any) => 
    logInfo(LogCategory.API, `API 요청: ${method} ${endpoint}`, { endpoint, method, requestData: data }),
  
  response: (endpoint: string, status: number, duration: number) =>
    logInfo(LogCategory.API, `API 응답: ${endpoint}`, { endpoint, status, duration }),
  
  error: (endpoint: string, error: Error) =>
    logError(LogCategory.API, `API 에러: ${endpoint}`, error, { endpoint })
};

export const speechLogger = {
  start: (config?: any) => 
    logInfo(LogCategory.SPEECH, '음성 인식 시작', config),
  
  result: (transcript: string, confidence: number) =>
    logInfo(LogCategory.SPEECH, '음성 인식 결과', { transcript, confidence }),
  
  error: (error: string) =>
    logError(LogCategory.SPEECH, '음성 인식 에러', new Error(error))
};

export const interviewLogger = {
  start: (config: any) =>
    logInfo(LogCategory.INTERVIEW, '면접 시작', config),
  
  questionGenerated: (question: string, questionNumber: number) =>
    logInfo(LogCategory.INTERVIEW, '질문 생성', { question, questionNumber }),
  
  answerEvaluated: (score: number, feedback: string) =>
    logInfo(LogCategory.INTERVIEW, '답변 평가', { score, feedback }),
  
  end: (sessionDuration: number, totalQuestions: number) =>
    logInfo(LogCategory.INTERVIEW, '면접 종료', { sessionDuration, totalQuestions })
};

// React Hook을 위한 유틸리티
export const useLogging = (component: string) => {
  return {
    logInfo: (message: string, data?: any) => 
      logInfo(LogCategory.USER_ACTION, message, data, { component }),
    
    logError: (message: string, error?: Error) =>
      logError(LogCategory.USER_ACTION, message, error, { component }),
    
    logUserAction: (action: string, data?: any) =>
      logInfo(LogCategory.USER_ACTION, `사용자 액션: ${action}`, data, { component, action })
  };
};

export default StructuredLogger;