/**
 * useVocabulary - 단어장 관리 전용 훅
 * - 사용자 진도에 맞는 단어 목록 제공
 * - 단어 학습 상태 관리 (알고 있음/모름/복습 필요)
 * - 즐겨찾기 및 검색 기능
 * - SRS 기반 복습 스케줄링
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import { useUser } from '@/store/useAppStore';
import vocabularyService, { 
  VocabularyWord, 
  UserVocabularyProgress, 
  VocabularyStats 
} from '@/services/vocabularyService';

interface VocabularyFilters {
  level?: number;
  category?: VocabularyWord['category'];
  difficulty?: VocabularyWord['difficulty'];
  status?: UserVocabularyProgress['status'];
  onlyFavorites?: boolean;
  searchQuery?: string;
}

interface UseVocabularyReturn {
  // 데이터
  vocabularyWords: VocabularyWord[];
  filteredWords: VocabularyWord[];
  userProgress: UserVocabularyProgress[];
  stats: VocabularyStats;
  
  // 상태
  isLoading: boolean;
  error: string | null;
  
  // 필터링 & 검색
  filters: VocabularyFilters;
  setFilters: (filters: Partial<VocabularyFilters>) => void;
  clearFilters: () => void;
  searchWords: (query: string) => void;
  
  // 단어 학습 상태 관리
  updateWordStatus: (wordId: string, status: UserVocabularyProgress['status']) => void;
  toggleFavorite: (wordId: string) => void;
  markWordAsStudied: (wordId: string, isCorrect: boolean) => void;
  
  // 복습 관리
  getWordsForReview: () => VocabularyWord[];
  getNewWordsToLearn: (limit?: number) => VocabularyWord[];
  
  // 데이터 새로고침
  refreshVocabulary: () => Promise<void>;
}

const INITIAL_FILTERS: VocabularyFilters = {
  searchQuery: ''
};

export const useVocabulary = (): UseVocabularyReturn => {
  const user = useUser();
  const { value: userProgress, updateValue: setUserProgress } = useLocalStorage<UserVocabularyProgress[]>(
    STORAGE_KEYS.VOCABULARY_PROGRESS, 
    []
  );

  // 상태 관리
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<VocabularyFilters>(INITIAL_FILTERS);

  /**
   * 사용자 진도에 맞는 단어 목록 로드
   */
  const loadVocabulary = useCallback(async () => {
    if (!user.level) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Level ${user.level}, Stage ${user.stage} 단어 로드 중...`);
      const words = await vocabularyService.getVocabularyForUser(user.level, user.stage);
      setVocabularyWords(words);
      console.log(`✅ 단어 ${words.length}개 로드 완료`);
    } catch (err) {
      console.error('❌ 단어 로드 오류:', err);
      setError(err instanceof Error ? err.message : '단어 로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user.level, user.stage]);

  /**
   * 컴포넌트 마운트 시 및 사용자 레벨 변경 시 단어 로드
   */
  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  /**
   * 사용자 진행 상황 맵 생성 (성능 최적화)
   */
  const progressMap = useMemo(() => {
    const map = new Map<string, UserVocabularyProgress>();
    if (Array.isArray(userProgress)) {
      userProgress.forEach(progress => map.set(progress.wordId, progress));
    }
    return map;
  }, [userProgress]);

  /**
   * 필터링된 단어 목록
   */
  const filteredWords = useMemo(() => {
    let filtered = [...vocabularyWords];

    // 레벨 필터
    if (filters.level) {
      filtered = filtered.filter(word => word.level === filters.level);
    }

    // 카테고리 필터
    if (filters.category) {
      filtered = filtered.filter(word => word.category === filters.category);
    }

    // 난이도 필터
    if (filters.difficulty) {
      filtered = filtered.filter(word => word.difficulty === filters.difficulty);
    }

    // 학습 상태 필터
    if (filters.status) {
      filtered = filtered.filter(word => {
        const progress = progressMap.get(word.id);
        return progress?.status === filters.status;
      });
    }

    // 즐겨찾기 필터
    if (filters.onlyFavorites) {
      filtered = filtered.filter(word => {
        const progress = progressMap.get(word.id);
        return progress?.isFavorite === true;
      });
    }

    // 검색 쿼리 필터
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(word => 
        word.word.toLowerCase().includes(query) || 
        word.translation.toLowerCase().includes(query) ||
        word.examples.some(example => 
          example.sentence.toLowerCase().includes(query) ||
          example.translation.toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  }, [vocabularyWords, filters, progressMap]);

  /**
   * 단어 학습 통계
   */
  const stats = useMemo(() => {
    const safeUserProgress = Array.isArray(userProgress) ? userProgress : [];
    return vocabularyService.calculateVocabularyStats(vocabularyWords, safeUserProgress);
  }, [vocabularyWords, userProgress]);

  /**
   * 필터 설정
   */
  const setFilters = useCallback((newFilters: Partial<VocabularyFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 필터 초기화
   */
  const clearFilters = useCallback(() => {
    setFiltersState(INITIAL_FILTERS);
  }, []);

  /**
   * 단어 검색
   */
  const searchWords = useCallback((query: string) => {
    setFilters({ searchQuery: query });
  }, [setFilters]);

  /**
   * 단어 학습 상태 업데이트
   */
  const updateWordStatus = useCallback((wordId: string, status: UserVocabularyProgress['status']) => {
    setUserProgress(prev => {
      const existing = prev.find(p => p.wordId === wordId);
      
      if (existing) {
        // 기존 진행상황 업데이트
        return prev.map(p => 
          p.wordId === wordId 
            ? { ...p, status, lastStudied: new Date() }
            : p
        );
      } else {
        // 새로운 진행상황 추가
        const newProgress: UserVocabularyProgress = {
          wordId,
          status,
          lastStudied: new Date(),
          correctCount: 0,
          wrongCount: 0,
          isFavorite: false
        };
        return [...prev, newProgress];
      }
    });
  }, [setUserProgress]);

  /**
   * 즐겨찾기 토글
   */
  const toggleFavorite = useCallback((wordId: string) => {
    setUserProgress(prev => {
      const existing = prev.find(p => p.wordId === wordId);
      
      if (existing) {
        return prev.map(p => 
          p.wordId === wordId 
            ? { ...p, isFavorite: !p.isFavorite }
            : p
        );
      } else {
        const newProgress: UserVocabularyProgress = {
          wordId,
          status: 'unknown',
          correctCount: 0,
          wrongCount: 0,
          isFavorite: true
        };
        return [...prev, newProgress];
      }
    });
  }, [setUserProgress]);

  /**
   * 단어 학습 결과 기록 (정답/오답)
   */
  const markWordAsStudied = useCallback((wordId: string, isCorrect: boolean) => {
    setUserProgress(prev => {
      const existing = prev.find(p => p.wordId === wordId);
      
      if (existing) {
        // SRS 기반 다음 복습일 계산
        const nextReviewDate = new Date();
        if (isCorrect) {
          // 정답일 때: 복습 간격 증가
          const interval = Math.min(30, (existing.correctCount + 1) * 2); // 최대 30일
          nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        } else {
          // 오답일 때: 1일 후 복습
          nextReviewDate.setDate(nextReviewDate.getDate() + 1);
        }

        return prev.map(p => 
          p.wordId === wordId 
            ? { 
                ...p, 
                correctCount: isCorrect ? p.correctCount + 1 : p.correctCount,
                wrongCount: isCorrect ? p.wrongCount : p.wrongCount + 1,
                lastStudied: new Date(),
                nextReviewDate,
                status: isCorrect && p.correctCount >= 2 ? 'known' : 'learning'
              }
            : p
        );
      } else {
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + (isCorrect ? 2 : 1));
        
        const newProgress: UserVocabularyProgress = {
          wordId,
          status: isCorrect ? 'learning' : 'unknown',
          lastStudied: new Date(),
          correctCount: isCorrect ? 1 : 0,
          wrongCount: isCorrect ? 0 : 1,
          isFavorite: false,
          nextReviewDate
        };
        return [...prev, newProgress];
      }
    });
  }, [setUserProgress]);

  /**
   * 복습이 필요한 단어들 가져오기
   */
  const getWordsForReview = useCallback((): VocabularyWord[] => {
    if (!Array.isArray(userProgress)) return [];
    
    const now = new Date();
    const reviewWordIds = userProgress
      .filter(p => p.nextReviewDate && p.nextReviewDate <= now)
      .map(p => p.wordId);
    
    return vocabularyWords.filter(word => reviewWordIds.includes(word.id));
  }, [vocabularyWords, userProgress]);

  /**
   * 새로 학습할 단어들 가져오기
   */
  const getNewWordsToLearn = useCallback((limit = 10): VocabularyWord[] => {
    if (!Array.isArray(userProgress)) return vocabularyWords.slice(0, limit);
    
    const studiedWordIds = new Set(userProgress.map(p => p.wordId));
    const newWords = vocabularyWords.filter(word => !studiedWordIds.has(word.id));
    
    // 빈도순으로 정렬하여 중요한 단어부터 학습
    return newWords
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }, [vocabularyWords, userProgress]);

  /**
   * 단어 목록 새로고침
   */
  const refreshVocabulary = useCallback(async () => {
    await loadVocabulary();
  }, [loadVocabulary]);

  return {
    // 데이터
    vocabularyWords,
    filteredWords,
    userProgress,
    stats,
    
    // 상태
    isLoading,
    error,
    
    // 필터링 & 검색
    filters,
    setFilters,
    clearFilters,
    searchWords,
    
    // 단어 학습 상태 관리
    updateWordStatus,
    toggleFavorite,
    markWordAsStudied,
    
    // 복습 관리
    getWordsForReview,
    getNewWordsToLearn,
    
    // 데이터 새로고침
    refreshVocabulary
  };
};