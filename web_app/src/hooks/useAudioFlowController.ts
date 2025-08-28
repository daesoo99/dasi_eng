import { useState, useRef, useCallback, useEffect } from 'react';
import { useSpeech } from '@/hooks/useSpeech';

export type FlowState = 'idle' | 'tts' | 'beep' | 'recording' | 'processing' | 'timeout';

interface UseAudioFlowControllerProps {
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  recordingDuration?: number;
}

interface FlowController {
  flowState: FlowState;
  remainingTime: number;
  isPaused: boolean;
  
  startFlow: (koreanText: string) => Promise<void>;
  pauseFlow: () => void;
  resumeFlow: () => void;
  stopFlow: () => void;
  
  // 정답 재생 및 다음 단계 진행
  playAnswerAndNext: (answerText?: string) => Promise<void>;
}

export const useAudioFlowController = ({
  onSpeechResult,
  onTimeout,
  recordingDuration = 10
}: UseAudioFlowControllerProps): FlowController => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // 상태 참조들
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // 타이머 관리 함수들
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimer();
    
    const startTime = Date.now();
    startTimeRef.current = startTime;
    totalDurationRef.current = duration;
    
    console.log(`[AudioFlowController] Starting timer: ${duration}s`);
    setRemainingTime(duration);
    
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDurationRef.current - elapsed);
      
      setRemainingTime(remaining);
      
      if (remaining <= 0) {
        console.log('[AudioFlowController] Timer completed');
        clearTimer();
        handleTimeout();
      }
    }, 100);
  }, [clearTimer, handleTimeout]);

  const pauseTimer = useCallback(() => {
    if (!isPaused && timerRef.current) {
      console.log(`[AudioFlowController] Pausing timer at: ${remainingTime}s`);
      pausedAtRef.current = remainingTime;
      setIsPaused(true);
    }
  }, [isPaused, remainingTime]);

  const resumeTimer = useCallback(() => {
    if (isPaused && pausedAtRef.current > 0) {
      console.log(`[AudioFlowController] Resuming timer from: ${pausedAtRef.current}s`);
      
      // 새로운 시작 시간 설정하고 남은 시간을 기준으로 타이머 재시작
      startTimeRef.current = Date.now();
      totalDurationRef.current = pausedAtRef.current;
      setIsPaused(false);
      
      // 새로운 인터벌 시작
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, totalDurationRef.current - elapsed);
        
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          console.log('[AudioFlowController] Timer completed after resume');
          clearTimer();
          handleTimeout();
        }
      }, 100);
    }
  }, [isPaused, clearTimer, handleTimeout]);

  // 오디오 제어 함수들
  const stopBeep = useCallback(() => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (error) {
      console.warn('[AudioFlowController] Error stopping beep:', error);
    }
  }, []);

  const playBeep = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        stopBeep(); // 기존 비프음 정지
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        // 참조 저장
        audioContextRef.current = audioContext;
        oscillatorRef.current = oscillator;
        
        oscillator.onended = () => {
          audioContextRef.current = null;
          oscillatorRef.current = null;
          resolve();
        };
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        
      } catch (error) {
        console.error('[AudioFlowController] Beep failed:', error);
        reject(error);
      }
    });
  }, [stopBeep]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('[AudioFlowController] Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognitionRef.current = recognition;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log('[AudioFlowController] Recognition result:', transcript);
        
        clearTimer();
        setFlowState('processing');
        
        // 결과 전달
        setTimeout(() => {
          onSpeechResult(transcript, confidence);
          setFlowState('idle');
        }, 100);
      };
      
      recognition.onerror = (event: any) => {
        console.error('[AudioFlowController] Recognition error:', event.error);
        clearTimer();
        setFlowState('idle');
        reject(new Error(event.error));
      };
      
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      
      recognition.start();
      resolve();
    });
  }, [onSpeechResult, clearTimer]);

  // 타임아웃 처리
  const handleTimeout = useCallback(async () => {
    console.log('[AudioFlowController] Handling timeout');
    
    setFlowState('timeout');
    setIsPaused(false);
    
    // 녹음 중지
    stopRecording();
    
    // 1.5초 후 정답 재생 및 다음 단계로
    setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      setFlowState('idle');
    }, 1500);
  }, [onTimeout, stopRecording]);

  // 메인 플로우 함수들
  const startFlow = useCallback(async (koreanText: string) => {
    try {
      console.log('[AudioFlowController] Starting flow with:', koreanText);
      
      setFlowState('tts');
      setIsPaused(false);
      
      // 1. TTS 재생
      if (speech.isTTSAvailable) {
        await speech.speak(koreanText, { lang: 'ko-KR' });
        if (isPaused) return; // 일시정지됨
      }
      
      // 2. 비프음 재생
      setFlowState('beep');
      await playBeep();
      if (isPaused) return; // 일시정지됨
      
      // 3. 녹음 시작
      setFlowState('recording');
      setRemainingTime(recordingDuration);
      
      await startRecording();
      startTimer(recordingDuration);
      
    } catch (error) {
      console.error('[AudioFlowController] Flow error:', error);
      setFlowState('idle');
    }
  }, [speech, isPaused, playBeep, startRecording, startTimer, recordingDuration]);

  const pauseFlow = useCallback(() => {
    console.log(`[AudioFlowController] Pausing flow at state: ${flowState}`);
    
    if (flowState === 'tts') {
      speech.pauseTTS();
    } else if (flowState === 'beep') {
      stopBeep();
    } else if (flowState === 'recording') {
      pauseTimer();
    }
    
    setIsPaused(true);
  }, [flowState, speech, stopBeep, pauseTimer]);

  const resumeFlow = useCallback(() => {
    console.log(`[AudioFlowController] Resuming flow at state: ${flowState}`);
    
    if (flowState === 'tts') {
      speech.resumeTTS();
    } else if (flowState === 'recording') {
      resumeTimer();
    }
    
    setIsPaused(false);
  }, [flowState, speech, resumeTimer]);

  const stopFlow = useCallback(() => {
    console.log('[AudioFlowController] Stopping flow');
    
    clearTimer();
    speech.stopAll();
    stopBeep();
    stopRecording();
    
    setFlowState('idle');
    setIsPaused(false);
    setRemainingTime(0);
  }, [clearTimer, speech, stopBeep, stopRecording]);

  const playAnswerAndNext = useCallback(async (answerText?: string) => {
    if (answerText && speech.isTTSAvailable) {
      try {
        console.log('[AudioFlowController] Playing answer:', answerText);
        setFlowState('processing');
        
        await speech.speak(answerText, { lang: 'en-US' });
        
        setTimeout(() => {
          setFlowState('idle');
          onTimeout?.(); // 다음 문제로
        }, 1000);
      } catch (error) {
        console.error('[AudioFlowController] Answer TTS error:', error);
        setFlowState('idle');
        onTimeout?.();
      }
    } else {
      setFlowState('idle');
      onTimeout?.();
    }
  }, [speech, onTimeout]);

  // 정리
  useEffect(() => {
    return () => {
      clearTimer();
      speech.stopAll();
      stopBeep();
      stopRecording();
    };
  }, [clearTimer, speech, stopBeep, stopRecording]);

  return {
    flowState,
    remainingTime,
    isPaused,
    startFlow,
    pauseFlow,
    resumeFlow,
    stopFlow,
    playAnswerAndNext
  };
};