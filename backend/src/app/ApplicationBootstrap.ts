/**
 * Application Bootstrap - 전체 시스템 초기화
 * @description DI, Configuration, Adapters를 통합한 애플리케이션 부트스트래퍼
 */

import { ServiceRegistry } from '../container/ServiceRegistry';
import { AdapterFactory } from '../container/AdapterFactory';
import { ConfigManager } from '../config/ConfigManager';
import { Express, Request, Response, NextFunction } from 'express';
import { ContentPort } from '../domain/ports/ContentPort';
import { ScorePort } from '../domain/ports/ScorePort';
import { RouteIntegrator } from '../routes/RouteIntegrator';

export interface BootstrapOptions {
  environment?: string;
  configOverrides?: Record<string, any>;
  enablePlugins?: string[];
  skipHealthCheck?: boolean;
}

export interface ApplicationContext {
  serviceRegistry: ServiceRegistry;
  adapterFactory: AdapterFactory;
  configManager: ConfigManager;
  app: Express;
  routeIntegrator: RouteIntegrator;
}

/**
 * 애플리케이션 부트스트래퍼
 * - 의존성 주입 설정
 * - 어댑터 자동 발견
 * - 환경별 설정 적용
 * - 헬스체크 및 모니터링
 */
export class ApplicationBootstrap {
  private serviceRegistry: ServiceRegistry;
  private adapterFactory: AdapterFactory;
  private configManager: ConfigManager;
  private app: Express;
  private routeIntegrator: RouteIntegrator;

  constructor(private options: BootstrapOptions = {}) {
    const environment = options.environment || process.env.NODE_ENV || 'development';
    
    // 핵심 시스템 초기화
    this.configManager = new ConfigManager(environment);
    this.serviceRegistry = new ServiceRegistry();
    this.adapterFactory = new AdapterFactory(this.serviceRegistry, environment);
    this.app = this.createExpressApp();
    this.routeIntegrator = new RouteIntegrator(this.app, this.serviceRegistry);
  }

  /**
   * 전체 애플리케이션 부트스트랩
   */
  async bootstrap(): Promise<ApplicationContext> {
    console.log('🚀 Starting application bootstrap...');
    
    try {
      // 1. 설정 오버라이드 적용
      await this.applyConfigOverrides();
      
      // 2. 핵심 서비스 등록
      await this.registerCoreServices();
      
      // 3. 어댑터 자동 발견 및 등록
      await this.discoverAndRegisterAdapters();
      
      // 4. 플러그인 로드
      await this.loadPlugins();
      
      // 5. Express 미들웨어 설정
      await this.configureMiddleware();
      
      // 6. 라우터 통합 설정
      await this.integrateRoutes();
      
      // 7. 헬스체크
      if (!this.options.skipHealthCheck) {
        await this.performHealthCheck();
      }
      
      console.log('✅ Application bootstrap completed');
      
      return {
        serviceRegistry: this.serviceRegistry,
        adapterFactory: this.adapterFactory,
        configManager: this.configManager,
        app: this.app,
        routeIntegrator: this.routeIntegrator
      };
      
    } catch (error) {
      console.error('❌ Application bootstrap failed:', error);
      throw error;
    }
  }

  /**
   * Express 앱 생성
   */
  private createExpressApp(): Express {
    const express = require('express');
    const app = express();
    
    // 기본 미들웨어
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    return app;
  }

  /**
   * 설정 오버라이드 적용
   */
  private async applyConfigOverrides(): Promise<void> {
    if (this.options.configOverrides) {
      console.log('⚙️ Applying configuration overrides...');
      
      Object.entries(this.options.configOverrides).forEach(([key, value]) => {
        this.configManager.override(key as any, value);
      });
    }
  }

  /**
   * 핵심 서비스 등록
   */
  private async registerCoreServices(): Promise<void> {
    console.log('🔧 Registering core services...');
    
    // Config Manager
    this.serviceRegistry.register('config', {
      factory: () => this.configManager,
      lifecycle: 'singleton'
    });

    // Express App
    this.serviceRegistry.register('express-app', {
      factory: () => this.app,
      lifecycle: 'singleton'
    });

    // Logger
    this.serviceRegistry.register('logger', {
      factory: () => console, // 나중에 winston 등으로 교체
      lifecycle: 'singleton'
    });

    // HTTP Client
    this.serviceRegistry.register('http-client', {
      factory: () => require('axios').default,
      lifecycle: 'singleton'
    });
  }

  /**
   * 어댑터 자동 발견 및 등록
   */
  private async discoverAndRegisterAdapters(): Promise<void> {
    console.log('🔍 Discovering and registering adapters...');
    
    // 환경별 설정 적용
    this.serviceRegistry.applyEnvironmentConfig(this.configManager.get('env'));
    
    // 어댑터 자동 발견
    await this.adapterFactory.autoDiscoverAdapters();
    
    console.log('📊 Adapter status:', this.adapterFactory.getAdapterStatus());
  }

  /**
   * 플러그인 로드
   */
  private async loadPlugins(): Promise<void> {
    const enabledPlugins = this.options.enablePlugins || [];
    
    if (enabledPlugins.length === 0) {
      console.log('⏭️ No plugins specified, skipping plugin loading');
      return;
    }

    console.log('🔌 Loading plugins:', enabledPlugins);
    
    for (const pluginName of enabledPlugins) {
      try {
        // 플러그인 매니페스트 로드
        const pluginPath = `../plugins/${pluginName}/manifest.json`;
        const manifest = require(pluginPath);
        
        // 서비스 레지스트리에 플러그인 등록
        this.serviceRegistry.registerPlugin(manifest);
        
        console.log(`✅ Plugin loaded: ${pluginName}`);
      } catch (error) {
        console.error(`❌ Failed to load plugin ${pluginName}:`, error);
      }
    }
  }

