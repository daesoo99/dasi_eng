import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import { getCountdownDuration, type SpeakingStage } from '@/utils/speakingStageUtils';

interface PatternTrainingFlowSimpleProps {
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

export const PatternTrainingFlowSimple: React.FC<PatternTrainingFlowSimpleProps> = ({
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
  // State management
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('idle');
  const [countdownTimer, setCountdownTimer] = useState<number>(0);
  const [recognitionTimer, setRecognitionTimer] = useState<number>(0);
  const [speechResult, setSpeechResult] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [ttsInitialized, setTtsInitialized] = useState<boolean>(false);
  
  // Timing
  const [recognitionStartTime, setRecognitionStartTime] = useState<number>(0);
  
  // Voice settings
  const { value: voiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  
  // Refs for cleanup
  const recognitionRef = useRef<any>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get stage-based timing using utility function
  const getCountdownTime = () => {
    // ALL mode나 기타 단계는 2초, 정규 단계는 유틸리티 함수 사용
    if (stage >= 1 && stage <= 3) {
      return getCountdownDuration(stage as SpeakingStage);
    }
    return 2; // ALL mode: 2초
  };

  /**
   * 🔧 플러그인을 통한 TTS 초기화
   */
  const initializeTTS = useCallback(async () => {
    if (ttsInitialized) {
      return Promise.resolve();
    }

    try {
      console.log('🔧 플러그인 TTS 초기화 시작...');

      // ServiceContainer를 통해 speechService 사용
      const ServiceContainer = (await import('@/container/ServiceContainer')).default;
      const container = ServiceContainer.getInstanceSync();
      container.getSpeechProcessingService(); // 초기화만 수행

      // 플러그인을 통한 초기화 (실제 음성 없이 준비만)
      console.log('🔧 플러그인 TTS 초기화 완료');
      setTtsInitialized(true);
      return Promise.resolve();
    } catch (error) {
      console.warn('🔧 플러그인 TTS 초기화 오류:', error);
      setTtsInitialized(true);
      return Promise.resolve();
    }
  }, [ttsInitialized]);

  /**
   * 🔧 플러그인 시스템을 통한 Text-to-Speech 함수
   */
  const speakText = useCallback(async (text: string, lang: 'ko' | 'en' = 'ko'): Promise<void> => {
    try {
      // Initialize TTS if not already done
      if (!ttsInitialized) {
        await initializeTTS();
      }

      // Check if voice is enabled for this language
      if (lang === 'ko' && !voiceSettings.koreanEnabled) {
        return;
      }
      if (lang === 'en' && !voiceSettings.englishEnabled) {
        return;
      }

      // ServiceContainer를 통해 speechService 사용
      const ServiceContainer = (await import('@/container/ServiceContainer')).default;
      const container = ServiceContainer.getInstanceSync();
      const speechService = container.getSpeechProcessingService();

      // 기존 TTS 중지
      speechService.stopAllSpeech();

      // 플러그인을 통해 TTS 실행
      await speechService.speakAnswer(text, {
        language: lang === 'ko' ? 'ko-KR' : 'en-US',
        rate: voiceSettings.speed,
        volume: 1.0,
        pitch: 1.0
      });

      console.log(`🔧 ${lang.toUpperCase()} TTS 완료 (플러그인)`);

    } catch (error) {
      console.error(`🔧 [PatternTrainingFlowSimple] Speech service error:`, error);

      // 🔧 플러그인 fallback: AdvancedSpeechPlugin 시도
      try {
        const ServiceContainer = (await import('@/container/ServiceContainer')).default;
        const container = ServiceContainer.getInstanceSync();
        const advancedPlugin = container.getAdvancedSpeechPlugin();

        if (advancedPlugin) {
          // 기존 TTS 중지
          advancedPlugin.stopAll();

          await advancedPlugin.speakText(text, {
            language: lang === 'ko' ? 'ko-KR' : 'en-US',
            rate: voiceSettings.speed,
            volume: 1.0,
            pitch: 1.0
          });

          console.log(`🔧 ${lang.toUpperCase()} TTS 완료 (고급 플러그인)`);
        } else {
          console.warn(`🔧 [PatternTrainingFlowSimple] No speech plugins available`);
        }
      } catch (pluginError) {
        console.error(`🔧 [PatternTrainingFlowSimple] All speech plugins failed:`, pluginError);
      }
    }
  }, [voiceSettings, ttsInitialized, initializeTTS]);

  /**
   * Force stop all timers and activities
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

      // Clear timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Stop speech recognition safely
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping speech recognition:', error);
        }
      }
      
      // 🔧 플러그인을 통한 TTS 중지 (동기적으로 처리)
      try {
        import('@/container/ServiceContainer').then((module) => {
          const container = module.default.getInstanceSync();
          const speechService = container.getSpeechProcessingService();
          speechService.stopAllSpeech();
        }).catch((error) => {
          console.warn('🔧 Error stopping TTS (plugin):', error);
        });
      } catch (error) {
        console.warn('🔧 Error importing ServiceContainer:', error);
      }
      
      setIsRecording(false);
    } catch (error) {
      console.error('Error in forceStopAllTimers:', error);
      setIsRecording(false);
    }
  }, [isRecording]);

  /**
   * Start speech recognition
   */
  const startSpeechRecognition = useCallback(() => {
    if (currentPhase === 'recognition' || isRecording) {
      console.log('음성인식이 이미 진행 중 - 중복 실행 방지');
      return;
    }
    
    setCurrentPhase('recognition');
    console.log('음성인식 시작 - 6초 제한시간');
    
    forceStopAllTimers();
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const errorMsg = '음성 인식을 지원하지 않는 브라우저입니다.';
      setSpeechResult(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;
    setIsRecording(true);
    setSpeechResult('음성을 인식하고 있습니다...');

    let hasReceivedResult = false;
    let recognitionStopped = false;

    recognition.onstart = () => {
      if (recognitionStopped) return;
      console.log('음성인식 실제 시작');
      setRecognitionTimer(0);
      setRecognitionStartTime(Date.now());
      
      // Start timer
      const interval = setInterval(() => {
        setRecognitionTimer(prev => prev + 0.1);
      }, 100);
      timerIntervalRef.current = interval;
      
      // 6초 타임아웃 설정
      recordingTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedResult && !recognitionStopped) {
          console.log('6초 타임아웃 - 강제 중지');
          recognitionStopped = true;
          recognition.stop();
          handleRecognitionTimeout();
        }
      }, 6000);
    };

    recognition.onresult = (event: any) => {
      if (hasReceivedResult || recognitionStopped) {
        console.log('중복 답변 시도 차단');
        return;
      }
      
      hasReceivedResult = true;
      recognitionStopped = true;
      
      const result = event.results[0][0].transcript.trim();
      const confidence = event.results[0][0].confidence || 0.9;
      
      console.log(`음성인식 결과: "${result}" (신뢰도: ${confidence})`);
      
      // 즉시 인식 중지
      recognition.stop();
      stopSpeechRecognition();
      
      // 결과 평가 및 전달
      evaluateAndSubmitAnswer(result, confidence);
    };

    recognition.onerror = (event: any) => {
      console.error('음성인식 오류:', event.error);
      stopSpeechRecognition();
      
      switch (event.error) {
        case 'no-speech':
          handleRecognitionTimeout();
          break;
        case 'audio-capture':
          const audioError = '마이크에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.';
          setSpeechResult(audioError);
          onError?.(audioError);
          break;
        case 'not-allowed':
          const permissionError = '마이크 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.';
          setSpeechResult(permissionError);
          onError?.(permissionError);
          break;
        case 'network':
          const networkError = '네트워크 연결을 확인해주세요.';
          setSpeechResult(networkError);
          onError?.(networkError);
          break;
        case 'aborted':
          console.log('음성 인식이 취소되었습니다.');
          setCurrentPhase('idle');
          break;
        default:
          const errorMsg = `음성 인식 오류: ${event.error}`;
          setSpeechResult(errorMsg);
          onError?.(errorMsg);
      }
    };

    recognition.onend = () => {
      console.log('음성인식 종료');
      if (!hasReceivedResult && !recognitionStopped) {
        recognitionStopped = true;
        handleRecognitionTimeout();
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('음성인식 시작 실패:', error);
      stopSpeechRecognition();
      const errorMsg = '음성 인식을 시작할 수 없습니다.';
      setSpeechResult(errorMsg);
      onError?.(errorMsg);
    }
  }, [isRecording, forceStopAllTimers, onError]);

  /**
   * Stop speech recognition safely
   */
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [isRecording]);

  /**
   * Handle recognition timeout
   */
  const handleRecognitionTimeout = useCallback(() => {
    console.log('음성인식 타임아웃');
    setCurrentPhase('completed');
    setSpeechResult('음성을 인식하지 못했습니다.');
    
    // 타임아웃을 오답으로 처리
    onResult('', false, 0, 0);
  }, [onResult]);

  /**
   * Evaluate user answer and submit result
   */
  const evaluateAndSubmitAnswer = useCallback((userAnswer: string, confidence: number) => {
    const isCorrect = userAnswer.toLowerCase().trim() === expectedEnglish.toLowerCase().trim();
    const responseTime = recognitionStartTime ? Date.now() - recognitionStartTime : 0;
    
    console.log(`답변 평가: "${userAnswer}" vs "${expectedEnglish}" = ${isCorrect ? '정답' : '오답'}`);
    
    setCurrentPhase('completed');
    setSpeechResult(`인식된 답변: "${userAnswer}"`);
    
    // Show correct answer if enabled and answer was wrong
    if (showCorrectAnswer && !isCorrect) {
      setShowAnswer(true);
      // Always speak the correct answer in English when wrong (new enhancement)
      console.log(`틀린 답변 - 정답 TTS 재생: "${expectedEnglish}"`);
      setTimeout(() => {
        speakText(expectedEnglish, 'en').catch(error => {
          console.warn('영어 TTS 실패:', error);
        });
      }, 500); // Shorter delay for better user experience
    }
    
    // 결과 전달
    onResult(userAnswer, isCorrect, confidence, responseTime);
  }, [expectedEnglish, onResult, recognitionStartTime, showCorrectAnswer, voiceSettings.englishEnabled, speakText]);

  /**
   * Play beep sound before speech recognition (matching original HTML)
   */
  const playMicrophoneStartSound = useCallback(() => {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
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
    }
  }, []);

