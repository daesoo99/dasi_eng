/**
 * SessionPort - 학습 세션 및 진도 관리
 */

import { StudySession, ScoreRecord, User } from '../../shared/types/core';

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

export interface SessionPort {
  /**
   * 새로운 학습 세션 생성
   */
  createSession(params: CreateSessionParams): Promise<StudySession>;
  
  /**
   * 세션 진도 업데이트
   */
  updateProgress(sessionId: string, progress: ProgressUpdate): Promise<void>;
  
  /**
   * 사용자의 활성 세션 조회
   */
  getActiveSession(userId: string): Promise<StudySession | null>;
  
  /**
   * 세션 완료 처리
   */
  completeSession(sessionId: string, finalScores: ScoreRecord[]): Promise<StudySession>;
  
  /**
   * 사용자의 세션 히스토리 조회
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