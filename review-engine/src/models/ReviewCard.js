/**
 * Review Card Model - Represents a single item in the spaced repetition system
 */

class ReviewCard {
  constructor(data = {}) {
    this.id = data.id || require('uuid').v4();
    this.userId = data.userId || '';
    this.itemId = data.itemId || ''; // sentence/pattern ID
    this.itemType = data.itemType || 'sentence'; // sentence, pattern, vocabulary
    
    // SRS Parameters
    this.easeFactor = data.easeFactor || 2.5; // SuperMemo default
    this.interval = data.interval || 1; // days
    this.repetition = data.repetition || 0;
    this.quality = data.quality || 0; // Last response quality (0-5)
    
    // Memory Strength (0-1 scale)
    this.memoryStrength = data.memoryStrength || 0.5;
    this.stabilityFactor = data.stabilityFactor || 1.0;
    this.difficultyFactor = data.difficultyFactor || 1.0;
    
    // Timing
    this.lastReviewed = data.lastReviewed || null;
    this.nextReview = data.nextReview || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Performance tracking
    this.totalReviews = data.totalReviews || 0;
    this.correctStreak = data.correctStreak || 0;
    this.lapses = data.lapses || 0; // Times forgotten after being learned
    this.averageResponseTime = data.averageResponseTime || 0;
    
    // Learning state
    this.learningState = data.learningState || 'NEW'; // NEW, LEARNING, REVIEW, RELEARNING
    this.graduated = data.graduated || false;
    this.suspended = data.suspended || false;
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      itemId: this.itemId,
      itemType: this.itemType,
      easeFactor: this.easeFactor,
      interval: this.interval,
      repetition: this.repetition,
      quality: this.quality,
      memoryStrength: this.memoryStrength,
      stabilityFactor: this.stabilityFactor,
      difficultyFactor: this.difficultyFactor,
      lastReviewed: this.lastReviewed,
      nextReview: this.nextReview,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalReviews: this.totalReviews,
      correctStreak: this.correctStreak,
      lapses: this.lapses,
      averageResponseTime: this.averageResponseTime,
      learningState: this.learningState,
      graduated: this.graduated,
      suspended: this.suspended
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    const card = new ReviewCard(data);
    
    // Ensure dates are Date objects
    if (typeof card.lastReviewed === 'string') {
      card.lastReviewed = new Date(card.lastReviewed);
    }
    if (typeof card.nextReview === 'string') {
      card.nextReview = new Date(card.nextReview);
    }
    if (typeof card.createdAt === 'string') {
      card.createdAt = new Date(card.createdAt);
    }
    if (typeof card.updatedAt === 'string') {
      card.updatedAt = new Date(card.updatedAt);
    }
    
    return card;
  }

  /**
   * Check if card is due for review
   */
  isDue(currentTime = new Date()) {
    return this.nextReview <= currentTime && !this.suspended;
  }

  /**
   * Check if card is overdue
   */
  isOverdue(currentTime = new Date()) {
    const overdueDays = (currentTime - this.nextReview) / (1000 * 60 * 60 * 24);
    return overdueDays > 1 && !this.suspended;
  }

  /**
   * Get days since last review
   */
  daysSinceLastReview(currentTime = new Date()) {
    if (!this.lastReviewed) return 0;
    return Math.floor((currentTime - this.lastReviewed) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days until next review
   */
  daysUntilNextReview(currentTime = new Date()) {
    return Math.ceil((this.nextReview - currentTime) / (1000 * 60 * 60 * 24));
  }

  /**
   * Update the card after a review session
   */
  updateAfterReview(quality, responseTime = 0, currentTime = new Date()) {
    this.lastReviewed = new Date(currentTime);
    this.quality = quality;
    this.totalReviews++;
    this.updatedAt = new Date(currentTime);
    
    // Update average response time
    if (responseTime > 0) {
      this.averageResponseTime = this.totalReviews === 1 
        ? responseTime 
        : (this.averageResponseTime * (this.totalReviews - 1) + responseTime) / this.totalReviews;
    }
    
    // Update streak and lapses
    if (quality >= 3) {
      this.correctStreak++;
    } else {
      if (this.graduated) {
        this.lapses++;
      }
      this.correctStreak = 0;
    }
    
    // Update learning state
    this.updateLearningState(quality);
    
    return this;
  }

  /**
   * Update learning state based on performance
   */
  updateLearningState(quality) {
    switch (this.learningState) {
      case 'NEW':
        this.learningState = quality >= 3 ? 'LEARNING' : 'NEW';
        break;
      case 'LEARNING':
        if (this.correctStreak >= 2 && quality >= 3) {
          this.learningState = 'REVIEW';
          this.graduated = true;
        } else if (quality < 3) {
          this.learningState = 'NEW';
        }
        break;
      case 'REVIEW':
        if (quality < 3) {
          this.learningState = 'RELEARNING';
          this.graduated = false;
        }
        break;
      case 'RELEARNING':
        if (this.correctStreak >= 1 && quality >= 3) {
          this.learningState = 'REVIEW';
          this.graduated = true;
        }
        break;
    }
  }

  /**
   * Calculate memory strength decay based on time elapsed
   */
  calculateCurrentMemoryStrength(currentTime = new Date()) {
    if (!this.lastReviewed) return this.memoryStrength;
    
    const daysSinceReview = this.daysSinceLastReview(currentTime);
    const decayRate = 0.1 / this.stabilityFactor; // Adjusted by stability
    const decay = Math.exp(-decayRate * daysSinceReview);
    
    return Math.max(0.1, this.memoryStrength * decay);
  }

  /**
   * Get priority score for scheduling (higher = more urgent)
   */
  getPriorityScore(currentTime = new Date()) {
    const currentStrength = this.calculateCurrentMemoryStrength(currentTime);
    const overdueDays = Math.max(0, (currentTime - this.nextReview) / (1000 * 60 * 60 * 24));
    
    // Priority factors
    const strengthFactor = 1 - currentStrength; // Lower strength = higher priority
    const overdueFactor = Math.min(10, overdueDays * 2); // Overdue penalty
    const difficultyFactor = this.difficultyFactor; // Harder items get priority
    const lapseFactor = this.lapses * 0.5; // Items with more lapses get priority
    
    return strengthFactor * 10 + overdueFactor + difficultyFactor + lapseFactor;
  }
}

module.exports = ReviewCard;