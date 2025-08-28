/**
 * Tests for Review Engine Server API
 */

const request = require('supertest');
const app = require('../src/server');

describe('Review Engine API', () => {
  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'review-engine');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /schedule', () => {
    const validScheduleRequest = {
      userId: 'test-user-123',
      itemId: 'test-item-456',
      quality: 4,
      responseTime: 3000
    };

    test('should schedule review with valid data', async () => {
      const response = await request(app)
        .post('/schedule')
        .send(validScheduleRequest)
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'test-user-123');
      expect(response.body).toHaveProperty('itemId', 'test-item-456');
      expect(response.body).toHaveProperty('nextReview');
      expect(response.body).toHaveProperty('interval');
      expect(response.body).toHaveProperty('easeFactor');
      expect(response.body).toHaveProperty('memoryStrength');
      expect(response.body).toHaveProperty('learningState');
      expect(response.body).toHaveProperty('card');
    });

    test('should require userId', async () => {
      const invalidRequest = { ...validScheduleRequest };
      delete invalidRequest.userId;

      await request(app)
        .post('/schedule')
        .send(invalidRequest)
        .expect(400);
    });

    test('should require itemId', async () => {
      const invalidRequest = { ...validScheduleRequest };
      delete invalidRequest.itemId;

      await request(app)
        .post('/schedule')
        .send(invalidRequest)
        .expect(400);
    });

    test('should require quality', async () => {
      const invalidRequest = { ...validScheduleRequest };
      delete invalidRequest.quality;

      await request(app)
        .post('/schedule')
        .send(invalidRequest)
        .expect(400);
    });

    test('should validate quality range', async () => {
      const invalidRequest = { ...validScheduleRequest, quality: 6 };

      await request(app)
        .post('/schedule')
        .send(invalidRequest)
        .expect(400);

      const invalidRequest2 = { ...validScheduleRequest, quality: -1 };

      await request(app)
        .post('/schedule')
        .send(invalidRequest2)
        .expect(400);
    });

    test('should handle existing card data', async () => {
      const requestWithCard = {
        ...validScheduleRequest,
        cardData: {
          userId: 'test-user-123',
          itemId: 'test-item-456',
          easeFactor: 2.8,
          interval: 5,
          repetition: 3,
          learningState: 'REVIEW'
        }
      };

      const response = await request(app)
        .post('/schedule')
        .send(requestWithCard)
        .expect(200);

      expect(response.body.card.easeFactor).toBeDefined();
      expect(response.body.card.repetition).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /due/:userId', () => {
    test('should get due cards for user', async () => {
      const response = await request(app)
        .get('/due/test-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'test-user-123');
      expect(response.body).toHaveProperty('dueCards');
      expect(response.body).toHaveProperty('currentTime');
      expect(response.body).toHaveProperty('totalDue');
      expect(Array.isArray(response.body.dueCards)).toBe(true);
    });

    test('should handle query parameters', async () => {
      const response = await request(app)
        .get('/due/test-user-123')
        .query({ limit: 10, includeNew: false, sortBy: 'difficulty' })
        .expect(200);

      expect(response.body.userId).toBe('test-user-123');
      expect(response.body).toHaveProperty('newCards', undefined); // Should not include new cards
    });

    test('should default includeNew to true', async () => {
      const response = await request(app)
        .get('/due/test-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('newCards');
      expect(typeof response.body.newCards).toBe('number');
    });
  });

  describe('POST /retention', () => {
    const validRetentionRequest = {
      cardData: {
        userId: 'test-user-123',
        itemId: 'test-item-456',
        easeFactor: 2.5,
        interval: 7,
        repetition: 5,
        memoryStrength: 0.8,
        stabilityFactor: 1.2,
        lastReviewed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        learningState: 'REVIEW'
      }
    };

    test('should calculate retention probability', async () => {
      const response = await request(app)
        .post('/retention')
        .send(validRetentionRequest)
        .expect(200);

      expect(response.body).toHaveProperty('retentionProbability');
      expect(response.body).toHaveProperty('currentMemoryStrength');
      expect(response.body).toHaveProperty('daysSinceLastReview');
      expect(response.body).toHaveProperty('priorityScore');
      
      expect(typeof response.body.retentionProbability).toBe('number');
      expect(response.body.retentionProbability).toBeGreaterThanOrEqual(0);
      expect(response.body.retentionProbability).toBeLessThanOrEqual(1);
    });

    test('should handle target date', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const requestWithTarget = {
        ...validRetentionRequest,
        targetDate: futureDate.toISOString()
      };

      const response = await request(app)
        .post('/retention')
        .send(requestWithTarget)
        .expect(200);

      expect(response.body.retentionProbability).toBeDefined();
    });

    test('should require cardData', async () => {
      await request(app)
        .post('/retention')
        .send({})
        .expect(400);
    });
  });

  describe('POST /optimal-time', () => {
    const validOptimalTimeRequest = {
      cardData: {
        userId: 'test-user-123',
        itemId: 'test-item-456',
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      }
    };

    test('should get optimal review time', async () => {
      const response = await request(app)
        .post('/optimal-time')
        .send(validOptimalTimeRequest)
        .expect(200);

      expect(response.body).toHaveProperty('scheduledReview');
      expect(response.body).toHaveProperty('optimalReview');
      expect(response.body).toHaveProperty('adjustment');
      expect(response.body).toHaveProperty('adjustmentHours');
      
      expect(typeof response.body.scheduledReview).toBe('number');
      expect(typeof response.body.optimalReview).toBe('number');
    });

    test('should handle user preferences', async () => {
      const requestWithPrefs = {
        ...validOptimalTimeRequest,
        userPreferences: {
          optimalHours: [6, 7, 18, 19]
        }
      };

      const response = await request(app)
        .post('/optimal-time')
        .send(requestWithPrefs)
        .expect(200);

      expect(response.body.optimalReview).toBeDefined();
    });

    test('should require cardData', async () => {
      await request(app)
        .post('/optimal-time')
        .send({})
        .expect(400);
    });
  });

  describe('Configuration Management', () => {
    test('GET /config should return current configuration', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body).toHaveProperty('SM2_INITIAL_EASE');
      expect(response.body).toHaveProperty('LEARNING_STEPS');
      expect(response.body).toHaveProperty('MAX_INTERVAL');
      expect(response.body).toHaveProperty('PASSING_GRADE');
    });

    test('POST /config should update configuration', async () => {
      const newConfig = {
        SM2_INITIAL_EASE: 2.0,
        PASSING_GRADE: 4
      };

      const response = await request(app)
        .post('/config')
        .send(newConfig)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('config');
      expect(response.body.config.SM2_INITIAL_EASE).toBe(2.0);
      expect(response.body.config.PASSING_GRADE).toBe(4);
    });
  });

  describe('POST /batch-schedule', () => {
    const validBatchRequest = {
      reviews: [
        {
          userId: 'test-user-123',
          itemId: 'item-1',
          quality: 4,
          responseTime: 3000
        },
        {
          userId: 'test-user-123',
          itemId: 'item-2',
          quality: 3,
          responseTime: 5000
        },
        {
          userId: 'test-user-456',
          itemId: 'item-3',
          quality: 5,
          responseTime: 2000
        }
      ]
    };

    test('should process batch reviews', async () => {
      const response = await request(app)
        .post('/batch-schedule')
        .send(validBatchRequest)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(3);
      
      expect(response.body.summary).toHaveProperty('total', 3);
      expect(response.body.summary).toHaveProperty('successful');
      expect(response.body.summary).toHaveProperty('failed');
    });

    test('should handle mixed success/failure in batch', async () => {
      const mixedBatchRequest = {
        reviews: [
          {
            userId: 'test-user-123',
            itemId: 'item-1',
            quality: 4
          },
          {
            // Missing required fields - should fail
            userId: 'test-user-123',
            quality: 3
          },
          {
            userId: 'test-user-456',
            itemId: 'item-3',
            quality: 5
          }
        ]
      };

      const response = await request(app)
        .post('/batch-schedule')
        .send(mixedBatchRequest)
        .expect(200);

      expect(response.body.summary.successful).toBeGreaterThan(0);
      expect(response.body.summary.failed).toBeGreaterThan(0);
      expect(response.body.summary.total).toBe(3);
    });

    test('should require reviews array', async () => {
      await request(app)
        .post('/batch-schedule')
        .send({})
        .expect(400);
    });

    test('should validate reviews is array', async () => {
      await request(app)
        .post('/batch-schedule')
        .send({ reviews: 'not-an-array' })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/schedule')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('should handle missing Content-Type', async () => {
      await request(app)
        .post('/schedule')
        .send('some data')
        .expect(400);
    });
  });

  describe('Input Validation', () => {
    test('should sanitize and validate input data', async () => {
      const requestWithExtraFields = {
        userId: 'test-user-123',
        itemId: 'test-item-456',
        quality: 4,
        extraField: 'should-be-ignored',
        maliciousScript: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/schedule')
        .send(requestWithExtraFields)
        .expect(200);

      // Should process valid fields and ignore extra/malicious fields
      expect(response.body.userId).toBe('test-user-123');
      expect(response.body.itemId).toBe('test-item-456');
    });

    test('should handle very large payloads gracefully', async () => {
      const largeReviews = Array.from({ length: 1000 }, (_, i) => ({
        userId: `user-${i}`,
        itemId: `item-${i}`,
        quality: Math.floor(Math.random() * 6)
      }));

      // Should process but may have performance implications
      const response = await request(app)
        .post('/batch-schedule')
        .send({ reviews: largeReviews })
        .expect(200);
      
      expect(response.body.summary.total).toBe(1000);
    });

    test('should handle extreme values', async () => {
      const extremeRequest = {
        userId: 'test-user-123',
        itemId: 'test-item-456',
        quality: Number.MAX_SAFE_INTEGER,
        responseTime: Number.MAX_SAFE_INTEGER
      };

      // Should handle gracefully and normalize values
      const response = await request(app)
        .post('/schedule')
        .send(extremeRequest)
        .expect(400); // Should reject extreme quality value
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/schedule')
          .send({
            userId: 'test-user-123',
            itemId: 'test-item-456',
            quality: 4
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.userId).toBe('test-user-123');
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/schedule')
        .send({
          userId: 'test-user-123',
          itemId: 'test-item-456',
          quality: 4
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});