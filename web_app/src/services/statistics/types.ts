/**
 * 통계 계산 서비스 타입 정의
 * @description 느슨한 결합을 위한 인터페이스와 타입 정의
 */

export interface UserProgressData {
  userId: string;
  level: number;
  totalSessions: number;
  completedStages: number;
  totalStages: number;
  lastStudyDate: string;
  accuracyHistory: number[];
  sessionHistory: SessionRecord[];
}

export interface SessionRecord {
  sessionId: string;
  level: number;
  stage: number;
  completedAt: string;
  accuracy: number;
  totalCards: number;
  correctAnswers: number;
  timeSpent: number;
}

export interface StatisticsMetrics {
  overallProgress: number;    // 전체 진행률 (0-100)
  averageAccuracy: number;    // 평균 정확도 (0-100)
  incorrectCount: number;     // 틀린 문제 수
  currentLevel: number;       // 현재 레벨
  streakDays: number;        // 연속 학습 일수
  totalStudyTime: number;    // 총 학습 시간 (분)
  weakAreas: string[];       // 약점 영역
}

export interface LevelProgressData {
  level: number;
  progress: number;          // 해당 레벨 진행률 (0-100)
  bestAccuracy: number;      // 해당 레벨 최고 정확도
  completedStages: number;   // 완료한 스테이지 수
  totalStages: number;       // 전체 스테이지 수
}

/**
 * 통계 계산 서비스 인터페이스
 * @description 의존성 역전 원칙을 위한 추상화
 */
export interface IStatisticsCalculator {
  calculateOverallMetrics(userData: UserProgressData): StatisticsMetrics;
  calculateLevelProgress(userData: UserProgressData, level: number): LevelProgressData;
  calculateAccuracyTrend(sessionHistory: SessionRecord[], days: number): number[];
  identifyWeakAreas(sessionHistory: SessionRecord[]): string[];
}

/**
 * 데이터 접근 추상화 인터페이스
 */
export interface IUserDataRepository {
  getUserProgressData(userId: string): Promise<UserProgressData>;
  getSessionHistory(userId: string, limit?: number): Promise<SessionRecord[]>;
  updateUserProgress(userId: string, sessionData: SessionRecord): Promise<void>;
}

/**
 * 통계 서비스 에러 타입
 */
export class StatisticsError extends Error {
  constructor(
    message: string,
    public readonly code: 'DATA_NOT_FOUND' | 'CALCULATION_ERROR' | 'INVALID_INPUT',
    public readonly userId?: string
  ) {
    super(message);
    this.name = 'StatisticsError';
  }
}