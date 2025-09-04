/**
 * SuperMemo SM-2+ Algorithm Implementation
 * 
 * 개선사항:
 * - 표준 SM-2 알고리즘에 응답시간 가중치 추가
 * - 난이도별 적응형 조정
 * - 메모리 강도 모델링
 */

export interface SM2Config {
  minEaseFactor: number;
  maxEaseFactor: number;
  initialEaseFactor: number;
  easeBonus: number;
  easePenalty: number;
  initialInterval: number;
  graduatingInterval: number;
  easyInterval: number;
}

export interface SM2Card {
  interval: number;           // 복습 간격(일)
  easeFactor: number;         // 용이성 인수
  repetition: number;         // 복습 횟수
  lastReviewed: Date;         // 마지막 복습 날짜
  nextReview: Date;          // 다음 복습 날짜
}

export interface SM2Session {
  quality: number;           // 0-5 품질 점수
  responseTime: number;      // 응답 시간(ms)
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;        // 0-1 신뢰도
}

export class SuperMemoSM2 {
  private config: SM2Config;

  constructor(config: Partial<SM2Config> = {}) {
    this.config = {
      minEaseFactor: 1.3,
      maxEaseFactor: 3.5,
      initialEaseFactor: 2.5,
      easeBonus: 0.1,
      easePenalty: 0.2,
      initialInterval: 1,
      graduatingInterval: 1,
      easyInterval: 4,
      ...config
    };
  }

  /**
   * SM-2+ 알고리즘으로 다음 복습 간격 계산
   */
  calculateNextInterval(card: SM2Card, session: SM2Session): SM2Card {
    const newCard = { ...card };
    const quality = this.normalizeQuality(session.quality);

    if (quality >= 3) {
      // 성공한 복습
      newCard.repetition += 1;

      if (newCard.repetition === 1) {
        newCard.interval = this.config.graduatingInterval;
      } else if (newCard.repetition === 2) {
        newCard.interval = 6;
      } else {
        newCard.interval = Math.round(card.interval * card.easeFactor);
      }

      // Ease factor 조정 (SM-2 공식)
      newCard.easeFactor = Math.max(
        this.config.minEaseFactor,
        card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );

      // 응답시간 기반 조정
      newCard.easeFactor = this.adjustForResponseTime(newCard.easeFactor, session.responseTime);

      // 난이도 기반 조정
      newCard.easeFactor = this.adjustForDifficulty(newCard.easeFactor, session.difficulty);

    } else {
      // 실패한 복습
      newCard.repetition = 0;
      newCard.interval = this.config.initialInterval;
      newCard.easeFactor = Math.max(
        this.config.minEaseFactor,
        card.easeFactor - this.config.easePenalty
      );
    }

    // Ease factor 범위 제한
    newCard.easeFactor = Math.min(this.config.maxEaseFactor, newCard.easeFactor);

    // 날짜 업데이트
    newCard.lastReviewed = new Date();
    newCard.nextReview = new Date(Date.now() + newCard.interval * 24 * 60 * 60 * 1000);

    return newCard;
  }

  /**
   * 품질 점수 정규화 (0-5 범위)
   */
  private normalizeQuality(quality: number): number {
    return Math.max(0, Math.min(5, Math.round(quality)));
  }

  /**
   * 응답시간 기반 ease factor 조정
   */
  private adjustForResponseTime(easeFactor: number, responseTime: number): number {
    // 2초 이하: 매우 빠름 (+5%)
    // 2-5초: 적절함 (변화 없음)
    // 5-10초: 조금 느림 (-2%)
    // 10초 이상: 매우 느림 (-5%)

    if (responseTime <= 2000) {
      return Math.min(this.config.maxEaseFactor, easeFactor * 1.05);
    } else if (responseTime <= 5000) {
      return easeFactor; // 변화 없음
    } else if (responseTime <= 10000) {
      return Math.max(this.config.minEaseFactor, easeFactor * 0.98);
    } else {
      return Math.max(this.config.minEaseFactor, easeFactor * 0.95);
    }
  }

  /**
   * 난이도 기반 ease factor 조정
   */
  private adjustForDifficulty(easeFactor: number, difficulty: 'easy' | 'medium' | 'hard'): number {
    const adjustments = {
      easy: 1.02,     // +2%
      medium: 1.0,    // 변화 없음
      hard: 0.98      // -2%
    };

    const adjusted = easeFactor * adjustments[difficulty];
    return Math.max(this.config.minEaseFactor, Math.min(this.config.maxEaseFactor, adjusted));
  }

  /**
   * 새 카드 생성
   */
  createNewCard(): SM2Card {
    const now = new Date();
    return {
      interval: 0,
      easeFactor: this.config.initialEaseFactor,
      repetition: 0,
      lastReviewed: now,
      nextReview: new Date(now.getTime() + this.config.initialInterval * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * 복습 필요 여부 확인
   */
  isDue(card: SM2Card, currentTime: Date = new Date()): boolean {
    return card.nextReview <= currentTime;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<SM2Config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): SM2Config {
    return { ...this.config };
  }
}

export default SuperMemoSM2;