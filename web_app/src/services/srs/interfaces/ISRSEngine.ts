/**
 * SRS 시스템 핵심 인터페이스 정의
 * 모든 SRS 구현체가 준수해야 하는 계약서
 * 
 * 느슨한 결합을 위한 추상화 계층
 */

export interface ReviewCard {
  id: string;
  content: {
    korean: string;
    english: string;
    level: number;
    stage: number;
    pattern?: string;
  };
  memory: {
    strength: number;
    easeFactor: number;
    interval: number;
    reviewCount: number;
    lastReviewed: Date;
    nextReview: Date;
    difficulty: number;
  };
  performance: {
    accuracy: number[];
    responseTime: number[];
    streak: number;
    mistakes: number;
  };
}

export interface ReviewSession {
  cardId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
  timestamp: Date;
}

export interface SRSConfig {
  minEaseFactor: number;
  maxEaseFactor: number;
  initialEaseFactor: number;
  easeBonus: number;
  easePenalty: number;
  minInterval: number;
  maxInterval: number;
  learningSteps: number[];
  graduatingInterval: number;
  easyInterval: number;
  initialMemoryStrength: number;
  memoryDecayRate: number;
  difficultyWeight: number;
  timeWeight: number;
  passingGrade: number;
  easyGrade: number;
}

export interface SRSStats {
  totalCards: number;
  dueForReview: number;
  averageMemoryStrength: number;
  masteredCards: number;
  learningCards: number;
  avgAccuracy: number;
  avgResponseTime: number;
}

/**
 * SRS 엔진 인터페이스 - 모든 SRS 구현체의 계약서
 */
export interface ISRSEngine {
  // 설정 관리
  getConfig(): SRSConfig;
  updateConfig(config: Partial<SRSConfig>): void;
  
  // 카드 생명주기
  createCard(content: ReviewCard['content']): ReviewCard;
  updateCard(card: ReviewCard, session: ReviewSession): ReviewCard;
  deleteCard(cardId: string): boolean;
  
  // 복습 스케줄링
  getCardsForReview(cards: ReviewCard[]): ReviewCard[];
  calculateNextReview(card: ReviewCard, session: ReviewSession): Date;
  
  // 통계 및 분석
  calculateStats(cards: ReviewCard[]): SRSStats;
  analyzePerformance(cards: ReviewCard[]): PerformanceAnalysis;
}

export interface PerformanceAnalysis {
  weakPatterns: string[];
  strongPatterns: string[];
  recommendedFocus: 'accuracy' | 'speed' | 'retention';
  estimatedMasteryTime: number; // days
}

/**
 * SRS 분석 설정 인터페이스
 */
export interface AnalysisConfig {
  // 패턴 분석 임계값
  weakPatternThreshold: number;     // 약한 패턴 정확률 임계값 (기본: 0.6)
  strongPatternThreshold: number;   // 강한 패턴 정확률 임계값 (기본: 0.8)
  minSampleSize: number;           // 분석에 필요한 최소 샘플 수 (기본: 3)

  // 속도 분석 임계값
  slowResponseThreshold: number;    // 느린 응답 시간 임계값 ms (기본: 10000)
  fastResponseThreshold: number;    // 빠른 응답 시간 임계값 ms (기본: 5000)

  // 마스터리 추정 설정
  avgReviewsNeeded: number;        // 마스터리까지 평균 복습 횟수 (기본: 8)
  avgDaysPerReview: number;        // 복습 간격 평균 일수 (기본: 3)

  // 마스터리 판정 기준
  masteryAccuracyThreshold: number; // 마스터리 정확률 임계값 (기본: 0.9)
  masteryMinReviews: number;       // 마스터리 최소 복습 횟수 (기본: 5)
  masteryMinStreak: number;        // 마스터리 최소 연속 정답 (기본: 3)
}

/**
 * SRS 저장소 인터페이스
 */
export interface ISRSStorage {
  // 기본 CRUD
  save(key: string, data: ReviewCard[]): Promise<void> | void;
  load(key: string): Promise<ReviewCard[]> | ReviewCard[];
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
  
  // 메타데이터
  exists(key: string): Promise<boolean> | boolean;
  lastModified(key: string): Promise<Date> | Date;
  size(key: string): Promise<number> | number;
}

/**
 * SRS 설정 제공자 인터페이스
 */
export interface ISRSConfigProvider {
  getDefaultConfig(): SRSConfig;
  getConfigForLevel(level: number): Partial<SRSConfig>;
  getConfigForUser(userId: string): Promise<Partial<SRSConfig>>;
  saveUserConfig(userId: string, config: Partial<SRSConfig>): Promise<void>;
}

/**
 * SRS 알고리즘 인터페이스 (전략 패턴)
 */
export interface ISRSAlgorithm {
  name: string;
  version: string;
  
  calculateNextInterval(
    currentInterval: number, 
    easeFactor: number, 
    quality: number, 
    reviewCount: number
  ): number;
  
  updateEaseFactor(
    currentEaseFactor: number, 
    quality: number
  ): number;
  
  updateMemoryStrength(
    currentStrength: number, 
    quality: number, 
    timeSinceLastReview: number
  ): number;
}

/**
 * SRS 이벤트 인터페이스
 */
export interface SRSEvent {
  type: 'card_created' | 'card_reviewed' | 'card_mastered' | 'session_completed';
  timestamp: Date;
  data: any;
}

export interface ISRSEventBus {
  emit(event: SRSEvent): void;
  on(eventType: SRSEvent['type'], handler: (event: SRSEvent) => void): void;
  off(eventType: SRSEvent['type'], handler: (event: SRSEvent) => void): void;
}

/**
 * 기본 분석 설정값 제공
 */
export function getDefaultAnalysisConfig(): AnalysisConfig {
  return {
    // 패턴 분석 임계값
    weakPatternThreshold: 0.6,     // 60% 미만이면 약한 패턴
    strongPatternThreshold: 0.8,   // 80% 초과면 강한 패턴
    minSampleSize: 3,             // 최소 3번 시도해야 분석

    // 속도 분석 임계값
    slowResponseThreshold: 10000, // 10초 초과면 느림
    fastResponseThreshold: 5000,  // 5초 미만이면 빠름

    // 마스터리 추정 설정
    avgReviewsNeeded: 6,          // 평균 6번 복습 필요
    avgDaysPerReview: 1,          // 평균 1일마다 복습 (언어학습 최적화)

    // 마스터리 판정 기준
    masteryAccuracyThreshold: 0.9, // 90% 정확률
    masteryMinReviews: 5,         // 최소 5번 복습
    masteryMinStreak: 3           // 최소 3연속 정답
  };
}