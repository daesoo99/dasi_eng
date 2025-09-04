/**
 * 통계 서비스 팩토리
 * @description 의존성 주입을 위한 팩토리 패턴
 */

import { IStatisticsCalculator, IUserDataRepository } from './types';
import { StatisticsCalculator } from './StatisticsCalculator';
import { 
  FirebaseUserDataRepository, 
  LocalStorageUserDataRepository 
} from './UserDataRepository';

/**
 * 통계 서비스 통합 클래스
 */
export class StatisticsService {
  constructor(
    private readonly calculator: IStatisticsCalculator,
    private readonly repository: IUserDataRepository
  ) {}

  /**
   * 사용자 전체 통계 메트릭 가져오기
   */
  async getUserStatistics(userId: string) {
    const userData = await this.repository.getUserProgressData(userId);
    return this.calculator.calculateOverallMetrics(userData);
  }

  /**
   * 레벨별 진행률 데이터 가져오기
   */
  async getLevelProgress(userId: string, level: number) {
    const userData = await this.repository.getUserProgressData(userId);
    return this.calculator.calculateLevelProgress(userData, level);
  }

  /**
   * 정확도 트렌드 데이터 가져오기
   */
  async getAccuracyTrend(userId: string, days: number = 7) {
    const sessionHistory = await this.repository.getSessionHistory(userId, days * 5);
    return this.calculator.calculateAccuracyTrend(sessionHistory, days);
  }

  /**
   * 새 세션 데이터 업데이트
   */
  async updateSessionData(userId: string, sessionData: any) {
    await this.repository.updateUserProgress(userId, sessionData);
  }
}

/**
 * 환경별 통계 서비스 팩토리
 */
export class StatisticsServiceFactory {
  private static instance: StatisticsService | null = null;

  /**
   * 환경에 따른 통계 서비스 인스턴스 생성
   */
  static createService(environment: 'production' | 'development' = 'development'): StatisticsService {
    if (this.instance) {
      return this.instance;
    }

    const calculator = new StatisticsCalculator();
    
    let repository: IUserDataRepository;
    
    if (environment === 'production') {
      // 프로덕션에서는 Firebase 사용
      const { getAuth } = require('firebase/auth');
      const { getFirestore } = require('firebase/firestore');
      
      repository = new FirebaseUserDataRepository(
        getFirestore(),
        getAuth()
      );
    } else {
      // 개발 환경에서는 LocalStorage 사용
      repository = new LocalStorageUserDataRepository();
    }

    this.instance = new StatisticsService(calculator, repository);
    return this.instance;
  }

  /**
   * 테스트용 서비스 생성 (의존성 주입)
   */
  static createTestService(
    calculator: IStatisticsCalculator,
    repository: IUserDataRepository
  ): StatisticsService {
    return new StatisticsService(calculator, repository);
  }

  /**
   * 싱글톤 인스턴스 리셋 (테스트용)
   */
  static resetInstance(): void {
    this.instance = null;
  }
}

/**
 * 편의를 위한 기본 서비스 인스턴스 exports
 */
export const statisticsService = StatisticsServiceFactory.createService(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);