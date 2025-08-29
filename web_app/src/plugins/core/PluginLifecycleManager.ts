/**
 * 플러그인 라이프사이클 매니저
 * @description 플러그인의 전체 라이프사이클을 관리 (로드, 초기화, 실행, 정리)
 */

import { 
  IPlugin, 
  IPluginFactory, 
  PluginStatus, 
  PluginEvent,
  PluginEventHandler 
} from './IPlugin';
import { pluginRegistry } from './PluginRegistry';
import { pluginConfig, PluginConfigEntry } from '@/plugins/config/PluginConfig';
import { NonEmptyString, Result, Ok, Err, isNonEmptyString } from '@/types/core';

// 라이프사이클 이벤트
interface LifecycleEvent {
  readonly type: 'load' | 'initialize' | 'start' | 'stop' | 'error' | 'metrics';
  readonly pluginName: NonEmptyString;
  readonly timestamp: number;
  readonly data?: unknown;
}

type LifecycleEventHandler = (event: LifecycleEvent) => void;

// 플러그인 메트릭스
interface PluginMetrics {
  readonly loadTime: number;
  readonly initTime: number;
  readonly errorCount: number;
  readonly restartCount: number;
  readonly lastActivity: number;
  readonly memoryUsage?: number;
}

// 로드된 플러그인 정보
interface LoadedPluginInfo {
  readonly factory: IPluginFactory;
  readonly instance?: IPlugin;
  readonly status: PluginStatus;
  readonly config: PluginConfigEntry;
  readonly metrics: PluginMetrics;
  readonly dependencies: readonly string[];
  readonly dependents: readonly string[];
}

/**
 * 플러그인 라이프사이클 매니저
 */
export class PluginLifecycleManager {
  private static instance: PluginLifecycleManager;
  
  private readonly loadedPlugins = new Map<NonEmptyString, LoadedPluginInfo>();
  private readonly loadPromises = new Map<NonEmptyString, Promise<Result<IPlugin>>>();
  private readonly lifecycleHandlers = new Set<LifecycleEventHandler>();
  
  private readonly maxConcurrentLoads: number;
  private readonly loadTimeoutMs: number;
  private currentConcurrentLoads = 0;
  
  private constructor() {
    const performanceConfig = pluginConfig.getPerformanceConfig();
    this.maxConcurrentLoads = performanceConfig.maxConcurrentLoads;
    this.loadTimeoutMs = performanceConfig.loadTimeoutMs;
    
    // 설정 변경 감지
    pluginConfig.addChangeListener(this.onConfigChange.bind(this));
  }

  static getInstance(): PluginLifecycleManager {
    if (!PluginLifecycleManager.instance) {
      PluginLifecycleManager.instance = new PluginLifecycleManager();
    }
    return PluginLifecycleManager.instance;
  }

