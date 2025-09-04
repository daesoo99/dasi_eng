/**
 * 모듈화된 SRS 시스템 통합 테스트
 * 
 * 느슨한 결합 아키텍처가 올바르게 작동하는지 검증
 */

import { 
  SRSContainer, 
  configureTestContainer, 
  SRS_SERVICES 
} from '../container/SRSContainer';
import { ISRSEngine, ReviewCard, ReviewSession } from '../interfaces/ISRSEngine';

describe('Modular SRS System Integration', () => {
  let container: SRSContainer;
  let engine: ISRSEngine;

  beforeEach(() => {
    // 테스트 환경용 컨테이너 설정
    container = new SRSContainer();
    configureTestContainer(container);
    
    // 엔진 해결
    engine = container.resolve<ISRSEngine>(SRS_SERVICES.ENGINE);
  });

  afterEach(() => {
    container.clear();
  });

  describe('Card Lifecycle', () => {
    test('카드를 생성하고 기본 속성을 확인한다', () => {
      const content = {
        korean: '안녕하세요',
        english: 'Hello',
        level: 1,
        stage: 1,
        pattern: 'greeting'
      };

      const card = engine.createCard(content);

      expect(card.id).toBeDefined();
      expect(card.content).toEqual(content);
      expect(card.memory.reviewCount).toBe(0);
      expect(card.memory.strength).toBeGreaterThan(0);
      expect(card.performance.streak).toBe(0);
    });

    test('복습 세션으로 카드를 업데이트한다', () => {
      const card = engine.createCard({
        korean: '감사합니다',
        english: 'Thank you',
        level: 1,
        stage: 2
      });

      const session: ReviewSession = {
        cardId: card.id,
        userAnswer: 'Thank you',
        correctAnswer: 'Thank you',
        isCorrect: true,
        responseTime: 3000,
        difficulty: 'medium',
        confidence: 0.8,
        timestamp: new Date()
      };

      const updatedCard = engine.updateCard(card, session);

      expect(updatedCard.memory.reviewCount).toBe(1);
      expect(updatedCard.memory.strength).toBeGreaterThan(card.memory.strength);
      expect(updatedCard.performance.streak).toBe(1);
      expect(updatedCard.performance.accuracy).toContain(1);
    });
  });

  describe('Review Scheduling', () => {
    test('복습 예정 카드들을 올바르게 필터링한다', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1일 전
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1일 후

      const dueCard = engine.createCard({
        korean: '복습 예정',
        english: 'Due for review',
        level: 1,
        stage: 1
      });
      dueCard.memory.nextReview = pastDate;

      const notDueCard = engine.createCard({
        korean: '미래 복습',
        english: 'Future review',
        level: 1,
        stage: 2
      });
      notDueCard.memory.nextReview = futureDate;

      const cards = [dueCard, notDueCard];
      const dueCards = engine.getCardsForReview(cards);

      expect(dueCards).toHaveLength(1);
      expect(dueCards[0].id).toBe(dueCard.id);
    });
  });

  describe('Statistics and Analytics', () => {
    test('카드 통계를 올바르게 계산한다', () => {
      const cards: ReviewCard[] = [];
      
      // 여러 카드 생성
      for (let i = 0; i < 5; i++) {
        const card = engine.createCard({
          korean: `문장 ${i}`,
          english: `Sentence ${i}`,
          level: 1,
          stage: i + 1
        });
        
        // 일부 카드는 복습 완료 상태로 설정
        if (i < 3) {
          card.memory.reviewCount = 3;
          card.memory.strength = 0.8;
          card.performance.accuracy = [1, 1, 0]; // 3번 중 2번 정답
        }
        
        cards.push(card);
      }

      const stats = engine.calculateStats(cards);

      expect(stats.totalCards).toBe(5);
      expect(stats.averageMemoryStrength).toBeGreaterThan(0);
      expect(stats.learningCards).toBeGreaterThan(0);
    });

    test('성능 분석을 수행한다', () => {
      const cards: ReviewCard[] = [];
      
      // 패턴별 카드 생성
      const patterns = ['greeting', 'question', 'response'];
      patterns.forEach(pattern => {
        const card = engine.createCard({
          korean: `패턴 ${pattern}`,
          english: `Pattern ${pattern}`,
          level: 1,
          stage: 1,
          pattern
        });
        
        // 일부 패턴은 약하게, 일부는 강하게 설정
        if (pattern === 'greeting') {
          card.performance.accuracy = [0, 0, 1]; // 약한 패턴
        } else {
          card.performance.accuracy = [1, 1, 1]; // 강한 패턴
        }
        
        cards.push(card);
      });

      const analysis = engine.analyzePerformance(cards);

      expect(analysis.weakPatterns).toContain('greeting');
      expect(analysis.strongPatterns.length).toBeGreaterThan(0);
      expect(['accuracy', 'speed', 'retention']).toContain(analysis.recommendedFocus);
      expect(analysis.estimatedMasteryTime).toBeGreaterThan(0);
    });
  });

  describe('Dependency Injection', () => {
    test('다른 환경 구성으로 교체 가능하다', () => {
      // 새로운 컨테이너로 다른 구현체 주입 가능 확인
      const newContainer = new SRSContainer();
      
      // Mock 알고리즘 직접 등록
      newContainer.singleton('test-algorithm', () => ({
        name: 'Test Algorithm',
        version: '1.0',
        calculateNextInterval: () => 999, // 특수한 값
        updateEaseFactor: (ef: number) => ef,
        updateMemoryStrength: (strength: number) => strength
      }));

      const mockAlgo = newContainer.resolve('test-algorithm');
      expect(mockAlgo.calculateNextInterval(1, 2.5, 4, 1)).toBe(999);
    });

    test('서비스들이 올바르게 등록되고 해결된다', () => {
      const storage = container.resolve(SRS_SERVICES.STORAGE);
      const configProvider = container.resolve(SRS_SERVICES.CONFIG_PROVIDER);
      const algorithm = container.resolve(SRS_SERVICES.ALGORITHM_SM2);
      const eventBus = container.resolve(SRS_SERVICES.EVENT_BUS);

      expect(storage).toBeDefined();
      expect(configProvider).toBeDefined();
      expect(algorithm).toBeDefined();
      expect(eventBus).toBeDefined();
    });
  });

  describe('Event System', () => {
    test('카드 이벤트가 올바르게 발생한다', () => {
      const eventBus = container.resolve(SRS_SERVICES.EVENT_BUS);
      const events: any[] = [];

      // 이벤트 리스너 등록
      eventBus.on('card_created', (event: any) => events.push(event));
      eventBus.on('card_reviewed', (event: any) => events.push(event));

      // 카드 생성
      const card = engine.createCard({
        korean: '이벤트 테스트',
        english: 'Event test',
        level: 1,
        stage: 1
      });

      // 복습 세션
      const session: ReviewSession = {
        cardId: card.id,
        userAnswer: 'Event test',
        correctAnswer: 'Event test',
        isCorrect: true,
        responseTime: 2000,
        difficulty: 'easy',
        confidence: 0.9,
        timestamp: new Date()
      };

      engine.updateCard(card, session);

      // 이벤트 발생 확인
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some(e => e.type === 'card_created')).toBe(true);
    });
  });
});

// 통합 테스트를 위한 유틸리티 함수들
export const testUtils = {
  createMockCard: (overrides: Partial<ReviewCard> = {}): ReviewCard => ({
    id: `test-card-${Date.now()}-${Math.random()}`,
    content: {
      korean: '테스트 문장',
      english: 'Test sentence',
      level: 1,
      stage: 1,
      pattern: 'test'
    },
    memory: {
      strength: 0.5,
      easeFactor: 2.5,
      interval: 1,
      reviewCount: 0,
      lastReviewed: new Date(),
      nextReview: new Date(),
      difficulty: 0.5
    },
    performance: {
      accuracy: [],
      responseTime: [],
      streak: 0,
      mistakes: 0
    },
    ...overrides
  }),

  createMockSession: (overrides: Partial<ReviewSession> = {}): ReviewSession => ({
    cardId: 'test-card',
    userAnswer: 'Test answer',
    correctAnswer: 'Test answer',
    isCorrect: true,
    responseTime: 3000,
    difficulty: 'medium',
    confidence: 0.8,
    timestamp: new Date(),
    ...overrides
  })
};