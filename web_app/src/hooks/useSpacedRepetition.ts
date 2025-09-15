import { useCallback, useMemo } from 'react';
import { QuestionItem } from '@/data/patternData';
import { 
  useLocalStorage, 
  STORAGE_KEYS, 
  MistakeItem, 
  UserStats,
  StorageManager 
} from './useLocalStorage';

// 🔄 LEGACY ADAPTER: 새 SRS 시스템으로 점진적 마이그레이션 중
// 2025-01-12: useSRSEngine.ts를 사용하는 것을 권장합니다
import { useSRSEngine } from './useSRSEngine';
import { ReviewCard } from '@/services/srs/SRSEngine';

/**
 * @deprecated 이 훅은 완전히 레거시입니다.
 * ⚠️  더 이상 사용하지 마세요.
 * ✅  대신 useSRSEngine.ts를 사용하세요.
 *
 * 마이그레이션 가이드:
 * 1. import { useSpacedRepetition } → import { useSRSEngine }
 * 2. const { dueReviews } = useSpacedRepetition() → const srs = useSRSEngine({ userId })
 * 3. srs.cards.filter(card => card.isDue) 사용
 *
 * 2025-01-12: 이 파일은 다음 버전에서 제거될 예정입니다.
 */

// 망각곡선 복습 간격 (밀리초)
export const REVIEW_INTERVALS = {
  FIRST: 1 * 24 * 60 * 60 * 1000,    // 1일
  SECOND: 3 * 24 * 60 * 60 * 1000,   // 3일
  THIRD: 7 * 24 * 60 * 60 * 1000,    // 7일
  FOURTH: 14 * 24 * 60 * 60 * 1000   // 14일
};

export interface MistakeData {
  level: number;
  stage: number;
  korean: string;
  english: string;
  pattern: string;
  verb?: string;
  userAnswer: string;
  responseTime: number;
  difficulty: number;
}

export interface UseSpacedRepetitionReturn {
  // Mistakes management
  mistakes: MistakeItem[];
  addMistake: (mistake: MistakeData) => void;
  
  // Review system
  dueReviews: MistakeItem[];
  completedReview: (mistakeId: string, isCorrect: boolean) => void;
  
  // Statistics
  stats: UserStats;
  updateStats: (sessionData: {
    totalQuestions: number;
    correctAnswers: number;
    totalMistakes: number;
    studyTime: number;
  }) => void;
  
  // Review questions generation
  getReviewQuestions: (mode: 'all' | 'pattern' | 'weak-patterns', patternName?: string) => QuestionItem[];
  
  // Utilities
  mistakeCount: number;
  reviewCount: number;
  masteredCount: number;
  clearAllData: () => void;
  debugPrint: () => void;
}

