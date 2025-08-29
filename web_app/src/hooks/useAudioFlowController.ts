import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getServiceContainer } from '@/container/ServiceContainer';
import type { IAudioFlowStateMachine } from '@/container/ServiceContainer';
import type { FlowState, FlowCallbacks } from '@/state/types';

interface UseAudioFlowControllerProps {
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  recordingDuration?: number;
  speechOptions?: {
    questionLanguage?: string;
    answerLanguage?: string;
    speechRate?: number;
  };
  // 의존성 주입을 위한 옵션 (테스트용)
  serviceContainer?: ReturnType<typeof getServiceContainer>;
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
  
  // 상태 머신 추가 메서드들
  getDisplayInfo: () => any;
  getAllowedActions: () => string[];
}

export const useAudioFlowController = ({
  onSpeechResult,
  onTimeout,
  recordingDuration = 10,
  speechOptions = {},
  serviceContainer
}: UseAudioFlowControllerProps): FlowController => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // 서비스 컨테이너에서 의존성 주입
  const container = serviceContainer || getServiceContainer({
    speechOptions: {
      recognitionLanguage: speechOptions.questionLanguage || 'en-US',
      synthesisLanguage: speechOptions.answerLanguage || 'ko-KR',
      speechRate: speechOptions.speechRate || 0.9
    }
  });

  const stateMachineRef = useRef<IAudioFlowStateMachine>();

  // 콜백 설정 메모이제이션
  const callbacks: FlowCallbacks = useMemo(() => ({
    onStateChange: setFlowState,
    onTimeUpdate: setRemainingTime,
    onSpeechResult,
    onTimeout: onTimeout || (() => {}),
    onError: (error) => console.error('[useAudioFlowController] Error:', error)
  }), [onSpeechResult, onTimeout]);

  // 상태 머신 초기화 (서비스 컨테이너에서 생성)
  if (!stateMachineRef.current) {
    stateMachineRef.current = container.createAudioFlowStateMachine(
      callbacks,
      recordingDuration
    );
  }

  // 상태 머신을 통한 플로우 제어 함수들
  const startFlow = useCallback(async (koreanText: string) => {
    if (!stateMachineRef.current) {
      console.error('[useAudioFlowController] StateMachine not initialized');
      return;
    }

    try {
      const result = await stateMachineRef.current.startFlow(koreanText);
      if (!result.success) {
        console.error('[useAudioFlowController] Flow start failed:', result.error);
      }
    } catch (error) {
      console.error('[useAudioFlowController] Flow start error:', error);
    }
  }, []);

  const pauseFlow = useCallback(() => {
    if (!stateMachineRef.current) return;
    
    const result = stateMachineRef.current.pauseFlow();
    if (result.success) {
      setIsPaused(true);
    }
  }, []);

  const resumeFlow = useCallback(() => {
    if (!stateMachineRef.current) return;
    
    const result = stateMachineRef.current.resumeFlow();
    if (result.success) {
      setIsPaused(false);
    }
  }, []);

  const stopFlow = useCallback(() => {
    if (!stateMachineRef.current) return;
    
    const result = stateMachineRef.current.stopFlow();
    if (result.success) {
      setFlowState('idle');
      setRemainingTime(0);
      setIsPaused(false);
    }
  }, []);

  const playAnswerAndNext = useCallback(async (answerText?: string) => {
    if (!stateMachineRef.current) return;
    
    await stateMachineRef.current.playAnswerAndNext(answerText);
  }, []);

  const getDisplayInfo = useCallback(() => {
    if (!stateMachineRef.current) return null;
    return stateMachineRef.current.getDisplayInfo();
  }, []);

  const getAllowedActions = useCallback(() => {
    if (!stateMachineRef.current) return [];
    return stateMachineRef.current.getAllowedActions();
  }, []);

  // 정리
  useEffect(() => {
    return () => {
      // 상태 머신 정리
      if (stateMachineRef.current) {
        stateMachineRef.current.cleanup();
      }
      
      // 서비스 컨테이너는 싱글톤으로 관리되므로 여기서 cleanup하지 않음
      // 컴포넌트 언마운트 시에는 상태 머신만 정리
    };
  }, []);

  return {
    flowState,
    remainingTime,
    isPaused,
    startFlow,
    pauseFlow,
    resumeFlow,
    stopFlow,
    playAnswerAndNext,
    getDisplayInfo,
    getAllowedActions
  };
};