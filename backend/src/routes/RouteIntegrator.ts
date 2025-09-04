/**
 * RouteIntegrator - 기존 모놀리스 라우트를 DI 시스템과 통합
 * @description 레거시 라우트를 점진적으로 새 아키텍처로 이관
 */

import { Express, Router } from 'express';
import { ServiceRegistry } from '../container/ServiceRegistry';
import { ContentPort } from '../domain/ports/ContentPort';
import { ScorePort } from '../domain/ports/ScorePort';

export interface RouteModuleConfig {
  prefix: string;
  enabled: boolean;
  dependencies: string[];
  legacy?: boolean; // 레거시 모듈 표시
}

export interface LegacyRouteModule {
  name: string;
  config: RouteModuleConfig;
  setupRoutes: (app: Express, services: any) => void;
}

/**
 * 라우트 통합기 - 기존 Express 라우트를 새 DI 시스템과 연결
 */
export class RouteIntegrator {
  private legacyRoutes = new Map<string, LegacyRouteModule>();
  private portBasedRoutes = new Map<string, Router>();

  constructor(
    private app: Express,
    private serviceRegistry: ServiceRegistry
  ) {}

  /**
   * 포트 기반 새로운 라우트 등록
   */
  registerPortBasedRoute(portName: string, routeBuilder: (port: any) => Router): void {
    console.log(`🛤️ Registering port-based route: ${portName}`);
    
    const router = Router();
    
    // 포트를 통한 지연 로딩
    router.use(async (req, res, next) => {
      try {
        const port = await this.serviceRegistry.get(portName);
        const portRouter = routeBuilder(port);
        
        // 동적으로 포트 기반 라우터 실행
        portRouter(req, res, next);
      } catch (error) {
        console.error(`❌ Port-based route error for ${portName}:`, error);
        res.status(500).json({ 
          success: false, 
          error: { message: 'Service unavailable' } 
        });
      }
    });

    this.portBasedRoutes.set(portName, router);
  }

  /**
   * 레거시 라우트 모듈 등록
   */
  registerLegacyModule(module: LegacyRouteModule): void {
    console.log(`🔗 Registering legacy route module: ${module.name}`);
    
    if (!module.config.enabled) {
      console.log(`⏭️ Skipping disabled module: ${module.name}`);
      return;
    }

    this.legacyRoutes.set(module.name, module);
  }

