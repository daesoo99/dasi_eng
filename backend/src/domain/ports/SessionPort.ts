/**
 * SessionPort - 학습 세션 및 진도 관리
 */

import { StudySession, ScoreRecord } from '../../shared/types/core';

export interface CreateSessionParams {
  userId: string;
  level: number;
  stage: number;
  cardIds: string[];
}

export interface ProgressUpdate {
  cardId: string;
  score: number;
  timeSpent: number;
  completed: boolean;
}

export interface GetUserSessionsOptions {
  limit: number;
  offset: number;
  includeActive: boolean;
  includeCompleted: boolean;
}

export interface SessionPort {
  /**
   * 세션 저장 (생성 및 업데이트)
   */
  saveSession(session: StudySession): Promise<void>;
  
  /**
   * 세션 조회
   */
  getSession(sessionId: string): Promise<StudySession | null>;
  
  /**
   * 사용자의 활성 세션 조회
   */
  getActiveSession(userId: string): Promise<StudySession | null>;
  
  /**
   * 사용자의 세션 목록 조회
   */
  getUserSessions(userId: string, options: GetUserSessionsOptions): Promise<{
    sessions: StudySession[];
    total: number;
  }>;
  
  /**
   * 세션 삭제
   */
  deleteSession(sessionId: string): Promise<void>;
  
  // Legacy methods (backward compatibility)
  /**
   * 새로운 학습 세션 생성
   * @deprecated Use saveSession instead
   */
  createSession(params: CreateSessionParams): Promise<StudySession>;
  
  /**
   * 세션 진도 업데이트
   * @deprecated Use saveSession instead
   */
  updateProgress(sessionId: string, progress: ProgressUpdate): Promise<void>;
  
  /**
   * 세션 완료 처리
   * @deprecated Use saveSession instead
   */
  completeSession(sessionId: string, finalScores: ScoreRecord[]): Promise<StudySession>;
  
  /**
   * 사용자의 세션 히스토리 조회
   * @deprecated Use getUserSessions instead
   */
  getSessionHistory(userId: string, limit?: number): Promise<StudySession[]>;
  
  /**
   * 세션 통계 조회
   */
  getSessionStats(userId: string): Promise<{
    totalSessions: number;
    averageScore: number;
    totalTimeSpent: number;
    completionRate: number;
  }>;
}