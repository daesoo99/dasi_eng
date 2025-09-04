/**
 * Feedback Routes - 피드백 생성 및 분석 API
 * TypeScript 변환: Express + 캐싱 + 상세 분석
 */

import express from 'express';
import logger from '../monitoring/logger';

const router = express.Router();

// Types
interface FeedbackRequest {
  front_ko: string;
  sttText: string;
  target_en: string;
}

interface CustomFeedbackRequest {
  userInput: string;
  targetSentence: string;
  customPrompt?: string;
  options?: FeedbackOptions;
}

interface FeedbackOptions {
  includeGrammar?: boolean;
  includePronunciation?: boolean;
  detailedAnalysis?: boolean;
}

interface FeedbackResult {
  correct: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
  userAnswer: string;
  targetAnswer: string;
  similarity: number;
}

interface CustomFeedbackResult {
  accuracy: number;
  detailedFeedback: string;
  grammarCorrections: GrammarAnalysis;
  pronunciationTips: PronunciationAnalysis;
  vocabularyUsage: VocabularyAnalysis;
  overallScore: number;
  userInput: string;
  targetSentence: string;
  analysisTimestamp: string;
}

interface GrammarAnalysis {
  errors: string[];
  suggestions: string[];
}

interface PronunciationAnalysis {
  tips: string[];
  phonetics: string[];
}

interface VocabularyAnalysis {
  correctWords: string[];
  suggestedWords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta: {
    timestamp: number;
    responseTime: number;
    cached: boolean;
  };
}

