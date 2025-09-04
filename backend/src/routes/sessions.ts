/**
 * Sessions Routes - 학습 세션 관리 API
 * TypeScript 변환: Express + Firebase + 캐싱
 */

import express from 'express';
import { db } from '../config/firebase';
import logger from '../monitoring/logger';

const router = express.Router();

// Types
interface StartSessionRequest {
  userId?: string;
  level: number;
  stage: number;
  cardIds?: string[];
}

interface SubmitSessionRequest {
  sessionId: string;
  answers: SessionAnswer[];
  userFeedback?: string;
}

interface SessionAnswer {
  cardId: string;
  userAnswer: string;
  targetAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface SessionData {
  sessionId: string;
  userId: string;
  level: number;
  stage: number;
  cardIds: string[];
  startedAt: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: {
    totalCards: number;
    completedCards: number;
    correctAnswers: number;
    incorrectAnswers: number;
  };
  results?: SessionResults;
  createdAt: string;
}

interface SessionResults {
  sessionId: string;
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  completedAt: string;
  responseTime: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta: {
    timestamp: number;
    responseTime: number;
    cached?: boolean;
  };
}

// Hybrid cache interface and fallback
interface HybridCache {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
}

let hybridCache: HybridCache;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hybridCache = require('../utils/redisCache');
} catch (error) {
  console.warn('⚠️ RedisCache not found, using in-memory fallback');
  
  // In-memory cache fallback
  const memoryCache = new Map<string, { data: any; expiry: number }>();
  
  hybridCache = {
    async get(key: string): Promise<any> {
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      if (cached) {
        memoryCache.delete(key);
      }
      return null;
    },
    
    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
      const expiry = Date.now() + (ttlSeconds * 1000);
      memoryCache.set(key, { data: value, expiry });
      
      // Cleanup expired entries
      if (memoryCache.size > 200) {
        const now = Date.now();
        for (const [k, v] of memoryCache.entries()) {
          if (v.expiry <= now) {
            memoryCache.delete(k);
          }
        }
      }
    }
  };
}

/**
 * POST /api/sessions/start
 * High-performance session initialization with caching
 * Cache TTL: 5 minutes for session data
 */
router.post('/start', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { userId, level, stage, cardIds }: StartSessionRequest = req.body;
    const userUid = (req as any).user?.uid || userId || 'anonymous';
    
    // 입력 검증
    if (!level || !stage) {
      const response: APIResponse<never> = {
        success: false,
        error: 'level and stage are required',
        code: 'MISSING_REQUIRED_PARAMS',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime
        }
      };
      return res.status(400).json(response);
    }

    logger.info({
      userUid,
      level,
      stage,
      cardIds: cardIds?.length || 0
    }, `🎮 세션 시작: User ${userUid}, Level ${level}, Stage ${stage}`);

    // 세션 ID 생성
    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 세션 데이터 구조
    const sessionData: SessionData = {
      sessionId: sessionId,
      userId: userUid,
      level: parseInt(String(level)),
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

    const response: APIResponse<SessionData> = {
      success: true,
      data: sessionData,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    };
    res.json(response);

    logger.performance('Session start completed', {
      sessionId,
      userUid,
      level,
      stage,
      duration: Date.now() - startTime
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({
      error: errorMessage,
      stack: errorStack,
      body: req.body
    }, '세션 시작 실패');
    
    const response: APIResponse<never> = {
      success: false,
      error: 'Internal server error',
      code: 'SESSION_START_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/sessions/submit  
 * Session submission with performance tracking
 */
router.post('/submit', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { sessionId, answers, userFeedback }: SubmitSessionRequest = req.body;
    const userUid = (req as any).user?.uid || 'anonymous';

    if (!sessionId || !answers) {
      const response: APIResponse<never> = {
        success: false,
        error: 'sessionId and answers are required',
        code: 'MISSING_REQUIRED_PARAMS',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime
        }
      };
      return res.status(400).json(response);
    }

    logger.info({
      sessionId,
      userUid,
      answersCount: answers?.length || 0
    }, `📝 세션 제출: ${sessionId}`);

    // Check cache first
    const cacheKey = `session:${sessionId}`;
    let sessionData = await hybridCache.get(cacheKey) as SessionData | null;
    
    if (!sessionData) {
      // TODO: Firestore에서 세션 조회
      logger.warn({ sessionId }, 'Session not found in cache');
      const response: APIResponse<never> = {
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime
        }
      };
      return res.status(404).json(response);
    }

    // Process answers and calculate results
    const correctCount = answers.filter(a => a.isCorrect).length;
    const results: SessionResults = {
      sessionId,
      userId: userUid,
      totalQuestions: answers.length,
      correctAnswers: correctCount,
      accuracy: answers.length > 0 ? correctCount / answers.length : 0,
      completedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };

    // Update cache
    sessionData.status = 'completed';
    sessionData.results = results;
    await hybridCache.set(cacheKey, sessionData, 300);

    const response: APIResponse<SessionResults> = {
      success: true,
      data: results,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    };
    res.json(response);

    logger.performance('Session submit completed', {
      sessionId,
      accuracy: results.accuracy,
      duration: Date.now() - startTime
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({
      error: errorMessage,
      stack: errorStack,
      body: req.body
    }, '세션 제출 실패');
    
    const response: APIResponse<never> = {
      success: false,
      error: 'Internal server error',
      code: 'SESSION_SUBMIT_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session details
 */
router.get('/:sessionId', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  const { sessionId } = req.params;
  
  try {
    const cacheKey = `session:${sessionId}`;
    const sessionData = await hybridCache.get(cacheKey) as SessionData | null;
    
    if (!sessionData) {
      const response: APIResponse<never> = {
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime
        }
      };
      return res.status(404).json(response);
    }
    
    const response: APIResponse<SessionData> = {
      success: true,
      data: sessionData,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: true
      }
    };
    res.json(response);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({
      sessionId,
      error: errorMessage
    }, 'Session retrieval failed');
    
    const response: APIResponse<never> = {
      success: false,
      error: 'Internal server error',
      code: 'SESSION_RETRIEVAL_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    };
    res.status(500).json(response);
  }
});

export default router;