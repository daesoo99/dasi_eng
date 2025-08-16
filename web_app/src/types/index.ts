// Core types for DASI English learning system

export interface DrillCard {
  id: string;
  level: number; // 1-10
  stage: number; // 1-10  
  front_ko: string; // Korean prompt
  target_en: string; // Expected English answer
  difficulty: number; // 1-5
  pattern_tags?: string[]; // ["present_simple", "do_vs_are"]
}

export interface SessionItem {
  cardId: string;
  userAnswer: string; // What user said
  sttText: string; // STT transcription
  latencyMs: number; // Response time
  correct: boolean; // Pass/fail
  score: number; // 0-100 pronunciation score
  hints: string[]; // AI feedback
  timestamp: number;
}

export interface StudySession {
  id?: string;
  userId: string;
  level: number;
  stage: number;
  startedAt: Date;
  endedAt?: Date;
  items: SessionItem[];
  summary?: {
    totalCards: number;
    correctAnswers: number;
    accuracy: number;
    averageScore: number;
    totalTime: number;
    passed: boolean;
  };
}

export interface UserProgress {
  userId: string;
  level: number;
  stage: number;
  mastery: {
    accuracy: number; // Overall accuracy %
    avgLatencyMs: number; // Average response time
    recentScores: number[]; // Last 10 scores
  };
  unlockedLevels: number[];
  totalSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackResponse {
  correct: boolean;
  score: number;
  sttText: string;
  target_en: string;
  correction: string; // Natural corrected sentence
  feedback_ko: string; // Korean feedback
  hint_ko: string; // Korean hint
  success: boolean;
}

export interface STTResponse {
  transcript: string;
  confidence: number | null;
  success: boolean;
}

// UI State types
export interface AppSettings {
  language: 'ko' | 'en';
  sttEngine: 'browser' | 'cloud';
  ttsEnabled: boolean;
  volume: number;
}

export interface StudyState {
  currentSession: StudySession | null;
  currentCard: DrillCard | null;
  currentIndex: number;
  cards: DrillCard[];
  isRecording: boolean;
  isProcessing: boolean;
  feedback: FeedbackResponse | null;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}