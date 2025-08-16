// 진도 관리 시스템 - 스테이지별 완료율과 오답 기록 관리

interface UserProgress {
  userId: string;
  level: number;
  stage: number;
  stageId: string;
  completionRate: number; // 0-1
  totalSentences: number;
  correctAnswers: number;
  incorrectAnswers: number;
  lastStudied: Date;
  timeSpent: number; // 총 학습 시간 (분)
  averageAccuracy: number;
  studySessions: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
}

interface IncorrectAnswer {
  userId: string;
  sentenceId: string;
  level: number;
  stage: number;
  stageId: string;
  incorrectCount: number;
  lastIncorrectDate: Date;
  mistakes: Array<{
    userAnswer: string;
    correctAnswer: string;
    timestamp: Date;
    mistakeType: 'grammar' | 'vocabulary' | 'spelling' | 'structure';
  }>;
  weight: number; // 오답 가중치 (최근 3일 기준)
}

interface LevelProgress {
  level: number;
  totalStages: number;
  completedStages: number;
  averageCompletionRate: number;
  totalTimeSpent: number;
  overallAccuracy: number;
  weakStages: string[]; // 완료율이 낮은 스테이지들
  strongStages: string[]; // 완료율이 높은 스테이지들
}

class ProgressManagementService {
  
  /**
   * 사용자의 스테이지 진도 업데이트
   */
  async updateStageProgress(
    userId: string, 
    stageId: string, 
    sessionResult: {
      correct: number;
      total: number;
      timeSpent: number;
      incorrectSentences: string[];
    }
  ): Promise<UserProgress> {
    
    try {
      // 기존 진도 조회
      const existingProgress = await this.getStageProgress(userId, stageId);
      
      // 새로운 완료율 계산 (누적)
      const newCorrect = existingProgress.correctAnswers + sessionResult.correct;
      const newTotal = existingProgress.totalSentences + sessionResult.total;
      const newCompletionRate = newTotal > 0 ? newCorrect / newTotal : 0;
      
      // 평균 정확도 계산 (이동 평균)
      const sessionAccuracy = sessionResult.total > 0 ? sessionResult.correct / sessionResult.total : 0;
      const newAverageAccuracy = existingProgress.studySessions > 0 
        ? (existingProgress.averageAccuracy * existingProgress.studySessions + sessionAccuracy) / (existingProgress.studySessions + 1)
        : sessionAccuracy;
      
      // 상태 결정
      const status = this.determineStageStatus(newCompletionRate, newAverageAccuracy, existingProgress.studySessions + 1);
      
      const updatedProgress: UserProgress = {
        ...existingProgress,
        completionRate: newCompletionRate,
        totalSentences: newTotal,
        correctAnswers: newCorrect,
        incorrectAnswers: existingProgress.incorrectAnswers + (sessionResult.total - sessionResult.correct),
        lastStudied: new Date(),
        timeSpent: existingProgress.timeSpent + sessionResult.timeSpent,
        averageAccuracy: newAverageAccuracy,
        studySessions: existingProgress.studySessions + 1,
        status
      };
      
      // 오답 기록 업데이트
      if (sessionResult.incorrectSentences.length > 0) {
        await this.updateIncorrectAnswers(userId, stageId, sessionResult.incorrectSentences);
      }
      
      // Firestore에 저장 (실제 구현에서)
      await this.saveProgressToFirestore(updatedProgress);
      
      return updatedProgress;
      
    } catch (error) {
      console.error('스테이지 진도 업데이트 실패:', error);
      throw error;
    }
  }
  
  /**
   * 스테이지 상태 결정
   */
  private determineStageStatus(
    completionRate: number, 
    averageAccuracy: number, 
    sessions: number
  ): 'not_started' | 'in_progress' | 'completed' | 'mastered' {
    
    if (sessions === 0) return 'not_started';
    
    if (averageAccuracy >= 0.9 && completionRate >= 0.8 && sessions >= 3) {
      return 'mastered';
    } else if (averageAccuracy >= 0.7 && completionRate >= 0.6) {
      return 'completed';
    } else {
      return 'in_progress';
    }
  }
  
