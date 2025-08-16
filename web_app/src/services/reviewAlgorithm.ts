// 고급 복습 알고리즘 서비스
// 간격 반복 학습 (Spaced Repetition) + 망각 곡선 기반

interface ReviewSession {
  sentenceId: string;
  userId: string;
  accuracy: number; // 0-1 점수
  responseTime: number; // 응답 시간 (ms)
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: Date;
  reviewCount: number;
  intervalDays: number;
}

interface ReviewMetrics {
  totalReviews: number;
  averageAccuracy: number;
  averageResponseTime: number;
  retentionRate: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastered';
}

interface MemoryStrength {
  sentenceId: string;
  strength: number; // 0-1, 1이 완전히 기억
  lastReviewDate: Date;
  nextReviewDate: Date;
  easeFactor: number; // SuperMemo 알고리즘의 ease factor
  intervalDays: number;
  reviewCount: number;
}

class ReviewAlgorithmService {
  
  /**
   * SuperMemo SM-2 알고리즘 기반 간격 반복 계산
   */
  calculateNextReview(session: ReviewSession, currentStrength: MemoryStrength): MemoryStrength {
    const { accuracy, difficulty, responseTime } = session;
    
    // 정확도와 난이도에 따른 품질 점수 계산 (0-5)
    const quality = this.calculateQuality(accuracy, difficulty, responseTime);
    
    let newEaseFactor = currentStrength.easeFactor;
    let newInterval = currentStrength.intervalDays;
    
    if (quality >= 3) {
      // 성공적인 복습
      if (currentStrength.reviewCount === 0) {
        newInterval = 1;
      } else if (currentStrength.reviewCount === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentStrength.intervalDays * currentStrength.easeFactor);
      }
      
      // ease factor 조정
      newEaseFactor = Math.max(1.3, 
        currentStrength.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      // 실패한 복습 - 간격 리셋
      newInterval = 1;
      newEaseFactor = Math.max(1.3, currentStrength.easeFactor - 0.2);
    }
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    return {
      ...currentStrength,
      strength: this.updateMemoryStrength(currentStrength.strength, quality),
      lastReviewDate: new Date(),
      nextReviewDate,
      easeFactor: newEaseFactor,
      intervalDays: newInterval,
      reviewCount: currentStrength.reviewCount + 1
    };
  }
  
  /**
   * 정확도, 난이도, 응답시간 기반 품질 점수 계산
   */
  private calculateQuality(accuracy: number, difficulty: string, responseTime: number): number {
    // 기본 정확도 점수 (0-5)
    let qualityScore = accuracy * 5;
    
    // 응답 시간 가중치 (빠른 응답은 더 높은 점수)
    const timeWeight = this.getTimeWeight(responseTime);
    qualityScore *= timeWeight;
    
    // 난이도 가중치
    const difficultyWeight = {
      'easy': 0.8,    // 쉬운 문제는 점수 감소
      'medium': 1.0,  // 보통 문제는 그대로
      'hard': 1.2     // 어려운 문제는 점수 증가
    };
    qualityScore *= difficultyWeight[difficulty];
    
    // 0-5 범위로 제한
    return Math.max(0, Math.min(5, Math.round(qualityScore)));
  }
  
  /**
   * 응답 시간 기반 가중치 계산
   */
  private getTimeWeight(responseTime: number): number {
    // 이상적인 응답 시간: 3-7초
    const idealMin = 3000;
    const idealMax = 7000;
    
    if (responseTime < idealMin) {
      // 너무 빠름 - 추측일 가능성
      return 0.8;
    } else if (responseTime <= idealMax) {
      // 이상적 범위
      return 1.0;
    } else if (responseTime <= 15000) {
      // 조금 느림 - 점진적 감소
      return 1.0 - (responseTime - idealMax) / 20000;
    } else {
      // 매우 느림
      return 0.6;
    }
  }
  
  /**
   * 기억 강도 업데이트 (망각 곡선 적용)
   */
  private updateMemoryStrength(currentStrength: number, quality: number): number {
    // 성공적인 복습 (quality >= 3)
    if (quality >= 3) {
      // 기억 강도 증가, 최대 1.0
      const increase = (quality / 5) * 0.3;
      return Math.min(1.0, currentStrength + increase);
    } else {
      // 실패한 복습 - 기억 강도 감소
      const decrease = (3 - quality) / 5 * 0.4;
      return Math.max(0.1, currentStrength - decrease);
    }
  }
  
  /**
   * 오늘 복습할 문장들 선정
   */
  async getTodayReviewSentences(userId: string, maxCount: number = 50): Promise<string[]> {
    const today = new Date();
    
    // 1. 복습 일정이 된 문장들
    const scheduledReviews = await this.getScheduledReviews(userId, today);
    
    // 2. 취약한 문장들 (강도가 낮은 순)
    const weakSentences = await this.getWeakSentences(userId, maxCount - scheduledReviews.length);
    
    // 3. 새로운 문장들 (아직 한 번도 복습하지 않은 것)
    const newSentences = await this.getNewSentences(userId, maxCount - scheduledReviews.length - weakSentences.length);
    
    // 우선순위: 예정된 복습 > 취약한 문장 > 새로운 문장
    return [...scheduledReviews, ...weakSentences, ...newSentences].slice(0, maxCount);
  }
  
