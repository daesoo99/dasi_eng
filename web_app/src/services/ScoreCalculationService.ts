/**
 * ScoreCalculationService - SM-2 알고리즘 기반 학습 품질 점수 계산
 * 목적: 사용자 답변의 정확도와 신뢰도를 SM-2 알고리즘 품질 점수로 변환
 */

export interface ScoreInput {
  isCorrect: boolean;
  confidence: number;
  score: number;
  responseTime?: number;
}

export interface QualityResult {
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  category: 'perfect' | 'good' | 'acceptable' | 'poor' | 'failed';
}

export interface DetailedScoreAnalysis {
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  category: 'perfect' | 'good' | 'acceptable' | 'poor' | 'failed';
  reasoning: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  scoreLevel: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export class ScoreCalculationService {
  // SM-2 품질 점수 임계값 설정
  private readonly QUALITY_THRESHOLDS = {
    PERFECT_SCORE: 90,
    GOOD_SCORE: 80,
    HIGH_CONFIDENCE: 0.7,
    MEDIUM_CONFIDENCE: 0.4
  };

  // 응답 시간 기반 보너스/페널티
  private readonly TIME_THRESHOLDS = {
    FAST_RESPONSE: 3, // 3초 이내 빠른 응답
    SLOW_RESPONSE: 15, // 15초 이상 느린 응답
    VERY_SLOW_RESPONSE: 30 // 30초 이상 매우 느린 응답
  };

  /**
   * SM-2 알고리즘 품질 점수 계산 (0-5)
   * 0: 완전한 실패 (blackout)
   * 1: 잘못된 응답, 정답을 기억했음
   * 2: 잘못된 응답, 정답이 쉽게 기억남
   * 3: 정확한 응답, 어려움을 겪음
   * 4: 정확한 응답, 약간의 망설임
   * 5: 완벽한 응답
   */
  calculateQuality(input: ScoreInput): QualityResult {
    const { isCorrect, confidence, score, responseTime } = input;

    console.log('[ScoreCalculationService] Calculating quality for:', input);

    if (!isCorrect) {
      return this.calculateIncorrectQuality(confidence);
    }

    return this.calculateCorrectQuality(score, confidence, responseTime);
  }

  /**
   * 상세한 점수 분석 제공
   */
  getDetailedAnalysis(input: ScoreInput): DetailedScoreAnalysis {
    const qualityResult = this.calculateQuality(input);
    const { isCorrect, confidence, score, responseTime } = input;

    const confidenceLevel = this.getConfidenceLevel(confidence);
    const scoreLevel = this.getScoreLevel(score);
    const recommendations = this.generateRecommendations(input, qualityResult);

    return {
      ...qualityResult,
      confidenceLevel,
      scoreLevel,
      recommendations
    };
  }

  /**
   * 틀린 답변에 대한 품질 점수 계산
   */
  private calculateIncorrectQuality(confidence: number): QualityResult {
    if (confidence > this.QUALITY_THRESHOLDS.HIGH_CONFIDENCE) {
      return {
        quality: 2,
        reasoning: '틀렸지만 높은 신뢰도로 답변 - 정답을 쉽게 기억할 수 있음',
        category: 'acceptable'
      };
    }

    if (confidence > this.QUALITY_THRESHOLDS.MEDIUM_CONFIDENCE) {
      return {
        quality: 1,
        reasoning: '틀렸고 중간 정도 신뢰도 - 정답을 기억하고 있음',
        category: 'poor'
      };
    }

    return {
      quality: 0,
      reasoning: '틀렸고 낮은 신뢰도 - 완전한 실패 (blackout)',
      category: 'failed'
    };
  }

  /**
   * 맞은 답변에 대한 품질 점수 계산
   */
  private calculateCorrectQuality(
    score: number, 
    confidence: number, 
    responseTime?: number
  ): QualityResult {
    // 기본 품질 점수 결정
    const baseResult = this.determineBaseQuality(score);

    // 응답 시간 조정 적용
    if (responseTime) {
      return this.applyTimeAdjustment(baseResult, responseTime);
    }

    // 신뢰도 조정 적용
    return this.applyConfidenceAdjustment(baseResult, confidence);
  }

  /**
   * 점수 기반 기본 품질 결정
   */
  private determineBaseQuality(score: number): {
    quality: 3 | 4 | 5;
    reasoning: string;
    category: 'perfect' | 'good' | 'acceptable';
  } {
    if (score >= this.QUALITY_THRESHOLDS.PERFECT_SCORE) {
      return {
        quality: 5,
        reasoning: '완벽한 점수',
        category: 'perfect'
      };
    }
    
    if (score >= this.QUALITY_THRESHOLDS.GOOD_SCORE) {
      return {
        quality: 4,
        reasoning: '좋은 점수',
        category: 'good'
      };
    }
    
    return {
      quality: 3,
      reasoning: '정확하지만 어려움을 겪음',
      category: 'acceptable'
    };
  }

  /**
   * 응답 시간 기반 품질 조정 적용
   */
  private applyTimeAdjustment(
    baseResult: { quality: 3 | 4 | 5; reasoning: string; category: 'perfect' | 'good' | 'acceptable' },
    responseTime: number
  ): QualityResult {
    const timeAdjustment = this.getTimeAdjustment(responseTime, baseResult.quality);
    const adjustedQuality = Math.max(3, Math.min(5, baseResult.quality + timeAdjustment)) as 3 | 4 | 5;
    
    if (adjustedQuality !== baseResult.quality) {
      const timeDescription = this.getTimeDescription(responseTime);
      const adjustedReasoning = baseResult.reasoning + ` (${timeDescription})`;
      const adjustedCategory = this.getCategoryFromQuality(adjustedQuality);
      
      return {
        quality: adjustedQuality,
        reasoning: adjustedReasoning,
        category: adjustedCategory
      };
    }
    
    return {
      quality: baseResult.quality,
      reasoning: baseResult.reasoning,
      category: baseResult.category
    };
  }

  /**
   * 신뢰도 기반 품질 조정 적용
   */
  private applyConfidenceAdjustment(
    baseResult: { quality: 3 | 4 | 5; reasoning: string; category: 'perfect' | 'good' | 'acceptable' },
    confidence: number
  ): QualityResult {
    if (confidence < this.QUALITY_THRESHOLDS.MEDIUM_CONFIDENCE && baseResult.quality > 3) {
      return {
        quality: 3,
        reasoning: baseResult.reasoning + ' (낮은 신뢰도로 조정)',
        category: 'acceptable'
      };
    }

    return {
      quality: baseResult.quality,
      reasoning: baseResult.reasoning,
      category: baseResult.category
    };
  }

  /**
   * 품질 점수로부터 카테고리 결정
   */
  private getCategoryFromQuality(quality: 3 | 4 | 5): 'perfect' | 'good' | 'acceptable' {
    if (quality === 5) return 'perfect';
    if (quality === 4) return 'good';
    return 'acceptable';
  }

  /**
   * 응답 시간 기반 조정값 계산
   */
  private getTimeAdjustment(responseTime: number, baseQuality: number): number {
    if (responseTime <= this.TIME_THRESHOLDS.FAST_RESPONSE && baseQuality < 5) {
      return 1; // 빠른 응답 보너스
    }
    
    if (responseTime >= this.TIME_THRESHOLDS.VERY_SLOW_RESPONSE) {
      return -1; // 매우 느린 응답 페널티
    }
    
    if (responseTime >= this.TIME_THRESHOLDS.SLOW_RESPONSE && baseQuality > 3) {
      return -1; // 느린 응답 페널티
    }

    return 0; // 조정 없음
  }

  /**
   * 응답 시간 설명 생성
   */
  private getTimeDescription(responseTime: number): string {
    if (responseTime <= this.TIME_THRESHOLDS.FAST_RESPONSE) {
      return `빠른 응답 ${responseTime.toFixed(1)}초`;
    }
    
    if (responseTime >= this.TIME_THRESHOLDS.VERY_SLOW_RESPONSE) {
      return `매우 느린 응답 ${responseTime.toFixed(1)}초`;
    }
    
    if (responseTime >= this.TIME_THRESHOLDS.SLOW_RESPONSE) {
      return `느린 응답 ${responseTime.toFixed(1)}초`;
    }

    return `보통 응답 ${responseTime.toFixed(1)}초`;
  }

  /**
   * 신뢰도 레벨 분류
   */
  private getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= this.QUALITY_THRESHOLDS.HIGH_CONFIDENCE) return 'high';
    if (confidence >= this.QUALITY_THRESHOLDS.MEDIUM_CONFIDENCE) return 'medium';
    return 'low';
  }

  /**
   * 점수 레벨 분류
   */
  private getScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= this.QUALITY_THRESHOLDS.PERFECT_SCORE) return 'excellent';
    if (score >= this.QUALITY_THRESHOLDS.GOOD_SCORE) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 개선 권장사항 생성
   */
  private generateRecommendations(input: ScoreInput, result: QualityResult): string[] {
    const recommendations: string[] = [];
    const { isCorrect, confidence, score, responseTime } = input;

    if (!isCorrect) {
      recommendations.push('정답을 다시 한번 확인하고 연습하세요');
      
      if (confidence < this.QUALITY_THRESHOLDS.MEDIUM_CONFIDENCE) {
        recommendations.push('해당 문법이나 표현을 기초부터 다시 학습하세요');
      }
    } else {
      if (score < this.QUALITY_THRESHOLDS.GOOD_SCORE) {
        recommendations.push('발음이나 문법을 더 정확하게 연습하세요');
      }
      
      if (confidence < this.QUALITY_THRESHOLDS.HIGH_CONFIDENCE) {
        recommendations.push('더 자신감 있게 답변할 수 있도록 반복 연습하세요');
      }
    }

    if (responseTime && responseTime > this.TIME_THRESHOLDS.SLOW_RESPONSE) {
      recommendations.push('더 빠른 반응 속도를 위해 자주 사용하는 표현을 암기하세요');
    }

    if (result.quality >= 4) {
      recommendations.push('훌륭합니다! 이 수준을 유지하세요');
    }

    return recommendations;
  }

  /**
   * 품질 점수 설명 제공
   */
  getQualityDescription(quality: 0 | 1 | 2 | 3 | 4 | 5): string {
    const descriptions = {
      0: '완전한 실패 - 정답을 전혀 기억하지 못함',
      1: '실패 후 정답 확인 - 정답을 기억하고 있음',
      2: '실패 후 쉬운 정답 확인 - 정답을 쉽게 기억할 수 있음',
      3: '성공하지만 어려움 - 정확한 응답이지만 어려움을 겪음',
      4: '성공하지만 망설임 - 정확한 응답이지만 약간의 망설임',
      5: '완벽한 성공 - 즉시 정확한 응답'
    };

    return descriptions[quality];
  }

  /**
   * 현재 설정된 임계값 조회
   */
  getThresholds() {
    return {
      quality: this.QUALITY_THRESHOLDS,
      time: this.TIME_THRESHOLDS
    };
  }

  /**
   * 임계값 업데이트 (설정 변경용)
   */
  updateThresholds(newThresholds: Partial<typeof this.QUALITY_THRESHOLDS>): void {
    Object.assign(this.QUALITY_THRESHOLDS, newThresholds);
    console.log('[ScoreCalculationService] Thresholds updated:', this.QUALITY_THRESHOLDS);
  }
}