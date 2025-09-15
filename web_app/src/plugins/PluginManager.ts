/**
 * 통합 플러그인 매니저 (Facade Pattern)
 * @description 모든 플러그인 기능을 통합하여 간단한 API 제공
 */

import { IPlugin, IPluginFactory, PluginStatus } from './core/IPlugin';
import { pluginRegistry } from './core/PluginRegistry';
import { pluginLifecycle } from './core/PluginLifecycleManager';
import { pluginConfig, PluginConfigEntry } from './config/PluginConfig';
import { ISpeechPlugin } from './speech/ISpeechPlugin';
import { WebSpeechPluginFactory } from './speech/WebSpeechPluginFactory';
import { ISpeedTrainingPlugin } from './speed/ISpeedTrainingPlugin';
import { SpeedTrainingPluginFactory } from './speed/SpeedTrainingPluginFactory';
import { IPerformancePlugin } from './performance/IPerformancePlugin';
import { PerformancePluginFactory } from './performance/PerformancePluginFactory';
import { NonEmptyString, Result, Ok, Err, assertNonEmptyString, isNonEmptyString } from '@/types/core';

// 플러그인 초기화 옵션
export interface PluginManagerOptions {
  readonly environment?: 'development' | 'production' | 'test';
  readonly autoLoad?: boolean;
  readonly enableMetrics?: boolean;
  readonly loadTimeout?: number;
}

// 플러그인 조회 결과
export interface PluginInfo {
  readonly name: NonEmptyString;
  readonly status: PluginStatus;
  readonly implementation: string;
  readonly enabled: boolean;
  readonly loadTime?: number;
  readonly errorCount?: number;
}

/**
 * 통합 플러그인 매니저
 * @description 플러그인 시스템의 모든 기능을 통합한 단일 인터페이스
 */
export class PluginManager {
  private static instance: PluginManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * 플러그인 시스템 초기화
   */
  async initialize(options: PluginManagerOptions = {}): Promise<Result<void>> {
    if (this.initialized) {
      return Ok(undefined);
    }

    try {
      console.log('🔌 Initializing Plugin System...');

      // 1. 기본 플러그인 팩토리들 등록
      await this.registerBuiltinPlugins();

      // 2. 설정에서 로컬 스토리지 로드
      const loadConfigResult = pluginConfig.loadFromStorage();
      if (loadConfigResult.success) {
        console.log('📋 Plugin configuration loaded from storage');
      }

      // 3. 자동 로드 활성화된 플러그인들 로드
      if (options.autoLoad !== false) {
        await this.autoLoadPlugins();
      }

      // 4. 메트릭스 수집 시작
      if (options.enableMetrics !== false) {
        this.startMetricsCollection();
      }

      this.initialized = true;
      console.log('✅ Plugin System initialized successfully');
      
      return Ok(undefined);
    } catch (error) {
      console.error('❌ Plugin System initialization failed:', error);
      return Err(error as Error);
    }
  }

  /**
   * 내장 플러그인들 등록
   */
  private async registerBuiltinPlugins(): Promise<void> {
    const builtinPlugins: Array<{
      name: NonEmptyString;
      factory: IPluginFactory;
    }> = [
      {
        name: assertNonEmptyString('speech', 'plugin name'),
        factory: new WebSpeechPluginFactory()
      },
      {
        name: assertNonEmptyString('speed-training', 'plugin name'),
        factory: new SpeedTrainingPluginFactory()
      },
      {
        name: assertNonEmptyString('performance', 'plugin name'),
        factory: new PerformancePluginFactory()
      }
      // 향후 다른 플러그인들 추가
    ];

    for (const { name, factory } of builtinPlugins) {
      const result = await pluginLifecycle.registerPlugin(name, factory);
      if (result.success) {
        console.log(`📦 Registered plugin: ${name}`);
      } else {
        console.warn(`⚠️ Failed to register plugin ${name}:`, result.error);
      }
    }
  }

  /**
   * 자동 로드 대상 플러그인들 로드
   */
  private async autoLoadPlugins(): Promise<void> {
    const enabledPlugins = pluginConfig.getEnabledPlugins();
    const autoLoadPlugins = enabledPlugins.filter(({ config }) => !config.loadOnDemand);

    console.log(`🚀 Auto-loading ${autoLoadPlugins.length} plugins...`);

    for (const { name } of autoLoadPlugins) {
      const result = await pluginLifecycle.loadPlugin(name as NonEmptyString);
      if (result.success) {
        console.log(`✅ Auto-loaded plugin: ${name}`);
      } else {
        console.warn(`⚠️ Failed to auto-load plugin ${name}:`, result.error);
      }
    }
  }

