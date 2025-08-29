/**
 * 플러그인 레지스트리 - 중앙 집중식 플러그인 관리
 * @description Registry Pattern을 구현하여 플러그인들을 관리
 */

import { 
  IPlugin, 
  IPluginFactory, 
  PluginMetadata, 
  PluginConfig, 
  PluginEvent,
  PluginEventHandler,
  PluginStatus 
} from './IPlugin';
import { NonEmptyString, Result, Ok, Err, isNonEmptyString } from '@/types/core';

// 등록된 플러그인 정보
interface RegisteredPlugin {
  readonly factory: IPluginFactory;
  readonly instance?: IPlugin;
  readonly config?: PluginConfig;
  readonly registeredAt: number;
}

// 플러그인 검색 쿼리
interface PluginQuery {
  readonly type?: NonEmptyString;
  readonly name?: NonEmptyString;
  readonly status?: PluginStatus;
  readonly tags?: readonly string[];
}

/**
 * 플러그인 레지스트리 - 싱글톤
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  
  private readonly plugins = new Map<NonEmptyString, RegisteredPlugin>();
  private readonly typeIndex = new Map<NonEmptyString, Set<NonEmptyString>>();
  private readonly eventHandlers = new Map<string, Set<PluginEventHandler>>();
  
  private constructor() {}
  
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * 플러그인 팩토리 등록
   */
  register<T extends IPlugin>(
    name: NonEmptyString,
    factory: IPluginFactory<T>
  ): Result<void> {
    try {
      if (this.plugins.has(name)) {
        return Err(new Error(`Plugin '${name}' is already registered`));
      }

      const registered: RegisteredPlugin = {
        factory,
        registeredAt: Date.now()
      };

      this.plugins.set(name, registered);
      
      // 타입별 인덱스 업데이트
      const pluginType = factory.pluginType;
      if (!this.typeIndex.has(pluginType)) {
        this.typeIndex.set(pluginType, new Set());
      }
      this.typeIndex.get(pluginType)!.add(name);

      this.emit({
        type: 'statusChange',
        pluginName: name,
        timestamp: Date.now(),
        data: { status: 'registered' }
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 등록 해제
   */
  async unregister(name: NonEmptyString): Promise<Result<void>> {
    try {
      const registered = this.plugins.get(name);
      if (!registered) {
        return Err(new Error(`Plugin '${name}' is not registered`));
      }

      // 인스턴스가 있으면 정리
      if (registered.instance) {
        const disposeResult = await registered.instance.dispose();
        if (!disposeResult.success) {
          return disposeResult;
        }
      }

      // 타입 인덱스에서 제거
      const pluginType = registered.factory.pluginType;
      const typeSet = this.typeIndex.get(pluginType);
      if (typeSet) {
        typeSet.delete(name);
        if (typeSet.size === 0) {
          this.typeIndex.delete(pluginType);
        }
      }

      this.plugins.delete(name);

      this.emit({
        type: 'statusChange',
        pluginName: name,
        timestamp: Date.now(),
        data: { status: 'unregistered' }
      });

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 인스턴스 생성 또는 반환
   */
  async getInstance<T extends IPlugin>(
    name: NonEmptyString,
    config?: PluginConfig
  ): Promise<Result<T>> {
    try {
      const registered = this.plugins.get(name);
      if (!registered) {
        return Err(new Error(`Plugin '${name}' is not registered`));
      }

      // 이미 인스턴스가 있고 설정이 동일하면 재사용
      if (registered.instance && 
          JSON.stringify(registered.config) === JSON.stringify(config)) {
        return Ok(registered.instance as T);
      }

      // 새 인스턴스 생성
      const createResult = await registered.factory.create(config);
      if (!createResult.success) {
        return createResult;
      }

      const instance = createResult.data;
      
      // 초기화
      const initResult = await instance.initialize(config);
      if (!initResult.success) {
        return Err(initResult.error);
      }

      // 등록 정보 업데이트
      const updatedRegistered: RegisteredPlugin = {
        ...registered,
        instance,
        config
      };
      this.plugins.set(name, updatedRegistered);

      return Ok(instance as T);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 타입별 플러그인 검색
   */
  getPluginsByType(pluginType: NonEmptyString): readonly NonEmptyString[] {
    const typeSet = this.typeIndex.get(pluginType);
    return typeSet ? Array.from(typeSet) : [];
  }

  /**
   * 플러그인 검색
   */
  search(query: PluginQuery): readonly NonEmptyString[] {
    const results: NonEmptyString[] = [];

    for (const [name, registered] of this.plugins) {
      let matches = true;

      // 타입 필터
      if (query.type && registered.factory.pluginType !== query.type) {
        matches = false;
      }

      // 이름 필터
      if (query.name && name !== query.name) {
        matches = false;
      }

      // 상태 필터
      if (query.status && registered.instance?.status !== query.status) {
        matches = false;
      }

      // 태그 필터
      if (query.tags && query.tags.length > 0) {
        const metadata = registered.instance?.metadata || 
                        (registered.factory as any).metadata;
        const pluginTags = metadata?.tags || [];
        const hasMatchingTag = query.tags.some(tag => 
          pluginTags.includes(tag)
        );
        if (!hasMatchingTag) {
          matches = false;
        }
      }

      if (matches) {
        results.push(name);
      }
    }

    return results;
  }

  /**
   * 등록된 모든 플러그인 조회
   */
  getRegisteredPlugins(): readonly NonEmptyString[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 플러그인 메타데이터 조회
   */
  getMetadata(name: NonEmptyString): PluginMetadata | null {
    const registered = this.plugins.get(name);
    if (!registered) return null;
    
    return registered.instance?.metadata || 
           (registered.factory as any).metadata || null;
  }

  /**
   * 플러그인 상태 조회
   */
  getStatus(name: NonEmptyString): PluginStatus | null {
    const registered = this.plugins.get(name);
    if (!registered) return null;
    
    return registered.instance?.status || 'unloaded';
  }

  /**
   * 이벤트 핸들러 등록
   */
  on(event: string, handler: PluginEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 이벤트 핸들러 제거
   */
  off(event: string, handler: PluginEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * 이벤트 발생
   */
  private emit(event: PluginEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Plugin event handler error:', error);
        }
      });
    }
  }

  /**
   * 레지스트리 초기화 (테스트용)
   */
  async clear(): Promise<void> {
    const disposePromises = Array.from(this.plugins.values())
      .filter(registered => registered.instance)
      .map(registered => registered.instance!.dispose());

    await Promise.all(disposePromises);

    this.plugins.clear();
    this.typeIndex.clear();
    this.eventHandlers.clear();
  }
}

// 전역 레지스트리 인스턴스
export const pluginRegistry = PluginRegistry.getInstance();