  /**
   * 오답 기록 업데이트
   */
  async updateIncorrectAnswers(
    userId: string, 
    stageId: string, 
    incorrectSentenceIds: string[]
  ): Promise<void> {
    
    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      for (const sentenceId of incorrectSentenceIds) {
        // 기존 오답 기록 조회
        const existingRecord = await this.getIncorrectAnswer(userId, sentenceId);
        
        // 최근 3일 가중치 계산
        const recentMistakes = existingRecord.mistakes.filter(m => m.timestamp >= threeDaysAgo);
        const weight = this.calculateIncorrectWeight(recentMistakes.length, now);
        
        const updatedRecord: IncorrectAnswer = {
          ...existingRecord,
          incorrectCount: existingRecord.incorrectCount + 1,
          lastIncorrectDate: now,
          mistakes: [
            ...existingRecord.mistakes,
            {
              userAnswer: '', // 실제로는 세션에서 받아온 사용자 답변
              correctAnswer: '', // 실제로는 정답
              timestamp: now,
              mistakeType: 'grammar' // 실제로는 분석된 실수 유형
            }
          ].slice(-10), // 최근 10개만 유지
          weight
        };
        
        await this.saveIncorrectAnswerToFirestore(updatedRecord);
      }
      
    } catch (error) {
      console.error('오답 기록 업데이트 실패:', error);
      throw error;
    }
  }
  
  /**
   * 오답 가중치 계산 (최근 3일 기준)
   */
  private calculateIncorrectWeight(recentMistakeCount: number, currentDate: Date): number {
    // 기본 가중치: 1.0
    // 최근 3일 내 실수가 많을수록 가중치 증가
    const baseWeight = 1.0;
    const additionalWeight = recentMistakeCount * 0.5;
    
    // 시간에 따른 감소 (하루당 10% 감소)
    const daysSinceLastMistake = 0; // 현재는 0 (방금 실수)
    const timeDecay = Math.pow(0.9, daysSinceLastMistake);
    
    return Math.min(5.0, (baseWeight + additionalWeight) * timeDecay);
  }
  
  /**
   * 레벨별 전체 진도 조회
   */
  async getLevelProgress(userId: string, level: number): Promise<LevelProgress> {
    try {
      // 해당 레벨의 모든 스테이지 진도 조회
      const stageProgresses = await this.getAllStageProgresses(userId, level);
      
      const totalStages = stageProgresses.length;
      const completedStages = stageProgresses.filter(p => p.status === 'completed' || p.status === 'mastered').length;
      
      const averageCompletionRate = totalStages > 0 
        ? stageProgresses.reduce((sum, p) => sum + p.completionRate, 0) / totalStages 
        : 0;
      
      const totalTimeSpent = stageProgresses.reduce((sum, p) => sum + p.timeSpent, 0);
      
      const overallAccuracy = totalStages > 0 
        ? stageProgresses.reduce((sum, p) => sum + p.averageAccuracy, 0) / totalStages 
        : 0;
      
      // 취약/강점 스테이지 식별
      const weakStages = stageProgresses
        .filter(p => p.averageAccuracy < 0.7 || p.completionRate < 0.6)
        .map(p => p.stageId)
        .slice(0, 5);
      
      const strongStages = stageProgresses
        .filter(p => p.averageAccuracy >= 0.9 && p.completionRate >= 0.8)
        .map(p => p.stageId)
        .slice(0, 5);
      
      return {
        level,
        totalStages,
        completedStages,
        averageCompletionRate,
        totalTimeSpent,
        overallAccuracy,
        weakStages,
        strongStages
      };
      
    } catch (error) {
      console.error('레벨 진도 조회 실패:', error);
      throw error;
    }
  }
  
  /**
   * 오답 우선 문장 조회 (최근 3일 가중치 기준)
   */
  async getIncorrectPrioritySentences(userId: string, maxCount: number = 20): Promise<string[]> {
    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      // 최근 3일 내 오답 기록 조회
      const incorrectAnswers = await this.getRecentIncorrectAnswers(userId, threeDaysAgo);
      
      // 가중치 기준으로 정렬
      const sortedIncorrectAnswers = incorrectAnswers
        .filter(ia => ia.weight > 1.0) // 가중치가 있는 것만
        .sort((a, b) => b.weight - a.weight) // 가중치 높은 순
        .slice(0, maxCount);
      
      return sortedIncorrectAnswers.map(ia => ia.sentenceId);
      
    } catch (error) {
      console.error('오답 우선 문장 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 전체 학습 진도 요약
   */
  async getOverallProgress(userId: string): Promise<{
    totalLevels: number;
    completedLevels: number;
    currentLevel: number;
    totalTimeSpent: number;
    overallAccuracy: number;
    totalSentencesStudied: number;
    achievementBadges: string[];
  }> {
    
    try {
      const levels = [1, 2, 3, 4, 5, 6]; // 사용 가능한 레벨들
      const levelProgresses = await Promise.all(
        levels.map(level => this.getLevelProgress(userId, level))
      );
      
      const completedLevels = levelProgresses.filter(lp => 
        lp.completedStages / lp.totalStages >= 0.8 && lp.overallAccuracy >= 0.7
      ).length;
      
      const currentLevel = this.getCurrentLevel(levelProgresses);
      
      const totalTimeSpent = levelProgresses.reduce((sum, lp) => sum + lp.totalTimeSpent, 0);
      const overallAccuracy = levelProgresses.reduce((sum, lp) => sum + lp.overallAccuracy, 0) / levels.length;
      
      const totalSentencesStudied = await this.getTotalSentencesStudied(userId);
      
      const achievementBadges = this.calculateAchievementBadges(levelProgresses, totalTimeSpent, totalSentencesStudied);
      
      return {
        totalLevels: levels.length,
        completedLevels,
        currentLevel,
        totalTimeSpent,
        overallAccuracy,
        totalSentencesStudied,
        achievementBadges
      };
      
    } catch (error) {
      console.error('전체 진도 요약 조회 실패:', error);
      throw error;
    }
  }
  
  /**
   * 성취 배지 계산
   */
  private calculateAchievementBadges(
    levelProgresses: LevelProgress[], 
    totalTimeSpent: number, 
    totalSentences: number
  ): string[] {
    
    const badges: string[] = [];
    
    // 시간 기반 배지
    if (totalTimeSpent >= 1000) badges.push('🕐 천 시간 학습자');
    else if (totalTimeSpent >= 500) badges.push('⏰ 오백 시간 달성');
    else if (totalTimeSpent >= 100) badges.push('⏱️ 백 시간 학습');
    
    // 문장 수 기반 배지
    if (totalSentences >= 5000) badges.push('📚 문장 마스터');
    else if (totalSentences >= 2000) badges.push('📖 문장 박사');
    else if (totalSentences >= 1000) badges.push('📝 천 문장 달성');
    
    // 정확도 기반 배지
    const highAccuracyLevels = levelProgresses.filter(lp => lp.overallAccuracy >= 0.9).length;
    if (highAccuracyLevels >= 3) badges.push('🎯 정확도 마스터');
    else if (highAccuracyLevels >= 1) badges.push('✨ 정확도 달인');
    
    // 완료도 기반 배지
    const completedLevels = levelProgresses.filter(lp => lp.averageCompletionRate >= 0.8).length;
    if (completedLevels >= 4) badges.push('🏆 레벨 정복자');
    else if (completedLevels >= 2) badges.push('🥇 성실한 학습자');
    
    return badges;
  }
  
  // Private helper methods
  private async getStageProgress(userId: string, stageId: string): Promise<UserProgress> {
    // Firestore에서 스테이지 진도 조회 (기본값 반환)
    return {
      userId,
      level: 1,
      stage: 1,
      stageId,
      completionRate: 0,
      totalSentences: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      lastStudied: new Date(),
      timeSpent: 0,
      averageAccuracy: 0,
      studySessions: 0,
      status: 'not_started'
    };
  }
  
  private async getIncorrectAnswer(userId: string, sentenceId: string): Promise<IncorrectAnswer> {
    // 기본값 반환
    return {
      userId,
      sentenceId,
      level: 1,
      stage: 1,
      stageId: '',
      incorrectCount: 0,
      lastIncorrectDate: new Date(),
      mistakes: [],
      weight: 1.0
    };
  }
  
  private async saveProgressToFirestore(progress: UserProgress): Promise<void> {
    // Firestore 저장 로직
  }
  
  private async saveIncorrectAnswerToFirestore(incorrectAnswer: IncorrectAnswer): Promise<void> {
    // Firestore 저장 로직
  }
  
  private async getAllStageProgresses(userId: string, level: number): Promise<UserProgress[]> {
    // 해당 레벨의 모든 스테이지 진도 조회
    return [];
  }
  
  private async getRecentIncorrectAnswers(userId: string, since: Date): Promise<IncorrectAnswer[]> {
    // 최근 오답 기록 조회
    return [];
  }
  
  private getCurrentLevel(levelProgresses: LevelProgress[]): number {
    // 현재 진행 중인 레벨 계산
    for (let i = 0; i < levelProgresses.length; i++) {
      const lp = levelProgresses[i];
      if (lp.averageCompletionRate < 0.8 || lp.overallAccuracy < 0.7) {
        return lp.level;
      }
    }
    return levelProgresses.length; // 모든 레벨 완료
  }
  
  private async getTotalSentencesStudied(userId: string): Promise<number> {
    // 총 학습한 문장 수 계산
    return 0;
  }
}

export const progressManagementService = new ProgressManagementService();