  /**
   * 메트릭스 수집 시작
   */
  private startMetricsCollection(): void {
    // 주기적으로 메트릭스 수집 (개발용)
    if (pluginConfig.getEnvironment() === 'development') {
      setInterval(() => {
        const metrics = pluginLifecycle.getSystemMetrics();
        console.debug('📊 Plugin Metrics:', metrics);
      }, 30000); // 30초마다
    }
  }

  /**
   * Speech 플러그인 가져오기 (타입 안전)
   */
  async getSpeechPlugin(): Promise<Result<ISpeechPlugin>> {
    return this.getPlugin<ISpeechPlugin>('speech');
  }

  /**
   * Speed Training 플러그인 가져오기 (타입 안전)
   */
  async getSpeedTrainingPlugin(): Promise<Result<ISpeedTrainingPlugin>> {
    return this.getPlugin<ISpeedTrainingPlugin>('speed-training');
  }

  /**
   * Performance 플러그인 가져오기 (타입 안전)
   */
  async getPerformancePlugin(): Promise<Result<IPerformancePlugin>> {
    return this.getPlugin<IPerformancePlugin>('performance');
  }

  /**
   * 특정 타입의 플러그인 가져오기
   */
  async getPlugin<T extends IPlugin>(name: string): Promise<Result<T>> {
    if (!isNonEmptyString(name)) {
      return Err(new Error('Plugin name must be non-empty'));
    }

    const pluginName = name as NonEmptyString;
    
    // 이미 로드된 경우
    const loadedPlugins = pluginLifecycle.getLoadedPlugins();
    const loadedPlugin = loadedPlugins.get(pluginName);
    
    if (loadedPlugin?.instance) {
      return Ok(loadedPlugin.instance as T);
    }

    // 온디맨드 로딩
    const config = pluginConfig.getPluginConfig(name);
    if (config?.enabled) {
      const loadResult = await pluginLifecycle.loadPlugin(pluginName);
      if (loadResult.success) {
        return Ok(loadResult.data as T);
      }
      return Err(loadResult.error);
    }

    return Err(new Error(`Plugin '${name}' is not enabled or not found`));
  }

  /**
   * 플러그인 활성화/비활성화
   */
  async setPluginEnabled(name: string, enabled: boolean): Promise<Result<void>> {
    if (!isNonEmptyString(name)) {
      return Err(new Error('Plugin name must be non-empty'));
    }

    const pluginName = name as NonEmptyString;
    
    // 설정 업데이트
    const configResult = pluginConfig.setPluginEnabled(name, enabled);
    if (!configResult.success) {
      return configResult;
    }

    // 활성화: 로드하기
    if (enabled) {
      const loadResult = await pluginLifecycle.loadPlugin(pluginName);
      if (!loadResult.success) {
        return Err(loadResult.error);
      }
    } 
    // 비활성화: 언로드하기
    else {
      const unloadResult = await pluginLifecycle.unloadPlugin(pluginName);
      if (!unloadResult.success) {
        return Err(unloadResult.error);
      }
    }

    // 설정 저장
    pluginConfig.saveToStorage();

    return Ok(undefined);
  }

  /**
   * 플러그인 재시작
   */
  async restartPlugin(name: string): Promise<Result<IPlugin>> {
    if (!isNonEmptyString(name)) {
      return Err(new Error('Plugin name must be non-empty'));
    }

    return pluginLifecycle.restartPlugin(name as NonEmptyString);
  }

  /**
   * 모든 플러그인 정보 조회
   */
  getAllPlugins(): readonly PluginInfo[] {
    const registered = pluginRegistry.getRegisteredPlugins();
    const loaded = pluginLifecycle.getLoadedPlugins();

    return registered.map(name => {
      const config = pluginConfig.getPluginConfig(name);
      const loadedInfo = loaded.get(name);
      const status = pluginLifecycle.getPluginStatus(name);
      const metrics = pluginLifecycle.getPluginMetrics(name);

      return {
        name,
        status: status || 'unloaded',
        implementation: config?.implementation || 'unknown',
        enabled: config?.enabled || false,
        loadTime: metrics.loadTime || undefined,
        errorCount: metrics.errorCount || undefined
      };
    });
  }

