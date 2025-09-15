/**
 * Speed Training Hook
 * @description SpeedTrainingPlugin을 React 컴포넌트에서 쉽게 사용할 수 있는 Hook
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + React Hook 패턴
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSpeedTrainingPlugin } from '@/plugins/PluginManager';
import { useAppStore } from '@/store/useAppStore';
import {
  ISpeedTrainingPlugin,
  SpeedSessionOptions,
  SpeedTrainingResults,
  SpeedTrainingEvent,
  SpeedTrainingEventHandler
} from '@/plugins/speed/ISpeedTrainingPlugin';
import {
  SpeedSession,
  SpeedResult,
  DifficultyMode
} from '@/services/speedDifficultyModes';

// Hook 상태 타입
export interface UseSpeedTrainingState {
  plugin: ISpeedTrainingPlugin | null;
  isPluginLoading: boolean;
  isPluginReady: boolean;
  pluginError: string | null;
  currentSession: SpeedSession | null;
  sessionProgress: {
    currentQuestionIndex: number;
    totalQuestions: number;
    correctAnswers: number;
    timeElapsed: number;
    estimatedTimeRemaining: number;
  } | null;
  isSessionActive: boolean;
  isProcessingAnswer: boolean;
}

// Hook 액션 타입
export interface UseSpeedTrainingActions {
  initializePlugin: () => Promise<boolean>;
  createSession: (options: SpeedSessionOptions) => Promise<SpeedSession | null>;
  processAnswer: (questionId: string, userAnswer: string, responseTime: number) => Promise<SpeedResult | null>;
  completeSession: () => Promise<SpeedTrainingResults | null>;
  getSessionProgress: () => Promise<void>;
  getPerformanceStats: () => Promise<any>;
  getRecommendedSettings: () => Promise<any>;
  resetSession: () => void;
  addEventListener: (handler: SpeedTrainingEventHandler) => void;
  removeEventListener: (handler: SpeedTrainingEventHandler) => void;
}

// Hook 반환 타입
export type UseSpeedTrainingReturn = UseSpeedTrainingState & UseSpeedTrainingActions;

// Default state
const DEFAULT_STATE: UseSpeedTrainingState = {
  plugin: null,
  isPluginLoading: false,
  isPluginReady: false,
  pluginError: null,
  currentSession: null,
  sessionProgress: null,
  isSessionActive: false,
  isProcessingAnswer: false
};

/**
 * Speed Training Hook
 * @param autoInitialize 자동으로 플러그인 초기화 여부 (기본값: true)
 */
