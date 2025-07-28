// 기본 서비스 클래스 - 모든 서비스의 부모 클래스
class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  // 로깅 헬퍼
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`);
  }

  // 에러 로깅
  logError(error, context = '') {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.serviceName}] [ERROR] ${context}:`, error);
  }

  // 성공 응답 생성
  successResponse(data, message = 'Success') {
    return {
      success: true,
      data,
      message,
      timestamp: Date.now()
    };
  }

  // 에러 응답 생성
  errorResponse(error, message = 'An error occurred') {
    return {
      success: false,
      error: error.message || error,
      message,
      timestamp: Date.now()
    };
  }

  // 데이터 검증 헬퍼
  validateRequired(data, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
    }
  }

  // 데이터 정리 (XSS 방지 등)
  sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // script 태그 제거
      .replace(/[<>]/g, ''); // 기본적인 HTML 태그 제거
  }

  // 객체의 모든 문자열 필드 정리
  sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // 재시도 로직 (API 호출 등에 사용)
  async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        if (i > 0) {
          this.log(`작업이 ${i + 1}번째 시도에서 성공했습니다.`);
        }
        return result;
      } catch (error) {
        lastError = error;
        this.logError(error, `시도 ${i + 1}/${maxRetries} 실패`);
        
        if (i < maxRetries - 1) {
          this.log(`${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 지수 백오프
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = BaseService;