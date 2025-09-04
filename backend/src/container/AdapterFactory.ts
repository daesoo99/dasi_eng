/**
 * Adapter Factory - 환경별 어댑터 자동 생성
 * @description 포트/어댑터 패턴의 중앙 팩토리
 */

import { ServiceRegistry, PluginManifest } from './ServiceRegistry';
import { ContentPort } from '../domain/ports/ContentPort';
import { ScorePort } from '../domain/ports/ScorePort';
import { FeedbackPort } from '../domain/ports/FeedbackPort';
import { SessionPort } from '../domain/ports/SessionPort';

// Adapter 인터페이스
export interface AdapterConfig {
  name: string;
  version: string;
  environment: string[];
  dependencies?: string[];
  config?: Record<string, any>;
}

export interface AdapterModule {
  config: AdapterConfig;
  factory: (registry: ServiceRegistry) => any;
}

/**
 * 어댑터 팩토리 - 자동 발견 및 생성
 */
export class AdapterFactory {
  private registry: ServiceRegistry;
  private adapters = new Map<string, AdapterModule>();
  private environment: string;

  constructor(registry: ServiceRegistry, environment: string = 'development') {
    this.registry = registry;
    this.environment = environment;
  }

  /**
   * 어댑터 모듈 등록
   */
  registerAdapter(portName: string, module: AdapterModule): void {
    console.log(`🔧 Registering adapter: ${portName} -> ${module.config.name}`);
    
    // 환경 체크
    if (!module.config.environment.includes(this.environment)) {
      console.log(`⏭️ Skipping ${module.config.name} (not for ${this.environment})`);
      return;
    }

    this.adapters.set(portName, module);
    
    // 서비스 레지스트리에 자동 등록
    this.registry.register(portName, {
      factory: (registry) => module.factory(registry!),
      lifecycle: 'singleton',
      dependencies: module.config.dependencies,
      tags: [portName, 'adapter'],
      version: module.config.version
    });
  }

  /**
   * 어댑터 자동 발견 - 디렉토리 스캔
   */
  async autoDiscoverAdapters(): Promise<void> {
    console.log('🔍 Auto-discovering adapters...');
    
    // Content Adapters
    await this.discoverContentAdapters();
    
    // Score Adapters  
    await this.discoverScoreAdapters();
    
    // Session Adapters
    await this.discoverSessionAdapters();
    
    // Cache Adapters (데코레이터)
    await this.discoverCacheAdapters();
    
    // Auth Adapters
    await this.discoverAuthAdapters();
    
    console.log(`✅ Discovered ${this.adapters.size} adapters`);
  }

  /**
   * Content 포트 어댑터들
   */
  private async discoverContentAdapters(): Promise<void> {
    // FS Content Adapter (개발용)
    this.registerAdapter('content-fs', {
      config: {
        name: 'fs-content-adapter',
        version: '1.0.0',
        environment: ['development', 'test']
      },
      factory: () => {
        const { FsContentAdapter } = require('../adapters/fs/FsContentAdapter');
        return new FsContentAdapter();
      }
    });

    // Firebase Content Adapter (프로덕션용)
    this.registerAdapter('content-firebase', {
      config: {
        name: 'firebase-content-adapter',
        version: '1.0.0', 
        environment: ['production'],
        dependencies: ['firebase-admin']
      },
      factory: (registry) => {
        // Firebase Content Adapter - 개발 환경에서는 FS Adapter 사용
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Using FS Content Adapter instead of Firebase (dev mode)');
          return registry.get('content-fs');
        }
        
        // 실제 Firebase Content Adapter는 향후 구현
        const { FsContentAdapter } = require('../adapters/fs/FsContentAdapter');
        return new FsContentAdapter();
      }
    });

