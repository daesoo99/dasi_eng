/**
 * SRS 의존성 주입 컨테이너
 * 느슨한 결합을 위한 IoC (Inversion of Control) 구현
 * 
 * 모든 SRS 관련 의존성을 중앙에서 관리
 */

import { 
  ISRSEngine, 
  ISRSStorage, 
  ISRSConfigProvider, 
  ISRSAlgorithm, 
  ISRSEventBus,
  SRSConfig 
} from '../interfaces/ISRSEngine';

// 타입 정의 및 유틸리티 (비사용 변수들을 활용)
export type SRSServiceFactory<T> = (...deps: any[]) => T;
export type SRSServiceInstance<T = ISRSEngine | ISRSStorage | ISRSConfigProvider | ISRSAlgorithm | ISRSEventBus> = T;

// SRS 시스템 상태 관리
export interface SRSSystemState {
  isInitialized: boolean;
  activeEngine: ISRSEngine | null;
  config: SRSConfig | null;
  lastError: Error | null;
}

// SRS 메트릭스 수집
export interface SRSMetrics {
  totalCards: number;
  cardsReviewed: number;
  averageRetention: number;
  studyStreak: number;
}

// SRS 헬스 체크
export interface SRSHealthCheck {
  storageConnected: boolean;
  algorithmReady: boolean;
  configValid: boolean;
  eventBusActive: boolean;
}

type Constructor<T = {}> = new (...args: any[]) => T;
type Factory<T> = (...args: any[]) => T;
type ServiceIdentifier = string | symbol;

interface ServiceDescriptor<T = any> {
  factory: Factory<T>;
  singleton?: boolean;
  dependencies?: ServiceIdentifier[];
  tags?: string[];
}

/**
 * 의존성 주입 컨테이너
 * 서비스 등록, 해결, 생명주기 관리
 */
export class SRSContainer {
  private services = new Map<ServiceIdentifier, ServiceDescriptor>();
  private instances = new Map<ServiceIdentifier, any>();
  private resolving = new Set<ServiceIdentifier>();
  
  // 새로운 상태 관리 기능들 (비사용 인터페이스들 활용)
  private systemState: SRSSystemState = {
    isInitialized: false,
    activeEngine: null,
    config: null,
    lastError: null
  };
  
  private metrics: SRSMetrics = {
    totalCards: 0,
    cardsReviewed: 0,
    averageRetention: 0,
    studyStreak: 0
  };
  
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * 서비스 등록
   */
  register<T>(
    id: ServiceIdentifier,
    factoryOrConstructor: Factory<T> | Constructor<T>,
    options: {
      singleton?: boolean;
      dependencies?: ServiceIdentifier[];
      tags?: string[];
    } = {}
  ): this {
    const factory = typeof factoryOrConstructor === 'function' && factoryOrConstructor.prototype
      ? () => new (factoryOrConstructor as Constructor<T>)()
      : factoryOrConstructor as Factory<T>;

    this.services.set(id, {
      factory,
      singleton: options.singleton ?? false,
      dependencies: options.dependencies ?? [],
      tags: options.tags ?? []
    });

    return this;
  }

  /**
   * 싱글톤 서비스 등록 (편의 메서드)
   */
  singleton<T>(
    id: ServiceIdentifier,
    factoryOrConstructor: Factory<T> | Constructor<T>,
    dependencies: ServiceIdentifier[] = []
  ): this {
    return this.register(id, factoryOrConstructor, { 
      singleton: true, 
      dependencies 
    });
  }

