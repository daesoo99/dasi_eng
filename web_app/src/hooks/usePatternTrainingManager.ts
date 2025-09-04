/**
 * usePatternTrainingManager - 패턴 트레이닝 통합 관리 훅
 * 
 * 역할:
 * - TimerManager와 EventLifecycleManager 통합
 * - 타이머/이벤트 라이프사이클 자동 관리
 * - 일시정지/재개 기능 통합 제공
 */

import { useRef, useCallback, useEffect } from 'react';
import TimerManager, { type TimerConfig } from '@/services/timers/TimerManager';
import EventLifecycleManager from '@/services/events/EventLifecycleManager';

export interface PatternTrainingManagerConfig {
  onCountdownTick?: (remainingTime: number) => void;
  onCountdownComplete?: () => void;
  onRecognitionTick?: (remainingTime: number) => void;
  onRecognitionComplete?: () => void;
  onWaitingTick?: (remainingTime: number) => void;
  onWaitingComplete?: () => void;
  onCompletionEvent?: (stageId: string) => void;
}

export interface PatternTrainingManager {
  // 타이머 관리
  startCountdown: (duration: number) => void;
  startRecognition: (duration: number) => void;
  startWaiting: (duration: number) => void;
  stopAllTimers: () => void;
  pauseAllTimers: () => void;
  resumeAllTimers: () => void;
  
  // 완료 이벤트 관리
  handleStageCompletion: (stageId: string) => boolean;
  
  // TTS 이벤트 관리
  manageTTSEvents: (utterance: SpeechSynthesisUtterance) => void;
  
  // 음성인식 이벤트 관리
  manageRecognitionEvents: (recognition: any) => void;
  
  // 타이머 상태 조회
  getTimerState: () => { remainingTime?: number } | null;
  
  // 정리
  cleanup: () => void;
  
  // 디버그
  debug: () => void;
}

