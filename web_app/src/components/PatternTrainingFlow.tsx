import React, { useState, useEffect, useCallback, useRef, useMemo, memo, useReducer } from 'react';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getRandomSentence, getRandomSentences, type RandomSentenceResult } from '../services/sentenceService';
import { useAuthService } from '../services/authService';

interface PatternTrainingFlowProps {
  koreanText: string;
  expectedEnglish: string;
  onResult: (userAnswer: string, isCorrect: boolean, confidence: number, responseTime: number) => void;
  onError?: (error: string) => void;
  stage: number;
  disabled?: boolean;
  autoStart?: boolean;
  className?: string;
  mistakeId?: string;
  showCorrectAnswer?: boolean;
}

type FlowPhase = 'idle' | 'tts' | 'beep' | 'recognition' | 'waiting' | 'completed' | 'paused';

// State management using useReducer for better performance
interface FlowState {
  currentPhase: FlowPhase;
  countdownTimer: number;
  recognitionTimer: number;
  speechResult: string;
  micStatus: string;
  showAnswer: boolean;
  isRecording: boolean;
  recognitionAnswerSubmitted: boolean;
  isPaused: boolean;
  remainingRecognitionTime: number;
  remainingWaitTime: number;
  flowStartTime: number;
  recognitionStartTime: number;
}

type FlowAction = 
  | { type: 'SET_PHASE'; payload: FlowPhase }
  | { type: 'SET_COUNTDOWN_TIMER'; payload: number }
  | { type: 'SET_RECOGNITION_TIMER'; payload: number }
  | { type: 'SET_SPEECH_RESULT'; payload: string }
  | { type: 'SET_MIC_STATUS'; payload: string }
  | { type: 'SET_SHOW_ANSWER'; payload: boolean }
  | { type: 'SET_IS_RECORDING'; payload: boolean }
  | { type: 'SET_RECOGNITION_ANSWER_SUBMITTED'; payload: boolean }
  | { type: 'SET_IS_PAUSED'; payload: boolean }
  | { type: 'SET_REMAINING_RECOGNITION_TIME'; payload: number }
  | { type: 'SET_REMAINING_WAIT_TIME'; payload: number }
  | { type: 'SET_FLOW_START_TIME'; payload: number }
  | { type: 'SET_RECOGNITION_START_TIME'; payload: number }
  | { type: 'RESET_STATE' }
  | { type: 'PAUSE_FLOW'; payload: { phase: FlowPhase; recognitionTimer: number } }
  | { type: 'RESUME_FLOW' };

const initialFlowState: FlowState = {
  currentPhase: 'idle',
  countdownTimer: 0,
  recognitionTimer: 0,
  speechResult: '',
  micStatus: '🎤 대기 중',
  showAnswer: false,
  isRecording: false,
  recognitionAnswerSubmitted: false,
  isPaused: false,
  remainingRecognitionTime: 0,
  remainingWaitTime: 0,
  flowStartTime: 0,
  recognitionStartTime: 0
};

const flowReducer = (state: FlowState, action: FlowAction): FlowState => {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    case 'SET_COUNTDOWN_TIMER':
      return { ...state, countdownTimer: action.payload };
    case 'SET_RECOGNITION_TIMER':
      return { ...state, recognitionTimer: action.payload };
    case 'SET_SPEECH_RESULT':
      return { ...state, speechResult: action.payload };
    case 'SET_MIC_STATUS':
      return { ...state, micStatus: action.payload };
    case 'SET_SHOW_ANSWER':
      return { ...state, showAnswer: action.payload };
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.payload };
    case 'SET_RECOGNITION_ANSWER_SUBMITTED':
      return { ...state, recognitionAnswerSubmitted: action.payload };
    case 'SET_IS_PAUSED':
      return { ...state, isPaused: action.payload };
    case 'SET_REMAINING_RECOGNITION_TIME':
      return { ...state, remainingRecognitionTime: action.payload };
    case 'SET_REMAINING_WAIT_TIME':
      return { ...state, remainingWaitTime: action.payload };
    case 'SET_FLOW_START_TIME':
      return { ...state, flowStartTime: action.payload };
    case 'SET_RECOGNITION_START_TIME':
      return { ...state, recognitionStartTime: action.payload };
    case 'RESET_STATE':
      return {
        ...initialFlowState,
        currentPhase: 'idle'
      };
    case 'PAUSE_FLOW':
      return {
        ...state,
        isPaused: true,
        currentPhase: 'paused',
        remainingRecognitionTime: action.payload.phase === 'recognition' 
          ? Math.max(0, 10 - action.payload.recognitionTimer) 
          : state.remainingRecognitionTime,
        remainingWaitTime: action.payload.phase === 'waiting' ? 3 : state.remainingWaitTime
      };
    case 'RESUME_FLOW':
      return {
        ...state,
        isPaused: false
      };
    default:
      return state;
  }
};

