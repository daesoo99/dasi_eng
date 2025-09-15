/**
 * Speed Training Plugin Interface
 * @description 속도 훈련 모드를 위한 플러그인 인터페이스
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처
 */

import { IPlugin } from '@/plugins/core/IPlugin';
import { NonEmptyString, Result } from '@/types/core';
import {
  SpeedSession,
  SpeedResult,
  SpeedModeSettings,
  ExplanationModeSettings,
  MixedLevelSettings,
  DifficultyMode
} from '@/services/speedDifficultyModes';

// Speed Training 세션 생성 옵션
export interface SpeedSessionOptions {
  userId: string;
  mode: DifficultyMode;
  settings: SpeedModeSettings | ExplanationModeSettings | MixedLevelSettings;
  questionCount: number;
}

// Speed Training 결과
export interface SpeedTrainingResults {
  totalScore: number;
  accuracy: number;
  averageResponseTime: number;
  bonusPoints: number;
  improvementAreas: string[];
  nextRecommendation: string;
  performanceMetrics?: {
    responseTimeDistribution: number[];
    difficultyBreakdown: Record<string, number>;
    tagPerformance: Record<string, number>;
  };
}

// Speed Training 실시간 이벤트
export interface SpeedTrainingEvent {
  type: 'questionStart' | 'questionEnd' | 'sessionComplete' | 'error';
  sessionId: string;
  data?: any;
  timestamp: number;
}

export type SpeedTrainingEventHandler = (event: SpeedTrainingEvent) => void;

// Speed Training Plugin 핵심 인터페이스
export interface ISpeedTrainingPlugin extends IPlugin {
  // 세션 관리
  createSession(options: SpeedSessionOptions): Promise<Result<SpeedSession>>;
  getSession(sessionId: string): Promise<Result<SpeedSession | null>>;
  deleteSession(sessionId: string): Promise<Result<void>>;
  
  // 질문 처리
  processAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: string,
    responseTime: number
  ): Promise<Result<SpeedResult>>;
  
  // 세션 완료
  completeSession(sessionId: string): Promise<Result<SpeedTrainingResults>>;
  
  // 통계 및 분석
  getPerformanceStats(userId: string): Promise<Result<{
    totalSessions: number;
    averageAccuracy: number;
    bestStreak: number;
    preferredDifficulty: DifficultyMode;
  }>>;
  
  // 개인화 추천
  getRecommendedSettings(userId: string): Promise<Result<{
    suggestedMode: DifficultyMode;
    recommendedTimeLimit: number;
    targetAccuracy: number;
  }>>;
  
  // 이벤트 처리
  onSessionEvent(handler: SpeedTrainingEventHandler): void;
  offSessionEvent(handler: SpeedTrainingEventHandler): void;
  
  // 진행 상황 추적
  getSessionProgress(sessionId: string): Promise<Result<{
    currentQuestionIndex: number;
    totalQuestions: number;
    correctAnswers: number;
    timeElapsed: number;
    estimatedTimeRemaining: number;
  }>>;
  
  // 설정 검증
  validateSettings(
    mode: DifficultyMode,
    settings: SpeedModeSettings | ExplanationModeSettings | MixedLevelSettings
  ): Result<void>;
}

// Speed Training Plugin Factory
export interface ISpeedTrainingPluginFactory {
  readonly pluginType: NonEmptyString;
  create(config?: {
    enableAnalytics?: boolean;
    cacheSize?: number;
    timeoutMs?: number;
    retryAttempts?: number;
  }): Promise<Result<ISpeedTrainingPlugin>>;
}

// Speed Training Plugin 설정
export interface SpeedTrainingPluginConfig {
  // 성능 설정
  sessionCacheSize: number;
  questionTimeoutMs: number;
  retryAttempts: number;
  
  // 기능 플래그
  enableAnalytics: boolean;
  enablePerformanceTracking: boolean;
  enableAdaptiveDifficulty: boolean;
  
  // 사용자 경험
  showProgressIndicator: boolean;
  enableHints: boolean;
  autoProgressToNext: boolean;
  
  // 데이터 관리
  maxStoredSessions: number;
  sessionExpiryHours: number;
  enableOfflineMode: boolean;
}