/**
 * Configuration Management System
 * @description 환경별 설정 관리 및 검증
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  ssl?: boolean;
}

export interface CacheConfig {
  type: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  ttl: {
    cards: number;
    sessions: number;
    users: number;
  };
}

export interface AuthConfig {
  provider: 'firebase' | 'mock';
  firebase?: {
    projectId: string;
    serviceAccountPath: string;
  };
}

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  database: DatabaseConfig;
  cache: CacheConfig;
  auth: AuthConfig;
  features: {
    aiScoring: boolean;
    advancedAnalytics: boolean;
    realTimeSync: boolean;
  };
  limits: {
    maxRequestsPerMinute: number;
    maxFileSizeMB: number;
    maxConcurrentUsers: number;
  };
}

/**
 * 설정 관리자 - 환경별 설정 로드 및 검증
 */
export class ConfigManager {
  private config: AppConfig;
  private overrides: Partial<AppConfig> = {};

  constructor(environment?: string) {
    const env = environment || process.env.NODE_ENV || 'development';
    this.config = this.loadEnvironmentConfig(env as any);
    this.validateConfig();
  }

  /**
   * 환경별 기본 설정
   */
  private loadEnvironmentConfig(env: 'development' | 'production' | 'test'): AppConfig {
    const baseConfig = {
      env,
      port: parseInt(process.env.PORT || '8081'),
      cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3500'],
        credentials: true
      }
    };

    switch (env) {
      case 'development':
        return {
          ...baseConfig,
          database: {
            host: 'localhost',
            port: 5432,
            database: 'dasi_dev'
          },
          cache: {
            type: 'memory',
            ttl: {
              cards: 3600,    // 1시간
              sessions: 900,  // 15분 
              users: 1800     // 30분
            }
          },
          auth: {
            provider: 'firebase',
            firebase: {
              projectId: process.env.FIREBASE_PROJECT_ID || 'dasi-dev',
              serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
            }
          },
          features: {
            aiScoring: false,
            advancedAnalytics: false,
            realTimeSync: false
          },
          limits: {
            maxRequestsPerMinute: 1000,
            maxFileSizeMB: 10,
            maxConcurrentUsers: 100
          }
        };

      case 'production':
        return {
          ...baseConfig,
          database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'dasi_prod',
            ssl: true
          },
          cache: {
            type: 'redis',
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD
            },
            ttl: {
              cards: 7200,    // 2시간
              sessions: 1800, // 30분
              users: 3600     // 1시간  
            }
          },
          auth: {
            provider: 'firebase',
            firebase: {
              projectId: process.env.FIREBASE_PROJECT_ID || '',
              serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
            }
          },
          features: {
            aiScoring: true,
            advancedAnalytics: true,
            realTimeSync: true
          },
          limits: {
            maxRequestsPerMinute: 5000,
            maxFileSizeMB: 50,
            maxConcurrentUsers: 1000
          }
        };

      case 'test':
        return {
          ...baseConfig,
          port: 0, // 랜덤 포트
          database: {
            host: 'localhost',
            port: 5432,
            database: 'dasi_test'
          },
          cache: {
            type: 'memory',
            ttl: {
              cards: 60,     // 1분 (빠른 테스트)
              sessions: 30,  // 30초
              users: 60      // 1분
            }
          },
          auth: {
            provider: 'mock'
          },
          features: {
            aiScoring: false,
            advancedAnalytics: false,
            realTimeSync: false
          },
          limits: {
            maxRequestsPerMinute: 10000,
            maxFileSizeMB: 1,
            maxConcurrentUsers: 10
          }
        };

      default:
        throw new Error(`Unknown environment: ${env}`);
    }
  }

  /**
   * 설정 검증
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // 필수 설정 체크 (테스트 환경에서는 0 허용)
    if (this.config.env === 'test') {
      if (this.config.port < 0 || this.config.port > 65535) {
        errors.push('Invalid port number');
      }
    } else {
      if (this.config.port <= 0 || this.config.port > 65535) {
        errors.push('Invalid port number');
      }
    }

    // Firebase 설정 체크 (production)
    if (this.config.auth.provider === 'firebase' && this.config.env === 'production') {
      if (!this.config.auth.firebase?.projectId) {
        errors.push('Firebase project ID is required for production');
      }
      if (!this.config.auth.firebase?.serviceAccountPath) {
        errors.push('Firebase service account path is required for production');
      }
    }

    // Redis 설정 체크 (production)
    if (this.config.cache.type === 'redis' && !this.config.cache.redis?.host) {
      errors.push('Redis host is required when using Redis cache');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * 설정 조회
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    // 오버라이드 먼저 체크
    if (key in this.overrides) {
      return this.overrides[key]!;
    }
    return this.config[key];
  }

  /**
   * 전체 설정 조회
   */
  getAll(): AppConfig {
    return { ...this.config, ...this.overrides };
  }

  /**
   * 런타임 설정 오버라이드
   */
  override<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    console.log(`⚙️ Overriding config ${key}`);
    this.overrides[key] = value;
  }

  /**
   * 기능 플래그 체크
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.get('features')[feature];
  }

  /**
   * 환경 체크 헬퍼
   */
  isDevelopment(): boolean {
    return this.get('env') === 'development';
  }

  isProduction(): boolean {
    return this.get('env') === 'production';
  }

  isTest(): boolean {
    return this.get('env') === 'test';
  }

  /**
   * 설정 출력 (민감한 정보 마스킹)
   */
  toSafeString(): string {
    const safe = JSON.parse(JSON.stringify(this.getAll()));
    
    // 민감한 정보 마스킹
    if (safe.database?.password) safe.database.password = '***';
    if (safe.cache?.redis?.password) safe.cache.redis.password = '***';
    if (safe.auth?.firebase?.serviceAccountPath) {
      safe.auth.firebase.serviceAccountPath = safe.auth.firebase.serviceAccountPath.replace(/./g, '*');
    }
    
    return JSON.stringify(safe, null, 2);
  }

  /**
   * 설정 핫 리로드 (개발 전용)
   */
  reload(): void {
    if (!this.isDevelopment()) {
      throw new Error('Config reload is only allowed in development');
    }
    
    console.log('🔄 Reloading configuration...');
    this.config = this.loadEnvironmentConfig(this.get('env'));
    this.overrides = {};
    this.validateConfig();
    console.log('✅ Configuration reloaded');
  }

  /**
   * 설정 변경 감지
   */
  watch(callback: (config: AppConfig) => void): () => void {
    // 개발 환경에서만 파일 시스템 감시
    if (this.isDevelopment()) {
      const watcher = setInterval(() => {
        // 환경 변수 변경 감지 로직
        // 실제 구현에서는 chokidar 등 사용
        callback(this.getAll());
      }, 5000);
      
      return () => clearInterval(watcher);
    }
    
    return () => {}; // noop
  }
}

// 전역 설정 관리자
export const configManager = new ConfigManager();

/**
 * 설정 데코레이터 - 클래스에 설정 주입
 */
export function WithConfig(configKey: keyof AppConfig) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      protected config = configManager.get(configKey);
    };
  };
}

/**
 * 설정 검증 데코레이터
 */
export function ValidateConfig(validator: (config: any) => boolean, message: string) {
  return function (target: any, propertyName: string) {
    let value = target[propertyName];
    
    const setter = function (newVal: any) {
      if (!validator(newVal)) {
        throw new Error(`Config validation failed for ${propertyName}: ${message}`);
      }
      value = newVal;
    };
    
    const getter = function () {
      return value;
    };
    
    Object.defineProperty(target, propertyName, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}