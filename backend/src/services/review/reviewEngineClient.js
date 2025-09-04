/**
 * Review Engine Client - HTTP client for review-engine microservice
 */

const axios = require('axios');
const logger = require('../../monitoring/logger');

class ReviewEngineClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || process.env.REVIEW_ENGINE_URL || 'http://localhost:8080';
    this.timeout = options.timeout || 5000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DaSi-Backend/1.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.reviewEngine.debug({
          method: config.method,
          url: config.url,
          data: config.data
        }, 'Review engine request');
        return config;
      },
      (error) => {
        logger.reviewEngine.error({ error: error.message }, 'Review engine request error');
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.reviewEngine.debug({
          status: response.status,
          url: response.config.url,
          duration: response.config.metadata?.duration
        }, 'Review engine response');
        return response;
      },
      (error) => {
        logger.reviewEngine.error({
          error: error.message,
          status: error.response?.status,
          url: error.config?.url
        }, 'Review engine response error');
        return Promise.reject(error);
      }
    );
  }

  /**
   * Schedule next review for a card
   */
  async scheduleReview(userId, itemId, quality, options = {}) {
    try {
      const requestData = {
        userId,
        itemId,
        quality,
        responseTime: options.responseTime || 0,
        itemType: options.itemType || 'sentence',
        cardData: options.cardData || null
      };

      const response = await this._withRetry(() => 
        this.client.post('/schedule', requestData)
      );

      logger.reviewEngine.info({
        userId,
        itemId,
        quality,
        nextReview: response.data.nextReview,
        interval: response.data.interval
      }, 'Review scheduled successfully');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        userId,
        itemId,
        quality,
        error: error.message
      }, 'Failed to schedule review');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get due cards for a user
   */
  async getDueCards(userId, options = {}) {
    try {
      const params = {
        limit: options.limit || 20,
        includeNew: options.includeNew !== false,
        sortBy: options.sortBy || 'priority'
      };

      const response = await this._withRetry(() => 
        this.client.get(`/due/${userId}`, { params })
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        userId,
        error: error.message
      }, 'Failed to get due cards');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Calculate retention probability for a card
   */
  async getRetentionProbability(cardData, targetDate = null) {
    try {
      const requestData = {
        cardData,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null
      };

      const response = await this._withRetry(() => 
        this.client.post('/retention', requestData)
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        error: error.message
      }, 'Failed to calculate retention probability');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get optimal review time for a card
   */
  async getOptimalReviewTime(cardData, userPreferences = {}) {
    try {
      const requestData = {
        cardData,
        userPreferences
      };

      const response = await this._withRetry(() => 
        this.client.post('/optimal-time', requestData)
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        error: error.message
      }, 'Failed to get optimal review time');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Process batch reviews
   */
  async processBatchReviews(reviews) {
    try {
      const requestData = { reviews };

      const response = await this._withRetry(() => 
        this.client.post('/batch-schedule', requestData)
      );

      logger.reviewEngine.info({
        total: reviews.length,
        successful: response.data.summary.successful,
        failed: response.data.summary.failed
      }, 'Batch reviews processed');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        batchSize: reviews.length,
        error: error.message
      }, 'Failed to process batch reviews');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get review engine configuration
   */
  async getConfig() {
    try {
      const response = await this._withRetry(() => 
        this.client.get('/config')
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        error: error.message
      }, 'Failed to get configuration');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update review engine configuration
   */
  async updateConfig(config) {
    try {
      const response = await this._withRetry(() => 
        this.client.post('/config', config)
      );

      logger.reviewEngine.info({ config }, 'Configuration updated');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.error({
        config,
        error: error.message
      }, 'Failed to update configuration');

      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Check review engine health
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 2000 });
      
      return {
        success: true,
        healthy: response.status === 200,
        data: response.data
      };

    } catch (error) {
      logger.reviewEngine.warn({
        error: error.message
      }, 'Review engine health check failed');

      return {
        success: false,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Batch API call with automatic retry logic
   */
  async _withRetry(apiCall) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const response = await apiCall();
        
        // Add duration metadata
        if (response.config) {
          response.config.metadata = {
            duration: Date.now() - startTime,
            attempt
          };
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 408, 429
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (error.response.status !== 408 && error.response.status !== 429) {
            throw error;
          }
        }
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.reviewEngine.warn({
            attempt,
            delay,
            error: error.message
          }, 'Retrying review engine request');
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create a card data object from practice session results
   */
  static createCardData(userId, itemId, sessionHistory = []) {
    const baseCard = {
      userId,
      itemId,
      itemType: 'sentence',
      easeFactor: 2.5,
      interval: 1,
      repetition: 0,
      quality: 0,
      memoryStrength: 0.5,
      stabilityFactor: 1.0,
      difficultyFactor: 1.0,
      lastReviewed: null,
      nextReview: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      totalReviews: 0,
      correctStreak: 0,
      lapses: 0,
      averageResponseTime: 0,
      learningState: 'NEW',
      graduated: false,
      suspended: false
    };

    // If session history is provided, calculate some initial values
    if (sessionHistory.length > 0) {
      const totalQuality = sessionHistory.reduce((sum, s) => sum + (s.quality || 0), 0);
      const avgQuality = totalQuality / sessionHistory.length;
      const avgResponseTime = sessionHistory.reduce((sum, s) => sum + (s.responseTime || 0), 0) / sessionHistory.length;
      
      baseCard.quality = Math.round(avgQuality);
      baseCard.averageResponseTime = avgResponseTime;
      baseCard.totalReviews = sessionHistory.length;
      baseCard.memoryStrength = Math.min(0.9, 0.3 + (avgQuality / 5) * 0.4);
      
      // Set learning state based on performance
      if (avgQuality >= 3.5 && sessionHistory.length >= 3) {
        baseCard.learningState = 'LEARNING';
      }
    }

    return baseCard;
  }
}

module.exports = ReviewEngineClient;