/**
 * Ebbinghaus Forgetting Curve Implementation
 * 
 * 기능:
 * - 망각곡선 수학 모델 구현
 * - 기억 강도 예측
 * - 최적 복습 시점 계산
 * - 개인화된 망각률 적용
 */

export interface ForgettingCurveConfig {
  // 기본 망각률 파라미터
  baseDecayRate: number;      // 기본 망각률 (0-1)
  stabilityFactor: number;    // 안정성 인수 (학습 강도)
  difficultyWeight: number;   // 난이도 가중치
  strengthWeight: number;     // 기억 강도 가중치
  
  // 개인화 파라미터
  personalDecayModifier: number;  // 개인별 망각률 조정
  consistencyBonus: number;       // 일관성 보너스
  
  // 임계값
  retentionThreshold: number;     // 복습 필요 임계값 (0-1)
  masterThreshold: number;        // 마스터 임계값 (0-1)
}

export interface MemoryState {
  strength: number;           // 현재 기억 강도 (0-1)
  stability: number;          // 기억 안정성 (일)
  difficulty: number;         // 주관적 난이도 (0-1)
  lastReviewed: Date;        // 마지막 복습 시간
  reviewCount: number;       // 총 복습 횟수
  successRate: number;       // 성공률 (0-1)
}

export interface PredictionResult {
  currentStrength: number;    // 현재 예상 기억 강도
  strengthIn24h: number;      // 24시간 후 예상 기억 강도
  strengthIn7d: number;       // 7일 후 예상 기억 강도
  optimalReviewTime: Date;    // 최적 복습 시점
  timeToForget: number;       // 망각까지 남은 시간 (시간)
  confidenceLevel: number;    // 예측 신뢰도 (0-1)
}

export class ForgettingCurve {
  private config: ForgettingCurveConfig;

  constructor(config: Partial<ForgettingCurveConfig> = {}) {
    this.config = {
      baseDecayRate: 0.05,
      stabilityFactor: 2.0,
      difficultyWeight: 0.3,
      strengthWeight: 0.4,
      personalDecayModifier: 1.0,
      consistencyBonus: 0.1,
      retentionThreshold: 0.7,
      masterThreshold: 0.9,
      ...config
    };
  }

  /**
   * Ebbinghaus 망각곡선 공식: R(t) = e^(-t/S)
   * R(t): 시간 t에서의 기억 보존률
   * S: 기억 안정성 (stability)
   * t: 경과 시간
   */
  calculateRetention(memoryState: MemoryState, timeElapsed: number): number {
    const adjustedStability = this.calculateAdjustedStability(memoryState);
    const retention = Math.exp(-timeElapsed / adjustedStability);
    
    // 개인별 망각률 조정 적용
    const personalizedRetention = retention * this.config.personalDecayModifier;
    
    // 기억 강도와 결합
    return Math.max(0, Math.min(1, personalizedRetention * memoryState.strength));
  }

  /**
   * 현재 기억 강도 계산
   */
  getCurrentStrength(memoryState: MemoryState, currentTime: Date = new Date()): number {
    const hoursElapsed = (currentTime.getTime() - memoryState.lastReviewed.getTime()) / (1000 * 60 * 60);
    return this.calculateRetention(memoryState, hoursElapsed);
  }

  /**
   * 미래 기억 강도 예측
   */
  predictStrength(memoryState: MemoryState, futureTime: Date): number {
    const hoursFromLastReview = (futureTime.getTime() - memoryState.lastReviewed.getTime()) / (1000 * 60 * 60);
    return this.calculateRetention(memoryState, hoursFromLastReview);
  }

  /**
   * 포괄적 예측 분석
   */
  analyzePrediction(memoryState: MemoryState, currentTime: Date = new Date()): PredictionResult {
    const currentStrength = this.getCurrentStrength(memoryState, currentTime);
    
    const in24h = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    const strengthIn24h = this.predictStrength(memoryState, in24h);
    
    const in7d = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    const strengthIn7d = this.predictStrength(memoryState, in7d);
    
    const optimalReviewTime = this.calculateOptimalReviewTime(memoryState, currentTime);
    const timeToForget = this.calculateTimeToForget(memoryState, currentTime);
    const confidenceLevel = this.calculatePredictionConfidence(memoryState);

    return {
      currentStrength,
      strengthIn24h,
      strengthIn7d,
      optimalReviewTime,
      timeToForget,
      confidenceLevel
    };
  }

  /**
   * 최적 복습 시점 계산 (기억 강도가 임계값에 도달하는 시점)
   */
  calculateOptimalReviewTime(memoryState: MemoryState, currentTime: Date = new Date()): Date {
    const adjustedStability = this.calculateAdjustedStability(memoryState);
    
    // R(t) = threshold가 되는 시점 계산
    // e^(-t/S) * strength = threshold
    // t = -S * ln(threshold / strength)
    
    const targetRetention = this.config.retentionThreshold / memoryState.strength;
    if (targetRetention >= 1) {
      // 이미 임계값 아래로 떨어짐
      return currentTime;
    }
    
    const hoursUntilReview = -adjustedStability * Math.log(targetRetention);
    return new Date(memoryState.lastReviewed.getTime() + hoursUntilReview * 60 * 60 * 1000);
  }

