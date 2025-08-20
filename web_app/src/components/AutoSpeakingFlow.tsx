import React, { useEffect, useState } from 'react';
import { useSpeech } from '@/hooks/useSpeech';

interface AutoSpeakingFlowProps {
  currentCard: any;
  onSpeechResult: (transcript: string, confidence: number) => void;
  isActive: boolean;
}

export const AutoSpeakingFlow: React.FC<AutoSpeakingFlowProps> = ({
  currentCard,
  onSpeechResult,
  isActive
}) => {
  const [flowState, setFlowState] = useState<'idle' | 'tts' | 'beep' | 'recording' | 'processing'>('idle');
  const [timer, setTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoTimeout, setAutoTimeout] = useState<NodeJS.Timeout | null>(null);

  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // 카드 변경 시 자동 플로우 시작
  useEffect(() => {
    if (currentCard && isActive && flowState === 'idle') {
      startAutomaticFlow();
    }
  }, [currentCard, isActive]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (autoTimeout) clearTimeout(autoTimeout);
      if (speech.isRecording) speech.stopRecording();
    };
  }, []);

  const startAutomaticFlow = async () => {
    if (!currentCard) return;
    
    console.log('🎤 자동 Speaking 플로우 시작');
    setFlowState('tts');
    
    // 1. 한국어 TTS 재생
    if (speech.isTTSAvailable) {
      await speech.speak(currentCard.front_ko, 'ko-KR');
      
      // TTS 완료 후 1초 대기
      setTimeout(() => {
        playBeepAndStartRecording();
      }, 1000);
    } else {
      // TTS가 없으면 바로 녹음 시작
      setTimeout(() => {
        playBeepAndStartRecording();
      }, 2000);
    }
  };

  const playBeepAndStartRecording = () => {
    console.log('🔔 비프음 재생 및 녹음 시작');
    setFlowState('beep');
    
    // 비프음 재생
    playBeep();
    
    // 비프음 후 500ms 대기 후 녹음 시작
    setTimeout(() => {
      setFlowState('recording');
      speech.startRecording();
      
      // 타이머 시작
      setTimer(0);
      const interval = setInterval(() => {
        setTimer(prev => prev + 0.1);
      }, 100);
      setTimerInterval(interval);
      
      // 10초 후 자동으로 녹음 중지
      const timeout = setTimeout(() => {
        if (speech.isRecording) {
          speech.stopRecording();
        }
      }, 10000);
      setAutoTimeout(timeout);
      
    }, 500);
  };

  const playBeep = () => {
    // Web Audio API로 비프음 생성
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

  // 음성 인식 결과 처리
  useEffect(() => {
    if (speech.transcript && flowState === 'recording') {
      setFlowState('processing');
      
      // 타이머 정리
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      if (autoTimeout) {
        clearTimeout(autoTimeout);
        setAutoTimeout(null);
      }
      
      // 부모 컴포넌트로 결과 전달
      onSpeechResult(speech.transcript, speech.confidence);
      
      // 상태 초기화
      setFlowState('idle');
      setTimer(0);
    }
  }, [speech.transcript, flowState]);

  const getStatusMessage = () => {
    switch (flowState) {
      case 'tts':
        return '🔊 문제를 들려드리고 있습니다...';
      case 'beep':
        return '🔔 곧 녹음이 시작됩니다...';
      case 'recording':
        return `🎤 말씀해 주세요... (${timer.toFixed(1)}초)`;
      case 'processing':
        return '🤖 답변을 분석 중입니다...';
      default:
        return '';
    }
  };

  const getProgressWidth = () => {
    if (flowState === 'recording') {
      return `${Math.min((timer / 10) * 100, 100)}%`;
    }
    return '0%';
  };

  if (!isActive || flowState === 'idle') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-blue-800 mb-4">
          {getStatusMessage()}
        </div>
        
        {flowState === 'recording' && (
          <>
            {/* 진행 바 */}
            <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: getProgressWidth() }}
              />
            </div>
            
            {/* 녹음 표시기 */}
            <div className="flex items-center justify-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700">
                음성을 인식하고 있습니다... ({timer.toFixed(1)}초 / 10초)
              </span>
            </div>
          </>
        )}
        
        {flowState === 'tts' && (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">한국어 문제를 재생 중...</span>
          </div>
        )}
        
        {flowState === 'beep' && (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">신호음 후 말씀해 주세요</span>
          </div>
        )}
        
        {flowState === 'processing' && (
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">답변 분석 중...</span>
          </div>
        )}
      </div>
    </div>
  );
};