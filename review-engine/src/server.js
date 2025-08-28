/**
 * Review Engine Microservice Server
 * Advanced Spaced Repetition System with Forgetting Curve Algorithm
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');
const ForgettingCurveService = require('./services/ForgettingCurveService');
const ReviewCard = require('./models/ReviewCard');

const app = express();
const PORT = process.env.PORT || 8081;

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Services
const forgettingCurveService = new ForgettingCurveService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'review-engine',
    timestamp: new Date().toISOString() 
  });
});

/**
 * Calculate next review interval for a card
 */
app.post('/schedule', async (req, res) => {
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
    
    // Calculate next interval using forgetting curve algorithm
    const result = forgettingCurveService.calculateNextInterval(card, quality, responseTime);
    
    // Update card with results
    card.easeFactor = result.easeFactor;
    card.interval = result.interval;
    card.repetition = result.repetition;
    card.memoryStrength = result.memoryStrength;
    card.stabilityFactor = result.stabilityFactor;
    card.difficultyFactor = result.difficultyFactor;
    card.nextReview = result.nextReview;
    card.learningState = result.learningState;
    
    // Update card after review
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
});

/**
 * Get due cards for review
 */
app.get('/due/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, includeNew = true } = req.query;
    const currentTime = new Date();
    
    // In a real implementation, this would fetch from database
    // For now, return structure for due cards
    const response = {
      userId,
      dueCards: [],
      currentTime: currentTime.getTime(),
      totalDue: 0
    };
    
    if (includeNew === 'true') {
      response.newCards = 0;
    }
    
    res.json(response);
    
  } catch (error) {
    req.log.error({ error: error.message }, 'Failed to get due cards');
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Calculate retention probability for a card
 */
app.post('/retention', async (req, res) => {
  try {
    const { cardData, targetDate } = req.body;
    
    if (!cardData) {
      return res.status(400).json({
        error: 'Missing required field: cardData'
      });
    }
    
    const card = ReviewCard.fromJSON(cardData);
    const target = targetDate ? new Date(targetDate) : new Date();
    
    const retention = forgettingCurveService.calculateRetentionProbability(card, target);
    const currentStrength = card.calculateCurrentMemoryStrength(target);
    
    res.json({
      retentionProbability: retention,
      currentMemoryStrength: currentStrength,
      daysSinceLastReview: card.daysSinceLastReview(target),
      priorityScore: card.getPriorityScore(target)
    });
    
  } catch (error) {
    req.log.error({ error: error.message }, 'Retention calculation failed');
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get optimal review time based on circadian rhythms
 */
app.post('/optimal-time', async (req, res) => {
  try {
    const { cardData, userPreferences } = req.body;
    
    if (!cardData) {
      return res.status(400).json({
        error: 'Missing required field: cardData'
      });
    }
    
    const card = ReviewCard.fromJSON(cardData);
    const optimalTime = forgettingCurveService.getOptimalReviewTime(card, userPreferences);
    
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
});

/**
 * Get and update algorithm configuration
 */
app.get('/config', (req, res) => {
  res.json(forgettingCurveService.getConfig());
});

app.post('/config', (req, res) => {
  try {
    const newConfig = req.body;
    forgettingCurveService.updateConfig(newConfig);
    
    req.log.info({ config: newConfig }, 'Configuration updated');
    
    res.json({
      message: 'Configuration updated successfully',
      config: forgettingCurveService.getConfig()
    });
    
  } catch (error) {
    req.log.error({ error: error.message }, 'Configuration update failed');
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Batch process multiple cards
 */
app.post('/batch-schedule', async (req, res) => {
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
        const { userId, itemId, quality, responseTime, cardData } = review;
        
        const card = cardData ? ReviewCard.fromJSON(cardData) : new ReviewCard({
          userId,
          itemId
        });
        
        const result = forgettingCurveService.calculateNextInterval(card, quality, responseTime);
        card.updateAfterReview(quality, responseTime);
        
        results.push({
          userId,
          itemId,
          success: true,
          nextReview: result.nextReview.getTime(),
          interval: result.interval,
          card: card.toJSON()
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
});

// Error handling middleware
app.use((err, req, res, next) => {
  req.log.error({ error: err.message }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Review Engine server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;