export const useSpeedTraining = (autoInitialize: boolean = true): UseSpeedTrainingReturn => {
  // State
  const [state, setState] = useState<UseSpeedTrainingState>(DEFAULT_STATE);
  
  // Auth state
  const { user } = useAppStore();
  
  // Refs for cleanup
  const eventHandlersRef = useRef<Set<SpeedTrainingEventHandler>>(new Set());
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Remove all event listeners
      if (state.plugin) {
        eventHandlersRef.current.forEach(handler => {
          state.plugin!.offSessionEvent(handler);
        });
        eventHandlersRef.current.clear();
      }
    };
  }, [state.plugin]);

  // Safe state update (prevent updates after unmount)
  const safeSetState = useCallback((updater: Partial<UseSpeedTrainingState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updater }));
    }
  }, []);

  // Plugin 초기화
  const initializePlugin = useCallback(async (): Promise<boolean> => {
    if (state.plugin && state.isPluginReady) {
      return true;
    }

    safeSetState({ 
      isPluginLoading: true, 
      pluginError: null 
    });

    try {
      console.log('🚀 Initializing Speed Training Plugin...');
      
      const pluginResult = await getSpeedTrainingPlugin();
      if (!pluginResult.success) {
        throw pluginResult.error;
      }

      const plugin = pluginResult.data;
      
      safeSetState({
        plugin,
        isPluginLoading: false,
        isPluginReady: true,
        pluginError: null
      });

      console.log('✅ Speed Training Plugin initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize plugin';
      console.error('❌ Speed Training Plugin initialization failed:', error);
      
      safeSetState({
        plugin: null,
        isPluginLoading: false,
        isPluginReady: false,
        pluginError: errorMessage
      });
      
      return false;
    }
  }, [state.plugin, state.isPluginReady, safeSetState]);

  // Auto-initialization
  useEffect(() => {
    if (autoInitialize && !state.plugin && !state.isPluginLoading) {
      initializePlugin();
    }
  }, [autoInitialize, state.plugin, state.isPluginLoading, initializePlugin]);

  // 세션 생성
  const createSession = useCallback(async (options: SpeedSessionOptions): Promise<SpeedSession | null> => {
    if (!state.plugin || !state.isPluginReady) {
      console.warn('⚠️ Speed Training Plugin not ready');
      return null;
    }

    try {
      console.log('🎯 Creating speed training session...', options);
      
      const sessionResult = await state.plugin.createSession(options);
      if (!sessionResult.success) {
        throw sessionResult.error;
      }

      const session = sessionResult.data;
      
      safeSetState({
        currentSession: session,
        isSessionActive: true,
        sessionProgress: {
          currentQuestionIndex: 0,
          totalQuestions: session.questions.length,
          correctAnswers: 0,
          timeElapsed: 0,
          estimatedTimeRemaining: session.questions.length * 5000 // 기본 5초 추정
        }
      });

      console.log('✅ Speed training session created:', session.sessionId);
      return session;
    } catch (error) {
      console.error('❌ Failed to create speed training session:', error);
      return null;
    }
  }, [state.plugin, state.isPluginReady, safeSetState]);

  // 답변 처리
  const processAnswer = useCallback(async (
    questionId: string,
    userAnswer: string,
    responseTime: number
  ): Promise<SpeedResult | null> => {
    if (!state.plugin || !state.currentSession) {
      console.warn('⚠️ No active session or plugin not ready');
      return null;
    }

    safeSetState({ isProcessingAnswer: true });

    try {
      console.log('📝 Processing answer...', { questionId, userAnswer, responseTime });
      
      const resultData = await state.plugin.processAnswer(
        state.currentSession.sessionId,
        questionId,
        userAnswer,
        responseTime
      );

      if (!resultData.success) {
        throw resultData.error;
      }

      const result = resultData.data;
      
      // Update session progress
      await getSessionProgress();

      safeSetState({ isProcessingAnswer: false });
      
      console.log('✅ Answer processed:', { 
        isCorrect: result.isCorrect,
        bonusPoints: result.bonusPoints 
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to process answer:', error);
      safeSetState({ isProcessingAnswer: false });
      return null;
    }
  }, [state.plugin, state.currentSession, safeSetState]);

  // 세션 완료
  const completeSession = useCallback(async (): Promise<SpeedTrainingResults | null> => {
    if (!state.plugin || !state.currentSession) {
      console.warn('⚠️ No active session or plugin not ready');
      return null;
    }

    try {
      console.log('🏁 Completing speed training session...');
      
      const resultsData = await state.plugin.completeSession(state.currentSession.sessionId);
      if (!resultsData.success) {
        throw resultsData.error;
      }

      const results = resultsData.data;
      
      safeSetState({
        isSessionActive: false,
        currentSession: null,
        sessionProgress: null
      });

      console.log('✅ Speed training session completed:', {
        totalScore: results.totalScore,
        accuracy: results.accuracy,
        bonusPoints: results.bonusPoints
      });
      
      return results;
    } catch (error) {
      console.error('❌ Failed to complete session:', error);
      return null;
    }
  }, [state.plugin, state.currentSession, safeSetState]);

  // 진행 상황 조회
  const getSessionProgress = useCallback(async (): Promise<void> => {
    if (!state.plugin || !state.currentSession) {
      return;
    }

    try {
      const progressResult = await state.plugin.getSessionProgress(state.currentSession.sessionId);
      if (progressResult.success) {
        safeSetState({
          sessionProgress: progressResult.data
        });
      }
    } catch (error) {
      console.error('❌ Failed to get session progress:', error);
    }
  }, [state.plugin, state.currentSession, safeSetState]);

  // 성능 통계 조회
  const getPerformanceStats = useCallback(async () => {
    if (!state.plugin) {
      return null;
    }

    try {
      const userId = user.id || 'anonymous';
      const statsResult = await state.plugin.getPerformanceStats(userId);
      return statsResult.success ? statsResult.data : null;
    } catch (error) {
      console.error('❌ Failed to get performance stats:', error);
      return null;
    }
  }, [state.plugin, user.id]);

  // 추천 설정 조회
  const getRecommendedSettings = useCallback(async () => {
    if (!state.plugin) {
      return null;
    }

    try {
      const userId = user.id || 'anonymous';
      const settingsResult = await state.plugin.getRecommendedSettings(userId);
      return settingsResult.success ? settingsResult.data : null;
    } catch (error) {
      console.error('❌ Failed to get recommended settings:', error);
      return null;
    }
  }, [state.plugin, user.id]);

  // 세션 리셋
  const resetSession = useCallback(() => {
    safeSetState({
      currentSession: null,
      sessionProgress: null,
      isSessionActive: false,
      isProcessingAnswer: false
    });
  }, [safeSetState]);

  // 이벤트 리스너 추가
  const addEventListener = useCallback((handler: SpeedTrainingEventHandler) => {
    if (state.plugin) {
      state.plugin.onSessionEvent(handler);
      eventHandlersRef.current.add(handler);
    }
  }, [state.plugin]);

  // 이벤트 리스너 제거
  const removeEventListener = useCallback((handler: SpeedTrainingEventHandler) => {
    if (state.plugin) {
      state.plugin.offSessionEvent(handler);
      eventHandlersRef.current.delete(handler);
    }
  }, [state.plugin]);

  return {
    // State
    ...state,
    
    // Actions
    initializePlugin,
    createSession,
    processAnswer,
    completeSession,
    getSessionProgress,
    getPerformanceStats,
    getRecommendedSettings,
    resetSession,
    addEventListener,
    removeEventListener
  };
};