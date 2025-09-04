/**
 * Memory Session Adapter
 * @description In-memory session storage for development/testing
 */

import { SessionPort } from '../../domain/ports/SessionPort';
import { StudySessionEntity } from '../../domain/entities/StudySession';

export class MemorySessionAdapter implements SessionPort {
  private sessions = new Map<string, any>();

  // Core methods
  async saveSession(session: any): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async getSession(sessionId: string): Promise<any> {
    return this.sessions.get(sessionId) || null;
  }

  async getActiveSession(userId: string): Promise<any> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId && !session.completed) {
        return session;
      }
    }
    return null;
  }

  async getUserSessions(userId: string, options: any): Promise<{ sessions: any[], total: number }> {
    const allUserSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId);

    let filteredSessions = allUserSessions;
    if (options.includeActive && !options.includeCompleted) {
      filteredSessions = allUserSessions.filter(s => !s.completed);
    } else if (options.includeCompleted && !options.includeActive) {
      filteredSessions = allUserSessions.filter(s => s.completed);
    }

    const paginated = filteredSessions
      .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));

    return {
      sessions: paginated,
      total: filteredSessions.length
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // Legacy methods for backward compatibility
  async createSession(params: any): Promise<any> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      id: sessionId,
      userId: params.userId,
      level: params.level,
      stage: params.stage,
      cardIds: params.cardIds || [],
      scores: [],
      startTime: new Date(),
      completed: false,
      ...params
    };
    
    await this.saveSession(sessionData);
    return sessionData;
  }

  async updateProgress(sessionId: string, progress: any): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      Object.assign(session, progress);
      await this.saveSession(session);
    }
  }

  async completeSession(sessionId: string, finalScores: any[]): Promise<any> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.completed = true;
      session.endTime = new Date();
      session.scores = finalScores;
      await this.saveSession(session);
      return session;
    }
    throw new Error(`Session ${sessionId} not found`);
  }

  async getSessionHistory(userId: string, limit?: number): Promise<any[]> {
    const result = await this.getUserSessions(userId, {
      limit: limit || 50,
      offset: 0,
      includeActive: false,
      includeCompleted: true
    });
    return result.sessions;
  }

  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    averageScore: number;
    totalTimeSpent: number;
    completionRate: number;
  }> {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId);

    const completedSessions = userSessions.filter(s => s.completed);
    const totalSessions = userSessions.length;
    const completionRate = totalSessions > 0 ? completedSessions.length / totalSessions : 0;

    const allScores = completedSessions.flatMap(s => s.scores || []);
    const averageScore = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + (score.score || 0), 0) / allScores.length 
      : 0;

    const totalTimeSpent = completedSessions.reduce((sum, s) => {
      if (s.startTime && s.endTime) {
        return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime());
      }
      return sum;
    }, 0);

    return {
      totalSessions,
      averageScore,
      totalTimeSpent,
      completionRate
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}