  /**
   * 활성화된 플러그인들만 조회
   */
  getActivePlugins(): readonly PluginInfo[] {
    return this.getAllPlugins().filter(plugin => 
      plugin.enabled && plugin.status !== 'unloaded'
    );
  }

  /**
   * 플러그인 상태 조회
   */
  getPluginStatus(name: string): PluginStatus | null {
    if (!isNonEmptyString(name)) return null;
    return pluginLifecycle.getPluginStatus(name as NonEmptyString);
  }

  /**
   * 시스템 메트릭스 조회
   */
  getSystemMetrics() {
    return pluginLifecycle.getSystemMetrics();
  }

  /**
   * 플러그인 설정 업데이트
   */
  async updatePluginConfig(
    name: string, 
    config: Record<string, unknown>
  ): Promise<Result<void>> {
    if (!isNonEmptyString(name)) {
      return Err(new Error('Plugin name must be non-empty'));
    }

    const pluginName = name as NonEmptyString;
    
    // 설정 업데이트
    const updateResult = pluginConfig.updatePluginConfig(name, { config });
    if (!updateResult.success) {
      return updateResult;
    }

    // 로드된 플러그인이 있으면 설정 적용
    const loadedPlugins = pluginLifecycle.getLoadedPlugins();
    const loadedPlugin = loadedPlugins.get(pluginName);
    
    if (loadedPlugin?.instance) {
      const configUpdateResult = await loadedPlugin.instance.updateConfig(config);
      if (!configUpdateResult.success) {
        return Err(configUpdateResult.error);
      }
    }

    // 설정 저장
    pluginConfig.saveToStorage();

    return Ok(undefined);
  }

  /**
   * 플러그인 설정 내보내기
   */
  exportConfig(): string {
    return pluginConfig.exportConfig();
  }

  /**
   * 플러그인 설정 가져오기
   */
  async importConfig(configJson: string): Promise<Result<void>> {
    const importResult = pluginConfig.importConfig(configJson);
    if (!importResult.success) {
      return importResult;
    }

    // 설정 저장
    pluginConfig.saveToStorage();

    // 변경된 설정에 따라 플러그인 재로드
    await this.reloadAllPlugins();

    return Ok(undefined);
  }

  /**
   * 모든 플러그인 재로드
   */
  private async reloadAllPlugins(): Promise<void> {
    // 모든 플러그인 언로드
    await pluginLifecycle.unloadAllPlugins();
    
    // 자동 로드 플러그인들 다시 로드
    await this.autoLoadPlugins();
  }

  /**
   * 특정 타입의 플러그인들 검색
   */
  getPluginsByType(type: string): readonly PluginInfo[] {
    if (!isNonEmptyString(type)) return [];
    
    const pluginNames = pluginRegistry.getPluginsByType(type as NonEmptyString);
    return this.getAllPlugins().filter(plugin => 
      pluginNames.includes(plugin.name)
    );
  }

  /**
   * 플러그인이 사용 가능한지 확인
   */
  isPluginAvailable(name: string): boolean {
    if (!isNonEmptyString(name)) return false;
    
    const config = pluginConfig.getPluginConfig(name);
    const status = pluginLifecycle.getPluginStatus(name as NonEmptyString);
    
    return config?.enabled === true && status === 'ready';
  }

  /**
   * 시스템 종료 시 정리
   */
  async dispose(): Promise<Result<void>> {
    console.log('🔌 Shutting down Plugin System...');
    
    try {
      // 설정 저장
      pluginConfig.saveToStorage();
      
      // 모든 플러그인 정리
      const result = await pluginLifecycle.dispose();
      
      this.initialized = false;
      console.log('✅ Plugin System shut down successfully');
      
      return result;
    } catch (error) {
      console.error('❌ Plugin System shutdown failed:', error);
      return Err(error as Error);
    }
  }
}

// 전역 플러그인 매니저 인스턴스
export const pluginManager = PluginManager.getInstance();

// 편의 함수들
export const getSpeechPlugin = () => pluginManager.getSpeechPlugin();
export const getSpeedTrainingPlugin = () => pluginManager.getSpeedTrainingPlugin();
export const getPerformancePlugin = () => pluginManager.getPerformancePlugin();
export const getPlugin = <T extends IPlugin>(name: string) => pluginManager.getPlugin<T>(name);
export const isPluginAvailable = (name: string) => pluginManager.isPluginAvailable(name);