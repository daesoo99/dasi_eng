/**
 * SRS 시스템 공통 인터페이스
 * 프론트엔드(useSRSEngine) ↔ 백엔드(SmartReviewService) 연동용
 * 
 * 2025-01-12: SSOT 정책에 따른 통합 인터페이스
 */

export interface SRSReviewCard {
  id: string;
  userId: string;
  
  // 학습 콘텐츠
  content: {
    korean: string;
    english: string;
    level: number;
    stage: number;
    pattern?: string;
    verb?: string;
  };
  
  // 기억 상태 (SuperMemo SM-2+ 기반)
  memory: {
    strength: number;        // 0-1, 기억력 강도
    easeFactor: number;      // 1.3-3.5, SM-2 ease factor
    interval: number;        // 복습 간격(일)
    reviewCount: number;     // 총 복습 횟수
    lastReviewed: Date;      // 마지막 복습 날짜
    nextReview: Date;        // 다음 복습 날짜
  };
  
  // 학습 성과
  performance: {
    accuracy: number[];      // 최근 정답률 히스토리
    responseTime: number[];  // 최근 응답시간 히스토리
    streak: number;          // 연속 정답 횟수
    mistakes: number;        // 총 실수 횟수
    masteryLevel: 'learning' | 'reviewing' | 'mastered';
  };
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

export interface SRSReviewSession {
  cardId: string;
  userId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;    // 응답시간(ms)
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;      // 0-1, 사용자 신뢰도
  timestamp: Date;
}

export interface SRSUpdateResult {
  success: boolean;
  updatedCard: SRSReviewCard;
  nextReviewCards?: SRSReviewCard[];
  error?: string;
}

export interface SRSStats {
  totalCards: number;
  dueForReview: number;
  averageMemoryStrength: number;
  masteredCards: number;
  learningCards: number;
  reviewingCards: number;
  averageAccuracy: number;
  averageResponseTime: number;
  dailyStreak: number;
}

export interface SRSConfig {
  // SuperMemo SM-2 Parameters
  minEaseFactor: number;
  maxEaseFactor: number;
  initialEaseFactor: number;
  easeBonus: number;
  easePenalty: number;
  
  // 복습 간격
  minInterval: number;
  maxInterval: number;
  graduatingInterval: number;
  
  // 기억력 모델
  initialMemoryStrength: number;
  memoryDecayRate: number;
  
  // 품질 기준
  passingGrade: number;
  masteryThreshold: number;
}

/**
 * 프론트엔드 ↔ 백엔드 데이터 변환 유틸리티
 */
export class SRSDataAdapter {
  
  /**
   * 프론트엔드 ReviewCard → 백엔드 SRSReviewCard
   */
  static frontendToBackend(frontendCard: any): SRSReviewCard {
    return {
      id: frontendCard.id,
      userId: frontendCard.userId || 'unknown',
      content: {
        korean: frontendCard.content.korean,
        english: frontendCard.content.english,
        level: frontendCard.content.level,
        stage: frontendCard.content.stage,
        pattern: frontendCard.content.pattern,
      },
      memory: {
        strength: frontendCard.memory.strength,
        easeFactor: frontendCard.memory.easeFactor,
        interval: frontendCard.memory.interval,
        reviewCount: frontendCard.memory.reviewCount,
        lastReviewed: frontendCard.memory.lastReviewed,
        nextReview: frontendCard.memory.nextReview,
      },
      performance: {
        accuracy: frontendCard.performance.accuracy || [],
        responseTime: frontendCard.performance.responseTime || [],
        streak: frontendCard.performance.streak || 0,
        mistakes: frontendCard.performance.mistakes || 0,
        masteryLevel: this.determineMasteryLevel(frontendCard.memory.strength, frontendCard.memory.reviewCount)
      },
      createdAt: frontendCard.createdAt || new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * 백엔드 SRSReviewCard → 프론트엔드 ReviewCard
   */
  static backendToFrontend(backendCard: SRSReviewCard): any {
    return {
      id: backendCard.id,
      content: {
        korean: backendCard.content.korean,
        english: backendCard.content.english,
        level: backendCard.content.level,
        stage: backendCard.content.stage,
        pattern: backendCard.content.pattern,
      },
      memory: {
        strength: backendCard.memory.strength,
        easeFactor: backendCard.memory.easeFactor,
        interval: backendCard.memory.interval,
        reviewCount: backendCard.memory.reviewCount,
        lastReviewed: backendCard.memory.lastReviewed,
        nextReview: backendCard.memory.nextReview,
        difficulty: backendCard.memory.strength < 0.5 ? 1 : backendCard.memory.strength < 0.8 ? 0.5 : 0,
      },
      performance: {
        accuracy: backendCard.performance.accuracy,
        responseTime: backendCard.performance.responseTime,
        streak: backendCard.performance.streak,
        mistakes: backendCard.performance.mistakes,
      },
    };
  }
  
  private static determineMasteryLevel(strength: number, reviewCount: number): 'learning' | 'reviewing' | 'mastered' {
    if (reviewCount === 0) return 'learning';
    if (strength > 0.9 && reviewCount >= 5) return 'mastered';
    return 'reviewing';
  }
}