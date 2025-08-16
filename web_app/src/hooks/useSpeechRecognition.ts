/**
 * @fileoverview 음성 인식 Hook - 전문적인 에러 처리 및 성능 모니터링 포함
 * @description Web Speech API를 사용한 음성 인식 기능을 관리하는 커스텀 Hook
 * @author DaSiStart Team
 * @version 2.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  handleSpeechError,
  handleError,
  ErrorType,
  LogCategory,
  logInfo,
  logError,
  logWarn,
  speechLogger,
  measureAudioLatency,
  endAudioLatency,
  usePerformanceMonitoring,
  type StructuredError
} from '../utils/index.ts';

// ====== 타입 정의 ======

export interface SpeechRecognitionState {
  // 인식 상태
  isListening: boolean;
  isSupported: boolean;
  isInitialized: boolean;
  
  // 결과
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  confidence: number;
  
  // 에러 및 성능
  error: StructuredError | null;
  lastRecognitionTime: number;
  
  // 통계
  recognitionCount: number;
  averageConfidence: number;
  totalRecognitionTime: number;
}

export interface SpeechRecognitionOptions {
  // 기본 설정
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  
  // 성능 설정
  autoRestart?: boolean;
  restartDelay?: number;
  maxRestarts?: number;
  
  // 필터링 설정
  minConfidence?: number;
  enableNoiseReduction?: boolean;
  silenceTimeout?: number;
  
  // 콜백 함수들
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onError?: (error: StructuredError) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSoundStart?: () => void;
  onSoundEnd?: () => void;
  
  // 디버그
  debugMode?: boolean;
}

export interface SpeechRecognitionActions {
  // 기본 액션
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  restartListening: () => Promise<boolean>;
  
  // 상태 관리
  resetTranscript: () => void;
  clearError: () => void;
  
  // 권한 및 설정
  requestMicrophonePermission: () => Promise<boolean>;
  checkMicrophonePermission: () => Promise<PermissionState>;
  
  // 유틸리티
  getBrowserSupport: () => BrowserSupportInfo;
  getRecognitionStatistics: () => RecognitionStatistics;
  exportRecognitionData: () => any;
}

export interface BrowserSupportInfo {
  isSupported: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isMobile: boolean;
  recommendation: string;
  supportedFeatures: string[];
  limitations: string[];
}

export interface RecognitionStatistics {
  totalRecognitions: number;
  averageConfidence: number;
  averageRecognitionTime: number;
  successRate: number;
  errorCount: number;
  lastRecognitionTime: number;
  totalListeningTime: number;
}

export interface SpeechRecognitionHookResult extends SpeechRecognitionState, SpeechRecognitionActions {
  // 계산된 값들
  fullTranscript: string;
  hasTranscript: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  canStart: boolean;
  
  // 설정 정보
  config: Required<SpeechRecognitionOptions>;
}

// ====== 메인 Hook ======

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}): SpeechRecognitionHookResult => {
  const {
    continuous = true,
    interimResults = true,
    language = 'ko-KR',
    maxAlternatives = 3,
    autoRestart = true,
    restartDelay = 1000,
    maxRestarts = 5,
    minConfidence = 0.3,
    enableNoiseReduction = true,
    silenceTimeout = 5000,
    onStart,
    onEnd,
    onResult,
    onError,
    onSpeechStart,
    onSpeechEnd,
    onSoundStart,
    onSoundEnd,
    debugMode = process.env.NODE_ENV === 'development'
  } = options;

  // 성능 모니터링
  const { measureRender, measureAudioLatency } = usePerformanceMonitoring('useSpeechRecognition');

  // ====== 상태 관리 ======

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isSupported: false,
    isInitialized: false,
    transcript: '',
    interimTranscript: '',
    finalTranscript: '',
    confidence: 0,
    error: null,
    lastRecognitionTime: 0,
    recognitionCount: 0,
    averageConfidence: 0,
    totalRecognitionTime: 0
  });

  // ====== Refs ======

  const recognitionRef = useRef<any>(null);
  const isManualStop = useRef(false);
  const restartCount = useRef(0);
  const recognitionStartTime = useRef<number>(0);
  const confidenceScores = useRef<number[]>([]);
  const recognitionTimes = useRef<number[]>([]);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const measurementId = useRef<string | null>(null);

  // ====== 유틸리티 함수 ======

  const updateState = useCallback((updates: Partial<SpeechRecognitionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: StructuredError | null) => {
    updateState({ error });
    
    if (error) {
      logError(LogCategory.SPEECH, error.message, error.originalError, {
        component: 'useSpeechRecognition',
        action: error.context?.action || 'unknown'
      });
      onError?.(error);
    }
  }, [updateState, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // ====== 브라우저 호환성 체크 ======

  const getBrowserSupport = useCallback((): BrowserSupportInfo => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isMobile = /Mobile|Android|iOS/.test(userAgent);
    
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    const supportedFeatures: string[] = [];
    const limitations: string[] = [];
    
    if (isSupported) {
      supportedFeatures.push('음성 인식');
      if (continuous) supportedFeatures.push('연속 인식');
      if (interimResults) supportedFeatures.push('실시간 결과');
    }
    
    if (!isSupported) {
      limitations.push('음성 인식 미지원');
    }
    if (isSafari) {
      limitations.push('Safari에서 제한적 지원');
    }
    if (isMobile && !isChrome) {
      limitations.push('모바일에서 제한적 지원');
    }
    
    let recommendation = '';
    if (!isSupported) {
      recommendation = 'Chrome 또는 Edge 브라우저를 사용하시기 바랍니다.';
    } else if (isSafari || isFirefox) {
      recommendation = '최적의 성능을 위해 Chrome 브라우저를 권장합니다.';
    } else {
      recommendation = '지원되는 브라우저입니다.';
    }

    return {
      isSupported,
      isChrome,
      isEdge,
      isSafari,
      isFirefox,
      isMobile,
      recommendation,
      supportedFeatures,
      limitations
    };
  }, [continuous, interimResults]);

  // ====== 권한 관리 ======

  const checkMicrophonePermission = useCallback(async (): Promise<PermissionState> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch (error) {
      logWarn(LogCategory.SPEECH, '마이크 권한 상태 확인 실패', error);
      return 'prompt';
    }
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: enableNoiseReduction,
          noiseSuppression: enableNoiseReduction,
          autoGainControl: enableNoiseReduction
        }
      });
      
      // 권한 확인 후 스트림 정리
      stream.getTracks().forEach(track => track.stop());
      
      speechLogger.start({ 
        language, 
        continuous, 
        interimResults,
        enableNoiseReduction
      });

      return true;
    } catch (error: any) {
      const structuredError = handleSpeechError(error, {
        component: 'useSpeechRecognition',
        action: 'requestMicrophonePermission'
      });
      
      setError(structuredError);
      return false;
    }
  }, [enableNoiseReduction, language, continuous, interimResults, setError]);

  // ====== 음성 인식 초기화 ======

  const initializeRecognition = useCallback(() => {
    const browserSupport = getBrowserSupport();
    
    if (!browserSupport.isSupported) {
      const error = handleError(
        ErrorType.SPEECH_NOT_SUPPORTED,
        '이 브라우저에서는 음성 인식을 지원하지 않습니다.',
        { 
          component: 'useSpeechRecognition', 
          action: 'initialize',
          additionalData: browserSupport
        }
      );
      setError(error);
      return false;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      
      // 기본 설정
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      // 이벤트 핸들러 설정
      setupEventHandlers();
      
      updateState({ 
        isSupported: true, 
        isInitialized: true,
        error: null
      });

      if (debugMode) {
        logInfo(LogCategory.SPEECH, '음성 인식 초기화 완료', {
          continuous,
          interimResults,
          language,
          maxAlternatives
        });
      }

      return true;
    } catch (error: any) {
      const structuredError = handleError(
        ErrorType.SPEECH_SERVICE_ERROR,
        error,
        { component: 'useSpeechRecognition', action: 'initialize' }
      );
      setError(structuredError);
      return false;
    }
  }, [getBrowserSupport, continuous, interimResults, language, maxAlternatives, debugMode, updateState, setError]);

  // ====== 이벤트 핸들러 설정 ======

  const setupEventHandlers = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.onstart = () => {
      recognitionStartTime.current = Date.now();
      measurementId.current = measureAudioLatency();
      
      updateState({ 
        isListening: true, 
        error: null,
        lastRecognitionTime: Date.now()
      });
      
      if (debugMode) {
        speechLogger.start({ language, continuous });
      }
      
      onStart?.();
    };

    recognitionRef.current.onend = () => {
      const recognitionTime = Date.now() - recognitionStartTime.current;
      recognitionTimes.current.push(recognitionTime);
      
      updateState({ 
        isListening: false,
        totalRecognitionTime: state.totalRecognitionTime + recognitionTime
      });
      
      // 자동 재시작 처리
      if (!isManualStop.current && autoRestart && restartCount.current < maxRestarts) {
        setTimeout(() => {
          if (!isManualStop.current && recognitionRef.current) {
            restartListening();
          }
        }, restartDelay);
      } else if (restartCount.current >= maxRestarts) {
        logWarn(LogCategory.SPEECH, '최대 재시작 횟수 도달', {
          restartCount: restartCount.current,
          maxRestarts
        });
      }
      
      onEnd?.();
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;
      const alternatives: Array<{ text: string; confidence: number }> = [];

      // 결과 처리
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // 모든 대안 수집
        for (let j = 0; j < result.length && j < maxAlternatives; j++) {
          const alternative = result[j];
          alternatives.push({
            text: alternative.transcript,
            confidence: alternative.confidence || 0
          });
        }
        
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          // 최소 신뢰도 필터링
          if (confidence >= minConfidence) {
            finalTranscript += transcript;
            maxConfidence = Math.max(maxConfidence, confidence);
            confidenceScores.current.push(confidence);
            
            // 성능 측정 종료
            if (measurementId.current) {
              endAudioLatency(measurementId.current, transcript);
              measurementId.current = null;
            }
            
            speechLogger.result(transcript, confidence);
          } else if (debugMode) {
            logWarn(LogCategory.SPEECH, '낮은 신뢰도로 결과 무시', {
              transcript,
              confidence,
              minConfidence
            });
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // 상태 업데이트
      if (finalTranscript || interimTranscript) {
        updateState(prev => ({
          transcript: prev.transcript + finalTranscript,
          interimTranscript,
          finalTranscript: prev.finalTranscript + finalTranscript,
          confidence: maxConfidence,
          recognitionCount: finalTranscript ? prev.recognitionCount + 1 : prev.recognitionCount,
          averageConfidence: confidenceScores.current.length > 0 
            ? confidenceScores.current.reduce((sum, conf) => sum + conf, 0) / confidenceScores.current.length 
            : 0
        }));

        // 콜백 호출
        if (finalTranscript) {
          onResult?.(finalTranscript, true, maxConfidence);
          resetSilenceTimer();
        } else if (interimTranscript) {
          onResult?.(interimTranscript, false, 0);
          resetSilenceTimer();
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      const structuredError = handleSpeechError(event, {
        component: 'useSpeechRecognition',
        action: 'recognition',
        additionalData: {
          restartCount: restartCount.current,
          language,
          continuous
        }
      });
      
      setError(structuredError);
      
      // 특정 에러에 대한 자동 복구 시도
      if (event.error === 'no-speech' && autoRestart && restartCount.current < maxRestarts) {
        setTimeout(() => {
          if (!isManualStop.current) {
            restartListening();
          }
        }, restartDelay);
      }
    };

    recognitionRef.current.onnomatch = () => {
      if (debugMode) {
        logWarn(LogCategory.SPEECH, '음성 인식 매치 없음');
      }
    };

    recognitionRef.current.onspeechstart = () => {
      resetSilenceTimer();
      onSpeechStart?.();
    };

    recognitionRef.current.onspeechend = () => {
      startSilenceTimer();
      onSpeechEnd?.();
    };

    recognitionRef.current.onsoundstart = () => {
      onSoundStart?.();
    };

    recognitionRef.current.onsoundend = () => {
      onSoundEnd?.();
    };
  }, [
    language, continuous, autoRestart, maxRestarts, restartDelay, minConfidence, 
    debugMode, updateState, setError, onStart, onEnd, onResult, onSpeechStart, 
    onSpeechEnd, onSoundStart, onSoundEnd, state.totalRecognitionTime
  ]);

  // ====== 침묵 타이머 관리 ======

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    resetSilenceTimer();
    
    if (silenceTimeout > 0) {
      silenceTimer.current = setTimeout(() => {
        if (debugMode) {
          logInfo(LogCategory.SPEECH, '침묵 타임아웃으로 인한 인식 중지');
        }
        stopListening();
      }, silenceTimeout);
    }
  }, [resetSilenceTimer, silenceTimeout, debugMode]);

  // ====== 주요 액션 함수들 ======

  const startListening = useCallback(async (): Promise<boolean> => {
    const endRenderMeasure = measureRender(1, 'startListening');
    
    try {
      if (!state.isInitialized && !initializeRecognition()) {
        return false;
      }

      if (!recognitionRef.current || !state.isSupported) {
        const error = handleError(
          ErrorType.SPEECH_NOT_SUPPORTED,
          '음성 인식을 사용할 수 없습니다.',
          { component: 'useSpeechRecognition', action: 'startListening' }
        );
        setError(error);
        return false;
      }

      if (state.isListening) {
        if (debugMode) {
          logInfo(LogCategory.SPEECH, '이미 음성 인식이 실행 중입니다.');
        }
        return true;
      }

      // 마이크 권한 확인
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return false;
      }

      isManualStop.current = false;
      restartCount.current = 0;
      clearError();

      recognitionRef.current.start();
      
      if (debugMode) {
        logInfo(LogCategory.SPEECH, '음성 인식 시작', {
          language,
          continuous,
          interimResults
        });
      }

      return true;
    } catch (error: any) {
      const structuredError = handleSpeechError(error, {
        component: 'useSpeechRecognition',
        action: 'startListening'
      });
      
      setError(structuredError);
      return false;
    } finally {
      endRenderMeasure();
    }
  }, [
    state.isInitialized, state.isSupported, state.isListening, initializeRecognition,
    requestMicrophonePermission, clearError, setError, debugMode, language,
    continuous, interimResults, measureRender
  ]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      isManualStop.current = true;
      resetSilenceTimer();
      
      if (measurementId.current) {
        endAudioLatency(measurementId.current);
        measurementId.current = null;
      }

      recognitionRef.current.stop();
      
      if (debugMode) {
        logInfo(LogCategory.SPEECH, '음성 인식 중지');
      }
    } catch (error: any) {
      logWarn(LogCategory.SPEECH, '음성 인식 중지 실패', error);
    }
  }, [resetSilenceTimer, debugMode]);

  const restartListening = useCallback(async (): Promise<boolean> => {
    if (restartCount.current >= maxRestarts) {
      const error = handleError(
        ErrorType.SPEECH_SERVICE_ERROR,
        '최대 재시작 횟수를 초과했습니다.',
        { 
          component: 'useSpeechRecognition', 
          action: 'restartListening',
          additionalData: { restartCount: restartCount.current, maxRestarts }
        }
      );
      setError(error);
      return false;
    }

    stopListening();
    
    // 짧은 지연 후 재시작
    await new Promise(resolve => setTimeout(resolve, restartDelay));
    
    restartCount.current++;
    
    if (debugMode) {
      logInfo(LogCategory.SPEECH, '음성 인식 재시작', {
        restartCount: restartCount.current,
        maxRestarts
      });
    }

    return startListening();
  }, [maxRestarts, stopListening, restartDelay, startListening, setError, debugMode]);

  const resetTranscript = useCallback(() => {
    updateState({
      transcript: '',
      interimTranscript: '',
      finalTranscript: '',
      confidence: 0
    });
    
    if (debugMode) {
      logInfo(LogCategory.SPEECH, '음성 인식 결과 초기화');
    }
  }, [updateState, debugMode]);

  // ====== 통계 및 유틸리티 ======

  const getRecognitionStatistics = useCallback((): RecognitionStatistics => {
    const successRate = state.recognitionCount > 0 
      ? (confidenceScores.current.filter(score => score >= minConfidence).length / state.recognitionCount) * 100 
      : 0;
    
    const averageRecognitionTime = recognitionTimes.current.length > 0
      ? recognitionTimes.current.reduce((sum, time) => sum + time, 0) / recognitionTimes.current.length
      : 0;

    return {
      totalRecognitions: state.recognitionCount,
      averageConfidence: state.averageConfidence,
      averageRecognitionTime,
      successRate,
      errorCount: state.error ? 1 : 0,
      lastRecognitionTime: state.lastRecognitionTime,
      totalListeningTime: state.totalRecognitionTime
    };
  }, [state.recognitionCount, state.averageConfidence, state.error, state.lastRecognitionTime, state.totalRecognitionTime, minConfidence]);

  const exportRecognitionData = useCallback(() => {
    return {
      state,
      statistics: getRecognitionStatistics(),
      browserSupport: getBrowserSupport(),
      confidenceHistory: confidenceScores.current,
      recognitionTimeHistory: recognitionTimes.current,
      config: {
        continuous,
        interimResults,
        language,
        maxAlternatives,
        autoRestart,
        restartDelay,
        maxRestarts,
        minConfidence,
        enableNoiseReduction,
        silenceTimeout
      },
      exportTime: new Date().toISOString()
    };
  }, [
    state, getRecognitionStatistics, getBrowserSupport,
    continuous, interimResults, language, maxAlternatives,
    autoRestart, restartDelay, maxRestarts, minConfidence,
    enableNoiseReduction, silenceTimeout
  ]);

  // ====== 초기화 Effect ======

  useEffect(() => {
    initializeRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // 정리 중 에러는 무시
        }
      }
      resetSilenceTimer();
    };
  }, [initializeRecognition, resetSilenceTimer]);

  // ====== 계산된 값들 ======

  const fullTranscript = state.transcript + state.interimTranscript;
  const hasTranscript = fullTranscript.trim().length > 0;
  const isSpeaking = state.interimTranscript.length > 0;
  const isProcessing = state.isListening && !isSpeaking;
  const canStart = state.isSupported && !state.isListening && !state.error;

  const config: Required<SpeechRecognitionOptions> = {
    continuous,
    interimResults,
    language,
    maxAlternatives,
    autoRestart,
    restartDelay,
    maxRestarts,
    minConfidence,
    enableNoiseReduction,
    silenceTimeout,
    onStart: onStart || (() => {}),
    onEnd: onEnd || (() => {}),
    onResult: onResult || (() => {}),
    onError: onError || (() => {}),
    onSpeechStart: onSpeechStart || (() => {}),
    onSpeechEnd: onSpeechEnd || (() => {}),
    onSoundStart: onSoundStart || (() => {}),
    onSoundEnd: onSoundEnd || (() => {}),
    debugMode
  };

  // ====== 반환 값 ======

  return {
    // 상태
    ...state,
    
    // 계산된 값들
    fullTranscript,
    hasTranscript,
    isSpeaking,
    isProcessing,
    canStart,
    
    // 설정
    config,
    
    // 액션들
    startListening,
    stopListening,
    restartListening,
    resetTranscript,
    clearError,
    requestMicrophonePermission,
    checkMicrophonePermission,
    getBrowserSupport,
    getRecognitionStatistics,
    exportRecognitionData
  };
};

export default useSpeechRecognition;