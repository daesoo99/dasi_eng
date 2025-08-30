# ServiceContainer Interface Documentation

## 개요
ServiceContainer는 의존성 주입(Dependency Injection)을 통해 애플리케이션의 모든 서비스를 중앙에서 관리하는 핵심 컨테이너입니다.

## 주요 책임
- 서비스 인스턴스 생성 및 관리
- 의존성 주입 패턴 구현
- 싱글톤 패턴으로 서비스 인스턴스 재사용
- 테스트를 위한 Mock 서비스 지원

## 인터페이스 정의

### `IServiceContainer`

```typescript
interface IServiceContainer {
  // 핵심 서비스 팩토리 메서드들
  createAudioFlowStateMachine(
    callbacks: StateMachineCallbacks,
    recordingDuration?: number
  ): IAudioFlowStateMachine;
  
  createSpeechProcessingService(): ISpeechProcessingService;
  createScoreCalculationService(): IScoreCalculationService;
  createAudioTimerService(): IAudioTimerService;
  createAudioFlowOrchestrator(): IAudioFlowOrchestrator;
  
  // 어댑터 팩토리 접근
  getAdapterFactory(): IAdapterFactory;
  
  // 설정 접근
  getConfiguration(): ServiceConfiguration;
}
```

### 설정 옵션

```typescript
interface ServiceConfiguration {
  speechOptions?: {
    recognitionLanguage?: string;
    synthesisLanguage?: string;
    speechRate?: number;
  };
  
  // 테스트 환경 설정
  mockMode?: boolean;
  
  // 성능 설정
  enablePerformanceLogging?: boolean;
}
```

## 사용 방법

### 기본 사용법

```typescript
import { getServiceContainer } from '@/container/ServiceContainer';

// 컨테이너 인스턴스 획득
const container = getServiceContainer({
  speechOptions: {
    recognitionLanguage: 'en-US',
    synthesisLanguage: 'ko-KR',
    speechRate: 1.0
  }
});

// 서비스 생성
const speechService = container.createSpeechProcessingService();
const stateMachine = container.createAudioFlowStateMachine(callbacks, 10);
```

### 테스트에서의 사용법

```typescript
// Mock 컨테이너 주입
const mockContainer = new MockServiceContainer();
const controller = useAudioFlowController({
  onSpeechResult: mockCallback,
  serviceContainer: mockContainer
});
```

## 서비스 생명주기

1. **생성**: 처음 호출 시 인스턴스 생성
2. **캐싱**: 동일한 설정으로 재호출 시 기존 인스턴스 반환  
3. **정리**: 컴포넌트 언마운트 시 개별 서비스의 cleanup() 호출

## 의존성 그래프

```
ServiceContainer
├── AudioFlowStateMachine
│   ├── AudioFlowOrchestrator
│   ├── AudioTimerService
│   └── State Classes (IdleState, TTSState, ...)
├── SpeechProcessingService
│   └── AdapterFactory
│       ├── SpeechRecognitionAdapter
│       ├── SpeechSynthesisAdapter
│       └── AudioContextAdapter
└── ScoreCalculationService
```

## 확장 가능성

새로운 서비스 추가 시:
1. 서비스 인터페이스 정의
2. ServiceContainer에 팩토리 메서드 추가
3. Mock 버전 구현 (테스트용)

## 설계 원칙

- **단일 책임**: 각 서비스는 명확한 단일 책임을 가짐
- **의존성 역전**: 구체적인 구현이 아닌 인터페이스에 의존
- **개방/폐쇄**: 확장에는 열려있고 수정에는 닫혀있음
- **테스트 가능성**: 모든 의존성을 주입 가능하여 테스트 용이