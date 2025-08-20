export interface PatternQuestion {
  korean: string;
  english: string;
  lemma?: string;
  verb?: string;
}

export interface StageData {
  stage_id: string;
  title: string;
  pattern: string;
  classification: string;
  phase: number;
  drill: {
    delaySec: number;
    randomize: boolean;
    minCorrectToAdvance: number;
    reviewWeight: number;
  };
  slots: PatternQuestion[];
  tags: string[];
}

export interface PhaseData {
  phase_id: number;
  title: string;
  stages: string[];
}

export interface LevelData {
  level: number;
  title: string;
  description: string;
  total_phases: number;
  total_stages: number;
  revision_info?: {
    date: string;
    reason: string;
    changes: string;
  };
  phases: PhaseData[];
  stages: StageData[];
}

export interface LevelSystemParams {
  level: number;
  stage: number;
  verbs: string[];
  targetAccuracy?: number;
  developerMode?: boolean;
}

export interface ReviewModeParams {
  mode: 'single' | 'all' | 'pattern' | 'weak-patterns';
  reviewIds?: string[];
  reviewId?: string;
  patternName?: string;
}

export interface MistakeData {
  id: string;
  korean: string;
  english: string;
  userAnswer: string;
  timestamp: number;
  level: number;
  stage: number;
  pattern: string;
  difficulty: number;
  reviewStage: number; // 0-4 (0=첫 복습, 1=3일후, 2=7일후, 3=14일후, 4=완료)
  nextReview: number;
  mistakeCount: number;
  lastReview?: number;
}

export interface UserStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  totalMistakes: number;
  averageAccuracy: number;
  streakDays: number;
  lastStudyDate: number;
  levelProgress: Record<number, {
    completedStages: number;
    totalStages: number;
    accuracy: number;
  }>;
}

export interface SessionStats {
  level: number;
  stage: number;
  startTime: number;
  mistakes: MistakeData[];
  totalQuestions: number;
  correctAnswers: number;
}

export interface TrainingState {
  currentPhase: 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting' | 'completed';
  currentQuestion?: PatternQuestion;
  currentIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  mistakes: MistakeData[];
  isPaused: boolean;
  isCompleted: boolean;
  startTime: number;
  endTime?: number;
}

export interface VoiceSettings {
  korean: boolean;
  english: boolean;
  speed: number;
  selectedKoreanVoice?: string;
  selectedEnglishVoice?: string;
}

export interface TrainingSettings {
  voice: VoiceSettings;
  antiCheat: boolean;
  autoAdvance: boolean;
  showProgress: boolean;
  developerMode: boolean;
}

export interface SpacedRepetitionIntervals {
  FIRST: number;  // 1 day
  SECOND: number; // 3 days
  THIRD: number;  // 7 days
  FOURTH: number; // 14 days
}

export const REVIEW_INTERVALS: SpacedRepetitionIntervals = {
  FIRST: 1 * 24 * 60 * 60 * 1000,    // 1일
  SECOND: 3 * 24 * 60 * 60 * 1000,   // 3일
  THIRD: 7 * 24 * 60 * 60 * 1000,    // 7일
  FOURTH: 14 * 24 * 60 * 60 * 1000   // 14일
};

export const STORAGE_KEYS = {
  MISTAKES: 'dasi_mistakes',
  REVIEW_SCHEDULE: 'dasi_review_schedule', 
  USER_STATS: 'dasi_user_stats',
  VOICE_SETTINGS: 'dasi_voice_settings',
  TRAINING_SETTINGS: 'dasi_training_settings'
} as const;