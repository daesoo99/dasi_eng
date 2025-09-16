/**
 * 통계 계산 서비스 구현체
 * @description 단일 책임 원칙 - 통계 계산만을 담당
 */

import {
  IStatisticsCalculator,
  UserProgressData,
  StatisticsMetrics,
  LevelProgressData,
  SessionRecord,
  StatisticsError
} from './types';

export class StatisticsCalculator implements IStatisticsCalculator {
  private readonly TOTAL_LEVELS = 10;
  private readonly LEVEL_STAGE_COUNTS: Record<number, number> = {
    1: 19, 2: 30, 3: 44, 4: 32, 5: 30,
    6: 44, 7: 42, 8: 50, 9: 48, 10: 50
  };

  /**
   * 전체 통계 메트릭 계산
   */
  calculateOverallMetrics(userData: UserProgressData): StatisticsMetrics {
    try {
      const overallProgress = this.calculateOverallProgress(userData);
      const averageAccuracy = this.calculateAverageAccuracy(userData.sessionHistory);
      const incorrectCount = this.calculateIncorrectCount(userData.sessionHistory);
      const streakDays = this.calculateStreakDays(userData.sessionHistory);
      const totalStudyTime = this.calculateTotalStudyTime(userData.sessionHistory);
      const weakAreas = this.identifyWeakAreas(userData.sessionHistory);

      return {
        overallProgress,
        averageAccuracy,
        incorrectCount,
        currentLevel: userData.level,
        streakDays,
        totalStudyTime,
        weakAreas
      };
    } catch (_error) {
      throw new StatisticsError(
        'Failed to calculate overall metrics',
        'CALCULATION_ERROR',
        userData.userId
      );
    }
  }

  /**
   * 레벨별 진행률 계산
   */
  calculateLevelProgress(userData: UserProgressData, level: number): LevelProgressData {
    if (level < 1 || level > this.TOTAL_LEVELS) {
      throw new StatisticsError(
        `Invalid level: ${level}`,
        'INVALID_INPUT',
        userData.userId
      );
    }

    const totalStages = this.LEVEL_STAGE_COUNTS[level] || 0;
    const levelSessions = userData.sessionHistory.filter(s => s.level === level);
    const completedStages = new Set(levelSessions.map(s => s.stage)).size;
    const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
    const bestAccuracy = levelSessions.length > 0 
      ? Math.max(...levelSessions.map(s => s.accuracy))
      : 0;

    return {
      level,
      progress,
      bestAccuracy: Math.round(bestAccuracy),
      completedStages,
      totalStages
    };
  }

  /**
   * 정확도 트렌드 계산 (최근 N일)
   */
  calculateAccuracyTrend(sessionHistory: SessionRecord[], days: number): number[] {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const recentSessions = sessionHistory.filter(session => 
      new Date(session.completedAt) >= cutoffDate
    );

    if (recentSessions.length === 0) return [];

    // 날짜별로 그룹화하고 평균 계산
    const dailyAccuracy: Record<string, number[]> = {};
    recentSessions.forEach(session => {
      const dateKey = new Date(session.completedAt).toDateString();
      if (!dailyAccuracy[dateKey]) dailyAccuracy[dateKey] = [];
      dailyAccuracy[dateKey].push(session.accuracy);
    });

    return Object.values(dailyAccuracy).map(accuracyList =>
      Math.round(accuracyList.reduce((sum, acc) => sum + acc, 0) / accuracyList.length)
    );
  }

  /**
   * 약점 영역 식별
   */
  identifyWeakAreas(sessionHistory: SessionRecord[]): string[] {
    if (sessionHistory.length === 0) return [];

    const levelAccuracy: Record<number, number[]> = {};
    sessionHistory.forEach(session => {
      if (!levelAccuracy[session.level]) levelAccuracy[session.level] = [];
      levelAccuracy[session.level].push(session.accuracy);
    });

    const weakLevels: string[] = [];
    Object.entries(levelAccuracy).forEach(([level, accuracyList]) => {
      const avgAccuracy = accuracyList.reduce((sum, acc) => sum + acc, 0) / accuracyList.length;
      if (avgAccuracy < 70) { // 70% 미만을 약점으로 판단
        weakLevels.push(`Level ${level}`);
      }
    });

    return weakLevels;
  }

  /**
   * 전체 진행률 계산 (Private)
   */
  private calculateOverallProgress(userData: UserProgressData): number {
    const totalPossibleStages = Object.values(this.LEVEL_STAGE_COUNTS)
      .reduce((sum, count) => sum + count, 0);
    
    const completedStages = new Set(
      userData.sessionHistory.map(session => `${session.level}-${session.stage}`)
    ).size;

    return totalPossibleStages > 0 
      ? Math.round((completedStages / totalPossibleStages) * 100) 
      : 0;
  }

  /**
   * 평균 정확도 계산 (Private)
   */
  private calculateAverageAccuracy(sessionHistory: SessionRecord[]): number {
    if (sessionHistory.length === 0) return 0;
    
    const totalAccuracy = sessionHistory.reduce((sum, session) => sum + session.accuracy, 0);
    return Math.round(totalAccuracy / sessionHistory.length);
  }

  /**
   * 틀린 문제 수 계산 (Private)
   */
  private calculateIncorrectCount(sessionHistory: SessionRecord[]): number {
    return sessionHistory.reduce((total, session) => 
      total + (session.totalCards - session.correctAnswers), 0
    );
  }

  /**
   * 연속 학습 일수 계산 (Private)
   */
  private calculateStreakDays(sessionHistory: SessionRecord[]): number {
    if (sessionHistory.length === 0) return 0;

    const sortedSessions = sessionHistory
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const uniqueDates = [...new Set(
      sortedSessions.map(session => new Date(session.completedAt).toDateString())
    )];

    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = new Date(uniqueDates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (date.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 총 학습 시간 계산 (Private)
   */
  private calculateTotalStudyTime(sessionHistory: SessionRecord[]): number {
    return Math.round(
      sessionHistory.reduce((total, session) => total + session.timeSpent, 0) / 60
    ); // 초를 분으로 변환
  }
}