  /**
   * Express 미들웨어 설정
   */
  private async configureMiddleware(): Promise<void> {
    console.log('🛠️ Configuring Express middleware...');
    
    const cors = require('cors');
    const helmet = require('helmet');
    const rateLimit = require('express-rate-limit');
    
    const corsConfig = this.configManager.get('cors');
    const limits = this.configManager.get('limits');
    
    // CORS
    this.app.use(cors({
      origin: corsConfig.origins,
      credentials: corsConfig.credentials
    }));
    
    // Security headers
    this.app.use(helmet());
    
    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 60 * 1000, // 1분
      max: limits.maxRequestsPerMinute,
      message: 'Too many requests from this IP'
    }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use(async (err: any, req: any, res: any, next: any) => {
      console.error('Request error:', err);
      
      // DomainError 처리
      if (err.name === 'DomainError') {
        const httpError = err.toHttpError();
        return res.status(httpError.statusCode).json(httpError.body);
      }
      
      // 기본 에러 응답
      res.status(500).json({
        success: false,
        error: {
          message: this.configManager.isDevelopment() ? err.message : 'Internal server error'
        }
      });
    });
  }

  /**
   * 라우트 통합 설정
   */
  private async integrateRoutes(): Promise<void> {
    console.log('🔄 Integrating routes...');
    
    // Health check 라우트 (시스템 기본)
    this.app.get('/health', async (req, res) => {
      const serviceHealth = await this.serviceRegistry.healthCheck();
      const adapterHealth = await this.adapterFactory.healthCheck();
      const routeHealth = await this.routeIntegrator.healthCheck();
      
      const isHealthy = Object.values(serviceHealth).every(h => h) && 
                       Object.values(adapterHealth).every(h => h) &&
                       Object.values(routeHealth).every(h => h);
      
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        services: serviceHealth,
        adapters: adapterHealth,
        routes: routeHealth,
        timestamp: new Date().toISOString()
      });
    });

    // System info 라우트
    this.app.get('/system/info', async (req, res) => {
      const serviceInfo = this.serviceRegistry.getServiceInfo();
      const adapterStatus = this.adapterFactory.getAdapterStatus();
      
      res.json({
        environment: this.configManager.get('env'),
        services: serviceInfo,
        adapters: adapterStatus,
        features: this.configManager.get('features'),
        limits: this.configManager.get('limits')
      });
    });

    // v2 API 라우트 통합
    await this.setupV2Routes();
    
    // 임시 레거시 라우트 (기존 프론트엔드 호환)
    await this.setupLegacyCardsRoute();
    
    // 라우트 통합 실행  
    await this.routeIntegrator.integrateRoutes();
  }

  /**
   * v2 API 라우트 설정
   */
  private async setupV2Routes(): Promise<void> {
    console.log('🔄 Setting up v2 API routes...');
    
    try {
      const { createV2Router } = require('../routes/v2');
      const v2Router = await createV2Router(this.serviceRegistry);
      
      // v2 API 라우트 등록
      this.app.use('/api/v2', v2Router);
      
      console.log('✅ v2 API routes configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup v2 routes:', error);
      throw error;
    }
  }

  /**
   * 임시 레거시 Cards 라우트 설정
   */
  private async setupLegacyCardsRoute(): Promise<void> {
    console.log('🔄 Setting up legacy cards route...');
    
    try {
      const { createLegacyCardsRouter } = require('../routes/legacy-cards');
      const legacyRouter = createLegacyCardsRouter(this.serviceRegistry);
      
      // 레거시 라우트 등록
      this.app.use('/', legacyRouter);
      
      console.log('✅ Legacy cards route configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup legacy cards route:', error);
      throw error;
    }
  }

  /**
   * 헬스체크 수행
   */
  private async performHealthCheck(): Promise<void> {
    console.log('🩺 Performing initial health check...');
    
    const serviceHealth = await this.serviceRegistry.healthCheck();
    const adapterHealth = await this.adapterFactory.healthCheck();
    
    const failedServices = Object.entries(serviceHealth).filter(([_, healthy]) => !healthy);
    const failedAdapters = Object.entries(adapterHealth).filter(([_, healthy]) => !healthy);
    
    if (failedServices.length > 0) {
      console.error('❌ Failed services:', failedServices.map(([name]) => name));
    }
    
    if (failedAdapters.length > 0) {
      console.error('❌ Failed adapters:', failedAdapters.map(([name]) => name));
    }
    
    if (failedServices.length > 0 || failedAdapters.length > 0) {
      throw new Error('Health check failed - some services or adapters are not healthy');
    }
    
    console.log('✅ All services and adapters are healthy');
  }

  /**
   * 우아한 종료
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down application...');
    
    await this.serviceRegistry.shutdown();
    
    console.log('✅ Application shutdown completed');
  }
}

/**
 * 애플리케이션 실행 헬퍼
 */
export async function startApplication(options: BootstrapOptions = {}): Promise<ApplicationContext> {
  const bootstrap = new ApplicationBootstrap(options);
  const context = await bootstrap.bootstrap();
  
  // 서버 시작
  const config = context.configManager;
  const port = config.get('port');
  
  return new Promise((resolve, reject) => {
    const server = context.app.listen(port, () => {
      console.log(`🚀 Server started on port ${port} (${config.get('env')})`);
      console.log(`📊 Config: ${config.toSafeString()}`);
      
      resolve(context);
    });
    
    server.on('error', reject);
    
    // 우아한 종료 처리
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received');
      server.close(() => {
        bootstrap.shutdown();
      });
    });
  });
}