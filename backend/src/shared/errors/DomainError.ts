/**
 * 도메인 에러 분류 시스템
 * OWASP Top 10 기반 HTTP 매핑
 */

export enum ErrorCategory {
  BUSINESS_RULE = 'BUSINESS_RULE', // 비즈니스 규칙 위반 → 400
  AUTHENTICATION = 'AUTH',         // 인증 실패 → 401  
  AUTHORIZATION = 'AUTHZ',         // 권한 부족 → 403
  VALIDATION = 'VALIDATION',       // 입력 검증 → 400
  NOT_FOUND = 'NOT_FOUND',        // 리소스 없음 → 404
  CONFLICT = 'CONFLICT',          // 리소스 충돌 → 409
  RATE_LIMIT = 'RATE_LIMIT',      // 사용량 초과 → 429
  EXTERNAL = 'EXTERNAL',          // 외부 서비스 → 503
  SYSTEM = 'SYSTEM',              // 시스템 오류 → 500
  
  // 기존 호환성
  DOMAIN = 'BUSINESS_RULE'
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
    const statusMap: Record<string, number> = {
      'BUSINESS_RULE': 400,
      'AUTH': 401,
      'AUTHZ': 403,
      'VALIDATION': 400,
      'NOT_FOUND': 404,
      'CONFLICT': 409,
      'RATE_LIMIT': 429,
      'EXTERNAL': 503,
      'SYSTEM': 500
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