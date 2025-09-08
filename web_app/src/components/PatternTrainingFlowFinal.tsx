import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import { getCountdownDuration, type SpeakingStage } from '@/utils/speakingStageUtils';

// 🔒 모듈 스코프 가드: StrictMode 재마운트까지 차단
const __autoStartGuards = new Set<string>();
const makeKey = (stage: number, ko: string, en: string) =>
  `${stage}::${ko}::${en}`;

interface PatternTrainingFlowFinalProps {
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

type FlowPhase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'completed';

export const PatternTrainingFlowFinal: React.FC<PatternTrainingFlowFinalProps> = ({
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
  // Single state object to prevent re-render issues
  const [flowState, setFlowState] = useState({
    phase: 'idle' as FlowPhase,
    countdownTimer: 0,
    recognitionTimer: 0,
    speechResult: '',
    showAnswer: false,
    isRecording: false,
    ttsInitialized: false,
    recognitionStartTime: 0,
    hasStarted: false // Prevent duplicate starts
  });
  
  // Voice settings
  const { value: voiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  
  // Auto-start 키 생성
  const autoStartKey = makeKey(stage, koreanText || '', expectedEnglish || '');
  
  // Single ref for all cleanup
  const flowRef = useRef({
    recognition: null as any,
    countdownInterval: null as NodeJS.Timeout | null,
    recordingTimeout: null as NodeJS.Timeout | null,
    timerInterval: null as NodeJS.Timeout | null,
    hasReceivedResult: false,
    isCleaningUp: false
  });

  // Get stage-based timing using utility function
  const getCountdownTime = () => {
    // 정규 단계는 유틸리티 함수 사용, 기타는 기본값 2초
    if (stage >= 1 && stage <= 3) {
      return getCountdownDuration(stage as SpeakingStage);
    }
    return 2; // 기본값: 2초
  };

  // Force cleanup all timers and recognition
  const forceCleanup = useCallback(() => {
    if (flowRef.current.isCleaningUp) return;
    flowRef.current.isCleaningUp = true;
    
    try {
      // Clear all intervals and timeouts
      if (flowRef.current.countdownInterval) {
        clearInterval(flowRef.current.countdownInterval);
        flowRef.current.countdownInterval = null;
      }
      if (flowRef.current.recordingTimeout) {
        clearTimeout(flowRef.current.recordingTimeout);
        flowRef.current.recordingTimeout = null;
      }
      if (flowRef.current.timerInterval) {
        clearInterval(flowRef.current.timerInterval);
        flowRef.current.timerInterval = null;
      }
      
      // Stop speech recognition
      if (flowRef.current.recognition && flowState.isRecording) {
        flowRef.current.recognition.stop();
      }
      
      // Cancel TTS
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      setFlowState(prev => ({ ...prev, isRecording: false }));
    } catch (error) {
      console.warn('Cleanup error:', error);
    } finally {
      flowRef.current.isCleaningUp = false;
    }
  }, [flowState.isRecording]);

  // TTS function
  const speakText = useCallback(async (text: string, lang: 'ko' | 'en' = 'ko'): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      // Check voice settings
      if (lang === 'ko' && !voiceSettings.koreanEnabled) {
        resolve();
        return;
      }
      if (lang === 'en' && !voiceSettings.englishEnabled) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speed;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = lang === 'ko' ? 'ko-KR' : 'en-US';

      const timeout = setTimeout(() => {
        window.speechSynthesis.cancel();
        resolve();
      }, 8000);

      utterance.onend = () => {
        clearTimeout(timeout);
        resolve();
      };

      utterance.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [voiceSettings]);

  // Play beep sound
  const playBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (error) {
      console.warn('Beep error:', error);
    }
  }, []);

  // Start speech recognition
  const startSpeechRecognition = useCallback(() => {
    if (flowState.isRecording || flowRef.current.hasReceivedResult) {
      console.log('음성인식 중복 실행 방지');
      return;
    }

    console.log('🎤 음성인식 시작');
    setFlowState(prev => ({ ...prev, phase: 'recognition', isRecording: true, recognitionStartTime: Date.now() }));

    if (!('webkitSpeechRecognition' in window)) {
      onError?.('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    flowRef.current.recognition = recognition;
    flowRef.current.hasReceivedResult = false;

    // Timer for recognition progress
    flowRef.current.timerInterval = setInterval(() => {
      setFlowState(prev => ({ ...prev, recognitionTimer: prev.recognitionTimer + 0.1 }));
    }, 100);

    // 6-second timeout
    flowRef.current.recordingTimeout = setTimeout(() => {
      if (!flowRef.current.hasReceivedResult) {
        console.log('6초 타임아웃');
        flowRef.current.hasReceivedResult = true;
        recognition.stop();
        handleTimeout();
      }
    }, 6000);

    recognition.onresult = (event: any) => {
      if (flowRef.current.hasReceivedResult) return;
      flowRef.current.hasReceivedResult = true;
      
      const result = event.results[0][0].transcript.trim();
      const confidence = event.results[0][0].confidence || 0.9;
      
      console.log(`음성인식 결과: "${result}"`);
      recognition.stop();
      handleResult(result, confidence);
    };

    recognition.onerror = (event: any) => {
      if (flowRef.current.hasReceivedResult) return;
      console.error('음성인식 오류:', event.error);
      
      if (event.error === 'no-speech' || event.error === 'aborted') {
        flowRef.current.hasReceivedResult = true;
        handleTimeout();
      }
    };

    recognition.onend = () => {
      if (!flowRef.current.hasReceivedResult) {
        flowRef.current.hasReceivedResult = true;
        handleTimeout();
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('음성인식 시작 실패:', error);
      handleTimeout();
    }
  }, [flowState.isRecording, onError]);

  // Handle recognition result
  const handleResult = useCallback((userAnswer: string, confidence: number) => {
    forceCleanup();
    
    const isCorrect = userAnswer.toLowerCase().trim() === expectedEnglish.toLowerCase().trim();
    const responseTime = flowState.recognitionStartTime ? Date.now() - flowState.recognitionStartTime : 0;
    
    setFlowState(prev => ({
      ...prev,
      phase: 'completed',
      speechResult: `인식된 답변: "${userAnswer}"`,
      showAnswer: !isCorrect && showCorrectAnswer,
      isRecording: false
    }));

    // Speak correct answer if wrong
    if (!isCorrect && showCorrectAnswer) {
      setTimeout(() => {
        speakText(expectedEnglish, 'en');
      }, 500);
    }

    onResult(userAnswer, isCorrect, confidence, responseTime);
  }, [expectedEnglish, flowState.recognitionStartTime, showCorrectAnswer, speakText, onResult, forceCleanup]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    forceCleanup();
    
    setFlowState(prev => ({
      ...prev,
      phase: 'completed',
      speechResult: '음성을 인식하지 못했습니다.',
      isRecording: false
    }));

    onResult('', false, 0, 0);
  }, [onResult, forceCleanup]);

  // Main flow
  const startFlow = useCallback(async () => {
    if (flowState.hasStarted || disabled || !koreanText) return;
    
    console.log('🚀 Flow 시작:', koreanText);
    setFlowState(prev => ({ 
      ...prev, 
      hasStarted: true,
      phase: 'tts',
      speechResult: '',
      showAnswer: false,
      countdownTimer: 0,
      recognitionTimer: 0
    }));

    try {
      // Step 1: Korean TTS
      await speakText(koreanText, 'ko');
      
      // Step 2: Countdown
      setFlowState(prev => ({ ...prev, phase: 'countdown' }));
      const countdownTime = getCountdownTime();
      setFlowState(prev => ({ ...prev, countdownTimer: countdownTime }));
      
      flowRef.current.countdownInterval = setInterval(() => {
        setFlowState(prev => {
          const remaining = prev.countdownTimer - 1;
          if (remaining <= 0) {
            if (flowRef.current.countdownInterval) {
              clearInterval(flowRef.current.countdownInterval);
              flowRef.current.countdownInterval = null;
            }
            // Play beep and start recognition
            playBeep();
            setTimeout(() => startSpeechRecognition(), 200);
          }
          return { ...prev, countdownTimer: Math.max(0, remaining) };
        });
      }, 1000);
      
    } catch (error) {
      console.error('Flow 오류:', error);
      onError?.(error instanceof Error ? error.message : 'Flow 실행 실패');
    }
  }, [flowState.hasStarted, disabled, koreanText, speakText, getCountdownTime, playBeep, startSpeechRecognition, onError]);

  // Auto-start effect (StrictMode 완전 차단)
  useEffect(() => {
    if (!autoStart || !koreanText || disabled) return;
    if (__autoStartGuards.has(autoStartKey)) return;
    __autoStartGuards.add(autoStartKey);

    const t = setTimeout(() => { startFlow(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartKey, autoStart, koreanText, disabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  return (
    <div className={`text-center ${className}`}>
      {/* Korean text display */}
      <div className="mb-8">
        <div className="text-3xl font-bold text-gray-800 mb-4 min-h-[60px] flex items-center justify-center">
          {koreanText || '문제를 기다리는 중...'}
        </div>
        
        {/* Show correct answer when wrong */}
        {flowState.showAnswer && (
          <div className="text-2xl font-semibold text-green-600 mb-4 animate-pulse">
            정답: {expectedEnglish}
          </div>
        )}
      </div>

      {/* Status display */}
      {flowState.phase !== 'idle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="text-lg font-semibold text-blue-800 mb-4">
            {flowState.phase === 'tts' && '🔊 문제를 들려드리고 있습니다...'}
            {flowState.phase === 'countdown' && `⏳ ${flowState.countdownTimer}초 후 음성 인식 시작...`}
            {flowState.phase === 'recognition' && `🎤 말씀해 주세요... (${flowState.recognitionTimer.toFixed(1)}초 / 6초)`}
            {flowState.phase === 'completed' && '✅ 완료!'}
          </div>
          
          {/* Progress bar */}
          {flowState.phase === 'recognition' && (
            <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min((flowState.recognitionTimer / 6) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Speech result */}
      {flowState.speechResult && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">음성 인식 결과:</div>
          <div className="font-medium text-gray-800">"{flowState.speechResult}"</div>
        </div>
      )}

      {/* Manual start button */}
      {flowState.phase === 'idle' && !autoStart && (
        <button
          onClick={startFlow}
          disabled={disabled || !koreanText}
          className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-lg"
        >
          🎤 시작하기
        </button>
      )}
    </div>
  );
};