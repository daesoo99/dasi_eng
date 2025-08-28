/**
 * Tests for ReviewCard Model
 */

const ReviewCard = require('../src/models/ReviewCard');

describe('ReviewCard', () => {
  let card;

  beforeEach(() => {
    card = new ReviewCard({
      userId: 'test-user-123',
      itemId: 'test-item-456',
      itemType: 'sentence'
    });
  });

  describe('constructor', () => {
    test('should create card with default values', () => {
      const defaultCard = new ReviewCard();
      
      expect(defaultCard.easeFactor).toBe(2.5);
      expect(defaultCard.interval).toBe(1);
      expect(defaultCard.repetition).toBe(0);
      expect(defaultCard.memoryStrength).toBe(0.5);
      expect(defaultCard.learningState).toBe('NEW');
      expect(defaultCard.graduated).toBe(false);
      expect(defaultCard.suspended).toBe(false);
    });

    test('should create card with provided values', () => {
      const customCard = new ReviewCard({
        userId: 'user-456',
        itemId: 'item-789',
        easeFactor: 3.0,
        interval: 5,
        learningState: 'REVIEW'
      });
      
      expect(customCard.userId).toBe('user-456');
      expect(customCard.itemId).toBe('item-789');
      expect(customCard.easeFactor).toBe(3.0);
      expect(customCard.interval).toBe(5);
      expect(customCard.learningState).toBe('REVIEW');
    });

    test('should generate UUID for id if not provided', () => {
      const card1 = new ReviewCard();
      const card2 = new ReviewCard();
      
      expect(card1.id).toBeDefined();
      expect(card2.id).toBeDefined();
      expect(card1.id).not.toBe(card2.id);
    });
  });

  describe('JSON serialization', () => {
    test('should convert to JSON', () => {
      const json = card.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('itemId');
      expect(json).toHaveProperty('easeFactor');
      expect(json).toHaveProperty('learningState');
      expect(json.userId).toBe('test-user-123');
      expect(json.itemId).toBe('test-item-456');
    });

    test('should create from JSON', () => {
      const jsonData = {
        id: 'test-id-123',
        userId: 'user-789',
        itemId: 'item-012',
        easeFactor: 2.8,
        interval: 7,
        learningState: 'REVIEW',
        lastReviewed: '2024-01-15T10:00:00.000Z',
        nextReview: '2024-01-22T10:00:00.000Z'
      };
      
      const cardFromJson = ReviewCard.fromJSON(jsonData);
      
      expect(cardFromJson.id).toBe('test-id-123');
      expect(cardFromJson.userId).toBe('user-789');
      expect(cardFromJson.easeFactor).toBe(2.8);
      expect(cardFromJson.interval).toBe(7);
      expect(cardFromJson.lastReviewed).toBeInstanceOf(Date);
      expect(cardFromJson.nextReview).toBeInstanceOf(Date);
    });

    test('should handle date string conversion', () => {
      const jsonData = {
        lastReviewed: '2024-01-15T10:00:00.000Z',
        nextReview: '2024-01-22T10:00:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z'
      };
      
      const cardFromJson = ReviewCard.fromJSON(jsonData);
      
      expect(cardFromJson.lastReviewed).toBeInstanceOf(Date);
      expect(cardFromJson.nextReview).toBeInstanceOf(Date);
      expect(cardFromJson.createdAt).toBeInstanceOf(Date);
      expect(cardFromJson.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('due date checking', () => {
    test('should identify due cards', () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      card.nextReview = pastTime;
      
      expect(card.isDue()).toBe(true);
    });

    test('should identify not due cards', () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
      card.nextReview = futureTime;
      
      expect(card.isDue()).toBe(false);
    });

    test('should not consider suspended cards as due', () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      card.nextReview = pastTime;
      card.suspended = true;
      
      expect(card.isDue()).toBe(false);
    });

    test('should identify overdue cards', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      card.nextReview = twoDaysAgo;
      
      expect(card.isOverdue()).toBe(true);
    });

    test('should not consider cards overdue if within 1 day', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      card.nextReview = twelveHoursAgo;
      
      expect(card.isOverdue()).toBe(false);
    });
  });

  describe('time calculations', () => {
    test('should calculate days since last review', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      card.lastReviewed = threeDaysAgo;
      
      expect(card.daysSinceLastReview()).toBe(3);
    });

    test('should return 0 if never reviewed', () => {
      card.lastReviewed = null;
      
      expect(card.daysSinceLastReview()).toBe(0);
    });

    test('should calculate days until next review', () => {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      card.nextReview = threeDaysFromNow;
      
      expect(card.daysUntilNextReview()).toBe(3);
    });

    test('should handle negative days until review', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      card.nextReview = twoDaysAgo;
      
      expect(card.daysUntilNextReview()).toBe(-2);
    });
  });

  describe('review updates', () => {
    test('should update after successful review', () => {
      const initialReviews = card.totalReviews;
      const currentTime = new Date();
      
      card.updateAfterReview(4, 5000, currentTime);
      
      expect(card.totalReviews).toBe(initialReviews + 1);
      expect(card.lastReviewed.getTime()).toBe(currentTime.getTime());
      expect(card.quality).toBe(4);
      expect(card.correctStreak).toBe(1);
    });

    test('should reset streak on failed review', () => {
      card.correctStreak = 5;
      card.graduated = true;
      
      card.updateAfterReview(2); // Failed review
      
      expect(card.correctStreak).toBe(0);
      expect(card.lapses).toBe(1);
    });

    test('should update average response time', () => {
      card.totalReviews = 0;
      card.averageResponseTime = 0;
      
      // First review
      card.updateAfterReview(4, 3000);
      expect(card.averageResponseTime).toBe(3000);
      
      // Second review - should average with previous
      card.updateAfterReview(4, 5000);
      expect(card.averageResponseTime).toBe(4000); // (3000 + 5000) / 2
    });

    test('should not update response time if not provided', () => {
      const initialResponseTime = card.averageResponseTime;
      
      card.updateAfterReview(4);
      
      expect(card.averageResponseTime).toBe(initialResponseTime);
    });
  });

  describe('learning state transitions', () => {
    test('should transition from NEW to LEARNING on passing grade', () => {
      card.learningState = 'NEW';
      
      card.updateLearningState(3);
      
      expect(card.learningState).toBe('LEARNING');
    });

    test('should stay NEW on failing grade', () => {
      card.learningState = 'NEW';
      
      card.updateLearningState(2);
      
      expect(card.learningState).toBe('NEW');
    });

    test('should graduate from LEARNING to REVIEW with good streak', () => {
      card.learningState = 'LEARNING';
      card.correctStreak = 2;
      
      card.updateLearningState(4);
      
      expect(card.learningState).toBe('REVIEW');
      expect(card.graduated).toBe(true);
    });

    test('should move from REVIEW to RELEARNING on failure', () => {
      card.learningState = 'REVIEW';
      card.graduated = true;
      
      card.updateLearningState(1);
      
      expect(card.learningState).toBe('RELEARNING');
      expect(card.graduated).toBe(false);
    });

    test('should recover from RELEARNING to REVIEW', () => {
      card.learningState = 'RELEARNING';
      card.correctStreak = 1;
      
      card.updateLearningState(4);
      
      expect(card.learningState).toBe('REVIEW');
      expect(card.graduated).toBe(true);
    });
  });

  describe('memory strength calculation', () => {
    test('should calculate current memory strength', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      card.lastReviewed = twoDaysAgo;
      card.memoryStrength = 0.8;
      card.stabilityFactor = 1.5;
      
      const currentStrength = card.calculateCurrentMemoryStrength();
      
      expect(currentStrength).toBeLessThan(0.8); // Should decay over time
      expect(currentStrength).toBeGreaterThanOrEqual(0.1); // Should not go below minimum
    });

    test('should return original strength if never reviewed', () => {
      card.lastReviewed = null;
      card.memoryStrength = 0.7;
      
      const currentStrength = card.calculateCurrentMemoryStrength();
      
      expect(currentStrength).toBe(0.7);
    });

    test('should consider stability factor in decay', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      card.lastReviewed = oneDayAgo;
      card.memoryStrength = 0.8;
      
      // High stability should decay slower
      card.stabilityFactor = 2.0;
      const highStabilityStrength = card.calculateCurrentMemoryStrength();
      
      // Low stability should decay faster
      card.stabilityFactor = 0.5;
      const lowStabilityStrength = card.calculateCurrentMemoryStrength();
      
      expect(highStabilityStrength).toBeGreaterThan(lowStabilityStrength);
    });
  });

  describe('priority scoring', () => {
    test('should calculate priority score', () => {
      card.memoryStrength = 0.3; // Low strength should increase priority
      card.difficultyFactor = 1.5;
      card.lapses = 2;
      
      const priority = card.getPriorityScore();
      
      expect(priority).toBeGreaterThan(0);
      expect(typeof priority).toBe('number');
    });

    test('should prioritize low memory strength cards', () => {
      const lowStrengthCard = new ReviewCard();
      lowStrengthCard.memoryStrength = 0.2;
      
      const highStrengthCard = new ReviewCard();
      highStrengthCard.memoryStrength = 0.9;
      
      const lowPriority = lowStrengthCard.getPriorityScore();
      const highPriority = highStrengthCard.getPriorityScore();
      
      expect(lowPriority).toBeGreaterThan(highPriority);
    });

    test('should prioritize overdue cards', () => {
      const overdueCard = new ReviewCard();
      overdueCard.nextReview = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days overdue
      
      const dueCard = new ReviewCard();
      dueCard.nextReview = new Date(); // Due now
      
      const overduePriority = overdueCard.getPriorityScore();
      const duePriority = dueCard.getPriorityScore();
      
      expect(overduePriority).toBeGreaterThan(duePriority);
    });

    test('should prioritize cards with more lapses', () => {
      const highLapseCard = new ReviewCard();
      highLapseCard.lapses = 5;
      
      const lowLapseCard = new ReviewCard();
      lowLapseCard.lapses = 1;
      
      const highLapsePriority = highLapseCard.getPriorityScore();
      const lowLapsePriority = lowLapseCard.getPriorityScore();
      
      expect(highLapsePriority).toBeGreaterThan(lowLapsePriority);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle invalid dates gracefully', () => {
      card.lastReviewed = 'invalid-date';
      card.nextReview = 'invalid-date';
      
      expect(() => card.isDue()).not.toThrow();
      expect(() => card.daysSinceLastReview()).not.toThrow();
    });

    test('should handle missing properties', () => {
      const incompleteCard = new ReviewCard({});
      
      expect(incompleteCard.id).toBeDefined();
      expect(incompleteCard.easeFactor).toBe(2.5);
      expect(incompleteCard.learningState).toBe('NEW');
    });

    test('should handle boundary values', () => {
      card.memoryStrength = 0;
      card.stabilityFactor = 0;
      card.difficultyFactor = 0;
      
      expect(() => card.calculateCurrentMemoryStrength()).not.toThrow();
      expect(() => card.getPriorityScore()).not.toThrow();
    });
  });
});