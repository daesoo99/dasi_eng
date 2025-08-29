import React, { useState, useRef, useCallback } from 'react';

interface UseCountdownReturn {
  remaining: number;
  elapsedTime: number;
  isRunning: boolean;
  isPaused: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
}

export const useCountdown = (onComplete?: () => void): UseCountdownReturn => {
  const [remaining, setRemaining] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((seconds: number) => {
    console.log(`[useCountdown] Starting timer: ${seconds}s`);
    clearExistingInterval();
    
    const startTime = Date.now();
    targetTimeRef.current = startTime + (seconds * 1000);
    totalDurationRef.current = seconds;
    
    setRemaining(seconds);
    setElapsedTime(0);
    setIsRunning(true);
    setIsPaused(false);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, (targetTimeRef.current - now) / 1000);
      const elapsed = totalDurationRef.current - timeLeft;
      
      setRemaining(timeLeft);
      setElapsedTime(elapsed);
      
      if (timeLeft <= 0) {
        console.log('[useCountdown] Timer completed');
        clearExistingInterval();
        setIsRunning(false);
        setIsPaused(false);
        onComplete?.();
      }
    }, 100);
  }, [clearExistingInterval, onComplete]);

  const pause = useCallback(() => {
    if (isRunning && !isPaused) {
      console.log(`[useCountdown] Pausing timer at remaining: ${remaining}s`);
      clearExistingInterval();
      pausedAtRef.current = remaining;
      setIsRunning(false);
      setIsPaused(true);
    }
  }, [isRunning, isPaused, remaining, clearExistingInterval]);

  const resume = useCallback(() => {
    if (isPaused && pausedAtRef.current > 0) {
      console.log(`[useCountdown] Resuming timer from: ${pausedAtRef.current}s`);
      const now = Date.now();
      targetTimeRef.current = now + (pausedAtRef.current * 1000);
      setIsRunning(true);
      setIsPaused(false);

      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const timeLeft = Math.max(0, (targetTimeRef.current - currentTime) / 1000);
        const elapsed = totalDurationRef.current - timeLeft;
        
        setRemaining(timeLeft);
        setElapsedTime(elapsed);
        
        if (timeLeft <= 0) {
          console.log('[useCountdown] Timer completed after resume');
          clearExistingInterval();
          setIsRunning(false);
          setIsPaused(false);
          onComplete?.();
        }
      }, 100);
    }
  }, [isPaused, clearExistingInterval, onComplete]);

  const reset = useCallback(() => {
    console.log('[useCountdown] Resetting timer');
    clearExistingInterval();
    setRemaining(0);
    setElapsedTime(0);
    setIsRunning(false);
    setIsPaused(false);
    targetTimeRef.current = 0;
    totalDurationRef.current = 0;
    pausedAtRef.current = 0;
  }, [clearExistingInterval]);

  const stop = useCallback(() => {
    console.log('[useCountdown] Stopping timer');
    clearExistingInterval();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearExistingInterval]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearExistingInterval();
    };
  }, [clearExistingInterval]);

  return {
    remaining,
    elapsedTime,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    stop
  };
};