/**
 * 카운트다운 타이머 훅
 * 하드코딩 방지 원칙에 따라 모듈화된 타이머 로직
 * 
 * @architecture Plugin-style countdown timer for Pattern Training
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CountdownConfig {
  initialTime: number;
  onComplete: () => void;
  onTick?: (remainingTime: number) => void;
  onStart?: () => void;
}

export interface CountdownState {
  remainingTime: number;
  isRunning: boolean;
  displayText: string;
  isCompleted: boolean;
}

/**
 * 카운트다운 타이머 훅
 * 완전히 모듈화되어 재사용 가능
 */
export function useCountdownTimer(config: CountdownConfig): CountdownState & {
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  const { initialTime, onComplete, onTick, onStart } = config;
  
  const [remainingTime, setRemainingTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 시각적 표시 텍스트 동적 생성 (하드코딩 제거)
  const displayText = isCompleted 
    ? '시작!' 
    : remainingTime > 0 
      ? remainingTime.toString()
      : '시작!';

  const start = useCallback(() => {
    if (isRunning) return;
    
    setIsRunning(true);
    setIsCompleted(false);
    onStart?.();
    
    intervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        
        // 매 틱마다 콜백 호출
        onTick?.(newTime);
        
        if (newTime <= 0) {
          setIsRunning(false);
          setIsCompleted(true);
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // 완료 콜백 호출
          setTimeout(() => {
            onComplete();
          }, 0);
        }
        
        return newTime;
      });
    }, 1000);
  }, [isRunning, onComplete, onTick, onStart]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setRemainingTime(initialTime);
    setIsCompleted(false);
  }, [stop, initialTime]);

  // 클린업
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    remainingTime,
    isRunning,
    displayText,
    isCompleted,
    start,
    stop,
    reset
  };
}

/**
 * 패턴 트레이닝 전용 카운트다운 훅
 * 사고시간 + 음성인식시간 2단계 타이머
 */
export function usePatternTrainingTimer(
  thinkingTime: number,
  recognitionTime: number,
  onThinkingComplete: () => void,
  onRecognitionComplete: () => void
) {
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'thinking' | 'recognition'>('idle');
  
  // 사고시간 타이머
  const thinkingTimer = useCountdownTimer({
    initialTime: thinkingTime,
    onComplete: () => {
      setCurrentPhase('recognition');
      onThinkingComplete();
      recognitionTimer.start();
    }
  });
  
  // 음성인식시간 타이머
  const recognitionTimer = useCountdownTimer({
    initialTime: recognitionTime,
    onComplete: () => {
      setCurrentPhase('idle');
      onRecognitionComplete();
    }
  });

  const startPattern = useCallback(() => {
    setCurrentPhase('thinking');
    thinkingTimer.reset();
    recognitionTimer.reset();
    thinkingTimer.start();
  }, [thinkingTimer, recognitionTimer]);

  const stopPattern = useCallback(() => {
    setCurrentPhase('idle');
    thinkingTimer.stop();
    recognitionTimer.stop();
  }, [thinkingTimer, recognitionTimer]);

  return {
    currentPhase,
    thinkingTimer,
    recognitionTimer,
    startPattern,
    stopPattern
  };
}