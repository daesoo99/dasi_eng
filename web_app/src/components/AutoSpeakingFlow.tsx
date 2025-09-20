import React, { useEffect, useState, useCallback } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useCountdown } from '@/hooks/useCountdown';

interface AutoSpeakingFlowProps {
  currentCard: any;
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  isActive: boolean;
}

export const AutoSpeakingFlow: React.FC<AutoSpeakingFlowProps> = ({
  currentCard,
  onSpeechResult,
  onTimeout,
  isActive
}) => {
  const [flowState, setFlowState] = useState<'idle' | 'tts' | 'beep' | 'recording' | 'processing'>('idle');
  const [autoTimeout, setAutoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const countdown = useCountdown(() => {
    console.log('[AutoSpeakingFlow] Timer completed, handling timeout');
    handleTimeoutComplete();
  });
  
  // 시간 초과 처리 함수
  const handleTimeoutComplete = async () => {
    try {
      // 현재 녹음 중지
      if (speech.isRecording) {
        speech.stopRecording();
      }
      
      // 상태를 processing으로 변경
      setFlowState('processing');
      setIsPaused(false);
      
      // 정답 TTS 재생 (1.5초 후)
      if (currentCard?.target_en) {
        setTimeout(async () => {
          try {
            console.log('[AutoSpeakingFlow] Playing answer TTS:', currentCard.target_en);
            await speech.speak(currentCard.target_en, { lang: 'en-US' });
            
            // TTS 완료 후 콜백 호출
            setTimeout(() => {
              console.log('[AutoSpeakingFlow] Timeout processing complete');
              setFlowState('idle');
              onTimeout?.();
            }, 1000);
          } catch (error) {
            console.error('[AutoSpeakingFlow] Error playing answer TTS:', error);
            setFlowState('idle');
            onTimeout?.();
          }
        }, 1500);
      } else {
        // 정답이 없으면 바로 다음으로
        setTimeout(() => {
          setFlowState('idle');
          onTimeout?.();
        }, 1500);
      }
    } catch (error) {
      console.error('[AutoSpeakingFlow] Error in timeout handling:', error);
      setFlowState('idle');
      onTimeout?.();
    }
  };

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
  }, [currentCard, isActive, flowState, startAutomaticFlow]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      countdown.stop();
      if (autoTimeout) clearTimeout(autoTimeout);
      speech.stopAll();
    };
  }, [countdown, autoTimeout, speech]);

  const startAutomaticFlow = useCallback(async () => {
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
  }, [currentCard, speech, playBeepAndStartRecording]);

  const playBeepAndStartRecording = useCallback(() => {
    console.log('🔔 비프음 재생 및 녹음 시작');
    setFlowState('beep');

    // 비프음 재생
    playBeep();

    // 비프음 후 500ms 대기 후 녹음 시작
    setTimeout(() => {
      if (!isPaused) {
        setFlowState('recording');
        speech.startRecording();

        // 10초 카운트다운 시작
        countdown.start(10);
      }
    }, 500);
  }, [isPaused, speech, countdown, playBeep]);

  const playBeep = useCallback(() => {
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
  }, []);

  // 음성 인식 결과 처리
  useEffect(() => {
    if (speech.transcript && flowState === 'recording') {
      setFlowState('processing');
      
      // 타이머 정리
      countdown.stop();
      if (autoTimeout) {
        clearTimeout(autoTimeout);
        setAutoTimeout(null);
      }
      
      // 부모 컴포넌트로 결과 전달
      onSpeechResult(speech.transcript, speech.confidence);
      
      // 상태 초기화
      setFlowState('idle');
    }
  }, [speech.transcript, speech.confidence, flowState, countdown, autoTimeout, onSpeechResult]);

  const getStatusMessage = () => {
    switch (flowState) {
      case 'tts':
        return '🔊 문제를 들려드리고 있습니다...';
      case 'beep':
        return '🔔 곧 녹음이 시작됩니다...';
      case 'recording':
        const remainingSeconds = Math.ceil(countdown.remaining);
        return countdown.isPaused ? `⏸️ 일시정지됨 (남은 시간: ${remainingSeconds}초)` : `🎤 말씀해 주세요... (남은 시간: ${remainingSeconds}초)`;
      case 'processing':
        return '🤖 답변을 분석 중입니다...';
      default:
        return '';
    }
  };

  const getProgressWidth = () => {
    if (flowState === 'recording') {
      const elapsed = 10 - countdown.remaining;
      return `${Math.min((elapsed / 10) * 100, 100)}%`;
    }
    return '0%';
  };

  // 일시정지/재개 제어
  const handlePauseResume = () => {
    console.log(`[AutoSpeakingFlow] ${countdown.isPaused || isPaused ? 'Resume' : 'Pause'} requested, flowState: ${flowState}`);
    
    if (countdown.isPaused || isPaused) {
      // 재개
      if (flowState === 'tts' && speech.isTTSPaused()) {
        console.log('[AutoSpeakingFlow] Resuming TTS');
        speech.resumeTTS();
      } else if (flowState === 'recording') {
        console.log('[AutoSpeakingFlow] Resuming countdown');
        countdown.resume();
      }
      setIsPaused(false);
    } else {
      // 일시정지
      if (flowState === 'tts' && speech.isTTSSpeaking()) {
        console.log('[AutoSpeakingFlow] Pausing TTS');
        speech.pauseTTS();
      } else if (flowState === 'recording') {
        console.log('[AutoSpeakingFlow] Pausing countdown');
        countdown.pause();
      } else if (flowState === 'beep') {
        console.log('[AutoSpeakingFlow] Stopping beep');
        speech.stopBeep();
      }
      setIsPaused(true);
    }
  };

  // 완전 중지
  const handleStop = () => {
    setFlowState('idle');
    setIsPaused(false);
    countdown.stop();
    speech.stopAll();
    if (autoTimeout) {
      clearTimeout(autoTimeout);
      setAutoTimeout(null);
    }
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
              <div className={`w-3 h-3 rounded-full ${countdown.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm text-blue-700">
                {countdown.isPaused ? '일시정지됨' : '음성을 인식하고 있습니다...'} (남은 시간: {Math.ceil(countdown.remaining)}초)
              </span>
            </div>
            
            {/* 제어 버튼 */}
            <div className="flex justify-center space-x-3 mt-4">
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {countdown.isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                ⏹️ 중지
              </button>
            </div>
          </>
        )}
        
        {flowState === 'tts' && (
          <>
            <div className="flex items-center justify-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${speech.isTTSPaused() ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
              <span className="text-sm text-blue-700">
                {speech.isTTSPaused() ? '음성 재생 일시정지됨' : '한국어 문제를 재생 중...'}
              </span>
            </div>
            
            {/* TTS 제어 버튼 */}
            <div className="flex justify-center space-x-3 mt-4">
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {speech.isTTSPaused() ? '▶️ 재개' : '⏸️ 일시정지'}
              </button>
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                ⏹️ 중지
              </button>
            </div>
          </>
        )}
        
        {flowState === 'beep' && (
          <>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700">신호음 후 말씀해 주세요</span>
            </div>
            
            {/* 비프음 중지 버튼 */}
            <div className="flex justify-center space-x-3 mt-4">
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                ⏹️ 중지
              </button>
            </div>
          </>
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