export const useSpacedRepetition = (): UseSpacedRepetitionReturn => {
  
  // 🔄 ADAPTER PATTERN: SSOT SRS 시스템 사용
  const srsEngine = useSRSEngine({ 
    userId: 'legacy-user', 
    storageKey: 'legacy-srs-cards'
  });
  
  // 기존 로컬스토리지 시스템 (점진적 이전 중)
  const { 
    value: mistakes, 
    updateValue: updateMistakes 
  } = useLocalStorage(STORAGE_KEYS.MISTAKES);

  const { 
    value: stats, 
    updateValue: updateStatsValue 
  } = useLocalStorage(STORAGE_KEYS.USER_STATS);

  // Get due reviews (SSOT 시스템 + 레거시 호환)
  const dueReviews = useMemo(() => {
    // 🔄 NEW: SSOT 시스템에서 복습 예정 카드들 가져오기
    const newDueCards = srsEngine.dueCards;
    
    // 🔄 LEGACY: 기존 mistakes 시스템 (점진적 제거 예정)
    const now = Date.now();
    const legacyDueReviews = mistakes.filter(mistake => 
      !mistake.mastered && mistake.nextReview <= now
    );

    // 🔗 ADAPTER: 레거시 형태로 변환하여 반환
    const adaptedNewCards = newDueCards.map(card => ({
      id: card.id,
      korean: card.content.korean,
      english: card.content.english,
      pattern: card.content.pattern || 'unknown',
      level: card.content.level,
      stage: card.content.stage,
      nextReview: card.memory.nextReview.getTime(),
      mastered: card.memory.strength > 0.9, // 높은 기억력 = 마스터
      reviewCount: card.memory.reviewCount,
      mistakeCount: card.performance.mistakes
    } as MistakeItem));

    // 우선: SSOT 시스템, 대체: 레거시 시스템
    return adaptedNewCards.length > 0 ? adaptedNewCards : legacyDueReviews;
  }, [srsEngine.dueCards, mistakes]);

  // Statistics
  const mistakeCount = mistakes.length;
  const reviewCount = mistakes.filter(m => m.reviewCount > 0).length;
  const masteredCount = mistakes.filter(m => m.mastered).length;

  // Add a new mistake (SSOT 어댑터)
  const addMistake = useCallback((mistake: MistakeData) => {
    console.warn('⚠️ [DEPRECATED] useSpacedRepetition.addMistake는 deprecated입니다. useSRSEngine을 사용하세요.');
    
    // 🔄 NEW: SSOT 시스템에 추가
    try {
      const newCard = srsEngine.addCard({
        korean: mistake.korean,
        english: mistake.english,
        level: mistake.level,
        stage: mistake.stage,
        pattern: mistake.pattern
      });
      
      // 틀린 답안을 반영한 리뷰 세션 처리
      srsEngine.processReviewSession(newCard.id, {
        userAnswer: mistake.userAnswer,
        correctAnswer: mistake.english,
        isCorrect: false,
        responseTime: mistake.responseTime,
        difficulty: 'medium',
        confidence: 0.3
      });
      
      console.log(`✅ [NEW SRS] 새 틀린 문제 추가: ${mistake.korean}`);
      
    } catch (error) {
      console.error('NEW SRS 시스템에 추가 실패, 레거시 시스템 사용:', error);
      
      // 🔄 FALLBACK: 레거시 시스템에 추가
      updateMistakes(prevMistakes => {
        const now = Date.now();
        const newMistakes = [...prevMistakes];
        
        const existingIndex = newMistakes.findIndex(m => 
          m.korean === mistake.korean && 
          m.english === mistake.english &&
          m.pattern === mistake.pattern
        );

        if (existingIndex >= 0) {
          // Update existing mistake
          const existing = newMistakes[existingIndex];
          newMistakes[existingIndex] = {
            ...existing,
            mistakeCount: existing.mistakeCount + 1,
            lastMistake: now,
            totalResponseTime: existing.totalResponseTime + mistake.responseTime,
            averageResponseTime: (existing.totalResponseTime + mistake.responseTime) / (existing.mistakeCount + 1),
            nextReview: now + REVIEW_INTERVALS.FIRST,
            reviewStage: 0,
            lastUserAnswer: mistake.userAnswer
          };
          
          console.log(`📦 [LEGACY] 기존 틀린 문제 업데이트: ${mistake.korean}`);
        } else {
          // Add new mistake
          const newMistake: MistakeItem = {
            id: `mistake_${now}_${Math.random().toString(36).substr(2, 9)}`,
            level: mistake.level,
            stage: mistake.stage,
            korean: mistake.korean,
            english: mistake.english,
            pattern: mistake.pattern,
            verb: mistake.verb,
            userAnswer: mistake.userAnswer,
            mistakeCount: 1,
            firstMistake: now,
            lastMistake: now,
            nextReview: now + REVIEW_INTERVALS.FIRST,
            reviewStage: 0,
            reviewCount: 0,
            difficulty: mistake.difficulty,
            totalResponseTime: mistake.responseTime,
            averageResponseTime: mistake.responseTime,
            mastered: false
          };
          
          newMistakes.push(newMistake);
          console.log(`📦 [LEGACY] 새 틀린 문제 추가: ${mistake.korean}`);
        }

        return newMistakes;
      });
    }
  }, [srsEngine, updateMistakes]);

  // Complete a review (mark as correct or incorrect)
  const completedReview = useCallback((mistakeId: string, isCorrect: boolean) => {
    updateMistakes(prevMistakes => {
      const newMistakes = [...prevMistakes];
      const mistakeIndex = newMistakes.findIndex(m => m.id === mistakeId);
      
      if (mistakeIndex >= 0) {
        const mistake = newMistakes[mistakeIndex];
        mistake.reviewCount += 1;
        mistake.lastReview = Date.now();

        if (isCorrect) {
          // Correct answer: move to next review stage
          mistake.reviewStage += 1;
          
          if (mistake.reviewStage >= 4) {
            // All 4 stages completed: mark as mastered
            mistake.mastered = true;
            mistake.masteredDate = Date.now();
            console.log(`마스터 완료: ${mistake.korean}`);
          } else {
            // Set next review time based on current stage
            const intervals = [
              REVIEW_INTERVALS.FIRST,
              REVIEW_INTERVALS.SECOND, 
              REVIEW_INTERVALS.THIRD,
              REVIEW_INTERVALS.FOURTH
            ];
            mistake.nextReview = Date.now() + intervals[mistake.reviewStage];
          }
        } else {
          // Incorrect answer: restart from stage 0
          mistake.reviewStage = 0;
          mistake.nextReview = Date.now() + REVIEW_INTERVALS.FIRST;
          mistake.mistakeCount += 1;
        }
      }
      
      return newMistakes;
    });
  }, [updateMistakes]);

  // Update user statistics
  const updateStats = useCallback((sessionData: {
    totalQuestions: number;
    correctAnswers: number;
    totalMistakes: number;
    studyTime: number;
  }) => {
    updateStatsValue(prevStats => {
      const accuracy = sessionData.totalQuestions > 0 
        ? (sessionData.correctAnswers / sessionData.totalQuestions) * 100 
        : 0;

      const newTotalQuestions = prevStats.totalQuestions + sessionData.totalQuestions;
      const newTotalCorrect = prevStats.totalCorrect + sessionData.correctAnswers;
      const newAverageAccuracy = newTotalQuestions > 0 
        ? (newTotalCorrect / newTotalQuestions) * 100 
        : 0;

      return {
        ...prevStats,
        totalSessions: prevStats.totalSessions + 1,
        totalQuestions: newTotalQuestions,
        totalCorrect: newTotalCorrect,
        totalMistakes: prevStats.totalMistakes + sessionData.totalMistakes,
        averageAccuracy: newAverageAccuracy,
        totalStudyTime: prevStats.totalStudyTime + sessionData.studyTime,
        lastUpdated: Date.now()
      };
    });
  }, [updateStatsValue]);

  // Generate review questions based on mode
  const getReviewQuestions = useCallback((
    mode: 'all' | 'pattern' | 'weak-patterns', 
    patternName?: string
  ): QuestionItem[] => {
    const now = Date.now();
    let targetMistakes: MistakeItem[] = [];

    if (mode === 'all') {
      // All due reviews
      targetMistakes = mistakes.filter(m => !m.mastered && m.nextReview <= now);
    } else if (mode === 'pattern' && patternName) {
      // Specific pattern reviews
      targetMistakes = mistakes.filter(m => 
        !m.mastered && 
        m.nextReview <= now && 
        m.pattern === patternName
      );
    } else if (mode === 'weak-patterns') {
      // Weak patterns (low mastery rate or high mistake count)
      const patternStats = new Map<string, { total: number; mastered: number }>();
      
      mistakes.forEach(m => {
        const current = patternStats.get(m.pattern) || { total: 0, mastered: 0 };
        current.total += 1;
        if (m.mastered) current.mastered += 1;
        patternStats.set(m.pattern, current);
      });
      
      const weakPatterns = Array.from(patternStats.entries())
        .filter(([_, stats]) => stats.total >= 3 && (stats.mastered / stats.total) < 0.5)
        .map(([pattern]) => pattern);
      
      targetMistakes = mistakes.filter(m => 
        !m.mastered && 
        m.nextReview <= now && 
        weakPatterns.includes(m.pattern)
      );
    }

    // Convert to QuestionItem format
    return targetMistakes.map(mistake => ({
      korean: mistake.korean,
      english: mistake.english,
      pattern: mistake.pattern,
      verb: mistake.verb,
      level: mistake.level,
      stage: mistake.stage,
      mistakeId: mistake.id // Add for tracking
    } as QuestionItem & { mistakeId: string }));
  }, [mistakes]);

  // Clear all data
  const clearAllData = useCallback(() => {
    StorageManager.clearAllData();
  }, []);

  // Debug print
  const debugPrint = useCallback(() => {
    StorageManager.debugPrint();
  }, []);

  return {
    // Mistakes management
    mistakes,
    addMistake,
    
    // Review system
    dueReviews,
    completedReview,
    
    // Statistics
    stats,
    updateStats,
    
    // Review questions generation
    getReviewQuestions,
    
    // Utilities
    mistakeCount,
    reviewCount,
    masteredCount,
    clearAllData,
    debugPrint
  };
};