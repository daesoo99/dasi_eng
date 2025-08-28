const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

/**
 * POST /api/sessions/start
 * High-performance session initialization with caching
 * Cache TTL: 5 minutes for session data
 */
router.post('/start', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, level, stage, cardIds } = req.body;
    const userUid = req.user?.uid || userId || 'anonymous';
    
    // 입력 검증
    if (!level || !stage) {
      return res.status(400).json({
        success: false,
        error: 'level and stage are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    logger.info(`🎮 세션 시작: User ${userUid}, Level ${level}, Stage ${stage}`, {
      userUid,
      level,
      stage,
      cardIds: cardIds?.length || 0
    });

    // 세션 ID 생성
    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 세션 데이터 구조
    const sessionData = {
      sessionId: sessionId,
      userId: userUid,
      level: parseInt(level),
      stage: stage,
      cardIds: cardIds || [],
      startedAt: new Date().toISOString(),
      status: 'active',
      progress: {
        totalCards: cardIds?.length || 0,
        completedCards: 0,
        correctAnswers: 0,
        incorrectAnswers: 0
      },
      createdAt: new Date().toISOString()
    };

    // Cache session data (5 min TTL)
    const cacheKey = `session:${sessionId}`;
    await hybridCache.set(cacheKey, sessionData, 300);

    // TODO: Firestore에 세션 저장 (현재는 메모리에만 저장)
    // await db.collection('sessions').doc(sessionId).set(sessionData);

    res.json({
      success: true,
      data: sessionData,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    });

    logger.performance('Session start completed', {
      sessionId,
      userUid,
      level,
      stage,
      duration: Date.now() - startTime
    });

  } catch (error) {
    logger.error('세션 시작 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'SESSION_START_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });
  }
});

/**
 * POST /api/sessions/submit  
 * Session submission with performance tracking
 */
router.post('/submit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { sessionId, answers, userFeedback } = req.body;
    const userUid = req.user?.uid || 'anonymous';

    if (!sessionId || !answers) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and answers are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    logger.info(`📝 세션 제출: ${sessionId}`, {
      sessionId,
      userUid,
      answersCount: answers?.length || 0
    });

    // Check cache first
    const cacheKey = `session:${sessionId}`;
    let sessionData = await hybridCache.get(cacheKey);
    
    if (!sessionData) {
      // TODO: Firestore에서 세션 조회
      logger.warn('Session not found in cache', { sessionId });
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Process answers and calculate results
    const results = {
      sessionId,
      userId: userUid,
      totalQuestions: answers.length,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      accuracy: answers.length > 0 ? answers.filter(a => a.isCorrect).length / answers.length : 0,
      completedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };

    // Update cache
    sessionData.status = 'completed';
    sessionData.results = results;
    await hybridCache.set(cacheKey, sessionData, 300);

    res.json({
      success: true,
      data: results,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });

    logger.performance('Session submit completed', {
      sessionId,
      accuracy: results.accuracy,
      duration: Date.now() - startTime
    });

  } catch (error) {
    logger.error('세션 제출 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error', 
      code: 'SESSION_SUBMIT_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });
  }
});

module.exports = router;