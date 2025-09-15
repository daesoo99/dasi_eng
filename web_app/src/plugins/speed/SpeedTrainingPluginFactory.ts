/**
 * Speed Training Plugin Factory
 * @description SpeedTrainingPlugin 인스턴스를 생성하는 팩토리
 * CLAUDE.local 규칙 준수: 플러그인 팩토리 패턴
 */

import { IPluginFactory, PluginConfig } from '@/plugins/core/IPlugin';
import { Result, Ok, Err, assertNonEmptyString } from '@/types/core';
import { SpeedTrainingPlugin } from './SpeedTrainingPlugin';
import { ISpeedTrainingPlugin, SpeedTrainingPluginConfig } from './ISpeedTrainingPlugin';

export class SpeedTrainingPluginFactory implements IPluginFactory<ISpeedTrainingPlugin> {
  readonly pluginType = assertNonEmptyString('speed-training', 'plugin type');

  async create(config?: PluginConfig): Promise<Result<ISpeedTrainingPlugin>> {
    try {
      const plugin = new SpeedTrainingPlugin();
      
      // 기본 설정과 사용자 설정 머지
      const defaultConfig: SpeedTrainingPluginConfig = {
        sessionCacheSize: 50,
        questionTimeoutMs: 30000,
        retryAttempts: 3,
        enableAnalytics: true,
        enablePerformanceTracking: true,
        enableAdaptiveDifficulty: false,
        showProgressIndicator: true,
        enableHints: false,
        autoProgressToNext: true,
        maxStoredSessions: 100,
        sessionExpiryHours: 24,
        enableOfflineMode: false
      };

      const mergedConfig = { ...defaultConfig, ...config };
      
      // 플러그인 초기화
      const initResult = await plugin.initialize(mergedConfig);
      if (!initResult.success) {
        return Err(initResult.error);
      }

      console.log('🏭 SpeedTrainingPlugin created successfully');
      return Ok(plugin);
    } catch (error) {
      console.error('❌ Failed to create SpeedTrainingPlugin:', error);
      return Err(error as Error);
    }
  }

  validateConfig(config: PluginConfig): Result<void> {
    try {
      // 설정 검증 로직
      if (config.sessionCacheSize && (typeof config.sessionCacheSize !== 'number' || config.sessionCacheSize < 1)) {
        return Err(new Error('sessionCacheSize must be a positive number'));
      }
      
      if (config.questionTimeoutMs && (typeof config.questionTimeoutMs !== 'number' || config.questionTimeoutMs < 1000)) {
        return Err(new Error('questionTimeoutMs must be at least 1000ms'));
      }
      
      if (config.retryAttempts && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
        return Err(new Error('retryAttempts must be a non-negative number'));
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }
}