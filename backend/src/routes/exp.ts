import express, { Request, Response } from 'express';
import { addExp, getExpStats, getExpHistory } from '../controllers/expController';

const router = express.Router();

/**
 * @swagger
 * /exp/add:
 *   post:
 *     tags: [Experience]
 *     summary: 경험치 추가
 *     description: 사용자에게 경험치를 추가합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpRequest'
 *     responses:
 *       200:
 *         description: 경험치 추가 성공
 *       400:
 *         description: 잘못된 입력
 *       500:
 *         description: 서버 오류
 */
router.post('/add', addExp);

/**
 * @swagger
 * /exp/stats/{userId}:
 *   get:
 *     tags: [Experience]
 *     summary: 경험치 통계 조회
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 경험치 통계 조회 성공
 */
router.get('/stats/:userId', getExpStats);

/**
 * @swagger
 * /exp/history/{userId}:
 *   get:
 *     tags: [Experience]
 *     summary: 경험치 이력 조회
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 경험치 이력 조회 성공
 */
router.get('/history/:userId', getExpHistory);

export default router;