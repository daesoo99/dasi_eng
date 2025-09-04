/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *           description: Firebase 사용자 UID
 *         email:
 *           type: string
 *           format: email
 *         displayName:
 *           type: string
 *         currentLevel:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         currentPhase:
 *           type: integer
 *         totalExp:
 *           type: integer
 *         streakDays:
 *           type: integer
 *         reviewStats:
 *           type: object
 */

/**
 * User Controller - DI Pattern with Enhanced Error Handling
 * @description 의존성 주입 패턴으로 리팩터링된 사용자 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { CategorizedError, ErrorFactory } from '../shared/errors/CategorizedError';

// Interface for user service
interface UserService {
  getUser(userId: string): Promise<any>;
  createUser?(userData: any): Promise<any>;
  updateUser?(userId: string, userData: any): Promise<any>;
  getUserStats?(userId: string): Promise<any>;
}

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get user by ID
   */
  public getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      
      // Validation
      if (!userId) {
        throw ErrorFactory.validation('User ID is required', 'MISSING_USER_ID', {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      const user = await this.userService.getUser(userId);
      
      if (!user) {
        throw ErrorFactory.notFound('User', userId, {
          requestId: req.requestId,
          route: req.route?.path,
          method: req.method
        });
      }

      req.logger.info({ userId, userEmail: user.email }, 'User retrieved successfully');
      
      res.json({
        success: true,
        data: user,
        meta: {
          timestamp: Date.now(),
          requestId: req.requestId
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

// Legacy support
let defaultController: UserController;

export const initUserController = (userService: UserService): void => {
  defaultController = new UserController(userService);
};

// Legacy function export (deprecated - use class instance instead)
export const getUser = (req: Request, res: Response, next: NextFunction) => {
  if (!defaultController) {
    return next(new CategorizedError(
      'User controller not initialized',
      'CONTROLLER_NOT_INITIALIZED',
      'configuration',
      'critical'
    ));
  }
  return defaultController.getUser(req, res, next);
};

export default UserController;

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *           description: Firebase 사용자 UID
 *         email:
 *           type: string
 *           format: email
 *         displayName:
 *           type: string
 *         currentLevel:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         currentPhase:
 *           type: integer
 *         totalExp:
 *           type: integer
 *         streakDays:
 *           type: integer
 *         reviewStats:
 *           type: object
 * 
 * /api/user/{userId}:
 *   get:
 *     tags: [User]
 *     summary: 사용자 정보 조회
 *     description: Firebase UID로 사용자 프로필 정보를 조회합니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 Firebase UID
 *         example: "abc123def456"
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 내부 에러
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */