/**
 * SuperMemo SM-2 알고리즘 전략
 * ISRSAlgorithm 인터페이스 구현체
 * 
 * 느슨한 결합: 알고리즘을 교체 가능한 전략으로 분리
 */

import { ISRSAlgorithm } from '../interfaces/ISRSEngine';

export class SuperMemoSM2Strategy implements ISRSAlgorithm {
  readonly name = 'SuperMemo SM-2';
  readonly version = '2.0';

  private readonly config = {
    minEaseFactor: 1.3,
    maxEaseFactor: 3.5,
    initialEaseFactor: 2.5,
    easeFactorStep: 0.1,
    failureThreshold: 3,
    maxInterval: 36500 // ~100 years
  };

  calculateNextInterval(
    currentInterval: number,
    easeFactor: number,
    quality: number,
    reviewCount: number
  ): number {
    // SuperMemo SM-2 간격 계산 로직
    if (quality < this.config.failureThreshold) {
      // 실패: 처음부터 다시
      return 1;
    }

    if (reviewCount === 0) {
      return 1;
    }

    if (reviewCount === 1) {
      return 6;
    }

    // 성공: 이전 간격 × ease factor
    const nextInterval = Math.round(currentInterval * easeFactor);
    return Math.min(nextInterval, this.config.maxInterval);
  }

  updateEaseFactor(currentEaseFactor: number, quality: number): number {
    // SuperMemo SM-2 공식: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    const newEF = currentEaseFactor + (
      0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );

    // 최솟값 제한
    return Math.max(this.config.minEaseFactor, 
           Math.min(this.config.maxEaseFactor, newEF));
  }

  updateMemoryStrength(
    currentStrength: number,
    quality: number,
    timeSinceLastReview: number
  ): number {
    // Ebbinghaus 망각곡선 + 복습 효과
    const decayRate = 0.05; // 일일 망각률
    const reviewBonus = quality / 5; // 0-1 범위
    
    // 시간 경과에 따른 자연 감소
    const timeDecay = Math.exp(-decayRate * (timeSinceLastReview / (24 * 60 * 60 * 1000))); // ms → days
    const decayedStrength = currentStrength * timeDecay;
    
    // 복습 효과로 강화
    const reinforcement = reviewBonus * (1 - decayedStrength) * 0.8;
    const newStrength = Math.min(1.0, decayedStrength + reinforcement);
    
    return Math.max(0.1, newStrength);
  }

  /**
   * 품질 점수를 0-5 범위로 정규화
   */
  normalizeQuality(
    accuracy: number,
    responseTime: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): number {
    let quality = accuracy * 5; // 0-5 기본 점수

    // 응답 시간 가중치
    const timeWeight = this.calculateTimeWeight(responseTime);
    quality *= timeWeight;

    // 난이도 가중치
    const difficultyMultiplier = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.2
    };
    quality *= difficultyMultiplier[difficulty];

    // 0-5 범위로 클램핑
    return Math.max(0, Math.min(5, Math.round(quality)));
  }

  private calculateTimeWeight(responseTime: number): number {
    // 이상적 응답 시간: 3-7초
    const idealMin = 3000;
    const idealMax = 7000;

    if (responseTime < idealMin) {
      // 너무 빠름 (추측 가능성)
      return 0.8;
    } else if (responseTime <= idealMax) {
      // 이상적 범위
      return 1.0;
    } else if (responseTime <= 15000) {
      // 조금 느림
      return Math.max(0.6, 1.0 - (responseTime - idealMax) / 20000);
    } else {
      // 매우 느림
      return 0.6;
    }
  }

  /**
   * 알고리즘 설정 조정 (adaptive learning)
   */
  adaptConfig(performanceHistory: {
    averageAccuracy: number;
    averageRetention: number;
    studyFrequency: number;
  }): void {
    const { averageAccuracy, averageRetention, studyFrequency } = performanceHistory;

    // 성과가 좋으면 더 도전적으로
    if (averageAccuracy > 0.9 && averageRetention > 0.8) {
      this.config.minEaseFactor = Math.min(1.5, this.config.minEaseFactor + 0.1);
    }

    // 성과가 나쁘면 더 보수적으로
    if (averageAccuracy < 0.6 || averageRetention < 0.5) {
      this.config.minEaseFactor = Math.max(1.1, this.config.minEaseFactor - 0.1);
    }

    // 학습 빈도에 따른 조정
    if (studyFrequency < 0.5) { // 불규칙한 학습
      this.config.maxInterval = Math.min(30, this.config.maxInterval); // 최대 30일로 제한
    }
  }
}