  /**
   * Start countdown before speech recognition (matching original HTML flow)
   */
  const startCountdownBeforeSpeechRecognition = useCallback(() => {
    setCurrentPhase('countdown');
    const waitTime = getCountdownTime();
    
    console.log(`사고시간 카운트다운 시작 - ${waitTime}초 대기`);
    
    forceStopAllTimers();
    
    setCountdownTimer(waitTime);
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdownTimer(prev => {
        const remaining = prev - 1;
        console.log(`사고시간 남음: ${remaining}초`);
        
        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          // Play beep sound before speech recognition (like original HTML)
          console.log('🔔 사고시간 종료 - 마이크 시작음 재생');
          playMicrophoneStartSound();
          
          // Start speech recognition immediately after beep
          setTimeout(() => {
            console.log('🎤 음성인식 함수 호출 시작');
            startSpeechRecognition();
          }, 100); // Small delay to ensure beep plays
        }
        return remaining;
      });
    }, 1000);
  }, [getCountdownTime, forceStopAllTimers, startSpeechRecognition, playMicrophoneStartSound]);

  /**
   * Main flow start function with proper TTS initialization
   */
  const startFlow = useCallback(async () => {
    if (disabled || !koreanText) return;
    
    console.log('Pattern Training Flow 시작');
    
    // Reset all states
    setCurrentPhase('tts');
    setSpeechResult('');
    setCountdownTimer(0);
    setRecognitionTimer(0);
    setShowAnswer(false);
    
    try {
      // Initialize TTS first (handles browser autoplay policy)
      if (!ttsInitialized) {
        console.log('TTS 초기화 중...');
        await initializeTTS();
      }
      
      // Step 1: Play Korean TTS
      console.log(`한국어 TTS 시작: "${koreanText}"`);
      await speakText(koreanText, 'ko');
      
      // Step 2: Start countdown immediately after TTS (no additional delay)
      startCountdownBeforeSpeechRecognition();
      
    } catch (error) {
      console.error('Flow 시작 오류:', error);
      setCurrentPhase('idle');
      const errorMsg = error instanceof Error ? error.message : 'Flow 시작 실패';
      onError?.(errorMsg);
    }
  }, [disabled, koreanText, speakText, startCountdownBeforeSpeechRecognition, onError, ttsInitialized, initializeTTS]);

  // Auto-start effect (prevent duplicate execution)
  useEffect(() => {
    if (autoStart && koreanText && currentPhase === 'idle' && !disabled) {
      console.log('Auto-start triggered for:', koreanText);
      startFlow();
    }
  }, [koreanText]); // Only depend on koreanText to prevent re-execution

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      try {
        forceStopAllTimers();
        setCurrentPhase('idle');
        setIsRecording(false);
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (error) {
            console.warn('Error aborting recognition on unmount:', error);
          }
          recognitionRef.current = null;
        }
        
        try {
          // 🔧 플러그인을 통한 TTS 중지 (동기적으로 처리)
          import('@/container/ServiceContainer').then((module) => {
            const container = module.default.getInstanceSync();
            const speechService = container.getSpeechProcessingService();
            speechService.stopAllSpeech();
          }).catch((error) => {
            console.warn('🔧 Error stopping TTS on unmount (plugin):', error);
          });
        } catch (error) {
          console.warn('🔧 Error importing ServiceContainer on unmount:', error);
        }
        
        console.log('PatternTrainingFlowSimple cleanup completed');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [forceStopAllTimers]);

  return (
    <div className={`text-center ${className}`}>
      {/* Korean text display */}
      <div className="mb-8">
        <div className="text-3xl font-bold text-gray-800 mb-4 min-h-[60px] flex items-center justify-center">
          {koreanText || '문제를 기다리는 중...'}
        </div>
        
        {/* Show correct answer when enabled */}
        {showAnswer && showCorrectAnswer && (
          <div className="text-2xl font-semibold text-green-600 mb-4 animate-pulse">
            정답: {expectedEnglish}
          </div>
        )}
      </div>

      {/* Flow status display */}
      {currentPhase !== 'idle' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-800 mb-4">
              {currentPhase === 'tts' && '🔊 문제를 들려드리고 있습니다...'}
              {currentPhase === 'countdown' && `⏳ ${countdownTimer}초 후 음성 인식 시작...`}
              {currentPhase === 'recognition' && `🎤 말씀해 주세요... (${recognitionTimer.toFixed(1)}초 / 6초)`}
              {currentPhase === 'completed' && '✅ 완료!'}
            </div>
            
            {/* Progress bar for recognition */}
            {currentPhase === 'recognition' && (
              <>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min((recognitionTimer / 6) * 100, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">음성을 인식하고 있습니다...</span>
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
            
            {/* Countdown indicator */}
            {currentPhase === 'countdown' && (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">생각할 시간을 드리고 있습니다</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Speech result display */}
      {speechResult && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">음성 인식 결과:</div>
          <div className="font-medium text-gray-800">"{speechResult}"</div>
        </div>
      )}

      {/* Control buttons */}
      <div className="space-y-4">
        {/* Manual start button */}
        {currentPhase === 'idle' && !autoStart && (
          <button
            onClick={async () => {
              // Initialize TTS on user interaction to comply with autoplay policy
              if (!ttsInitialized) {
                await initializeTTS();
              }
              startFlow();
            }}
            disabled={disabled || !koreanText}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            🎤 시작하기
          </button>
        )}
        
        {/* Emergency stop button */}
        {(currentPhase === 'tts' || currentPhase === 'countdown' || currentPhase === 'recognition') && (
          <button
            onClick={() => {
              forceStopAllTimers();
              setCurrentPhase('idle');
              onError?.('사용자가 플로우를 중지했습니다.');
            }}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            ⏹️ 중지
          </button>
        )}
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>Phase: {currentPhase}</div>
          <div>Stage: {stage} | Countdown: {getCountdownTime()}s</div>
          <div>Recording: {isRecording ? 'Yes' : 'No'}</div>
          <div>TTS Initialized: {ttsInitialized ? 'Yes' : 'No'}</div>
          <div>Voice: KO={voiceSettings.koreanEnabled ? 'On' : 'Off'} | EN={voiceSettings.englishEnabled ? 'On' : 'Off'} | Speed={voiceSettings.speed}x</div>
          {mistakeId && <div>Review Mode: {mistakeId}</div>}
        </div>
      )}
    </div>
  );
};