/**
 * 모듈형 SRS 엔진 - 느슨한 결합 구현
 * 의존성 주입을 통해 모든 구성요소를 교체 가능
 * 
 * 기존 SRSEngine.ts를 대체하는 새로운 아키텍처
 */

import { 
  ISRSEngine, 
  ISRSStorage, 
  ISRSAlgorithm, 
  ISRSConfigProvider,
  ISRSEventBus,
  ReviewCard, 
  ReviewSession, 
  SRSConfig, 
  SRSStats,
  PerformanceAnalysis,
  SRSEvent
} from '../interfaces/ISRSEngine';

export class ModularSRSEngine implements ISRSEngine {
  
  constructor(
    private storage: ISRSStorage,
    private algorithm: ISRSAlgorithm,
    private configProvider: ISRSConfigProvider,
    private eventBus?: ISRSEventBus
  ) {}

  // ============= 설정 관리 =============
  
  getConfig(): SRSConfig {
    return this.configProvider.getDefaultConfig();
  }

  updateConfig(config: Partial<SRSConfig>): void {
    // 설정 업데이트 로직
    console.log('Updating SRS config:', config);
    
    try {
      // configProvider를 통해 변경사항 저장
      this.configProvider.updateConfig(config);
      
      // 설정 변경 이벤트 발생
      this.emitEvent({
        type: 'config_updated',
        timestamp: new Date(),
        data: { updatedFields: Object.keys(config), config }
      });
      
      console.log('✅ SRS config updated successfully');
    } catch (error) {
      console.error('❌ Failed to update SRS config:', error);
      this.emitEvent({
        type: 'config_update_failed', 
        timestamp: new Date(),
        data: { error: error.message, attemptedConfig: config }
      });
      throw error;
    }
  }

  // ============= 카드 생명주기 =============

  createCard(content: ReviewCard['content']): ReviewCard {
    const config = this.getConfig();
    
    const newCard: ReviewCard = {
      id: this.generateCardId(),
      content,
      memory: {
        strength: config.initialMemoryStrength,
        easeFactor: config.initialEaseFactor,
        interval: config.minInterval,
        reviewCount: 0,
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + config.minInterval * 24 * 60 * 60 * 1000),
        difficulty: 0.5
      },
      performance: {
        accuracy: [],
        responseTime: [],
        streak: 0,
        mistakes: 0
      }
    };

    // 이벤트 발행
    this.emitEvent({
      type: 'card_created',
      timestamp: new Date(),
      data: { card: newCard }
    });

