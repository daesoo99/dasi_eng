import { useState, useCallback, useEffect } from 'react';

// Storage keys
export const STORAGE_KEYS = {
  MISTAKES: 'dasi_mistakes',
  REVIEW_SCHEDULE: 'dasi_review_schedule',
  USER_STATS: 'dasi_user_stats',
  VOICE_SETTINGS: 'dasi_voice_settings',
  PROGRESS: 'dasi_progress',
  ACHIEVEMENTS: 'dasi_achievements',
  VOCABULARY_PROGRESS: 'dasi_vocabulary_progress'
} as const;

// Storage interface for type safety
export interface StorageItem {
  [STORAGE_KEYS.MISTAKES]: MistakeItem[];
  [STORAGE_KEYS.REVIEW_SCHEDULE]: ReviewScheduleItem[];
  [STORAGE_KEYS.USER_STATS]: UserStats;
  [STORAGE_KEYS.VOICE_SETTINGS]: VoiceSettings;
  [STORAGE_KEYS.PROGRESS]: ProgressData;
  [STORAGE_KEYS.ACHIEVEMENTS]: AchievementData;
  [STORAGE_KEYS.VOCABULARY_PROGRESS]: any[]; // UserVocabularyProgress[] 타입은 나중에 추가
}

// Data interfaces
export interface MistakeItem {
  id: string;
  level: number;
  stage: number;
  korean: string;
  english: string;
  pattern: string;
  verb?: string;
  userAnswer: string;
  mistakeCount: number;
  firstMistake: number;
  lastMistake: number;
  nextReview: number;
  reviewStage: number; // 0: 1일후, 1: 3일후, 2: 7일후, 3: 14일후
  reviewCount: number;
  difficulty: number;
  totalResponseTime: number;
  averageResponseTime: number;
  mastered: boolean;
  masteredDate?: number;
}

export interface ReviewScheduleItem {
  mistakeId: string;
  nextReview: number;
  reviewStage: number;
}

export interface UserStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  totalMistakes: number;
  averageAccuracy: number;
  totalStudyTime: number;
  lastUpdated: number;
  streakDays: number;
  lastStudyDate: string;
}

export interface VoiceSettings {
  koreanEnabled: boolean;
  englishEnabled: boolean;
  speed: number;
  koreanVoice?: string;
  englishVoice?: string;
  
  // 고급 TTS 설정
  pitch: number; // 0.1-2.0, 기본값 1.0
  volume: number; // 0.1-1.0, 기본값 1.0
  voiceQuality: 'basic' | 'enhanced'; // 무료 vs 최적화 모드
  naturalPauses: boolean; // 자연스러운 쉼 추가
  emphasizeKeyWords: boolean; // 주요 단어 강조
  slowLearnerMode: boolean; // 초보자용 명확한 발음
  sentenceBreaking: boolean; // 문장 단위로 나누어 읽기
  pronunciationClarity: 'normal' | 'clear' | 'extra-clear'; // 발음 명확도
}

export interface ProgressData {
  currentLevel: number;
  currentStage: number;
  lastSession: number;
  completedLevels: number[];
  completedStages: { [key: string]: number[] };
}

// Achievement 시스템 인터페이스
export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'learning' | 'performance' | 'milestone';
  icon: string;
  badge: string;
  unlockedAt?: number;
  progress?: number; // 0-100, 달성 진행률
  target?: number; // 목표치 (예: 100문제, 10일 등)
  current?: number; // 현재 진행률
}

export interface AchievementData {
  unlockedAchievements: string[]; // 획득한 업적 ID 배열
  achievementProgress: { [key: string]: { current: number; target: number; }; }; // 진행 중인 업적들
  lastChecked: number; // 마지막 업적 체크 시각
  newBadges: string[]; // 새로 획득했지만 아직 확인하지 않은 배지들
}

