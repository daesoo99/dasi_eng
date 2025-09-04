/**
 * API v2 Routes
 * @description UseCase 기반 새로운 API 라우트
 */

import { Router } from 'express';
import { ServiceRegistry } from '../../container/ServiceRegistry';
import { CardsControllerV2 } from '../../controllers/v2/CardsController';
import { SessionControllerV2 } from '../../controllers/v2/SessionController';
import { ContentPort } from '../../domain/ports/ContentPort';
import { SessionPort } from '../../domain/ports/SessionPort';
import { globalErrorHandler } from '../../shared/errors/ErrorHandler';
import { createValidationMiddleware } from '../../shared/validation/schemas';

/**
 * V2 API 라우터 생성
 */
export async function createV2Router(serviceRegistry: ServiceRegistry): Promise<Router> {
  const router = Router();

  // 서비스 의존성 해결
  const contentPort = await serviceRegistry.get<ContentPort>('content');
  const sessionPort = await serviceRegistry.get<SessionPort>('session');

  // 컨트롤러 인스턴스 생성
  const cardsController = new CardsControllerV2(contentPort);
  const sessionController = new SessionControllerV2(sessionPort, contentPort);

  // 미들웨어 설정
  router.use((req, res, next) => {
    res.setHeader('X-API-Version', '2.0');
    next();
  });

  // Cards API Routes
  const cardsRouter = Router();
  cardsRouter.get('/', cardsController.getCards);
  cardsRouter.get('/recommendations', cardsController.getRecommendations);
  cardsRouter.post('/search', cardsController.searchCards);
  cardsRouter.get('/level/:level/stage/:stage', cardsController.getStageCards);
  cardsRouter.get('/:cardId', cardsController.getCardById);

  router.use('/cards', cardsRouter);

  // Sessions API Routes  
  const sessionsRouter = Router();
  sessionsRouter.get('/', sessionController.getUserSessions);
  sessionsRouter.get('/active', sessionController.getActiveSession);
  sessionsRouter.post('/start', sessionController.startSession);
  sessionsRouter.get('/:sessionId', sessionController.getSession);
  sessionsRouter.post('/:sessionId/submit', sessionController.submitAnswer);
  sessionsRouter.post('/:sessionId/complete', sessionController.completeSession);
  sessionsRouter.delete('/:sessionId', sessionController.abandonSession);

  router.use('/sessions', sessionsRouter);

  // API 정보 라우트
  router.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        version: '2.0',
        description: 'DaSi English Learning API v2',
        features: [
          'Domain-driven design',
          'UseCase-based business logic',
          'Comprehensive input validation',
          'Enhanced error handling',
          'Improved performance'
        ],
        endpoints: {
          cards: [
            'GET /cards - Get cards with filtering',
            'GET /cards/recommendations - Get personalized recommendations',
            'POST /cards/search - Advanced card search',
            'GET /cards/level/:level/stage/:stage - Get stage cards',
            'GET /cards/:cardId - Get specific card'
          ],
          sessions: [
            'GET /sessions - Get user sessions',
            'GET /sessions/active - Get active session',
            'POST /sessions/start - Start new session',
            'GET /sessions/:sessionId - Get specific session',
            'POST /sessions/:sessionId/submit - Submit answer',
            'POST /sessions/:sessionId/complete - Complete session',
            'DELETE /sessions/:sessionId - Abandon session'
          ]
        }
      }
    });
  });

  // 에러 처리 미들웨어
  router.use(globalErrorHandler.middleware());

  return router;
}

/**
 * 인증 미들웨어 (임시 구현)
 */
export function createAuthMiddleware(serviceRegistry: ServiceRegistry) {
  return async (req: any, res: any, next: any) => {
    try {
      // 테스트 환경에서는 목 사용자 설정
      if (process.env.NODE_ENV === 'test') {
        req.user = {
          uid: 'test-user-001',
          email: 'test@example.com',
          level: 3,
          displayName: 'Test User',
          subscription: 'free',
          createdAt: new Date()
        };
        return next();
      }

      // Authorization 헤더 확인
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: {
            category: 'AUTH',
            code: 'NO_AUTH_HEADER',
            message: 'Authorization header required'
          }
        });
      }

      // Bearer 토큰 추출
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            category: 'AUTH', 
            code: 'NO_TOKEN',
            message: 'Bearer token required'
          }
        });
      }

      // Firebase Auth를 통한 토큰 검증 (실제 구현)
      const authService = await serviceRegistry.get<any>('auth');
      const user = await authService.verifyToken(token);
      
      req.user = user;
      next();

    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          category: 'AUTH',
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
  };
}