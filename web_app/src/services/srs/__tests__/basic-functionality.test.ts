/**
 * SRS 모듈 기본 기능 테스트
 * 
 * 타입 체크 및 기본 통합 확인
 */

describe('SRS Basic Functionality', () => {
  test('모듈 import가 정상 작동한다', async () => {
    // ISRSEngine 인터페이스 import 테스트
    const { ISRSEngine } = await import('../interfaces/ISRSEngine');
    expect(typeof ISRSEngine).toBe('undefined'); // interface는 runtime에서 undefined

    // 컨테이너 import 테스트
    const { SRSContainer } = await import('../container/SRSContainer');
    expect(typeof SRSContainer).toBe('function');

    // 알고리즘 import 테스트
    const { SuperMemoSM2Strategy } = await import('../algorithms/SuperMemoSM2Strategy');
    expect(typeof SuperMemoSM2Strategy).toBe('function');

    // 저장소 import 테스트
    const { LocalStorageAdapter } = await import('../adapters/storage/LocalStorageAdapter');
    expect(typeof LocalStorageAdapter).toBe('function');
  });

  test('컨테이너 기본 기능이 작동한다', () => {
    const { SRSContainer } = require('../container/SRSContainer');
    const container = new SRSContainer();

    // 서비스 등록
    container.register('test-service', () => ({ name: 'test' }));

    // 서비스 해결
    const service = container.resolve('test-service');
    expect(service).toEqual({ name: 'test' });

    // 등록된 서비스 조회
    const services = container.getRegisteredServices();
    expect(services).toContain('test-service');
  });

  test('알고리즘 기본 기능이 작동한다', () => {
    const { SuperMemoSM2Strategy } = require('../algorithms/SuperMemoSM2Strategy');
    const algorithm = new SuperMemoSM2Strategy();

    expect(algorithm.name).toBe('SuperMemo SM-2');
    expect(algorithm.version).toBe('2.0');

    // 간격 계산 테스트
    const interval = algorithm.calculateNextInterval(1, 2.5, 4, 0);
    expect(typeof interval).toBe('number');
    expect(interval).toBeGreaterThan(0);

    // Ease factor 업데이트 테스트
    const newEF = algorithm.updateEaseFactor(2.5, 4);
    expect(typeof newEF).toBe('number');
    expect(newEF).toBeGreaterThan(0);
  });

  test('저장소 기본 기능이 작동한다', async () => {
    const { MemoryStorageAdapter } = require('../adapters/storage/MemoryStorageAdapter');
    const storage = new MemoryStorageAdapter();

    // 초기 상태는 빈 배열
    const initialData = await storage.load('test-key');
    expect(initialData).toEqual([]);

    // 데이터 저장
    const testData = [{
      id: 'test-card',
      content: { korean: '테스트', english: 'test', level: 1, stage: 1 },
      memory: {
        strength: 0.5, easeFactor: 2.5, interval: 1, reviewCount: 0,
        lastReviewed: new Date(), nextReview: new Date(), difficulty: 0.5
      },
      performance: { accuracy: [], responseTime: [], streak: 0, mistakes: 0 }
    }];

    await storage.save('test-key', testData);

    // 데이터 로드
    const loadedData = await storage.load('test-key');
    expect(loadedData).toHaveLength(1);
    expect(loadedData[0].id).toBe('test-card');

    // 존재 여부 확인
    const exists = await storage.exists('test-key');
    expect(exists).toBe(true);

    // 삭제
    await storage.delete('test-key');
    const deletedData = await storage.load('test-key');
    expect(deletedData).toEqual([]);
  });

  test('설정 제공자 기본 기능이 작동한다', async () => {
    const { DefaultConfigProvider } = require('../config/DefaultConfigProvider');
    const configProvider = new DefaultConfigProvider();

    // 기본 설정 조회
    const defaultConfig = configProvider.getDefaultConfig();
    expect(typeof defaultConfig).toBe('object');
    expect(defaultConfig.initialEaseFactor).toBe(2.5);

    // 레벨별 설정 조회
    const levelConfig = configProvider.getConfigForLevel(1);
    expect(typeof levelConfig).toBe('object');

    // 사용자 설정 저장/로드
    const testConfig = { initialEaseFactor: 2.0 };
    await configProvider.saveUserConfig('test-user', testConfig);
    
    const userConfig = await configProvider.getConfigForUser('test-user');
    expect(userConfig.initialEaseFactor).toBe(2.0);
  });

  test('이벤트 버스 기본 기능이 작동한다', () => {
    const { SimpleEventBus } = require('../events/SimpleEventBus');
    const eventBus = new SimpleEventBus();

    let receivedEvent = null;

    // 리스너 등록
    eventBus.on('card_created', (event: any) => {
      receivedEvent = event;
    });

    // 이벤트 발행
    const testEvent = {
      type: 'card_created' as const,
      timestamp: new Date(),
      data: { test: 'data' }
    };

    eventBus.emit(testEvent);

    // 이벤트 수신 확인
    expect(receivedEvent).toEqual(testEvent);

    // 리스너 카운트 확인
    const listenerCount = eventBus.getListenerCount('card_created');
    expect(listenerCount).toBe(1);
  });
});