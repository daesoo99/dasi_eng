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
  
  // Speaking Stage (1단계 3초, 2단계 2초, 3단계 1초)
  speakingStage: 1 | 2 | 3;
  setSpeakingStage: (stage: 1 | 2 | 3) => void;

  // User state
  user: {
    id: string | null;
    level: number;
    stage: number | 'ALL';
    isAuthenticated: boolean;
  };
  setUser: (user: Partial<AppStore['user']>) => void;
  setUserLevel: (level: number) => void;
  setUserStage: (stage: number | 'ALL') => void;

  // Stage selection state
  stageSelection: {
    selectedLevel: number | null;
    isStageModalOpen: boolean;
  };
  setSelectedLevel: (level: number | null) => void;
  setStageModalOpen: (isOpen: boolean) => void;
  selectLevelAndStage: (level: number, stage: number | 'ALL') => void;

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

const initialStageSelectionState = {
  selectedLevel: null,
  isStageModalOpen: false,
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
      
      // Speaking Stage
      speakingStage: 1, // 기본값: 1단계 (3초)
      setSpeakingStage: (stage) =>
        set((state) => ({
          speakingStage: stage,
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

      // Stage selection
      stageSelection: initialStageSelectionState,
      
      setSelectedLevel: (level) =>
        set((state) => ({
          stageSelection: { ...state.stageSelection, selectedLevel: level },
        })),

      setStageModalOpen: (isOpen) =>
        set((state) => ({
          stageSelection: { ...state.stageSelection, isStageModalOpen: isOpen },
        })),

      selectLevelAndStage: (level, stage) =>
        set((state) => ({
          user: { 
            ...state.user, 
            level, 
            stage 
          },
          stageSelection: { 
            selectedLevel: null, 
            isStageModalOpen: false 
          },
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
export const useStudy = () => useAppStore((state) => ({
  ...state.study,
  cards: state.study.cards || [],
}));
export const useUI = () => useAppStore((state) => state.ui);
export const useLearningMode = () => useAppStore((state) => ({
  mode: state.learningMode,
  setLearningMode: state.setLearningMode,
}));

export const useSpeakingStage = () => useAppStore((state) => ({
  stage: state.speakingStage,
  setSpeakingStage: state.setSpeakingStage,
}));

export const useStageSelection = () => useAppStore((state) => ({
  stageSelection: state.stageSelection,
  setSelectedLevel: state.setSelectedLevel,
  setStageModalOpen: state.setStageModalOpen,
  selectLevelAndStage: state.selectLevelAndStage,
}));