import React, { useState, useEffect } from 'react';
import { useSpeech } from '@/hooks/useSpeech';

interface SpeechRecorderProps {
  onResult: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  phraseHints?: string[];
  disabled?: boolean;
  className?: string;
  // Auto-flow props
  autoFlow?: boolean;
  koreanText?: string;
  autoStart?: boolean;
  onAutoFlowStateChange?: (state: 'idle' | 'tts' | 'beep' | 'waiting' | 'recording') => void;
}

export const SpeechRecorder: React.FC<SpeechRecorderProps> = ({
  onResult,
  onError,
  phraseHints = [],
  disabled = false,
  className = '',
  autoFlow = false,
  koreanText = '',
  autoStart = false,
  onAutoFlowStateChange,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [autoFlowState, setAutoFlowState] = useState<'idle' | 'tts' | 'beep' | 'waiting' | 'recording'>('idle');
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const [speechTimer, setSpeechTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoTimeout, setAutoTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false, // Start with browser STT
    language: 'en-US',
  });

  // Auto-flow state management
  const updateAutoFlowState = (newState: typeof autoFlowState) => {
    setAutoFlowState(newState);
    if (onAutoFlowStateChange) {
      onAutoFlowStateChange(newState);
    }
  };

  // Auto-start effect
  useEffect(() => {
    if (autoFlow && autoStart && koreanText && autoFlowState === 'idle' && !disabled) {
      // 0.5초 딜레이 후 자동 시작
      const startDelay = setTimeout(() => {
        handleAutoFlowStart();
      }, 500);
      
      return () => clearTimeout(startDelay);
    }
  }, [koreanText, autoStart, disabled]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (autoTimeout) clearTimeout(autoTimeout);
    };
  }, []);

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('비프음 재생 실패:', error);
    }
  };

  // Auto-flow start button handler
  const handleAutoFlowStart = async () => {
    if (disabled || !autoFlow || !koreanText) return;
    
    console.log('🎤 자동 Speaking 플로우 시작');
    updateAutoFlowState('tts');
    
    try {
      // 1. 한국어 TTS 재생
      if (speech.isTTSAvailable) {
        await speech.speak(koreanText, 'ko-KR');
        
        // TTS 완료 후 1초 대기
        setTimeout(() => {
          playBeepAndStartRecording();
        }, 1000);
      } else {
        // TTS가 없으면 2초 대기 후 녹음 시작
        setTimeout(() => {
          playBeepAndStartRecording();
        }, 2000);
      }
    } catch (error) {
      console.error('TTS 재생 실패:', error);
      updateAutoFlowState('idle');
      if (onError) {
        onError('음성 재생에 실패했습니다.');
      }
    }
  };

  const playBeepAndStartRecording = () => {
    console.log('🔔 비프음 재생 및 녹음 시작');
    updateAutoFlowState('beep');
    
    // 비프음 재생
    playBeep();
    
    // 비프음 후 500ms 대기 후 녹음 시작
    setTimeout(() => {
      startDirectSpeechRecognition();
    }, 500);
  };

  const startDirectSpeechRecognition = () => {
    console.log('🎤 직접 음성 인식 시작');
    updateAutoFlowState('recording');
    setIsAutoRecording(true);
    
    // 타이머 시작
    setSpeechTimer(0);
    const interval = setInterval(() => {
      setSpeechTimer(prev => prev + 0.1);
    }, 100);
    setTimerInterval(interval);
    
    // Web Speech API 직접 사용
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      let isCompleted = false; // 핵심: 중복 처리 방지
      
      recognition.onstart = () => {
        console.log('🎯 음성 인식 시작됨');
      };
      
      recognition.onresult = (event: any) => {
        if (isCompleted) {
          console.log('⚠️ 이미 처리된 결과 - 건너뜀');
          return;
        }
        isCompleted = true;
        
        console.log('🎤 음성 인식 결과 수신:', event);
        
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence || 0.9;
          
          console.log('🎯 인식된 텍스트:', transcript);
          console.log('🎯 신뢰도:', confidence);
          
          // 즉시 음성 인식 중지를 위해 recognition.stop() 호출
          recognition.stop();
          
          // 타이머 정리
          clearAllTimers();
          
          // 상태 초기화
          updateAutoFlowState('idle');
          setIsAutoRecording(false);
          setSpeechTimer(0);
          
          // 결과 전달 - 즉시 실행
          console.log('🚀 SpeechRecorder: onResult 콜백 호출', { 
            transcript: transcript.trim(), 
            confidence,
            onResultType: typeof onResult 
          });
          
          // setTimeout으로 React 상태 업데이트 후 콜백 실행 보장
          setTimeout(() => {
            console.log('🎯 SpeechRecorder: 콜백 실행');
            onResult(transcript.trim(), confidence);
          }, 0);
        }
      };
      
      recognition.onerror = (event: any) => {
        if (isCompleted) return;
        isCompleted = true;
        
        console.error('😨 음성 인식 오류:', event.error);
        
        clearAllTimers();
        updateAutoFlowState('idle');
        setIsAutoRecording(false);
        setSpeechTimer(0);
        
        if (onError) {
          onError(`음성 인식 오류: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        console.log('🔊 음성 인식 종료');
        
        // 만약 아직 녹음 상태이고 결과가 없었다면 실패로 처리
        if (!isCompleted && isAutoRecording) {
          console.log('😨 음성 인식 실패 - 결과 없이 종료');
          isCompleted = true;
          
          clearAllTimers();
          updateAutoFlowState('idle');
          setIsAutoRecording(false);
          setSpeechTimer(0);
          
          if (onError) {
            onError('음성을 인식하지 못했습니다. 다시 시도해주세요.');
          }
        }
      };
      
      // 10초 타임아웃 설정
      const timeout = setTimeout(() => {
        if (isCompleted) return;
        isCompleted = true;
        
        console.log('⏰ 10초 타임아웃 - 녹음 중지');
        recognition.stop();
        clearAllTimers();
        updateAutoFlowState('idle');
        setIsAutoRecording(false);
        setSpeechTimer(0);
        
        if (onError) {
          onError('음성 인식 시간이 초과되었습니다. 다시 시도해주세요.');
        }
      }, 10000);
      setAutoTimeout(timeout);
      
      // 음성 인식 시작
      recognition.start();
    } else {
      // Web Speech API가 지원되지 않는 경우
      console.error('😨 Web Speech API가 지원되지 않습니다');
      clearAllTimers();
      updateAutoFlowState('idle');
      setIsAutoRecording(false);
      setSpeechTimer(0);
      
      if (onError) {
        onError('이 브라우저는 음성 인식을 지원하지 않습니다.');
      }
    }
  };

  const clearAllTimers = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    if (autoTimeout) {
      clearTimeout(autoTimeout);
      setAutoTimeout(null);
    }
  };

  // 기존 useSpeech 후크 결과 처리는 제거 (직접 Web Speech API 사용으로 대체)

  // Manual button handlers (for non-auto mode)
  const handleManualStart = () => {
    if (disabled) return;
    setIsPressed(true);
    speech.startRecording();
  };

  const handleManualStop = () => {
    setIsPressed(false);
    speech.stopRecording();
  };

  // Handle speech results for manual mode
  useEffect(() => {
    if (speech.transcript && !autoFlow && !isAutoRecording) {
      onResult(speech.transcript, speech.confidence);
    }
  }, [speech.transcript, autoFlow, isAutoRecording]);

  // Error handling
  useEffect(() => {
    if (speech.error && onError) {
      onError(speech.error);
    }
  }, [speech.error, onError]);

  if (autoFlow) {
    return (
      <div className={`text-center ${className}`}>
        {/* Auto-flow status display */}
        {autoFlowState !== 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800 mb-4">
                {autoFlowState === 'tts' && '🔊 문제를 들려드리고 있습니다...'}
                {autoFlowState === 'beep' && '🔔 곧 녹음이 시작됩니다...'}
                {autoFlowState === 'recording' && `🎤 말씀해 주세요... (${speechTimer.toFixed(1)}초)`}
              </div>
              
              {autoFlowState === 'recording' && (
                <>
                  {/* 진행 바 */}
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-100"
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
              
              {autoFlowState === 'tts' && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">한국어 문제를 재생 중...</span>
                </div>
              )}
              
              {autoFlowState === 'beep' && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">신호음 후 말씀해 주세요</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual start button for auto-flow mode */}
        {autoFlowState === 'idle' && !autoStart && (
          <button
            onClick={handleAutoFlowStart}
            disabled={disabled}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            🎤 시작하기
          </button>
        )}
        
        {/* 녹음 중지 버튼 */}
        {autoFlowState === 'recording' && (
          <button
            onClick={() => {
              clearAllTimers();
              updateAutoFlowState('idle');
              setIsAutoRecording(false);
              setSpeechTimer(0);
              if (onError) {
                onError('사용자가 녹음을 중지했습니다.');
              }
            }}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            ⏹️ 녹음 중지
          </button>
        )}
      </div>
    );
  }

  // Manual mode UI
  return (
    <div className={`text-center ${className}`}>
      <div className="mb-4">
        <button
          onMouseDown={handleManualStart}
          onMouseUp={handleManualStop}
          onTouchStart={handleManualStart}
          onTouchEnd={handleManualStop}
          disabled={disabled}
          className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 text-lg ${
            isPressed 
              ? 'bg-red-600 text-white transform scale-105' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          {isPressed ? '🔴 녹음 중... (버튼을 떼세요)' : '🎤 눌러서 말하기'}
        </button>
      </div>

      {speech.isRecording && (
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>음성을 인식하고 있습니다...</span>
          </div>
        </div>
      )}

      {speech.transcript && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-600 mb-1">인식된 음성:</div>
          <div className="font-medium text-green-800">"{speech.transcript}"</div>
          <div className="text-xs text-green-500 mt-1">
            정확도: {Math.round(speech.confidence * 100)}%
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>버튼을 누르고 있는 동안 음성이 녹음됩니다</p>
        <p>명확하고 천천히 말해주세요</p>
      </div>
    </div>
  );
};