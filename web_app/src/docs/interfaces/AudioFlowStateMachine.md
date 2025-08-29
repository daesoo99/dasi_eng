# AudioFlowStateMachine Interface Documentation

## 개요
AudioFlowStateMachine은 오디오 학습 플로우의 복잡한 상태 전환을 관리하는 상태 머신입니다. State Pattern을 구현하여 각 상태별 동작을 캡슐화합니다.

## 상태 다이어그램

```
idle → tts → beep → recording → processing → idle
  ↓                    ↓           ↓
timeout ←----------←  timeout   timeout
  ↓
answer_tts → idle
```

## 인터페이스 정의

### `IAudioFlowStateMachine`

```typescript
interface IAudioFlowStateMachine {
  // 상태 조회
  getCurrentState(): FlowState;
  getContext(): StateMachineContext;
  getAllowedActions(): string[];
  
  // 플로우 제어
  startFlow(koreanText: string): Promise<ActionResult>;
  pauseFlow(): ActionResult;
  resumeFlow(): ActionResult;
  stopFlow(): ActionResult;
  
  // 액션 실행
  executeAction(action: string): Promise<ActionResult>;
  playAnswerAndNext(answerText?: string): Promise<void>;
  
  // UI 표시 정보
  getDisplayInfo(): DisplayInfo;
  
  // 컨텍스트 업데이트
  updateContext(updates: Partial<StateMachineContext>): void;
  
  // 리소스 정리
  cleanup(): Promise<void>;
}
```

### 상태 정의

```typescript
type FlowState = 
  | 'idle'        // 대기 상태
  | 'tts'         // 문제 읽기 중
  | 'beep'        // 신호음 재생 중
  | 'recording'   // 사용자 음성 녹음 중
  | 'processing'  // 음성 처리 중
  | 'timeout'     // 타임아웃 발생
  | 'answer_tts'; // 정답 읽기 중
```

### 컨텍스트 구조

```typescript
interface StateMachineContext {
  // 타이밍
  remainingTime: number;
  recordingDuration: number;
  
  // 상태
  isPaused: boolean;
  
  // 데이터
  koreanText?: string;
  answerText?: string;
  speechResult?: {
    transcript: string;
    confidence: number;
  };
}
```

### 액션 결과

```typescript
interface ActionResult {
  success: boolean;
  error?: string;
  newState?: FlowState;
}
```

## 상태별 동작

### IdleState
- **진입**: 플로우 완료 또는 중지 시
- **허용 액션**: `start`
- **다음 상태**: `tts`

### TTSState  
- **진입**: 플로우 시작 시
- **동작**: 한국어 문제 텍스트 읽기
- **허용 액션**: `complete`, `stop`
- **다음 상태**: `beep` (완료) 또는 `idle` (중지)

### BeepState
- **진입**: TTS 완료 후
- **동작**: 녹음 시작 신호음 재생
- **허용 액션**: `complete`, `stop`
- **다음 상태**: `recording`

### RecordingState
- **진입**: 신호음 완료 후
- **동작**: 사용자 음성 녹음 및 타이머 관리
- **허용 액션**: `complete`, `timeout`, `pause`, `resume`, `stop`
- **다음 상태**: `processing` (완료) 또는 `timeout`

### ProcessingState
- **진입**: 녹음 완료 후
- **동작**: 음성 인식 처리
- **허용 액션**: `complete`, `timeout`, `stop`
- **다음 상태**: `idle` (완료) 또는 `timeout`

### TimeoutState
- **진입**: 타임아웃 발생 시
- **동작**: 타임아웃 처리 및 정답 제공
- **허용 액션**: `complete`, `stop`
- **다음 상태**: `answer_tts`

### AnswerTTSState
- **진입**: 타임아웃 후 또는 정답 듣기 요청 시
- **동작**: 정답 텍스트 읽기
- **허용 액션**: `complete`, `stop`
- **다음 상태**: `idle`

## 콜백 시스템

```typescript
interface FlowCallbacks {
  onStateChange?: (newState: FlowState) => void;
  onTimeUpdate?: (remainingTime: number) => void;
  onSpeechResult?: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  onError?: (error: string) => void;
}
```

## 사용 예시

### 기본 플로우

```typescript
const stateMachine = container.createAudioFlowStateMachine({
  onStateChange: (state) => console.log('State:', state),
  onSpeechResult: (text, confidence) => console.log('Result:', text),
  onTimeout: () => console.log('Timeout occurred')
}, 10);

// 플로우 시작
await stateMachine.startFlow('안녕하세요');

// 상태 확인
console.log('Current state:', stateMachine.getCurrentState());

// 표시 정보 가져오기
const displayInfo = stateMachine.getDisplayInfo();
console.log('Message:', displayInfo.message);
```

### 일시정지/재개

```typescript
// 일시정지
const pauseResult = stateMachine.pauseFlow();
if (pauseResult.success) {
  console.log('Paused successfully');
}

// 재개
const resumeResult = stateMachine.resumeFlow();
if (resumeResult.success) {
  console.log('Resumed successfully');
}
```

## 에러 처리

- 잘못된 상태에서 액션 실행 시 `ActionResult.success = false`
- 콜백에서 에러 발생 시 `onError` 콜백 호출
- 시스템 에러는 console.error로 로깅

## 성능 고려사항

- 상태 전환은 동기적으로 처리
- 비동기 작업(TTS, 음성인식)은 해당 상태 내에서 관리
- 메모리 누수 방지를 위한 cleanup() 구현

## 확장성

새로운 상태 추가 시:
1. FlowState 타입에 상태 추가
2. 해당 상태 클래스 구현
3. 상태 전환 규칙 정의
4. DisplayInfo 설정 추가