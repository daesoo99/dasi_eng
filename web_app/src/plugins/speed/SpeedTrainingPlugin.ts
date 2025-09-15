/**
 * Speed Training Plugin Implementation
 * @description 속도 훈련 모드를 위한 플러그인 구현체
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + 기존 서비스 통합
 */

import { BasePlugin } from '@/plugins/core/BasePlugin';
import { PluginConfig } from '@/plugins/core/IPlugin';
import { Result, Ok, Err } from '@/types/core';
import {
  ISpeedTrainingPlugin,
  SpeedSessionOptions,
  SpeedTrainingResults,
  SpeedTrainingEvent,
  SpeedTrainingEventHandler,
  SpeedTrainingPluginConfig
} from './ISpeedTrainingPlugin';
import {
  SpeedSession,
  SpeedResult,
  DifficultyMode,
  speedDifficultyService
} from '@/services/speedDifficultyModes';

export class SpeedTrainingPlugin extends BasePlugin implements ISpeedTrainingPlugin {
  private readonly _sessionCache = new Map<string, SpeedSession>();
  private readonly _eventHandlers = new Set<SpeedTrainingEventHandler>();
  private _config: SpeedTrainingPluginConfig = {
    sessionCacheSize: 50,
    questionTimeoutMs: 30000,
    retryAttempts: 3,
    enableAnalytics: true,
    enablePerformanceTracking: true,
    enableAdaptiveDifficulty: false,
    showProgressIndicator: true,
    enableHints: false,
    autoProgressToNext: true,
    maxStoredSessions: 100,
    sessionExpiryHours: 24,
    enableOfflineMode: false
  };

  constructor() {
    super({
      name: 'speed-training',
      version: '1.0.0',
      description: 'High-performance speed training plugin with analytics',
      author: 'DaSi English Team',
      dependencies: [],
      minSystemVersion: '1.0.0',
      tags: ['training', 'speed', 'performance']
    });
  }

