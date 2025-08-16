import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, StudyState, DrillCard, StudySession, FeedbackResponse } from '@/types';

export type LearningMode = 'writing' | 'speaking';

interface AppStore {
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Global Learning Mode
  learningMode: LearningMode;
  setLearningMode: (mode: LearningMode) => void;

  // User state
  user: {
    id: string | null;
    level: number;
    stage: number;
    isAuthenticated: boolean;
  };
  setUser: (user: Partial<AppStore['user']>) => void;
  setUserLevel: (level: number) => void;
  setUserStage: (stage: number) => void;

  // Study session state
  study: StudyState;
  setCurrentSession: (session: StudySession | null) => void;
  setCurrentCard: (card: DrillCard | null, index: number) => void;
  setCards: (cards: DrillCard[]) => void;
  setRecording: (isRecording: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setFeedback: (feedback: FeedbackResponse | null) => void;
  resetStudyState: () => void;

  // UI state
  ui: {
    isLoading: boolean;
    error: string | null;
    notification: string | null;
  };
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setNotification: (notification: string | null) => void;
  clearError: () => void;
  clearNotification: () => void;
}

const initialSettings: AppSettings = {
  language: 'ko',
  sttEngine: 'browser',
  ttsEnabled: true,
  volume: 1.0,
};

const initialStudyState: StudyState = {
  currentSession: null,
  currentCard: null,
  currentIndex: 0,
  cards: [],
  isRecording: false,
  isProcessing: false,
  feedback: null,
};

const initialUserState = {
  id: null,
  level: 1,
  stage: 1,
  isAuthenticated: false,
};

const initialUIState = {
  isLoading: false,
  error: null,
  notification: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Settings
      settings: initialSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Global Learning Mode
      learningMode: 'speaking', // 기본값은 기존 방식(speaking)
      setLearningMode: (mode) =>
        set((state) => ({
          learningMode: mode,
        })),

      // User
      user: initialUserState,
      setUser: (userData) =>
        set((state) => ({
          user: { ...state.user, ...userData },
        })),
      
      setUserLevel: (level) =>
        set((state) => ({
          user: { ...state.user, level },
        })),
      
      setUserStage: (stage) =>
        set((state) => ({
          user: { ...state.user, stage },
        })),

      // Study session
      study: initialStudyState,
      
      setCurrentSession: (session) =>
        set((state) => ({
          study: { ...state.study, currentSession: session },
        })),

      setCurrentCard: (card, index) =>
        set((state) => ({
          study: { 
            ...state.study, 
            currentCard: card, 
            currentIndex: index,
            feedback: null, // Clear previous feedback
          },
        })),

      setCards: (cards) =>
        set((state) => ({
          study: { ...state.study, cards },
        })),

      setRecording: (isRecording) =>
        set((state) => ({
          study: { ...state.study, isRecording },
        })),

      setProcessing: (isProcessing) =>
        set((state) => ({
          study: { ...state.study, isProcessing },
        })),

      setFeedback: (feedback) =>
        set((state) => ({
          study: { ...state.study, feedback },
        })),

      resetStudyState: () =>
        set((state) => ({
          study: initialStudyState,
        })),

      // UI state
      ui: initialUIState,

      setLoading: (isLoading) =>
        set((state) => ({
          ui: { ...state.ui, isLoading },
        })),

      setError: (error) =>
        set((state) => ({
          ui: { ...state.ui, error },
        })),

      setNotification: (notification) =>
        set((state) => ({
          ui: { ...state.ui, notification },
        })),

      clearError: () =>
        set((state) => ({
          ui: { ...state.ui, error: null },
        })),

      clearNotification: () =>
        set((state) => ({
          ui: { ...state.ui, notification: null },
        })),
    }),
    {
      name: 'dasi-english-store',
      // Only persist settings, user data, and learning mode, not study state
      partialize: (state) => ({
        settings: state.settings,
        user: state.user,
        learningMode: state.learningMode,
      }),
    }
  )
);

// Selectors for easier access
export const useSettings = () => useAppStore((state) => state.settings);
export const useUser = () => useAppStore((state) => state.user);
export const useStudy = () => useAppStore((state) => state.study);
export const useUI = () => useAppStore((state) => state.ui);
export const useLearningMode = () => useAppStore((state) => state.learningMode);