  /**
   * 완전히 잊을 때까지의 시간 계산
   */
  calculateTimeToForget(memoryState: MemoryState, currentTime: Date = new Date()): number {
    const adjustedStability = this.calculateAdjustedStability(memoryState);
    
    // 기억 강도가 0.1 이하로 떨어지는 시점
    const forgetThreshold = 0.1 / memoryState.strength;
    if (forgetThreshold >= 1) {
      return 0; // 이미 잊음
    }
    
    const hoursToForget = -adjustedStability * Math.log(forgetThreshold);
    const hoursElapsed = (currentTime.getTime() - memoryState.lastReviewed.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, hoursToForget - hoursElapsed);
  }

  /**
   * 복습 후 기억 상태 업데이트
   */
  updateMemoryAfterReview(
    memoryState: MemoryState, 
    quality: number, 
    responseTime: number,
    currentTime: Date = new Date()
  ): MemoryState {
    const newState = { ...memoryState };
    
    // 기억 강도 업데이트
    const qualityBonus = (quality - 2.5) * 0.1; // -2.5~+2.5 범위를 -0.25~+0.25로 변환
    newState.strength = Math.max(0.1, Math.min(1.0, memoryState.strength + qualityBonus + 0.1));
    
    // 안정성 업데이트 (성공할수록 증가)
    if (quality >= 3) {
      newState.stability = Math.min(365, memoryState.stability * (1 + quality * 0.1));
    } else {
      newState.stability = Math.max(1, memoryState.stability * 0.8);
    }
    
    // 난이도 업데이트 (응답시간 기반)
    const timeWeight = this.calculateTimeWeight(responseTime);
    newState.difficulty = (memoryState.difficulty * 0.8) + ((1 - timeWeight) * 0.2);
    
    // 기타 메타데이터 업데이트
    newState.lastReviewed = currentTime;
    newState.reviewCount += 1;
    
    // 성공률 업데이트 (지수 이동 평균)
    const isSuccess = quality >= 3 ? 1 : 0;
    newState.successRate = (memoryState.successRate * 0.9) + (isSuccess * 0.1);
    
    return newState;
  }

  /**
   * 조정된 안정성 계산 (난이도, 복습 횟수 등 고려)
   */
  private calculateAdjustedStability(memoryState: MemoryState): number {
    let adjustedStability = memoryState.stability * this.config.stabilityFactor;
    
    // 난이도 가중치 적용
    adjustedStability *= (1 - memoryState.difficulty * this.config.difficultyWeight);
    
    // 기억 강도 가중치 적용
    adjustedStability *= (1 + memoryState.strength * this.config.strengthWeight);
    
    // 복습 횟수 보너스
    const reviewBonus = Math.min(0.5, memoryState.reviewCount * 0.05);
    adjustedStability *= (1 + reviewBonus);
    
    // 성공률 보너스
    const successBonus = memoryState.successRate * this.config.consistencyBonus;
    adjustedStability *= (1 + successBonus);
    
    return Math.max(1, adjustedStability); // 최소 1시간
  }

  /**
   * 응답시간 기반 가중치 계산
   */
  private calculateTimeWeight(responseTime: number): number {
    // 2초: 1.0 (완벽), 5초: 0.8, 10초: 0.5, 20초+: 0.2
    if (responseTime <= 2000) return 1.0;
    if (responseTime <= 5000) return 0.8;
    if (responseTime <= 10000) return 0.5;
    return 0.2;
  }

  /**
   * 예측 신뢰도 계산
   */
  private calculatePredictionConfidence(memoryState: MemoryState): number {
    let confidence = 0.7; // 기본 신뢰도
    
    // 복습 횟수가 많을수록 신뢰도 증가
    confidence += Math.min(0.2, memoryState.reviewCount * 0.02);
    
    // 성공률이 일관될수록 신뢰도 증가
    const consistencyBonus = 1 - Math.abs(memoryState.successRate - 0.7) * 2;
    confidence += consistencyBonus * 0.1;
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * 마스터 여부 확인
   */
  isMastered(memoryState: MemoryState, currentTime: Date = new Date()): boolean {
    const currentStrength = this.getCurrentStrength(memoryState, currentTime);
    return (
      currentStrength >= this.config.masterThreshold &&
      memoryState.reviewCount >= 5 &&
      memoryState.successRate >= 0.9
    );
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<ForgettingCurveConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): ForgettingCurveConfig {
    return { ...this.config };
  }
}

export default ForgettingCurve;