// Default values
const DEFAULT_VALUES: StorageItem = {
  [STORAGE_KEYS.MISTAKES]: [],
  [STORAGE_KEYS.REVIEW_SCHEDULE]: [],
  [STORAGE_KEYS.USER_STATS]: {
    totalSessions: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    totalMistakes: 0,
    averageAccuracy: 0,
    totalStudyTime: 0,
    lastUpdated: Date.now(),
    streakDays: 0,
    lastStudyDate: ''
  },
  [STORAGE_KEYS.VOICE_SETTINGS]: {
    koreanEnabled: true,
    englishEnabled: true,
    speed: 0.8,
    koreanVoice: undefined,
    englishVoice: undefined,
    
    // 고급 TTS 기본값
    pitch: 1.0,
    volume: 1.0,
    voiceQuality: 'enhanced' as const,
    naturalPauses: true,
    emphasizeKeyWords: true,
    slowLearnerMode: false,
    sentenceBreaking: true,
    pronunciationClarity: 'clear' as const
  },
  [STORAGE_KEYS.PROGRESS]: {
    currentLevel: 1,
    currentStage: 1,
    lastSession: Date.now(),
    completedLevels: [],
    completedStages: {}
  },
  [STORAGE_KEYS.ACHIEVEMENTS]: {
    unlockedAchievements: [],
    achievementProgress: {},
    lastChecked: Date.now(),
    newBadges: []
  }
};

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (newValue: T) => void;
  updateValue: (updater: (prevValue: T) => T) => void;
  clearValue: () => void;
  loading: boolean;
  error: string | null;
}

export function useLocalStorage<K extends keyof StorageItem>(
  key: K
): UseLocalStorageReturn<StorageItem[K]> {
  const [value, setStoredValue] = useState<StorageItem[K]>(DEFAULT_VALUES[key]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load value from localStorage on mount
  useEffect(() => {
    try {
      setLoading(true);
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedValue = JSON.parse(item);
        setStoredValue(parsedValue);
      } else {
        setStoredValue(DEFAULT_VALUES[key]);
      }
      setError(null);
    } catch (err) {
      console.error(`Error loading localStorage key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setStoredValue(DEFAULT_VALUES[key]);
    } finally {
      setLoading(false);
    }
  }, [key]);

  // Set value and persist to localStorage
  const setValue = useCallback((newValue: StorageItem[K]) => {
    try {
      setStoredValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setError(null);
    } catch (err) {
      console.error(`Error saving to localStorage key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
    }
  }, [key]);

  // Update value using updater function
  const updateValue = useCallback((updater: (prevValue: StorageItem[K]) => StorageItem[K]) => {
    try {
      setStoredValue(prevValue => {
        const newValue = updater(prevValue);
        window.localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
      setError(null);
    } catch (err) {
      console.error(`Error updating localStorage key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Failed to update data');
    }
  }, [key]);

  // Clear value and remove from localStorage
  const clearValue = useCallback(() => {
    try {
      setStoredValue(DEFAULT_VALUES[key]);
      window.localStorage.removeItem(key);
      setError(null);
    } catch (err) {
      console.error(`Error clearing localStorage key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    }
  }, [key]);

  return {
    value,
    setValue,
    updateValue,
    clearValue,
    loading,
    error
  };
}

// Storage Manager utility class
export class StorageManager {
  static getMistakes(): MistakeItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MISTAKES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('틀린 문제 데이터 로드 실패:', error);
      return [];
    }
  }

  static saveMistakes(mistakes: MistakeItem[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
      return true;
    } catch (error) {
      console.error('틀린 문제 저장 실패:', error);
      return false;
    }
  }

  static getUserStats(): UserStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_STATS);
      return data ? JSON.parse(data) : DEFAULT_VALUES[STORAGE_KEYS.USER_STATS];
    } catch (error) {
      console.error('사용자 통계 로드 실패:', error);
      return DEFAULT_VALUES[STORAGE_KEYS.USER_STATS];
    }
  }

  static saveUserStats(stats: UserStats): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify({
        ...stats,
        lastUpdated: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('사용자 통계 저장 실패:', error);
      return false;
    }
  }

  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('모든 데이터가 초기화되었습니다.');
  }

  static debugPrint(): void {
    console.log('=== localStorage 데이터 ===');
    console.log('틀린 문제:', this.getMistakes());
    console.log('사용자 통계:', this.getUserStats());
  }
}