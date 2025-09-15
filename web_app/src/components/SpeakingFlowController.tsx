import React, { useState, useEffect, useRef } from 'react';
import type { DrillCard } from '@/types';

interface SpeakingFlowControllerProps {
  card: DrillCard;
  stage: 1 | 2 | 3;
  onResult: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  autoStart?: boolean;
}

type FlowPhase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting' | 'completed';

export const SpeakingFlowController: React.FC<SpeakingFlowControllerProps> = ({
  card,
  stage,
  onResult,
  onError,
  disabled = false,
  autoStart = false,
}) => {
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('idle');
  const [countdown, setCountdown] = useState<number>(0);
  const [speechTimer, setSpeechTimer] = useState<number>(0);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Refs for cleanup
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Stage configuration
  const stageConfig = {
    1: { thinkingTime: 3, description: '3초 사고시간' },
    2: { thinkingTime: 2, description: '2초 사고시간' }, 
    3: { thinkingTime: 1, description: '1초 사고시간' },
  };

  // Cleanup function
  const cleanup = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // Auto start effect
  useEffect(() => {
    if (autoStart && !disabled && currentPhase === 'idle') {
      const timer = setTimeout(() => {
        startSpeakingFlow();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, disabled, card.id]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Reset when card changes
  useEffect(() => {
    setCurrentPhase('idle');
    setIsCompleted(false);
    setRecognizedText('');
    cleanup();
  }, [card.id]);

  const startSpeakingFlow = async () => {
    if (disabled || isCompleted) return;
    
    console.log('🎤 Speaking 플로우 시작:', card.front_ko);
    setCurrentPhase('tts');
    setIsCompleted(false);
    
    try {
      // 🔧 플러그인을 통한 한국어 TTS 재생
      console.log('🔊 TTS 재생 시작 (플러그인):', card.front_ko);

      try {
        const ServiceContainer = (await import('@/container/ServiceContainer')).default;
        const container = ServiceContainer.getInstanceSync();
        const speechService = container.getSpeechProcessingService();

        // 기존 TTS 중지
        speechService.stopAllSpeech();

        console.log('🔊 TTS 시작됨 (플러그인):', card.front_ko);

        await speechService.speakAnswer(card.front_ko, {
          language: 'ko-KR',
          rate: 0.8,
          volume: 1.0,
          pitch: 1.0
        });

        console.log('🔊 TTS 완료됨 (플러그인):', card.front_ko);
        setTimeout(() => {
          if (!isCompleted) startCountdown();
        }, 1000);

      } catch (speechError) {
        console.error('🔊 TTS 플러그인 오류:', speechError);
        // 플러그인 실패시 카운트다운 시작
        setTimeout(() => {
          if (!isCompleted) startCountdown();
        }, 2000);
      }
    } catch (error) {
      console.error('🔧 TTS 시스템 오류:', error);
      if (onError) {
        onError('음성 재생에 실패했습니다.');
      }
    }
  };

  const startCountdown = () => {
    console.log('⏳ 사고시간 카운트다운 시작');
    setCurrentPhase('countdown');
    
    const thinkingTime = stageConfig[stage].thinkingTime;
    setCountdown(thinkingTime);
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          // 비프음 재생 후 음성 인식 시작
          playBeepSound();
          setTimeout(() => {
            if (!isCompleted) startSpeechRecognition();
          }, 200);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playBeepSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('비프음 재생 실패:', error);
    }
  };

  const startSpeechRecognition = () => {
    if (isCompleted || currentPhase === 'recognition') {
      console.log('⚠️ 이미 음성 인식 중이거나 완료됨 - 중복 실행 방지');
      return;
    }
    
    console.log('🎤 음성 인식 시작 - 10초 제한');
    setCurrentPhase('recognition');
    setSpeechTimer(0);
    setRecognizedText('');
    
    // 음성인식 타이머 시작
    speechTimerRef.current = setInterval(() => {
      setSpeechTimer(prev => prev + 0.1);
    }, 100);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = true; // HTML 버전과 동일
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 5; // HTML 버전과 동일
      
      // 음성인식 정확도 개선 설정 (HTML 버전에서 가져옴)
      if (recognition.serviceURI) {
        recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
      }
      
      let recognitionCompleted = false;
      
      recognition.onstart = () => {
        console.log('🎯 음성 인식 시작됨');
      };
      
      recognition.onresult = (event: any) => {
        if (recognitionCompleted || isCompleted) return;
        recognitionCompleted = true;
        
        console.log('✅ 음성 인식 완료');
        
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence || 0.9;
          
          console.log('📝 인식된 텍스트:', transcript);
          setRecognizedText(transcript);
          
          // 정리 작업
          cleanup();
          setCurrentPhase('completed');
          setIsCompleted(true);
          
          // 결과 전달 - HTML 버전처럼 즉시 전달하고 4초 후 다음으로
          onResult(transcript.trim(), confidence);
        }
      };
      
      recognition.onerror = (event: any) => {
        if (recognitionCompleted || isCompleted) return;
        recognitionCompleted = true;
        
        console.error('😨 음성 인식 오류:', event.error);
        cleanup();
        setCurrentPhase('completed');
        setIsCompleted(true);
        
        // 오류가 발생해도 빈 답변으로 처리하여 다음으로 진행
        console.log('🔄 음성 인식 오류 - 빈 답변으로 처리하여 진행');
        setTimeout(() => {
          onResult('', 0.1); // 빈 답변으로 처리
        }, 0);
      };
      
      recognition.onend = () => {
        console.log('🔇 음성 인식 종료');
      };
      
      // 10초 타임아웃 설정 (더 길게)
      recognitionTimeoutRef.current = setTimeout(() => {
        if (recognitionCompleted || isCompleted) return;
        recognitionCompleted = true;
        
        console.log('⏰ 음성 인식 시간 초과 (10초) - 빈 답변으로 처리하여 진행');
        recognition.stop();
        cleanup();
        setCurrentPhase('completed');
        setIsCompleted(true);
        
        // 시간 초과 시에도 빈 답변으로 처리하여 다음으로 진행
        setTimeout(() => {
          onResult('', 0.1);
        }, 0);
      }, 10000);
      
      recognition.start();
    } else {
      if (onError) {
        onError('이 브라우저는 음성 인식을 지원하지 않습니다.');
      }
    }
  };

  const handleManualStart = () => {
    if (!disabled && currentPhase === 'idle') {
      startSpeakingFlow();
    }
  };

  const handleStop = () => {
    cleanup();
    setCurrentPhase('idle');
    setIsCompleted(false);
    setRecognizedText('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        {/* Phase Status Display */}
        {currentPhase !== 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800 mb-4">
                {currentPhase === 'tts' && '🔊 한국어를 들려드리고 있습니다...'}
                {currentPhase === 'countdown' && `⏳ ${countdown}초 후 음성 인식 시작 (${stageConfig[stage].description})`}
                {currentPhase === 'recognition' && `🎤 지금 영어로 말해주세요! (${speechTimer.toFixed(1)}초 / 10초)`}
                {currentPhase === 'waiting' && '⌛ 잠시 기다려주세요...'}
                {currentPhase === 'completed' && '✅ 음성 인식 완료!'}
              </div>
              
              {currentPhase === 'recognition' && (
                <>
                  {/* 진행 바 */}
                  <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
                    <div 
                      className="bg-red-500 h-3 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min((speechTimer / 10) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {/* 녹음 표시기 */}
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-700">
                      음성을 인식하고 있습니다... ({speechTimer.toFixed(1)}초 / 10초)
                    </span>
                  </div>
                </>
              )}
              
              {currentPhase === 'tts' && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">한국어 문제를 재생 중...</span>
                </div>
              )}
              
              {currentPhase === 'countdown' && countdown > 0 && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">사고시간: {countdown}초 남음</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual start button */}
        {currentPhase === 'idle' && !autoStart && (
          <button
            onClick={handleManualStart}
            disabled={disabled}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            🎤 Speaking 시작하기
          </button>
        )}
        
        {/* Stop button during recognition */}
        {currentPhase === 'recognition' && (
          <button
            onClick={handleStop}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            ⏹️ 중지
          </button>
        )}

        {/* Recognized text display */}
        {recognizedText && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-600 mb-1">인식된 음성:</div>
            <div className="font-medium text-green-800">"{recognizedText}"</div>
          </div>
        )}
      </div>
    </div>
  );
};