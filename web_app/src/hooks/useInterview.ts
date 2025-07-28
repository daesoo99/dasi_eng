import { useState, useCallback, useRef } from 'react';
import { interviewAPI, webSpeechAPI } from '../services/api';

interface InterviewConfig {
  position: string;
  experience: string;
}

interface InterviewState {
  isActive: boolean;
  isLoading: boolean;
  currentQuestion: string;
  questionCount: number;
  totalQuestions: number;
  interviewId: string | null;
  error: string | null;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  analysis?: {
    wordCount: number;
    charCount: number;
    keywordMatches: number;
    estimatedSpeakingTime: number;
  };
}

export const useInterview = () => {
  const [state, setState] = useState<InterviewState>({
    isActive: false,
    isLoading: false,
    currentQuestion: '',
    questionCount: 0,
    totalQuestions: 5,
    interviewId: null,
    error: null
  });

  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const currentConfig = useRef<InterviewConfig | null>(null);

  // 에러 상태 업데이트
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // 로딩 상태 업데이트
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // 면접 시작
  const startInterview = useCallback(async (config: InterviewConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting interview with config:', config);
      
      const response = await interviewAPI.start(config);
      
      if (response.success && response.data) {
        currentConfig.current = config;
        setState(prev => ({
          ...prev,
          isActive: true,
          isLoading: false,
          interviewId: response.data.interviewId,
          currentQuestion: response.data.question,
          questionCount: response.data.questionCount,
          totalQuestions: response.data.totalQuestions,
          error: null
        }));
        
        console.log('Interview started successfully:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || '면접 시작에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Interview start error:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [setLoading, setError]);

  // 다음 질문 요청
  const getNextQuestion = useCallback(async () => {
    try {
      if (!state.interviewId || !currentConfig.current) {
        throw new Error('면접 세션이 없습니다.');
      }

      setLoading(true);
      setError(null);

      const response = await interviewAPI.getNextQuestion({
        interviewId: state.interviewId,
        position: currentConfig.current.position
      });

      if (response.success && response.data) {
        if (response.data.isComplete) {
          // 면접 완료
          setState(prev => ({
            ...prev,
            isActive: false,
            isLoading: false,
            currentQuestion: '',
            error: null
          }));
          return { isComplete: true, message: response.data.message };
        } else {
          // 다음 질문
          setState(prev => ({
            ...prev,
            currentQuestion: response.data.question,
            questionCount: response.data.questionCount,
            isLoading: false,
            error: null
          }));
          return response.data;
        }
      } else {
        throw new Error(response.error || '다음 질문을 가져오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Get next question error:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [state.interviewId, setLoading, setError]);

  // 답변 평가
  const evaluateAnswer = useCallback(async (answer: string) => {
    try {
      if (!state.interviewId || !state.currentQuestion || !currentConfig.current) {
        throw new Error('면접 세션 정보가 없습니다.');
      }

      setLoading(true);
      setError(null);

      const response = await interviewAPI.evaluate({
        question: state.currentQuestion,
        answer: answer.trim(),
        position: currentConfig.current.position,
        interviewId: state.interviewId
      });

      if (response.success && response.data) {
        setLastEvaluation(response.data);
        setLoading(false);
        console.log('Answer evaluated:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || '답변 평가에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Answer evaluation error:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [state.interviewId, state.currentQuestion, setLoading, setError]);

  // 면접 종료
  const endInterview = useCallback(async () => {
    try {
      if (!state.interviewId) {
        // 세션이 없어도 로컬 상태는 초기화
        setState({
          isActive: false,
          isLoading: false,
          currentQuestion: '',
          questionCount: 0,
          totalQuestions: 5,
          interviewId: null,
          error: null
        });
        currentConfig.current = null;
        setLastEvaluation(null);
        return;
      }

      setLoading(true);
      setError(null);

      const response = await interviewAPI.end(state.interviewId);
      
      // 서버 응답과 관계없이 로컬 상태 초기화
      setState({
        isActive: false,
        isLoading: false,
        currentQuestion: '',
        questionCount: 0,
        totalQuestions: 5,
        interviewId: null,
        error: null
      });
      
      currentConfig.current = null;
      setLastEvaluation(null);
      
      console.log('Interview ended:', response.success ? response.data : 'Session cleared locally');
      
      return response.success ? response.data : null;
    } catch (error: any) {
      console.error('Interview end error:', error);
      // 에러가 발생해도 로컬 상태는 초기화
      setState({
        isActive: false,
        isLoading: false,
        currentQuestion: '',
        questionCount: 0,
        totalQuestions: 5,
        interviewId: null,
        error: null
      });
      currentConfig.current = null;
      setLastEvaluation(null);
    }
  }, [state.interviewId, setLoading, setError]);

  // 질문 음성 재생
  const speakQuestion = useCallback(async (question?: string) => {
    try {
      const textToSpeak = question || state.currentQuestion;
      if (!textToSpeak) {
        throw new Error('재생할 질문이 없습니다.');
      }

      if (!webSpeechAPI.isTTSSupported()) {
        throw new Error('이 브라우저에서는 음성 합성을 지원하지 않습니다.');
      }

      await webSpeechAPI.speak(textToSpeak, 'ko-KR');
    } catch (error: any) {
      console.error('TTS error:', error);
      setError(error.message);
      throw error;
    }
  }, [state.currentQuestion, setError]);

  // 음성 재생 중지
  const stopSpeaking = useCallback(() => {
    try {
      webSpeechAPI.stopSpeaking();
    } catch (error: any) {
      console.error('Stop speaking error:', error);
    }
  }, []);

  // 세션 상태 확인
  const checkSession = useCallback(async () => {
    try {
      if (!state.interviewId) return null;

      const response = await interviewAPI.getSession(state.interviewId);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Session check error:', error);
      return null;
    }
  }, [state.interviewId]);

  // 현재 진행률 계산
  const getProgress = useCallback(() => {
    if (!state.isActive || state.totalQuestions === 0) return 0;
    return Math.round((state.questionCount / state.totalQuestions) * 100);
  }, [state.isActive, state.questionCount, state.totalQuestions]);

  // 면접 완료 여부 확인
  const isComplete = useCallback(() => {
    return state.questionCount >= state.totalQuestions;
  }, [state.questionCount, state.totalQuestions]);

  return {
    // 상태
    ...state,
    lastEvaluation,
    currentConfig: currentConfig.current,

    // 액션
    startInterview,
    getNextQuestion,
    evaluateAnswer,
    endInterview,
    speakQuestion,
    stopSpeaking,
    setError,
    checkSession,

    // 유틸리티
    getProgress,
    isComplete,

    // 브라우저 지원 여부
    isSpeechSupported: webSpeechAPI.isSupported(),
    isTTSSupported: webSpeechAPI.isTTSSupported()
  };
};