  protected async onInitialize(config: PluginConfig): Promise<Result<void>> {
    try {
      // 설정 머지
      this._config = { ...this._config, ...config } as SpeedTrainingPluginConfig;
      
      console.log(`🚀 Speed Training Plugin initialized with config:`, {
        cacheSize: this._config.sessionCacheSize,
        analytics: this._config.enableAnalytics,
        performance: this._config.enablePerformanceTracking
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  protected async onDispose(): Promise<Result<void>> {
    try {
      this._sessionCache.clear();
      this._eventHandlers.clear();
      console.log('🧹 Speed Training Plugin disposed');
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  // 세션 관리
  async createSession(options: SpeedSessionOptions): Promise<Result<SpeedSession>> {
    return this.safeAsync(async () => {
      this._emitEvent('sessionStart', options.userId, { options });

      let session: SpeedSession;

      switch (options.mode) {
        case 'fast':
          session = await speedDifficultyService.createFastSession(
            options.userId,
            options.settings as any,
            options.questionCount
          );
          break;
        case 'explanation':
          session = await speedDifficultyService.createExplanationSession(
            options.userId,
            options.settings as any,
            options.questionCount
          );
          break;
        case 'mixed_levels':
          session = await speedDifficultyService.createMixedLevelSession(
            options.userId,
            options.settings as any,
            options.questionCount
          );
          break;
        default:
          throw new Error(`Unsupported training mode: ${options.mode}`);
      }

      // 캐시에 저장 (크기 제한)
      if (this._sessionCache.size >= this._config.sessionCacheSize) {
        const oldestKey = this._sessionCache.keys().next().value;
        this._sessionCache.delete(oldestKey);
      }
      this._sessionCache.set(session.sessionId, session);

      if (this._config.enableAnalytics) {
        console.log('📊 Session analytics:', {
          sessionId: session.sessionId,
          mode: options.mode,
          questionCount: options.questionCount,
          timestamp: Date.now()
        });
      }

      this._emitEvent('sessionCreated', session.sessionId, { session });
      return session;
    }, 'Failed to create speed training session');
  }

  async getSession(sessionId: string): Promise<Result<SpeedSession | null>> {
    return this.safeAsync(async () => {
      const cachedSession = this._sessionCache.get(sessionId);
      if (cachedSession) {
        return cachedSession;
      }
      
      // 캐시에 없으면 null 반환 (실제 구현에서는 DB 조회)
      return null;
    }, 'Failed to retrieve session');
  }

  async deleteSession(sessionId: string): Promise<Result<void>> {
    return this.safeAsync(async () => {
      this._sessionCache.delete(sessionId);
      this._emitEvent('sessionDeleted', sessionId, {});
    }, 'Failed to delete session');
  }

  // 질문 처리
  async processAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: string,
    responseTime: number
  ): Promise<Result<SpeedResult>> {
    return this.safeAsync(async () => {
      const session = this._sessionCache.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      this._emitEvent('questionStart', sessionId, { 
        questionId, 
        userAnswer, 
        responseTime 
      });

      const result = await speedDifficultyService.processAnswer(
        sessionId,
        questionId,
        userAnswer,
        responseTime
      );

      // 성능 추적
      if (this._config.enablePerformanceTracking) {
        this._trackPerformance(sessionId, questionId, result, responseTime);
      }

      // 세션 업데이트
      session.results.push(result);
      this._sessionCache.set(sessionId, session);

      this._emitEvent('questionEnd', sessionId, { 
        questionId, 
        result,
        isCorrect: result.isCorrect,
        responseTime
      });

      return result;
    }, 'Failed to process answer');
  }

  // 세션 완료
  async completeSession(sessionId: string): Promise<Result<SpeedTrainingResults>> {
    return this.safeAsync(async () => {
      const session = this._sessionCache.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const baseResults = await speedDifficultyService.completeSession(sessionId);
      
      // 향상된 결과 생성
      const enhancedResults: SpeedTrainingResults = {
        ...baseResults,
        performanceMetrics: this._generatePerformanceMetrics(session)
      };

      this._emitEvent('sessionComplete', sessionId, { 
        results: enhancedResults,
        totalQuestions: session.questions.length,
        sessionDuration: Date.now() - session.startTime.getTime()
      });

      return enhancedResults;
    }, 'Failed to complete session');
  }

  // 통계 및 분석
  async getPerformanceStats(_userId: string): Promise<Result<{
    totalSessions: number;
    averageAccuracy: number;
    bestStreak: number;
    preferredDifficulty: DifficultyMode;
  }>> {
    return this.safeAsync(async () => {
      // Mock implementation - 실제로는 데이터베이스에서 조회
      return {
        totalSessions: 42,
        averageAccuracy: 85.6,
        bestStreak: 15,
        preferredDifficulty: 'fast' as DifficultyMode
      };
    }, 'Failed to get performance stats');
  }

  // 개인화 추천
  async getRecommendedSettings(userId: string): Promise<Result<{
    suggestedMode: DifficultyMode;
    recommendedTimeLimit: number;
    targetAccuracy: number;
  }>> {
    return this.safeAsync(async () => {
      // Mock implementation with adaptive logic
      const stats = await this.getPerformanceStats(userId);
      
      if (stats.success) {
        const { averageAccuracy } = stats.data;
        
        return {
          suggestedMode: averageAccuracy > 90 ? 'mixed_levels' : 'fast',
          recommendedTimeLimit: averageAccuracy > 85 ? 3 : 4,
          targetAccuracy: Math.min(averageAccuracy + 5, 95)
        };
      }
      
      // 기본값
      return {
        suggestedMode: 'fast' as DifficultyMode,
        recommendedTimeLimit: 3,
        targetAccuracy: 80
      };
    }, 'Failed to get recommended settings');
  }

  // 이벤트 처리
  onSessionEvent(handler: SpeedTrainingEventHandler): void {
    this._eventHandlers.add(handler);
  }

  offSessionEvent(handler: SpeedTrainingEventHandler): void {
    this._eventHandlers.delete(handler);
  }

  // 진행 상황 추적
  async getSessionProgress(sessionId: string): Promise<Result<{
    currentQuestionIndex: number;
    totalQuestions: number;
    correctAnswers: number;
    timeElapsed: number;
    estimatedTimeRemaining: number;
  }>> {
    return this.safeAsync(async () => {
      const session = this._sessionCache.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const currentQuestionIndex = session.results.length;
      const correctAnswers = session.results.filter(r => r.isCorrect).length;
      const timeElapsed = Date.now() - session.startTime.getTime();
      
      // 평균 응답 시간 기반 남은 시간 추정
      const averageTime = session.results.length > 0 
        ? session.results.reduce((sum, r) => sum + r.responseTime, 0) / session.results.length
        : 5000; // 기본값 5초
      
      const remainingQuestions = session.questions.length - currentQuestionIndex;
      const estimatedTimeRemaining = remainingQuestions * averageTime;

      return {
        currentQuestionIndex,
        totalQuestions: session.questions.length,
        correctAnswers,
        timeElapsed,
        estimatedTimeRemaining
      };
    }, 'Failed to get session progress');
  }

  // 설정 검증
  validateSettings(
    mode: DifficultyMode,
    settings: any
  ): Result<void> {
    try {
      // Basic validation
      if (!['fast', 'explanation', 'mixed_levels'].includes(mode)) {
        return Err(new Error(`Invalid training mode: ${mode}`));
      }

      if (mode === 'fast' && (!settings.timeLimit || settings.timeLimit < 1 || settings.timeLimit > 10)) {
        return Err(new Error('Fast mode time limit must be between 1-10 seconds'));
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  // Private helper methods
  private _emitEvent(type: SpeedTrainingEvent['type'], sessionId: string, data: any): void {
    const event: SpeedTrainingEvent = {
      type,
      sessionId,
      data,
      timestamp: Date.now()
    };

    this._eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Speed Training Plugin event handler error:', error);
      }
    });
  }

  private _trackPerformance(
    sessionId: string, 
    questionId: string, 
    result: SpeedResult, 
    responseTime: number
  ): void {
    if (this._config.enablePerformanceTracking) {
      // Performance tracking logic
      console.log('📈 Performance tracked:', {
        sessionId,
        questionId,
        isCorrect: result.isCorrect,
        responseTime,
        timestamp: Date.now()
      });
    }
  }

  private _generatePerformanceMetrics(session: SpeedSession) {
    const results = session.results;
    if (results.length === 0) {
      return {
        responseTimeDistribution: [],
        difficultyBreakdown: {},
        tagPerformance: {}
      };
    }

    return {
      responseTimeDistribution: results.map(r => r.responseTime),
      difficultyBreakdown: results.reduce((acc, r) => {
        const question = session.questions.find(q => q.questionId === r.questionId);
        if (question) {
          acc[question.difficulty] = (acc[question.difficulty] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      tagPerformance: results.reduce((acc, r) => {
        const question = session.questions.find(q => q.questionId === r.questionId);
        if (question) {
          question.tags.forEach(tag => {
            if (!acc[tag]) acc[tag] = { correct: 0, total: 0 };
            acc[tag].total += 1;
            if (r.isCorrect) acc[tag].correct += 1;
          });
        }
        return acc;
      }, {} as Record<string, { correct: number; total: number }>)
    };
  }
}