const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../config/firebase');
const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

// Cards routes extracted from server.js for better organization and performance

const CACHE_TTL = 5 * 60 * 1000; // 5분 TTL
const cache = {
  level1Data: null,
  lastAccessed: new Map()
};

/**
 * Level 1 data loader with caching
 * @returns {Object} Level 1 curriculum data
 */
function loadLevel1Data() {
  const cacheKey = 'level1';
  const lastAccess = cache.lastAccessed.get(cacheKey);
  const now = Date.now();
  
  if (cache.level1Data && lastAccess && (now - lastAccess) < CACHE_TTL) {
    return cache.level1Data;
  }
  
  try {
    const filePath = path.join(__dirname, '../level1_generated_data.json');
    logger.info(`📂 Level 1 데이터 파일 경로: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Level 1 데이터 파일이 존재하지 않습니다: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // 캐시 업데이트
    cache.level1Data = data;
    cache.lastAccessed.set(cacheKey, now);
    
    const stageCount = Object.keys(data).length;
    logger.info(`✅ Level 1 데이터 로드 완료: ${stageCount}개 스테이지 (캐시됨)`);
    logger.info(`📋 Available stages: ${Object.keys(data).join(', ')}`);
    
    return data;
  } catch (error) {
    logger.error('❌ Level 1 데이터 로드 실패:', error.message);
    const fallbackData = {};
    cache.level1Data = fallbackData;
    cache.lastAccessed.set(cacheKey, now);
    return fallbackData;
  }
}

/**
 * Get all cards for a specific level (ALL mode)
 * @param {number} level - Level number
 * @returns {Array} Array of cards
 */
async function getAllLevelCards(level) {
  const allCards = [];
  
  try {
    if (level === 1) {
      // Level 1 처리
      const l1Data = loadLevel1Data();
      
      Object.keys(l1Data).forEach(stageKey => {
        const stageData = l1Data[stageKey];
        if (stageData.cards && Array.isArray(stageData.cards)) {
          const stageCards = stageData.cards.map(card => ({
            id: `${card.id}_stage${stageKey}`,
            level: 1,
            stage: parseInt(stageKey),
            front_ko: card.front_ko,
            target_en: card.target_en,
            difficulty: 1,
            pattern_tags: [card.pattern],
            form: 'aff',
            grammar_tags: [card.pattern],
            sourceStage: stageKey
          }));
          allCards.push(...stageCards);
        }
      });
      
    } else {
      // Level 2-6 Firestore 처리
      const levelRef = db.collection('curricula').doc(level.toString())
                        .collection('versions').doc('revised')
                        .collection('stages');
      
      const stagesSnapshot = await levelRef.get();
      
      // 병렬 처리로 성능 개선
      const stagePromises = stagesSnapshot.docs.map(async (stageDoc) => {
        const stageData = stageDoc.data();
        
        if (stageData.sentences && Array.isArray(stageData.sentences)) {
          return stageData.sentences.map(sentence => ({
            id: `${sentence.id}_${stageDoc.id}`,
            level: level,
            stage: stageDoc.id,
            front_ko: sentence.kr,
            target_en: sentence.en,
            difficulty: Math.min(level, 5),
            pattern_tags: sentence.grammar_tags || [],
            form: sentence.form,
            grammar_tags: sentence.grammar_tags || [],
            sourceStage: stageDoc.id
          }));
        }
        return [];
      });
      
      const stageResults = await Promise.all(stagePromises);
      stageResults.forEach(stageCards => allCards.push(...stageCards));
    }
    
    // Fisher-Yates 셔플
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    logger.info(`✅ Level ${level} ALL 모드: ${allCards.length}개 카드 로드 완료`);
    return allCards;
    
  } catch (error) {
    logger.error(`❌ Level ${level} ALL 모드 카드 로드 실패:`, error);
    throw error;
  }
}

/**
 * Calculate text similarity for feedback
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
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

/**
 * GET /api/cards
 * Retrieves cards for specific level and stage with hybrid caching
 * Cache TTL: 30 minutes for card data
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { level, stage } = req.query;
    
    if (!level || !stage) {
      return res.status(400).json({ 
        success: false, 
        error: 'level and stage parameters are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    logger.info(`🎯 카드 조회: Level ${level}, Stage ${stage}`, {
      level,
      stage,
      ip: req.ip
    });
    
    // Try cache first (30 min TTL)
    const cacheKey = `cards:${level}:${stage}`;
    const cachedData = await hybridCache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Cache hit for cards data', { cacheKey });
      return res.json({
        success: true,
        ...cachedData,
        meta: {
          ...cachedData.meta,
          cached: true,
          responseTime: Date.now() - startTime
        }
      });
    }

    // ALL 모드 처리
    if (stage === 'ALL') {
      logger.info(`🔄 ALL 모드 처리: Level ${level}`);
      
      try {
        const allCards = await getAllLevelCards(parseInt(level));
        
        const response = { 
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
          },
          meta: {
            level: parseInt(level),
            stage: 'ALL',
            timestamp: Date.now(),
            cached: false,
            responseTime: Date.now() - startTime
          }
        };
        
        // Cache for 30 minutes
        await hybridCache.set(cacheKey, response, 1800);
        
        res.json({ success: true, ...response });
        return;
      } catch (error) {
        logger.error('ALL 모드 처리 실패:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to load ALL mode cards',
          code: 'ALL_MODE_ERROR'
        });
      }
    }

    // Level 1 특별 처리
    if (parseInt(level) === 1) {
      logger.info(`📚 Level 1 처리 시작`);
      
      const l1Data = loadLevel1Data();
      logger.info(`📂 Level 1 데이터 로드 결과:`, Object.keys(l1Data));
      
      const stageKey = stage.toString();
      const stageData = l1Data[stageKey];
      
      logger.info(`🔍 Stage ${stageKey} 데이터 조회:`, stageData ? '✅ 존재' : '❌ 없음');
      
      if (!stageData) {
        logger.error(`❌ Level 1 Stage ${stage} not found. Available stages:`, Object.keys(l1Data));
        return res.status(404).json({ 
          success: false, 
          error: `Level 1 Stage ${stage} not found. Available stages: ${Object.keys(l1Data).join(', ')}`,
          code: 'STAGE_NOT_FOUND'
        });
      }

      logger.info(`📊 Stage ${stage} 카드 개수:`, stageData.cards?.length || 0);

      // Level 1 카드 데이터 변환 (프론트엔드 DrillCard 타입에 맞춤)
      const cards = stageData.cards?.map(card => ({
        id: card.id,
        level: parseInt(level),
        stage: parseInt(stage),
        front_ko: card.front_ko,
        target_en: card.target_en,
        difficulty: 1,
        pattern_tags: [card.pattern],
        form: 'aff',
        grammar_tags: [card.pattern]
      })) || [];

      const response = {
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
        },
        meta: {
          level: parseInt(level),
          stage: parseInt(stage),
          timestamp: Date.now(),
          cached: false,
          responseTime: Date.now() - startTime
        }
      };

      // Cache for 30 minutes
      await hybridCache.set(cacheKey, response, 1800);

      logger.info(`✅ Level 1 Stage ${stage} 카드 ${cards.length}개 반환`);
      res.json({ success: true, ...response });
      return;
    }

    // Level 2-6 기존 Firestore 처리
    const stageId = `Lv${level}-P${Math.ceil(stage/6)}-S${stage.toString().padStart(2, '0')}`;
    
    logger.info(`🔍 Firestore 조회 경로: curricula/${level}/versions/revised/stages/${stageId}`);
    
    const docRef = db.collection('curricula').doc(level.toString())
                     .collection('versions').doc('revised')
                     .collection('stages').doc(stageId);
    
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      // 실제 존재하는 스테이지들을 확인
      const stagesRef = db.collection('curricula').doc(level.toString())
                          .collection('versions').doc('revised')
                          .collection('stages');
      const allStages = await stagesRef.limit(5).get();
      logger.warn(`📋 Level ${level}에서 찾은 스테이지들:`, allStages.docs.map(d => d.id));
    }
    
    if (!snapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: `Cards not found: Level ${level}, Stage ${stage}`,
        code: 'CARDS_NOT_FOUND'
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
      difficulty: Math.min(parseInt(level), 5),
      pattern_tags: sentence.grammar_tags || [],
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

    const response = {
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
      },
      meta: {
        level: parseInt(level),
        stage: parseInt(stage),
        timestamp: Date.now(),
        cached: false,
        responseTime: Date.now() - startTime
      }
    };

    // Cache for 30 minutes
    await hybridCache.set(cacheKey, response, 1800);

    res.json({ success: true, ...response });

    logger.info('Cards data served successfully', {
      level,
      stage,
      cardsCount: cards.length,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('카드 조회 실패:', {
      error: error.message,
      stack: error.stack,
      level: req.query.level,
      stage: req.query.stage
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/cards/all
 * ALL 모드 전용 API 엔드포인트
 * Cache TTL: 30 minutes for ALL mode data
 */
router.get('/all', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({ 
        success: false, 
        error: 'level parameter is required',
        code: 'MISSING_LEVEL'
      });
    }

    logger.info(`🔄 ALL 모드 전용 API: Level ${level}`, {
      level,
      ip: req.ip
    });

    // Try cache first (30 min TTL)
    const cacheKey = `cards:all:${level}`;
    const cachedData = await hybridCache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Cache hit for ALL mode cards', { cacheKey });
      return res.json({
        success: true,
        ...cachedData,
        meta: {
          ...cachedData.meta,
          cached: true,
          responseTime: Date.now() - startTime
        }
      });
    }
    
    const allCards = await getAllLevelCards(parseInt(level));
    
    const response = {
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
      },
      meta: {
        level: parseInt(level),
        timestamp: Date.now(),
        cached: false,
        responseTime: Date.now() - startTime
      }
    };

    // Cache for 30 minutes
    await hybridCache.set(cacheKey, response, 1800);

    res.json({ success: true, ...response });

    logger.info('ALL mode cards served successfully', {
      level,
      cardsCount: allCards.length,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('ALL 모드 전용 API 실패:', {
      error: error.message,
      stack: error.stack,
      level: req.query.level
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load ALL mode cards',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/cards/feedback
 * 피드백 API 엔드포인트 with similarity calculation
 */
router.post('/feedback', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { front_ko, sttText, target_en } = req.body;
    
    if (!front_ko || !sttText || !target_en) {
      return res.status(400).json({ 
        success: false, 
        error: 'front_ko, sttText, and target_en are required',
        code: 'MISSING_FIELDS'
      });
    }

    logger.info(`🎤 피드백 요청: "${sttText}" vs "${target_en}"`, {
      front_ko,
      sttText,
      target_en,
      ip: req.ip
    });

    // 기본 유사도 계산
    const userAnswer = sttText.toLowerCase().trim();
    const targetAnswer = target_en.toLowerCase().trim();
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
      },
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });

    logger.info('Feedback generated successfully', {
      isCorrect,
      score,
      similarity,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('피드백 생성 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/cards/feedback/custom
 * 맞춤형 피드백 API 엔드포인트 (AI 확장 대비)
 */
router.post('/feedback/custom', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, interests, difficultyLevel = 'intermediate', patternId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      });
    }

    logger.info(`🎯 맞춤 피드백 요청: userId=${userId}, interests=${interests?.join(',')}`, {
      userId,
      interests,
      difficultyLevel,
      patternId,
      ip: req.ip
    });

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
      .slice(0, 6)
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
        source: 'manual',
        language: 'ko'
      }
    };

    res.json({
      success: true,
      data: {
        examples: adjustedExamples.map(ex => ex.sentence),
        customExamples: adjustedExamples,
        feedbackStructure: feedbackData,
        aiReady: false,
        message: `Generated ${adjustedExamples.length} examples based on interests: ${interests?.join(', ') || 'general'}`
      },
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });

    logger.info('Custom feedback generated successfully', {
      userId,
      examplesCount: adjustedExamples.length,
      interests,
      difficultyLevel,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('맞춤 피드백 생성 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/cards/feedback/save
 * 피드백 저장 API (Firestore 연동 대비)
 */
router.post('/feedback/save', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const feedbackData = req.body;
    
    // 기본 검증
    if (!feedbackData.feedbackInfo?.userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'feedbackInfo.userId is required',
        code: 'MISSING_USER_ID'
      });
    }

    logger.info(`💾 피드백 저장 요청: ${feedbackData.feedbackInfo.feedbackId}`, {
      feedbackId: feedbackData.feedbackInfo.feedbackId,
      userId: feedbackData.feedbackInfo.userId,
      ip: req.ip
    });

    // TODO: Firestore 저장 로직 (현재는 로그만)
    // await db.collection('feedback').doc(feedbackData.feedbackInfo.feedbackId).set(feedbackData);
    
    res.json({
      success: true,
      data: {
        feedbackId: feedbackData.feedbackInfo.feedbackId,
        saved: false,
        message: 'Feedback structure validated, ready for Firestore integration'
      },
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });

    logger.info('Feedback save request processed', {
      feedbackId: feedbackData.feedbackInfo.feedbackId,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    logger.error('피드백 저장 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;