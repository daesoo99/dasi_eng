/**
 * Mock SRS 설정 제공자 (테스트용)
 * ISRSConfigProvider 인터페이스 구현체
 */

import { ISRSConfigProvider, SRSConfig } from '../interfaces/ISRSEngine';

export class MockConfigProvider implements ISRSConfigProvider {
  private readonly testConfig: SRSConfig = {
    minEaseFactor: 1.3,
    maxEaseFactor: 2.5, // 테스트용으로 범위 축소
    initialEaseFactor: 2.0,
    easeBonus: 0.1,
    easePenalty: -0.1,
    minInterval: 1,
    maxInterval: 30, // 테스트용으로 최대 30일
    learningSteps: [1, 5], // 짧은 학습 단계
    graduatingInterval: 1,
    easyInterval: 2,
    initialMemoryStrength: 0.5,
    memoryDecayRate: 0.1, // 빠른 망각
    difficultyWeight: 0.2,
    timeWeight: 0.1,
    passingGrade: 3,
    easyGrade: 4
  };

  private userConfigs = new Map<string, Partial<SRSConfig>>();

  getDefaultConfig(): SRSConfig {
    return { ...this.testConfig };
  }

  getConfigForLevel(level: number): Partial<SRSConfig> {
    // 테스트용으로 레벨별 차이 최소화
    return {
      initialEaseFactor: 2.0 + (level * 0.1),
      maxInterval: Math.min(30, 5 + level * 5)
    };
  }

  async getConfigForUser(userId: string): Promise<Partial<SRSConfig>> {
    return { ...this.userConfigs.get(userId) } || {};
  }

  async saveUserConfig(userId: string, config: Partial<SRSConfig>): Promise<void> {
    this.userConfigs.set(userId, { ...config });
  }

  /**
   * 테스트용 - 사용자 설정 직접 설정
   */
  setUserConfigForTest(userId: string, config: Partial<SRSConfig>): void {
    this.userConfigs.set(userId, config);
  }

  /**
   * 테스트용 - 모든 사용자 설정 초기화
   */
  clearAllUserConfigs(): void {
    this.userConfigs.clear();
  }

  /**
   * 테스트용 - 결정적 설정 제공
   */
  getDeterministicConfig(): SRSConfig {
    return {
      minEaseFactor: 1.5,
      maxEaseFactor: 2.0,
      initialEaseFactor: 1.8,
      easeBonus: 0.1,
      easePenalty: -0.1,
      minInterval: 1,
      maxInterval: 10,
      learningSteps: [1, 3],
      graduatingInterval: 1,
      easyInterval: 2,
      initialMemoryStrength: 0.6,
      memoryDecayRate: 0.05,
      difficultyWeight: 0.1,
      timeWeight: 0.1,
      passingGrade: 3,
      easyGrade: 4
    };
  }
}