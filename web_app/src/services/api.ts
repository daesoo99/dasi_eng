import axios from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 응답 인터셉터로 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 타입 정의
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface InterviewConfig {
  position: string;
  experience: string;
}

interface InterviewStartResponse {
  interviewId: string;
  question: string;
  questionCount: number;
  totalQuestions: number;
}

interface QuestionResponse {
  question: string | null;
  questionCount?: number;
  totalQuestions?: number;
  isComplete?: boolean;
  message?: string;
}

interface EvaluationResponse {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  timestamp: number;
}

export const interviewAPI = {
  // 면접 시작
  start: async (config: InterviewConfig): Promise<APIResponse<InterviewStartResponse>> => {
    try {
      const response = await api.post('/interview/start', config);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '면접 시작에 실패했습니다.');
    }
  },

  // 다음 질문 요청
  getNextQuestion: async (data: {
    interviewId: string;
    position: string;
  }): Promise<APIResponse<QuestionResponse>> => {
    try {
      const response = await api.post('/interview/question', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '질문 생성에 실패했습니다.');
    }
  },

  // 답변 평가
  evaluate: async (data: {
    question: string;
    answer: string;
    position: string;
    interviewId?: string;
  }): Promise<APIResponse<EvaluationResponse>> => {
    try {
      const response = await api.post('/interview/evaluate', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '답변 평가에 실패했습니다.');
    }
  },

  // 면접 종료
  end: async (interviewId: string): Promise<APIResponse<any>> => {
    try {
      const response = await api.post(`/interview/${interviewId}/end`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '면접 종료에 실패했습니다.');
    }
  },

  // 세션 조회
  getSession: async (interviewId: string): Promise<APIResponse<any>> => {
    try {
      const response = await api.get(`/interview/${interviewId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '세션 조회에 실패했습니다.');
    }
  }
};

export const speechAPI = {
  // 음성을 텍스트로 변환 (서버 기반 STT - 필요시)
  speechToText: async (audioBlob: Blob): Promise<{ text: string; confidence?: number }> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      
      const response = await api.post('/speech/stt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '음성 인식에 실패했습니다.');
    }
  },

  // 텍스트를 음성으로 변환
  textToSpeech: async (text: string, language = 'ko-KR'): Promise<Blob> => {
    try {
      const response = await api.post('/speech/tts', { text, language }, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '음성 합성에 실패했습니다.');
    }
  }
};

// Web Speech API 헬퍼 함수들
export const webSpeechAPI = {
  // 브라우저 지원 확인
  isSupported: (): boolean => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  // TTS 지원 확인
  isTTSSupported: (): boolean => {
    return 'speechSynthesis' in window;
  },

  // 음성 합성 (브라우저 내장)
  speak: (text: string, language = 'ko-KR'): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!webSpeechAPI.isTTSSupported()) {
        reject(new Error('브라우저에서 음성 합성을 지원하지 않습니다.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error('음성 합성 오류: ' + event.error));
      
      speechSynthesis.speak(utterance);
    });
  },

  // 음성 합성 중지
  stopSpeaking: (): void => {
    if (webSpeechAPI.isTTSSupported()) {
      speechSynthesis.cancel();
    }
  }
};

// 유틸리티 함수들
export const apiUtils = {
  // 에러 메시지 추출
  getErrorMessage: (error: any): string => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
  },

  // 연결 상태 확인
  checkConnection: async (): Promise<boolean> => {
    try {
      await api.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
};

export default api;