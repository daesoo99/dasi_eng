/**
 * 사용자 데이터 접근 레이어
 * @description Repository 패턴으로 데이터 소스 추상화
 */

import {
  IUserDataRepository,
  UserProgressData,
  SessionRecord,
  StatisticsError
} from './types';

/**
 * Firebase 기반 사용자 데이터 레포지토리
 */
export class FirebaseUserDataRepository implements IUserDataRepository {
  constructor(
    private readonly firestore: any, // Firebase Firestore 인스턴스
    private readonly auth: any       // Firebase Auth 인스턴스
  ) {}

  async getUserProgressData(userId: string): Promise<UserProgressData> {
    try {
      const userDoc = await this.firestore
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        throw new StatisticsError(
          `User data not found for userId: ${userId}`,
          'DATA_NOT_FOUND',
          userId
        );
      }

      const userData = userDoc.data();
      const sessionHistory = await this.getSessionHistory(userId);

      return {
        userId,
        level: userData.level || 1,
        totalSessions: userData.totalSessions || 0,
        completedStages: userData.completedStages || 0,
        totalStages: userData.totalStages || 0,
        lastStudyDate: userData.lastStudyDate || '',
        accuracyHistory: userData.accuracyHistory || [],
        sessionHistory
      };
    } catch (error) {
      if (error instanceof StatisticsError) throw error;
      
      throw new StatisticsError(
        `Failed to fetch user progress data: ${error.message}`,
        'DATA_NOT_FOUND',
        userId
      );
    }
  }

  async getSessionHistory(userId: string, limit: number = 100): Promise<SessionRecord[]> {
    try {
      const sessionsQuery = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('sessions')
        .orderBy('completedAt', 'desc')
        .limit(limit)
        .get();

      return sessionsQuery.docs.map(doc => ({
        sessionId: doc.id,
        ...doc.data()
      })) as SessionRecord[];
    } catch (error) {
      console.warn(`Failed to fetch session history for ${userId}:`, error);
      return []; // 세션 히스토리가 없어도 계속 진행
    }
  }

  async updateUserProgress(userId: string, sessionData: SessionRecord): Promise<void> {
    try {
      const batch = this.firestore.batch();

      // 사용자 프로그레스 업데이트
      const userRef = this.firestore.collection('users').doc(userId);
      batch.update(userRef, {
        totalSessions: this.firestore.FieldValue.increment(1),
        lastStudyDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 세션 기록 추가
      const sessionRef = this.firestore
        .collection('users')
        .doc(userId)
        .collection('sessions')
        .doc(sessionData.sessionId);
      
      batch.set(sessionRef, sessionData);

      await batch.commit();
    } catch (error) {
      throw new StatisticsError(
        `Failed to update user progress: ${error.message}`,
        'CALCULATION_ERROR',
        userId
      );
    }
  }
}

/**
 * 로컬 스토리지 기반 사용자 데이터 레포지토리 (개발/테스트용)
 */
export class LocalStorageUserDataRepository implements IUserDataRepository {
  private readonly USER_DATA_KEY = 'dasi_user_progress';
  private readonly SESSIONS_KEY = 'dasi_user_sessions';

  async getUserProgressData(userId: string): Promise<UserProgressData> {
    try {
      const storedData = localStorage.getItem(`${this.USER_DATA_KEY}_${userId}`);
      const sessionHistory = await this.getSessionHistory(userId);

      if (!storedData) {
        // 기본 데이터 구조 반환
        return {
          userId,
          level: 1,
          totalSessions: 0,
          completedStages: 0,
          totalStages: 0,
          lastStudyDate: '',
          accuracyHistory: [],
          sessionHistory
        };
      }

      const userData = JSON.parse(storedData);
      return {
        ...userData,
        sessionHistory
      };
    } catch (error) {
      throw new StatisticsError(
        `Failed to load user data from localStorage: ${error.message}`,
        'DATA_NOT_FOUND',
        userId
      );
    }
  }

  async getSessionHistory(userId: string, limit: number = 100): Promise<SessionRecord[]> {
    try {
      const storedSessions = localStorage.getItem(`${this.SESSIONS_KEY}_${userId}`);
      if (!storedSessions) return [];

      const sessions: SessionRecord[] = JSON.parse(storedSessions);
      return sessions
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.warn(`Failed to load session history from localStorage:`, error);
      return [];
    }
  }

  async updateUserProgress(userId: string, sessionData: SessionRecord): Promise<void> {
    try {
      // 기존 사용자 데이터 로드
      const userData = await this.getUserProgressData(userId);
      
      // 사용자 데이터 업데이트
      const updatedUserData = {
        ...userData,
        totalSessions: userData.totalSessions + 1,
        lastStudyDate: new Date().toISOString()
      };

      // 세션 히스토리 업데이트
      const sessions = await this.getSessionHistory(userId);
      sessions.unshift(sessionData);
      
      // 최대 200개 세션만 보관
      if (sessions.length > 200) {
        sessions.splice(200);
      }

      // 로컬 스토리지에 저장
      localStorage.setItem(
        `${this.USER_DATA_KEY}_${userId}`,
        JSON.stringify(updatedUserData)
      );
      localStorage.setItem(
        `${this.SESSIONS_KEY}_${userId}`,
        JSON.stringify(sessions)
      );
    } catch (error) {
      throw new StatisticsError(
        `Failed to update user progress in localStorage: ${error.message}`,
        'CALCULATION_ERROR',
        userId
      );
    }
  }
}