    return newCard;
  }

  updateCard(card: ReviewCard, session: ReviewSession): ReviewCard {
    const config = this.getConfig();
    const quality = this.calculateQuality(session);
    
    // 알고리즘을 통한 업데이트 (Strategy Pattern)
    const newInterval = this.algorithm.calculateNextInterval(
      card.memory.interval,
      card.memory.easeFactor,
      quality,
      card.memory.reviewCount
    );

    const newEaseFactor = this.algorithm.updateEaseFactor(
      card.memory.easeFactor,
      quality
    );

    const timeSinceLastReview = session.timestamp.getTime() - card.memory.lastReviewed.getTime();
    const newStrength = this.algorithm.updateMemoryStrength(
      card.memory.strength,
      quality,
      timeSinceLastReview
    );

    // config를 활용한 추가 검증 및 조정
    let adjustedInterval = newInterval;
    if (config.minInterval && newInterval < config.minInterval) {
      adjustedInterval = config.minInterval;
      console.log(`Adjusted interval from ${newInterval} to ${adjustedInterval} (min constraint)`);
    }
    if (config.maxInterval && newInterval > config.maxInterval) {
      adjustedInterval = config.maxInterval;
      console.log(`Adjusted interval from ${newInterval} to ${adjustedInterval} (max constraint)`);
    }

    // timeSinceLastReview를 활용한 지연 패널티 적용
    const expectedReviewTime = card.memory.interval * 24 * 60 * 60 * 1000; // 밀리초 변환
    const reviewDelayRatio = timeSinceLastReview / expectedReviewTime;
    
    if (reviewDelayRatio > 1.5) { // 예정보다 50% 이상 늦게 복습
      const delayPenalty = Math.min(reviewDelayRatio - 1, 0.3); // 최대 30% 패널티
      adjustedInterval = Math.round(adjustedInterval * (1 - delayPenalty));
      console.log(`Applied delay penalty: ${(delayPenalty * 100).toFixed(1)}%, interval adjusted to ${adjustedInterval}`);
    }

    // 성능 히스토리 업데이트
    const updatedCard: ReviewCard = {
      ...card,
      memory: {
        ...card.memory,
        strength: newStrength,
        easeFactor: newEaseFactor,
        interval: adjustedInterval, // config와 지연 패널티가 적용된 간격 사용
        reviewCount: card.memory.reviewCount + 1,
        lastReviewed: session.timestamp,
        nextReview: new Date(session.timestamp.getTime() + adjustedInterval * 24 * 60 * 60 * 1000)
      },
      performance: {
        accuracy: [...card.performance.accuracy.slice(-9), session.isCorrect ? 1 : 0],
        responseTime: [...card.performance.responseTime.slice(-9), session.responseTime],
        streak: session.isCorrect ? card.performance.streak + 1 : 0,
        mistakes: session.isCorrect ? card.performance.mistakes : card.performance.mistakes + 1
      }
    };

    // 마스터리 체크
    if (this.isMastered(updatedCard)) {
      this.emitEvent({
        type: 'card_mastered',
        timestamp: new Date(),
        data: { card: updatedCard }
      });
    }

    // 복습 이벤트 발행
    this.emitEvent({
      type: 'card_reviewed',
      timestamp: new Date(),
      data: { card: updatedCard, session }
    });

    return updatedCard;
  }

  deleteCard(cardId: string): boolean {
    // 구현체에 따라 다르게 처리
    // 여기서는 논리적 삭제만 수행
    return true;
  }

  // ============= 복습 스케줄링 =============

  getCardsForReview(cards: ReviewCard[]): ReviewCard[] {
    const now = new Date();
    
    return cards
      .filter(card => card.memory.nextReview <= now)
      .sort((a, b) => {
        // 우선순위 정렬: 오래된 것부터, 어려운 것부터
        const aOverdue = now.getTime() - a.memory.nextReview.getTime();
        const bOverdue = now.getTime() - b.memory.nextReview.getTime();
        
        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue; // 더 오래된 것부터
        }
        
        return a.memory.easeFactor - b.memory.easeFactor; // 어려운 것부터
      });
  }

  calculateNextReview(card: ReviewCard, session: ReviewSession): Date {
    const quality = this.calculateQuality(session);
    const nextInterval = this.algorithm.calculateNextInterval(
      card.memory.interval,
      card.memory.easeFactor,
      quality,
      card.memory.reviewCount
    );
    
    return new Date(session.timestamp.getTime() + nextInterval * 24 * 60 * 60 * 1000);
  }

  // ============= 통계 및 분석 =============

  calculateStats(cards: ReviewCard[]): SRSStats {
    const now = new Date();
    const dueCards = cards.filter(card => card.memory.nextReview <= now);
    const masteredCards = cards.filter(card => this.isMastered(card));
    const learningCards = cards.filter(card => card.memory.reviewCount === 0);

    const totalAccuracy = cards.reduce((sum, card) => {
      const recentAccuracy = card.performance.accuracy.slice(-5);
      return sum + (recentAccuracy.length > 0 
        ? recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length 
        : 0);
    }, 0);

    const totalResponseTime = cards.reduce((sum, card) => {
      const recentResponseTime = card.performance.responseTime.slice(-5);
      return sum + (recentResponseTime.length > 0
        ? recentResponseTime.reduce((a, b) => a + b, 0) / recentResponseTime.length
        : 0);
    }, 0);

    return {
      totalCards: cards.length,
      dueForReview: dueCards.length,
      averageMemoryStrength: cards.reduce((sum, card) => sum + card.memory.strength, 0) / cards.length || 0,
      masteredCards: masteredCards.length,
      learningCards: learningCards.length,
      avgAccuracy: totalAccuracy / cards.length || 0,
      avgResponseTime: totalResponseTime / cards.length || 0
    };
  }

  analyzePerformance(cards: ReviewCard[]): PerformanceAnalysis {
    // 패턴별 성과 분석
    const patternStats = new Map<string, {correct: number, total: number}>();
    
    cards.forEach(card => {
      const pattern = card.content.pattern || 'unknown';
      const stats = patternStats.get(pattern) || {correct: 0, total: 0};
      const recentAccuracy = card.performance.accuracy.slice(-5);
      
      stats.total += recentAccuracy.length;
      stats.correct += recentAccuracy.reduce((sum, acc) => sum + acc, 0);
      patternStats.set(pattern, stats);
    });

    const weakPatterns = Array.from(patternStats.entries())
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.6)
      .map(([pattern]) => pattern);

    const strongPatterns = Array.from(patternStats.entries())
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) > 0.8)
      .map(([pattern]) => pattern);

    // 추천 포커스 결정
    const avgAccuracy = cards.reduce((sum, card) => 
      sum + (card.performance.accuracy.slice(-5).reduce((a, b) => a + b, 0) / 
             Math.max(1, card.performance.accuracy.length)), 0) / cards.length;
    
    const avgResponseTime = cards.reduce((sum, card) => 
      sum + (card.performance.responseTime.slice(-5).reduce((a, b) => a + b, 0) / 
             Math.max(1, card.performance.responseTime.length)), 0) / cards.length;

    let recommendedFocus: 'accuracy' | 'speed' | 'retention' = 'accuracy';
    if (avgAccuracy > 0.8 && avgResponseTime > 10000) {
      recommendedFocus = 'speed';
    } else if (avgAccuracy > 0.8 && avgResponseTime < 5000) {
      recommendedFocus = 'retention';
    }

    return {
      weakPatterns,
      strongPatterns,
      recommendedFocus,
      estimatedMasteryTime: this.estimateMasteryTime(cards)
    };
  }

  // ============= private 메서드들 =============

  private generateCardId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateQuality(session: ReviewSession): number {
    // 기본적으로 정확도 기반, 확장 가능
    return session.isCorrect ? 4 : 2;
  }

  private isMastered(card: ReviewCard): boolean {
    return card.memory.strength > 0.9 && 
           card.memory.reviewCount >= 5 &&
           card.performance.streak >= 3;
  }

  private estimateMasteryTime(cards: ReviewCard[]): number {
    // 간단한 추정 로직 (일 단위)
    const notMastered = cards.filter(card => !this.isMastered(card));
    const avgReviewsNeeded = 8; // 평균적으로 8번 복습 필요
    const avgDaysPerReview = 3; // 평균 3일마다 복습
    
    return notMastered.length * avgReviewsNeeded * avgDaysPerReview;
  }

  private emitEvent(event: SRSEvent): void {
    this.eventBus?.emit(event);
  }
}