  /**
   * 플러그인 팩토리 등록 및 자동 로드
   */
  async registerPlugin<T extends IPlugin>(
    name: NonEmptyString,
    factory: IPluginFactory<T>
  ): Promise<Result<void>> {
    try {
      // 레지스트리에 등록
      const registerResult = pluginRegistry.register(name, factory);
      if (!registerResult.success) {
        return registerResult;
      }

      // 설정 확인하여 자동 로드 여부 결정
      const config = pluginConfig.getPluginConfig(name);
      if (config?.enabled && !config.loadOnDemand) {
        const loadResult = await this.loadPlugin(name);
        if (!loadResult.success) {
          console.warn(`Failed to auto-load plugin ${name}:`, loadResult.error);
        }
      }

      this.emitLifecycleEvent({
        type: 'load',
        pluginName: name,
        timestamp: Date.now(),
        data: { action: 'registered' }
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 로드 (팩토리에서 인스턴스 생성)
   */
  async loadPlugin(name: NonEmptyString): Promise<Result<IPlugin>> {
    // 이미 로드 중이면 기존 Promise 반환
    if (this.loadPromises.has(name)) {
      return this.loadPromises.get(name)!;
    }

    // 동시 로드 제한
    if (this.currentConcurrentLoads >= this.maxConcurrentLoads) {
      return Err(new Error('Maximum concurrent plugin loads exceeded'));
    }

    const loadPromise = this.performLoad(name);
    this.loadPromises.set(name, loadPromise);
    
    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadPromises.delete(name);
    }
  }

  private async performLoad(name: NonEmptyString): Promise<Result<IPlugin>> {
    const startTime = Date.now();
    this.currentConcurrentLoads++;

    try {
      // 설정 확인
      const config = pluginConfig.getPluginConfig(name);
      if (!config?.enabled) {
        return Err(new Error(`Plugin ${name} is not enabled`));
      }

      // 의존성 확인
      const dependencyCheck = await this.checkAndLoadDependencies(name);
      if (!dependencyCheck.success) {
        return dependencyCheck;
      }

      // 타임아웃 설정
      const timeoutPromise = new Promise<Result<IPlugin>>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Plugin ${name} load timeout`));
        }, this.loadTimeoutMs);
      });

      // 실제 로드 작업
      const loadPromise = this.doLoad(name, config);
      
      const result = await Promise.race([loadPromise, timeoutPromise]);
      
      if (result.success) {
        const loadTime = Date.now() - startTime;
        this.updatePluginInfo(name, {
          instance: result.data,
          status: result.data.status,
          metrics: {
            ...this.getPluginMetrics(name),
            loadTime,
            lastActivity: Date.now()
          }
        });

        this.emitLifecycleEvent({
          type: 'load',
          pluginName: name,
          timestamp: Date.now(),
          data: { 
            action: 'loaded', 
            loadTime,
            status: result.data.status 
          }
        });
      }

      return result;
    } catch (error) {
      this.emitLifecycleEvent({
        type: 'error',
        pluginName: name,
        timestamp: Date.now(),
        data: { 
          action: 'load', 
          error: error instanceof Error ? error.message : String(error) 
        }
      });
      
      return Err(error as Error);
    } finally {
      this.currentConcurrentLoads--;
    }
  }

  private async doLoad(
    name: NonEmptyString, 
    config: PluginConfigEntry
  ): Promise<Result<IPlugin>> {
    // 레지스트리에서 인스턴스 생성
    const instanceResult = await pluginRegistry.getInstance(name, config.config);
    if (!instanceResult.success) {
      return instanceResult;
    }

    const instance = instanceResult.data;

    // 플러그인 정보 업데이트
    const factory = this.getRegisteredFactory(name);
    if (factory) {
      const metrics: PluginMetrics = {
        loadTime: 0, // 나중에 업데이트됨
        initTime: 0,
        errorCount: 0,
        restartCount: 0,
        lastActivity: Date.now()
      };

      this.loadedPlugins.set(name, {
        factory,
        instance,
        status: instance.status,
        config,
        metrics,
        dependencies: [],
        dependents: []
      });
    }

    return Ok(instance);
  }

  /**
   * 플러그인 언로드
   */
  async unloadPlugin(name: NonEmptyString): Promise<Result<void>> {
    try {
      const pluginInfo = this.loadedPlugins.get(name);
      if (!pluginInfo?.instance) {
        return Ok(undefined); // 이미 언로드됨
      }

      // 의존하는 플러그인들 먼저 언로드
      for (const dependentName of pluginInfo.dependents) {
        await this.unloadPlugin(dependentName as NonEmptyString);
      }

      // 플러그인 정리
      const disposeResult = await pluginInfo.instance.dispose();
      if (!disposeResult.success) {
        return disposeResult;
      }

      // 정보 제거
      this.loadedPlugins.delete(name);

      // 레지스트리에서 제거
      await pluginRegistry.unregister(name);

      this.emitLifecycleEvent({
        type: 'stop',
        pluginName: name,
        timestamp: Date.now(),
        data: { action: 'unloaded' }
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 모든 활성 플러그인 언로드
   */
  async unloadAllPlugins(): Promise<Result<void>> {
    try {
      const loadedNames = Array.from(this.loadedPlugins.keys());
      
      // 의존성 순서를 고려하여 역순으로 언로드
      const sortedNames = this.sortPluginsByDependencies(loadedNames).reverse();
      
      for (const name of sortedNames) {
        const result = await this.unloadPlugin(name);
        if (!result.success) {
          console.error(`Failed to unload plugin ${name}:`, result.error);
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 재시작
   */
  async restartPlugin(name: NonEmptyString): Promise<Result<IPlugin>> {
    try {
      // 언로드
      const unloadResult = await this.unloadPlugin(name);
      if (!unloadResult.success) {
        return Err(unloadResult.error);
      }

      // 재시작 카운트 증가
      const metrics = this.getPluginMetrics(name);
      this.updatePluginMetrics(name, {
        ...metrics,
        restartCount: metrics.restartCount + 1
      });

      // 다시 로드
      const loadResult = await this.loadPlugin(name);
      
      this.emitLifecycleEvent({
        type: 'start',
        pluginName: name,
        timestamp: Date.now(),
        data: { action: 'restarted' }
      });

      return loadResult;
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 상태 조회
   */
  getPluginStatus(name: NonEmptyString): PluginStatus | null {
    const pluginInfo = this.loadedPlugins.get(name);
    return pluginInfo?.status || null;
  }

  /**
   * 로드된 모든 플러그인 조회
   */
  getLoadedPlugins(): ReadonlyMap<NonEmptyString, LoadedPluginInfo> {
    return new Map(this.loadedPlugins);
  }

  /**
   * 플러그인 메트릭스 조회
   */
  getPluginMetrics(name: NonEmptyString): PluginMetrics {
    const pluginInfo = this.loadedPlugins.get(name);
    return pluginInfo?.metrics || {
      loadTime: 0,
      initTime: 0,
      errorCount: 0,
      restartCount: 0,
      lastActivity: 0
    };
  }

  /**
   * 전체 시스템 메트릭스 조회
   */
  getSystemMetrics(): {
    totalPlugins: number;
    loadedPlugins: number;
    errorCount: number;
    averageLoadTime: number;
    memoryUsage: number;
  } {
    const loaded = Array.from(this.loadedPlugins.values());
    const totalErrors = loaded.reduce((sum, info) => sum + info.metrics.errorCount, 0);
    const avgLoadTime = loaded.length > 0 
      ? loaded.reduce((sum, info) => sum + info.metrics.loadTime, 0) / loaded.length 
      : 0;

    return {
      totalPlugins: pluginRegistry.getRegisteredPlugins().length,
      loadedPlugins: loaded.length,
      errorCount: totalErrors,
      averageLoadTime: avgLoadTime,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * 의존성 확인 및 로드
   */
  private async checkAndLoadDependencies(name: NonEmptyString): Promise<Result<void>> {
    const factory = this.getRegisteredFactory(name);
    if (!factory) {
      return Err(new Error(`Plugin factory ${name} not found`));
    }

    // 의존성 정보가 메타데이터에 있다면 확인
    const metadata = (factory as any).metadata;
    const dependencies = metadata?.dependencies || [];

    for (const depName of dependencies) {
      if (!this.isPluginLoaded(depName as NonEmptyString)) {
        const loadResult = await this.loadPlugin(depName as NonEmptyString);
        if (!loadResult.success) {
          return Err(new Error(`Failed to load dependency ${depName}: ${loadResult.error}`));
        }
      }
    }

    return Ok(undefined);
  }

  private isPluginLoaded(name: NonEmptyString): boolean {
    const pluginInfo = this.loadedPlugins.get(name);
    return pluginInfo?.instance != null;
  }

  private getRegisteredFactory(name: NonEmptyString): IPluginFactory | null {
    // pluginRegistry에서 팩토리 조회 (내부 구현에 접근)
    return (pluginRegistry as any).plugins.get(name)?.factory || null;
  }

  private sortPluginsByDependencies(names: NonEmptyString[]): NonEmptyString[] {
    // 단순한 토폴로지 정렬 (실제로는 더 복잡한 구현 필요)
    return names.sort((a, b) => {
      const aInfo = this.loadedPlugins.get(a);
      const bInfo = this.loadedPlugins.get(b);
      return (aInfo?.dependencies.length || 0) - (bInfo?.dependencies.length || 0);
    });
  }

  private updatePluginInfo(
    name: NonEmptyString, 
    updates: Partial<LoadedPluginInfo>
  ): void {
    const current = this.loadedPlugins.get(name);
    if (current) {
      this.loadedPlugins.set(name, { ...current, ...updates });
    }
  }

  private updatePluginMetrics(name: NonEmptyString, metrics: PluginMetrics): void {
    const current = this.loadedPlugins.get(name);
    if (current) {
      this.loadedPlugins.set(name, { ...current, metrics });
    }
  }

  private estimateMemoryUsage(): number {
    // 간단한 메모리 사용량 추정
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private onConfigChange(newConfig: any): void {
    // 설정 변경 시 플러그인 재로드 처리
    const features = newConfig.features;
    if (features.hotReload) {
      // Hot reload 로직 구현
      this.handleHotReload(newConfig);
    }
  }

  private async handleHotReload(newConfig: any): Promise<void> {
    // Hot reload 구현 (개발 환경에서만)
    console.log('Hot reloading plugins with new config...');
  }

  /**
   * 라이프사이클 이벤트 핸들러 등록
   */
  onLifecycleEvent(handler: LifecycleEventHandler): void {
    this.lifecycleHandlers.add(handler);
  }

  offLifecycleEvent(handler: LifecycleEventHandler): void {
    this.lifecycleHandlers.delete(handler);
  }

  private emitLifecycleEvent(event: LifecycleEvent): void {
    this.lifecycleHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Lifecycle event handler error:', error);
      }
    });
  }

  /**
   * 시스템 정리 (앱 종료 시)
   */
  async dispose(): Promise<Result<void>> {
    const result = await this.unloadAllPlugins();
    this.lifecycleHandlers.clear();
    return result;
  }
}

// 전역 라이프사이클 매니저
export const pluginLifecycle = PluginLifecycleManager.getInstance();