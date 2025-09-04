/**
 * Cards Controller v2
 * @description UseCase 기반 카드 관리 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { GetCardsUseCase, GetCardByIdUseCase, GetCardsByDifficultyUseCase } from '../../domain/usecases/GetCards';
import { UserEntity } from '../../domain/entities/User';
import { ContentPort } from '../../domain/ports/ContentPort';
import { 
  validateSchema, 
  GetCardsRequestSchema, 
  GetCardByIdRequestSchema, 
  CardQuerySchema 
} from '../../shared/validation/schemas';
import { ErrorFactory } from '../../shared/errors/ErrorHandler';

/**
 * Cards Controller v2 - 새로운 아키텍처 기반
 */
export class CardsControllerV2 {
  constructor(
    private readonly contentPort: ContentPort
  ) {}

  /**
   * GET /api/v2/cards - 카드 목록 조회
   */
  getCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 요청 검증
      const validationResult = validateSchema(CardQuerySchema, req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            details: validationResult.errors
          }
        });
      }

      // 사용자 정보 (인증 미들웨어에서 설정된다고 가정)
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access cards', 'authentication required');
      }

      const user = UserEntity.fromData(userData);
      
      // UseCase 실행
      const getCardsUseCase = new GetCardsUseCase(this.contentPort);
      const result = await getCardsUseCase.execute({
        query: validationResult.data,
        user
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/cards/:cardId - 특정 카드 조회
   */
  getCardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cardId } = req.params;
      
      if (!cardId) {
        throw ErrorFactory.validationFailed('cardId', 'Card ID is required');
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access card', 'authentication required');
      }

      const user = UserEntity.fromData(userData);

      // UseCase 실행
      const getCardByIdUseCase = new GetCardByIdUseCase(this.contentPort);
      const card = await getCardByIdUseCase.execute(cardId, user);

      if (!card) {
        throw ErrorFactory.notFound('Card', cardId);
      }

      res.json({
        success: true,
        data: card
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/cards/recommendations - 사용자 맞춤 카드 추천
   */
  getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access recommendations', 'authentication required');
      }

      const user = UserEntity.fromData(userData);
      
      // 선택적 난이도 파라미터
      const targetDifficulty = req.query.difficulty 
        ? parseFloat(req.query.difficulty as string)
        : undefined;

      // UseCase 실행
      const getCardsByDifficultyUseCase = new GetCardsByDifficultyUseCase(this.contentPort);
      const cards = await getCardsByDifficultyUseCase.execute(user, targetDifficulty);

      res.json({
        success: true,
        data: {
          cards,
          recommendationInfo: {
            userLevel: user.level,
            calculatedDifficulty: targetDifficulty,
            isPremium: user.isPremium,
            isPersonalized: true
          }
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/cards/level/:level/stage/:stage - 레벨/스테이지별 카드 조회
   */
  getStageCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const level = parseInt(req.params.level);
      const stage = parseInt(req.params.stage);

      if (isNaN(level) || isNaN(stage)) {
        throw ErrorFactory.validationFailed('level/stage', 'Level and stage must be numbers');
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access stage cards', 'authentication required');
      }

      const user = UserEntity.fromData(userData);

      // 사용자 권한 체크
      if (level >= 4 && !user.canAccessAdvancedContent()) {
        throw ErrorFactory.forbidden('access advanced content', 'premium subscription required');
      }

      // 카드 조회
      const cards = await this.contentPort.getStageCards(level, stage);

      res.json({
        success: true,
        data: {
          cards,
          level,
          stage,
          count: cards.length
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v2/cards/search - 고급 카드 검색
   */
  searchCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 검색 쿼리 검증
      const validationResult = validateSchema(CardQuerySchema.extend({
        searchText: req.body.searchText ? 
          validateSchema(req.body.searchText, req.body.searchText as string) : 
          undefined
      }), req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid search parameters',
            details: validationResult.errors
          }
        });
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('search cards', 'authentication required');
      }

      const user = UserEntity.fromData(userData);

      // UseCase 실행 (고급 검색용 확장)
      const getCardsUseCase = new GetCardsUseCase(this.contentPort);
      const result = await getCardsUseCase.execute({
        query: validationResult.data,
        user
      });

      res.json({
        success: true,
        data: {
          ...result,
          searchInfo: {
            searchText: req.body.searchText || '',
            appliedFilters: validationResult.data
          }
        }
      });

    } catch (error) {
      next(error);
    }
  };
}