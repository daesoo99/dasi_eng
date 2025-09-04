/**
 * 서비스 레지스트리 - DI Container + Plugin System
 * @description 의존성 주입과 플러그인 관리를 통합한 중앙 레지스트리
 */

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';
export type ServiceFactory<T = any> = (registry?: ServiceRegistry) => T | Promise<T>;
export type ServiceResolver<T = any> = () => Promise<T>;

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  dependencies?: string[];
  tags?: string[];
  version?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  services: Record<string, ServiceDefinition>;
  dependencies?: string[];
  provides?: string[];
  hooks?: Record<string, string[]>;
}

/**
 * 중앙 서비스 레지스트리
 * - 의존성 주입 (DI)
 * - 플러그인 관리
 * - 라이프사이클 관리
 * - 순환 의존성 감지
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private plugins = new Map<string, PluginManifest>();
  private hooks = new Map<string, ServiceResolver[]>();
  private resolving = new Set<string>(); // 순환 의존성 감지

  /**
   * 서비스 등록
   */
  register<T>(name: string, definition: ServiceDefinition<T>): void {
    console.log(`📦 Registering service: ${name}`);
    
    this.services.set(name, definition);
    
    // 태그 기반 자동 후킹
    if (definition.tags) {
      definition.tags.forEach(tag => {
        this.addHook(tag, async () => this.get<T>(name));
      });
    }
  }

  /**
   * 플러그인 등록
   */
  registerPlugin(manifest: PluginManifest): void {
    console.log(`🔌 Registering plugin: ${manifest.name} v${manifest.version}`);
    
    // 의존성 체크
    this.validatePluginDependencies(manifest);
    
    // 플러그인 서비스들 등록
    Object.entries(manifest.services).forEach(([name, definition]) => {
      const qualifiedName = `${manifest.name}:${name}`;
      this.register(qualifiedName, definition);
    });
    
    // 후킹 등록
    if (manifest.hooks) {
      Object.entries(manifest.hooks).forEach(([hookName, serviceNames]) => {
        serviceNames.forEach(serviceName => {
          const qualifiedName = `${manifest.name}:${serviceName}`;
          this.addHook(hookName, async () => this.get(qualifiedName));
        });
      });
    }
    
    this.plugins.set(manifest.name, manifest);
  }

  /**
   * 서비스 해결 (의존성 주입)
   */
  async get<T>(name: string): Promise<T> {
    // 순환 의존성 감지
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${Array.from(this.resolving).join(' -> ')} -> ${name}`);
    }

    // 싱글톤 인스턴스 체크
    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service not found: ${name}`);
    }

    if (definition.lifecycle === 'singleton' && this.instances.has(name)) {
      return this.instances.get(name);
    }

    try {
      this.resolving.add(name);
      
      // 의존성 먼저 해결
      const dependencies = await this.resolveDependencies(definition.dependencies || []);
      
      // 팩토리 실행
      const instance = await definition.factory(this);
      
      // 의존성 주입
      if (instance && typeof instance === 'object' && dependencies.length > 0) {
        Object.assign(instance, this.createDependencyMap(definition.dependencies || [], dependencies));
      }
      
      // 인스턴스 저장 (singleton인 경우)
      if (definition.lifecycle === 'singleton') {
        this.instances.set(name, instance);
      }
      
      return instance;
      
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * 후킹 시스템 - 이벤트 기반 확장
   */
  addHook(hookName: string, resolver: ServiceResolver): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(resolver);
  }

  /**
   * 후크 실행
   */
  async executeHooks<T>(hookName: string): Promise<T[]> {
    const resolvers = this.hooks.get(hookName) || [];
    return Promise.all(resolvers.map(resolver => resolver()));
  }

  /**
   * 환경별 설정 적용
   */
  applyEnvironmentConfig(env: 'development' | 'production' | 'test'): void {
    console.log(`🌍 Applying ${env} configuration`);
    
    const configs = {
      development: {
        'content': 'fs-content-adapter',
        'cache': 'memory-cache-adapter',
        'auth': 'auth-mock'
      },
      production: {
        'content': 'firebase-content-adapter', 
        'cache': 'redis-cache-adapter',
        'auth': 'firebase-auth-adapter'
      },
      test: {
        'content': 'mock-content-adapter',
        'cache': 'mock-cache-adapter', 
        'auth': 'mock-auth-adapter'
      }
    };

    const envConfig = configs[env];
    Object.entries(envConfig).forEach(([alias, serviceName]) => {
      this.registerAlias(alias, serviceName);
    });
  }

  /**
   * 서비스 별칭 등록
   */
  registerAlias(alias: string, serviceName: string): void {
    this.register(alias, {
      factory: () => this.get(serviceName),
      lifecycle: 'singleton'
    });
  }

  /**
   * 헬스체크 - 모든 서비스 상태 확인
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name] of this.services) {
      try {
        await this.get(name);
        results[name] = true;
      } catch (error) {
        console.error(`❌ Service ${name} health check failed:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * 서비스 정보 조회
   */
  getServiceInfo(): {
    services: string[];
    plugins: string[];
    hooks: string[];
  } {
    return {
      services: Array.from(this.services.keys()),
      plugins: Array.from(this.plugins.keys()),
      hooks: Array.from(this.hooks.keys())
    };
  }

  // ============ Private Methods ============

  private async resolveDependencies(dependencies: string[]): Promise<any[]> {
    return Promise.all(dependencies.map(dep => this.get(dep)));
  }

  private createDependencyMap(dependencyNames: string[], dependencyInstances: any[]): Record<string, any> {
    const map: Record<string, any> = {};
    dependencyNames.forEach((name, index) => {
      map[name] = dependencyInstances[index];
    });
    return map;
  }

  private validatePluginDependencies(manifest: PluginManifest): void {
    if (!manifest.dependencies) return;
    
    for (const dependency of manifest.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(`Plugin dependency not found: ${dependency} required by ${manifest.name}`);
      }
    }
  }

  /**
   * 우아한 종료
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down service registry...');
    
    // 인스턴스들 정리
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.destroy === 'function') {
        try {
          await instance.destroy();
          console.log(`✅ Service ${name} destroyed`);
        } catch (error) {
          console.error(`❌ Failed to destroy service ${name}:`, error);
        }
      }
    }
    
    this.instances.clear();
    this.services.clear();
    this.plugins.clear();
    this.hooks.clear();
  }
}

// 전역 레지스트리 인스턴스
export const serviceRegistry = new ServiceRegistry();