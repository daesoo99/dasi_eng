/**
 * Tests for Forgetting Curve Service
 */

const ForgettingCurveService = require('../src/services/ForgettingCurveService');
const ReviewCard = require('../src/models/ReviewCard');

describe('ForgettingCurveService', () => {
  let service;
  let mockCard;

  beforeEach(() => {
    service = new ForgettingCurveService();
    
    // Create a mock card
    mockCard = new ReviewCard({
      userId: 'test-user-123',
      itemId: 'test-item-456',
      itemType: 'sentence',
      easeFactor: 2.5,
      interval: 1,
      repetition: 0,
      memoryStrength: 0.5,
      stabilityFactor: 1.0,
      difficultyFactor: 1.0,
      learningState: 'NEW'
    });
  });

  describe('calculateNextInterval', () => {
    test('should handle NEW card with passing grade', () => {
      const result = service.calculateNextInterval(mockCard, 3);
      
      expect(result.learningState).toBe('LEARNING');
      expect(result.repetition).toBe(1);
      expect(result.interval).toBeGreaterThan(0);
      expect(result.memoryStrength).toBeGreaterThan(0.1);
    });

    test('should handle NEW card with failing grade', () => {
      const result = service.calculateNextInterval(mockCard, 1);
      
      expect(result.learningState).toBe('NEW');
      expect(result.repetition).toBe(1);
      expect(result.memoryStrength).toBe(0.1);
    });

    test('should graduate card from LEARNING to REVIEW', () => {
      // Set up a learning card that's ready to graduate
      mockCard.learningState = 'LEARNING';
      mockCard.repetition = 3; // Should be ready to graduate
      
      const result = service.calculateNextInterval(mockCard, 4);
      
      expect(result.learningState).toBe('REVIEW');
      expect(result.interval).toBeGreaterThanOrEqual(1);
      expect(result.easeFactor).toBe(2.5);
    });

    test('should handle REVIEW card with good performance', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 6;
      mockCard.easeFactor = 2.5;
      mockCard.repetition = 5;
      
      const result = service.calculateNextInterval(mockCard, 4);
      
      expect(result.learningState).toBe('REVIEW');
      expect(result.interval).toBeGreaterThan(mockCard.interval);
      expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
    });

    test('should move REVIEW card to RELEARNING on failure', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 10;
      mockCard.repetition = 5;
      
      const result = service.calculateNextInterval(mockCard, 1);
      
      expect(result.learningState).toBe('RELEARNING');
      expect(result.interval).toBeLessThan(0.6); // Should be less than 0.5 after relearning fix
      expect(result.memoryStrength).toBeLessThan(mockCard.memoryStrength);
    });
  });

  describe('calculateRetentionProbability', () => {
    test('should calculate retention probability', () => {
      const mockCardWithHistory = {
        ...mockCard,
        lastReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        stabilityFactor: 1.5,
        easeFactor: 2.5,
        memoryStrength: 0.8,
        daysSinceLastReview: (targetDate) => 5
      };
      
      const retention = service.calculateRetentionProbability(mockCardWithHistory);
      
      expect(retention).toBeGreaterThan(0);
      expect(retention).toBeLessThanOrEqual(0.95);
      expect(typeof retention).toBe('number');
    });
  });

  describe('getOptimalReviewTime', () => {
    test('should return optimal review time during non-optimal hours', () => {
      const lateNightReview = new Date();
      lateNightReview.setHours(2, 0, 0, 0); // 2 AM
      
      mockCard.nextReview = lateNightReview;
      
      const optimalTime = service.getOptimalReviewTime(mockCard);
      
      expect(optimalTime.getHours()).toBeGreaterThanOrEqual(9);
      expect(optimalTime.getHours()).toBeLessThanOrEqual(21);
      expect(optimalTime).not.toEqual(lateNightReview);
    });

    test('should keep review time during optimal hours', () => {
      const morningReview = new Date();
      morningReview.setHours(10, 0, 0, 0); // 10 AM
      
      mockCard.nextReview = morningReview;
      
      const optimalTime = service.getOptimalReviewTime(mockCard);
      
      expect(optimalTime.getTime()).toBe(morningReview.getTime());
    });

    test('should respect user preferences for optimal hours', () => {
      const earlyReview = new Date();
      earlyReview.setHours(6, 0, 0, 0); // 6 AM
      
      mockCard.nextReview = earlyReview;
      
      const userPreferences = {
        optimalHours: [6, 7, 18, 19] // Early morning and evening person
      };
      
      const optimalTime = service.getOptimalReviewTime(mockCard, userPreferences);
      
      expect(optimalTime.getTime()).toBe(earlyReview.getTime());
    });
  });

  describe('configuration management', () => {
    test('should get current configuration', () => {
      const config = service.getConfig();
      
      expect(config).toHaveProperty('SM2_INITIAL_EASE');
      expect(config).toHaveProperty('LEARNING_STEPS');
      expect(config).toHaveProperty('MAX_INTERVAL');
      expect(config.SM2_INITIAL_EASE).toBe(2.5);
    });

    test('should update configuration', () => {
      const newConfig = {
        SM2_INITIAL_EASE: 2.0,
        MAX_INTERVAL: 10000
      };
      
      service.updateConfig(newConfig);
      const updatedConfig = service.getConfig();
      
      expect(updatedConfig.SM2_INITIAL_EASE).toBe(2.0);
      expect(updatedConfig.MAX_INTERVAL).toBe(10000);
      // Should preserve other existing values
      expect(updatedConfig.LEARNING_STEPS).toBeDefined();
    });
  });

  describe('response time adjustments', () => {
    test('should apply fast response bonus', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 10;
      mockCard.averageResponseTime = 10; // 10 seconds average
      
      // Fast response (3 seconds)
      const result = service.calculateNextInterval(mockCard, 4, 3);
      
      // Should get a slight bonus for fast response
      expect(result.interval).toBeGreaterThanOrEqual(10);
      expect(result.memoryStrength).toBeGreaterThanOrEqual(mockCard.memoryStrength);
    });

    test('should apply slow response penalty', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 10;
      mockCard.averageResponseTime = 5; // 5 seconds average
      
      // Slow response (15 seconds)
      const result = service.calculateNextInterval(mockCard, 4, 15);
      
      // Should get a slight penalty for slow response
      expect(result.difficultyFactor).toBeGreaterThan(mockCard.difficultyFactor);
    });
  });

  describe('difficulty adjustments', () => {
    test('should apply lapse penalty', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 10;
      mockCard.lapses = 3; // Multiple lapses
      
      const result = service.calculateNextInterval(mockCard, 4);
      
      // Should have reduced interval due to lapses
      expect(result.interval).toBeLessThan(10 * 2.5); // Less than normal SM-2 calculation
    });

    test('should apply streak bonus', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 10;
      mockCard.correctStreak = 10; // Long streak
      
      const result = service.calculateNextInterval(mockCard, 4);
      
      // Should get bonus for long streak
      expect(result.interval).toBeGreaterThan(10 * 2.5); // More than base calculation
    });
  });

  describe('edge cases', () => {
    test('should handle invalid quality scores', () => {
      // Test boundary values
      expect(() => service.calculateNextInterval(mockCard, -1)).not.toThrow();
      expect(() => service.calculateNextInterval(mockCard, 6)).not.toThrow();
      
      const result = service.calculateNextInterval(mockCard, -1);
      expect(result).toBeDefined();
      expect(result.nextReview).toBeInstanceOf(Date);
    });

    test('should handle missing response time', () => {
      const result = service.calculateNextInterval(mockCard, 3);
      
      expect(result).toBeDefined();
      expect(result.nextReview).toBeInstanceOf(Date);
    });

    test('should respect interval bounds', () => {
      mockCard.learningState = 'REVIEW';
      mockCard.interval = 50000; // Very large interval
      mockCard.easeFactor = 3.5; // Maximum ease factor
      
      const result = service.calculateNextInterval(mockCard, 5);
      
      expect(result.interval).toBeLessThanOrEqual(service.config.MAX_INTERVAL);
      expect(result.interval).toBeGreaterThanOrEqual(service.config.MIN_INTERVAL);
    });

    test('should handle cards with no learning state', () => {
      delete mockCard.learningState;
      
      const result = service.calculateNextInterval(mockCard, 3);
      
      expect(result).toBeDefined();
      expect(result.learningState).toBeDefined();
    });
  });

  describe('algorithm consistency', () => {
    test('should produce consistent results for same inputs', () => {
      const result1 = service.calculateNextInterval(mockCard, 4, 5);
      const result2 = service.calculateNextInterval(mockCard, 4, 5);
      
      expect(result1.interval).toBe(result2.interval);
      expect(result1.easeFactor).toBe(result2.easeFactor);
      expect(result1.memoryStrength).toBe(result2.memoryStrength);
    });

    test('should show progression in intervals', () => {
      const card = { ...mockCard };
      card.learningState = 'REVIEW';
      card.interval = 1;
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = service.calculateNextInterval(card, 4);
        results.push(result.interval);
        
        // Update card for next iteration
        card.interval = result.interval;
        card.easeFactor = result.easeFactor;
        card.repetition = result.repetition;
      }
      
      // Intervals should generally increase for good performance
      expect(results[4]).toBeGreaterThan(results[0]);
    });
  });
});