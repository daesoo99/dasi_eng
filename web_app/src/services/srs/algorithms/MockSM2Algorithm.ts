/**
 * Mock SuperMemo SM-2 알고리즘 (테스트용)
 * ISRSAlgorithm 인터페이스 구현체
 * 
 * 결정적이고 예측 가능한 결과를 제공
 */

import { ISRSAlgorithm } from '../interfaces/ISRSEngine';

export class MockSM2Algorithm implements ISRSAlgorithm {
  readonly name = 'Mock SuperMemo SM-2';
  readonly version = 'test-1.0';

  private readonly config = {
    minEaseFactor: 1.3,
    maxEaseFactor: 2.5,
    initialEaseFactor: 1.8,
    easeFactorStep: 0.1,
    failureThreshold: 3,
    maxInterval: 10 // 테스트용으로 축소
  };

  calculateNextInterval(
    currentInterval: number,
    easeFactor: number,
    quality: number,
    reviewCount: number
  ): number {
    // 간단하고 예측 가능한 로직
    if (quality < this.config.failureThreshold) {
      return 1; // 실패시 1일
    }

    if (reviewCount === 0) {
      return 1;
    }

    if (reviewCount === 1) {
      return 3;
    }

    // 성공시 간단한 곱셈
    const nextInterval = Math.round(currentInterval * Math.max(1.2, easeFactor));
    return Math.min(nextInterval, this.config.maxInterval);
  }

  updateEaseFactor(currentEaseFactor: number, quality: number): number {
    // 간단한 조정
    let adjustment = 0;
    
    if (quality >= 4) {
      adjustment = 0.1;
    } else if (quality <= 2) {
      adjustment = -0.1;
    }
    
    const newEF = currentEaseFactor + adjustment;
    return Math.max(this.config.minEaseFactor, 
           Math.min(this.config.maxEaseFactor, newEF));
  }

  updateMemoryStrength(
    currentStrength: number,
    quality: number,
    _timeSinceLastReview: number
  ): number {
    // 간단한 강화/약화 로직
    const reviewBonus = quality / 5; // 0-1 범위
    const timeDecayFactor = 0.9; // 단순 감소
    
    const decayedStrength = currentStrength * timeDecayFactor;
    const reinforcement = reviewBonus * 0.3;
    
    const newStrength = Math.min(1.0, decayedStrength + reinforcement);
    return Math.max(0.1, newStrength);
  }

  /**
   * 테스트용 - 결정적 품질 점수 반환
   */
  getDeterministicQuality(isCorrect: boolean, responseTime: number): number {
    if (!isCorrect) return 2;
    
    // 응답 시간에 따른 간단한 품질 점수
    if (responseTime < 3000) return 5; // 빠른 응답
    if (responseTime < 7000) return 4; // 적절한 응답
    if (responseTime < 12000) return 3; // 느린 응답
    return 2; // 너무 느림
  }

  /**
   * 테스트용 - 예측 가능한 간격 계산
   */
  getPredictableInterval(reviewCount: number, isCorrect: boolean): number {
    if (!isCorrect) return 1;
    
    const intervals = [1, 3, 6, 10]; // 예측 가능한 시퀀스
    return intervals[Math.min(reviewCount, intervals.length - 1)];
  }

  /**
   * 테스트용 - 설정 덮어쓰기
   */
  overrideConfigForTest(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);
  }

  /**
   * 테스트용 - 기본 설정으로 재설정
   */
  resetConfigForTest(): void {
    this.config.minEaseFactor = 1.3;
    this.config.maxEaseFactor = 2.5;
    this.config.initialEaseFactor = 1.8;
    this.config.maxInterval = 10;
  }
}