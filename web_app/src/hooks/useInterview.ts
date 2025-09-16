/**
 * @fileoverview 면접 세션 관리 Hook - 전문적인 에러 처리 및 성능 모니터링 포함
 * @description AI 면접 시뮬레이터의 면접 상태와 로직을 관리하는 커스텀 Hook
 * @author DaSiStart Team
 * @version 2.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  interviewAPI, 
  webSpeechAPI,
  type InterviewConfig,
  type InterviewStartResponse,
  type EvaluationResponse,
  type QuestionResponse,
  type SessionInfo
} from '../services/api';
import { 
  handleError,
  handleApiError,
  ErrorType,
  LogCategory,
  logInfo,
  logError,
  logWarn,
  interviewLogger,
  type StructuredError
} from '../utils/index.ts';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';

// ====== 타입 정의 ======

export interface InterviewState {
  // 기본 상태
  isActive: boolean;
  isLoading: boolean;
  isPaused: boolean;
  
  // 세션 정보
  interviewId: string | null;
  sessionToken: string | null;
  
  // 진행 상태
  currentQuestion: string;
  questionCount: number;
  totalQuestions: number;
  
  // 에러 및 성능
  error: StructuredError | null;
  lastUpdateTime: number;
}

export interface InterviewActions {
  // 면접 관리
  startInterview: (config: InterviewConfig) => Promise<InterviewStartResponse>;
  pauseInterview: () => void;
  resumeInterview: () => void;
  endInterview: () => Promise<void>;
  
  // 질문 및 답변
  getNextQuestion: () => Promise<QuestionResponse | null>;
  evaluateAnswer: (answer: string) => Promise<EvaluationResponse>;
  
  // 음성 처리
  speakQuestion: (question?: string) => Promise<void>;
  stopSpeaking: () => void;
  
  // 상태 관리
  clearError: () => void;
  refreshSession: () => Promise<SessionInfo | null>;
  
  // 디버그 및 유틸리티
  exportSessionData: () => any;
  getSessionStatistics: () => any;
}

export interface InterviewMetrics {
  sessionDuration: number;
  averageQuestionTime: number;
  totalQuestions: number;
  completedQuestions: number;
  averageScore: number;
  errorCount: number;
  performanceScore: number;
}

export interface InterviewHookOptions {
  autoStartSpeech?: boolean;
  enablePerformanceTracking?: boolean;
  maxRetries?: number;
  sessionTimeout?: number;
  debugMode?: boolean;
}

export interface InterviewHookResult extends InterviewState, InterviewActions {
  // 추가 상태
  lastEvaluation: EvaluationResponse | null;
  currentConfig: InterviewConfig | null;
  metrics: InterviewMetrics;
  
  // 유틸리티
  isComplete: boolean;
  progress: number;
  canProceed: boolean;
  
  // 브라우저 지원
  isSpeechSupported: boolean;
  isTTSSupported: boolean;
}

// ====== 메인 Hook ======

export const useInterview = (options: InterviewHookOptions = {}): InterviewHookResult => {
  const {
    autoStartSpeech = true,
    enablePerformanceTracking = true,
    _maxRetries = 3,
    sessionTimeout = 30 * 60 * 1000, // 30분
    _debugMode = process.env.NODE_ENV === 'development'
  } = options;

  // ✅ CLAUDE.local 준수: 플러그인 기반 성능 모니터링
  const { 
    measureRender, 
    measureAudio,
    measureAudioLatency, 
    endAudioLatency 
  } = usePerformanceMonitoring('useInterview');

  // ====== 상태 관리 ======

  const [state, setState] = useState<InterviewState>({
    isActive: false,
    isLoading: false,
    isPaused: false,
    interviewId: null,
    sessionToken: null,
    currentQuestion: '',
    questionCount: 0,
    totalQuestions: 5,
    error: null,
    lastUpdateTime: Date.now()
  });

  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResponse | null>(null);
  const [metrics, setMetrics] = useState<InterviewMetrics>({
    sessionDuration: 0,
    averageQuestionTime: 0,
    totalQuestions: 5,
    completedQuestions: 0,
    averageScore: 0,
    errorCount: 0,
    performanceScore: 100
  });

  // ====== Refs ======

  const currentConfig = useRef<InterviewConfig | null>(null);
  const sessionStartTime = useRef<number>(0);
  const questionStartTime = useRef<number>(0);
  const retryCount = useRef<number>(0);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const evaluationScores = useRef<number[]>([]);
  const questionTimes = useRef<number[]>([]);

  // ====== 유틸리티 함수 ======

  const updateState = useCallback((updates: Partial<InterviewState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      lastUpdateTime: Date.now()
    }));
  }, []);

  const setError = useCallback((error: StructuredError | null) => {
    updateState({ error });
    
    if (error) {
      logError(LogCategory.INTERVIEW, error.message, error.originalError, {
        component: 'useInterview',
        interviewId: state.interviewId,
        questionCount: state.questionCount
      });
      
      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    }
  }, [state.interviewId, state.questionCount, updateState]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // ====== 세션 타이머 관리 ======

  const startSessionTimer = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    sessionTimeoutRef.current = setTimeout(() => {
      logWarn(LogCategory.INTERVIEW, '세션 타임아웃', {
        sessionDuration: Date.now() - sessionStartTime.current,
        interviewId: state.interviewId
      });
      
      setError(handleError(
        ErrorType.INTERVIEW_SESSION_EXPIRED,
        '면접 세션이 시간 초과되었습니다.',
        { component: 'useInterview', action: 'sessionTimeout' }
      ));
    }, sessionTimeout);
  }, [sessionTimeout, state.interviewId, setError]);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

  // ====== 메트릭스 업데이트 ======

  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const sessionDuration = sessionStartTime.current ? now - sessionStartTime.current : 0;
    const averageQuestionTime = questionTimes.current.length > 0 
      ? questionTimes.current.reduce((sum, time) => sum + time, 0) / questionTimes.current.length 
      : 0;
    const averageScore = evaluationScores.current.length > 0
      ? evaluationScores.current.reduce((sum, score) => sum + score, 0) / evaluationScores.current.length
      : 0;

    // ✅ measureAudio 활용 - 오디오 성능 통계 수집
    let audioPerformanceScore = 100;
    if (enablePerformanceTracking) {
      const audioLatencyData = measureAudio('interview-session-audio');
      if (audioLatencyData) {
        // 평균 오디오 지연시간이 1초 미만이면 100점, 3초 이상이면 0점
        const avgLatency = audioLatencyData.averageLatency || 0;
        audioPerformanceScore = Math.max(0, Math.min(100, 100 - ((avgLatency - 1000) / 20)));
        
        logInfo(LogCategory.PERFORMANCE, '오디오 성능 통계 업데이트', {
          averageLatency: avgLatency,
          audioPerformanceScore,
          totalMeasurements: audioLatencyData.measurementCount || 0
        });
      }
    }

    setMetrics({
      sessionDuration,
      averageQuestionTime,
      totalQuestions: state.totalQuestions,
      completedQuestions: state.questionCount,
      averageScore,
      errorCount: metrics.errorCount,
      performanceScore: Math.max(0, 100 - metrics.errorCount * 10),
      // ✅ 오디오 성능 점수 추가
      audioPerformanceScore: Math.round(audioPerformanceScore)
    });
  }, [state.totalQuestions, state.questionCount, metrics.errorCount, enablePerformanceTracking, measureAudio]);

  // ====== 면접 관리 함수들 ======

  const startInterview = useCallback(async (config: InterviewConfig): Promise<InterviewStartResponse> => {
    const endRenderMeasure = measureRender(Object.keys(config).length, 'startInterview');
    
    try {
      updateState({ isLoading: true, error: null });
      clearError();
      retryCount.current = 0;

      // 설정 검증
      if (!config.position || !config.company || !config.jobDescription) {
        throw handleError(
          ErrorType.INTERVIEW_CONFIG_INVALID,
          '면접 설정이 완전하지 않습니다.',
          { component: 'useInterview', action: 'startInterview', additionalData: config }
        );
      }

      interviewLogger.start(config);
      
      const response = await interviewAPI.start(config);
      
      if (!response.success || !response.data) {
        throw handleError(
          ErrorType.API_SERVER_ERROR,
          response.error || '면접 시작에 실패했습니다.',
          { component: 'useInterview', action: 'startInterview' }
        );
      }

      // 상태 업데이트
      currentConfig.current = config;
      sessionStartTime.current = Date.now();
      questionStartTime.current = Date.now();
      
      updateState({
        isActive: true,
        isLoading: false,
        interviewId: response.data.interviewId,
        sessionToken: response.data.sessionToken,
        currentQuestion: response.data.question,
        questionCount: response.data.questionCount,
        totalQuestions: response.data.totalQuestions,
        error: null
      });

      // 세션 타이머 시작
      startSessionTimer();
      
      // 자동 음성 재생
      if (autoStartSpeech && response.data.question) {
        try {
          await speakQuestion(response.data.question);
        } catch (speechError) {
          logWarn(LogCategory.SPEECH, '초기 질문 음성 재생 실패', speechError);
        }
      }

      logInfo(LogCategory.INTERVIEW, '면접 시작됨', {
        interviewId: response.data.interviewId,
        position: config.position,
        company: config.company,
        totalQuestions: response.data.totalQuestions
      });

      return response.data;
    } catch (error: any) {
      const structuredError = error.type ? error : handleApiError(error, {
        component: 'useInterview',
        action: 'startInterview'
      });
      
      setError(structuredError);
      updateState({ isLoading: false });
      throw structuredError;
    } finally {
      endRenderMeasure();
    }
  }, [updateState, clearError, startSessionTimer, autoStartSpeech, measureRender]);

  const getNextQuestion = useCallback(async (): Promise<QuestionResponse | null> => {
    if (!state.interviewId || !currentConfig.current) {
      const error = handleError(
        ErrorType.INTERVIEW_SESSION_INVALID,
        '유효하지 않은 면접 세션입니다.',
        { component: 'useInterview', action: 'getNextQuestion' }
      );
      setError(error);
      return null;
    }

    try {
      updateState({ isLoading: true });
      
      // 이전 질문 시간 기록
      if (questionStartTime.current) {
        const questionTime = Date.now() - questionStartTime.current;
        questionTimes.current.push(questionTime);
      }

      const response = await interviewAPI.getNextQuestion({
        interviewId: state.interviewId,
        position: currentConfig.current.position
      });

      if (!response.success) {
        throw handleApiError(new Error(response.error), {
          component: 'useInterview',
          action: 'getNextQuestion'
        });
      }

      const data = response.data!;
      
      if (data.isComplete) {
        // 면접 완료
        interviewLogger.end(
          Date.now() - sessionStartTime.current,
          state.questionCount
        );
        
        updateState({
          isActive: false,
          isLoading: false,
          currentQuestion: ''
        });
        
        clearSessionTimer();
        return data;
      }

      // 다음 질문 설정
      questionStartTime.current = Date.now();
      
      updateState({
        currentQuestion: data.question || '',
        questionCount: data.questionCount || state.questionCount + 1,
        isLoading: false
      });

      interviewLogger.questionGenerated(data.question || '', data.questionCount || 0);

      // 자동 음성 재생
      if (autoStartSpeech && data.question) {
        try {
          await speakQuestion(data.question);
        } catch (speechError) {
          logWarn(LogCategory.SPEECH, '질문 음성 재생 실패', speechError);
        }
      }

      updateMetrics();
      return data;
    } catch (error: any) {
      const structuredError = error.type ? error : handleApiError(error, {
        component: 'useInterview',
        action: 'getNextQuestion'
      });
      
      setError(structuredError);
      updateState({ isLoading: false });
      return null;
    }
  }, [state.interviewId, state.questionCount, updateState, setError, clearSessionTimer, autoStartSpeech, updateMetrics]);

  const evaluateAnswer = useCallback(async (answer: string): Promise<EvaluationResponse> => {
    if (!state.interviewId || !state.currentQuestion || !currentConfig.current) {
      throw handleError(
        ErrorType.INTERVIEW_SESSION_INVALID,
        '면접 세션 정보가 없습니다.',
        { component: 'useInterview', action: 'evaluateAnswer' }
      );
    }

    if (!answer.trim()) {
      throw handleError(
        ErrorType.VALIDATION_ERROR,
        '답변 내용이 없습니다.',
        { component: 'useInterview', action: 'evaluateAnswer' }
      );
    }

    try {
      updateState({ isLoading: true });

      const response = await interviewAPI.evaluate({
        question: state.currentQuestion,
        answer: answer.trim(),
        position: currentConfig.current.position,
        company: currentConfig.current.company,
        interviewId: state.interviewId
      });

      if (!response.success || !response.data) {
        throw handleApiError(new Error(response.error), {
          component: 'useInterview',
          action: 'evaluateAnswer'
        });
      }

      const evaluation = response.data;
      setLastEvaluation(evaluation);
      evaluationScores.current.push(evaluation.score);

      interviewLogger.answerEvaluated(evaluation.score, evaluation.feedback);
      
      logInfo(LogCategory.INTERVIEW, '답변 평가 완료', {
        score: evaluation.score,
        answerLength: answer.length,
        interviewId: state.interviewId
      });

      updateState({ isLoading: false });
      updateMetrics();
      
      return evaluation;
    } catch (error: any) {
      const structuredError = error.type ? error : handleApiError(error, {
        component: 'useInterview',
        action: 'evaluateAnswer'
      });
      
      setError(structuredError);
      updateState({ isLoading: false });
      throw structuredError;
    }
  }, [state.interviewId, state.currentQuestion, updateState, setError, updateMetrics]);

  const pauseInterview = useCallback(() => {
    if (!state.isActive) return;
    
    updateState({ isPaused: true });
    clearSessionTimer();
    webSpeechAPI.stopSpeaking();
    
    logInfo(LogCategory.INTERVIEW, '면접 일시정지', {
      interviewId: state.interviewId,
      questionCount: state.questionCount
    });
  }, [state.isActive, state.interviewId, state.questionCount, updateState, clearSessionTimer]);

  const resumeInterview = useCallback(() => {
    if (!state.isPaused) return;
    
    updateState({ isPaused: false });
    startSessionTimer();
    
    logInfo(LogCategory.INTERVIEW, '면접 재개', {
      interviewId: state.interviewId,
      questionCount: state.questionCount
    });
  }, [state.isPaused, state.interviewId, state.questionCount, updateState, startSessionTimer]);

  const endInterview = useCallback(async (): Promise<void> => {
    try {
      if (state.interviewId) {
        await interviewAPI.end(state.interviewId);
      }
    } catch (error) {
      logWarn(LogCategory.INTERVIEW, '면접 종료 API 호출 실패', error);
    } finally {
      // 로컬 상태는 항상 초기화
      setState({
        isActive: false,
        isLoading: false,
        isPaused: false,
        interviewId: null,
        sessionToken: null,
        currentQuestion: '',
        questionCount: 0,
        totalQuestions: 5,
        error: null,
        lastUpdateTime: Date.now()
      });
      
      currentConfig.current = null;
      setLastEvaluation(null);
      clearSessionTimer();
      webSpeechAPI.stopSpeaking();
      
      const sessionDuration = sessionStartTime.current ? Date.now() - sessionStartTime.current : 0;
      
      interviewLogger.end(sessionDuration, state.questionCount);
      
      logInfo(LogCategory.INTERVIEW, '면접 종료', {
        sessionDuration,
        completedQuestions: state.questionCount,
        averageScore: evaluationScores.current.length > 0 
          ? evaluationScores.current.reduce((sum, score) => sum + score, 0) / evaluationScores.current.length 
          : 0
      });
      
      // 메트릭스 리셋
      evaluationScores.current = [];
      questionTimes.current = [];
      sessionStartTime.current = 0;
      questionStartTime.current = 0;
    }
  }, [state.interviewId, state.questionCount, clearSessionTimer]);

  // ====== 음성 처리 함수들 ======

  const speakQuestion = useCallback(async (question?: string): Promise<void> => {
    const textToSpeak = question || state.currentQuestion;
    if (!textToSpeak) {
      throw handleError(
        ErrorType.VALIDATION_ERROR,
        '재생할 질문이 없습니다.',
        { component: 'useInterview', action: 'speakQuestion' }
      );
    }

    if (!webSpeechAPI.isTTSSupported()) {
      throw handleError(
        ErrorType.TTS_NOT_SUPPORTED,
        '이 브라우저에서는 음성 합성을 지원하지 않습니다.',
        { component: 'useInterview', action: 'speakQuestion' }
      );
    }

    // ✅ CLAUDE.local 준수: 플러그인을 통한 오디오 지연 측정 시작
    const latencyMeasurementId = await measureAudioLatency();
    
    try {
      await webSpeechAPI.speak(textToSpeak, 'ko-KR');
      
      // ✅ CLAUDE.local 준수: 플러그인을 통한 TTS 지연 측정 종료 
      if (latencyMeasurementId) {
        const performanceScore = await endAudioLatency(latencyMeasurementId, textToSpeak);
        
        // 성능 추적이 활성화된 경우 로깅
        if (enablePerformanceTracking) {
          logInfo(LogCategory.PERFORMANCE, 'TTS 지연시간 측정 완료 (플러그인)', {
            measurementId: latencyMeasurementId,
            performanceScore,
            textLength: textToSpeak.length,
            text: textToSpeak.substring(0, 50) + (textToSpeak.length > 50 ? '...' : '')
          });
        }
      }
    } catch (error: any) {
      // ✅ 에러 발생 시에도 측정 종료 (실패로 기록)
      if (latencyMeasurementId) {
        await endAudioLatency(latencyMeasurementId, `ERROR: ${error.message}`);
      }
      
      const structuredError = error.type ? error : handleError(
        ErrorType.TTS_SYNTHESIS_ERROR,
        error,
        { component: 'useInterview', action: 'speakQuestion' }
      );
      setError(structuredError);
      throw structuredError;
    }
  }, [state.currentQuestion, setError, measureAudioLatency, endAudioLatency, enablePerformanceTracking]);

  const stopSpeaking = useCallback(() => {
    try {
      webSpeechAPI.stopSpeaking();
    } catch (error: any) {
      logWarn(LogCategory.SPEECH, '음성 재생 중지 실패', error);
    }
  }, []);

  // ====== 세션 관리 함수들 ======

  const refreshSession = useCallback(async (): Promise<SessionInfo | null> => {
    if (!state.interviewId) return null;

    try {
      const response = await interviewAPI.getSession(state.interviewId);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      logError(LogCategory.INTERVIEW, '세션 정보 조회 실패', error);
      return null;
    }
  }, [state.interviewId]);

  // ====== 유틸리티 함수들 ======

  const exportSessionData = useCallback(() => {
    return {
      state,
      config: currentConfig.current,
      metrics,
      lastEvaluation,
      evaluationHistory: evaluationScores.current,
      questionTimeHistory: questionTimes.current,
      sessionDuration: sessionStartTime.current ? Date.now() - sessionStartTime.current : 0,
      exportTime: new Date().toISOString()
    };
  }, [state, metrics, lastEvaluation]);

  const getSessionStatistics = useCallback(() => {
    const sessionDuration = sessionStartTime.current ? Date.now() - sessionStartTime.current : 0;
    
    return {
      ...metrics,
      sessionDuration,
      isActive: state.isActive,
      progress: state.totalQuestions > 0 ? (state.questionCount / state.totalQuestions) * 100 : 0,
      timePerQuestion: questionTimes.current.length > 0 
        ? questionTimes.current.reduce((sum, time) => sum + time, 0) / questionTimes.current.length 
        : 0
    };
  }, [metrics, state.isActive, state.questionCount, state.totalQuestions]);

  // ====== 계산된 값들 ======

  const isComplete = state.questionCount >= state.totalQuestions;
  const progress = state.totalQuestions > 0 ? (state.questionCount / state.totalQuestions) * 100 : 0;
  const canProceed = state.isActive && !state.isLoading && !state.isPaused && state.currentQuestion.trim().length > 0;
  const isSpeechSupported = webSpeechAPI.isSupported();
  const isTTSSupported = webSpeechAPI.isTTSSupported();

  // ====== 클린업 Effect ======

  useEffect(() => {
    return () => {
      clearSessionTimer();
      webSpeechAPI.stopSpeaking();
    };
  }, [clearSessionTimer]);

  // ====== 메트릭스 업데이트 Effect ======

  useEffect(() => {
    if (state.isActive) {
      const interval = setInterval(updateMetrics, 5000); // 5초마다 메트릭스 업데이트
      return () => clearInterval(interval);
    }
  }, [state.isActive, updateMetrics]);

  // ====== 반환 값 ======

  return {
    // 상태
    ...state,
    lastEvaluation,
    currentConfig: currentConfig.current,
    metrics,

    // 계산된 값들
    isComplete,
    progress,
    canProceed,
    isSpeechSupported,
    isTTSSupported,

    // 액션들
    startInterview,
    pauseInterview,
    resumeInterview,
    endInterview,
    getNextQuestion,
    evaluateAnswer,
    speakQuestion,
    stopSpeaking,
    clearError,
    refreshSession,
    exportSessionData,
    getSessionStatistics
  };
};

export default useInterview;