// Hybrid cache 타입 정의 및 fallback
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
      if (memoryCache.size > 500) {
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
 * POST /api/feedback
 * High-performance feedback generation with caching
 * Cache TTL: 10 minutes for feedback results
 */
router.post('/', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { front_ko, sttText, target_en }: FeedbackRequest = req.body;
    
    if (!front_ko || !sttText || !target_en) {
      const response: APIResponse<never> = {
        success: false,
        error: 'front_ko, sttText, and target_en are required',
        code: 'MISSING_REQUIRED_PARAMS',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          cached: false
        }
      };
      return res.status(400).json(response);
    }

    // Cache key based on user input and target
    const cacheKey = `feedback:${Buffer.from(sttText + target_en).toString('base64')}`;
    
    // Try cache first
    const cachedFeedback = await hybridCache.get(cacheKey);
    if (cachedFeedback) {
      logger.info({ cacheKey }, 'Cache hit for feedback');
      const response: APIResponse<FeedbackResult> = {
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
      };
      return res.json(response);
    }

    logger.info(`🎤 피드백 요청: "${sttText}" vs "${target_en}"`);

    // 간단한 규칙 기반 피드백
    const userAnswer = sttText.toLowerCase().trim();
    const targetAnswer = target_en.toLowerCase().trim();
    
    // 기본 유사도 계산
    const similarity = calculateSimilarity(userAnswer, targetAnswer);
    const isCorrect = similarity > 0.8;
    const score = Math.round(similarity * 100);

    // 피드백 생성
    let feedback = '';
    const suggestions: string[] = [];

    if (isCorrect) {
      feedback = '훌륭해요! 정확한 발음입니다. 🎉';
    } else {
      feedback = `점수: ${score}점. 계속 연습해보세요! 💪`;
      suggestions.push(`목표 문장: ${target_en}`);
      
      if (similarity > 0.6) {
        suggestions.push('거의 다 왔어요! 조금만 더 정확하게 발음해보세요.');
      } else if (similarity > 0.3) {
        suggestions.push('단어 하나씩 천천히 따라해보세요.');
      } else {
        suggestions.push('처음부터 차근차근 연습해봐요.');
      }
    }

    const feedbackResult: FeedbackResult = {
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

    const response: APIResponse<FeedbackResult> = {
      success: true,
      data: feedbackResult,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    };
    res.json(response);

    logger.performance('Feedback generation completed', {
      similarity,
      score,
      isCorrect,
      duration: Date.now() - startTime
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({
      error: errorMessage,
      stack: errorStack,
      body: req.body
    }, '피드백 생성 실패');
    
    const response: APIResponse<never> = {
      success: false,
      error: 'Internal server error',
      code: 'FEEDBACK_GENERATION_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/feedback/custom
 * Custom feedback with enhanced caching
 */
router.post('/custom', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { userInput, targetSentence, customPrompt, options = {} }: CustomFeedbackRequest = req.body;
    const userUid = (req as any).user?.uid || 'anonymous';

    if (!userInput || !targetSentence) {
      const response: APIResponse<never> = {
        success: false,
        error: 'userInput and targetSentence are required',
        code: 'MISSING_REQUIRED_PARAMS',
        meta: {
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          cached: false
        }
      };
      return res.status(400).json(response);
    }

    // Cache key with custom prompt hash
    const cacheKey = `custom_feedback:${Buffer.from(userInput + targetSentence + (customPrompt || '')).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await hybridCache.get(cacheKey);
    if (cachedResult) {
      const response: APIResponse<CustomFeedbackResult> = {
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
      };
      return res.json(response);
    }

    logger.info({
      userUid,
      userInput,
      targetSentence,
      hasCustomPrompt: !!customPrompt
    }, '🔧 Custom 피드백 요청');

    // Enhanced feedback logic
    const analysis = analyzeUserInput(userInput, targetSentence, options);
    
    const result: CustomFeedbackResult = {
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

    const response: APIResponse<CustomFeedbackResult> = {
      success: true,
      data: result,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    };
    res.json(response);

    logger.performance('Custom feedback completed', {
      accuracy: analysis.accuracy,
      score: analysis.score,
      duration: Date.now() - startTime
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({
      error: errorMessage,
      stack: errorStack,
      body: req.body
    }, 'Custom 피드백 생성 실패');
    
    const response: APIResponse<never> = {
      success: false,
      error: 'Internal server error',
      code: 'CUSTOM_FEEDBACK_ERROR',
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    };
    res.status(500).json(response);
  }
});

// Utility functions
function calculateSimilarity(userAnswer: string, targetAnswer: string): number {
  const words1 = userAnswer.toLowerCase().split(' ').filter(w => w.length > 0);
  const words2 = targetAnswer.toLowerCase().split(' ').filter(w => w.length > 0);
  
  let matches = 0;
  const maxLength = Math.max(words1.length, words2.length);
  
  words1.forEach(word => {
    if (words2.includes(word)) matches++;
  });
  
  return maxLength > 0 ? matches / maxLength : 0;
}

interface AnalysisResult {
  accuracy: number;
  score: number;
  feedback: string;
  grammar: GrammarAnalysis;
  pronunciation: PronunciationAnalysis;
  vocabulary: VocabularyAnalysis;
}

function analyzeUserInput(
  userInput: string, 
  targetSentence: string, 
  options: FeedbackOptions
): AnalysisResult {
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

function generateDetailedFeedback(
  userInput: string, 
  targetSentence: string, 
  similarity: number
): string {
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

function analyzeGrammar(userInput: string, targetSentence: string): GrammarAnalysis {
  // Simple grammar analysis - can be enhanced with NLP
  return {
    errors: [],
    suggestions: ['Practice sentence structure', 'Check verb tenses']
  };
}

function generatePronunciationTips(
  userInput: string, 
  targetSentence: string
): PronunciationAnalysis {
  return {
    tips: ['Focus on clear articulation', 'Practice difficult sounds'],
    phonetics: []
  };
}

function analyzeVocabulary(
  userInput: string, 
  targetSentence: string
): VocabularyAnalysis {
  return {
    correctWords: [],
    suggestedWords: [],
    difficulty: 'intermediate'
  };
}

export default router;