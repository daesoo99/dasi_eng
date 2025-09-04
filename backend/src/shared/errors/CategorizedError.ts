/**
 * Categorized Error System - Enhanced Error Classification
 * @description 에러 카테고리화, 심각도 분류, 운영팀 알림 자동화
 */

import { DomainError, ErrorCategory as DomainErrorCategory } from './DomainError';

export type ErrorCategory = 
  | 'validation'      // 입력 검증 오류
  | 'business'        // 비즈니스 로직 오류  
  | 'infrastructure'  // DB, 캐시, 외부 서비스 오류
  | 'external'        // 외부 API 오류
  | 'security'        // 보안 관련 오류
  | 'performance'     // 성능 관련 오류
  | 'configuration';  // 설정 오류

export type ErrorSeverity = 
  | 'low'             // 로그만, 사용자 영향 최소
  | 'medium'          // 모니터링 알림
  | 'high'            // 즉시 알림 필요
  | 'critical';       // 긴급 대응 필요

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  timestamp?: number;
  userAgent?: string;
  ip?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: {
    category: ErrorCategory;
    code: string;
    message: string;
    severity: ErrorSeverity;
    timestamp: number;
    requestId?: string;
    details?: any;
  };
  meta: {
    timestamp: number;
    requestId?: string;
    responseTime?: number;
  };
}

/**
 * Categorized Error - 확장된 도메인 에러
 */
export class CategorizedError extends DomainError {
  public readonly customCategory: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly alertRequired: boolean;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'medium',
    context: ErrorContext = {},
    details?: any
  ) {
    // Map custom category to DomainError category
    const domainCategory = category === 'validation' ? DomainErrorCategory.VALIDATION :
                          category === 'business' ? DomainErrorCategory.BUSINESS_RULE :
                          category === 'infrastructure' ? DomainErrorCategory.SYSTEM :
                          category === 'external' ? DomainErrorCategory.EXTERNAL :
                          category === 'security' ? DomainErrorCategory.AUTHORIZATION :
                          DomainErrorCategory.SYSTEM;
                          
    super(domainCategory, code, message, details);
    this.customCategory = category;
    this.severity = severity;
    this.context = {
      ...context,
      timestamp: Date.now()
    };
    this.isOperational = true;
    this.alertRequired = severity === 'high' || severity === 'critical';
    
    // Set name for stack traces
    this.name = `${category}Error`;
    
    // Track error metrics
    this.trackError();
  }

  /**
   * Track error in Prometheus metrics
   */
  private trackError(): void {
    try {
      const { errorCount } = require('../observability/metrics');
      errorCount.inc({ 
        error_type: this.customCategory, 
        severity: this.severity, 
        component: this.getComponent() 
      });
    } catch (error) {
      // Prevent error tracking from causing more errors
      console.warn('Failed to track error metrics:', error);
    }
  }

  /**
   * Determine component from context
   */
  private getComponent(): string {
    if (this.context.route) {
      if (this.context.route.includes('/api/cards')) return 'cards';
      if (this.context.route.includes('/api/sessions')) return 'sessions';
      if (this.context.route.includes('/api/feedback')) return 'feedback';
      if (this.context.route.includes('/api/users')) return 'users';
      if (this.context.route.includes('/docs')) return 'docs';
    }
    return 'unknown';
  }

  // Use a different name to avoid conflict with parent class

  /**
   * Convert to API response format
   */
  toResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        category: this.customCategory as any,
        code: this.code,
        message: this.message,
        severity: this.severity,
        timestamp: this.context.timestamp || Date.now(),
        requestId: this.context.requestId,
        details: this.shouldExposeDetails() ? this.details : undefined
      },
      meta: {
        timestamp: Date.now(),
        requestId: this.context.requestId,
        responseTime: this.context.timestamp ? 
          Date.now() - this.context.timestamp : undefined
      }
    };
  }

  /**
   * Determine if error details should be exposed to client
   */
  private shouldExposeDetails(): boolean {
    // Don't expose sensitive details in production
    if (process.env.NODE_ENV === 'production') {
      return this.customCategory === 'validation' || this.customCategory === 'business';
    }
    return true;
  }

  /**
   * Get HTTP status code based on category
   */
  getHttpStatus(): number {
    switch (this.customCategory) {
      case 'validation':
        return 400; // Bad Request
      case 'security':
        return this.code === 'UNAUTHORIZED' ? 401 : 403; // Unauthorized/Forbidden
      case 'business':
        return this.code.includes('NOT_FOUND') ? 404 : 422; // Not Found/Unprocessable
      case 'external':
        return 503; // Service Unavailable
      case 'infrastructure':
        return 503; // Service Unavailable
      case 'performance':
        return 408; // Request Timeout
      case 'configuration':
        return 500; // Internal Server Error
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * Check if error should trigger alerts
   */
  shouldAlert(): boolean {
    return this.alertRequired || 
           this.severity === 'critical' || 
           this.customCategory === 'security';
  }
}

/**
 * Pre-defined error factories for common scenarios
 */
export class ErrorFactory {
  static validation(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'validation', 'low', context, details);
  }

  static business(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'business', 'medium', context, details);
  }

  static infrastructure(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'infrastructure', 'high', context, details);
  }

  static external(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'external', 'medium', context, details);
  }

  static security(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'security', 'critical', context, details);
  }

  static performance(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'performance', 'high', context, details);
  }

  static configuration(message: string, code: string, context?: ErrorContext, details?: any): CategorizedError {
    return new CategorizedError(message, code, 'configuration', 'critical', context, details);
  }

  static notFound(resource: string, id?: string, context?: ErrorContext): CategorizedError {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    return new CategorizedError(message, 'RESOURCE_NOT_FOUND', 'business', 'low', context);
  }

  static unauthorized(message: string = 'Unauthorized access', context?: ErrorContext): CategorizedError {
    return new CategorizedError(message, 'UNAUTHORIZED', 'security', 'medium', context);
  }

  static rateLimited(context?: ErrorContext): CategorizedError {
    return new CategorizedError(
      'Rate limit exceeded. Please try again later.',
      'RATE_LIMIT_EXCEEDED',
      'security',
      'medium',
      context
    );
  }

  static timeout(operation: string, context?: ErrorContext): CategorizedError {
    return new CategorizedError(
      `Operation '${operation}' timed out`,
      'OPERATION_TIMEOUT',
      'performance',
      'high',
      context
    );
  }
}

/**
 * Error categorization helper
 */
export function categorizeError(error: Error, context?: ErrorContext): CategorizedError {
  // Already categorized
  if (error instanceof CategorizedError) {
    return error;
  }

  // Domain errors
  if (error instanceof DomainError) {
    return new CategorizedError(
      error.message,
      error.code,
      'business',
      'medium',
      context,
      error.details
    );
  }

  // Common error patterns
  const message = error.message.toLowerCase();
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorFactory.validation(error.message, 'VALIDATION_ERROR', context);
  }
  
  if (message.includes('not found') || message.includes('does not exist')) {
    return ErrorFactory.notFound('Resource', undefined, context);
  }
  
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorFactory.unauthorized(error.message, context);
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorFactory.timeout('Unknown operation', context);
  }
  
  if (message.includes('connection') || message.includes('network')) {
    return ErrorFactory.infrastructure(error.message, 'CONNECTION_ERROR', context);
  }

  // Default categorization
  return new CategorizedError(
    error.message,
    'UNKNOWN_ERROR',
    'infrastructure',
    'medium',
    context
  );
}

export default CategorizedError;