  /**
   * 개인별 복습 패턴 분석
   */
  async analyzeReviewPattern(userId: string): Promise<ReviewMetrics> {
    const recentSessions = await this.getRecentSessions(userId, 30); // 최근 30일
    
    if (recentSessions.length === 0) {
      return {
        totalReviews: 0,
        averageAccuracy: 0,
        averageResponseTime: 0,
        retentionRate: 0,
        masteryLevel: 'beginner'
      };
    }
    
    const totalReviews = recentSessions.length;
    const averageAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / totalReviews;
    const averageResponseTime = recentSessions.reduce((sum, s) => sum + s.responseTime, 0) / totalReviews;
    
    // 유지율 계산 (7일 후 재복습 시 성공률)
    const retentionRate = await this.calculateRetentionRate(userId);
    
    // 숙련도 레벨 결정
    const masteryLevel = this.determineMasteryLevel(averageAccuracy, retentionRate, totalReviews);
    
    return {
      totalReviews,
      averageAccuracy,
      averageResponseTime,
      retentionRate,
      masteryLevel
    };
  }
  
  /**
   * 적응형 난이도 조정
   */
  async adaptiveDifficultyAdjustment(userId: string): Promise<'easier' | 'maintain' | 'harder'> {
    const metrics = await this.analyzeReviewPattern(userId);
    
    if (metrics.averageAccuracy > 0.9 && metrics.retentionRate > 0.8) {
      return 'harder'; // 더 어려운 문장 제공
    } else if (metrics.averageAccuracy < 0.6 || metrics.retentionRate < 0.5) {
      return 'easier'; // 더 쉬운 문장 제공
    } else {
      return 'maintain'; // 현재 수준 유지
    }
  }
  
  /**
   * 개인 맞춤 복습 스케줄 생성
   */
  async generatePersonalizedSchedule(userId: string): Promise<{
    daily: number;
    weekly: number;
    monthlyGoal: number;
    optimalTimes: string[];
  }> {
    const pattern = await this.analyzeReviewPattern(userId);
    const userActivity = await this.getUserActivityPattern(userId);
    
    // 개인별 최적 복습 횟수 계산
    const dailyTarget = this.calculateOptimalDailyReviews(pattern, userActivity);
    
    return {
      daily: dailyTarget,
      weekly: dailyTarget * 7,
      monthlyGoal: dailyTarget * 30,
      optimalTimes: userActivity.peakHours || ['09:00', '19:00'] // 기본값
    };
  }
  
  // Private helper methods
  private async getScheduledReviews(userId: string, date: Date): Promise<string[]> {
    // Firestore에서 오늘 복습 예정인 문장들 조회
    // 실제 구현에서는 Firestore 쿼리 사용
    return [];
  }
  
  private async getWeakSentences(userId: string, count: number): Promise<string[]> {
    // 기억 강도가 낮은 문장들 조회
    return [];
  }
  
  private async getNewSentences(userId: string, count: number): Promise<string[]> {
    // 아직 복습하지 않은 새로운 문장들 조회
    return [];
  }
  
  private async getRecentSessions(userId: string, days: number): Promise<ReviewSession[]> {
    // 최근 복습 세션들 조회
    return [];
  }
  
  private async calculateRetentionRate(userId: string): Promise<number> {
    // 7일 후 복습 성공률 계산
    return 0.7; // 임시값
  }
  
  private determineMasteryLevel(accuracy: number, retention: number, totalReviews: number): 'beginner' | 'intermediate' | 'advanced' | 'mastered' {
    if (totalReviews < 50) return 'beginner';
    if (accuracy > 0.9 && retention > 0.85) return 'mastered';
    if (accuracy > 0.75 && retention > 0.7) return 'advanced';
    if (accuracy > 0.6 && retention > 0.6) return 'intermediate';
    return 'beginner';
  }
  
  private async getUserActivityPattern(userId: string): Promise<{
    peakHours: string[];
    preferredDuration: number;
    consistency: number;
  }> {
    // 사용자 활동 패턴 분석
    return {
      peakHours: ['09:00', '19:00'],
      preferredDuration: 20, // 분
      consistency: 0.7
    };
  }
  
  private calculateOptimalDailyReviews(pattern: ReviewMetrics, activity: any): number {
    // 개인별 최적 일일 복습 횟수 계산
    const baseTarget = 30;
    
    if (pattern.masteryLevel === 'beginner') return Math.max(15, baseTarget * 0.5);
    if (pattern.masteryLevel === 'intermediate') return baseTarget;
    if (pattern.masteryLevel === 'advanced') return baseTarget * 1.5;
    if (pattern.masteryLevel === 'mastered') return baseTarget * 0.7; // 유지 모드
    
    return baseTarget;
  }
}

export const reviewAlgorithmService = new ReviewAlgorithmService();