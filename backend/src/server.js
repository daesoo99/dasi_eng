
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');
const onFinished = require('on-finished');
const client = require('prom-client');
require('dotenv').config();

// Logger and Monitoring setup
const logger = require('./monitoring/logger');
const hybridCache = require('./utils/redisCache');

// Prometheus metrics setup
const Registry = client.Registry;
const register = new Registry();
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpReqDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 400, 800, 1600, 3200]
});
register.registerMetric(httpReqDuration);

// Cache hit rate gauge
const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate_total',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type']
});
register.registerMetric(cacheHitRate);

// Queue processing metrics
const queueProcessingTime = new client.Histogram({
  name: 'queue_processing_time_ms',
  help: 'Queue task processing time in milliseconds',
  labelNames: ['queue_type', 'task_type'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000]
});
register.registerMetric(queueProcessingTime);

// API endpoint counter
const apiRequestsTotal = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(apiRequestsTotal);

// Register queue metrics
const taskQueue = require('./services/taskQueue');
register.registerMetric(taskQueue.metrics.queueSize);
register.registerMetric(taskQueue.metrics.queuePending);
register.registerMetric(taskQueue.metrics.taskProcessingTime);

// Firebase 초기화 (서비스 계정 키는 config/firebase.js에서 로드)
const { db, auth, admin } = require('./config/firebase');

// 서비스 모듈 임포트
const userService = require('./services/userService');
const contentService = require('./services/contentService');
const speechService = require('./services/speechService');
const reviewService = require('./services/reviewService');
const expService = require('./services/expService');
const notificationService = require('./services/notificationService');
const smartReviewService = require('./services/smartReviewService');

const app = express();
const server = http.createServer(app);

// Swagger API 문서 설정 (Flutter 호환)
require('./swagger')(app);

