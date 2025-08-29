/**
 * 플러그인 아키텍처 핵심 인터페이스
 * @description 모든 플러그인이 구현해야 하는 기본 인터페이스
 */

import { NonEmptyString, Result } from '@/types/core';

// 플러그인 메타데이터
export interface PluginMetadata {
  readonly name: NonEmptyString;
  readonly version: NonEmptyString;
  readonly description: string;
  readonly author: string;
  readonly dependencies?: readonly string[];
  readonly minSystemVersion?: NonEmptyString;
  readonly tags?: readonly string[];
}

// 플러그인 설정
export interface PluginConfig {
  readonly [key: string]: unknown;
}

// 플러그인 상태
export type PluginStatus = 
  | 'unloaded'    // 로드되지 않음
  | 'loading'     // 로드 중
  | 'loaded'      // 로드됨
  | 'initializing' // 초기화 중
  | 'ready'       // 사용 준비 완료
  | 'error'       // 오류 상태
  | 'disposing';  // 정리 중

// 플러그인 이벤트
export interface PluginEvent {
  readonly type: 'statusChange' | 'error' | 'configChange';
  readonly pluginName: NonEmptyString;
  readonly timestamp: number;
  readonly data?: unknown;
}

export type PluginEventHandler = (event: PluginEvent) => void;

// 핵심 플러그인 인터페이스
export interface IPlugin {
  // 메타데이터
  readonly metadata: PluginMetadata;
  
  // 현재 상태
  readonly status: PluginStatus;
  
  // 라이프사이클 메서드
  initialize(config?: PluginConfig): Promise<Result<void>>;
  dispose(): Promise<Result<void>>;
  
  // 설정 관리
  updateConfig(config: Partial<PluginConfig>): Promise<Result<void>>;
  getConfig(): PluginConfig;
  
  // 호환성 검사
  isCompatible(systemVersion: NonEmptyString): boolean;
  
  // 이벤트 처리
  on(event: string, handler: PluginEventHandler): void;
  off(event: string, handler: PluginEventHandler): void;
  emit(event: PluginEvent): void;
}

// 플러그인 팩토리 인터페이스
export interface IPluginFactory<T extends IPlugin = IPlugin> {
  readonly pluginType: NonEmptyString;
  create(config?: PluginConfig): Promise<Result<T>>;
  validateConfig(config: PluginConfig): Result<void>;
}

// 플러그인 라이더 인터페이스 (런타임에 동적 로드)
export interface PluginLoader {
  load(pluginPath: string): Promise<Result<IPluginFactory>>;
  unload(pluginName: NonEmptyString): Promise<Result<void>>;
  getLoadedPlugins(): readonly NonEmptyString[];
}