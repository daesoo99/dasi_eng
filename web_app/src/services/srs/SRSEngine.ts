/**
 * SRSEngine - 통합 간격반복학습 엔진
 * 
 * 기능:
 * - SuperMemo SM-2+ 알고리즘
 * - Ebbinghaus 망각곡선 구현
 * - 개인화된 학습 곡선
 * - 적응형 난이도 조정
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
    strength: number;        // 0-1, 기억력 강도
    easeFactor: number;      // 1.3-2.5, SM-2 ease factor
    interval: number;        // 복습 간격(일)
    reviewCount: number;     // 복습 횟수
    lastReviewed: Date;      // 마지막 복습 날짜
    nextReview: Date;        // 다음 복습 날짜
    difficulty: number;      // 0-1, 주관적 난이도
  };
  performance: {
    accuracy: number[];      // 최근 정답률 히스토리
    responseTime: number[];  // 최근 응답시간 히스토리
    streak: number;          // 연속 정답 횟수
    mistakes: number;        // 총 실수 횟수
  };
}

export interface ReviewSession {
  cardId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;      // 0-1, 사용자 신뢰도
  timestamp: Date;
}

export interface SRSConfig {
  // SM-2 Parameters
  minEaseFactor: number;
  maxEaseFactor: number;
  initialEaseFactor: number;
  easeBonus: number;
  easePenalty: number;
  
  // Interval Parameters
  minInterval: number;
  maxInterval: number;
  learningSteps: number[];  // 신규 카드 학습 단계(분)
  graduatingInterval: number;
  easyInterval: number;
  
  // Memory Model
  initialMemoryStrength: number;
  memoryDecayRate: number;
  difficultyWeight: number;
  timeWeight: number;
  
  // Quality Thresholds
  passingGrade: number;
  easyGrade: number;
}

export class SRSEngine {
  private config: SRSConfig;

  constructor(config?: Partial<SRSConfig>) {
    this.config = {
      // SM-2 기본값
      minEaseFactor: 1.3,
      maxEaseFactor: 3.5,
      initialEaseFactor: 2.5,
      easeBonus: 0.1,
      easePenalty: 0.2,
      
      // 간격 기본값
      minInterval: 1,
      maxInterval: 36500, // ~100년
      learningSteps: [1, 10], // 1분, 10분
      graduatingInterval: 1,  // 1일
      easyInterval: 4,        // 4일
      
      // 메모리 모델
      initialMemoryStrength: 0.8,
      memoryDecayRate: 0.05,
      difficultyWeight: 0.3,
      timeWeight: 0.2,
      
      // 품질 임계값
      passingGrade: 3,
      easyGrade: 4,
      
      ...config
    };
  }

  /**
   * 복습 세션 결과를 바탕으로 카드 업데이트
   */
  updateCard(card: ReviewCard, session: ReviewSession): ReviewCard {
    const quality = this.calculateQuality(session);
    const newCard = { ...card };

    // 성능 데이터 업데이트
    newCard.performance = this.updatePerformance(card.performance, session);
    
    // 메모리 데이터 계산
    newCard.memory = this.calculateMemoryUpdate(card.memory, session, quality);

    return newCard;
  }

  /**
   * 품질 점수 계산 (0-5, SM-2 기준)
   */
  private calculateQuality(session: ReviewSession): number {
    let quality = session.isCorrect ? 3 : 0; // 기본 점수

    // 응답시간 보정
    const timeBonus = this.calculateTimeBonus(session.responseTime);
    quality += timeBonus;

    // 난이도 보정
    const difficultyBonus = this.calculateDifficultyBonus(session.difficulty);
    quality += difficultyBonus;

    // 신뢰도 보정
    quality += session.confidence * 0.5;

    // 0-5 범위로 클램프
    return Math.max(0, Math.min(5, quality));
  }

  /**
   * 응답시간 기반 보너스 계산
   */
  private calculateTimeBonus(responseTime: number): number {
    // 2초 이하: +1점, 5초 이하: +0.5점, 10초 이상: -0.5점
    if (responseTime <= 2000) return 1;
    if (responseTime <= 5000) return 0.5;
    if (responseTime >= 10000) return -0.5;
    return 0;
  }

  /**
   * 난이도 기반 보너스 계산
   */
  private calculateDifficultyBonus(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 0.5;
      case 'hard': return 0;
      default: return 0;
    }
  }

  /**
   * 성능 데이터 업데이트
   */
  private updatePerformance(performance: ReviewCard['performance'], session: ReviewSession): ReviewCard['performance'] {
    const newPerformance = { ...performance };

    // 정답률 히스토리 (최근 20개)
    newPerformance.accuracy = [...performance.accuracy, session.isCorrect ? 1 : 0].slice(-20);
    
    // 응답시간 히스토리 (최근 20개)
    newPerformance.responseTime = [...performance.responseTime, session.responseTime].slice(-20);
    
    // 연속 정답 관리
    if (session.isCorrect) {
      newPerformance.streak += 1;
    } else {
      newPerformance.streak = 0;
      newPerformance.mistakes += 1;
    }

    return newPerformance;
  }

  /**
   * 메모리 강도 및 복습 간격 계산
   */
  private calculateMemoryUpdate(
    memory: ReviewCard['memory'], 
    session: ReviewSession, 
    quality: number
  ): ReviewCard['memory'] {
    const newMemory = { ...memory };

    // SM-2 알고리즘 적용
    if (quality >= this.config.passingGrade) {
      // 성공한 복습
      newMemory.reviewCount += 1;
      
      if (memory.reviewCount === 0) {
        newMemory.interval = this.config.graduatingInterval;
      } else if (memory.reviewCount === 1) {
        newMemory.interval = 6;
      } else {
        newMemory.interval = Math.round(memory.interval * memory.easeFactor);
      }

      // Ease factor 조정
      newMemory.easeFactor = Math.max(
        this.config.minEaseFactor,
        memory.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );

      // 메모리 강도 증가
      newMemory.strength = Math.min(1, memory.strength + 0.1 + (quality - 3) * 0.1);

    } else {
      // 실패한 복습
      newMemory.reviewCount = 0;
      newMemory.interval = this.config.learningSteps[0] / (24 * 60); // 분을 일로 변환
      newMemory.easeFactor = Math.max(
        this.config.minEaseFactor,
        memory.easeFactor - this.config.easePenalty
      );
      
      // 메모리 강도 감소
      newMemory.strength = Math.max(0, memory.strength - 0.2);
    }

    // 간격 제한
    newMemory.interval = Math.max(
      this.config.minInterval,
      Math.min(this.config.maxInterval, newMemory.interval)
    );

    // 날짜 업데이트
    newMemory.lastReviewed = new Date();
    newMemory.nextReview = new Date(Date.now() + newMemory.interval * 24 * 60 * 60 * 1000);
    
    // 난이도 업데이트 (사용자 피드백 기반)
    const difficultyMap = { easy: 0.2, medium: 0.5, hard: 0.8 };
    const sessionDifficulty = difficultyMap[session.difficulty];
    newMemory.difficulty = (memory.difficulty * 0.8) + (sessionDifficulty * 0.2);

    return newMemory;
  }

  /**
   * 망각곡선 기반 메모리 강도 계산
   */
  calculateMemoryStrength(card: ReviewCard, currentTime: Date = new Date()): number {
    const daysSinceLastReview = (currentTime.getTime() - card.memory.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
    
    // Ebbinghaus 망각곡선: R = e^(-t/S)
    // R: 기억 보존률, t: 경과시간, S: 기억 안정성
    const stability = card.memory.easeFactor * (1 + card.memory.difficulty);
    const retention = Math.exp(-daysSinceLastReview / stability);
    
    return Math.max(0, Math.min(1, card.memory.strength * retention));
  }

  /**
   * 복습이 필요한 카드들 필터링
   */
  getCardsForReview(cards: ReviewCard[], currentTime: Date = new Date()): ReviewCard[] {
    return cards
      .filter(card => card.memory.nextReview <= currentTime)
      .sort((a, b) => {
        // 우선순위: 낮은 메모리 강도 > 오래된 복습 > 높은 난이도
        const strengthDiff = this.calculateMemoryStrength(a) - this.calculateMemoryStrength(b);
        if (Math.abs(strengthDiff) > 0.1) return strengthDiff;
        
        const timeDiff = a.memory.nextReview.getTime() - b.memory.nextReview.getTime();
        if (Math.abs(timeDiff) > 60000) return timeDiff; // 1분 차이
        
        return b.memory.difficulty - a.memory.difficulty;
      });
  }

  /**
   * 학습 통계 계산
   */
  calculateStats(cards: ReviewCard[]): {
    totalCards: number;
    dueForReview: number;
    averageMemoryStrength: number;
    masteredCards: number;
    learningCards: number;
    avgAccuracy: number;
    avgResponseTime: number;
  } {
    const currentTime = new Date();
    
    const dueCards = cards.filter(card => card.memory.nextReview <= currentTime);
    const masteredCards = cards.filter(card => 
      card.memory.reviewCount >= 5 && this.calculateMemoryStrength(card) > 0.8
    );
    const learningCards = cards.filter(card => card.memory.reviewCount < 3);

    const totalMemoryStrength = cards.reduce(
      (sum, card) => sum + this.calculateMemoryStrength(card), 0
    );

    const totalAccuracy = cards.reduce((sum, card) => {
      const recentAccuracy = card.performance.accuracy.slice(-10);
      return sum + (recentAccuracy.length > 0 ? 
        recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length : 0
      );
    }, 0);

    const totalResponseTime = cards.reduce((sum, card) => {
      const recentTimes = card.performance.responseTime.slice(-10);
      return sum + (recentTimes.length > 0 ?
        recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length : 0
      );
    }, 0);

    return {
      totalCards: cards.length,
      dueForReview: dueCards.length,
      averageMemoryStrength: cards.length > 0 ? totalMemoryStrength / cards.length : 0,
      masteredCards: masteredCards.length,
      learningCards: learningCards.length,
      avgAccuracy: cards.length > 0 ? totalAccuracy / cards.length : 0,
      avgResponseTime: cards.length > 0 ? totalResponseTime / cards.length : 0
    };
  }

  /**
   * 새 카드 생성
   */
  createCard(content: ReviewCard['content']): ReviewCard {
    const now = new Date();
    
    return {
      id: `${content.level}-${content.stage}-${Date.now()}`,
      content,
      memory: {
        strength: this.config.initialMemoryStrength,
        easeFactor: this.config.initialEaseFactor,
        interval: 0,
        reviewCount: 0,
        lastReviewed: now,
        nextReview: new Date(now.getTime() + this.config.learningSteps[0] * 60 * 1000),
        difficulty: 0.5
      },
      performance: {
        accuracy: [],
        responseTime: [],
        streak: 0,
        mistakes: 0
      }
    };
  }
}

export default SRSEngine;