
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

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

// Socket.io 설정
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 8080;

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Firebase 인증 미들웨어 (개발 모드 수정)
const authenticateFirebaseToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];

  // 개발 모드에서는 토큰 없이도 통과
  if (!idToken) {
    console.log('⚠️  개발 모드: 인증 토큰 없이 진행');
    req.user = { uid: 'dev-user', email: 'dev@example.com' }; // Mock user
    return next();
  }

  try {
    if (admin.apps.length === 0) {
      // Firebase 초기화되지 않음 - 개발 모드로 진행
      console.log('⚠️  개발 모드: Firebase 미초기화 상태');
      req.user = { uid: 'dev-user', email: 'dev@example.com' }; // Mock user
      return next();
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    // 개발 모드에서는 에러 시에도 진행
    console.log('⚠️  개발 모드: 토큰 인증 실패하여 Mock user로 진행');
    req.user = { uid: 'dev-user', email: 'dev@example.com' };
    next();
  }
};

// Favicon 처리
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

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

// 사용자 관련 라우트
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await userService.getUser(req.params.userId);
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 컨텐츠 관련 라우트 (예시: 레벨 정보)
app.get('/api/content/level/:levelId', async (req, res) => {
  try {
    const level = await contentService.getLevel(req.params.levelId);
    if (level) {
      res.json({ success: true, data: level });
    } else {
      res.status(404).json({ success: false, message: 'Level not found' });
    }
  } catch (error) {
    console.error('Error getting level:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 발화 평가 라우트
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

// 복습 카드 관련 라우트 (예시: 복습 카드 생성)
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

// 경험치 및 스트릭 관련 라우트 (예시: 경험치 추가)
app.post('/api/exp/add', async (req, res) => {
  try {
    const { userId, amount, type } = req.body;
    if (!userId || !amount || !type) {
      return res.status(400).json({ success: false, message: 'userId, amount, and type are required' });
    }
    await expService.addExp(userId, amount, type);
    res.json({ success: true, message: 'EXP added' });
  } catch (error) {
    console.error('Error adding EXP:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 알림 관련 라우트 (예시: 알림 전송)
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

// 커리큘럼 조회 라우트 (버전별)
app.get('/api/curriculum/:level', async (req, res) => {
  try {
    const level = Number(req.params.level);
    const version = (req.header('X-Curriculum-Version') || 'original').toLowerCase();

    console.log(`📋 커리큘럼 조회: Level ${level}, Version ${version}`);

    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc(version);
    
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: `Curriculum not found: Level ${level}, Version ${version}` 
      });
    }

    const data = snapshot.data();
    
    // 스펙 데이터도 함께 조회 (선택적)
    const includeSpec = req.query.includeSpec === 'true';
    if (includeSpec) {
      const specRef = docRef.collection('specs').doc('content');
      const specSnapshot = await specRef.get();
      if (specSnapshot.exists) {
        data.spec = specSnapshot.data().spec;
      }
    }

    res.json({ 
      success: true, 
      data: data,
      meta: {
        level: level,
        version: version,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('커리큘럼 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 커리큘럼 업서트 라우트
app.post('/api/curriculum/upsert', async (req, res) => {
  try {
    const { level, version, meta, spec } = req.body;
    
    if (!level || !version || !meta) {
      return res.status(400).json({ 
        success: false, 
        message: 'level, version, and meta are required' 
      });
    }

    console.log(`📋 커리큘럼 업서트 시작: curricula/${level}/versions/${version}`);

    // 메타 데이터 업서트
    const metaData = {
      ...meta,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc(version);
    
    await docRef.set(metaData, { merge: true });
    console.log(`✅ 메타 데이터 업서트 완료`);

    // 스펙 데이터 업서트 (선택)
    if (spec) {
      const specRef = docRef.collection('specs').doc('content');
      await specRef.set({
        spec: spec,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`✅ 커리큘럼 스펙 업서트 완료`);
    }

    // 결과 확인
    const snapshot = await docRef.get();
    const data = snapshot.data();

    console.log(`📊 업서트 결과: Level ${data.level}, Version ${data.version}, ${data.totalStages} stages`);

    res.json({ 
      success: true, 
      message: 'Curriculum upserted successfully',
      data: data
    });

  } catch (error) {
    console.error('커리큘럼 업서트 실패:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// 학습 카드 API 엔드포인트
app.get('/api/cards', async (req, res) => {
  try {
    const { level, stage } = req.query;
    
    if (!level || !stage) {
      return res.status(400).json({ 
        success: false, 
        error: 'level and stage parameters are required' 
      });
    }

    console.log(`🎯 카드 조회: Level ${level}, Stage ${stage}`);

    // Firestore에서 해당 레벨/스테이지의 카드 조회
    const stageId = `Lv${level}-P${Math.ceil(stage/6)}-S${stage.toString().padStart(2, '0')}`;
    
    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc('revised')
                     .collection('stages').doc(stageId);
    
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: `Cards not found: Level ${level}, Stage ${stage}` 
      });
    }

    const data = snapshot.data();
    
    // 카드 데이터 변환
    const cards = data.sentences?.map(sentence => ({
      id: sentence.id,
      front_ko: sentence.kr,
      target_en: sentence.en,
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

// 세션 관리 API
app.post('/api/session/start', async (req, res) => {
  try {
    const { userId, level, stage, cardIds } = req.body;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 세션 데이터를 Firestore에 저장 (선택적)
    const sessionData = {
      id: sessionId,
      userId: userId,
      level: level,
      stage: stage,
      cardIds: cardIds,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      items: []
    };

    console.log(`🎮 세션 시작: ${sessionId} (Level ${level}.${stage})`);

    res.json({ 
      success: true, 
      data: { sessionId: sessionId }
    });

  } catch (error) {
    console.error('세션 시작 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.post('/api/session/submit', async (req, res) => {
  try {
    const { sessionId, cardId, userAnswer, isCorrect, score, timeSpent } = req.body;
    
    console.log(`📝 답안 제출: ${sessionId} - ${cardId} (${isCorrect ? '정답' : '오답'})`);

    // 여기서 학습 진도나 통계를 업데이트할 수 있음
    
    res.json({ 
      success: true, 
      data: { progress: { submitted: true } }
    });

  } catch (error) {
    console.error('답안 제출 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

app.post('/api/session/finish', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    console.log(`🏁 세션 완료: ${sessionId}`);

    // 임시 요약 데이터 (실제로는 세션 데이터를 집계)
    const summary = {
      totalCards: 10,
      correctAnswers: 7,
      accuracy: 70,
      averageScore: 75,
      totalTime: 300,
      averageTimePerCard: 30
    };

    res.json({ 
      success: true, 
      data: { summary: summary }
    });

  } catch (error) {
    console.error('세션 완료 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
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
    availableLevels: [2, 3, 4, 5],
    features: ['personalized-packs', 'scenario-dialogue', 'random-review']
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

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 DaSi Backend Server v1.0 started successfully on port ${PORT}!`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
