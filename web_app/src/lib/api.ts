// API utilities for DASI English backend
import type { FeedbackResponse, DrillCard, StudySession, ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async health(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Get drill cards for a specific level and stage
  async getCards(level: number, stage: number): Promise<ApiResponse<{
    level: number;
    stage: number;
    cards: DrillCard[];
    totalCards: number;
  }>> {
    return this.request(`/cards?level=${level}&stage=${stage}`);
  }

  // Get feedback from AI for user's answer
  async getFeedback(params: {
    front_ko: string;
    sttText: string;
    target_en: string;
  }): Promise<ApiResponse<FeedbackResponse>> {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Session management
  async startSession(params: {
    userId: string;
    level: number;
    stage: number;
    cardIds: string[];
  }): Promise<ApiResponse<{ sessionId: string }>> {
    return this.request('/session/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async submitAnswer(params: {
    sessionId: string;
    cardId: string;
    userAnswer: string;
    isCorrect: boolean;
    score: number;
    timeSpent: number;
  }): Promise<ApiResponse<{ progress: any }>> {
    return this.request('/session/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async finishSession(sessionId: string): Promise<ApiResponse<{
    summary: {
      totalCards: number;
      correctAnswers: number;
      accuracy: number;
      averageScore: number;
      totalTime: number;
      averageTimePerCard: number;
    }
  }>> {
    return this.request('/session/finish', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  // STT service (if using cloud STT)
  async transcribeAudio(params: {
    audioBase64: string;
    languageCode?: string;
    phraseHints?: string[];
  }): Promise<ApiResponse<{
    transcript: string;
    confidence: number | null;
  }>> {
    return this.request('/stt', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Review API - Random review cards
  async getRandomReview(params: {
    userId?: string;
    count?: number;
    levels?: number[];
  }): Promise<ApiResponse<{
    cards: DrillCard[];
    totalCards: number;
    sourceLevels: number[];
    type: string;
  }>> {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.count) searchParams.append('count', params.count.toString());
    if (params.levels && params.levels.length > 0) {
      searchParams.append('levels', params.levels.join(','));
    }

    return this.request(`/review/random?${searchParams.toString()}`);
  }

  // Review API - Retry incorrect answers
  async getRetryReview(params: {
    userId: string;
    sessionId?: string;
  }): Promise<ApiResponse<{
    cards: DrillCard[];
    totalCards: number;
    type: string;
  }>> {
    const searchParams = new URLSearchParams();
    searchParams.append('userId', params.userId);
    if (params.sessionId) searchParams.append('sessionId', params.sessionId);

    return this.request(`/review/retry?${searchParams.toString()}`);
  }
}

// Create and export API client instance
export const api = new ApiClient(API_BASE_URL);

// Export types for convenience
export type { ApiResponse, FeedbackResponse, DrillCard, StudySession };