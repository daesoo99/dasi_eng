/**
 * 기본 플러그인 베이스 클래스
 * @description 모든 플러그인이 상속받을 수 있는 기본 구현체
 */

import { 
  IPlugin, 
  PluginMetadata, 
  PluginConfig, 
  PluginStatus, 
  PluginEvent,
  PluginEventHandler 
} from './IPlugin';
import { NonEmptyString, Result, Ok, Err } from '@/types/core';

/**
 * 추상 기본 플러그인 클래스
 */
export abstract class BasePlugin implements IPlugin {
  private _status: PluginStatus = 'unloaded';
  private _config: PluginConfig = {};
  private readonly _eventHandlers = new Map<string, Set<PluginEventHandler>>();

  constructor(
    public readonly metadata: PluginMetadata
  ) {}

  get status(): PluginStatus {
    return this._status;
  }

  protected setStatus(status: PluginStatus): void {
    if (this._status !== status) {
      const previousStatus = this._status;
      this._status = status;
      
      this.emit({
        type: 'statusChange',
        pluginName: this.metadata.name,
        timestamp: Date.now(),
        data: { 
          previousStatus, 
          newStatus: status 
        }
      });
    }
  }

  /**
   * 플러그인 초기화 - 하위 클래스에서 구현
   */
  async initialize(config: PluginConfig = {}): Promise<Result<void>> {
    try {
      this.setStatus('initializing');
      
      // 설정 검증
      const configValidation = this.validateConfig(config);
      if (!configValidation.success) {
        this.setStatus('error');
        return configValidation;
      }

      this._config = { ...this._config, ...config };

      // 하위 클래스의 초기화 로직 실행
      const initResult = await this.onInitialize(this._config);
      if (!initResult.success) {
        this.setStatus('error');
        return initResult;
      }

      this.setStatus('ready');
      return Ok(undefined);
    } catch (error) {
      this.setStatus('error');
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 정리 - 하위 클래스에서 구현
   */
  async dispose(): Promise<Result<void>> {
    try {
      this.setStatus('disposing');
      
      const disposeResult = await this.onDispose();
      if (!disposeResult.success) {
        return disposeResult;
      }

      // 이벤트 핸들러 정리
      this._eventHandlers.clear();
      
      this.setStatus('unloaded');
      return Ok(undefined);
    } catch (error) {
      this.setStatus('error');
      return Err(error as Error);
    }
  }

  /**
   * 설정 업데이트
   */
  async updateConfig(config: Partial<PluginConfig>): Promise<Result<void>> {
    try {
      const newConfig = { ...this._config, ...config };
      
      const configValidation = this.validateConfig(newConfig);
      if (!configValidation.success) {
        return configValidation;
      }

      const updateResult = await this.onConfigUpdate(newConfig);
      if (!updateResult.success) {
        return updateResult;
      }

      this._config = newConfig;
      
      this.emit({
        type: 'configChange',
        pluginName: this.metadata.name,
        timestamp: Date.now(),
        data: { config: newConfig }
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): PluginConfig {
    return { ...this._config };
  }

  /**
   * 호환성 검사 - 기본 구현
   */
  isCompatible(systemVersion: NonEmptyString): boolean {
    const { minSystemVersion } = this.metadata;
    if (!minSystemVersion) return true;

    // 간단한 버전 비교 (semver 방식)
    const parseVersion = (version: string) => 
      version.split('.').map(n => parseInt(n, 10));
    
    try {
      const minVer = parseVersion(minSystemVersion);
      const sysVer = parseVersion(systemVersion);
      
      for (let i = 0; i < Math.max(minVer.length, sysVer.length); i++) {
        const minPart = minVer[i] || 0;
        const sysPart = sysVer[i] || 0;
        
        if (sysPart < minPart) return false;
        if (sysPart > minPart) return true;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 이벤트 핸들러 등록
   */
  on(event: string, handler: PluginEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
  }

  /**
   * 이벤트 핸들러 제거
   */
  off(event: string, handler: PluginEventHandler): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._eventHandlers.delete(event);
      }
    }
  }

  /**
   * 이벤트 발생
   */
  emit(event: PluginEvent): void {
    const handlers = this._eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Plugin ${this.metadata.name} event handler error:`, error);
        }
      });
    }
  }

  /**
   * 보호된 메서드들 - 하위 클래스에서 구현
   */
  
  /**
   * 초기화 로직 구현
   */
  protected abstract onInitialize(config: PluginConfig): Promise<Result<void>>;

  /**
   * 정리 로직 구현
   */
  protected abstract onDispose(): Promise<Result<void>>;

  /**
   * 설정 업데이트 로직 구현
   */
  protected async onConfigUpdate(config: PluginConfig): Promise<Result<void>> {
    // 기본적으로는 아무것도 하지 않음 - 필요시 오버라이드
    return Ok(undefined);
  }

  /**
   * 설정 검증 로직 - 하위 클래스에서 오버라이드 가능
   */
  protected validateConfig(config: PluginConfig): Result<void> {
    // 기본적으로는 항상 성공 - 필요시 오버라이드
    return Ok(undefined);
  }

  /**
   * 유틸리티 메서드들
   */
  
  /**
   * 안전한 비동기 작업 실행
   */
  protected async safeAsync<T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<Result<T>> {
    try {
      const result = await operation();
      return Ok(result);
    } catch (error) {
      const message = errorMessage || 'Plugin operation failed';
      console.error(`${this.metadata.name}: ${message}`, error);
      return Err(error as Error);
    }
  }

  /**
   * 의존성 검사
   */
  protected checkDependencies(availablePlugins: readonly string[]): Result<void> {
    const { dependencies = [] } = this.metadata;
    
    const missingDeps = dependencies.filter(dep => 
      !availablePlugins.includes(dep)
    );

    if (missingDeps.length > 0) {
      return Err(new Error(
        `Missing dependencies: ${missingDeps.join(', ')}`
      ));
    }

    return Ok(undefined);
  }
}