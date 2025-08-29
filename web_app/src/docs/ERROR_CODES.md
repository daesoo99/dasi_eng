# 🚨 플러그인 시스템 에러 코드 참조

## 📋 표준 에러 코드

| 코드 | 설명 | 재시도 가능 | 예시 상황 |
|------|------|-------------|-----------|
| `E_PERMISSION` | 권한 거부 | ❌ | 마이크 권한 거부 |
| `E_UNSUPPORTED` | 지원하지 않는 기능 | ❌ | 브라우저에서 Speech API 미지원 |
| `E_TIMEOUT` | 타임아웃 | ✅ | 10초 내 음성 인식 실패 |
| `E_ABORTED` | 사용자 취소 | ❌ | AbortSignal로 작업 취소 |
| `E_NETWORK` | 네트워크 오류 | ✅ | 음성 서비스 연결 실패 |
| `E_INVALID_INPUT` | 잘못된 입력 | ❌ | 빈 텍스트, 잘못된 언어 코드 |
| `E_INTERNAL` | 내부 오류 | ❌ | 예상치 못한 시스템 오류 |

## 🎤 Speech 플러그인 에러 매핑

### **speakText() 메서드**

| 브라우저 에러 | 플러그인 에러 코드 | 설명 | 대응 방안 |
|---------------|-------------------|------|-----------|
| `not-allowed` | `E_PERMISSION` | 음성 재생 권한 거부 | 사용자에게 권한 요청 안내 |
| `network` | `E_NETWORK` | 네트워크 연결 문제 | 재시도 제안 |
| `synthesis-unavailable` | `E_UNSUPPORTED` | TTS 기능 미지원 | 대체 방법 안내 |
| `synthesis-failed` | `E_INTERNAL` | TTS 엔진 오류 | 오류 보고 및 재시도 |
| `language-unavailable` | `E_UNSUPPORTED` | 지원하지 않는 언어 | 지원 언어 목록 제공 |
| `voice-unavailable` | `E_UNSUPPORTED` | 음성 파일 없음 | 기본 음성 사용 |
| `text-too-long` | `E_INVALID_INPUT` | 텍스트 길이 초과 | 텍스트 분할 제안 |
| `rate-not-supported` | `E_INVALID_INPUT` | 지원하지 않는 속도 | 유효 범위 안내 (0.1-10) |
| `interrupted` | `E_ABORTED` | 재생 중단됨 | 정상적 중단으로 처리 |
| `paused` | `E_ABORTED` | 일시정지됨 | 정상적 중단으로 처리 |

### **recognizeSpeech() 메서드**

| 브라우저 에러 | 플러그인 에러 코드 | 설명 | 대응 방안 |
|---------------|-------------------|------|-----------|
| `not-allowed` | `E_PERMISSION` | 마이크 권한 거부 | 마이크 권한 설정 안내 |
| `no-speech` | `E_INVALID_INPUT` | 음성 감지되지 않음 | 다시 말하기 요청 |
| `audio-capture` | `E_PERMISSION` | 오디오 캡처 실패 | 마이크 연결 상태 확인 |
| `network` | `E_NETWORK` | 음성 인식 서비스 연결 실패 | 인터넷 연결 확인 후 재시도 |
| `not-allowed` | `E_PERMISSION` | 음성 인식 권한 없음 | 브라우저 설정 확인 |
| `service-not-allowed` | `E_UNSUPPORTED` | 음성 인식 서비스 비활성화 | 브라우저 설정 변경 안내 |
| `bad-grammar` | `E_INVALID_INPUT` | 문법 오류 | 명확하게 말하기 요청 |
| `language-not-supported` | `E_UNSUPPORTED` | 지원하지 않는 언어 | 지원 언어로 변경 |

### **playBeep() 메서드**

| 조건 | 에러 코드 | 설명 | 대응 방안 |
|------|-----------|------|-----------|
| AudioContext 미지원 | `E_UNSUPPORTED` | 브라우저에서 오디오 재생 미지원 | 시각적 신호로 대체 |
| AudioContext suspended | `E_PERMISSION` | 오디오 재생 정책으로 차단 | 사용자 상호작용 후 재시도 |
| 주파수 범위 초과 | `E_INVALID_INPUT` | 지원하지 않는 주파수 | 유효 범위 (20-20000Hz) 안내 |
| 재생 길이 초과 | `E_INVALID_INPUT` | 너무 긴 신호음 | 적절한 길이 (50-5000ms) 제안 |

## 🔄 에러 처리 베스트 프랙티스

