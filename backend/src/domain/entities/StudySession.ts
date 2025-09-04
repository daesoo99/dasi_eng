/**
 * StudySession Domain Entity
 * @description 학습 세션 엔티티 - 상태 관리와 비즈니스 규칙 포함
 */

import { StudySession as IStudySession, ScoreRecord } from '../../shared/types/core';
import { DomainError, ErrorCategory } from '../../shared/errors/DomainError';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed', 
  ABANDONED = 'abandoned'
}

export class StudySessionEntity {
  private constructor(
    private readonly data: IStudySession
  ) {
    this.validate();
  }

  /**
   * 새로운 세션 시작
   */
  static start(params: {
    userId: string;
    level: number;
    stage: number;
    cardIds: string[];
  }): StudySessionEntity {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const session: IStudySession = {
      id: sessionId,
      userId: params.userId,
      level: params.level,
      stage: params.stage,
      cardIds: [...params.cardIds],
      startTime: new Date(),
      completed: false,
      scores: []
    };

    return new StudySessionEntity(session);
  }

  /**
   * 기존 데이터로부터 세션 복원
   */
  static fromData(sessionData: IStudySession): StudySessionEntity {
    return new StudySessionEntity(sessionData);
  }

  /**
   * 데이터 검증
   */
  private validate(): void {
    if (!this.data.userId || this.data.userId.trim().length === 0) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_USER_ID',
        'Session must have a valid user ID'
      );
    }

    if (this.data.level < 1 || this.data.level > 10) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_LEVEL',
        'Session level must be between 1 and 10'
      );
    }

    if (this.data.stage < 1) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_STAGE',
        'Session stage must be positive'
      );
    }

    if (!this.data.cardIds || this.data.cardIds.length === 0) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'EMPTY_CARD_LIST',
        'Session must have at least one card'
      );
    }
  }

  /**
   * 비즈니스 규칙: 답안 추가 가능 여부
   */
  canAddScore(): boolean {
    return !this.data.completed && !this.isAbandoned();
  }

  /**
   * 비즈니스 규칙: 세션 완료 가능 여부
   */
  canComplete(): boolean {
    return !this.data.completed && this.data.scores.length >= this.data.cardIds.length;
  }

  /**
   * 비즈니스 규칙: 세션 포기 여부 판단
   */
  isAbandoned(): boolean {
    if (this.data.completed) return false;
    
    const now = new Date();
    const timeSinceStart = now.getTime() - this.data.startTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // 30분 이상 비활성이고 아무 점수도 없으면 포기로 간주
    return timeSinceStart > thirtyMinutes && this.data.scores.length === 0;
  }

  /**
   * 답안 점수 추가
   */
  addScore(scoreRecord: {
    cardId: string;
    userAnswer: string;
    targetAnswer: string;
    score: number;
    timeSpent: number;
    attempts?: number;
  }): StudySessionEntity {
    if (!this.canAddScore()) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'CANNOT_ADD_SCORE',
        'Cannot add score to completed or abandoned session'
      );
    }

    if (!this.data.cardIds.includes(scoreRecord.cardId)) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'CARD_NOT_IN_SESSION',
        'Card is not part of this session'
      );
    }

    // 이미 답안이 있는 카드인지 확인
    const existingScore = this.data.scores.find(s => s.cardId === scoreRecord.cardId);
    if (existingScore) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'DUPLICATE_SCORE',
        'Score already exists for this card'
      );
    }

    const newScoreRecord: ScoreRecord = {
      cardId: scoreRecord.cardId,
      userAnswer: scoreRecord.userAnswer,
      targetAnswer: scoreRecord.targetAnswer,
      score: scoreRecord.score,
      timeSpent: scoreRecord.timeSpent,
      attempts: scoreRecord.attempts || 1,
      timestamp: new Date()
    };

    const newData: IStudySession = {
      ...this.data,
      scores: [...this.data.scores, newScoreRecord]
    };

    return new StudySessionEntity(newData);
  }

  /**
   * 세션 완료
   */
  complete(): StudySessionEntity {
    if (!this.canComplete()) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'CANNOT_COMPLETE_SESSION',
        'Session cannot be completed yet'
      );
    }

    const newData: IStudySession = {
      ...this.data,
      completed: true,
      endTime: new Date()
    };

    return new StudySessionEntity(newData);
  }

  /**
   * 진행률 계산
   */
  getProgress(): number {
    return this.data.scores.length / this.data.cardIds.length;
  }

  /**
   * 평균 점수 계산
   */
  getAverageScore(): number {
    if (this.data.scores.length === 0) return 0;
    
    const totalScore = this.data.scores.reduce((sum, score) => sum + score.score, 0);
    return totalScore / this.data.scores.length;
  }

  /**
   * 총 학습 시간 계산 (밀리초)
   */
  getTotalStudyTime(): number {
    if (this.data.endTime) {
      return this.data.endTime.getTime() - this.data.startTime.getTime();
    }
    return new Date().getTime() - this.data.startTime.getTime();
  }

  /**
   * 성공률 계산
   */
  getSuccessRate(): number {
    if (this.data.scores.length === 0) return 0;
    
    const successfulAnswers = this.data.scores.filter(score => score.score >= 80).length;
    return successfulAnswers / this.data.scores.length;
  }

  /**
   * 남은 카드 수
   */
  getRemainingCardCount(): number {
    return Math.max(0, this.data.cardIds.length - this.data.scores.length);
  }

  /**
   * 세션 상태
   */
  getStatus(): SessionStatus {
    if (this.data.completed) return SessionStatus.COMPLETED;
    if (this.isAbandoned()) return SessionStatus.ABANDONED;
    return SessionStatus.ACTIVE;
  }

  /**
   * Getter 메서드들
   */
  get id(): string {
    return this.data.id;
  }

  get userId(): string {
    return this.data.userId;
  }

  get level(): number {
    return this.data.level;
  }

  get stage(): number {
    return this.data.stage;
  }

  get cardIds(): string[] {
    return [...this.data.cardIds];
  }

  get startTime(): Date {
    return this.data.startTime;
  }

  get endTime(): Date | undefined {
    return this.data.endTime;
  }

  get completed(): boolean {
    return this.data.completed;
  }

  get scores(): ScoreRecord[] {
    return [...this.data.scores];
  }

  /**
   * 도메인 데이터 반환
   */
  toData(): IStudySession {
    return {
      ...this.data,
      cardIds: [...this.data.cardIds],
      scores: [...this.data.scores]
    };
  }

  /**
   * 세션 요약 정보
   */
  getSummary() {
    return {
      id: this.id,
      status: this.getStatus(),
      progress: this.getProgress(),
      averageScore: this.getAverageScore(),
      successRate: this.getSuccessRate(),
      totalTime: this.getTotalStudyTime(),
      remainingCards: this.getRemainingCardCount()
    };
  }

  /**
   * JSON 직렬화
   */
  toJSON(): IStudySession {
    return this.toData();
  }

  /**
   * 동등성 비교
   */
  equals(other: StudySessionEntity): boolean {
    return this.id === other.id;
  }
}