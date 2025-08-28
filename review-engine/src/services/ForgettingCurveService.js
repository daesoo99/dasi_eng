/**
 * Forgetting Curve Service - Advanced Spaced Repetition Algorithms
 * Based on Ebbinghaus Forgetting Curve with modern SRS enhancements
 */

const { evaluate } = require('mathjs');

class ForgettingCurveService {
  constructor() {
    // Algorithm parameters (can be tuned)
    this.config = {
      // SuperMemo SM-2 parameters
      SM2_MIN_EASE_FACTOR: 1.3,
      SM2_MAX_EASE_FACTOR: 3.5,
      SM2_INITIAL_EASE: 2.5,
      SM2_EASE_BONUS: 0.1,
      SM2_EASE_PENALTY: 0.2,
      
      // Learning phases
      LEARNING_STEPS: [1, 10], // minutes for new cards
      GRADUATING_INTERVAL: 1, // days
      EASY_INTERVAL: 4, // days
      
      // Review intervals
      MAX_INTERVAL: 36500, // ~100 years
      MIN_INTERVAL: 1,
      INTERVAL_MODIFIER: 1.0,
      
      // Memory model parameters
      INITIAL_STABILITY: 2.0,
      DIFFICULTY_WEIGHT: 0.3,
      STABILITY_GAIN: 1.5,
      
      // Quality thresholds
      PASSING_GRADE: 3,
      EASY_GRADE: 4,
    };
  }

  /**
   * Calculate next review interval using enhanced SuperMemo SM-2+ algorithm
   */
  calculateNextInterval(card, quality, responseTime = 0) {
    const result = {
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetition: card.repetition,
      memoryStrength: card.memoryStrength,
      stabilityFactor: card.stabilityFactor,
      difficultyFactor: card.difficultyFactor,
      nextReview: new Date(),
      learningState: card.learningState
    };

    // Handle different learning states
    switch (card.learningState) {
      case 'NEW':
        return this._handleNewCard(result, quality);
      case 'LEARNING':
        return this._handleLearningCard(result, quality, card);
      case 'REVIEW':
        return this._handleReviewCard(result, quality, card, responseTime);
      case 'RELEARNING':
        return this._handleRelearningCard(result, quality, card);
      default:
        result.learningState = 'REVIEW'; // Default to REVIEW state
        return this._handleReviewCard(result, quality, card, responseTime);
    }
  }

  /**
   * Handle new cards (first time seeing)
   */
  _handleNewCard(result, quality) {
    result.repetition = 1;
    
    if (quality >= this.config.PASSING_GRADE) {
      // Good response - move to learning phase
      result.interval = this.config.LEARNING_STEPS[0] / (24 * 60); // Convert minutes to days
      result.learningState = 'LEARNING';
      result.memoryStrength = this._calculateInitialMemoryStrength(quality);
    } else {
      // Poor response - stay in new phase
      result.interval = this.config.LEARNING_STEPS[0] / (24 * 60);
      result.learningState = 'NEW';
      result.memoryStrength = 0.1;
    }
    
    result.nextReview = this._addDaysToDate(new Date(), result.interval);
    return result;
  }

  /**
   * Handle learning phase cards
   */
  _handleLearningCard(result, quality, card) {
    if (quality >= this.config.PASSING_GRADE) {
      result.repetition = card.repetition + 1;
      
      if (result.repetition >= this.config.LEARNING_STEPS.length + 1) {
        // Graduate to review phase
        result.interval = this.config.GRADUATING_INTERVAL;
        result.learningState = 'REVIEW';
        result.easeFactor = this.config.SM2_INITIAL_EASE;
        result.memoryStrength = 0.8;
      } else {
        // Continue in learning phase
        const stepIndex = Math.min(result.repetition - 1, this.config.LEARNING_STEPS.length - 1);
        result.interval = this.config.LEARNING_STEPS[stepIndex] / (24 * 60);
        result.learningState = 'LEARNING';
        result.memoryStrength = Math.min(0.9, card.memoryStrength + 0.2);
      }
    } else {
      // Failed - restart learning
      result.repetition = 1;
      result.interval = this.config.LEARNING_STEPS[0] / (24 * 60);
      result.learningState = 'LEARNING';
      result.memoryStrength = Math.max(0.1, card.memoryStrength - 0.3);
    }
    
    result.nextReview = this._addDaysToDate(new Date(), result.interval);
    return result;
  }

