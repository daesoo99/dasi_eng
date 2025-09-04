/**
 * Session Controller v2
 * @description UseCase 기반 학습 세션 관리 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { 
  StartSessionUseCase, 
  SubmitAnswerUseCase, 
  CompleteSessionUseCase,
  GetUserSessionsUseCase
} from '../../domain/usecases/ManageSession';
import { UserEntity } from '../../domain/entities/User';
import { SessionPort } from '../../domain/ports/SessionPort';
import { ContentPort } from '../../domain/ports/ContentPort';
import { 
  validateSchema, 
  StartSessionSchema,
  SubmitAnswerSchema,
  IdSchema
} from '../../shared/validation/schemas';
import { ErrorFactory } from '../../shared/errors/ErrorHandler';

/**
 * Session Controller v2 - UseCase 기반
 */
export class SessionControllerV2 {
  constructor(
    private readonly sessionPort: SessionPort,
    private readonly contentPort: ContentPort
  ) {}

  /**
   * POST /api/v2/sessions/start - 새로운 학습 세션 시작
   */
  startSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 요청 검증
      const validationResult = validateSchema(StartSessionSchema, req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid session start parameters',
            details: validationResult.errors
          }
        });
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('start session', 'authentication required');
      }

      const user = UserEntity.fromData(userData);

      // UseCase 실행
      const startSessionUseCase = new StartSessionUseCase(this.sessionPort, this.contentPort);
      const result = await startSessionUseCase.execute({
        user,
        ...validationResult.data
      });

      res.status(201).json({
        success: true,
        data: {
          session: result.session.getSummary(),
          cards: result.cards.map(card => ({
            id: card.id,
            front_ko: card.front_ko,
            back_en: card.back_en,
            difficulty: card.difficulty
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v2/sessions/:sessionId/submit - 답안 제출
   */
  submitAnswer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      
      // 세션 ID 검증
      const sessionIdValidation = validateSchema(IdSchema, sessionId);
      if (!sessionIdValidation.success) {
        throw ErrorFactory.validationFailed('sessionId', 'Invalid session ID');
      }

      // 답안 데이터 검증
      const answerValidation = validateSchema(SubmitAnswerSchema.omit({ sessionId: true }), req.body);
      if (!answerValidation.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid answer submission',
            details: answerValidation.errors
          }
        });
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('submit answer', 'authentication required');
      }

      // UseCase 실행
      const submitAnswerUseCase = new SubmitAnswerUseCase(this.sessionPort);
      const updatedSession = await submitAnswerUseCase.execute({
        sessionId,
        userId: userData.uid,
        ...answerValidation.data
      });

      res.json({
        success: true,
        data: {
          session: updatedSession.getSummary(),
          canComplete: updatedSession.canComplete(),
          nextCardId: this.getNextCardId(updatedSession)
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v2/sessions/:sessionId/complete - 세션 완료
   */
  completeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // 세션 ID 검증
      const sessionIdValidation = validateSchema(IdSchema, sessionId);
      if (!sessionIdValidation.success) {
        throw ErrorFactory.validationFailed('sessionId', 'Invalid session ID');
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('complete session', 'authentication required');
      }

      // UseCase 실행
      const completeSessionUseCase = new CompleteSessionUseCase(this.sessionPort);
      const result = await completeSessionUseCase.execute(sessionId, userData.uid);

      res.json({
        success: true,
        data: {
          session: result.session.getSummary(),
          summary: result.summary,
          completedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/sessions - 사용자 세션 목록 조회
   */
  getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access sessions', 'authentication required');
      }

      // 쿼리 파라미터 처리
      const rawStatus = (req.query.status as string) || 'all';
      const status: 'active' | 'completed' | 'all' = ['active', 'completed', 'all'].includes(rawStatus) 
        ? rawStatus as 'active' | 'completed' | 'all'
        : 'all';
        
      const options = {
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
        status
      };

      // 유효성 검사
      if (options.limit > 100) options.limit = 100;
      if (options.offset < 0) options.offset = 0;

      // UseCase 실행
      const getUserSessionsUseCase = new GetUserSessionsUseCase(this.sessionPort);
      const result = await getUserSessionsUseCase.execute(userData.uid, options);

      res.json({
        success: true,
        data: {
          sessions: result.sessions.map(session => ({
            id: session.id,
            level: session.level,
            stage: session.stage,
            startTime: session.startTime,
            endTime: session.endTime,
            completed: session.completed,
            cardCount: session.cardIds.length,
            scoreCount: session.scores.length,
            averageScore: session.scores.length > 0 
              ? session.scores.reduce((sum, s) => sum + s.score, 0) / session.scores.length 
              : 0
          })),
          pagination: {
            total: result.total,
            offset: options.offset,
            limit: options.limit,
            hasMore: options.offset + result.sessions.length < result.total
          }
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/sessions/:sessionId - 특정 세션 조회
   */
  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // 세션 ID 검증
      const sessionIdValidation = validateSchema(IdSchema, sessionId);
      if (!sessionIdValidation.success) {
        throw ErrorFactory.validationFailed('sessionId', 'Invalid session ID');
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access session', 'authentication required');
      }

      // 세션 조회
      const sessionData = await this.sessionPort.getSession(sessionId);
      if (!sessionData) {
        throw ErrorFactory.notFound('Session', sessionId);
      }

      // 소유권 확인
      if (sessionData.userId !== userData.uid) {
        throw ErrorFactory.forbidden('access this session', 'session belongs to another user');
      }

      res.json({
        success: true,
        data: sessionData
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/sessions/active - 활성 세션 조회
   */
  getActiveSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('access active session', 'authentication required');
      }

      // 활성 세션 조회
      const activeSession = await this.sessionPort.getActiveSession(userData.uid);

      res.json({
        success: true,
        data: {
          hasActiveSession: !!activeSession,
          session: activeSession
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v2/sessions/:sessionId - 세션 삭제 (포기)
   */
  abandonSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // 세션 ID 검증
      const sessionIdValidation = validateSchema(IdSchema, sessionId);
      if (!sessionIdValidation.success) {
        throw ErrorFactory.validationFailed('sessionId', 'Invalid session ID');
      }

      // 사용자 정보
      const userData = (req as any).user;
      if (!userData) {
        throw ErrorFactory.forbidden('abandon session', 'authentication required');
      }

      // 세션 조회 및 소유권 확인
      const sessionData = await this.sessionPort.getSession(sessionId);
      if (!sessionData) {
        throw ErrorFactory.notFound('Session', sessionId);
      }

      if (sessionData.userId !== userData.uid) {
        throw ErrorFactory.forbidden('abandon this session', 'session belongs to another user');
      }

      // 활성 세션만 삭제 가능
      if (sessionData.completed) {
        throw ErrorFactory.businessRuleViolation('Cannot abandon completed session');
      }

      // 세션 삭제
      await this.sessionPort.deleteSession(sessionId);

      res.json({
        success: true,
        data: {
          message: 'Session abandoned successfully',
          sessionId
        }
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * 다음 카드 ID 찾기 헬퍼
   */
  private getNextCardId(session: any): string | null {
    const answeredCardIds = session.scores.map((score: any) => score.cardId);
    const nextCard = session.cardIds.find((cardId: string) => !answeredCardIds.includes(cardId));
    return nextCard || null;
  }
}