/**
 * @deprecated 이 클라이언트는 deprecated입니다.
 * 마이크로서비스 아키텍처에서 단일 서비스로 통합되었습니다.
 * 
 * 대신 smartReviewService.ts를 사용하세요:
 * - getReviews() → SmartReviewService.getTodayReviewSentences()
 * - submitFeedback() → SmartReviewService.recordReviewSession()
 * - updateCards() → SmartReviewService.updateMemoryData()
 * 
 * 2025-01-12: 단일 SSOT 백엔드 서비스로 통합 중
 */

/**
 * Review Engine Client - HTTP client for review-engine microservice
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '../../monitoring/logger';

interface ReviewEngineOptions {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface ReviewRequest {
  userId: string;
  cardIds: string[];
  difficulty?: number;
  maxCards?: number;
}

interface ReviewResponse {
  success: boolean;
  data: {
    cards: ReviewCard[];
    nextReviewTime?: string;
  };
  error?: string;
}

interface ReviewCard {
  id: string;
  content: string;
  difficulty: number;
  lastReviewed?: string;
  nextReview?: string;
}

interface FeedbackRequest {
  userId: string;
  cardId: string;
  rating: number; // 1-5
  responseTime?: number;
}

interface FeedbackResponse {
  success: boolean;
  data: {
    updatedCard: ReviewCard;
    nextCards?: ReviewCard[];
  };
  error?: string;
}

export class ReviewEngineClient {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(options: ReviewEngineOptions = {}) {
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

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({
          method: config.method,
          url: config.url,
          data: config.data
        }, 'Review engine request');
        return config;
      },
      (error) => {
        logger.error({ error: error.message }, 'Review engine request error');
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time']
        }, 'Review engine response');
        return response;
      },
      (error) => {
        logger.error({
          status: error.response?.status,
          url: error.config?.url,
          error: error.message
        }, 'Review engine response error');
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get review cards for a user
   */
  async getReviewCards(request: ReviewRequest): Promise<ReviewResponse> {
    return this.withRetry(async () => {
      const response: AxiosResponse<ReviewResponse> = await this.client.post('/api/reviews/cards', request);
      return response.data;
    });
  }

  /**
   * Submit feedback for a card
   */
  async submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    return this.withRetry(async () => {
      const response: AxiosResponse<FeedbackResponse> = await this.client.post('/api/reviews/feedback', request);
      return response.data;
    });
  }

  /**
   * Get user's review statistics
   */
  async getUserStats(userId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/api/reviews/stats/${userId}`);
      return response.data;
    });
  }

  /**
   * Reset user's review progress
   */
  async resetProgress(userId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/api/reviews/reset/${userId}`);
      return response.data;
    });
  }

  /**
   * Health check for review engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 2000 // Shorter timeout for health checks
      });
      return response.status === 200;
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Review engine health check failed');
      return false;
    }
  }

  /**
   * Retry wrapper for network requests
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        logger.warn({
          attempt,
          maxAttempts: this.retryAttempts,
          error: lastError.message
        }, 'Review engine request failed, retrying...');

        // Don't retry on 4xx errors (client errors)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          throw error;
        }

        // Wait before retrying (except for the last attempt)
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All retries failed
    logger.error({
      attempts: this.retryAttempts,
      error: lastError?.message
    }, 'Review engine request failed after all retries');
    
    throw lastError;
  }

  /**
   * Get client configuration info
   */
  getConfig(): ReviewEngineOptions & { baseURL: string } {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }
}

// Export singleton instance
export const reviewEngineClient = new ReviewEngineClient();

// Export types for external use
export type { ReviewEngineOptions, ReviewRequest, ReviewResponse, ReviewCard, FeedbackRequest, FeedbackResponse };