const express = require('express');
const router = express.Router();
const hybridCache = require('../utils/redisCache');
const logger = require('../monitoring/logger');

/**
 * POST /api/feedback
 * High-performance feedback generation with caching
 * Cache TTL: 10 minutes for feedback results
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { front_ko, sttText, target_en } = req.body;
    
    if (!front_ko || !sttText || !target_en) {
      return res.status(400).json({ 
        success: false, 
        error: 'front_ko, sttText, and target_en are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // Cache key based on user input and target
    const cacheKey = `feedback:${Buffer.from(sttText + target_en).toString('base64')}`;
    
    // Try cache first
    const cachedFeedback = await hybridCache.get(cacheKey);
    if (cachedFeedback) {
      logger.info('Cache hit for feedback', { cacheKey });
      return res.json({
        success: true,
        data: {
          ...cachedFeedback,
          cached: true
        },
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          cached: true
        }
      });
    }

    logger.info(`🎤 피드백 요청: "${sttText}" vs "${target_en}"`);

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

    const feedbackResult = {
      correct: isCorrect,
      score: score,
      feedback: feedback,
      suggestions: suggestions,
      userAnswer: sttText,
      targetAnswer: target_en,
      similarity: similarity
    };

    // Cache the result (10 min TTL)
    await hybridCache.set(cacheKey, feedbackResult, 600);

    res.json({ 
      success: true, 
      data: feedbackResult,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    });

    logger.performance('Feedback generation completed', {
      similarity,
      score,
      isCorrect,
      duration: Date.now() - startTime
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
      code: 'FEEDBACK_GENERATION_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });
  }
});

/**
 * POST /api/feedback/custom
 * Custom feedback with enhanced caching
 */
router.post('/custom', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userInput, targetSentence, customPrompt, options = {} } = req.body;
    const userUid = req.user?.uid || 'anonymous';

    if (!userInput || !targetSentence) {
      return res.status(400).json({
        success: false,
        error: 'userInput and targetSentence are required',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // Cache key with custom prompt hash
    const cacheKey = `custom_feedback:${Buffer.from(userInput + targetSentence + (customPrompt || '')).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await hybridCache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: {
          ...cachedResult,
          cached: true
        },
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          cached: true
        }
      });
    }

    logger.info(`🔧 Custom 피드백 요청`, {
      userUid,
      userInput,
      targetSentence,
      hasCustomPrompt: !!customPrompt
    });

    // Enhanced feedback logic
    const analysis = analyzeUserInput(userInput, targetSentence, options);
    
    const result = {
      accuracy: analysis.accuracy,
      detailedFeedback: analysis.feedback,
      grammarCorrections: analysis.grammar,
      pronunciationTips: analysis.pronunciation,
      vocabularyUsage: analysis.vocabulary,
      overallScore: analysis.score,
      userInput,
      targetSentence,
      analysisTimestamp: new Date().toISOString()
    };

    // Cache result (15 min TTL for custom feedback)
    await hybridCache.set(cacheKey, result, 900);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    });

    logger.performance('Custom feedback completed', {
      accuracy: analysis.accuracy,
      score: analysis.score,
      duration: Date.now() - startTime
    });

  } catch (error) {
    logger.error('Custom 피드백 생성 실패:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'CUSTOM_FEEDBACK_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      }
    });
  }
});

// Utility functions
function calculateSimilarity(userAnswer, targetAnswer) {
  const words1 = userAnswer.toLowerCase().split(' ');
  const words2 = targetAnswer.toLowerCase().split(' ');
  
  let matches = 0;
  const maxLength = Math.max(words1.length, words2.length);
  
  words1.forEach(word => {
    if (words2.includes(word)) matches++;
  });
  
  return maxLength > 0 ? matches / maxLength : 0;
}

function analyzeUserInput(userInput, targetSentence, options) {
  const similarity = calculateSimilarity(userInput, targetSentence);
  const score = Math.round(similarity * 100);
  
  return {
    accuracy: similarity,
    score,
    feedback: generateDetailedFeedback(userInput, targetSentence, similarity),
    grammar: analyzeGrammar(userInput, targetSentence),
    pronunciation: generatePronunciationTips(userInput, targetSentence),
    vocabulary: analyzeVocabulary(userInput, targetSentence)
  };
}

function generateDetailedFeedback(userInput, targetSentence, similarity) {
  if (similarity > 0.9) {
    return 'Excellent! Your answer is very accurate.';
  } else if (similarity > 0.7) {
    return 'Good job! Minor adjustments needed.';
  } else if (similarity > 0.5) {
    return 'Getting there! Check grammar and vocabulary.';
  } else {
    return 'Keep practicing! Focus on sentence structure.';
  }
}

function analyzeGrammar(userInput, targetSentence) {
  // Simple grammar analysis - can be enhanced with NLP
  return {
    errors: [],
    suggestions: ['Practice sentence structure', 'Check verb tenses']
  };
}

function generatePronunciationTips(userInput, targetSentence) {
  return {
    tips: ['Focus on clear articulation', 'Practice difficult sounds'],
    phonetics: []
  };
}

function analyzeVocabulary(userInput, targetSentence) {
  return {
    correctWords: [],
    suggestedWords: [],
    difficulty: 'intermediate'
  };
}

module.exports = router;