export const usePatternTrainingManager = (
  config: PatternTrainingManagerConfig
): PatternTrainingManager => {
  const timerManagerRef = useRef<TimerManager>(TimerManager.getInstance());
  const eventManagerRef = useRef<EventLifecycleManager>(EventLifecycleManager.getInstance());
  const timerConfigsRef = useRef<Map<string, TimerConfig>>(new Map());

  // 컴포넌트 언마운트시 자동 정리
  useEffect(() => {
    return () => {
      timerManagerRef.current.clearAllTimers();
      eventManagerRef.current.clearAllEvents();
    };
  }, []);

  // 정기적으로 오래된 이벤트 정리
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      eventManagerRef.current.cleanupOldEvents();
    }, 30000); // 30초마다

    return () => clearInterval(cleanupInterval);
  }, []);

  /**
   * 카운트다운 타이머 시작
   */
  const startCountdown = useCallback((duration: number): void => {
    const timerConfig: TimerConfig = {
      id: 'countdown',
      type: 'countdown',
      interval: 1000,
      callback: (remainingTime: number) => {
        config.onCountdownTick?.(remainingTime);
      },
      onComplete: () => {
        config.onCountdownComplete?.(
);
      }
    };

    timerConfigsRef.current.set('countdown', timerConfig);
    timerManagerRef.current.startTimer(timerConfig, duration);
  }, [config]);

  /**
   * 음성인식 타이머 시작
   */
  const startRecognition = useCallback((duration: number): void => {
    const timerConfig: TimerConfig = {
      id: 'recognition',
      type: 'recognition',
      interval: 1000,
      callback: (remainingTime: number) => {
        config.onRecognitionTick?.(remainingTime);
      },
      onComplete: () => {
        config.onRecognitionComplete?.();
      }
    };

    timerConfigsRef.current.set('recognition', timerConfig);
    timerManagerRef.current.startTimer(timerConfig, duration);
  }, [config]);

  /**
   * 대기 타이머 시작
   */
  const startWaiting = useCallback((duration: number): void => {
    const timerConfig: TimerConfig = {
      id: 'waiting',
      type: 'waiting',
      interval: 1000,
      callback: (remainingTime: number) => {
        config.onWaitingTick?.(remainingTime);
      },
      onComplete: () => {
        config.onWaitingComplete?.();
      }
    };

    timerConfigsRef.current.set('waiting', timerConfig);
    timerManagerRef.current.startTimer(timerConfig, duration);
  }, [config]);

  /**
   * 모든 타이머 중지
   */
  const stopAllTimers = useCallback((): void => {
    timerManagerRef.current.clearAllTimers();
  }, []);

  /**
   * 모든 타이머 일시정지
   */
  const pauseAllTimers = useCallback((): void => {
    timerManagerRef.current.pauseAllTimers();
  }, []);

  /**
   * 모든 타이머 재개
   */
  const resumeAllTimers = useCallback((): void => {
    timerManagerRef.current.resumeAllTimers(undefined, timerConfigsRef.current);
  }, []);

  /**
   * 스테이지 완료 이벤트 처리 (중복 방지)
   */
  const handleStageCompletion = useCallback((stageId: string): boolean => {
    const completionId = `stage-completion-${stageId}-${Date.now()}`;
    
    return eventManagerRef.current.handleCompletion(completionId, () => {
      config.onCompletionEvent?.(stageId);
      
      // 완료 알림 표시
      alert(`🎉 Stage ${stageId} 훈련 완료!\n\n모든 고급 문법 패턴을 연습했습니다.\n계속해서 다른 스테이지도 도전해보세요!`);
    });
  }, [config]);

  /**
   * TTS 이벤트 관리
   */
  const manageTTSEvents = useCallback((utterance: SpeechSynthesisUtterance): void => {
    // TTS 시작 이벤트
    eventManagerRef.current.manageTTSEvent(
      utterance,
      'start',
      () => console.log('🔊 [Manager] TTS 시작')
    );

    // TTS 완료 이벤트
    eventManagerRef.current.manageTTSEvent(
      utterance,
      'end',
      () => console.log('🔊 [Manager] TTS 완료')
    );

    // TTS 오류 이벤트
    eventManagerRef.current.manageTTSEvent(
      utterance,
      'error',
      (e: any) => console.error('❌ [Manager] TTS 오류:', e)
    );
  }, []);

  /**
   * 음성인식 이벤트 관리
   */
  const manageRecognitionEvents = useCallback((recognition: any): void => {
    // 음성인식 결과 이벤트
    eventManagerRef.current.manageRecognitionEvent(
      recognition,
      'result',
      (event: any) => {
        console.log('🎤 [Manager] 음성인식 결과:', event.results[0][0].transcript);
      }
    );

    // 음성인식 종료 이벤트
    eventManagerRef.current.manageRecognitionEvent(
      recognition,
      'end',
      () => console.log('🎤 [Manager] 음성인식 종료')
    );

    // 음성인식 오류 이벤트
    eventManagerRef.current.manageRecognitionEvent(
      recognition,
      'error',
      (e: any) => console.error('❌ [Manager] 음성인식 오류:', e)
    );
  }, []);

  /**
   * 모든 리소스 정리
   */
  const cleanup = useCallback((): void => {
    timerManagerRef.current.clearAllTimers();
    eventManagerRef.current.clearAllEvents();
    timerConfigsRef.current.clear();
  }, []);

  /**
   * 현재 활성 타이머 상태 조회
   */
  const getTimerState = useCallback(() => {
    const activeTimers = timerManagerRef.current.getActiveTimers();
    if (activeTimers.length > 0) {
      return { remainingTime: activeTimers[0].remainingTime };
    }
    return null;
  }, []);

  /**
   * 디버그 정보 출력
   */
  const debug = useCallback((): void => {
    console.log('🔍 [PatternTrainingManager] 디버그 정보:');
    timerManagerRef.current.debug();
    eventManagerRef.current.debug();
  }, []);

  return {
    startCountdown,
    startRecognition,
    startWaiting,
    stopAllTimers,
    pauseAllTimers,
    resumeAllTimers,
    handleStageCompletion,
    manageTTSEvents,
    manageRecognitionEvents,
    getTimerState,
    cleanup,
    debug
  };
};