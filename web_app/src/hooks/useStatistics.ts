/**
 * 통계 데이터 관리 Hook
 * @description Presentation Layer에서 Business Logic 분리
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { statisticsService } from '@/services/statistics/StatisticsServiceFactory';
import { StatisticsMetrics, LevelProgressData, StatisticsError } from '@/services/statistics/types';

interface UseStatisticsOptions {
  userId: string | null;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

interface UseStatisticsReturn {
  // 데이터
  metrics: StatisticsMetrics | null;
  levelProgress: Record<number, LevelProgressData>;
  accuracyTrend: number[];
  
  // 상태
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  
  // 액션
  refresh: () => Promise<void>;
  refreshLevel: (level: number) => Promise<void>;
  updateSession: (sessionData: any) => Promise<void>;
  
  // 계산된 값들 (memoized)
  formattedMetrics: {
    overallProgressText: string;
    averageAccuracyText: string;
    incorrectCountText: string;
    currentLevelText: string;
    streakDaysText: string;
  } | null;
}

export const useStatistics = ({
  userId,
  enabled = true,
  refreshInterval
}: UseStatisticsOptions): UseStatisticsReturn => {
  // 상태
  const [metrics, setMetrics] = useState<StatisticsMetrics | null>(null);
  const [levelProgress, setLevelProgress] = useState<Record<number, LevelProgressData>>({});
  const [accuracyTrend, setAccuracyTrend] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 전체 통계 데이터 로드
   */
  const loadStatistics = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      setError(null);
      const newMetrics = await statisticsService.getUserStatistics(userId);
      setMetrics(newMetrics);
    } catch (err) {
      const errorMessage = err instanceof StatisticsError 
        ? err.message 
        : 'Failed to load statistics';
      setError(errorMessage);
      console.error('Statistics loading error:', err);
    }
  }, [userId, enabled]);

  /**
   * 레벨 진행률 데이터 로드
   */
  const loadLevelProgress = useCallback(async (level: number) => {
    if (!userId || !enabled) return;

    try {
      const progressData = await statisticsService.getLevelProgress(userId, level);
      setLevelProgress(prev => ({
        ...prev,
        [level]: progressData
      }));
    } catch (err) {
      console.error(`Failed to load progress for level ${level}:`, err);
    }
  }, [userId, enabled]);

  /**
   * 정확도 트렌드 로드
   */
  const loadAccuracyTrend = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const trendData = await statisticsService.getAccuracyTrend(userId, 7);
      setAccuracyTrend(trendData);
    } catch (err) {
      console.error('Failed to load accuracy trend:', err);
    }
  }, [userId, enabled]);

  /**
   * 모든 레벨 진행률 로드
   */
  const loadAllLevelProgress = useCallback(async () => {
    if (!userId || !enabled) return;

    const levelPromises = Array.from({ length: 10 }, (_, i) => 
      loadLevelProgress(i + 1)
    );
    await Promise.all(levelPromises);
  }, [loadLevelProgress, userId, enabled]);

  /**
   * 전체 데이터 새로고침
   */
  const refresh = useCallback(async () => {
    if (!userId || !enabled) return;

    setIsRefreshing(true);
    setIsLoading(true);

    try {
      await Promise.all([
        loadStatistics(),
        loadAllLevelProgress(),
        loadAccuracyTrend()
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadStatistics, loadAllLevelProgress, loadAccuracyTrend, userId, enabled]);

  /**
   * 특정 레벨만 새로고침
   */
  const refreshLevel = useCallback(async (level: number) => {
    if (!userId || !enabled) return;
    await loadLevelProgress(level);
  }, [loadLevelProgress, userId, enabled]);

  /**
   * 새 세션 데이터 업데이트
   */
  const updateSession = useCallback(async (sessionData: any) => {
    if (!userId || !enabled) return;

    try {
      await statisticsService.updateSessionData(userId, sessionData);
      // 업데이트 후 통계 새로고침
      await loadStatistics();
      if (sessionData.level) {
        await loadLevelProgress(sessionData.level);
      }
    } catch (err) {
      console.error('Failed to update session data:', err);
      throw err; // 상위 컴포넌트에서 처리하도록
    }
  }, [userId, enabled, loadStatistics, loadLevelProgress]);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    if (userId && enabled) {
      setIsLoading(true);
      refresh();
    }
  }, [userId, enabled, refresh]);

  /**
   * 자동 새로고침 설정
   */
  useEffect(() => {
    if (!refreshInterval || !userId || !enabled) return;

    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval, userId, enabled]);

  /**
   * 포맷된 메트릭 데이터 (Memoized)
   */
  const formattedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      overallProgressText: `${metrics.overallProgress}%`,
      averageAccuracyText: `${metrics.averageAccuracy}%`,
      incorrectCountText: metrics.incorrectCount.toString(),
      currentLevelText: metrics.currentLevel.toString(),
      streakDaysText: `${metrics.streakDays}일`
    };
  }, [metrics]);

  return {
    // 데이터
    metrics,
    levelProgress,
    accuracyTrend,
    
    // 상태
    isLoading,
    error,
    isRefreshing,
    
    // 액션
    refresh,
    refreshLevel,
    updateSession,
    
    // 계산된 값
    formattedMetrics
  };
};