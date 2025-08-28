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
 *           example: "LEARNING"
 */

import { Request, Response } from 'express';
const expService = require('../services/expService');

/**
 * @swagger
 * /api/exp/add:
 *   post:
 *     tags: [Experience]
 *     summary: 경험치 추가
 *     description: 사용자에게 경험치를 추가하고 레벨업 처리를 수행합니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpRequest'
 *           examples:
 *             learning:
 *               summary: 학습 완료
 *               value:
 *                 userId: "abc123def456"
 *                 amount: 50
 *                 type: "LEARNING"
 *             perfect_streak:
 *               summary: 완벽한 스트릭 보너스
 *               value:
 *                 userId: "abc123def456" 
 *                 amount: 100
 *                 type: "PERFECT"
 *     responses:
 *       200:
 *         description: 경험치 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "EXP added"
 *                 data:
 *                   $ref: '#/components/schemas/ExperienceGain'
 *       400:
 *         description: 필수 파라미터 누락
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
export const addExp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, type } = req.body;
    if (!userId || !amount || !type) {
      res.status(400).json({ success: false, message: 'userId, amount, type required' });
      return;
    }
    await expService.addExp(userId, amount, type);
    res.json({ success: true, message: 'EXP added' });
  } catch (e) {
    console.error('Error addExp:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};