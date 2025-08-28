/**
 * @fileoverview 통합 API 서비스 - 전문적인 에러 처리 및 성능 모니터링 포함
 * @description AI 면접 시뮬레이터의 모든 API 통신을 관리하는 중앙 서비스
 * @author DaSiStart Team
 * @version 2.2.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { 
  logger,
  errorHandler,
  handleApiError
} from '../utils/index';
import { CURRICULUM_CONFIG, getCurriculumPath } from '../config/curriculum';

// ====== 타입 정의 ======

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

// Updated to include topic
export interface InterviewConfig {
  level: string;
  topic: string;
  position: string;
  experience: string;
}

export interface InterviewStartResponse {
  interviewId: string;
  question: string;
  sessionInfo: {
    level: string;
    topic: string;
  };
}

export interface QuestionResponse {
  question: string | null;
  isComplete?: boolean;
}

export interface EvaluationRequest {
  interviewId: string;
  question: string;
  answer: string;
}

export interface EvaluationResponse {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

// ====== API 클라이언트 설정 ======

class APIClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: CURRICULUM_CONFIG.baseUrl + '/api',
      timeout: 30000,
      headers: { 
        'Content-Type': 'application/json',
        'X-Curriculum-Version': CURRICULUM_CONFIG.version 
      },
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response.data, // Unwrap the response data
      (error: AxiosError) => {
        const structuredError = handleApiError(error, { component: 'APIClient' });
        return Promise.reject(structuredError);
      }
    );
  }

  public async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any
  ): Promise<T> {
    logger.info(`API Request: ${method} ${endpoint}`, 'API');
    const response = await this.axiosInstance({ method, url: endpoint, data });
    return response as T;
  }
}

// ====== API 서비스 클래스들 ======

class InterviewAPIService {
  constructor(private client: APIClient) {}

  start(config: InterviewConfig): Promise<APIResponse<InterviewStartResponse>> {
    return this.client.request<APIResponse<InterviewStartResponse>>('/interview/start', 'POST', config);
  }

  getNextQuestion(data: { interviewId: string }): Promise<APIResponse<QuestionResponse>> {
    return this.client.request<APIResponse<QuestionResponse>>('/interview/question', 'POST', data);
  }

  evaluate(data: EvaluationRequest): Promise<APIResponse<EvaluationResponse>> {
    return this.client.request<APIResponse<EvaluationResponse>>('/interview/evaluate', 'POST', data);
  }

  end(interviewId: string): Promise<APIResponse<any>> {
    return this.client.request<APIResponse<any>>(`/interview/${interviewId}/end`, 'POST');
  }
}

class CurriculumAPIService {
  constructor(private client: APIClient) {}

  async getCurriculum(level: number): Promise<APIResponse<any>> {
    try {
      const path = getCurriculumPath(level);
      const response = await fetch(`${CURRICULUM_CONFIG.baseUrl}/${path}`);
      if (!response.ok) throw new Error(`Failed to fetch curriculum: ${response.statusText}`);
      const data = await response.json();
      return { success: true, data, timestamp: Date.now() };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now() 
      };
    }
  }

  async getStage(level: number, stageId: string): Promise<APIResponse<any>> {
    try {
      const curriculum = await this.getCurriculum(level);
      if (!curriculum.success || !curriculum.data) {
        return { success: false, error: 'Failed to load curriculum', timestamp: Date.now() };
      }
      const stage = curriculum.data.stages?.find((s: any) => s.stage_id === stageId);
      return { 
        success: !!stage, 
        data: stage,
        error: !stage ? 'Stage not found' : undefined,
        timestamp: Date.now() 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now() 
      };
    }
  }

  async getAllLevelPatterns(level: number): Promise<APIResponse<any>> {
    try {
      const curriculum = await this.getCurriculum(level);
      if (!curriculum.success || !curriculum.data) {
        return { success: false, error: 'Failed to load curriculum', timestamp: Date.now() };
      }

      const allPatterns: any[] = [];
      
      // 모든 스테이지의 패턴들을 수집
      if (curriculum.data.stages) {
        curriculum.data.stages.forEach((stage: any) => {
          if (stage.patterns) {
            stage.patterns.forEach((pattern: any) => {
              allPatterns.push({
                ...pattern,
                stage_id: stage.stage_id,
                stage_title: stage.title,
              });
            });
          }
        });
      }

      // 패턴들을 랜덤하게 섞기
      const shuffledPatterns = this.shuffleArray([...allPatterns]);

      return { 
        success: true, 
        data: {
          level,
          mode: 'ALL',
          total_patterns: shuffledPatterns.length,
          patterns: shuffledPatterns,
          title: `Level ${level} - ALL Mode`,
          description: `All patterns from Level ${level} in random order`
        },
        timestamp: Date.now() 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now() 
      };
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async validateCurriculum(level: number): Promise<APIResponse<any>> {
    try {
      const curriculum = await this.getCurriculum(level);
      if (!curriculum.success || !curriculum.data) {
        return { 
          success: false, 
          error: 'Failed to load curriculum for validation',
          timestamp: Date.now() 
        };
      }

      const data = curriculum.data;
      return { 
        success: true, 
        data: {
          total_stages: data.total_stages || data.stages?.length || 0,
          total_phases: data.total_phases || data.phases?.length || 0,
          level: data.level,
          title: data.title,
          isRevised: getCurriculumPath(level).includes('_REVISED.json'),
          stages: data.stages || []
        },
        timestamp: Date.now() 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Validation failed',
        timestamp: Date.now() 
      };
    }
  }
}

// ====== 서비스 인스턴스 생성 및 내보내기 ======

const apiClient = new APIClient();

export const interviewAPI = new InterviewAPIService(apiClient);
export const curriculumAPI = new CurriculumAPIService(apiClient);

// authService에서 사용할 수 있는 기본 API 클라이언트 export
export const api = apiClient;

export default { 
  interview: interviewAPI,
  curriculum: curriculumAPI,
  api: apiClient
};