/**
 * Debounce utility function to limit the rate of function calls
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
function useDebounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [func, delay]) as T;
}


export const PatternTrainingFlow: React.FC<PatternTrainingFlowProps> = memo(({
  koreanText,
  expectedEnglish,
  onResult,
  onError,
  stage,
  disabled = false,
  autoStart = false,
  className = '',
  mistakeId,
  showCorrectAnswer = true
}) => {
  // Use useReducer for complex state management
  const [flowState, dispatch] = useReducer(flowReducer, initialFlowState);
  
  const {
    currentPhase,
    countdownTimer,
    recognitionTimer,
    speechResult,
    micStatus,
    showAnswer,
    isRecording,
    recognitionAnswerSubmitted,
    isPaused,
    remainingRecognitionTime,
    remainingWaitTime,
    flowStartTime,
    recognitionStartTime
  } = flowState;
  
  // Voice settings with memoization
  const { value: voiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  
  // Memoized voice settings to prevent unnecessary re-renders
  const memoizedVoiceSettings = useMemo(() => voiceSettings, [
    voiceSettings.koreanEnabled,
    voiceSettings.englishEnabled,
    voiceSettings.speed,
    voiceSettings.koreanVoice,
    voiceSettings.englishVoice
  ]);

  // Refs for cleanup
  const recognitionRef = useRef<any>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔧 FIX: Debounce ref for pause/resume buttons
  const pauseDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Exactly match HTML version - 10 second recognition timeout for all stages
  const timeLimit = useMemo(() => {
    return 10000; // HTML version uses 10 seconds for all cases
  }, []);

  // Remove countdown phase to match HTML version exactly
  const getTimeLimit = useCallback(() => timeLimit, [timeLimit]);

  /**
   * Text-to-Speech function with voice settings support and improved error handling
   * @param text - Text to speak
   * @param lang - Language ('ko' or 'en')
   * @returns Promise that resolves when speech is complete
   */
  const speakText = useCallback(async (text: string, lang: 'ko' | 'en' = 'ko'): Promise<void> => {
    return new Promise((resolve) => {
      // Check browser support
      if (!window.speechSynthesis) {
        const error = new Error('음성 합성을 지원하지 않는 브라우저입니다.');
        console.warn(error.message);
        resolve(); // Don't reject, just skip TTS
        return;
      }

      // Check if speech synthesis is available (network dependent)
      if (typeof window.speechSynthesis.speak !== 'function') {
        console.warn('음성 합성 기능을 사용할 수 없습니다.');
        resolve(); // Don't reject, just skip TTS
        return;
      }

      // 🔧 FIX: Check if TTS is already speaking to prevent duplicate sounds
      if (window.speechSynthesis.speaking) {
        console.log(`[DEBUG] 🎙️ TTS 이미 재생 중 - 스킨: "${text}"`);
        resolve(); // Skip if already speaking
        return;
      }

      // Check if voice is enabled for this language using memoized settings
      if (lang === 'ko' && !memoizedVoiceSettings.koreanEnabled) {
        resolve(); // Skip TTS if disabled
        return;
      }
      if (lang === 'en' && !memoizedVoiceSettings.englishEnabled) {
        resolve(); // Skip TTS if disabled
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = memoizedVoiceSettings.speed;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (lang === 'ko') {
        utterance.lang = 'ko-KR';
        if (memoizedVoiceSettings.koreanVoice) {
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(v => v.name === memoizedVoiceSettings.koreanVoice);
          if (selectedVoice) utterance.voice = selectedVoice;
        }
      } else {
        utterance.lang = 'en-US';
        if (memoizedVoiceSettings.englishVoice) {
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(v => v.name === memoizedVoiceSettings.englishVoice);
          if (selectedVoice) utterance.voice = selectedVoice;
        }
      }

      // Set up timeout to prevent TTS from hanging
      const ttsTimeout = setTimeout(() => {
        console.warn(`⏰ [${new Date().toLocaleTimeString()}] TTS 타임아웃 - 강제 종료`);
        try {
          window.speechSynthesis.cancel();
        } catch (error) {
          console.warn('Error cancelling TTS on timeout:', error);
        }
        resolve();
      }, 10000); // 10 second timeout

      utterance.onend = () => {
        clearTimeout(ttsTimeout);
        console.log(`🔊 [${new Date().toLocaleTimeString()}] ${lang.toUpperCase()} TTS 완료`);
        resolve();
      };

      utterance.onerror = (event) => {
        clearTimeout(ttsTimeout);
        console.warn(`⚠️ [${new Date().toLocaleTimeString()}] TTS 오류 (건너뜀):`, event.error);
        resolve(); // 오류가 나도 계속 진행
      };

      try {
        ttsRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        clearTimeout(ttsTimeout);
        console.warn('Error starting TTS:', error);
        resolve(); // Don't reject, just skip TTS
      }
    });
  }, [memoizedVoiceSettings]);

  // Debounced error handler to prevent spam
  const debouncedErrorHandler = useDebounce((error: string) => {
    if (onError) {
      onError(error);
    }
  }, 300);

  /**
   * Force stop all timers and activities with improved error handling
   * Ensures proper cleanup of all resources to prevent memory leaks
   */
  const forceStopAllTimers = useCallback(() => {
    try {
      // Clear countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      // Clear recording timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      
      // Stop speech recognition safely
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping speech recognition:', error);
        }
      }
      
      // Cancel TTS safely
      if (ttsRef.current) {
        try {
          window.speechSynthesis.cancel();
        } catch (error) {
          console.warn('Error canceling TTS:', error);
        }
        ttsRef.current = null;
      }
      
      dispatch({ type: 'SET_IS_RECORDING', payload: false });
    } catch (error) {
      console.error('Error in forceStopAllTimers:', error);
      dispatch({ type: 'SET_IS_RECORDING', payload: false });
    }
  }, [isRecording]);

  /**
   * Start speech recognition exactly like HTML version
   * 10-second timeout, immediate result processing, clean state management
   */
  const startSpeechRecognition = useCallback(() => {
    dispatch({ type: 'SET_PHASE', payload: 'recognition' });
    console.log(`🎤 [${new Date().toLocaleTimeString()}] 음성인식 시작 - 10초 제한시간 (HTML 매칭)`);
    
    forceStopAllTimers();
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const errorMsg = '음성 인식을 지원하지 않는 브라우저입니다.';
      dispatch({ type: 'SET_SPEECH_RESULT', payload: errorMsg });
      debouncedErrorHandler(errorMsg);
      return;
    }

    if (isRecording) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Exactly match HTML version recognition settings
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1; // HTML version uses 1

    recognitionRef.current = recognition;
    dispatch({ type: 'SET_IS_RECORDING', payload: true });
    dispatch({ type: 'SET_MIC_STATUS', payload: '🎤 음성 인식 중...' });
    dispatch({ type: 'SET_SPEECH_RESULT', payload: '음성을 인식하고 있습니다...' });

    let hasReceivedResult = false;

    recognition.onstart = () => {
      console.log(`🎯 [${new Date().toLocaleTimeString()}] 음성인식 실제 시작`);
      dispatch({ type: 'SET_RECOGNITION_TIMER', payload: 0 });
      dispatch({ type: 'SET_RECOGNITION_START_TIME', payload: Date.now() });
      
      // 10초 타임아웃 설정 (HTML 버전과 동일)
      recordingTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedResult && isRecording) {
          console.log(`⏰ [${new Date().toLocaleTimeString()}] 10초 타임아웃 - 강제 중지`);
          recognition.stop();
          handleRecognitionTimeout();
        }
      }, 10000); // Changed to 10 seconds like HTML
    };

    recognition.onresult = (event: any) => {
      if (recognitionAnswerSubmitted || hasReceivedResult) {
        console.log(`🚫 [${new Date().toLocaleTimeString()}] 중복 답변 시도 차단`);
        return;
      }
      
      console.log(`🎯 [${new Date().toLocaleTimeString()}] 음성인식 결과 이벤트:`, event);
      
      if (event.results && event.results.length > 0) {
        hasReceivedResult = true;
        dispatch({ type: 'SET_RECOGNITION_ANSWER_SUBMITTED', payload: true });
        
        const result = event.results[0][0].transcript.trim();
        const confidence = event.results[0][0].confidence || 0.9;
        
        console.log(`🎯 [${new Date().toLocaleTimeString()}] 음성인식 결과: "${result}" (신뢰도: ${confidence})`);
        
        // 즉시 인식 중지
        try {
          recognition.stop();
        } catch (error) {
          console.warn('Recognition stop error:', error);
        }
        stopSpeechRecognition();
        
        // 결과 평가 및 전달 - setTimeout으로 상태 업데이트 후 실행
        setTimeout(() => {
          evaluateAndSubmitAnswer(result, confidence);
        }, 100);
      } else {
        console.warn(`⚠️ [${new Date().toLocaleTimeString()}] 음성인식 결과가 비어있음`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error(`😨 [${new Date().toLocaleTimeString()}] 음성인식 오류:`, event.error);
      stopSpeechRecognition();
      
      // Handle different types of speech recognition errors
      switch (event.error) {
        case 'no-speech':
          handleRecognitionTimeout();
          break;
        case 'audio-capture':
          const audioError = '마이크에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.';
          dispatch({ type: 'SET_SPEECH_RESULT', payload: audioError });
          debouncedErrorHandler(audioError);
          break;
        case 'not-allowed':
          const permissionError = '마이크 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
          dispatch({ type: 'SET_SPEECH_RESULT', payload: permissionError });
          debouncedErrorHandler(permissionError);
          break;
        case 'network':
          const networkError = '네트워크 연결을 확인해주세요. 음성 인식 서비스에 연결할 수 없습니다.';
          dispatch({ type: 'SET_SPEECH_RESULT', payload: networkError });
          debouncedErrorHandler(networkError);
          break;
        case 'aborted':
          // User cancelled or system aborted, don't show error
          console.log('음성 인식이 취소되었습니다.');
          dispatch({ type: 'SET_PHASE', payload: 'idle' });
          break;
        default:
          const errorMsg = `음성 인식 오류: ${event.error}`;
          dispatch({ type: 'SET_SPEECH_RESULT', payload: errorMsg });
          debouncedErrorHandler(errorMsg);
      }
    };

    recognition.onend = () => {
      console.log(`🔊 [${new Date().toLocaleTimeString()}] 음성인식 종료`);
      if (!hasReceivedResult && !recognitionAnswerSubmitted) {
        handleRecognitionTimeout();
      }
    };

    // 타이머 업데이트 (10초로 변경)
    const timerInterval = setInterval(() => {
      dispatch({ type: 'SET_RECOGNITION_TIMER', payload: (recognitionTimer + 0.1) });
      if (recognitionTimer >= 10.0) { // Changed to 10 seconds
        clearInterval(timerInterval);
      }
    }, 100);

    try {
      recognition.start();
    } catch (error) {
      console.error(`😨 [${new Date().toLocaleTimeString()}] 음성인식 시작 실패:`, error);
      stopSpeechRecognition();
      const errorMsg = '음성 인식을 시작할 수 없습니다.';
      dispatch({ type: 'SET_SPEECH_RESULT', payload: errorMsg });
      debouncedErrorHandler(errorMsg);
    }
  }, [isRecording, recognitionAnswerSubmitted, forceStopAllTimers, debouncedErrorHandler]);

  /**
   * Stop speech recognition safely with cleanup
   * Ensures proper cleanup of recognition resources
   */
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setMicStatus('🎤 완료');
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }, [isRecording]);

  /**
   * Handle recognition timeout when no speech is detected
   * Processes timeout as an incorrect answer
   */
  const handleRecognitionTimeout = useCallback(() => {
    console.log(`⏰ [${new Date().toLocaleTimeString()}] 음성인식 타임아웃`);
    setCurrentPhase('waiting');
    setSpeechResult('음성을 인식하지 못했습니다. 다시 시도해주세요.');
    setMicStatus('🎤 실패');
    
    // 타임아웃을 오답으로 처리 - 응답 시간도 추가
    const responseTime = recognitionStartTime ? Date.now() - recognitionStartTime : 10000;
    onResult('', false, 0, responseTime);
  }, [onResult]);

  /**
   * Evaluate user answer and submit result with response time tracking
   * @param userAnswer - The recognized speech result
   * @param confidence - Recognition confidence score
   */
  const evaluateAndSubmitAnswer = useCallback((userAnswer: string, confidence: number) => {
    if (recognitionAnswerSubmitted) {
      console.log(`🚫 [${new Date().toLocaleTimeString()}] 중복 답변 제출 방지`);
      return;
    }
    
    const isCorrect = userAnswer.toLowerCase().trim() === expectedEnglish.toLowerCase().trim();
    const responseTime = recognitionStartTime ? Date.now() - recognitionStartTime : 0;
    
    console.log(`📝 [${new Date().toLocaleTimeString()}] 답변 평가: "${userAnswer}" vs "${expectedEnglish}" = ${isCorrect ? '정답' : '오답'} (응답시간: ${responseTime}ms)`);
    
    setCurrentPhase('completed');
    setSpeechResult(`인식된 답변: "${userAnswer}"`);
    setMicStatus(isCorrect ? '🎤 정답!' : '🎤 오답');
    
    // Show correct answer if enabled and answer was wrong
    if (showCorrectAnswer && !isCorrect) {
      setShowAnswer(true);
      // NEW FEATURE: Always play English TTS of correct answer for wrong answers
      // This integrates smoothly with the existing flow timing
      setTimeout(() => {
        speakText(expectedEnglish, 'en').catch(error => {
          console.warn('English TTS failed for wrong answer:', error);
        });
      }, 1000); // 1 second delay to allow feedback to be shown first
    }
    
    // 결과 전달 (response time 포함)
    console.log(`🚀 [${new Date().toLocaleTimeString()}] PatternTrainingFlow: onResult 호출`, {
      userAnswer,
      isCorrect,
      confidence,
      responseTime
    });
    onResult(userAnswer, isCorrect, confidence, responseTime);
  }, [expectedEnglish, onResult, recognitionStartTime, showCorrectAnswer, memoizedVoiceSettings.englishEnabled, speakText, recognitionAnswerSubmitted]);

  /**
   * Pause the current flow and save state for resumption
   * Stores remaining time based on current phase
   */
  const pauseFlow = useCallback(() => {
    if (isPaused || currentPhase === 'idle' || currentPhase === 'completed') return;
    
    console.log(`⏸️ [${new Date().toLocaleTimeString()}] 일시정지 - 현재 Phase: ${currentPhase}`);
    
    setIsPaused(true);
    
    // Save remaining times based on current phase
    if (currentPhase === 'recognition') {
      setRemainingRecognitionTime(Math.max(0, 10 - recognitionTimer)); // 10 seconds like HTML
    } else if (currentPhase === 'waiting') {
      setRemainingWaitTime(3); // Default wait time
    }
    
    // Force stop all activities
    forceStopAllTimers();
    setCurrentPhase('paused');
  }, [isPaused, currentPhase, countdownTimer, recognitionTimer, forceStopAllTimers]);
  
  /**
   * Resume the paused flow from saved state
   * Continues from the previously paused phase with remaining time
   */
  const resumeFlow = useCallback(() => {
    if (!isPaused) return;
    
    console.log(`▶️ [${new Date().toLocaleTimeString()}] 재개 - 이전 Phase로 복귀`);
    
    setIsPaused(false);
    
    // Resume based on saved state
    if (remainingRecognitionTime > 0) {
      resumeSpeechRecognition();
    } else if (remainingWaitTime > 0) {
      resumeWaiting();
    } else {
      // Default: restart from current question
      startFlow();
    }
  }, [isPaused, remainingRecognitionTime, remainingWaitTime]);
  
  // 🔧 FIX: Debounced pause/resume functions to prevent duplicate calls
  const debouncedPauseFlow = useCallback(() => {
    if (pauseDebounceRef.current) {
      clearTimeout(pauseDebounceRef.current);
    }
    
    pauseDebounceRef.current = setTimeout(() => {
      pauseFlow();
      pauseDebounceRef.current = null;
    }, 300); // 300ms debounce
    
    console.log('[DEBUG] 🔄 일시정지 디바운스 적용');
  }, [pauseFlow]);
  
  const debouncedResumeFlow = useCallback(() => {
    if (pauseDebounceRef.current) {
      clearTimeout(pauseDebounceRef.current);
    }
    
    pauseDebounceRef.current = setTimeout(() => {
      resumeFlow();
      pauseDebounceRef.current = null;
    }, 300); // 300ms debounce
    
    console.log('[DEBUG] ▶️ 재개 디바운스 적용');
  }, [resumeFlow]);
  
  // Resume functions for each phase
  const resumeBeepPhase = useCallback(() => {
    // If we were in beep phase, just restart the beep and recognition sequence
    playBeepAndStartRecognition();
  }, [playBeepAndStartRecognition]);
  
  const resumeSpeechRecognition = useCallback(() => {
    // Anti-cheat: Don't allow resume if answer was already submitted
    if (recognitionAnswerSubmitted) {
      console.log(`🚫 [${new Date().toLocaleTimeString()}] 음성인식 재개 차단 - 이미 제출된 답변`);
      setCurrentPhase('waiting');
      return;
    }
    
    // Start fresh recognition with remaining time
    startSpeechRecognition();
    setRemainingRecognitionTime(0);
  }, [recognitionAnswerSubmitted]);
  
  const resumeWaiting = useCallback(() => {
    setCurrentPhase('waiting');
    setCountdownTimer(remainingWaitTime);
    
    const waitTimeout = setTimeout(() => {
      setCurrentPhase('completed');
    }, remainingWaitTime * 1000);
    
    recordingTimeoutRef.current = waitTimeout;
    setRemainingWaitTime(0);
  }, [remainingWaitTime]);

  /**
   * Start countdown timer before speech recognition begins
   * Provides thinking time based on stage difficulty
   */
  /**
   * Play beep sound exactly like HTML version (800Hz, 0.2s, gain 0.3)
   */
  const playBeepSound = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Exactly match HTML version parameters
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz like HTML
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 0.3 gain like HTML
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2); // 0.2 seconds like HTML
        
        oscillator.onended = () => {
          console.log(`🔔 [${new Date().toLocaleTimeString()}] 비프음 재생 완료 (HTML 매칭)`);
          try {
            audioContext.close();
          } catch (error) {
            console.warn('AudioContext close error:', error);
          }
          resolve();
        };
        
        // Fallback timeout (300ms to account for 0.2s beep + buffer)
        setTimeout(() => {
          console.log(`🔔 [${new Date().toLocaleTimeString()}] 비프음 타임아웃 완료`);
          resolve();
        }, 300);
        
      } catch (error) {
        console.warn('비프음 재생 실패:', error);
        resolve();
      }
    });
  }, []);

  const playBeepAndStartRecognition = useCallback(async () => {
    setCurrentPhase('beep');
    console.log(`🔔 [${new Date().toLocaleTimeString()}] 비프음 재생 후 음성 인식 시작 (HTML 매칭)`);
    
    forceStopAllTimers();
    
    try {
      // Play beep sound (exactly like HTML: 800Hz, 0.2s)
      await playBeepSound();
      
      // Wait exactly 500ms after beep like HTML version
      setTimeout(() => {
        startSpeechRecognition();
      }, 500); // HTML version uses 500ms delay after beep
      
    } catch (error) {
      console.error(`😨 [${new Date().toLocaleTimeString()}] 비프음 재생 실패:`, error);
      // If beep fails, still start recognition after a brief delay
      setTimeout(() => {
        startSpeechRecognition();
      }, 500);
    }
  }, [forceStopAllTimers, startSpeechRecognition, playBeepSound]);

  /**
   * Main flow start function - exactly matches HTML version sequence:
   * 1. Plays Korean TTS
   * 2. Waits 1 second (HTML version timing)
   * 3. Plays beep sound (800Hz, 0.2s)
   * 4. Waits 500ms after beep
   * 5. Begins speech recognition (10s timeout)
   */
  const startFlow = useCallback(async () => {
    if (disabled || !koreanText) return;
    
    console.log(`🚀 [${new Date().toLocaleTimeString()}] Pattern Training Flow 시작 (HTML 매칭 버전)`);
    
    // Reset all states
    setCurrentPhase('tts');
    setRecognitionAnswerSubmitted(false);
    setSpeechResult('');
    setMicStatus('🎤 대기 중');
    setCountdownTimer(0);
    setRecognitionTimer(0);
    setShowAnswer(false);
    setIsPaused(false);
    setFlowStartTime(Date.now());
    
    try {
      // Step 1: Play Korean TTS
      console.log(`🔊 [${new Date().toLocaleTimeString()}] 한국어 TTS 시작: "${koreanText}"`);
      await speakText(koreanText, 'ko');
      
      // Step 2: Wait exactly 1000ms after TTS like HTML version
      setTimeout(() => {
        if (!isPaused) {
          playBeepAndStartRecognition();
        }
      }, 1000); // HTML version uses exactly 1000ms delay
      
    } catch (error) {
      console.error(`😨 [${new Date().toLocaleTimeString()}] Flow 시작 오류:`, error);
      setCurrentPhase('idle');
      const errorMsg = error instanceof Error ? error.message : 'Flow 시작 실패';
      debouncedErrorHandler(errorMsg);
    }
  }, [disabled, koreanText, speakText, playBeepAndStartRecognition, debouncedErrorHandler, isPaused]);

  // Auto-start effect - triggers when Korean text changes or autoStart becomes true
  useEffect(() => {
    console.log(`🚀 [${new Date().toLocaleTimeString()}] Auto-start effect triggered:`, {
      autoStart,
      koreanText: koreanText?.substring(0, 20) + '...',
      currentPhase,
      disabled,
      isPaused
    });
    
    if (autoStart && koreanText && currentPhase === 'idle' && !disabled && !isPaused) {
      const startDelay = setTimeout(() => {
        console.log(`🎯 [${new Date().toLocaleTimeString()}] Starting flow after 500ms delay`);
        startFlow();
      }, 500);
      
      return () => clearTimeout(startDelay);
    }
  }, [koreanText, autoStart, currentPhase, disabled, startFlow, isPaused]);

  // Reset to idle when Korean text changes (new question) 
  useEffect(() => {
    if (koreanText && currentPhase !== 'idle') {
      console.log(`🔄 [${new Date().toLocaleTimeString()}] New question detected, resetting to idle`);
      forceStopAllTimers();
      setCurrentPhase('idle');
      setRecognitionAnswerSubmitted(false);
      setSpeechResult('');
      setMicStatus('🎤 대기 중');
      setShowAnswer(false);
      setIsPaused(false);
      setCountdownTimer(0);
      setRecognitionTimer(0);
      
      // Clear remaining times
      setRemainingRecognitionTime(0);
      setRemainingWaitTime(0);
    }
  }, [koreanText, forceStopAllTimers]);

  /**
   * Cleanup effect on unmount with comprehensive resource cleanup
   * Prevents memory leaks and hanging processes
   */
  useEffect(() => {
    return () => {
      try {
        // Force stop all timers and activities
        forceStopAllTimers();
        
        // Reset states
        setIsPaused(false);
        setCurrentPhase('idle');
        setIsRecording(false);
        
        // Additional cleanup for refs
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (error) {
            console.warn('Error aborting recognition on unmount:', error);
          }
          recognitionRef.current = null;
        }
        
        // Cancel any pending TTS
        try {
          window.speechSynthesis.cancel();
        } catch (error) {
          console.warn('Error cancelling TTS on unmount:', error);
        }
        
        // 🔧 FIX: Clear debounce timers
        if (pauseDebounceRef.current) {
          clearTimeout(pauseDebounceRef.current);
          pauseDebounceRef.current = null;
        }
        
        console.log('PatternTrainingFlow cleanup completed');
      } catch (error) {
        console.error('Error during PatternTrainingFlow cleanup:', error);
      }
    };
  }, [forceStopAllTimers]);

  return (
    <ErrorBoundary 
      level="component" 
      onError={(error, errorInfo) => {
        console.error('[DEBUG] PatternTrainingFlow 에러:', error, errorInfo);
        onError?.(error.message);
      }}
    >
      <div 
        className={`text-center transition-all duration-300 ${className}`}
        role="main"
        aria-label="Pattern Training Interface"
      >
      {/* Korean text display */}
      <div className="mb-8">
        <div 
          className="text-3xl font-bold text-gray-800 mb-4 min-h-[60px] flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md"
          role="heading"
          aria-level={1}
          aria-live="polite"
        >
          {koreanText || '문제를 기다리는 중...'}
        </div>
        
        {/* Show correct answer when enabled */}
        {showAnswer && showCorrectAnswer && (
          <div 
            className="text-2xl font-semibold text-green-600 mb-4 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in-scale"
            role="alert"
            aria-label={`정답은 ${expectedEnglish}입니다`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>정답: {expectedEnglish}</span>
            </div>
          </div>
        )}
      </div>

      {/* Flow status display */}
      {currentPhase !== 'idle' && (
        <div 
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-sm backdrop-blur-sm transition-all duration-500"
          role="status"
          aria-live="polite"
          aria-label="Training flow status"
        >
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-800 mb-4">
              {currentPhase === 'tts' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <span>문제를 들려드리고 있습니다...</span>
                </div>
              )}
              {currentPhase === 'beep' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>🔔 곧 음성 인식이 시작됩니다...</span>
                </div>
              )}
              {currentPhase === 'recognition' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <span>말씀해 주세요... ({recognitionTimer.toFixed(1)}초 / 10초)</span>
                </div>
              )}
              {currentPhase === 'waiting' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                  <span>대기 중...</span>
                </div>
              )}
              {currentPhase === 'completed' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>완료!</span>
                </div>
              )}
              {currentPhase === 'paused' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span>일시정지됨</span>
                </div>
              )}
            </div>
            
            {/* Progress bar for recognition */}
            {currentPhase === 'recognition' && (
              <>
                <div 
                  className="w-full bg-blue-200 rounded-full h-3 mb-4 shadow-inner"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={recognitionTimer}
                  aria-label="음성 인식 시간 진행률"
                >
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-100 shadow-sm"
                    style={{ width: `${Math.min((recognitionTimer / 10) * 100, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">{micStatus}</span>
                </div>
              </>
            )}
            
            {/* TTS indicator */}
            {currentPhase === 'tts' && (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">한국어 문제를 재생 중...</span>
              </div>
            )}
            
            {/* Beep indicator */}
            {currentPhase === 'beep' && (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">신호음 후 말씀해 주세요</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Speech result display */}
      {speechResult && (
        <div 
          className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg shadow-sm animate-fade-in"
          role="status"
          aria-live="polite"
          aria-label="음성 인식 결과"
        >
          <div className="text-sm text-gray-600 mb-1">음성 인식 결과:</div>
          <div className="font-medium text-gray-800 break-words">"{speechResult}"</div>
        </div>
      )}

      {/* Control buttons */}
      <div className="space-y-4">
        {/* Manual start button */}
        {currentPhase === 'idle' && !autoStart && (
          <button
            onClick={startFlow}
            disabled={disabled || !koreanText}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            aria-label="패턴 훈련 시작하기"
          >
            <span className="flex items-center space-x-2">
              <span>🎤</span>
              <span>시작하기</span>
            </span>
          </button>
        )}
        
        {/* Pause/Resume button - Only show if not in auto-start mode (StudyPage manages training state) */}
        {!autoStart && (currentPhase === 'tts' || currentPhase === 'beep' || currentPhase === 'recognition' || currentPhase === 'waiting') && (
          <button
            onClick={isPaused ? debouncedResumeFlow : debouncedPauseFlow}
            className={`px-6 py-3 font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
              isPaused 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700'
            }`}
            aria-label={isPaused ? '훈련 재개하기' : '훈련 일시정지'}
          >
            {isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
          </button>
        )}
        
        {/* Paused state message */}
        {currentPhase === 'paused' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-yellow-800 font-medium mb-2">⏸️ 일시정지됨</div>
            <div className="text-sm text-yellow-600 mb-3">
              {remainingRecognitionTime > 0 && `음성인식 ${remainingRecognitionTime.toFixed(1)}초 남음`}
              {remainingWaitTime > 0 && `대기시간 ${remainingWaitTime}초 남음`}
            </div>
            <button
              onClick={debouncedResumeFlow}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="훈련 재개하기"
            >
              ▶️ 재개하기
            </button>
          </div>
        )}
        
        {/* Emergency stop button - Only show if not in auto-start mode */}
        {!autoStart && (currentPhase === 'tts' || currentPhase === 'beep' || currentPhase === 'recognition' || currentPhase === 'waiting') && (
          <button
            onClick={() => {
              forceStopAllTimers();
              setCurrentPhase('idle');
              setIsPaused(false);
              if (onError) {
                onError('사용자가 플로우를 중지했습니다.');
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            aria-label="훈련 중지하기"
          >
            ⏹️ 중지
          </button>
        )}
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>Phase: {currentPhase} | Paused: {isPaused ? 'Yes' : 'No'}</div>
          <div>Stage: {stage} | Time Limit: {getTimeLimit()}ms</div>
          <div>Recording: {isRecording ? 'Yes' : 'No'} | Submitted: {recognitionAnswerSubmitted ? 'Yes' : 'No'}</div>
          <div>Voice: KO={memoizedVoiceSettings.koreanEnabled ? 'On' : 'Off'} | EN={memoizedVoiceSettings.englishEnabled ? 'On' : 'Off'} | Speed={memoizedVoiceSettings.speed}x</div>
          {mistakeId && <div>Review Mode: {mistakeId}</div>}
          <div>Flow Duration: {flowStartTime ? Math.round((Date.now() - flowStartTime) / 1000) : 0}s</div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
});

PatternTrainingFlow.displayName = 'PatternTrainingFlow';

// Add custom CSS animations
const styles = `
  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in-scale {
    animation: fade-in-scale 0.3s ease-out;
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('pattern-training-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'pattern-training-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}