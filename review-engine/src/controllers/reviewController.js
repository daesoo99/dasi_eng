/**
 * Review Controller - Handles review scheduling and analytics
 */

const ForgettingCurveService = require('../services/ForgettingCurveService');
const ReviewCard = require('../models/ReviewCard');

class ReviewController {
  constructor() {
    this.forgettingCurveService = new ForgettingCurveService();
  }

  /**
   * Schedule next review for a card
   */
  async scheduleReview(req, res) {
    try {
      const { userId, itemId, quality, responseTime, cardData } = req.body;
      
      // Validate input
      if (!userId || !itemId || quality === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: userId, itemId, quality'
        });
      }
      
      if (quality < 0 || quality > 5) {
        return res.status(400).json({
          error: 'Quality must be between 0 and 5'
        });
      }
      
      // Create or load card
      const card = cardData ? ReviewCard.fromJSON(cardData) : new ReviewCard({
        userId,
        itemId,
        itemType: req.body.itemType || 'sentence'
      });
      
      // Calculate next interval
      const result = this.forgettingCurveService.calculateNextInterval(card, quality, responseTime);
      
      // Update card
      this._updateCard(card, result);
      card.updateAfterReview(quality, responseTime);
      
      req.log.info({
        userId,
        itemId,
        quality,
        interval: result.interval,
        nextReview: result.nextReview,
        learningState: result.learningState
      }, 'Review scheduled');
      
      res.json({
        userId,
        itemId,
        nextReview: result.nextReview.getTime(),
        interval: result.interval,
        intervalDays: Math.round(result.interval),
        easeFactor: result.easeFactor,
        memoryStrength: result.memoryStrength,
        learningState: result.learningState,
        card: card.toJSON()
      });
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Schedule calculation failed');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get due cards for a user
   */
  async getDueCards(req, res) {
    try {
      const { userId } = req.params;
      const { 
        limit = 20, 
        includeNew = true, 
        sortBy = 'priority' 
      } = req.query;
      
      const currentTime = new Date();
      
      // In production, this would query the database
      // For now, return the expected structure
      const dueCards = this._mockGetDueCards(userId, {
        limit: parseInt(limit),
        includeNew: includeNew === 'true',
        sortBy,
        currentTime
      });
      
      res.json({
        userId,
        dueCards,
        currentTime: currentTime.getTime(),
        totalDue: dueCards.length,
        newCards: includeNew === 'true' ? dueCards.filter(c => c.learningState === 'NEW').length : undefined
      });
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Failed to get due cards');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Calculate retention probability
   */
  async getRetentionProbability(req, res) {
    try {
      const { cardData, targetDate } = req.body;
      
      if (!cardData) {
        return res.status(400).json({
          error: 'Missing required field: cardData'
        });
      }
      
      const card = ReviewCard.fromJSON(cardData);
      const target = targetDate ? new Date(targetDate) : new Date();
      
      const retention = this.forgettingCurveService.calculateRetentionProbability(card, target);
      const currentStrength = card.calculateCurrentMemoryStrength(target);
      
      res.json({
        retentionProbability: retention,
        currentMemoryStrength: currentStrength,
        daysSinceLastReview: card.daysSinceLastReview(target),
        priorityScore: card.getPriorityScore(target),
        isOverdue: card.isOverdue(target),
        daysUntilNextReview: card.daysUntilNextReview(target)
      });
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Retention calculation failed');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get optimal review time
   */
  async getOptimalReviewTime(req, res) {
    try {
      const { cardData, userPreferences } = req.body;
      
      if (!cardData) {
        return res.status(400).json({
          error: 'Missing required field: cardData'
        });
      }
      
      const card = ReviewCard.fromJSON(cardData);
      const optimalTime = this.forgettingCurveService.getOptimalReviewTime(card, userPreferences);
      
      res.json({
        scheduledReview: card.nextReview.getTime(),
        optimalReview: optimalTime.getTime(),
        adjustment: optimalTime.getTime() - card.nextReview.getTime(),
        adjustmentHours: Math.round((optimalTime.getTime() - card.nextReview.getTime()) / (1000 * 60 * 60))
      });
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Optimal time calculation failed');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Process batch reviews
   */
  async processBatch(req, res) {
    try {
      const { reviews } = req.body;
      
      if (!Array.isArray(reviews)) {
        return res.status(400).json({
          error: 'Reviews must be an array'
        });
      }
      
      const results = [];
      
      for (const review of reviews) {
        try {
          const result = await this._processSingleReview(review);
          results.push({
            ...result,
            success: true
          });
        } catch (reviewError) {
          results.push({
            userId: review.userId,
            itemId: review.itemId,
            success: false,
            error: reviewError.message
          });
        }
      }
      
      req.log.info({ 
        total: reviews.length, 
        successful: results.filter(r => r.success).length 
      }, 'Batch processing completed');
      
      res.json({
        results,
        summary: {
          total: reviews.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Batch processing failed');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get user performance analytics
   */
  async getUserAnalytics(req, res) {
    try {
      const { userId } = req.params;
      const { 
        days = 30,
        includeProjections = true 
      } = req.query;
      
      // Mock analytics data - in production would query database
      const analytics = this._mockGetUserAnalytics(userId, {
        days: parseInt(days),
        includeProjections: includeProjections === 'true'
      });
      
      res.json(analytics);
      
    } catch (error) {
      req.log.error({ error: error.message }, 'Analytics calculation failed');
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update card properties
   */
  _updateCard(card, result) {
    card.easeFactor = result.easeFactor;
    card.interval = result.interval;
    card.repetition = result.repetition;
    card.memoryStrength = result.memoryStrength;
    card.stabilityFactor = result.stabilityFactor;
    card.difficultyFactor = result.difficultyFactor;
    card.nextReview = result.nextReview;
    card.learningState = result.learningState;
  }

  /**
   * Process a single review
   */
  async _processSingleReview(review) {
    const { userId, itemId, quality, responseTime, cardData } = review;
    
    const card = cardData ? ReviewCard.fromJSON(cardData) : new ReviewCard({
      userId,
      itemId
    });
    
    const result = this.forgettingCurveService.calculateNextInterval(card, quality, responseTime);
    this._updateCard(card, result);
    card.updateAfterReview(quality, responseTime);
    
    return {
      userId,
      itemId,
      nextReview: result.nextReview.getTime(),
      interval: result.interval,
      card: card.toJSON()
    };
  }

  /**
   * Mock function to get due cards (replace with database query)
   */
  _mockGetDueCards(userId, options) {
    // In production, this would query the database for due cards
    // sorted by priority, filtered by user preferences, etc.
    return [];
  }

  /**
   * Mock function to get user analytics (replace with database aggregation)
   */
  _mockGetUserAnalytics(userId, options) {
    const now = new Date();
    return {
      userId,
      period: {
        days: options.days,
        start: new Date(now.getTime() - options.days * 24 * 60 * 60 * 1000).getTime(),
        end: now.getTime()
      },
      stats: {
        totalReviews: 0,
        correctAnswers: 0,
        averageQuality: 0,
        streakDays: 0,
        totalCards: 0,
        masteredCards: 0,
        learningCards: 0,
        newCards: 0
      },
      performance: {
        dailyReviews: [],
        qualityTrend: [],
        memoryStrengthDistribution: {}
      },
      projections: options.includeProjections ? {
        expectedReviews7Days: 0,
        expectedReviews30Days: 0,
        retentionForecast: {}
      } : undefined
    };
  }
}

module.exports = ReviewController;