  /**
   * Handle review phase cards (graduated)
   */
  _handleReviewCard(result, quality, card, responseTime) {
    result.repetition = card.repetition + 1;
    
    // Update ease factor based on quality (SM-2 algorithm)
    if (quality >= this.config.PASSING_GRADE) {
      result.easeFactor = Math.min(
        this.config.SM2_MAX_EASE_FACTOR,
        card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      result.easeFactor = Math.max(
        this.config.SM2_MIN_EASE_FACTOR,
        card.easeFactor - this.config.SM2_EASE_PENALTY
      );
    }

    // Calculate base interval
    if (quality >= this.config.PASSING_GRADE) {
      if (card.interval < 1) {
        result.interval = 1;
      } else if (card.interval < 6) {
        result.interval = 6;
      } else {
        result.interval = Math.round(card.interval * result.easeFactor * this.config.INTERVAL_MODIFIER);
      }
      
      // Update memory strength (positive reinforcement)
      result.memoryStrength = Math.min(0.95, card.memoryStrength + (quality - 2) * 0.1);
      
      // Update stability factor based on consistent performance
      if (quality >= this.config.EASY_GRADE) {
        result.stabilityFactor = Math.min(2.0, card.stabilityFactor + 0.1);
      }
    } else {
      // Failed review - move to relearning
      result.interval = this.config.LEARNING_STEPS[0] / (24 * 60);
      result.learningState = 'RELEARNING';
      result.memoryStrength = Math.max(0.1, card.memoryStrength * 0.5);
      result.stabilityFactor = Math.max(0.5, card.stabilityFactor - 0.1);
      
      // Ensure interval is less than 1 day for relearning
      result.interval = Math.min(result.interval, 0.5);
    }

    // Apply response time adjustment
    result = this._applyResponseTimeAdjustment(result, responseTime, card.averageResponseTime);
    
    // Apply difficulty adjustment based on user's overall performance
    result = this._applyDifficultyAdjustment(result, card);
    
    // Ensure interval bounds
    result.interval = Math.max(this.config.MIN_INTERVAL, 
                              Math.min(this.config.MAX_INTERVAL, result.interval));
    
    result.nextReview = this._addDaysToDate(new Date(), result.interval);
    return result;
  }

  /**
   * Handle relearning phase cards (failed reviews)
   */
  _handleRelearningCard(result, quality, card) {
    if (quality >= this.config.PASSING_GRADE) {
      // Successfully relearned - return to review
      result.repetition = card.repetition + 1;
      result.interval = Math.max(1, Math.round(card.interval * 0.25)); // Conservative restart
      result.learningState = 'REVIEW';
      result.memoryStrength = Math.min(0.7, card.memoryStrength + 0.3);
    } else {
      // Still struggling - continue relearning
      result.interval = this.config.LEARNING_STEPS[0] / (24 * 60);
      result.learningState = 'RELEARNING';
      result.memoryStrength = Math.max(0.1, card.memoryStrength - 0.1);
    }
    
    result.nextReview = this._addDaysToDate(new Date(), result.interval);
    return result;
  }

  /**
   * Calculate initial memory strength based on first response quality
   */
  _calculateInitialMemoryStrength(quality) {
    const baseStrength = 0.3;
    const qualityBonus = (quality - 1) * 0.15; // 0.15 per quality point above 1
    return Math.min(0.9, baseStrength + qualityBonus);
  }

  /**
   * Apply response time adjustment to interval
   */
  _applyResponseTimeAdjustment(result, responseTime, avgResponseTime) {
    if (responseTime <= 0 || avgResponseTime <= 0) return result;
    
    // If response was much faster than average, slightly increase interval
    const timeRatio = responseTime / avgResponseTime;
    
    if (timeRatio < 0.5) {
      // Very fast response - item seems easy
      result.interval = Math.round(result.interval * 1.1);
      result.memoryStrength = Math.min(0.95, result.memoryStrength + 0.05);
    } else if (timeRatio > 2.0) {
      // Very slow response - item seems difficult
      result.interval = Math.round(result.interval * 0.9);
      result.difficultyFactor = Math.min(2.0, result.difficultyFactor + 0.1);
    }
    
    return result;
  }

  /**
   * Apply difficulty adjustment based on historical performance
   */
  _applyDifficultyAdjustment(result, card) {
    // If card has many lapses, make intervals more conservative
    if (card.lapses > 0) {
      const lapsePenalty = Math.min(0.5, card.lapses * 0.1);
      result.interval = Math.round(result.interval * (1 - lapsePenalty));
      result.difficultyFactor = Math.min(2.0, card.difficultyFactor + lapsePenalty);
    }
    
    // If card has long correct streak, allow longer intervals
    if (card.correctStreak > 5) {
      const streakBonus = Math.min(0.3, (card.correctStreak - 5) * 0.05);
      result.interval = Math.round(result.interval * (1 + streakBonus));
    }
    
    return result;
  }

  /**
   * Calculate optimal review time based on circadian rhythms
   */
  getOptimalReviewTime(card, userPreferences = {}) {
    const baseTime = card.nextReview;
    const hour = baseTime.getHours();
    
    // Default optimal times: morning (9-11) and evening (19-21)
    const optimalHours = userPreferences.optimalHours || [9, 10, 19, 20];
    
    // If review is due during non-optimal hours, suggest nearest optimal time
    if (!optimalHours.includes(hour)) {
      const nearestHour = optimalHours.reduce((prev, curr) => 
        Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
      );
      
      const optimizedTime = new Date(baseTime);
      optimizedTime.setHours(nearestHour, 0, 0, 0);
      
      // If the optimal time has passed today, schedule for tomorrow
      if (optimizedTime <= new Date()) {
        optimizedTime.setDate(optimizedTime.getDate() + 1);
      }
      
      return optimizedTime;
    }
    
    return baseTime;
  }

  /**
   * Utility: Add days to a date
   */
  _addDaysToDate(date, days) {
    const result = new Date(date);
    result.setTime(result.getTime() + (days * 24 * 60 * 60 * 1000));
    return result;
  }

  /**
   * Calculate retention probability using exponential decay model
   */
  calculateRetentionProbability(card, targetDate = new Date()) {
    const daysSinceReview = card.daysSinceLastReview(targetDate);
    const stability = card.stabilityFactor * card.easeFactor;
    
    // Exponential forgetting curve: R(t) = e^(-t/S)
    // where R(t) is retention at time t, S is stability
    const retention = Math.exp(-daysSinceReview / stability);
    
    // Adjust for memory strength
    return Math.min(0.95, retention * card.memoryStrength);
  }

  /**
   * Get configuration (for tuning)
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration (for A/B testing and optimization)
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = ForgettingCurveService;