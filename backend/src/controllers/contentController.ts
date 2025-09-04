/**
 * Content Controller - DI Pattern with Enhanced Error Handling
 * @description 의존성 주입 패턴으로 리팩터링된 컨텐트 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { ContentPort } from '../domain/ports/ContentPort';
import { CategorizedError, ErrorFactory } from '../shared/errors/CategorizedError';

export class ContentController {
  constructor(private contentService: ContentPort) {}

  /**
   * Get level by ID
   */
  public getLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { levelId } = req.params;
      
      // Validation
      if (!levelId) {
        throw ErrorFactory.validation('Level ID is required', 'MISSING_LEVEL_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const level = await this.contentService.getLevel(levelId);
      
      if (!level) {
        throw ErrorFactory.notFound('Level', levelId, {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      req.logger.info({ levelId, levelName: level.name }, 'Level retrieved successfully');
      
      res.json({
        success: true,
        data: level,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      next(error); // Let error middleware handle it
    }
  };

  /**
   * Get all levels
   */
  public getLevels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const levels = await this.contentService.getLevels();
      
      req.logger.info({ count: levels.length }, 'Levels retrieved successfully');
      
      res.json({
        success: true,
        data: levels,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId,
          count: levels.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stage by ID
   */
  public getStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { stageId } = req.params;
      
      if (!stageId) {
        throw ErrorFactory.validation('Stage ID is required', 'MISSING_STAGE_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const stage = await this.contentService.getStage(stageId);
      
      if (!stage) {
        throw ErrorFactory.notFound('Stage', stageId, {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      req.logger.info({ stageId, stageName: stage.name }, 'Stage retrieved successfully');
      
      res.json({
        success: true,
        data: stage,
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
   * Get content cards with filtering
   */
  public getCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { level, stage, limit = 20, offset = 0 } = req.query;
      
      const filters = {
        level: level ? parseInt(level as string) : undefined,
        stage: stage ? parseInt(stage as string) : undefined,
        limit: Math.min(parseInt(limit as string) || 20, 100), // Max 100 cards
        offset: parseInt(offset as string) || 0
      };

      const cards = await this.contentService.getCards(filters);
      
      req.logger.info({ 
        filters, 
        resultCount: cards.length 
      }, 'Cards retrieved successfully');
      
      res.json({
        success: true,
        data: cards,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId,
          filters,
          count: cards.length
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

// Legacy functions for backward compatibility (wrapped with DI)
let defaultController: ContentController;

export const initContentController = (contentService: ContentPort): void => {
  defaultController = new ContentController(contentService);
};

// Legacy exports (deprecated - use class instance instead)
export const getLevel = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Content controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.getLevel(req, res, next);
};

export const getLevels = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Content controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.getLevels(req, res, next);
};

export const getStage = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Content controller not initialized', 
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.getStage(req, res, next);
};

export const getCards = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'Content controller not initialized',
      'CONTROLLER_NOT_INITIALIZED', 
      'configuration',
      'critical'
    ));
  }
  return defaultController.getCards(req, res, next);
};

export default ContentController;