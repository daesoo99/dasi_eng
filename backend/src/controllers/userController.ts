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

import { Request, Response } from 'express';
const userService = require('../services/userService');

/**
 * @swagger
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
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getUser(req.params.userId);
    if (user) {
      res.json({ success: true, data: user });
      return;
    }
    res.status(404).json({ success: false, message: 'User not found' });
  } catch (e) {
    console.error('Error getUser:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};