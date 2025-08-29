/**
 * 플러그인 설정 관리 시스템
 * @description 설정 기반 플러그인 활성화/비활성화 및 구성 관리
 */

import { NonEmptyString, Result, Ok, Err, isNonEmptyString } from '@/types/core';

// 플러그인 설정 타입
export interface PluginConfigEntry {
  readonly enabled: boolean;
  readonly implementation: string;
  readonly config: Record<string, unknown>;
  readonly priority?: number;
  readonly loadOnDemand?: boolean;
}

// 전역 플러그인 설정
export interface GlobalPluginConfig {
  readonly plugins: Record<string, PluginConfigEntry>;
  readonly environment: 'development' | 'production' | 'test';
  readonly features: {
    readonly autoLoad: boolean;
    readonly lazyLoading: boolean;
    readonly hotReload: boolean;
    readonly debugging: boolean;
  };
  readonly performance: {
    readonly maxConcurrentLoads: number;
    readonly loadTimeoutMs: number;
    readonly enableMetrics: boolean;
  };
}

// 기본 설정
const DEFAULT_CONFIG: GlobalPluginConfig = {
  plugins: {
    speech: {
      enabled: true,
      implementation: 'web',
      config: {
        recognitionLanguage: 'ko-KR',
        synthesisLanguage: 'ko-KR',
        speechRate: 1.0,
        enableContinuous: false,
        enableInterimResults: true,
        autoRestart: false
      },
      priority: 1,
      loadOnDemand: false
    },
    audioProcessor: {
      enabled: true,
      implementation: 'advanced',
      config: {
        sampleRate: 44100,
        bufferSize: 2048,
        enableNoiseReduction: true,
        enableEcho: false
      },
      priority: 2,
      loadOnDemand: true
    },
    analytics: {
      enabled: false, // 기본적으로 비활성화
      implementation: 'google',
      config: {
        trackingId: '',
        anonymizeIp: true,
        enableEvents: true
      },
      priority: 10,
      loadOnDemand: true
    }
  },
  environment: 'development',
  features: {
    autoLoad: true,
    lazyLoading: true,
    hotReload: false, // 개발 환경에서만 true
    debugging: true
  },
  performance: {
    maxConcurrentLoads: 3,
    loadTimeoutMs: 10000,
    enableMetrics: false
  }
};

// 환경별 설정 오버라이드
const ENVIRONMENT_OVERRIDES: Record<string, Partial<GlobalPluginConfig>> = {
  production: {
    features: {
      autoLoad: true,
      lazyLoading: true,
      hotReload: false,
      debugging: false
    },
    performance: {
      maxConcurrentLoads: 5,
      loadTimeoutMs: 5000,
      enableMetrics: true
    },
    plugins: {
      analytics: {
        enabled: true,
        implementation: 'google',
        config: {
          trackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
          anonymizeIp: true,
          enableEvents: true
        },
        priority: 10,
        loadOnDemand: true
      }
    }
  },
  test: {
    plugins: {
      speech: {
        enabled: true,
        implementation: 'mock',
        config: {
          mockResponses: true,
          simulateLatency: false
        },
        priority: 1,
        loadOnDemand: false
      },
      audioProcessor: {
        enabled: false,
        implementation: 'mock',
        config: {},
        priority: 2,
        loadOnDemand: false
      },
      analytics: {
        enabled: false,
        implementation: 'mock',
        config: {},
        priority: 10,
        loadOnDemand: false
      }
    },
    features: {
      autoLoad: false,
      lazyLoading: false,
      hotReload: false,
      debugging: true
    },
    performance: {
      maxConcurrentLoads: 1,
      loadTimeoutMs: 1000,
      enableMetrics: false
    }
  }
};

/**
 * 플러그인 설정 매니저
 */
export class PluginConfigManager {
  private static instance: PluginConfigManager;
  private config: GlobalPluginConfig;
  private listeners = new Set<(config: GlobalPluginConfig) => void>();

  private constructor(environment?: string) {
    this.config = this.buildConfig(environment);
  }

  static getInstance(environment?: string): PluginConfigManager {
    if (!PluginConfigManager.instance) {
      PluginConfigManager.instance = new PluginConfigManager(environment);
    }
    return PluginConfigManager.instance;
  }

  private buildConfig(environment?: string): GlobalPluginConfig {
    const env = environment || import.meta.env.MODE || 'development';
    const override = ENVIRONMENT_OVERRIDES[env] || {};
    
    return this.deepMerge(DEFAULT_CONFIG, override);
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof T] = this.deepMerge(
          result[key as keyof T] as any, 
          value
        );
      } else {
        result[key as keyof T] = value;
      }
    }
    
    return result;
  }

  /**
   * 전체 설정 반환
   */
  getConfig(): GlobalPluginConfig {
    return { ...this.config };
  }

  /**
   * 특정 플러그인 설정 반환
   */
  getPluginConfig(pluginName: string): PluginConfigEntry | null {
    return this.config.plugins[pluginName] || null;
  }

  /**
   * 플러그인이 활성화되어 있는지 확인
   */
  isPluginEnabled(pluginName: string): boolean {
    const pluginConfig = this.getPluginConfig(pluginName);
    return pluginConfig?.enabled ?? false;
  }

  /**
   * 활성화된 플러그인 목록 반환
   */
  getEnabledPlugins(): Array<{ name: string; config: PluginConfigEntry }> {
    return Object.entries(this.config.plugins)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({ name, config }))
      .sort((a, b) => (a.config.priority || 999) - (b.config.priority || 999));
  }

  /**
   * 플러그인 구현체 반환
   */
  getPluginImplementation(pluginName: string): string | null {
    const pluginConfig = this.getPluginConfig(pluginName);
    return pluginConfig?.implementation || null;
  }

  /**
   * 플러그인 설정 업데이트
   */
  updatePluginConfig(
    pluginName: string, 
    updates: Partial<PluginConfigEntry>
  ): Result<void> {
    try {
      if (!isNonEmptyString(pluginName)) {
        return Err(new Error('Plugin name must be a non-empty string'));
      }

      const currentConfig = this.config.plugins[pluginName] || {
        enabled: false,
        implementation: 'default',
        config: {}
      };

      this.config = {
        ...this.config,
        plugins: {
          ...this.config.plugins,
          [pluginName]: {
            ...currentConfig,
            ...updates,
            config: {
              ...currentConfig.config,
              ...(updates.config || {})
            }
          }
        }
      };

      this.notifyListeners();
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 플러그인 활성화/비활성화
   */
  setPluginEnabled(pluginName: string, enabled: boolean): Result<void> {
    return this.updatePluginConfig(pluginName, { enabled });
  }

  /**
   * 플러그인 구현체 변경
   */
  setPluginImplementation(
    pluginName: string, 
    implementation: string
  ): Result<void> {
    return this.updatePluginConfig(pluginName, { implementation });
  }

  /**
   * 환경 설정 반환
   */
  getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * 기능 설정 반환
   */
  getFeatures(): GlobalPluginConfig['features'] {
    return { ...this.config.features };
  }

  /**
   * 성능 설정 반환
   */
  getPerformanceConfig(): GlobalPluginConfig['performance'] {
    return { ...this.config.performance };
  }

  /**
   * 설정 변경 리스너 등록
   */
  addChangeListener(listener: (config: GlobalPluginConfig) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 설정 변경 리스너 제거
   */
  removeChangeListener(listener: (config: GlobalPluginConfig) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 변경 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('Plugin config listener error:', error);
      }
    });
  }

  /**
   * 설정을 JSON으로 내보내기
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * JSON에서 설정 가져오기
   */
  importConfig(configJson: string): Result<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // 기본 구조 검증
      if (!importedConfig.plugins || typeof importedConfig.plugins !== 'object') {
        return Err(new Error('Invalid config format: missing plugins'));
      }

      this.config = this.deepMerge(DEFAULT_CONFIG, importedConfig);
      this.notifyListeners();
      
      return Ok(undefined);
    } catch (error) {
      return Err(new Error(`Failed to import config: ${error}`));
    }
  }

  /**
   * 로컬 스토리지에 설정 저장
   */
  saveToStorage(key = 'pluginConfig'): Result<void> {
    try {
      const configJson = this.exportConfig();
      localStorage.setItem(key, configJson);
      return Ok(undefined);
    } catch (error) {
      return Err(new Error(`Failed to save config to storage: ${error}`));
    }
  }

  /**
   * 로컬 스토리지에서 설정 로드
   */
  loadFromStorage(key = 'pluginConfig'): Result<void> {
    try {
      const configJson = localStorage.getItem(key);
      if (!configJson) {
        return Ok(undefined); // 저장된 설정이 없음 (정상)
      }

      return this.importConfig(configJson);
    } catch (error) {
      return Err(new Error(`Failed to load config from storage: ${error}`));
    }
  }

  /**
   * 설정 초기화 (기본값으로 복원)
   */
  reset(): void {
    this.config = this.buildConfig();
    this.notifyListeners();
  }
}

// 전역 설정 매니저 인스턴스
export const pluginConfig = PluginConfigManager.getInstance();