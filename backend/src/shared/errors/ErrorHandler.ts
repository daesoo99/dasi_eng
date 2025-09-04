/**
 * Centralized Error Handler
 * @description 에러 처리 및 로깅 중앙화
 */

import { Request, Response, NextFunction } from 'express';
import { DomainError, ErrorCategory } from './DomainError';
import { z } from 'zod';

/**
 * 에러 로깅 인터페이스
 */
interface ErrorLogger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
}

/**
 * 에러 처리기 설정
 */
export interface ErrorHandlerOptions {
  logger?: ErrorLogger;
  includeStackTrace?: boolean;
  maskSensitiveData?: boolean;
}

/**
 * 중앙 에러 처리기
 */
export class CentralizedErrorHandler {
  constructor(
    private options: ErrorHandlerOptions = {}
  ) {
    this.options = {
      includeStackTrace: process.env.NODE_ENV === 'development',
      maskSensitiveData: process.env.NODE_ENV === 'production',
      ...options
    };
  }

  /**
   * Express 에러 처리 미들웨어
   */
  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const handled = this.handleError(error, req);
      
      res.status(handled.statusCode).json(handled.body);
    };
  }

  /**
   * 에러 처리 메인 로직
   */
  handleError(error: Error, req?: Request): { statusCode: number; body: any } {
    // 1. DomainError 처리
    if (error instanceof DomainError) {
      this.logError(error, req, 'domain');
      return this.formatDomainError(error);
    }

    // 2. Zod 검증 에러 처리
    if (error instanceof z.ZodError) {
      this.logError(error, req, 'validation');
      return this.formatZodError(error);
    }

    // 3. HTTP 관련 에러
    if (this.isHttpError(error)) {
      this.logError(error, req, 'http');
      return this.formatHttpError(error);
    }

    // 4. 일반 시스템 에러
    this.logError(error, req, 'system');
    return this.formatSystemError(error);
  }

  /**
   * DomainError 포맷팅
   */
  private formatDomainError(error: DomainError): { statusCode: number; body: any } {
    const httpError = error.toHttpError();
    
    if (this.options.maskSensitiveData && error.category === ErrorCategory.SYSTEM) {
      httpError.body.error.message = error.getSafeMessage();
      delete httpError.body.error.details;
    }

    return httpError;
  }

  /**
   * Zod 에러 포맷팅
   */
  private formatZodError(error: z.ZodError): { statusCode: number; body: any } {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: {
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
            received: 'received' in issue ? issue.received : undefined
          }))
        }
      }
    };
  }

  /**
   * HTTP 에러 포맷팅
   */
  private formatHttpError(error: any): { statusCode: number; body: any } {
    const statusCode = error.statusCode || error.status || 500;
    
    return {
      statusCode,
      body: {
        success: false,
        error: {
          category: this.getHttpErrorCategory(statusCode),
          code: error.code || 'HTTP_ERROR',
          message: error.message || 'HTTP error occurred'
        }
      }
    };
  }

  /**
   * 시스템 에러 포맷팅
   */
  private formatSystemError(error: Error): { statusCode: number; body: any } {
    const body: any = {
      success: false,
      error: {
        category: ErrorCategory.SYSTEM,
        code: 'INTERNAL_ERROR',
        message: this.options.maskSensitiveData 
          ? '내부 서버 오류가 발생했습니다.' 
          : error.message
      }
    };

    // 개발 환경에서만 스택 트레이스 포함
    if (this.options.includeStackTrace && error.stack) {
      body.error.stack = error.stack;
    }

    return {
      statusCode: 500,
      body
    };
  }

  /**
   * 에러 로깅
   */
  private logError(error: Error, req?: Request, type: string = 'unknown'): void {
    const logger = this.options.logger || console;
    
    const logMeta: any = {
      type,
      name: error.name,
      message: error.message
    };

    // 요청 정보 추가
    if (req) {
      logMeta.request = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      // 민감한 정보 제외
      if (!this.options.maskSensitiveData) {
        logMeta.request.body = this.sanitizeRequestBody(req.body);
        logMeta.request.params = req.params;
        logMeta.request.query = req.query;
      }
    }

    // DomainError 추가 정보
    if (error instanceof DomainError) {
      logMeta.category = error.category;
      logMeta.code = error.code;
      logMeta.details = error.details;
    }

    // 에러 레벨 결정 및 로깅
    if (this.isCriticalError(error)) {
      logger.error('Critical error occurred', logMeta);
    } else {
      logger.warn('Error occurred', logMeta);
    }
  }

  /**
   * HTTP 에러 여부 확인
   */
  private isHttpError(error: any): boolean {
    return error.statusCode || error.status || error.name === 'HTTPError';
  }

  /**
   * HTTP 상태 코드로 에러 카테고리 결정
   */
  private getHttpErrorCategory(statusCode: number): ErrorCategory {
    if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
    if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
    if (statusCode === 404) return ErrorCategory.NOT_FOUND;
    if (statusCode === 409) return ErrorCategory.CONFLICT;
    if (statusCode === 429) return ErrorCategory.RATE_LIMIT;
    if (statusCode >= 500) return ErrorCategory.SYSTEM;
    return ErrorCategory.VALIDATION;
  }

  /**
   * 중요 에러 여부 판단
   */
  private isCriticalError(error: Error): boolean {
    if (error instanceof DomainError) {
      return error.category === ErrorCategory.SYSTEM || 
             error.category === ErrorCategory.EXTERNAL;
    }
    return true; // 일반 시스템 에러는 모두 중요
  }

  /**
   * 요청 body 민감 정보 제거
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'key', 'secret', 'credential'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * 에러 팩토리 함수들
 */
