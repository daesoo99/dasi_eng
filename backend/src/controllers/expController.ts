/**
 * Experience Controller - DI Pattern with Enhanced Error Handling
 * @description 의존성 주입 패턴으로 리팩터링된 경험치 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { CategorizedError, ErrorFactory } from '../shared/errors/CategorizedError';

// Interface for experience service
interface ExpService {
  addExp(userId: string, amount: number, type: string): Promise<any>;
  getExpStats(userId: string): Promise<any>;
  getExpHistory(userId: string, limit?: number): Promise<any>;
}

export class ExpController {
  constructor(private expService: ExpService) {}

  /**
   * Add experience points
   */
  public addExp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, amount, type } = req.body;
      
      // Validation
      if (!userId) {
        throw ErrorFactory.validation('User ID is required', 'MISSING_USER_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      if (!amount || amount <= 0) {
        throw ErrorFactory.validation('Amount must be a positive number', 'INVALID_AMOUNT', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        }, { amount });
      }

      if (!type) {
        throw ErrorFactory.validation('Experience type is required', 'MISSING_EXP_TYPE', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const validTypes = ['LEARNING', 'REVIEW', 'STREAK', 'PERFECT', 'BONUS'];
      if (!validTypes.includes(type)) {
        throw ErrorFactory.validation(`Invalid experience type. Valid types: ${validTypes.join(', ')}`, 'INVALID_EXP_TYPE', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        }, { type, validTypes });
      }

      const result = await this.expService.addExp(userId, amount, type);
      
      req.logger.info({ 
        userId, 
        amount, 
        type, 
        newTotal: result.totalExp 
      }, 'Experience added successfully');
      
      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get experience statistics
   */
  public getExpStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw ErrorFactory.validation('User ID is required', 'MISSING_USER_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const stats = await this.expService.getExpStats(userId);
      
      if (!stats) {
        throw ErrorFactory.notFound('Experience stats', userId, {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      req.logger.info({ 
        userId, 
        totalExp: stats.totalExp,
        level: stats.level 
      }, 'Experience stats retrieved successfully');
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get experience history
   */
  public getExpHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      if (!userId) {
        throw ErrorFactory.validation('User ID is required', 'MISSING_USER_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const historyLimit = limit ? Math.min(parseInt(limit as string) || 50, 100) : 50;
      const history = await this.expService.getExpHistory(userId, historyLimit);
      
      req.logger.info({ 
        userId, 
        limit: historyLimit,
        resultCount: history.length 
      }, 'Experience history retrieved successfully');
      
      res.json({
        success: true,
        data: history,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId,
          limit: historyLimit,
          count: history.length
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

// Legacy support
let defaultController: ExpController;

export const initExpController = (expService: ExpService): void => {
  defaultController = new ExpController(expService);
};

// Legacy function exports (deprecated - use class instance instead)
export const addExp = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Experience controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.addExp(req, res, next);
};

export const getExpStats = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Experience controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration', 
      'critical'
    ));
  }
  return defaultController.getExpStats(req, res, next);
};

export const getExpHistory = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Experience controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.getExpHistory(req, res, next);
};

export default ExpController;

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpRequest:
 *       type: object
 *       required: [userId, amount, type]
 *       properties:
 *         userId:
 *           type: string
 *           description: 사용자 Firebase UID
 *         amount:
 *           type: integer
 *           minimum: 1
 *           description: 추가할 경험치 양
 *           example: 50
 *         type:
 *           type: string
 *           enum: [LEARNING, REVIEW, STREAK, PERFECT, BONUS]
 *           description: 경험치 획득 유형
 */