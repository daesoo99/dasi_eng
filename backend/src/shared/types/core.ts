/**
 * Core Domain Types for DaSi English
 * 핵심 비즈니스 엔티티 정의
 */

export interface User {
  uid: string;
  email?: string;
  level: number;           // 1-10
  displayName?: string;
  subscription?: 'free' | 'premium';
  createdAt: Date;
}

export interface StageId {
  level: number;  // 1-10
  stage: number;  // 1-50+
}

export interface DrillCard {
  id: string;
  front_ko: string;
  back_en: string;
  level: number;
  stage: number;
  difficulty: number;     // 1.0-5.0
  tags?: string[];
  audioUrl?: string;
}

export interface CardQuery {
  level?: number;
  stage?: number;
  limit?: number;
  offset?: number;
  difficulty?: number;
  tags?: string[];
}

export interface ReviewPlan {
  nextReviewAt: number;   // Unix timestamp
  dueItems: string[];     // Card IDs
  urgency: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
}

export interface StudySession {
  id: string;
  userId: string;
  level: number;
  stage: number;
  cardIds: string[];
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  scores: ScoreRecord[];
}

export interface ScoreRecord {
  cardId: string;
  userAnswer: string;
  targetAnswer: string;
  score: number;          // 0-100
  timeSpent: number;      // milliseconds
  attempts: number;
  timestamp: Date;
}

export interface ScoreResult {
  correct: boolean;
  score: number;          // 0-100
  confidence: number;     // 0-1
  similarity: number;     // 0-1
}

export interface ComparisonResult {
  wordMatches: number;
  totalWords: number;
  exactMatch: boolean;
  differences: string[];
}

export interface FeedbackResponse {
  message: string;
  suggestions: string[];
  encouragement: string;
  nextAction?: 'continue' | 'review' | 'advance';
}

export interface LearningContext {
  userLevel: number;
  recentErrors: string[];
  sessionProgress: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export interface AttemptRecord {
  cardId: string;
  timestamp: Date;
  success: boolean;
  score: number;
  responseTime: number;
}

export interface ReviewHistory {
  userId: string;
  attempts: AttemptRecord[];
  lastReviewDate: Date;
  successRate: number;
}

export interface RetentionScore {
  probability: number;    // 0-1 (기억할 확률)
  confidence: number;     // 0-1 (예측 신뢰도)
  daysSinceLastReview: number;
}