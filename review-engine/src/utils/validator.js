/**
 * Input validation utilities for review engine
 */

const Joi = require('joi');

// Card data schema
const cardDataSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  userId: Joi.string().required(),
  itemId: Joi.string().required(),
  itemType: Joi.string().valid('sentence', 'pattern', 'vocabulary').default('sentence'),
  easeFactor: Joi.number().min(1.3).max(3.5).default(2.5),
  interval: Joi.number().min(0).default(1),
  repetition: Joi.number().min(0).default(0),
  quality: Joi.number().min(0).max(5).default(0),
  memoryStrength: Joi.number().min(0).max(1).default(0.5),
  stabilityFactor: Joi.number().min(0.1).max(5).default(1.0),
  difficultyFactor: Joi.number().min(0.1).max(5).default(1.0),
  lastReviewed: Joi.date().allow(null).optional(),
  nextReview: Joi.date().default(() => new Date()),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date()),
  totalReviews: Joi.number().min(0).default(0),
  correctStreak: Joi.number().min(0).default(0),
  lapses: Joi.number().min(0).default(0),
  averageResponseTime: Joi.number().min(0).default(0),
  learningState: Joi.string().valid('NEW', 'LEARNING', 'REVIEW', 'RELEARNING').default('NEW'),
  graduated: Joi.boolean().default(false),
  suspended: Joi.boolean().default(false)
});

// Review request schema
const reviewRequestSchema = Joi.object({
  userId: Joi.string().required(),
  itemId: Joi.string().required(),
  quality: Joi.number().min(0).max(5).required(),
  responseTime: Joi.number().min(0).optional(),
  itemType: Joi.string().valid('sentence', 'pattern', 'vocabulary').optional(),
  cardData: cardDataSchema.optional()
});

// Batch review schema
const batchReviewSchema = Joi.object({
  reviews: Joi.array().items(reviewRequestSchema).min(1).max(100).required()
});

// Retention calculation schema
const retentionRequestSchema = Joi.object({
  cardData: cardDataSchema.required(),
  targetDate: Joi.date().optional()
});

// Optimal time request schema
const optimalTimeRequestSchema = Joi.object({
  cardData: cardDataSchema.required(),
  userPreferences: Joi.object({
    optimalHours: Joi.array().items(Joi.number().min(0).max(23)).optional(),
    timezone: Joi.string().optional()
  }).optional()
});

// Due cards query schema
const dueCardsQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(100).default(20),
  includeNew: Joi.boolean().default(true),
  sortBy: Joi.string().valid('priority', 'due_date', 'difficulty').default('priority')
});

// User analytics query schema
const analyticsQuerySchema = Joi.object({
  days: Joi.number().min(1).max(365).default(30),
  includeProjections: Joi.boolean().default(true)
});

// Configuration update schema
const configUpdateSchema = Joi.object({
  SM2_MIN_EASE_FACTOR: Joi.number().min(1.0).max(2.0).optional(),
  SM2_MAX_EASE_FACTOR: Joi.number().min(2.5).max(5.0).optional(),
  SM2_INITIAL_EASE: Joi.number().min(1.5).max(3.0).optional(),
  SM2_EASE_BONUS: Joi.number().min(0.0).max(0.5).optional(),
  SM2_EASE_PENALTY: Joi.number().min(0.0).max(0.5).optional(),
  LEARNING_STEPS: Joi.array().items(Joi.number().min(1).max(1440)).optional(),
  GRADUATING_INTERVAL: Joi.number().min(1).max(10).optional(),
  EASY_INTERVAL: Joi.number().min(2).max(14).optional(),
  MAX_INTERVAL: Joi.number().min(100).max(36500).optional(),
  MIN_INTERVAL: Joi.number().min(1).max(7).optional(),
  INTERVAL_MODIFIER: Joi.number().min(0.5).max(2.0).optional(),
  INITIAL_STABILITY: Joi.number().min(0.5).max(5.0).optional(),
  DIFFICULTY_WEIGHT: Joi.number().min(0.0).max(1.0).optional(),
  STABILITY_GAIN: Joi.number().min(1.0).max(3.0).optional(),
  PASSING_GRADE: Joi.number().min(2).max(4).optional(),
  EASY_GRADE: Joi.number().min(3).max(5).optional()
});

class Validator {
  /**
   * Validate review request
   */
  static validateReviewRequest(data) {
    const { error, value } = reviewRequestSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate batch review request
   */
  static validateBatchReview(data) {
    const { error, value } = batchReviewSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate retention calculation request
   */
  static validateRetentionRequest(data) {
    const { error, value } = retentionRequestSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate optimal time request
   */
  static validateOptimalTimeRequest(data) {
    const { error, value } = optimalTimeRequestSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate due cards query parameters
   */
  static validateDueCardsQuery(data) {
    const { error, value } = dueCardsQuerySchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate analytics query parameters
   */
  static validateAnalyticsQuery(data) {
    const { error, value } = analyticsQuerySchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate configuration update
   */
  static validateConfigUpdate(data) {
    const { error, value } = configUpdateSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate card data
   */
  static validateCardData(data) {
    const { error, value } = cardDataSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate user ID
   */
  static validateUserId(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Valid user ID is required');
    }
    return userId.trim();
  }

  /**
   * Validate item ID
   */
  static validateItemId(itemId) {
    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      throw new Error('Valid item ID is required');
    }
    return itemId.trim();
  }

  /**
   * Validate quality score
   */
  static validateQuality(quality) {
    if (quality === undefined || quality === null) {
      throw new Error('Quality score is required');
    }
    
    const numQuality = Number(quality);
    if (isNaN(numQuality) || numQuality < 0 || numQuality > 5) {
      throw new Error('Quality must be a number between 0 and 5');
    }
    
    return numQuality;
  }

  /**
   * Validate response time
   */
  static validateResponseTime(responseTime) {
    if (responseTime === undefined || responseTime === null) {
      return 0;
    }
    
    const numResponseTime = Number(responseTime);
    if (isNaN(numResponseTime) || numResponseTime < 0) {
      throw new Error('Response time must be a non-negative number');
    }
    
    return numResponseTime;
  }

  /**
   * Sanitize and validate pagination parameters
   */
  static validatePagination(limit, offset) {
    const validatedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const validatedOffset = Math.max(0, parseInt(offset) || 0);
    
    return {
      limit: validatedLimit,
      offset: validatedOffset
    };
  }
}

module.exports = {
  Validator,
  schemas: {
    cardDataSchema,
    reviewRequestSchema,
    batchReviewSchema,
    retentionRequestSchema,
    optimalTimeRequestSchema,
    dueCardsQuerySchema,
    analyticsQuerySchema,
    configUpdateSchema
  }
};