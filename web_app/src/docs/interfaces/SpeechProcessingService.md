# SpeechProcessingService Interface Documentation

## 개요
SpeechProcessingService는 음성 합성(TTS)과 음성 인식(Speech Recognition) 기능을 제공하는 핵심 서비스입니다. 브라우저의 Web Speech API를 추상화하여 일관된 인터페이스를 제공합니다.

## 주요 기능
- 텍스트를 음성으로 변환 (Text-to-Speech)
- 음성을 텍스트로 변환 (Speech Recognition) 
- 신호음 생성 및 재생
- 비동기 작업 관리 및 에러 처리

## 인터페이스 정의

### `ISpeechProcessingService`

```typescript
interface ISpeechProcessingService {
  // TTS (Text-to-Speech)
  speakText(
    text: string, 
    language?: string, 
    rate?: number
  ): Promise<SpeechResult>;
  
  // 음성 인식
  recognizeSpeech(
    language?: string,
    duration?: number,
    onResult?: (transcript: string, confidence: number) => void
  ): Promise<SpeechRecognitionResult>;
  
  // 신호음
  playBeep(
    frequency?: number,
    duration?: number
  ): Promise<void>;
  
  // 제어
  stopAllSpeech(): void;
  cancelRecognition(): void;
  
  // 상태 조회
  isProcessing(): boolean;
  getCurrentOperation(): SpeechOperation | null;
  
  // 리소스 정리
  cleanup(): void;
}
```

### 결과 타입 정의

```typescript
interface SpeechResult {
  success: boolean;
  error?: string;
  duration?: number; // 실제 재생 시간 (ms)
}

interface SpeechRecognitionResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: string;
  isFinal?: boolean;
}

type SpeechOperation = 
  | 'tts'           // 음성 합성 중
  | 'recognition'   // 음성 인식 중  
  | 'beep';         // 신호음 재생 중
```

## 사용 방법

### 텍스트 음성 변환 (TTS)

```typescript
const speechService = container.createSpeechProcessingService();

// 기본 사용법
const result = await speechService.speakText('안녕하세요');
if (result.success) {
  console.log('TTS completed in', result.duration, 'ms');
} else {
  console.error('TTS failed:', result.error);
}

// 언어와 속도 지정
const result2 = await speechService.speakText(
  'Hello world',
  'en-US',  // 영어
  1.2       // 1.2배속
);
```

### 음성 인식

```typescript
// 기본 음성 인식
const recognition = await speechService.recognizeSpeech('en-US', 5000);
if (recognition.success) {
  console.log('Recognized:', recognition.transcript);
  console.log('Confidence:', recognition.confidence);
}

// 실시간 결과 콜백과 함께
const recognition2 = await speechService.recognizeSpeech(
  'en-US',
  10000,
  (transcript, confidence) => {
    console.log('Interim result:', transcript, confidence);
  }
);
```

### 신호음 재생

```typescript
// 기본 신호음 (800Hz, 200ms)
await speechService.playBeep();

// 커스텀 신호음
await speechService.playBeep(
  1000,  // 1000Hz
  500    // 500ms
);
```

### 제어 및 상태 관리

```typescript
// 모든 음성 중지
speechService.stopAllSpeech();

// 음성 인식 취소
speechService.cancelRecognition();

// 현재 상태 확인
if (speechService.isProcessing()) {
  const operation = speechService.getCurrentOperation();
  console.log('Currently processing:', operation);
}

// 리소스 정리
speechService.cleanup();
```

## 내부 구조

### Adapter Pattern 활용

```typescript
class SpeechProcessingService {
  private speechSynthesis: ISpeechSynthesisAdapter;
  private speechRecognition: ISpeechRecognitionAdapter;
  private audioContext: IAudioContextAdapter;
  
  constructor(adapterFactory: IAdapterFactory) {
    this.speechSynthesis = adapterFactory.createSpeechSynthesisAdapter();
    this.speechRecognition = adapterFactory.createSpeechRecognitionAdapter();
    this.audioContext = adapterFactory.createAudioContextAdapter();
  }
}
```

### 메서드 분할 (Long Method 리팩토링 적용)

#### `speakText()` 메서드 분할

```typescript
// 기존: 72라인 → 분할 후: 각 메서드 20라인 이하
private async speakText(text: string, language?: string, rate?: number) {
  const config = this.prepareSpeechConfig(text, language, rate);
  const utterance = this.createUtterance(config);
  return this.executeSpeech(utterance);
}

private prepareSpeechConfig(text: string, language?: string, rate?: number) {
  // 설정 준비 로직 (15라인)
}

private createUtterance(config: SpeechConfig) {
  // Utterance 생성 로직 (18라인)
}

private executeSpeech(utterance: SpeechSynthesisUtterance) {
  // 실제 음성 재생 로직 (20라인)
}
```

#### `recognizeSpeech()` 메서드 분할

```typescript
private async recognizeSpeech(language?: string, duration?: number, onResult?: Function) {
  const recognition = this.initializeRecognition(language);
  this.setupRecognitionEvents(recognition, onResult);
  return this.startRecognitionWithTimeout(recognition, duration);
}
```

## 에러 처리

### 일반적인 에러 유형

```typescript
enum SpeechErrorType {
  NOT_SUPPORTED = 'not_supported',      // 브라우저 미지원
  PERMISSION_DENIED = 'permission_denied', // 마이크 권한 거부
  TIMEOUT = 'timeout',                   // 타임아웃
  NETWORK_ERROR = 'network_error',       // 네트워크 오류
  UNKNOWN = 'unknown'                    // 기타 오류
}
```

### 에러 처리 예시

```typescript
try {
  const result = await speechService.speakText('Hello');
  if (!result.success) {
    switch (result.error) {
      case 'not_supported':
        showError('이 브라우저는 음성 합성을 지원하지 않습니다.');
        break;
      case 'permission_denied':
        showError('마이크 권한이 필요합니다.');
        break;
      default:
        showError('음성 처리 중 오류가 발생했습니다.');
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## 성능 최적화

### 리소스 관리
- 사용하지 않는 SpeechSynthesisUtterance 객체 정리
- SpeechRecognition 인스턴스 재사용
- AudioContext 적절한 suspend/resume

### 메모리 누수 방지
- 이벤트 리스너 자동 정리
- 타이머 리소스 해제
- cleanup() 메서드로 완전한 정리

## 브라우저 호환성

### 지원 브라우저
- Chrome 33+
- Firefox 49+
- Safari 14.1+
- Edge 79+

### 폴백 처리
```typescript
if (!window.speechSynthesis) {
  throw new Error('Speech synthesis not supported');
}

if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
  throw new Error('Speech recognition not supported');
}
```

## 테스트 가능성

Mock 서비스를 통한 테스트:

```typescript
const mockSpeechService = new MockSpeechProcessingService();
mockSpeechService.mockConfig = {
  shouldFailSpeak: false,
  shouldFailRecognition: false,
  recognitionResult: 'Hello world',
  recognitionConfidence: 0.95
};

const result = await mockSpeechService.speakText('test');
expect(result.success).toBe(true);
```