### **1. 재시도 가능한 에러**
```typescript
async function handleRetryableError<T>(
  operation: () => Promise<Result<T>>,
  maxRetries = 3,
  delayMs = 1000
): Promise<Result<T>> {
  let lastError: Result<never>;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await operation();
    
    if (result.ok) {
      return result;
    }
    
    lastError = result;
    
    // 재시도 가능한 에러만 재시도
    if (!result.retryable) {
      break;
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  return lastError!;
}

// 사용 예시
const result = await handleRetryableError(
  () => speechPlugin.speakText('Hello'),
  3,  // 최대 3회 재시도
  1000 // 1초 간격
);
```

### **2. 사용자 친화적 에러 메시지**
```typescript
function getUserFriendlyMessage(error: Result<never>): string {
  const messages: Record<string, string> = {
    E_PERMISSION: '마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.',
    E_UNSUPPORTED: '이 브라우저에서는 음성 기능이 지원되지 않습니다.',
    E_TIMEOUT: '음성 인식 시간이 초과되었습니다. 다시 시도해주세요.',
    E_ABORTED: '작업이 취소되었습니다.',
    E_NETWORK: '인터넷 연결을 확인하고 다시 시도해주세요.',
    E_INVALID_INPUT: '입력값이 올바르지 않습니다.',
    E_INTERNAL: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  };
  
  return messages[error.code] || '알 수 없는 오류가 발생했습니다.';
}
```

### **3. 에러 분석 및 로깅**
```typescript
interface ErrorMetrics {
  code: string;
  count: number;
  lastOccurred: Date;
  userAgent?: string;
  details?: unknown;
}

class ErrorTracker {
  private metrics = new Map<string, ErrorMetrics>();
  
  track(error: Result<never>, context?: Record<string, unknown>) {
    const existing = this.metrics.get(error.code);
    
    this.metrics.set(error.code, {
      code: error.code,
      count: (existing?.count || 0) + 1,
      lastOccurred: new Date(),
      userAgent: navigator.userAgent,
      details: { ...error.details, ...context }
    });
    
    // 개발 환경에서는 콘솔에 출력
    if (import.meta.env.DEV) {
      console.warn(`[Plugin Error] ${error.code}:`, {
        cause: error.cause,
        details: error.details,
        context
      });
    }
  }
  
  getReport(): ErrorMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.count - a.count);
  }
}

const errorTracker = new ErrorTracker();

// 사용 예시
const result = await speechPlugin.speakText('Hello');
if (!result.ok) {
  errorTracker.track(result, { 
    method: 'speakText',
    text: 'Hello',
    timestamp: Date.now() 
  });
}
```

## 🧪 테스트 시나리오

### **에러 상황별 테스트 케이스**

```typescript
describe('Speech Plugin Error Handling', () => {
  test('should handle permission denial', async () => {
    // 권한 거부 시뮬레이션
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockRejectedValue(
          new Error('Permission denied')
        )
      }
    });
    
    const result = await speechPlugin.recognizeSpeech();
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E_PERMISSION');
  });
  
  test('should handle timeout gracefully', async () => {
    const controller = new AbortController();
    
    // 100ms 후 타임아웃
    setTimeout(() => controller.abort(), 100);
    
    const result = await speechPlugin.recognizeSpeech({
      maxDuration: 50,
      signal: controller.signal
    });
    
    expect(result.ok).toBe(false);
    expect(result.code).toBeOneOf(['E_TIMEOUT', 'E_ABORTED']);
  });
  
  test('should handle unsupported features', async () => {
    // SpeechSynthesis 제거
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined
    });
    
    const plugin = new SimpleSpeechPlugin();
    const result = await plugin.speakText('test');
    
    expect(result.ok).toBe(false);
    expect(result.code).toBe('E_UNSUPPORTED');
  });
});
```

## 📈 에러 모니터링 대시보드

```typescript
// 실시간 에러 현황 (관리자 패널용)
function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorMetrics[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setErrors(errorTracker.getReport());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <h2>🚨 에러 현황</h2>
      {errors.map(error => (
        <div key={error.code} className="error-item">
          <strong>{error.code}</strong>
          <span>발생 {error.count}회</span>
          <small>마지막: {error.lastOccurred.toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 핵심 개선사항 요약

| 개선 영역 | Before | After |
|-----------|--------|-------|
| **추상화 레벨** | 5단계 (과도함) | 2단계 (적절함) |
| **에러 처리** | 비표준 Result | 표준화된 에러 코드 |
| **취소 지원** | ❌ | ✅ AbortSignal |
| **문서화** | 부족 | 완전한 에러 코드 테이블 |
| **테스트 가능성** | 어려움 | 쉬운 Mock/Test |

**🎉 이제 Rule of Three를 준수하고, 표준화된 에러 처리와 취소 기능을 갖춘 실용적인 플러그인 시스템이 완성되었습니다!**