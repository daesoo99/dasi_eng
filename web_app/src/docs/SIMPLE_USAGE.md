# 🚀 단순화된 플러그인 시스템 사용법

## 🎯 Rule of Three 원칙 적용

**Before**: Registry → Lifecycle → Manager → Factory → Plugin (5단계)  
**After**: Manager → Plugin (2단계) - 플러그인이 3개 이상 될 때까지 최소 구성

## 📝 기본 사용법

### **1. 간단한 초기화**
```typescript
// App.tsx - 복잡한 초기화 없이 간단하게
import { simplePluginManager, SimpleSpeechPlugin } from '@/plugins/simple';

function App() {
  useEffect(() => {
    const init = async () => {
      // 플러그인 생성 & 등록 (1단계)
      const speech = new SimpleSpeechPlugin();
      simplePluginManager.register('speech', speech);
      
      // 초기화 (2단계)  
      await simplePluginManager.initializeAll();
      
      console.log('✅ Ready!');
    };
    
    init();
  }, []);
}
```

### **2. React Hook으로 사용**
```typescript
function StudyCard() {
  const speech = useSimpleSpeech(); // 단순한 Hook
  
  if (speech.isLoading) return <div>Loading...</div>;
  if (speech.error) return <div>Error: {speech.error}</div>;
  
  const handleSpeak = async () => {
    // 취소 지원
    const controller = new AbortController();
    
    const success = await speech.speakText('Hello World', {
      language: 'en-US',
      rate: 1.0,
      signal: controller.signal  // 취소 가능
    });
    
    if (!success) {
      alert('음성 재생 실패');
    }
  };
  
  const handleListen = async () => {
    const result = await speech.recognizeSpeech({
      language: 'en-US',
      maxDuration: 10000,
      signal: abortController.signal
    });
    
    if (result.success) {
      console.log('들은 내용:', result.transcript);
    }
  };
  
  return (
    <div>
      <button onClick={handleSpeak}>🔊 말하기</button>
      <button onClick={handleListen}>🎤 듣기</button>
      <button onClick={speech.stopAll}>⏹️ 중지</button>
    </div>
  );
}
```

### **3. 표준화된 에러 처리**
```typescript
const result = await speech.speakText('Hello');

if (!result.ok) {
  switch (result.code) {
    case 'E_PERMISSION':
      alert('마이크 권한이 필요합니다');
      break;
    case 'E_UNSUPPORTED':
      alert('이 브라우저에서는 지원되지 않습니다');
      break;
    case 'E_TIMEOUT':
      if (result.retryable) {
        // 재시도 가능
        alert('시간 초과. 다시 시도하시겠습니까?');
      }
      break;
    case 'E_ABORTED':
      console.log('사용자가 취소했습니다');
      break;
    default:
      alert(`오류: ${result.cause}`);
  }
}
```

## 🔧 확장 시나리오

### **플러그인이 3개 이상 될 때만 복잡한 구조로 업그레이드**

```typescript
// 현재: 플러그인 1-2개 (단순 구조)
simplePluginManager.register('speech', new SimpleSpeechPlugin());
simplePluginManager.register('storage', new SimpleStoragePlugin());

// 미래: 플러그인 3개 이상 (복잡한 구조로 전환)
const pluginSystem = new EnterprisePluginSystem();
pluginSystem.registerWithDependencies('payment', PaymentPluginFactory);
pluginSystem.registerWithDependencies('analytics', AnalyticsPluginFactory);
// ... Registry, Lifecycle 등 복잡한 패턴 적용
```

## 🧪 테스트 친화적

```typescript
// 테스트에서 Mock 사용
beforeEach(() => {
  const mockSpeech = {
    name: 'mock-speech',
    version: '1.0.0',
    speakText: jest.fn().mockResolvedValue({ ok: true, data: {} }),
    recognizeSpeech: jest.fn().mockResolvedValue({ 
      ok: true, 
      data: { transcript: 'test', confidence: 0.9 } 
    })
  };
  
  simplePluginManager.register('speech', mockSpeech);
});

test('should handle speech correctly', async () => {
  const speech = useSimpleSpeech();
  const success = await speech.speakText('Hello');
  expect(success).toBe(true);
});
```

## ⚡ 성능 최적화

```typescript
// 필요할 때만 로드 (Lazy Loading)
const getSpeechPlugin = async () => {
  let plugin = simplePluginManager.get('speech');
  
  if (!plugin.ok) {
    // 첫 사용 시에만 로드
    const speechPlugin = new SimpleSpeechPlugin();
    simplePluginManager.register('speech', speechPlugin);
    await speechPlugin.initialize();
    plugin = simplePluginManager.get('speech');
  }
  
  return plugin.data;
};
```

## 📊 모니터링

```typescript
// 간단한 상태 확인
function PluginStatus() {
  const pluginNames = simplePluginManager.list();
  
  return (
    <div>
      <h3>로드된 플러그인: {pluginNames.length}개</h3>
      {pluginNames.map(name => (
        <div key={name}>✅ {name}</div>
      ))}
    </div>
  );
}
```

---

## 🎉 핵심 개선사항

| **문제** | **해결** |
|----------|----------|
| **과도한 추상화** | 2단계로 단순화 (Manager → Plugin) |
| **Rule of Three 위반** | 플러그인 3개 미만시 최소 구성 |
| **표준화되지 않은 에러** | 7개 표준 에러 코드 + 취소 지원 |
| **복잡한 초기화** | 2줄로 초기화 완료 |
| **테스트 어려움** | Mock 플러그인 쉽게 교체 |

**결과**: 실용적이고 확장 가능한 플러그인 시스템 완성! 🎊