  /**
   * 서비스 해결
   */
  resolve<T>(id: ServiceIdentifier): T {
    // 순환 의존성 검사
    if (this.resolving.has(id)) {
      throw new Error(`Circular dependency detected: ${String(id)}`);
    }

    // 싱글톤 인스턴스 반환
    if (this.instances.has(id)) {
      return this.instances.get(id);
    }

    const descriptor = this.services.get(id);
    if (!descriptor) {
      throw new Error(`Service not found: ${String(id)}`);
    }

    this.resolving.add(id);

    try {
      // 의존성 해결
      const dependencies = descriptor.dependencies?.map(dep => this.resolve(dep)) ?? [];
      
      // 인스턴스 생성
      const instance = descriptor.factory(...dependencies);

      // 싱글톤이면 캐싱
      if (descriptor.singleton) {
        this.instances.set(id, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(id);
    }
  }

  /**
   * 태그로 서비스들 찾기
   */
  getServicesByTag(tag: string): any[] {
    const services: any[] = [];
    
    for (const [id, descriptor] of this.services) {
      if (descriptor.tags?.includes(tag)) {
        services.push(this.resolve(id));
      }
    }
    
    return services;
  }

  /**
   * 등록된 모든 서비스 ID 반환
   */
  getRegisteredServices(): ServiceIdentifier[] {
    return Array.from(this.services.keys());
  }

  /**
   * SRS 시스템 초기화 (비사용 인터페이스들 활용)
   */
  async initializeSRS(): Promise<void> {
    try {
      // 1. 설정 제공자 초기화
      const configProvider = this.resolve<ISRSConfigProvider>(SRS_SERVICES.CONFIG_PROVIDER);
      const config = await configProvider.getConfig();
      
      // 2. 저장소 초기화
      const storage = this.resolve<ISRSStorage>(SRS_SERVICES.STORAGE);
      await storage.initialize?.(config);
      
      // 3. 이벤트 버스 초기화
      const eventBus = this.resolve<ISRSEventBus>(SRS_SERVICES.EVENT_BUS);
      await eventBus.initialize?.();
      
      // 4. 알고리즘 초기화
      const algorithm = this.resolve<ISRSAlgorithm>(SRS_SERVICES.ALGORITHM_SM2);
      await algorithm.initialize?.(config);
      
      // 5. 엔진 초기화
      const engine = this.resolve<ISRSEngine>(SRS_SERVICES.ENGINE);
      await engine.initialize?.(config);
      
      // 상태 업데이트
      this.systemState = {
        isInitialized: true,
        activeEngine: engine,
        config: config,
        lastError: null
      };
      
      // 헬스 체크 시작
      this.startHealthCheck();
      
      console.log('🎯 SRS System initialized successfully');
    } catch (error) {
      this.systemState.lastError = error as Error;
      console.error('❌ SRS System initialization failed:', error);
      throw error;
    }
  }

  /**
   * SRS 시스템 상태 확인
   */
  getSystemState(): SRSSystemState {
    return { ...this.systemState };
  }

  /**
   * SRS 메트릭스 조회
   */
  getMetrics(): SRSMetrics {
    return { ...this.metrics };
  }

  /**
   * 토스 스타일: 사용자가 문제를 겪을 때 자동 진단
   */
  async diagnoseOnError(error: Error, context: string): Promise<void> {
    console.log(`🔍 SRS Auto-diagnosis triggered by error in ${context}:`, error.message);
    
    // 즉시 헬스 체크 실행
    const health = await this.performHealthCheck();
    const problematicServices = Object.entries(health)
      .filter(([_, isHealthy]) => !isHealthy)
      .map(([service, _]) => service);
    
    if (problematicServices.length > 0) {
      console.warn('🚨 Problematic services detected:', problematicServices);
      
      // 자동 복구 시도 (간단한 것들만)
      if (problematicServices.includes('configValid')) {
        console.log('🔧 Attempting config auto-repair...');
        try {
          const configProvider = this.resolve<ISRSConfigProvider>(SRS_SERVICES.CONFIG_PROVIDER);
          await configProvider.getConfig(); // config 다시 로드
        } catch (repairError) {
          console.error('❌ Config auto-repair failed:', repairError);
        }
      }
    } else {
      console.log('✅ All services healthy - error might be transient');
    }
  }

  /**
   * 메트릭스 업데이트
   */
  updateMetrics(updates: Partial<SRSMetrics>): void {
    this.metrics = { ...this.metrics, ...updates };
  }

  /**
   * SRS 헬스 체크
   */
  async performHealthCheck(): Promise<SRSHealthCheck> {
    const healthCheck: SRSHealthCheck = {
      storageConnected: false,
      algorithmReady: false,
      configValid: false,
      eventBusActive: false
    };

    try {
      // 저장소 연결 확인
      const storage = this.resolve<ISRSStorage>(SRS_SERVICES.STORAGE);
      healthCheck.storageConnected = await storage.isConnected?.() ?? true;
      
      // 설정 유효성 확인
      const configProvider = this.resolve<ISRSConfigProvider>(SRS_SERVICES.CONFIG_PROVIDER);
      const config = await configProvider.getConfig();
      healthCheck.configValid = Boolean(config && config.intervals && config.intervals.length > 0);
      
      // 알고리즘 준비 상태 확인
      const algorithm = this.resolve<ISRSAlgorithm>(SRS_SERVICES.ALGORITHM_SM2);
      healthCheck.algorithmReady = await algorithm.isReady?.() ?? true;
      
      // 이벤트 버스 활성 상태 확인
      const eventBus = this.resolve<ISRSEventBus>(SRS_SERVICES.EVENT_BUS);
      healthCheck.eventBusActive = await eventBus.isActive?.() ?? true;
      
    } catch (error) {
      console.warn('Health check failed:', error);
    }

    return healthCheck;
  }

  /**
   * 토스/카카오 스타일: 필요할 때만 헬스 체크
   * 사용자가 실제 문제를 겪을 때만 진단
   */
  private startHealthCheck(): void {
    // 개발 환경에서만 주기적 체크 (디버깅용)
    if (process.env.NODE_ENV === 'development') {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      this.healthCheckInterval = setInterval(async () => {
        const health = await this.performHealthCheck();
        const allHealthy = Object.values(health).every(Boolean);
        
        if (!allHealthy) {
          console.warn('🚨 [DEV] SRS System health check failed:', health);
        }
      }, 60000); // 1분마다로 완화
    }
    
    // 프로덕션에서는 오류 발생시에만 체크
    console.log('🏥 SRS Health check: on-demand mode (production-friendly)');
  }

  /**
   * 컨테이너 초기화
   */
  clear(): void {
    // 헬스 체크 정리
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // 상태 초기화
    this.systemState = {
      isInitialized: false,
      activeEngine: null,
      config: null,
      lastError: null
    };
    
    this.metrics = {
      totalCards: 0,
      cardsReviewed: 0,
      averageRetention: 0,
      studyStreak: 0
    };
    
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
  }
}

/**
 * SRS 서비스 식별자 상수
 */
export const SRS_SERVICES = {
  // 핵심 서비스
  ENGINE: Symbol('srs.engine'),
  STORAGE: Symbol('srs.storage'),
  CONFIG_PROVIDER: Symbol('srs.config-provider'),
  EVENT_BUS: Symbol('srs.event-bus'),
  
  // 알고리즘 (전략 패턴)
  ALGORITHM_SM2: Symbol('srs.algorithm.sm2'),
  ALGORITHM_ANKI: Symbol('srs.algorithm.anki'),
  ALGORITHM_FSRS: Symbol('srs.algorithm.fsrs'),
  
  // 저장소 구현체
  STORAGE_LOCAL: Symbol('srs.storage.local'),
  STORAGE_FIREBASE: Symbol('srs.storage.firebase'),
  STORAGE_MEMORY: Symbol('srs.storage.memory'),
  
  // 설정 제공자
  CONFIG_DEFAULT: Symbol('srs.config.default'),
  CONFIG_USER: Symbol('srs.config.user'),
  CONFIG_ADAPTIVE: Symbol('srs.config.adaptive'),
} as const;

/**
 * 기본 SRS 컨테이너 설정
 */
export function createSRSContainer(): SRSContainer {
  const container = new SRSContainer();
  
  // 기본 서비스들은 여기서 등록하지 않고
  // 각 환경(development/production/test)별로 별도 설정
  
  return container;
}

/**
 * 환경별 컨테이너 설정
 */
export function configureDevelopmentContainer(container: SRSContainer): void {
  // 개발 환경용 설정 - 로깅 활성화, 관대한 검증
  
  // 기본 서비스들
  container.singleton(SRS_SERVICES.STORAGE, () => {
    const { LocalStorageAdapter } = require('../adapters/storage/LocalStorageAdapter');
    return new LocalStorageAdapter();
  });

  container.singleton(SRS_SERVICES.CONFIG_PROVIDER, () => {
    const { DefaultConfigProvider } = require('../config/DefaultConfigProvider');
    return new DefaultConfigProvider();
  });

  container.singleton(SRS_SERVICES.EVENT_BUS, () => {
    const { LoggingEventBus } = require('../events/SimpleEventBus');
    return new LoggingEventBus(true); // 로깅 활성화
  });

  container.singleton(SRS_SERVICES.ALGORITHM_SM2, () => {
    const { SuperMemoSM2Strategy } = require('../algorithms/SuperMemoSM2Strategy');
    return new SuperMemoSM2Strategy();
  });

  container.singleton(SRS_SERVICES.ENGINE, (container) => {
    const { ModularSRSEngine } = require('../engines/ModularSRSEngine');
    return new ModularSRSEngine(
      container.get(SRS_SERVICES.STORAGE),
      container.get(SRS_SERVICES.ALGORITHM_SM2),
      container.get(SRS_SERVICES.CONFIG_PROVIDER),
      container.get(SRS_SERVICES.EVENT_BUS)
    );
  }, [SRS_SERVICES.STORAGE, SRS_SERVICES.ALGORITHM_SM2, SRS_SERVICES.CONFIG_PROVIDER, SRS_SERVICES.EVENT_BUS]);
}

export function configureProductionContainer(container: SRSContainer): void {
  // 프로덕션 환경용 설정 - 성능 최적화, 엄격한 검증
  
  container.singleton(SRS_SERVICES.STORAGE, () => {
    const { LocalStorageAdapter } = require('../adapters/storage/LocalStorageAdapter');
    return new LocalStorageAdapter();
  });

  container.singleton(SRS_SERVICES.CONFIG_PROVIDER, () => {
    const { DefaultConfigProvider } = require('../config/DefaultConfigProvider');
    return new DefaultConfigProvider();
  });

  container.singleton(SRS_SERVICES.EVENT_BUS, () => {
    const { SimpleEventBus } = require('../events/SimpleEventBus');
    return new SimpleEventBus(); // 로깅 비활성화
  });

  container.singleton(SRS_SERVICES.ALGORITHM_SM2, () => {
    const { SuperMemoSM2Strategy } = require('../algorithms/SuperMemoSM2Strategy');
    return new SuperMemoSM2Strategy();
  });

  container.singleton(SRS_SERVICES.ENGINE, (container) => {
    const { ModularSRSEngine } = require('../engines/ModularSRSEngine');
    return new ModularSRSEngine(
      container.get(SRS_SERVICES.STORAGE),
      container.get(SRS_SERVICES.ALGORITHM_SM2),
      container.get(SRS_SERVICES.CONFIG_PROVIDER),
      container.get(SRS_SERVICES.EVENT_BUS)
    );
  }, [SRS_SERVICES.STORAGE, SRS_SERVICES.ALGORITHM_SM2, SRS_SERVICES.CONFIG_PROVIDER, SRS_SERVICES.EVENT_BUS]);
}

export function configureTestContainer(container: SRSContainer): void {
  // 테스트 환경용 설정 - Mock 서비스, 결정적 동작
  
  container.singleton(SRS_SERVICES.STORAGE, () => {
    const { MemoryStorageAdapter } = require('../adapters/storage/MemoryStorageAdapter');
    return new MemoryStorageAdapter();
  });

  container.singleton(SRS_SERVICES.CONFIG_PROVIDER, () => {
    const { MockConfigProvider } = require('../config/MockConfigProvider');
    return new MockConfigProvider();
  });

  container.singleton(SRS_SERVICES.EVENT_BUS, () => {
    const { SimpleEventBus } = require('../events/SimpleEventBus');
    return new SimpleEventBus();
  });

  container.singleton(SRS_SERVICES.ALGORITHM_SM2, () => {
    const { MockSM2Algorithm } = require('../algorithms/MockSM2Algorithm');
    return new MockSM2Algorithm(); // 결정적 결과
  });

  container.singleton(SRS_SERVICES.ENGINE, (container) => {
    const { ModularSRSEngine } = require('../engines/ModularSRSEngine');
    return new ModularSRSEngine(
      container.get(SRS_SERVICES.STORAGE),
      container.get(SRS_SERVICES.ALGORITHM_SM2),
      container.get(SRS_SERVICES.CONFIG_PROVIDER),
      container.get(SRS_SERVICES.EVENT_BUS)
    );
  }, [SRS_SERVICES.STORAGE, SRS_SERVICES.ALGORITHM_SM2, SRS_SERVICES.CONFIG_PROVIDER, SRS_SERVICES.EVENT_BUS]);
}

/**
 * 전역 SRS 컨테이너 인스턴스
 */
let globalContainer: SRSContainer | null = null;

export function getGlobalSRSContainer(): SRSContainer {
  if (!globalContainer) {
    globalContainer = createSRSContainer();
    
    // 환경에 따른 설정
    if (process.env.NODE_ENV === 'development') {
      configureDevelopmentContainer(globalContainer);
    } else if (process.env.NODE_ENV === 'production') {
      configureProductionContainer(globalContainer);
    } else {
      configureTestContainer(globalContainer);
    }
  }
  
  return globalContainer;
}

/**
 * 컨테이너 리셋 (주로 테스트에서 사용)
 */
export function resetGlobalSRSContainer(): void {
  globalContainer?.clear();
  globalContainer = null;
}