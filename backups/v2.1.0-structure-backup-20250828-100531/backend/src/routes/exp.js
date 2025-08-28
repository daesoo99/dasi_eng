const express = require('express');
const { addExp, updateStreak } = require('../services/expService');
const router = express.Router();

/**
 * POST /exp/add
 * 사용자 경험치 추가
 */
router.post('/add', async (req, res) => {
    try {
        const { userId, amount, type } = req.body;
        
        console.log('[DEBUG] 📈 경험치 추가 요청:', { userId, amount, type });
        
        if (!userId || !amount || !type) {
            return res.status(400).json({
                success: false,
                error: 'userId, amount, type 필드가 필요합니다'
            });
        }

        await addExp(userId, amount, type);
        
        console.log('[DEBUG] ✅ 경험치 추가 성공');
        res.json({
            success: true,
            message: `경험치 ${amount} 추가 완료`,
            data: { userId, amount, type }
        });
    } catch (error) {
        console.error('[DEBUG] ❌ 경험치 추가 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /exp/streak
 * 사용자 스트릭 업데이트
 */
router.post('/streak', async (req, res) => {
    try {
        const { userId } = req.body;
        
        console.log('[DEBUG] 🔥 스트릭 업데이트 요청:', userId);
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId 필드가 필요합니다'
            });
        }

        await updateStreak(userId);
        
        console.log('[DEBUG] ✅ 스트릭 업데이트 성공');
        res.json({
            success: true,
            message: '스트릭 업데이트 완료',
            data: { userId }
        });
    } catch (error) {
        console.error('[DEBUG] ❌ 스트릭 업데이트 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /exp/logs/:userId
 * 사용자 경험치 로그 조회
 */
router.get('/logs/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        
        console.log('[DEBUG] 📊 경험치 로그 조회 요청:', { userId, limit, offset });
        
        // 여기에서는 간단한 응답만 제공 (실제로는 expService에 함수 추가 필요)
        res.json({
            success: true,
            message: '경험치 로그 조회 성공',
            data: {
                logs: [], // 실제로는 Firestore에서 로그 조회
                total: 0
            }
        });
    } catch (error) {
        console.error('[DEBUG] ❌ 경험치 로그 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;