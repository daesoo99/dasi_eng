// DASI English - Custom Feedback Service (AI 확장 대비)

export interface UserInterests {
  sports?: boolean;
  music?: boolean;
  food?: boolean;
  travel?: boolean;
  technology?: boolean;
  business?: boolean;
  education?: boolean;
  health?: boolean;
  gaming?: boolean;
}

export interface CustomExample {
  sentence: string;
  context: string;
  difficulty: number;
  interests: string[];
}

export interface FeedbackRequest {
  userId: string;
  interests: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  patternId?: string;
}

export interface FeedbackResponse {
  success: boolean;
  data?: {
    examples: string[];
    customExamples: CustomExample[];
    feedbackStructure: any; // AI 확장 시 참고용
    aiReady: boolean;
    message: string;
  };
  error?: string;
}

export interface FeedbackData {
  feedbackInfo: {
    feedbackId: string;
    userId: string;
    patternId: string;
    sessionId?: string;
    timestamp: string;
  };
  performance?: {
    overallScore: number;
    pronunciationScore?: number;
    grammarScore?: number;
    fluencyScore?: number;
    completionTime?: number;
    attemptCount?: number;
  };
  feedback?: {
    mainFeedback: string;
    strengths?: string[];
    improvements?: string[];
    detectedErrors?: Array<{
      type: 'grammar' | 'pronunciation' | 'vocabulary' | 'fluency' | 'word-order';
      original: string;
      corrected: string;
      explanation?: string;
    }>;
  };
  customExamples?: {
    userInterests: string[];
    difficultyLevel: string;
    generatedExamples: CustomExample[];
  };
  metadata: {
    version: string;
    source: 'manual' | 'ai-generated' | 'hybrid';
    language: string;
    tags?: string[];
  };
}

class FeedbackService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.REACT_APP_API_URL || 'https://api.dasi-english.com'
      : 'http://localhost:8081';
  }

  /**
   * 맞춤형 피드백 예시 생성 요청
   */
  async generateCustomFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/feedback/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('맞춤 피드백 생성 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 피드백 데이터 저장 (Firestore 연동 대비)
   */
  async saveFeedback(feedbackData: FeedbackData): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/feedback/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.success,
        feedbackId: result.data?.feedbackId,
        error: result.error
      };
    } catch (error) {
      console.error('피드백 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 기존 피드백 API (호환성 유지)
   */
  async getBasicFeedback(front_ko: string, sttText: string, target_en: string) {
    try {
      const response = await fetch(`${this.baseURL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ front_ko, sttText, target_en })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('기본 피드백 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 관심사를 배열로 변환
   */
  static interestsToArray(interests: UserInterests): string[] {
    return Object.entries(interests)
      .filter(([_, enabled]) => enabled)
      .map(([interest, _]) => interest);
  }

  /**
   * 피드백 데이터 구조 생성 헬퍼
   */
  static createFeedbackStructure(
    userId: string, 
    patternId: string, 
    customExamples: CustomExample[],
    userInterests: string[],
    difficultyLevel: string = 'intermediate'
  ): FeedbackData {
    return {
      feedbackInfo: {
        feedbackId: `fb_${Math.random().toString(36).substr(2, 12)}`,
        userId,
        patternId,
        timestamp: new Date().toISOString()
      },
      customExamples: {
        userInterests,
        difficultyLevel,
        generatedExamples: customExamples
      },
      metadata: {
        version: '1.0.0',
        source: 'manual', // AI 연결 시 'ai-generated'로 변경
        language: 'ko'
      }
    };
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;