// Socket.io 설정 - 개발 환경에서 더 유연한 CORS 설정
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ["http://localhost:3016", "http://localhost:3017", "http://localhost:3018", "http://localhost:3019", "http://localhost:5173", "http://127.0.0.1:3016", "http://127.0.0.1:3017", "http://127.0.0.1:3018", "http://127.0.0.1:3019", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Curriculum-Version"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 8080;

// 미들웨어 설정 - 개발 환경에서 더 유연한 CORS 설정
app.use(cors({
  origin: function (origin, callback) {
    // 개발 환경에서는 origin이 undefined인 경우(Postman, curl 등) 허용
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL]
      : [
          "http://localhost:3016", 
          "http://localhost:3017", 
          "http://localhost:3018", 
          "http://localhost:3019", 
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:8080",
          "http://127.0.0.1:3016", 
          "http://127.0.0.1:3017", 
          "http://127.0.0.1:3018", 
          "http://127.0.0.1:3019", 
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
          "http://127.0.0.1:8080",
          process.env.FRONTEND_URL
        ].filter(Boolean);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Curriculum-Version", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Pino HTTP logger middleware
app.use(pinoHttp({ 
  logger,
  genReqId: () => Math.random().toString(36).substr(2, 9)
}));

// Request timing and metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  onFinished(res, () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpReqDuration.labels(req.method, route, statusCode).observe(duration);
    apiRequestsTotal.labels(req.method, route, statusCode).inc();
    
    // Performance logging
    logger.performance(`${req.method} ${route} - ${statusCode}`, {
      duration,
      method: req.method,
      route,
      statusCode,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// 요청 로깅 미들웨어 (개발 모드에서만)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Request timeout 미들웨어
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.error('Request timeout:', req.path);
    res.status(408).json({
      success: false,
      error: 'Request timeout',
      code: 'REQUEST_TIMEOUT'
    });
  });
  next();
});

// Firebase 인증 미들웨어 (개선된 개발 모드)
const authenticateFirebaseToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 개발 모드에서는 토큰 없이도 통과
  if (!idToken) {
    if (isDevelopment) {
      console.log('🔓 개발 모드: 인증 토큰 없이 진행');
      req.user = { 
        uid: 'dev-user', 
        email: 'dev@example.com',
        name: 'Development User',
        picture: null,
        email_verified: true
      };
      return next();
    } else {
      return res.status(401).json({ 
        success: false, 
        error: 'Authorization token required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }
  }

  try {
    if (admin.apps.length === 0 || !admin.auth) {
      if (isDevelopment) {
        console.log('🔓 개발 모드: Firebase 미초기화 상태');
        req.user = { 
          uid: 'dev-user', 
          email: 'dev@example.com',
          name: 'Development User',
          picture: null,
          email_verified: true
        };
        return next();
      } else {
        return res.status(500).json({ 
          success: false, 
          error: 'Authentication service unavailable',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log(`✅ 사용자 인증 성공: ${decodedToken.email || decodedToken.uid}`);
    next();
  } catch (error) {
    console.error('Firebase ID 토큰 검증 실패:', error.message);
    
    if (isDevelopment) {
      console.log('🔓 개발 모드: 토큰 인증 실패하여 Mock user로 진행');
      req.user = { 
        uid: 'dev-user', 
        email: 'dev@example.com',
        name: 'Development User',
        picture: null,
        email_verified: true
      };
      next();
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
  }
};

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Update cache hit rate metrics
    const cacheStats = hybridCache.getStats();
    cacheHitRate.labels('redis').set(cacheStats.isRedisEnabled ? 1 : 0);
    cacheHitRate.labels('local').set(cacheStats.localCacheSize || 0);
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics', error);
    res.status(500).send('Internal server error');
  }
});

// Route handlers - extracted to separate modules for better organization
const curriculumRouter = require('./routes/curriculum');
const cardsRouter = require('./routes/cards');

app.use('/api/curriculum', curriculumRouter);
app.use('/api/cards', cardsRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: 서버 상태 확인
 *     description: 서버의 건강 상태, 캐시 상태, 지원 기능을 조회합니다
 *     responses:
 *       200:
 *         description: 서버가 정상적으로 작동 중
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 cache:
 *                   type: object
 *                   description: 캐시 상태 정보
 *                 availableLevels:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: 지원하는 학습 레벨
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 활성화된 기능 목록
 */
// Health check with cache status
app.get('/health', (req, res) => {
  const cacheStats = hybridCache.getStats();
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: cacheStats,
    availableLevels: [1, 2, 3, 4, 5, 6],
    features: ['level-1-local', 'personalized-packs', 'scenario-dialogue', 'random-review', 'redis-cache', 'prometheus-metrics']
  });
});

// Favicon 처리
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

// Import optimized route handlers
const sessionsRouter = require('./routes/sessions');
const feedbackRouter = require('./routes/feedback');
const curriculumRouter = require('./routes/curriculum');
const { globalErrorHandler, notFoundHandler, requestTimer } = require('./middleware/errorHandler');

// Apply global middleware
app.use(requestTimer);

// Mount optimized route handlers
app.use('/api/sessions', sessionsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/curriculum', curriculumRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DaSi Backend API',
    version: '1.0.0',
    status: 'running',
    features: [
      'Firebase Auth',
      'Firestore Database',
      'Google Cloud Speech API Integration (planned)',
      'Gemini API Evaluation (planned)',
      'FCM Notifications',
      'Real-time WebSocket communication'
    ]
  });
});

// API 라우트 (인증 필요)
// 모든 API 라우트에 authenticateFirebaseToken 미들웨어를 적용합니다.
app.use('/api', authenticateFirebaseToken);

// 라우터 임포트
const userRouter = require('./routes/user');
const contentRouter = require('./routes/content');
const expRouter = require('./routes/exp');

// 라우터 마운트
app.use('/api/user', userRouter);
app.use('/api/content', contentRouter);
app.use('/api/exp', expRouter);

// 발화 평가 라우트 (향후 speech 라우터로 분리 예정)
app.post('/api/speech/evaluate', async (req, res) => {
  try {
    const { transcript, targetPattern } = req.body;
    if (!transcript || !targetPattern) {
      return res.status(400).json({ success: false, message: 'Transcript and targetPattern are required' });
    }
    const evaluationResult = await speechService.evaluateSpeech(transcript, targetPattern);
    res.json({ success: true, data: evaluationResult });
  } catch (error) {
    console.error('Error evaluating speech:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 복습 카드 관련 라우트 (향후 review 라우터로 분리 예정)
app.post('/api/review/create', async (req, res) => {
  try {
    const { userId, patternId, type } = req.body; // 예시 데이터
    const reviewData = { userId, patternId, type, nextReview: new Date().toISOString().split('T')[0], stage: 1 };
    await reviewService.createReviewCard(reviewData);
    res.json({ success: true, message: 'Review card created' });
  } catch (error) {
    console.error('Error creating review card:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 알림 관련 라우트 (향후 notification 라우터로 분리 예정)
app.post('/api/notification/send', async (req, res) => {
  try {
    const { token, title, body } = req.body;
    if (!token || !title || !body) {
      return res.status(400).json({ success: false, message: 'Token, title, and body are required' });
    }
    await notificationService.sendNotification(token, { title, body });
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ===== 스마트 복습 시스템 API =====

// 복습 세션 기록
app.post('/api/smart-review/session', async (req, res) => {
  try {
    const { sentenceId, accuracy, responseTime, difficulty } = req.body;
    const userId = req.user.uid;
    
    if (!sentenceId || accuracy === undefined || !responseTime || !difficulty) {
      return res.status(400).json({ 
        success: false, 
        message: 'sentenceId, accuracy, responseTime, and difficulty are required' 
      });
    }
    
    const result = await smartReviewService.recordReviewSession({
      userId,
      sentenceId,
      accuracy,
      responseTime,
      difficulty
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('복습 세션 기록 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 오늘의 복습 문장 조회
app.get('/api/smart-review/today-sentences', async (req, res) => {
  try {
    const userId = req.user.uid;
    const maxCount = parseInt(req.query.maxCount) || 50;
    
    const sentences = await smartReviewService.getTodayReviewSentences(userId, maxCount);
    
    res.json({ success: true, data: sentences });
  } catch (error) {
    console.error('오늘 복습 문장 조회 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 복습 패턴 분석
app.get('/api/smart-review/analytics', async (req, res) => {
  try {
    const userId = req.user.uid;
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await smartReviewService.analyzeReviewPattern(userId, days);
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('복습 패턴 분석 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 개인 맞춤 스케줄 생성
app.get('/api/smart-review/schedule', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const schedule = await smartReviewService.generatePersonalizedSchedule(userId);
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('개인 맞춤 스케줄 생성 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 메모리 강도 조회 (특정 문장들)
app.post('/api/smart-review/memory-strength', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { sentenceIds } = req.body;
    
    if (!sentenceIds || !Array.isArray(sentenceIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'sentenceIds array is required' 
      });
    }
    
    // 각 문장의 메모리 강도 조회
    const memoryStrengths = {};
    
    for (const sentenceId of sentenceIds) {
      try {
        const docRef = db.collection('userMemoryStrength').doc(`${userId}_${sentenceId}`);
        const doc = await docRef.get();
        
        if (doc.exists) {
          memoryStrengths[sentenceId] = doc.data();
        } else {
          memoryStrengths[sentenceId] = {
            strength: 0.5,
            easeFactor: 2.5,
            intervalDays: 1,
            reviewCount: 0,
            nextReviewDate: null
          };
        }
      } catch (error) {
        console.error(`메모리 강도 조회 실패 (${sentenceId}):`, error);
        memoryStrengths[sentenceId] = null;
      }
    }
    
    res.json({ success: true, data: memoryStrengths });
  } catch (error) {
    console.error('메모리 강도 조회 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 복습 통계 대시보드 데이터
app.get('/api/smart-review/dashboard', async (req, res) => {
  try {
    const userId = req.user.uid;
    const timeframe = req.query.timeframe || 'month'; // week, month, quarter
    
    let days;
    switch (timeframe) {
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'quarter': days = 90; break;
      default: days = 30;
    }
    
    // 여러 분석 데이터를 병렬로 조회
    const [analytics, schedule] = await Promise.all([
      smartReviewService.analyzeReviewPattern(userId, days),
      smartReviewService.generatePersonalizedSchedule(userId)
    ]);
    
    // 주간 진행률 데이터 (임시)
    const weeklyProgress = [
      { week: '1주차', reviews: 45, accuracy: 0.82 },
      { week: '2주차', reviews: 52, accuracy: 0.85 },
      { week: '3주차', reviews: 38, accuracy: 0.79 },
      { week: '4주차', reviews: 61, accuracy: 0.88 }
    ];
    
    res.json({ 
      success: true, 
      data: {
        analytics,
        schedule,
        weeklyProgress,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('복습 대시보드 데이터 조회 실패:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/curriculum/{level}:
 *   get:
 *     tags: [Curriculum]
 *     summary: 레벨별 커리큘럼 조회
 *     description: 지정된 레벨의 학습 커리큘럼을 조회합니다 (Flutter 앱용)
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: 학습 레벨 (1-10)
 *         example: 1
 *       - in: header
 *         name: X-Curriculum-Version
 *         schema:
 *           type: string
 *           enum: [original, revised]
 *         description: 커리큘럼 버전
 *         example: "revised"
 *     responses:
 *       200:
 *         description: 커리큘럼 데이터 반환 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContentItem'
 *                 cached:
 *                   type: boolean
 *                   description: 캐시에서 조회 여부
 *       404:
 *         description: 커리큘럼을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */


/**
 * @swagger
 * /api/session/start:
 *   post:
 *     tags: [Session]
 *     summary: 학습 세션 시작
 *     description: 새로운 학습 세션을 시작하고 고유한 세션 ID를 반환합니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, level, stage]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 Firebase UID
 *                 example: "abc123def456"
 *               level:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: 학습 레벨
 *                 example: 1
 *               stage:
 *                 type: string
 *                 description: 스테이지 번호 또는 'ALL'
 *                 example: "1"
 *               cardIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 특정 카드 ID 목록 (선택사항)
 *     responses:
 *       200:
 *         description: 세션 시작 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       example: "ses_abc123"
 *                     userId:
 *                       type: string
 *                       example: "abc123def456"
 *                     level:
 *                       type: integer
 *                       example: 1
 *                     stage:
 *                       type: string
 *                       example: "1"
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     status:
 *                       type: string
 *                       example: "active"
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 세션 관리 API
app.post('/api/session/start', async (req, res) => {
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

    // TODO: Firestore에 세션 저장 (현재는 메모리에만 저장)
    // await db.collection('sessions').doc(sessionId).set(sessionData);

    res.json({
      success: true,
      data: sessionData,
      meta: {
        timestamp: Date.now()
      }
    });

    logger.info('Session started successfully', {
      sessionId,
      userUid,
      level,
      stage
    });

  } catch (error) {
    logger.error('세션 시작 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start session',
      code: 'SESSION_START_ERROR'
    });
  }
});

app.post('/api/session/submit', async (req, res) => {
  try {
    const { sessionId, cardId, userAnswer, isCorrect, score, timeSpent } = req.body;
        
        const responseData = { 
          success: true, 
          data: {
            level: parseInt(level),
            stage: 'ALL',
            mode: 'ALL',
            cards: allCards,
            totalCards: allCards.length,
            stageInfo: {
              id: `Lv${level}-ALL`,
              title: `Level ${level} - ALL Mode`,
              focus: ['All patterns from this level'],
              grammar_meta: ['Mixed patterns']
            }
          }
        };
        
        // 결과 캐시
        cache.curriculumData.set(cacheKey, responseData);
        cache.lastAccessed.set(cacheKey, now);
        
        res.json(responseData);
        return;
      } catch (error) {
        console.error('ALL 모드 처리 실패:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to load ALL mode cards',
          code: 'ALL_MODE_ERROR'
        });
      }
    }

    // Level 1 특별 처리
    if (parseInt(level) === 1) {
      console.log(`📚 Level 1 처리 시작`);
      
      const l1Data = loadLevel1Data();
      console.log(`📂 Level 1 데이터 로드 결과:`, Object.keys(l1Data));
      
      // stage를 문자열로 변환하여 접근
      const stageKey = stage.toString();
      const stageData = l1Data[stageKey];
      
      console.log(`🔍 Stage ${stageKey} 데이터 조회:`, stageData ? '✅ 존재' : '❌ 없음');
      
      if (!stageData) {
        console.error(`❌ Level 1 Stage ${stage} not found. Available stages:`, Object.keys(l1Data));
        return res.status(404).json({ 
          success: false, 
          error: `Level 1 Stage ${stage} not found. Available stages: ${Object.keys(l1Data).join(', ')}` 
        });
      }

      console.log(`📊 Stage ${stage} 카드 개수:`, stageData.cards?.length || 0);

      // Level 1 카드 데이터 변환 (프론트엔드 DrillCard 타입에 맞춤)
      const cards = stageData.cards?.map(card => ({
        id: card.id,
        level: parseInt(level),
        stage: parseInt(stage),
        front_ko: card.front_ko,
        target_en: card.target_en,
        difficulty: 1, // Level 1은 기본 난이도 1
        pattern_tags: [card.pattern],
        // 백엔드 전용 필드들 (호환성을 위해 유지)
        form: 'aff',
        grammar_tags: [card.pattern]
      })) || [];

      console.log(`✅ Level 1 Stage ${stage} 카드 ${cards.length}개 반환`);

      res.json({ 
        success: true, 
        data: {
          level: parseInt(level),
          stage: parseInt(stage),
          cards: cards,
          totalCards: cards.length,
          stageInfo: {
            id: `Lv1-S${stage.toString().padStart(2, '0')}`,
            title: cards[0]?.title || `Level 1 Stage ${stage}`,
            focus: [cards[0]?.pattern || 'Basic Patterns'],
            grammar_meta: cards[0]?.key_structures || []
          }
        }
      });
      return;
    }

    // Level 2-6 기존 Firestore 처리
    const stageId = `Lv${level}-P${Math.ceil(stage/6)}-S${stage.toString().padStart(2, '0')}`;
    
    console.log(`🔍 Firestore 조회 경로: curricula/${level}/versions/revised/stages/${stageId}`);
    
    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc('revised')
                     .collection('stages').doc(stageId);
    
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      // 실제 존재하는 스테이지들을 확인해보자
      const stagesRef = db.collection('curricula').doc(level.toString())
                          .collection('versions').doc('revised')
                          .collection('stages');
      const allStages = await stagesRef.limit(5).get();
      console.log(`📋 Level ${level}에서 찾은 스테이지들:`, allStages.docs.map(d => d.id));
    }
    
    if (!snapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: `Cards not found: Level ${level}, Stage ${stage}` 
      });
    }

    const data = snapshot.data();
    
    // 카드 데이터 변환 (프론트엔드 DrillCard 타입에 맞춤)
    const cards = data.sentences?.map(sentence => ({
      id: sentence.id,
      level: parseInt(level),
      stage: parseInt(stage),
      front_ko: sentence.kr,
      target_en: sentence.en,
      difficulty: Math.min(parseInt(level), 5), // Level을 난이도로 매핑 (최대 5)
      pattern_tags: sentence.grammar_tags || [],
      // 백엔드 전용 필드들 (호환성을 위해 유지)
      form: sentence.form,
      grammar_tags: sentence.grammar_tags || []
    })) || [];

    // 랜덤 셔플 (엔진 설정에 따라)
    if (data.engine?.randomPick) {
      const [min, max] = data.engine.randomPick;
      const selectedCount = Math.min(Math.max(min, max), cards.length);
      
      // Fisher-Yates shuffle
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      
      cards.splice(selectedCount);
    }

    res.json({ 
      success: true, 
      data: {
        level: parseInt(level),
        stage: parseInt(stage),
        cards: cards,
        totalCards: cards.length,
        stageInfo: {
          id: stageId,
          title: data.title,
          focus: data.focus || [],
          grammar_meta: data.grammar_meta || []
        }
      }
    });

  } catch (error) {
    console.error('카드 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ALL 모드 전용 API 엔드포인트
app.get('/api/cards/all', async (req, res) => {
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({ 
        success: false, 
        error: 'level parameter is required' 
      });
    }

    console.log(`🔄 ALL 모드 전용 API: Level ${level}`);
    
    const allCards = await getAllLevelCards(parseInt(level));
    
    res.json({ 
      success: true, 
      data: {
        level: parseInt(level),
        mode: 'ALL',
        cards: allCards,
        totalCards: allCards.length,
        shuffled: true,
        stageInfo: {
          id: `Lv${level}-ALL`,
          title: `Level ${level} - ALL Mode`,
          focus: ['All patterns from this level'],
          grammar_meta: ['Mixed patterns']
        }
      }
    });

  } catch (error) {
    console.error('ALL 모드 전용 API 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load ALL mode cards' 
    });
  }
});

// 피드백 API 엔드포인트
app.post('/api/feedback', async (req, res) => {
  try {
    const { front_ko, sttText, target_en } = req.body;
    
    if (!front_ko || !sttText || !target_en) {
      return res.status(400).json({ 
        success: false, 
        error: 'front_ko, sttText, and target_en are required' 
      });
    }

    console.log(`🎤 피드백 요청: "${sttText}" vs "${target_en}"`);

    // 간단한 규칙 기반 피드백 (추후 Gemini API로 확장)
    const userAnswer = sttText.toLowerCase().trim();
    const targetAnswer = target_en.toLowerCase().trim();
    
    // 기본 유사도 계산
    const similarity = calculateSimilarity(userAnswer, targetAnswer);
    const isCorrect = similarity > 0.8;
    const score = Math.round(similarity * 100);

    // 피드백 생성
    let feedback = '';
    let suggestions = [];

    if (isCorrect) {
      feedback = '정확합니다! 잘했어요.';
    } else {
      feedback = '다시 시도해보세요.';
      suggestions.push(`정답: ${target_en}`);
      
      if (similarity > 0.5) {
        suggestions.push('거의 맞았어요! 발음을 더 명확하게 해보세요.');
      } else {
        suggestions.push('문법과 단어를 다시 확인해보세요.');
      }
    }

    res.json({ 
      success: true, 
      data: {
        correct: isCorrect,
        score: score,
        feedback: feedback,
        suggestions: suggestions,
        userAnswer: sttText,
        targetAnswer: target_en,
        similarity: similarity
      }
    });

  } catch (error) {
    console.error('피드백 생성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 맞춤형 피드백 API 엔드포인트 (AI 확장 대비)
app.post('/api/feedback/custom', async (req, res) => {
  try {
    const { userId, interests, difficultyLevel = 'intermediate', patternId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required' 
      });
    }

    console.log(`🎯 맞춤 피드백 요청: userId=${userId}, interests=${interests?.join(',')}`);

    // Mock 데이터 생성 (나중에 AI로 교체)
    const interestTemplates = {
      sports: ['I love playing soccer on weekends', 'Basketball is my favorite sport'],
      music: ['I enjoy listening to classical music', 'Let\'s discuss your favorite band'],
      food: ['I wanna try Korean BBQ tonight', 'This restaurant serves amazing pasta'],
      travel: ['I want to visit Japan next year', 'My dream destination is Paris'],
      technology: ['AI is changing our daily lives', 'I need to upgrade my smartphone'],
      business: ['The meeting starts at 3 PM', 'Our sales target for this quarter'],
      education: ['I\'m studying English conversation', 'Online learning is very convenient'],
      health: ['Regular exercise keeps me healthy', 'I try to eat vegetables daily'],
      gaming: ['I enjoy playing mobile games', 'The new game update looks exciting']
    };

    // 사용자 관심사 기반 예시 생성
    let customExamples = [];
    if (interests && interests.length > 0) {
      interests.forEach(interest => {
        if (interestTemplates[interest]) {
          customExamples.push(...interestTemplates[interest]);
        }
      });
    }

    // 기본 예시가 없으면 일반적인 예시 제공
    if (customExamples.length === 0) {
      customExamples = [
        'I wanna go jogging after work',
        'She wanna join the team dinner',
        'Let\'s talk about your hobbies',
        'I need to practice English more'
      ];
    }

    // 난이도별 문장 조정 (Mock)
    const difficultyModifier = {
      'beginner': (sentence) => sentence.replace(/complex/g, 'simple').replace(/difficult/g, 'easy'),
      'intermediate': (sentence) => sentence,
      'advanced': (sentence) => sentence.replace(/simple/g, 'sophisticated').replace(/easy/g, 'challenging')
    };

    const adjustedExamples = customExamples
      .slice(0, 6) // 최대 6개
      .map(sentence => ({
        sentence: difficultyModifier[difficultyLevel] ? difficultyModifier[difficultyLevel](sentence) : sentence,
        context: `Practice with ${interests?.join(' and ') || 'general topics'}`,
        difficulty: difficultyLevel === 'beginner' ? 2 : difficultyLevel === 'advanced' ? 4 : 3,
        interests: interests || []
      }));

    // Firestore 구조와 호환되는 응답 (향후 실제 저장용)
    const feedbackData = {
      feedbackInfo: {
        feedbackId: `fb_${Math.random().toString(36).substr(2, 12)}`,
        userId: userId,
        patternId: patternId || `p${Math.floor(Math.random() * 100)}`,
        timestamp: new Date().toISOString()
      },
      customExamples: {
        userInterests: interests || [],
        difficultyLevel: difficultyLevel,
        generatedExamples: adjustedExamples
      },
      metadata: {
        version: '1.0.0',
        source: 'manual', // 나중에 'ai-generated'로 변경
        language: 'ko'
      }
    };

    res.json({
      success: true,
      data: {
        examples: adjustedExamples.map(ex => ex.sentence),
        customExamples: adjustedExamples,
        feedbackStructure: feedbackData, // AI 확장 시 참고용
        aiReady: false, // AI 연결 상태
        message: `Generated ${adjustedExamples.length} examples based on interests: ${interests?.join(', ') || 'general'}`
      }
    });

  } catch (error) {
    console.error('맞춤 피드백 생성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 피드백 저장 API (Firestore 연동 대비)
app.post('/api/feedback/save', async (req, res) => {
  try {
    const feedbackData = req.body;
    
    // 기본 검증
    if (!feedbackData.feedbackInfo?.userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'feedbackInfo.userId is required' 
      });
    }

    console.log(`💾 피드백 저장 요청: ${feedbackData.feedbackInfo.feedbackId}`);

    // TODO: Firestore 저장 로직 (현재는 로그만)
    // await db.collection('feedback').doc(feedbackData.feedbackInfo.feedbackId).set(feedbackData);
    
    res.json({
      success: true,
      data: {
        feedbackId: feedbackData.feedbackInfo.feedbackId,
        saved: false, // 실제 저장 시 true로 변경
        message: 'Feedback structure validated, ready for Firestore integration'
      }
    });

  } catch (error) {
    console.error('피드백 저장 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * @swagger
 * /api/session/start:
 *   post:
 *     tags: [Session]
 *     summary: 학습 세션 시작
 *     description: 새로운 학습 세션을 시작하고 고유한 세션 ID를 반환합니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, level, stage]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 Firebase UID
 *                 example: "abc123def456"
 *               level:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: 학습 레벨
 *                 example: 1
 *               stage:
 *                 type: string
 *                 description: 스테이지 번호 또는 'ALL'
 *                 example: "1"
 *               cardIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 특정 카드 ID 목록 (선택사항)
 *     responses:
 *       200:
 *         description: 세션 시작 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessionId:
 *                   type: string
 *                   description: 생성된 세션 ID
 *                   example: "session_1640995200000_abc123def"
 *                 level:
 *                   type: integer
 *                   example: 1
 *                 stage:
 *                   type: string
 *                   example: "1"
 *                 message:
 *                   type: string
 *                   example: "Session started successfully"
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
// 세션 관리 API
app.post('/api/session/start', async (req, res) => {
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
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 세션 데이터 구조
    const sessionData = {
      id: sessionId,
      userId: userUid,
      level: parseInt(level),
      stage: stage === 'ALL' ? 'ALL' : parseInt(stage),
      cardIds: cardIds || [],
      startedAt: admin.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString(),
      status: 'active',
      items: [],
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        createdAt: new Date().toISOString()
      }
    };

    // Firestore에 세션 저장 시도 (실패해도 계속 진행)
    try {
      if (db && db.collection) {
        await db.collection('studySessions').doc(sessionId).set(sessionData);
        console.log(`💾 세션 데이터 저장 완료: ${sessionId}`);
      }
    } catch (dbError) {
      console.warn('세션 데이터 저장 실패 (계속 진행):', dbError.message);
    }

    console.log(`🎮 세션 시작: ${sessionId} (Level ${level}.${stage}, User: ${userUid})`);

    res.json({ 
      success: true, 
      data: { 
        sessionId: sessionId,
        userId: userUid,
        level: parseInt(level),
        stage: stage,
        startedAt: sessionData.startedAt
      }
    });

  } catch (error) {
    console.error('세션 시작 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start session',
      code: 'SESSION_START_ERROR'
    });
  }
});

app.post('/api/session/submit', async (req, res) => {
  try {
    const { sessionId, cardId, userAnswer, isCorrect, score, timeSpent } = req.body;
    const userUid = req.user?.uid || 'anonymous';
    
    // 입력 검증
    if (!sessionId || !cardId || userAnswer === undefined || isCorrect === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId, cardId, userAnswer, and isCorrect are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }
    
    // 답안 데이터 구조
    const submissionData = {
      cardId: cardId,
      userAnswer: userAnswer,
      isCorrect: isCorrect,
      score: score || 0,
      timeSpent: timeSpent || 0,
      submittedAt: new Date().toISOString(),
      userId: userUid
    };

    // Firestore에 답안 데이터 저장 시도
    try {
      if (db && db.collection) {
        // 세션 문서에 답안 추가
        const sessionRef = db.collection('studySessions').doc(sessionId);
        await sessionRef.update({
          [`items.${cardId}`]: submissionData,
          lastUpdated: admin.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
        });
        
        // 사용자 통계 업데이트
        const userStatsRef = db.collection('userStats').doc(userUid);
        await userStatsRef.set({
          totalAnswers: admin.firestore.FieldValue.increment(1),
          correctAnswers: admin.firestore.FieldValue.increment(isCorrect ? 1 : 0),
          totalScore: admin.firestore.FieldValue.increment(score || 0),
          lastActivity: admin.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
        }, { merge: true });
        
        console.log(`💾 답안 데이터 저장 완료: ${sessionId}/${cardId}`);
      }
    } catch (dbError) {
      console.warn('답안 데이터 저장 실패 (계속 진행):', dbError.message);
    }

    console.log(`📝 답안 제출: ${sessionId} - ${cardId} (${isCorrect ? '정답' : '오답'}, Score: ${score})`);

    res.json({ 
      success: true, 
      data: { 
        progress: { 
          submitted: true,
          cardId: cardId,
          isCorrect: isCorrect,
          score: score
        }
      }
    });

  } catch (error) {
    console.error('답안 제출 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit answer',
      code: 'SUBMIT_ANSWER_ERROR'
    });
  }
});

app.post('/api/session/finish', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userUid = req.user?.uid || 'anonymous';
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId is required',
        code: 'MISSING_SESSION_ID'
      });
    }
    
    console.log(`🏁 세션 완료 요청: ${sessionId}`);

    let summary = {
      totalCards: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageScore: 0,
      totalTime: 0,
      averageTimePerCard: 0,
      sessionId: sessionId
    };

    // Firestore에서 세션 데이터 조회 및 요약 생성
    try {
      if (db && db.collection) {
        const sessionDoc = await db.collection('studySessions').doc(sessionId).get();
        
        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data();
          const items = sessionData.items || {};
          
          const totalCards = Object.keys(items).length;
          const correctAnswers = Object.values(items).filter(item => item.isCorrect).length;
          const totalScore = Object.values(items).reduce((sum, item) => sum + (item.score || 0), 0);
          const totalTime = Object.values(items).reduce((sum, item) => sum + (item.timeSpent || 0), 0);
          
          summary = {
            totalCards: totalCards,
            correctAnswers: correctAnswers,
            accuracy: totalCards > 0 ? Math.round((correctAnswers / totalCards) * 100) : 0,
            averageScore: totalCards > 0 ? Math.round(totalScore / totalCards) : 0,
            totalTime: Math.round(totalTime / 1000), // 초 단위로 변환
            averageTimePerCard: totalCards > 0 ? Math.round(totalTime / totalCards / 1000) : 0,
            sessionId: sessionId,
            level: sessionData.level,
            stage: sessionData.stage,
            startedAt: sessionData.startedAt,
            finishedAt: new Date().toISOString()
          };
          
          // 세션 상태 업데이트
          await sessionDoc.ref.update({
            status: 'completed',
            finishedAt: admin.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString(),
            summary: summary
          });
          
          console.log(`📊 세션 요약 생성 완료: ${totalCards}개 문제, ${correctAnswers}개 정답`);
        } else {
          console.warn(`세션 데이터를 찾을 수 없음: ${sessionId}`);
        }
      }
    } catch (dbError) {
      console.warn('세션 데이터 조회 실패 (기본 요약 반환):', dbError.message);
    }

    res.json({ 
      success: true, 
      data: { summary: summary }
    });

  } catch (error) {
    console.error('세션 완료 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to finish session',
      code: 'SESSION_FINISH_ERROR'
    });
  }
});

// 랜덤 복습 API 엔드포인트
app.get('/api/review/random', async (req, res) => {
  try {
    const { userId, count = 10, levels } = req.query;
    
    console.log(`🔄 랜덤 복습 요청: ${count}개 카드, 레벨: ${levels || 'all'}`);

    // 사용할 레벨들 결정
    const targetLevels = levels ? levels.split(',').map(Number) : [2, 3, 4, 5];
    const cardCount = Math.min(parseInt(count), 50); // 최대 50개 제한
    
    const allCards = [];
    
    // 각 레벨에서 카드 수집
    for (const level of targetLevels) {
      try {
        const levelRef = db.collection('curricula').doc(level.toString())
                          .collection('versions').doc('revised');
        
        const stagesSnapshot = await levelRef.listCollections();
        
        for (const stageCollection of stagesSnapshot) {
          if (stageCollection.id === 'stages') {
            const stagesQuery = await stageCollection.get();
            
            for (const stageDoc of stagesQuery.docs) {
              const stageData = stageDoc.data();
              
              if (stageData.sentences && stageData.sentences.length > 0) {
                // 각 스테이지에서 1-3개 카드만 선택
                const stageCards = stageData.sentences
                  .slice(0, 3)
                  .map(sentence => ({
                    id: sentence.id,
                    front_ko: sentence.kr,
                    target_en: sentence.en,
                    form: sentence.form,
                    grammar_tags: sentence.grammar_tags || [],
                    level: level,
                    stage: stageDoc.id,
                    stageTitle: stageData.title
                  }));
                
                allCards.push(...stageCards);
              }
            }
          }
        }
      } catch (levelError) {
        console.warn(`레벨 ${level} 카드 수집 실패:`, levelError.message);
      }
    }
    
    // Fisher-Yates 셔플
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    // 요청된 개수만큼 선택
    const selectedCards = allCards.slice(0, cardCount);
    
    res.json({ 
      success: true, 
      data: {
        cards: selectedCards,
        totalCards: selectedCards.length,
        sourceLevels: targetLevels,
        type: 'random_review'
      }
    });

  } catch (error) {
    console.error('랜덤 복습 카드 생성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 오답 가중 복습 API
app.get('/api/review/retry', async (req, res) => {
  try {
    const { userId, sessionId } = req.query;
    
    console.log(`🔁 오답 복습 요청: User ${userId}, Session ${sessionId}`);

    // 실제 구현에서는 사용자의 오답 기록을 Firestore에서 조회
    // 현재는 임시 데이터로 응답
    const retryCards = [
      {
        id: 'retry_001',
        front_ko: '나는 어제 영화를 봤습니다.',
        target_en: 'I watched a movie yesterday.',
        form: 'aff',
        grammar_tags: ['PAST-SIMPLE'],
        level: 2,
        stage: 'retry',
        retryCount: 2,
        lastAttempted: new Date().toISOString()
      }
    ];

    res.json({ 
      success: true, 
      data: {
        cards: retryCards,
        totalCards: retryCards.length,
        type: 'retry_review'
      }
    });

  } catch (error) {
    console.error('오답 복습 카드 생성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 개인 맞춤 학습팩 API 엔드포인트들
app.get('/api/personalized/analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 약점 분석 요청: User ${userId}`);

    // 실제 구현에서는 사용자의 학습 기록을 분석
    // 현재는 Mock 데이터 반환
    const weakAreas = [
      {
        category: 'grammar',
        type: 'present-perfect',
        description: '현재완료 시제 사용 어려움',
        frequency: 5,
        lastEncountered: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        category: 'grammar',
        type: 'conditionals',
        description: '가정법 구조 혼동',
        frequency: 3,
        lastEncountered: new Date(Date.now() - 172800000) // 2 days ago
      },
      {
        category: 'vocabulary',
        type: 'business',
        description: '비즈니스 전문 용어 부족',
        frequency: 4,
        lastEncountered: new Date(Date.now() - 43200000) // 12 hours ago
      },
      {
        category: 'grammar',
        type: 'passive-voice',
        description: '수동태 구조 실수',
        frequency: 2,
        lastEncountered: new Date(Date.now() - 259200000) // 3 days ago
      }
    ];

    res.json({
      success: true,
      weakAreas: weakAreas
    });

  } catch (error) {
    console.error('약점 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/personalized/generate', async (req, res) => {
  try {
    const { userId, targetWeakAreas, difficulty, sentenceCount, focusType } = req.body;
    
    console.log(`🎯 개인 학습팩 생성 요청: User ${userId}, Areas: ${targetWeakAreas?.join(', ')}`);

    // 약점 영역에 맞는 문장들 수집
    const sentences = await generatePersonalizedSentences(targetWeakAreas, sentenceCount, difficulty);
    
    const personalizedPack = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `맞춤 학습팩: ${targetWeakAreas?.slice(0, 2).join(', ')} 외`,
      description: `${targetWeakAreas?.length || 0}개 약점 영역을 집중 연습하는 개인 맞춤 학습팩`,
      targetWeakAreas: targetWeakAreas?.map(area => ({
        category: area.includes('perfect') || area.includes('conditional') || area.includes('passive') ? 'grammar' : 'vocabulary',
        type: area,
        description: getAreaDescription(area),
        frequency: Math.floor(Math.random() * 5) + 1,
        lastEncountered: new Date()
      })) || [],
      difficulty: difficulty || 'intermediate',
      estimatedTime: Math.ceil(sentences.length * 2.5),
      sentences: sentences,
      createdAt: new Date(),
      completionRate: 0
    };

    res.json(personalizedPack);

  } catch (error) {
    console.error('개인 학습팩 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/personalized/sentences/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const { count = 10 } = req.query;
    
    console.log(`📝 패턴별 문장 조회: ${pattern}, ${count}개`);

    // 패턴에 맞는 문장들을 데이터베이스에서 검색
    const sentences = await getSentencesByPattern(pattern, parseInt(count));

    res.json({
      success: true,
      sentences: sentences
    });

  } catch (error) {
    console.error('패턴별 문장 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/personalized/packs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📦 사용자 학습팩 조회: User ${userId}`);

    // 실제로는 Firestore에서 사용자의 학습팩들을 조회
    // 현재는 Mock 데이터 반환
    const userPacks = [];

    res.json({
      success: true,
      packs: userPacks
    });

  } catch (error) {
    console.error('사용자 학습팩 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/personalized/progress', async (req, res) => {
  try {
    const { packId, sentenceId, isCorrect, timestamp } = req.body;
    
    console.log(`📊 학습 진도 업데이트: Pack ${packId}, Sentence ${sentenceId}, Correct: ${isCorrect}`);

    // 실제로는 Firestore에 진도 데이터 저장
    // 현재는 로그만 출력

    res.json({
      success: true,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('학습 진도 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 시나리오 대화 API 엔드포인트들
app.get('/api/scenario/categories', async (req, res) => {
  try {
    console.log('🎭 시나리오 카테고리 조회 요청');

    const categories = [
      {
        id: 'daily-life',
        name: '일상 대화',
        description: '일상생활에서 자주 발생하는 대화 상황',
        icon: '🏠',
        scenarios: [
          {
            id: 'dl-restaurant',
            title: '레스토랑에서 주문하기',
            description: '웨이터와의 대화를 통해 음식을 주문하는 상황',
            difficulty: 'beginner',
            estimatedTime: 10,
            totalTurns: 8
          }
        ]
      },
      {
        id: 'business',
        name: '비즈니스',
        description: '업무 환경에서의 전문적인 대화',
        icon: '💼',
        scenarios: [
          {
            id: 'biz-meeting',
            title: '팀 미팅 진행하기',
            description: '프로젝트 진행 상황을 논의하는 팀 미팅',
            difficulty: 'advanced',
            estimatedTime: 15,
            totalTurns: 12
          }
        ]
      },
      {
        id: 'travel',
        name: '여행',
        description: '여행 중 마주치는 다양한 상황',
        icon: '✈️',
        scenarios: [
          {
            id: 'tr-airport',
            title: '공항에서 체크인하기',
            description: '국제선 항공편 체크인 및 수하물 처리',
            difficulty: 'intermediate',
            estimatedTime: 10,
            totalTurns: 8
          }
        ]
      }
    ];

    res.json({
      success: true,
      categories: categories
    });

  } catch (error) {
    console.error('시나리오 카테고리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/scenario/session/start', async (req, res) => {
  try {
    const { userId, scenarioId } = req.body;
    
    console.log(`🎬 대화 세션 시작: User ${userId}, Scenario ${scenarioId}`);

    const sessionId = `dialogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      sessionId,
      scenarioId,
      userId,
      startedAt: new Date(),
      currentTurn: 0,
      userTurns: [],
      isCompleted: false
    };

    res.json(session);

  } catch (error) {
    console.error('대화 세션 시작 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/scenario/session/:sessionId/turn', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userInput } = req.body;
    
    console.log(`💬 사용자 턴 처리: Session ${sessionId}, Input: "${userInput}"`);

    // 간단한 AI 응답 생성 (실제로는 더 정교한 로직 필요)
    const aiResponses = [
      "That's a great response! Let me continue our conversation.",
      "I understand. Could you tell me more about that?",
      "Interesting! How do you feel about this situation?",
      "Thank you for sharing. What would you like to do next?",
      "I see. That makes sense. Let's move on to the next topic."
    ];

    const aiResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    // 피드백 생성
    const feedbacks = [
      "Great grammar usage! Your sentence structure is very natural.",
      "Good vocabulary choice! Try using more varied expressions next time.",
      "Excellent pronunciation! Your intonation was spot-on.",
      "Nice job! Consider using more connecting words to improve flow."
    ];

    const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    const score = Math.floor(Math.random() * 30) + 70; // 70-100
    const isCompleted = Math.random() < 0.3; // 30% chance of completion

    res.json({
      aiResponse,
      feedback,
      score,
      isCompleted,
      nextTurn: !isCompleted ? {
        id: `turn-${Date.now()}`,
        turnNumber: Math.floor(Math.random() * 10) + 1,
        speaker: 'ai',
        text_kr: 'AI의 다음 응답입니다.',
        text_en: aiResponse,
        context: 'Continuing the conversation'
      } : null
    });

  } catch (error) {
    console.error('사용자 턴 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/scenario/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`🏁 대화 세션 완료: Session ${sessionId}`);

    const summary = {
      finalScore: Math.floor(Math.random() * 30) + 70,
      summary: '훌륭한 대화 실력을 보여주셨습니다! 자연스러운 표현과 적절한 문법 사용이 인상적이었습니다.',
      achievements: [
        '완벽한 인사말 구사',
        '자연스러운 질문 형성',
        '적절한 어휘 선택',
        '대화 흐름 유지'
      ],
      recommendations: [
        '좀 더 다양한 접속사 사용하기',
        '감정 표현 어휘 늘리기',
        '복문 구조 연습하기'
      ]
    };

    res.json(summary);

  } catch (error) {
    console.error('대화 세션 완료 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    availableLevels: [1, 2, 3, 4, 5, 6],
    features: ['level-1-local', 'personalized-packs', 'scenario-dialogue', 'random-review']
  });
});

// 개인 맞춤 학습팩 헬퍼 함수들
async function generatePersonalizedSentences(targetWeakAreas, count, difficulty) {
  const sentences = [];
  const targetCount = Math.min(count, 50);
  
  // 각 약점 영역에서 문장들 수집
  for (const area of targetWeakAreas || []) {
    const areaSentences = await getSentencesByPattern(area, Math.ceil(targetCount / targetWeakAreas.length));
    sentences.push(...areaSentences);
  }
  
  // 부족한 경우 추가 문장들로 채우기
  if (sentences.length < targetCount) {
    const additionalSentences = await getRandomSentencesByDifficulty(difficulty, targetCount - sentences.length);
    sentences.push(...additionalSentences);
  }
  
  // 중복 제거 및 셔플
  const uniqueSentences = sentences.filter((sentence, index, self) => 
    index === self.findIndex(s => s.id === sentence.id)
  ).slice(0, targetCount);
  
  // Fisher-Yates 셔플
  for (let i = uniqueSentences.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueSentences[i], uniqueSentences[j]] = [uniqueSentences[j], uniqueSentences[i]];
  }
  
  return uniqueSentences;
}

async function getSentencesByPattern(pattern, count) {
  try {
    const mockSentences = {
      'present-perfect': [
        {
          id: 'pp1',
          kr: '나는 그 영화를 세 번 봤어요.',
          en: 'I have seen that movie three times.',
          level: 3,
          stage: 'Lv3-P2-S08',
          targetPattern: 'PRESENT-PERFECT',
          difficulty: 3,
          weakAreaTypes: ['present-perfect'],
          explanation: '현재완료: 경험을 나타내는 용법'
        },
        {
          id: 'pp2',
          kr: '그는 아직 숙제를 끝내지 않았습니다.',
          en: 'He hasn\'t finished his homework yet.',
          level: 3,
          stage: 'Lv3-P2-S09',
          targetPattern: 'PRESENT-PERFECT-NEGATIVE',
          difficulty: 3,
          weakAreaTypes: ['present-perfect'],
          explanation: '현재완료: 부정형과 yet 사용'
        }
      ],
      'conditionals': [
        {
          id: 'cond1',
          kr: '만약 비가 온다면, 우리는 집에 있을 것입니다.',
          en: 'If it rains, we will stay at home.',
          level: 3,
          stage: 'Lv3-P3-S12',
          targetPattern: 'IF-CONDITIONAL',
          difficulty: 3,
          weakAreaTypes: ['conditionals'],
          explanation: '1종 조건문: 미래의 가능한 상황'
        },
        {
          id: 'cond2',
          kr: '돈이 있다면 새 차를 살 텐데요.',
          en: 'If I had money, I would buy a new car.',
          level: 4,
          stage: 'Lv4-P2-S15',
          targetPattern: 'CONDITIONAL-2ND',
          difficulty: 4,
          weakAreaTypes: ['conditionals'],
          explanation: '2종 조건문: 현재의 가정적 상황'
        }
      ],
      'business': [
        {
          id: 'biz1',
          kr: '회의 일정을 조정해야 합니다.',
          en: 'We need to reschedule the meeting.',
          level: 4,
          stage: 'Lv4-P1-S03',
          targetPattern: 'BUSINESS-SCHEDULING',
          difficulty: 2,
          weakAreaTypes: ['business'],
          explanation: 'reschedule: 일정을 다시 잡다'
        },
        {
          id: 'biz2',
          kr: '분기별 매출 보고서를 검토했습니다.',
          en: 'We reviewed the quarterly sales report.',
          level: 4,
          stage: 'Lv4-P2-S08',
          targetPattern: 'BUSINESS-REPORTING',
          difficulty: 3,
          weakAreaTypes: ['business'],
          explanation: 'quarterly: 분기별의, sales report: 매출 보고서'
        }
      ],
      'passive-voice': [
        {
          id: 'pass1',
          kr: '이 건물은 1950년에 지어졌습니다.',
          en: 'This building was built in 1950.',
          level: 3,
          stage: 'Lv3-P4-S16',
          targetPattern: 'PASSIVE-PAST',
          difficulty: 3,
          weakAreaTypes: ['passive-voice'],
          explanation: '수동태: be + 과거분사 형태'
        }
      ]
    };
    
    const patternSentences = mockSentences[pattern] || [];
    return patternSentences.slice(0, count);
    
  } catch (error) {
    console.error(`패턴 ${pattern} 문장 검색 실패:`, error);
    return [];
  }
}

async function getRandomSentencesByDifficulty(difficulty, count) {
  // 난이도에 따른 레벨 결정
  const levelMap = {
    'beginner': [2, 3],
    'intermediate': [3, 4],
    'advanced': [4, 5]
  };
  
  const targetLevels = levelMap[difficulty] || [2, 3, 4];
  const sentences = [];
  
  try {
    for (const level of targetLevels) {
      const levelRef = db.collection('curricula').doc(level.toString())
                        .collection('versions').doc('revised');
      
      const stagesSnapshot = await levelRef.listCollections();
      
      for (const stageCollection of stagesSnapshot) {
        if (stageCollection.id === 'stages') {
          const stagesQuery = await stageCollection.limit(2).get();
          
          for (const stageDoc of stagesQuery.docs) {
            const stageData = stageDoc.data();
            
            if (stageData.sentences && stageData.sentences.length > 0) {
              const stageSentences = stageData.sentences
                .slice(0, 2)
                .map(sentence => ({
                  id: sentence.id,
                  kr: sentence.kr,
                  en: sentence.en,
                  level: level,
                  stage: stageDoc.id,
                  targetPattern: sentence.grammar_tags?.[0] || 'GENERAL',
                  difficulty: level,
                  weakAreaTypes: ['general'],
                  explanation: `Level ${level} 일반 학습 문장`
                }));
              
              sentences.push(...stageSentences);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('랜덤 문장 검색 실패, Mock 데이터 사용:', error.message);
  }
  
  // Fisher-Yates 셔플
  for (let i = sentences.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
  }
  
  return sentences.slice(0, count);
}

function getAreaDescription(area) {
  const descriptions = {
    'present-perfect': '현재완료: 경험, 완료, 계속, 결과',
    'conditionals': '가정법: if절, would, 조건문',
    'business': '비즈니스 어휘: 회의, 협상, 프레젠테이션',
    'passive-voice': '수동태: be + 과거분사',
    'academic': '학술 어휘: 연구, 분석, 논문',
    'modals': '조동사: can, should, must, might',
    'future-tense': '미래시제: will, going to, 계획 표현'
  };
  
  return descriptions[area] || area.replace('-', ' ').toUpperCase();
}

// 유사도 계산 함수
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ').filter(w => w.length > 0);
  const words2 = str2.split(' ').filter(w => w.length > 0);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matches = 0;
  words1.forEach(word1 => {
    if (words2.some(word2 => 
      word1 === word2 || 
      (word1.length > 3 && word2.includes(word1)) ||
      (word2.length > 3 && word1.includes(word2))
    )) {
      matches++;
    }
  });
  
  return matches / Math.max(words1.length, words2.length);
}

// Socket.io 연결 처리 (예시)
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // 여기에 실시간 통신 로직 추가
  // 예: 'speechInput' 이벤트 수신 및 처리
  socket.on('speechInput', async (data) => {
    console.log('Received speech input:', data);
    // TODO: STT 처리 및 Gemini 평가 로직 연동
    // const evaluation = await speechService.evaluateSpeech(data.transcript, data.targetPattern);
    // socket.emit('speechResult', evaluation);
  });
});

// /realtime 네임스페이스 추가 (스트리밍 응답용)
io.of('/realtime').on('connection', (socket) => {
  console.log('🔗 /realtime 네임스페이스 연결');

  // 표준화된 파이프라인 이벤트 구조
  socket.on('pipeline', async (payload) => {
    try {
      socket.emit('progress', { step: 'STT_START' });
      const text = await require('./services/taskQueue').sttQueue.add(
        () => require('./services/speechService').runSTT(payload.audioBlob)
      );
      socket.emit('progress', { step: 'STT_DONE', data: { text } });

      socket.emit('progress', { step: 'LLM_START' });
      const llm = await require('./services/taskQueue').llmQueue.add(
        () => require('./services/speechService').runLLM(payload.prompt ?? text)
      );
      socket.emit('progress', { step: 'LLM_DONE', data: { preview: llm.reply?.slice(0,80) } });

      socket.emit('progress', { step: 'TTS_START' });
      const audio = await require('./services/taskQueue').ttsQueue.add(
        () => require('./services/speechService').runTTS(llm.reply, payload.voice)
      );
      
      socket.emit('result', { text, llm, audio });
    } catch (e) {
      socket.emit('error', { message: e.message, step: payload.currentStep || 'unknown' });
    }
  });

  // 데이터 마이그레이션 파이프라인
  socket.on('migrate-file', async (payload) => {
    try {
      socket.emit('progress', { step: 'VALIDATION_START' });
      const validation = await new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`node utils/validate-curriculum.js --file "${payload.file}" --strict`, (error, stdout, stderr) => {
          if (error) reject(new Error(stderr || error.message));
          else resolve({ valid: true, output: stdout });
        });
      });
      socket.emit('progress', { step: 'VALIDATION_DONE', data: { valid: validation.valid } });

      socket.emit('progress', { step: 'MIGRATION_START' });
      const migration = await new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`node utils/safe-migrator.js --file "${payload.file}" --dry-run`, (error, stdout, stderr) => {
          if (error) reject(new Error(stderr || error.message));
          else resolve({ migrated: true, output: stdout });
        });
      });
      socket.emit('progress', { step: 'MIGRATION_DONE', data: { migrated: migration.migrated } });

      socket.emit('result', { validation, migration, file: payload.file });
    } catch (e) {
      socket.emit('error', { message: e.message, file: payload.file });
    }
  });

  // 배치 마이그레이션 파이프라인 - 실시간 파일별 진행 상황
  socket.on('migrate-batch', async (payload) => {
    try {
      socket.emit('progress', { step: 'BATCH_START' });
      
      socket.emit('progress', { step: 'STATUS_CHECK' });
      const status = await new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec('npm run migrate:status', (error, stdout) => {
          if (error) reject(error);
          else resolve({ output: stdout });
        });
      });
      socket.emit('progress', { step: 'STATUS_DONE', data: { hasLocks: status.output.includes('🔒') } });

      socket.emit('progress', { step: 'MIGRATION_EXECUTE' });
      const command = payload.dryRun ? 'npm run migrate:all:dry' : 'npm run migrate:all';
      
      // 실시간 배치 진행 상황 모니터링
      const { exec } = require('child_process');
      const migrationProcess = exec(command);
      
      const files = [];
      const stats = { total: 0, completed: 0, failed: 0, inProgress: 0 };
      
      migrationProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.includes('✅') || line.includes('❌') || line.includes('🔄')) {
            const fileName = line.match(/([^/\\]+\.json)/)?.[1];
            if (fileName) {
              const isCompleted = line.includes('✅');
              const isError = line.includes('❌');
              const isProcessing = line.includes('🔄');
              
              const existingIndex = files.findIndex(f => f.file === fileName);
              if (existingIndex >= 0) {
                files[existingIndex].status = isCompleted ? 'completed' : isError ? 'error' : 'processing';
                if (isError) files[existingIndex].error = line.slice(line.indexOf(fileName) + fileName.length + 1);
              } else {
                files.push({
                  file: fileName,
                  status: isCompleted ? 'completed' : isError ? 'error' : 'processing'
                });
              }
              
              stats.total = files.length;
              stats.completed = files.filter(f => f.status === 'completed').length;
              stats.failed = files.filter(f => f.status === 'error').length;
              stats.inProgress = files.filter(f => f.status === 'processing').length;
              
              socket.emit('progress', { 
                type: 'batch-progress',
                step: 'FILE_UPDATE',
                files: [...files],
                stats: { ...stats }
              });
            }
          }
        });
      });

      const migration = await new Promise((resolve, reject) => {
        migrationProcess.on('close', (code) => {
          resolve({ success: code === 0, output: 'Batch migration completed', error: code !== 0 ? 'Migration failed' : null });
        });
        migrationProcess.on('error', (error) => {
          reject(error);
        });
      });
      
      socket.emit('result', { migration, status, files, stats });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  // 커리큘럼 검증 파이프라인
  socket.on('validate-curriculum', async (payload) => {
    try {
      socket.emit('progress', { step: 'VALIDATION_START' });
      
      const { exec } = require('child_process');
      const validationProcess = exec('npm run validate:all');
      
      const files = [];
      const stats = { total: 0, completed: 0, failed: 0, inProgress: 0 };
      
      validationProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.includes('✅') || line.includes('❌')) {
            const fileName = line.match(/([^/\\]+\.json)/)?.[1];
            if (fileName) {
              const isValid = line.includes('✅');
              const existingIndex = files.findIndex(f => f.file === fileName);
              
              if (existingIndex >= 0) {
                files[existingIndex].status = isValid ? 'completed' : 'error';
                if (!isValid) files[existingIndex].error = 'Validation failed';
              } else {
                files.push({
                  file: fileName,
                  status: isValid ? 'completed' : 'error',
                  error: isValid ? null : 'Validation failed'
                });
              }
              
              stats.total = files.length;
              stats.completed = files.filter(f => f.status === 'completed').length;
              stats.failed = files.filter(f => f.status === 'error').length;
              stats.inProgress = 0;
              
              socket.emit('progress', {
                type: 'batch-progress',
                step: 'VALIDATION_UPDATE',
                files: [...files],
                stats: { ...stats }
              });
            }
          }
        });
      });

      const validation = await new Promise((resolve, reject) => {
        validationProcess.on('close', (code) => {
          resolve({ success: code === 0, output: 'Validation completed', error: code !== 0 ? 'Validation failed' : null });
        });
        validationProcess.on('error', (error) => {
          reject(error);
        });
      });
      
      socket.emit('result', { validation, files, stats });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ /realtime 네임스페이스 연결 해제');
  });
});

// 에러 핸들링 미들웨어
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    code: 'INTERNAL_ERROR'
  });
});

// 404 핸들링
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// Apply error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 DaSi Backend Server v1.0 started successfully on port ${PORT}!`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Optimized route handlers loaded: sessions, feedback, curriculum`);
});

// 우아한 종료 처리
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

// 처리되지 않은 Promise 거부 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, server, io };