    // Cached Content Adapter (데코레이터)
    this.registerAdapter('content-cached', {
      config: {
        name: 'cached-content-adapter',
        version: '1.0.0',
        environment: ['development', 'production'],
        dependencies: ['content-upstream', 'cache']
      },
      factory: async (registry) => {
        const { CachedContentAdapter } = require('../adapters/cache/CachedContentAdapter');
        const upstream = await registry.get('content-upstream');
        const cache = await registry.get('cache');
        
        // Redis 캐시인 경우만 redis 설정 전달
        const isRedis = cache && typeof (cache as any).setex === 'function';
        const config = isRedis ? { redis: cache } : {}; // 메모리 캐시는 내부 구현 사용
        
        return new CachedContentAdapter(upstream, config);
      }
    });

    // 환경별 기본 content 서비스 설정
    const defaultContent = this.environment === 'production' ? 'content-firebase' : 'content-fs';
    this.registry.registerAlias('content-upstream', defaultContent);
    
    // 테스트 환경에서는 캐시 없이 직접 사용
    if (this.environment === 'test') {
      this.registry.registerAlias('content', 'content-fs');
    } else {
      this.registry.registerAlias('content', 'content-cached');
    }
  }

  /**
   * Score 포트 어댑터들
   */
  private async discoverScoreAdapters(): Promise<void> {
    // Basic Score Adapter
    this.registerAdapter('score-basic', {
      config: {
        name: 'basic-score-adapter',
        version: '1.0.0',
        environment: ['development', 'production', 'test']
      },
      factory: () => {
        const { BasicScoreAdapter } = require('../adapters/score/BasicScoreAdapter');
        return new BasicScoreAdapter();
      }
    });

    // AI Score Adapter (향후 확장)
    this.registerAdapter('score-ai', {
      config: {
        name: 'ai-score-adapter', 
        version: '1.0.0',
        environment: ['production'],
        dependencies: ['openai-client']
      },
      factory: (registry) => {
        // AI Score Adapter - Gemini API 사용한 점수 평가
        const { BasicScoreAdapter } = require('../adapters/score/BasicScoreAdapter');
        return new BasicScoreAdapter();
      }
    });

    // 환경별 기본 score 서비스 설정
    const defaultScore = this.environment === 'production' ? 'score-ai' : 'score-basic';
    this.registry.registerAlias('score', 'score-basic'); // 일단 basic으로
  }

  /**
   * Session 어댑터들
   */
  private async discoverSessionAdapters(): Promise<void> {
    // Memory Session Adapter (개발/테스트용)
    this.registerAdapter('session-memory', {
      config: {
        name: 'memory-session-adapter',
        version: '1.0.0',
        environment: ['development', 'test']
      },
      factory: () => {
        const { MemorySessionAdapter } = require('../adapters/memory/MemorySessionAdapter');
        return new MemorySessionAdapter();
      }
    });

    // Firebase Session Adapter (프로덕션용) - 나중에 구현
    this.registerAdapter('session-firebase', {
      config: {
        name: 'firebase-session-adapter',
        version: '1.0.0',
        environment: ['production']
      },
      factory: () => {
        // TODO: Firebase Session Adapter 구현
        const { MemorySessionAdapter } = require('../adapters/memory/MemorySessionAdapter');
        return new MemorySessionAdapter(); // 임시로 Memory 사용
      }
    });

    // 환경별 기본 session 서비스 설정
    const sessionMapping: Record<string, string> = {
      'test': 'session-memory',
      'development': 'session-memory',
      'production': 'session-firebase'
    };
    const defaultSession = sessionMapping[this.environment] || 'session-memory';
    this.registry.registerAlias('session', defaultSession);
  }

  /**
   * Cache 어댑터들
   */
  private async discoverCacheAdapters(): Promise<void> {
    // Memory Cache (개발용)
    this.registerAdapter('cache-memory', {
      config: {
        name: 'memory-cache-adapter',
        version: '1.0.0',
        environment: ['development', 'test']
      },
      factory: () => {
        return new Map(); // 간단한 메모리 캐시
      }
    });

    // Redis Cache (프로덕션용)
    this.registerAdapter('cache-redis', {
      config: {
        name: 'redis-cache-adapter',
        version: '1.0.0',
        environment: ['production'],
        dependencies: ['redis-client']
      },
      factory: async (registry) => {
        // TODO: Redis 클라이언트 구현
        throw new Error('Redis Cache Adapter not implemented yet');
      }
    });

    // 환경별 기본 cache 서비스 설정
    const defaultCache = this.environment === 'production' ? 'cache-redis' : 'cache-memory';
    this.registry.registerAlias('cache', defaultCache);
  }

  /**
   * Auth 어댑터들  
   */
  private async discoverAuthAdapters(): Promise<void> {
    // Firebase Auth Adapter
    this.registerAdapter('auth-firebase', {
      config: {
        name: 'firebase-auth-adapter',
        version: '1.0.0',
        environment: ['production'],
        dependencies: []
      },
      factory: (registry) => {
        const { FirebaseAuthAdapter } = require('../adapters/firebase/FirebaseAuthAdapter');
        const firebaseModule = require('../config/firebase');
        
        // Firebase 서비스 가져오기
        const firestore = firebaseModule.firebaseManager.getFirestore();
        return new FirebaseAuthAdapter(firestore); 
      }
    });

    // Mock Auth Adapter (테스트용)
    this.registerAdapter('auth-mock', {
      config: {
        name: 'mock-auth-adapter',
        version: '1.0.0',
        environment: ['test', 'development']
      },
      factory: () => ({
        verifyToken: async () => ({ uid: 'test-user', email: 'test@example.com', emailVerified: true }),
        checkPermission: async () => true
      })
    });

    // 환경별 기본 auth 서비스 설정
    const authMapping: Record<string, string> = {
      'test': 'auth-mock',
      'development': 'auth-mock', 
      'production': 'auth-firebase'
    };
    const defaultAuth = authMapping[this.environment] || 'auth-mock';
    this.registry.registerAlias('auth', defaultAuth);
  }

  /**
   * 플러그인으로 어댑터 등록
   */
  async loadAdapterPlugin(manifest: PluginManifest): Promise<void> {
    console.log(`🔌 Loading adapter plugin: ${manifest.name}`);
    
    // 플러그인 등록
    this.registry.registerPlugin(manifest);
    
    // 플러그인이 제공하는 어댑터들을 팩토리에 등록
    if (manifest.provides) {
      manifest.provides.forEach(portName => {
        const serviceName = `${manifest.name}:${portName}`;
        this.registry.registerAlias(portName, serviceName);
      });
    }
  }

  /**
   * 설정 기반 어댑터 교체
   */
  switchAdapter(portName: string, adapterName: string): void {
    console.log(`🔄 Switching ${portName} to ${adapterName}`);
    this.registry.registerAlias(portName, adapterName);
  }

  /**
   * 어댑터 상태 조회
   */
  getAdapterStatus(): Record<string, { name: string; version: string; environment: string[] }> {
    const status: Record<string, any> = {};
    
    for (const [portName, module] of this.adapters) {
      status[portName] = {
        name: module.config.name,
        version: module.config.version,
        environment: module.config.environment
      };
    }
    
    return status;
  }

  /**
   * 어댑터 헬스체크
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const portName of this.adapters.keys()) {
      try {
        const adapter = await this.registry.get(portName);
        // 어댑터별 헬스체크 메서드가 있으면 호출
        if (adapter && typeof adapter === 'object' && 'healthCheck' in adapter && typeof adapter.healthCheck === 'function') {
          await adapter.healthCheck();
        }
        results[portName] = true;
      } catch (error) {
        console.error(`❌ Adapter ${portName} health check failed:`, error);
        results[portName] = false;
      }
    }
    
    return results;
  }
}

/**
 * 어댑터 팩토리 플러그인 - 외부 어댑터 쉬운 등록
 */
export function createAdapterPlugin(
  name: string,
  version: string,
  adapters: Record<string, AdapterModule>
): PluginManifest {
  return {
    name,
    version,
    services: Object.fromEntries(
      Object.entries(adapters).map(([portName, module]) => [
        portName,
        {
          factory: (registry) => module.factory(registry!),
          lifecycle: 'singleton' as const,
          dependencies: module.config.dependencies,
          tags: ['adapter', portName]
        }
      ])
    ),
    provides: Object.keys(adapters)
  };
}