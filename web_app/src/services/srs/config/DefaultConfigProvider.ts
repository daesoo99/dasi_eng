/**
 * 기본 SRS 설정 제공자
 * ISRSConfigProvider 인터페이스 구현체
 */

import { ISRSConfigProvider, SRSConfig } from '../interfaces/ISRSEngine';

export class DefaultConfigProvider implements ISRSConfigProvider {
  private readonly defaultConfig: SRSConfig = {
    minEaseFactor: 1.3,
    maxEaseFactor: 3.5,
    initialEaseFactor: 2.5,
    easeBonus: 0.15,
    easePenalty: -0.20,
    minInterval: 1,
    maxInterval: 90, // ~3개월 최대 (언어학습 최적화)
    learningSteps: [1, 10], // minutes
    graduatingInterval: 1, // days
    easyInterval: 4, // days
    initialMemoryStrength: 0.3,
    memoryDecayRate: 0.05,
    difficultyWeight: 0.3,
    timeWeight: 0.2,
    passingGrade: 3,
    easyGrade: 4
  };

  private readonly levelConfigs: Map<number, Partial<SRSConfig>> = new Map([
    [1, {
      // 초급자용 - 더 보수적인 간격
      minInterval: 1,
      maxInterval: 30,
      initialEaseFactor: 2.2,
      easePenalty: -0.15 // 덜 엄격한 처벌
    }],
    [2, {
      minInterval: 1,
      maxInterval: 60,
      initialEaseFactor: 2.3,
    }],
    [3, {
      // 중급자용 - 표준 설정
      initialEaseFactor: 2.5,
    }],
    [4, {
      // 고급자용 - 더 도전적인 간격
      minInterval: 2,
      maxInterval: 180,
      initialEaseFactor: 2.7,
      easeBonus: 0.20
    }],
    [5, {
      minInterval: 3,
      maxInterval: 365,
      initialEaseFactor: 2.8,
      easeBonus: 0.25
    }]
  ]);

  getDefaultConfig(): SRSConfig {
    return { ...this.defaultConfig };
  }

  getConfigForLevel(level: number): Partial<SRSConfig> {
    return { ...this.levelConfigs.get(level) } || {};
  }

  async getConfigForUser(userId: string): Promise<Partial<SRSConfig>> {
    // localStorage에서 사용자별 설정 로드
    try {
      const userConfig = localStorage.getItem(`srs_user_config_${userId}`);
      return userConfig ? JSON.parse(userConfig) : {};
    } catch (error) {
      console.warn('Failed to load user config:', error);
      return {};
    }
  }

  async saveUserConfig(userId: string, config: Partial<SRSConfig>): Promise<void> {
    try {
      localStorage.setItem(`srs_user_config_${userId}`, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save user config:', error);
      throw new Error(`Failed to save user config: ${error}`);
    }
  }

  /**
   * 성능 기반 적응형 설정 조정
   */
  adaptConfigBasedOnPerformance(
    currentConfig: SRSConfig,
    performanceMetrics: {
      accuracy: number;
      retention: number;
      studyFrequency: number;
    }
  ): Partial<SRSConfig> {
    const { accuracy, retention, studyFrequency } = performanceMetrics;
    const adjustments: Partial<SRSConfig> = {};

    // 정확도가 높으면 간격을 늘림
    if (accuracy > 0.9 && retention > 0.85) {
      adjustments.easeBonus = Math.min(0.30, currentConfig.easeBonus + 0.05);
      adjustments.initialEaseFactor = Math.min(3.0, currentConfig.initialEaseFactor + 0.1);
    }

    // 정확도가 낮으면 간격을 줄임
    if (accuracy < 0.6 || retention < 0.5) {
      adjustments.easePenalty = Math.max(-0.30, currentConfig.easePenalty - 0.05);
      adjustments.initialEaseFactor = Math.max(2.0, currentConfig.initialEaseFactor - 0.1);
    }

    // 학습 빈도가 낮으면 최대 간격 제한
    if (studyFrequency < 0.3) {
      adjustments.maxInterval = Math.min(30, currentConfig.maxInterval);
    }

    return adjustments;
  }

  /**
   * 패턴별 맞춤 설정
   */
  getConfigForPattern(patternType: string, userLevel: number): Partial<SRSConfig> {
    const baseConfig = this.getConfigForLevel(userLevel);
    
    switch (patternType) {
      case 'grammar':
        return {
          ...baseConfig,
          learningSteps: [5, 15], // 문법은 더 신중하게
          difficultyWeight: 0.4
        };
        
      case 'vocabulary':
        return {
          ...baseConfig,
          learningSteps: [1, 10], // 단어는 빠르게
          difficultyWeight: 0.2
        };
        
      case 'listening':
        return {
          ...baseConfig,
          timeWeight: 0.4, // 반응 시간 중요
          learningSteps: [3, 12]
        };
        
      default:
        return baseConfig;
    }
  }
}