/**
 * ManageSession UseCases
 * @description 학습 세션 관리 비즈니스 로직
 */

import { SessionPort } from '../ports/SessionPort';
import { ContentPort } from '../ports/ContentPort';
import { StudySessionEntity } from '../entities/StudySession';
import { UserEntity } from '../entities/User';
import { StudySession, DrillCard } from '../../shared/types/core';
import { DomainError, ErrorCategory } from '../../shared/errors/DomainError';

export interface StartSessionInput {
  user: UserEntity;
  level: number;
  stage: number;
  cardCount?: number;
}

export interface StartSessionOutput {
  session: StudySessionEntity;
  cards: DrillCard[];
}

/**
 * StartSession UseCase - 새로운 학습 세션 시작
 */
export class StartSessionUseCase {
  constructor(
    private readonly sessionPort: SessionPort,
    private readonly contentPort: ContentPort
  ) {}

  async execute(input: StartSessionInput): Promise<StartSessionOutput> {
    const { user, level, stage, cardCount = 10 } = input;

    // 비즈니스 규칙 검증
    this.validateSessionStart(user, level, stage);

    // 활성 세션이 있는지 확인
    await this.checkActiveSession(user.uid);

    // 카드 조회
    const cards = await this.selectSessionCards(level, stage, cardCount, user);

    if (cards.length === 0) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'NO_CARDS_AVAILABLE',
        `No cards available for level ${level}, stage ${stage}`
      );
    }

    // 세션 생성
    const session = StudySessionEntity.start({
      userId: user.uid,
      level,
      stage,
      cardIds: cards.map(card => card.id)
    });

    // 세션 저장
    await this.sessionPort.saveSession(session.toData());

    return {
      session,
      cards
    };
  }

  private validateSessionStart(user: UserEntity, level: number, stage: number): void {
    if (level < 1 || level > 10) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_LEVEL',
        'Level must be between 1 and 10'
      );
    }

    if (stage < 1) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_STAGE',
        'Stage must be positive'
      );
    }

    // 사용자 레벨 접근 권한 체크
    if (level >= 4 && !user.canAccessAdvancedContent()) {
      throw new DomainError(
        ErrorCategory.AUTHORIZATION,
        'PREMIUM_CONTENT_REQUIRED',
        `Level ${level} requires premium subscription`
      );
    }

    if (level > user.level + 2) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'LEVEL_TOO_HIGH',
        `Level ${level} is too advanced for user level ${user.level}`
      );
    }
  }

  private async checkActiveSession(userId: string): Promise<void> {
    const activeSession = await this.sessionPort.getActiveSession(userId);
    
    if (activeSession) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'ACTIVE_SESSION_EXISTS',
        'User already has an active session'
      );
    }
  }

  private async selectSessionCards(
    level: number, 
    stage: number, 
    count: number, 
    user: UserEntity
  ): Promise<DrillCard[]> {
    // 지정된 레벨/스테이지의 카드 조회
    const stageCards = await this.contentPort.getStageCards(level, stage);
    
    if (stageCards.length >= count) {
      // 랜덤하게 선택
      return this.shuffleArray(stageCards).slice(0, count);
    }

    // 부족하면 같은 레벨의 다른 스테이지에서 보충
    const allLevelCards = await this.contentPort.findCards({
      level,
      limit: count * 2
    });

    const shuffled = this.shuffleArray(allLevelCards);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * SubmitAnswer UseCase - 답안 제출 및 점수 계산
 */
export class SubmitAnswerUseCase {
  constructor(
    private readonly sessionPort: SessionPort
  ) {}

  async execute(params: {
    sessionId: string;
    userId: string;
    cardId: string;
    userAnswer: string;
    targetAnswer: string;
    score: number;
    timeSpent: number;
    attempts?: number;
  }): Promise<StudySessionEntity> {
    const { sessionId, userId, cardId, userAnswer, targetAnswer, score, timeSpent, attempts } = params;

    // 세션 조회 및 소유권 확인
    const sessionData = await this.sessionPort.getSession(sessionId);
    if (!sessionData) {
      throw new DomainError(
        ErrorCategory.NOT_FOUND,
        'SESSION_NOT_FOUND',
        'Session not found'
      );
    }

    if (sessionData.userId !== userId) {
      throw new DomainError(
        ErrorCategory.AUTHORIZATION,
        'SESSION_ACCESS_DENIED',
        'Access denied to this session'
      );
    }

    // 세션 엔티티 생성 및 답안 추가
    const session = StudySessionEntity.fromData(sessionData);
    const updatedSession = session.addScore({
      cardId,
      userAnswer,
      targetAnswer,
      score,
      timeSpent,
      attempts
    });

    // 세션 저장
    await this.sessionPort.saveSession(updatedSession.toData());

    return updatedSession;
  }
}

/**
 * CompleteSession UseCase - 세션 완료 처리
 */
export class CompleteSessionUseCase {
  constructor(
    private readonly sessionPort: SessionPort
  ) {}

  async execute(sessionId: string, userId: string): Promise<{
    session: StudySessionEntity;
    summary: any;
  }> {
    // 세션 조회 및 소유권 확인
    const sessionData = await this.sessionPort.getSession(sessionId);
    if (!sessionData) {
      throw new DomainError(
        ErrorCategory.NOT_FOUND,
        'SESSION_NOT_FOUND',
        'Session not found'
      );
    }

    if (sessionData.userId !== userId) {
      throw new DomainError(
        ErrorCategory.AUTHORIZATION,
        'SESSION_ACCESS_DENIED',
        'Access denied to this session'
      );
    }

    // 세션 엔티티 생성 및 완료 처리
    const session = StudySessionEntity.fromData(sessionData);
    const completedSession = session.complete();

    // 세션 저장
    await this.sessionPort.saveSession(completedSession.toData());

    // 완료 요약 생성
    const summary = this.generateSessionSummary(completedSession);

    return {
      session: completedSession,
      summary
    };
  }

  private generateSessionSummary(session: StudySessionEntity) {
    const basicSummary = session.getSummary();
    
    return {
      ...basicSummary,
      performance: this.categorizePerformance(basicSummary.averageScore),
      recommendations: this.generateRecommendations(session),
      studyTimeFormatted: this.formatStudyTime(basicSummary.totalTime)
    };
  }

  private categorizePerformance(averageScore: number): string {
    if (averageScore >= 90) return 'excellent';
    if (averageScore >= 80) return 'good';
    if (averageScore >= 70) return 'fair';
    if (averageScore >= 60) return 'needs_improvement';
    return 'needs_practice';
  }

  private generateRecommendations(session: StudySessionEntity): string[] {
    const recommendations: string[] = [];
    const summary = session.getSummary();

    if (summary.averageScore < 70) {
      recommendations.push('Consider reviewing this level before advancing');
    }

    if (summary.successRate < 0.6) {
      recommendations.push('Focus on accuracy - take your time with each answer');
    }

    if (summary.totalTime > 30 * 60 * 1000) { // 30분 초과
      recommendations.push('Try to maintain focus - shorter, more frequent sessions might help');
    }

    if (summary.averageScore >= 85 && summary.successRate >= 0.8) {
      recommendations.push('Great job! You might be ready for the next level');
    }

    return recommendations;
  }

  private formatStudyTime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * GetUserSessions UseCase - 사용자 세션 목록 조회
 */
export class GetUserSessionsUseCase {
  constructor(
    private readonly sessionPort: SessionPort
  ) {}

  async execute(userId: string, options: {
    limit?: number;
    offset?: number;
    status?: 'active' | 'completed' | 'all';
  } = {}): Promise<{
    sessions: StudySession[];
    total: number;
  }> {
    const { limit = 20, offset = 0, status = 'all' } = options;

    const result = await this.sessionPort.getUserSessions(userId, {
      limit,
      offset,
      includeActive: status === 'active' || status === 'all',
      includeCompleted: status === 'completed' || status === 'all'
    });

    return result;
  }
}