  /**
   * Cards API - 포트 기반 새 구현
   */
  private setupCardsRoutes(): void {
    console.log('🎴 Setting up Cards routes (port-based)');
    
    const router = Router();

    // GET /api/cards/all - 새로운 ContentPort 사용
    router.get('/all', async (req, res, next) => {
      try {
        const contentPort = await this.serviceRegistry.get<ContentPort>('content');
        const query = {
          level: req.query.level ? parseInt(req.query.level as string) : undefined,
          stage: req.query.stage ? parseInt(req.query.stage as string) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
          difficulty: req.query.difficulty ? parseFloat(req.query.difficulty as string) : undefined,
          tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
        };

        const cards = await contentPort.findCards(query);
        const total = await contentPort.countCards(query);

        res.json({
          success: true,
          data: {
            cards,
            total,
            page: Math.floor(query.offset / query.limit) + 1,
            totalPages: Math.ceil(total / query.limit)
          }
        });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/cards/:cardId - 새로운 ContentPort 사용
    router.get('/:cardId', async (req, res, next) => {
      try {
        const contentPort = await this.serviceRegistry.get<ContentPort>('content');
        const card = await contentPort.getCardById(req.params.cardId);

        if (!card) {
          return res.status(404).json({
            success: false,
            error: { message: 'Card not found' }
          });
        }

        res.json({ success: true, data: card });
      } catch (error) {
        next(error);
      }
    });

    this.app.use('/api/cards', router);
  }

  /**
   * Feedback API - 포트 기반 새 구현
   */
  private setupFeedbackRoutes(): void {
    console.log('💬 Setting up Feedback routes (port-based)');
    
    const router = Router();

    // POST /api/feedback - 새로운 ScorePort 사용
    router.post('/', async (req, res, next) => {
      try {
        const scorePort = await this.serviceRegistry.get<ScorePort>('score');
        const { userAnswer, targetAnswer } = req.body;

        if (!userAnswer || !targetAnswer) {
          return res.status(400).json({
            success: false,
            error: { message: 'userAnswer and targetAnswer are required' }
          });
        }

        const scoreResult = scorePort.calculateScore(userAnswer, targetAnswer);
        const comparison = scorePort.compareAnswers(userAnswer, targetAnswer);

        res.json({
          success: true,
          data: {
            ...scoreResult,
            comparison
          }
        });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/feedback/pronunciation - STT 기반 발음 채점
    router.post('/pronunciation', async (req, res, next) => {
      try {
        const scorePort = await this.serviceRegistry.get<ScorePort>('score');
        const { sttResult, targetText } = req.body;

        if (!sttResult || !targetText) {
          return res.status(400).json({
            success: false,
            error: { message: 'sttResult and targetText are required' }
          });
        }

        const pronunciationScore = scorePort.scorePronunciation(sttResult, targetText);

        res.json({
          success: true,
          data: {
            pronunciationScore,
            sttAccuracy: pronunciationScore / 100
          }
        });
      } catch (error) {
        next(error);
      }
    });

    this.app.use('/api/feedback', router);
  }

  /**
   * 모든 라우트 통합 적용
   */
  async integrateRoutes(): Promise<void> {
    console.log('🔄 Integrating all routes...');

    try {
      // 1. 새로운 포트 기반 라우트 설정
      this.setupCardsRoutes();
      this.setupFeedbackRoutes();

      // 2. 레거시 모듈들 설정
      await this.setupLegacyRoutes();

      // 3. 라우트 상태 보고
      this.reportRouteStatus();

      console.log('✅ Route integration completed');
    } catch (error) {
      console.error('❌ Route integration failed:', error);
      throw error;
    }
  }

  /**
   * 레거시 라우트들 설정
   */
  private async setupLegacyRoutes(): Promise<void> {
    console.log('🔗 Setting up legacy routes...');

    for (const [name, module] of this.legacyRoutes) {
      try {
        // 종속성 체크
        const services: any = {};
        for (const dependency of module.config.dependencies) {
          services[dependency] = await this.serviceRegistry.get(dependency);
        }

        // 레거시 서비스들 (임시로 require 사용)
        const legacyServices = this.getLegacyServices();
        
        // 라우트 설정 실행
        module.setupRoutes(this.app, { ...services, ...legacyServices });
        
        console.log(`✅ Legacy module integrated: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to integrate legacy module ${name}:`, error);
      }
    }
  }

  /**
   * 레거시 서비스들 임포트 (점진적 마이그레이션을 위해)
   */
  private getLegacyServices(): any {
    try {
      return {
        userService: require('../services/userService'),
        contentService: require('../services/contentService'),
        speechService: require('../services/speechService'),
        reviewService: require('../services/reviewService'),
        expService: require('../services/expService'),
        notificationService: require('../services/notificationService'),
        smartReviewService: require('../services/smartReviewService'),
      };
    } catch (error) {
      console.warn('⚠️ Some legacy services not available:', error);
      return {};
    }
  }

  /**
   * 라우트 통합 상태 보고
   */
  private reportRouteStatus(): void {
    console.log('\n📊 Route Integration Status:');
    console.log(`🆕 Port-based routes: ${this.portBasedRoutes.size}`);
    console.log(`🔗 Legacy route modules: ${this.legacyRoutes.size}`);
    
    // 포트 기반 라우트 목록
    console.log('\n🛤️ Port-based Routes:');
    for (const [portName] of this.portBasedRoutes) {
      console.log(`  - ${portName}`);
    }

    // 레거시 모듈 목록
    console.log('\n🔗 Legacy Route Modules:');
    for (const [name, module] of this.legacyRoutes) {
      const status = module.config.enabled ? '✅' : '⛔';
      console.log(`  ${status} ${name} (${module.config.prefix})`);
    }
  }

  /**
   * 라우트 헬스체크
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // 포트 기반 라우트 체크
    for (const [portName] of this.portBasedRoutes) {
      try {
        await this.serviceRegistry.get(portName);
        results[`route:${portName}`] = true;
      } catch (error) {
        results[`route:${portName}`] = false;
      }
    }

    return results;
  }
}

/**
 * 라우트 통합 헬퍼 함수들
 */
export class LegacyRouteBuilder {
  /**
   * 기존 라우트를 래핑하여 새 구조에 맞게 변환
   */
  static wrapLegacyRoute(originalHandler: any) {
    return async (req: any, res: any, next: any) => {
      try {
        await originalHandler(req, res);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * 기존 서비스를 포트 스타일로 어댑팅
   */
  static adaptLegacyService(legacyService: any, portInterface: string[]) {
    const adapter: any = {};
    
    portInterface.forEach(method => {
      if (typeof legacyService[method] === 'function') {
        adapter[method] = legacyService[method].bind(legacyService);
      }
    });

    return adapter;
  }
}