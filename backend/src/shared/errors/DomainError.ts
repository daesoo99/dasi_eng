/**
 * 도메인 에러 분류 시스템
 * OWASP Top 10 기반 HTTP 매핑
 */

export enum ErrorCategory {
  DOMAIN = 'DOMAIN',           // 비즈니스 규칙 위반 → 400
  AUTHENTICATION = 'AUTH',     // 인증 실패 → 401  
  AUTHORIZATION = 'AUTHZ',     // 권한 부족 → 403
  VALIDATION = 'VALIDATION',   // 입력 검증 → 400
  CONFLICT = 'CONFLICT',       // 리소스 충돌 → 409
  RATE_LIMIT = 'RATE_LIMIT',   // 사용량 초과 → 429
  EXTERNAL = 'EXTERNAL',       // 외부 서비스 → 503
  SYSTEM = 'SYSTEM'            // 시스템 오류 → 500
}

export class DomainError extends Error {
  constructor(
    public category: ErrorCategory,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DomainError';
  }

  toHttpError(): { statusCode: number; body: any } {
    const statusMap = {
      [ErrorCategory.DOMAIN]: 400,
      [ErrorCategory.AUTHENTICATION]: 401,
      [ErrorCategory.AUTHORIZATION]: 403,
      [ErrorCategory.VALIDATION]: 400,
      [ErrorCategory.CONFLICT]: 409,
      [ErrorCategory.RATE_LIMIT]: 429,
      [ErrorCategory.EXTERNAL]: 503,
      [ErrorCategory.SYSTEM]: 500
    };

    return {
      statusCode: statusMap[this.category],
      body: {
        success: false,
        error: {
          category: this.category,
          code: this.code,
          message: this.message,
          details: this.details
        }
      }
    };
  }

  /**
   * 사용자에게 보여줄 안전한 메시지 생성
   */
  getSafeMessage(): string {
    // 시스템 에러는 구체적인 내용 노출 금지
    if (this.category === ErrorCategory.SYSTEM) {
      return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    return this.message;
  }
}