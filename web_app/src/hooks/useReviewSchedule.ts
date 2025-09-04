/**
 * Review Schedule Management Hook
 * 
 * 기능:
 * - 개인화된 복습 스케줄 관리
 * - 일일/주간/월간 복습 목표 설정
 * - 복습 세션 자동 생성
 * - 학습 패턴 분석 및 적응
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSRSEngine } from './useSRSEngine';
import { ReviewCard } from '@/services/srs/SRSEngine';
import { ForgettingCurve, MemoryState, PredictionResult } from '@/services/srs/algorithms/ForgettingCurve';

export interface ReviewScheduleConfig {
  userId: string;
  dailyTarget: number;           // 일일 목표 복습 횟수
  weeklyTarget: number;          // 주간 목표 복습 횟수
  maxSessionLength: number;      // 최대 세션 길이 (분)
  optimalTimes: string[];        // 최적 복습 시간대 (HH:MM 형식)
  difficultyBalance: {
    easy: number;                // 쉬운 카드 비율 (0-1)
    medium: number;              // 보통 카드 비율 (0-1)
    hard: number;                // 어려운 카드 비율 (0-1)
  };
}

export interface ReviewSession {
  id: string;
  cards: ReviewCard[];
  scheduledTime: Date;
  estimatedDuration: number;     // 예상 소요 시간 (분)
  difficultyMix: {
    easy: number;
    medium: number;
    hard: number;
  };
  priority: 'high' | 'medium' | 'low';
}

export interface LearningStats {
  todayReviewed: number;
  todayTarget: number;
  weeklyProgress: number;
  monthlyProgress: number;
  averageAccuracy: number;
  averageSessionTime: number;
  streak: number;                // 연속 목표 달성 일수
  totalReviewTime: number;       // 총 복습 시간 (분)
  predictedNextSession: Date;    // 다음 세션 예상 시간
}

export interface UseReviewScheduleReturn {
  // 스케줄 관리
  schedule: ReviewSession[];
  todaysSessions: ReviewSession[];
  upcomingSessions: ReviewSession[];
  generateTodaysSchedule: () => void;
  generateWeeklySchedule: () => void;
  
  // 세션 관리
  startSession: (sessionId: string) => ReviewCard[];
  completeSession: (sessionId: string, results: Array<{ cardId: string; isCorrect: boolean; responseTime: number }>) => void;
  skipSession: (sessionId: string, reason: string) => void;
  
  // 설정 관리
  config: ReviewScheduleConfig;
  updateConfig: (newConfig: Partial<ReviewScheduleConfig>) => void;
  
  // 통계 및 분석
  stats: LearningStats;
  getPrediction: (cardId: string) => PredictionResult | null;
  getOptimalReviewTime: (cardId: string) => Date | null;
  
  // 적응형 기능
  adjustDifficulty: () => void;
  suggestOptimalTimes: () => string[];
  analyzeWeakPatterns: () => { pattern: string; weakness: number }[];
}

const DEFAULT_CONFIG: ReviewScheduleConfig = {
  userId: '',
  dailyTarget: 30,
  weeklyTarget: 200,
  maxSessionLength: 20,
  optimalTimes: ['09:00', '19:00'],
  difficultyBalance: {
    easy: 0.2,
    medium: 0.6,
    hard: 0.2
  }
};

export const useReviewSchedule = (
  initialConfig: Partial<ReviewScheduleConfig>
): UseReviewScheduleReturn => {
  
  // 설정 상태
  const [config, setConfig] = useState<ReviewScheduleConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  
  // 스케줄 상태
  const [schedule, setSchedule] = useState<ReviewSession[]>([]);
  
  // 학습 통계 상태
  const [learningStats, setLearningStats] = useState<LearningStats>({
    todayReviewed: 0,
    todayTarget: config.dailyTarget,
    weeklyProgress: 0,
    monthlyProgress: 0,
    averageAccuracy: 0,
    averageSessionTime: 0,
    streak: 0,
    totalReviewTime: 0,
    predictedNextSession: new Date()
  });
  
  // SRS 엔진 훅
  const srsEngine = useSRSEngine({ userId: config.userId });
  
  // 망각곡선 엔진
  const forgettingCurve = useMemo(() => new ForgettingCurve(), []);

  // 오늘의 세션들
  const todaysSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return schedule.filter(session => 
      session.scheduledTime >= today && session.scheduledTime < tomorrow
    );
  }, [schedule]);

  // 다가오는 세션들 (오늘 제외)
  const upcomingSessions = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return schedule.filter(session => session.scheduledTime > today);
  }, [schedule]);

  // 오늘의 복습 스케줄 생성
  const generateTodaysSchedule = useCallback(() => {
    const dueCards = srsEngine.getDueCards();
    const todayTarget = Math.min(config.dailyTarget, dueCards.length);
    
    if (todayTarget === 0) {
      console.log('오늘 복습할 카드가 없습니다.');
      return;
    }

    // 카드를 난이도별로 분류
    const cardsByDifficulty = {
      easy: dueCards.filter(card => card.memory.difficulty < 0.3),
      medium: dueCards.filter(card => card.memory.difficulty >= 0.3 && card.memory.difficulty < 0.7),
      hard: dueCards.filter(card => card.memory.difficulty >= 0.7)
    };

    // 난이도 균형에 따라 카드 선택
    const selectedCards: ReviewCard[] = [];
    const easyCount = Math.floor(todayTarget * config.difficultyBalance.easy);
    const mediumCount = Math.floor(todayTarget * config.difficultyBalance.medium);
    const hardCount = todayTarget - easyCount - mediumCount;

    selectedCards.push(...cardsByDifficulty.easy.slice(0, easyCount));
    selectedCards.push(...cardsByDifficulty.medium.slice(0, mediumCount));
    selectedCards.push(...cardsByDifficulty.hard.slice(0, hardCount));

    // 부족한 카드는 나머지에서 보충
    if (selectedCards.length < todayTarget) {
      const remaining = dueCards.filter(card => !selectedCards.includes(card));
      selectedCards.push(...remaining.slice(0, todayTarget - selectedCards.length));
    }

    // 세션들로 분할 (최대 세션 길이 고려)
    const cardsPerSession = Math.ceil(selectedCards.length / config.optimalTimes.length);
    const sessions: ReviewSession[] = [];

    config.optimalTimes.forEach((time, index) => {
      const sessionCards = selectedCards.slice(
        index * cardsPerSession,
        (index + 1) * cardsPerSession
      );

      if (sessionCards.length === 0) return;

      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // 오늘 시간이 지났으면 내일로 설정
      if (scheduledTime < new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      sessions.push({
        id: `session-${Date.now()}-${index}`,
        cards: sessionCards,
        scheduledTime,
        estimatedDuration: sessionCards.length * 2, // 카드당 2분 추정
        difficultyMix: {
          easy: sessionCards.filter(c => c.memory.difficulty < 0.3).length,
          medium: sessionCards.filter(c => c.memory.difficulty >= 0.3 && c.memory.difficulty < 0.7).length,
          hard: sessionCards.filter(c => c.memory.difficulty >= 0.7).length
        },
        priority: index === 0 ? 'high' : 'medium'
      });
    });

    setSchedule(prevSchedule => {
      // 오늘의 기존 세션들 제거하고 새 세션들 추가
      const otherSessions = prevSchedule.filter(session => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return !(session.scheduledTime >= today && session.scheduledTime < tomorrow);
      });
      
      return [...otherSessions, ...sessions];
    });

    console.log(`오늘의 복습 스케줄 생성됨: ${sessions.length}개 세션, ${selectedCards.length}개 카드`);
  }, [srsEngine, config]);

  // 주간 복습 스케줄 생성
  const generateWeeklySchedule = useCallback(() => {
    // 향후 7일간의 복습 스케줄 생성
    const sessions: ReviewSession[] = [];
    
    for (let day = 0; day < 7; day++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + day);
      
      // 해당 날짜에 복습 예정인 카드들 찾기
      const cardsForDay = srsEngine.cards.filter(card => {
        const reviewDate = new Date(card.memory.nextReview);
        reviewDate.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        return reviewDate.getTime() === targetDate.getTime();
      });

      if (cardsForDay.length === 0) continue;

      // 해당 날짜의 최적 시간대에 세션 생성
      config.optimalTimes.forEach((time, timeIndex) => {
        const [hours, minutes] = time.split(':').map(Number);
        const sessionTime = new Date(targetDate);
        sessionTime.setHours(hours, minutes, 0, 0);

        const sessionCards = cardsForDay.slice(
          timeIndex * Math.ceil(cardsForDay.length / config.optimalTimes.length),
          (timeIndex + 1) * Math.ceil(cardsForDay.length / config.optimalTimes.length)
        );

        if (sessionCards.length > 0) {
          sessions.push({
            id: `weekly-${targetDate.getDate()}-${timeIndex}`,
            cards: sessionCards,
            scheduledTime: sessionTime,
            estimatedDuration: sessionCards.length * 2,
            difficultyMix: {
              easy: sessionCards.filter(c => c.memory.difficulty < 0.3).length,
              medium: sessionCards.filter(c => c.memory.difficulty >= 0.3 && c.memory.difficulty < 0.7).length,
              hard: sessionCards.filter(c => c.memory.difficulty >= 0.7).length
            },
            priority: day <= 1 ? 'high' : 'medium'
          });
        }
      });
    }

    setSchedule(sessions);
    console.log(`주간 복습 스케줄 생성됨: ${sessions.length}개 세션`);
  }, [srsEngine.cards, config]);

  // 세션 시작
  const startSession = useCallback((sessionId: string): ReviewCard[] => {
    const session = schedule.find(s => s.id === sessionId);
    if (!session) {
      console.warn('세션을 찾을 수 없습니다:', sessionId);
      return [];
    }

    console.log(`세션 시작: ${session.cards.length}개 카드`);
    return [...session.cards]; // 배열 복사해서 반환
  }, [schedule]);

  // 세션 완료
  const completeSession = useCallback((
    sessionId: string, 
    results: Array<{ cardId: string; isCorrect: boolean; responseTime: number }>
  ) => {
    const session = schedule.find(s => s.id === sessionId);
    if (!session) return;

    // 각 카드 결과 처리
    results.forEach(result => {
      const reviewSession = {
        cardId: result.cardId,
        userAnswer: '', // 실제 구현에서는 사용자 답변 기록
        correctAnswer: '', // 실제 구현에서는 정답 기록
        isCorrect: result.isCorrect,
        responseTime: result.responseTime,
        difficulty: result.responseTime > 10000 ? 'hard' as const : 
                   result.responseTime > 5000 ? 'medium' as const : 'easy' as const,
        confidence: result.isCorrect ? 0.8 : 0.2
      };

      srsEngine.processReviewSession(result.cardId, reviewSession);
    });

    // 세션을 완료됨으로 표시
    setSchedule(prevSchedule => 
      prevSchedule.filter(s => s.id !== sessionId)
    );

    // 통계 업데이트
    setLearningStats(prevStats => ({
      ...prevStats,
      todayReviewed: prevStats.todayReviewed + results.length,
      totalReviewTime: prevStats.totalReviewTime + session.estimatedDuration
    }));

    console.log(`세션 완료: ${results.length}개 카드 복습`);
  }, [schedule, srsEngine]);

  // 세션 건너뛰기
  const skipSession = useCallback((sessionId: string, reason: string) => {
    setSchedule(prevSchedule => 
      prevSchedule.filter(s => s.id !== sessionId)
    );
    console.log(`세션 건너뛰기: ${sessionId}, 이유: ${reason}`);
  }, []);

  // 설정 업데이트
  const updateConfig = useCallback((newConfig: Partial<ReviewScheduleConfig>) => {
    setConfig(prevConfig => ({ ...prevConfig, ...newConfig }));
  }, []);

  // 예측 정보 가져오기
  const getPrediction = useCallback((cardId: string): PredictionResult | null => {
    const card = srsEngine.getCardById(cardId);
    if (!card) return null;

    const memoryState: MemoryState = {
      strength: card.memory.strength,
      stability: card.memory.interval,
      difficulty: card.memory.difficulty,
      lastReviewed: card.memory.lastReviewed,
      reviewCount: card.memory.reviewCount,
      successRate: card.performance.accuracy.length > 0 ? 
        card.performance.accuracy.reduce((a, b) => a + b, 0) / card.performance.accuracy.length : 0.5
    };

    return forgettingCurve.analyzePrediction(memoryState);
  }, [srsEngine, forgettingCurve]);

  // 최적 복습 시간 가져오기
  const getOptimalReviewTime = useCallback((cardId: string): Date | null => {
    const prediction = getPrediction(cardId);
    return prediction ? prediction.optimalReviewTime : null;
  }, [getPrediction]);

  // 적응형 난이도 조정
  const adjustDifficulty = useCallback(() => {
    const stats = srsEngine.stats;
    
    if (stats.avgAccuracy > 0.9) {
      // 너무 쉬움 - 어려운 카드 비율 증가
      updateConfig({
        difficultyBalance: {
          easy: 0.1,
          medium: 0.5,
          hard: 0.4
        }
      });
    } else if (stats.avgAccuracy < 0.6) {
      // 너무 어려움 - 쉬운 카드 비율 증가
      updateConfig({
        difficultyBalance: {
          easy: 0.4,
          medium: 0.5,
          hard: 0.1
        }
      });
    }
  }, [srsEngine.stats, updateConfig]);

  // 최적 시간대 제안
  const suggestOptimalTimes = useCallback((): string[] => {
    // 실제 구현에서는 사용자의 학습 패턴 분석
    // 현재는 일반적으로 효과적인 시간대 반환
    return ['09:00', '14:00', '19:00'];
  }, []);

  // 취약 패턴 분석
  const analyzeWeakPatterns = useCallback(() => {
    const patternStats = new Map<string, { total: number; correct: number }>();
    
    srsEngine.cards.forEach(card => {
      const pattern = card.content.pattern || 'unknown';
      const current = patternStats.get(pattern) || { total: 0, correct: 0 };
      
      current.total += 1;
      const recentAccuracy = card.performance.accuracy.slice(-5);
      const correctCount = recentAccuracy.reduce((sum, acc) => sum + acc, 0);
      current.correct += correctCount;
      
      patternStats.set(pattern, current);
    });

    return Array.from(patternStats.entries())
      .map(([pattern, stats]) => ({
        pattern,
        weakness: stats.total > 0 ? 1 - (stats.correct / stats.total) : 0
      }))
      .filter(item => item.weakness > 0.3)
      .sort((a, b) => b.weakness - a.weakness);
  }, [srsEngine.cards]);

  // 자동 스케줄 생성 (매일 자정)
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      generateTodaysSchedule();
      
      // 이후 매일 반복
      setInterval(generateTodaysSchedule, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [generateTodaysSchedule]);

  return {
    // 스케줄 관리
    schedule,
    todaysSessions,
    upcomingSessions,
    generateTodaysSchedule,
    generateWeeklySchedule,
    
    // 세션 관리
    startSession,
    completeSession,
    skipSession,
    
    // 설정 관리
    config,
    updateConfig,
    
    // 통계 및 분석
    stats: learningStats,
    getPrediction,
    getOptimalReviewTime,
    
    // 적응형 기능
    adjustDifficulty,
    suggestOptimalTimes,
    analyzeWeakPatterns
  };
};

export default useReviewSchedule;