export class ErrorFactory {
  /**
   * 404 NotFound 에러 생성
   */
  static notFound(resource: string, id?: string): DomainError {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
      
    return new DomainError(
      ErrorCategory.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      message,
      { resource, id }
    );
  }

  /**
   * 권한 부족 에러 생성
   */
  static forbidden(action: string, resource?: string): DomainError {
    const message = resource
      ? `Insufficient permissions to ${action} ${resource}`
      : `Insufficient permissions to ${action}`;
      
    return new DomainError(
      ErrorCategory.AUTHORIZATION,
      'INSUFFICIENT_PERMISSIONS',
      message,
      { action, resource }
    );
  }

  /**
   * 비즈니스 규칙 위반 에러 생성
   */
  static businessRuleViolation(rule: string, details?: any): DomainError {
    return new DomainError(
      ErrorCategory.BUSINESS_RULE,
      'BUSINESS_RULE_VIOLATION',
      `Business rule violated: ${rule}`,
      details
    );
  }

  /**
   * 입력 검증 실패 에러 생성
   */
  static validationFailed(field: string, reason: string): DomainError {
    return new DomainError(
      ErrorCategory.VALIDATION,
      'INPUT_VALIDATION_FAILED',
      `Validation failed for field '${field}': ${reason}`,
      { field, reason }
    );
  }

  /**
   * 외부 서비스 에러 생성
   */
  static externalServiceError(service: string, originalError?: Error): DomainError {
    return new DomainError(
      ErrorCategory.EXTERNAL,
      'EXTERNAL_SERVICE_ERROR',
      `External service '${service}' is temporarily unavailable`,
      { 
        service, 
        originalMessage: originalError?.message,
        timestamp: new Date().toISOString()
      }
    );
  }
}

/**
 * 전역 에러 핸들러 인스턴스
 */
export const globalErrorHandler = new CentralizedErrorHandler({
  logger: console, // 나중에 winston 등으로 교체
  includeStackTrace: process.env.NODE_ENV === 'development',
  maskSensitiveData: process.env.NODE_ENV === 'production'
});