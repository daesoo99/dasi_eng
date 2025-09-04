/**
 * 통계 서비스 모듈 exports
 * @description 클린 아키텍처 통계 서비스의 공개 API
 */

// Core types
export type {
  UserProgressData,
  SessionRecord,
  StatisticsMetrics,
  LevelProgressData,
  IStatisticsCalculator,
  IUserDataRepository
} from './types';

export { StatisticsError } from './types';

// Main services
export { StatisticsCalculator } from './StatisticsCalculator';
export { 
  FirebaseUserDataRepository, 
  LocalStorageUserDataRepository 
} from './UserDataRepository';
export { 
  StatisticsService, 
  StatisticsServiceFactory, 
  statisticsService 
} from './StatisticsServiceFactory';

// React Hook
export { useStatistics } from '../../hooks/useStatistics';