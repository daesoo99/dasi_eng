/**
 * Performance Monitoring Hook
 * @description IPerformancePlugin을 사용한 성능 모니터링 React Hook
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + 인터페이스 우선 설계
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPerformancePlugin } from '@/plugins/PluginManager';
import {
  IPerformancePlugin,
  PerformanceStats,
  PerformanceEvent,
  PerformanceEventHandler
} from '@/plugins/performance/IPerformancePlugin';
import { logInfo, logError, LogCategory } from '@/utils/index';

// Hook 상태 타입
export interface UsePerformanceMonitoringState {
  plugin: IPerformancePlugin | null;
  isPluginReady: boolean;
  pluginError: string | null;
  isMonitoring: boolean;
  stats: PerformanceStats | null;
}

// Hook 액션 타입
export interface UsePerformanceMonitoringActions {
  // ✅ CLAUDE.local 준수: 플러그인을 통한 오디오 지연 측정
  measureAudioLatency: () => Promise<string | null>;
  endAudioLatency: (measurementId: string, transcription?: string) => Promise<number>;
  
  // ✅ CLAUDE.local 준수: measureAudio 기능 (오디오 성능 점수)
  measureAudio: (latencyMs: number, transcription?: string) => Promise<number>;
  
  // API 및 렌더링 측정
  measureRender: (componentName: string, propsCount: number, reason?: string) => () => void;
  measureAPI: <T>(endpoint: string, method: string, apiCall: () => Promise<T>) => Promise<T>;
  
  // 성능 보고서
  generateReport: () => Promise<any>;
  getStats: () => Promise<PerformanceStats | null>;
  
  // 모니터링 제어
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => void;
  
  // 설정 관리
  updateThresholds: (thresholds: {
    audioLatency?: number;
    apiResponseTime?: number;
    renderTime?: number;
    memoryUsage?: number;
  }) => Promise<boolean>;
}

// Hook 반환 타입
export type UsePerformanceMonitoringReturn = UsePerformanceMonitoringState & UsePerformanceMonitoringActions;

/**
 * Performance Monitoring Hook
 * ✅ CLAUDE.local 준수: 플러그인 우선 아키텍처
 * @param componentName 컴포넌트 이름 (렌더링 측정용)
 */
export const usePerformanceMonitoring = (componentName?: string): UsePerformanceMonitoringReturn => {
  // State
  const [state, setState] = useState<UsePerformanceMonitoringState>({
    plugin: null,
    isPluginReady: false,
    pluginError: null,
    isMonitoring: false,
    stats: null
  });
  
  // Refs
  const eventHandlersRef = useRef<Set<PerformanceEventHandler>>(new Set());
  const isMountedRef = useRef(true);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // 이벤트 핸들러 정리
      if (state.plugin) {
        eventHandlersRef.current.forEach(handler => {
          state.plugin!.offPerformanceEvent(handler);
        });
        eventHandlersRef.current.clear();
      }
    };
  }, [state.plugin]);

  // Safe state update
  const safeSetState = useCallback((updater: Partial<UsePerformanceMonitoringState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updater }));
    }
  }, []);

  // 플러그인 초기화
  const initializePlugin = useCallback(async (): Promise<boolean> => {
    if (state.plugin && state.isPluginReady) {
      return true;
    }

    try {
      logInfo(LogCategory.PERFORMANCE, 'Initializing Performance Plugin...');
      
      const pluginResult = await getPerformancePlugin();
      if (!pluginResult.success) {
        throw pluginResult.error;
      }

      const plugin = pluginResult.data;
      
      // 이벤트 핸들러 설정
      const eventHandler: PerformanceEventHandler = (event: PerformanceEvent) => {
        if (event.type === 'threshold_exceeded' || event.type === 'warning') {
          logInfo(LogCategory.PERFORMANCE, 'Performance alert', event.data);
        }
      };
      
      plugin.onPerformanceEvent(eventHandler);
      eventHandlersRef.current.add(eventHandler);
      
      // 모니터링 시작
      const startResult = plugin.startMonitoring();
      if (!startResult.success) {
        throw startResult.error;
      }

      safeSetState({
        plugin,
        isPluginReady: true,
        pluginError: null,
        isMonitoring: plugin.isMonitoring()
      });

      logInfo(LogCategory.PERFORMANCE, 'Performance Plugin initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize plugin';
      logError(LogCategory.PERFORMANCE, 'Performance Plugin initialization failed', error);
      
      safeSetState({
        plugin: null,
        isPluginReady: false,
        pluginError: errorMessage
      });
      
      return false;
    }
  }, [state.plugin, state.isPluginReady, safeSetState]);

  // 플러그인 자동 초기화
  useEffect(() => {
    if (!state.plugin && !state.pluginError) {
      initializePlugin();
    }
  }, [state.plugin, state.pluginError, initializePlugin]);

  // ✅ CLAUDE.local 준수: 플러그인을 통한 오디오 지연 측정
  const measureAudioLatency = useCallback(async (): Promise<string | null> => {
    if (!state.plugin || !state.isPluginReady) {
      logError(LogCategory.PERFORMANCE, 'Performance plugin not ready for audio measurement');
      return null;
    }

    try {
      const result = await state.plugin.measureAudioLatency();
      if (result.success) {
        return result.data;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to start audio latency measurement', result.error);
        return null;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Audio latency measurement error', error);
      return null;
    }
  }, [state.plugin, state.isPluginReady]);

  const endAudioLatency = useCallback(async (measurementId: string, transcription?: string): Promise<number> => {
    if (!state.plugin || !state.isPluginReady) {
      logError(LogCategory.PERFORMANCE, 'Performance plugin not ready for ending audio measurement');
      return 0;
    }

    try {
      const result = await state.plugin.endAudioLatency(measurementId, transcription);
      if (result.success) {
        logInfo(LogCategory.PERFORMANCE, 'Audio latency measurement completed', {
          measurementId,
          latency: result.data.totalLatency,
          score: result.data.performanceScore
        });
        return result.data.performanceScore;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to end audio latency measurement', result.error);
        return 0;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'End audio latency measurement error', error);
      return 0;
    }
  }, [state.plugin, state.isPluginReady]);

  // ✅ CLAUDE.local 준수: measureAudio 기능 (오디오 성능 점수 계산)
  const measureAudio = useCallback(async (latencyMs: number, transcription?: string): Promise<number> => {
    if (!state.plugin || !state.isPluginReady) {
      return 0;
    }

    try {
      const result = await state.plugin.calculateAudioScore(latencyMs, transcription);
      if (result.success) {
        return result.data;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to calculate audio score', result.error);
        return 0;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Audio score calculation error', error);
      return 0;
    }
  }, [state.plugin, state.isPluginReady]);

  // 렌더링 측정
  const measureRender = useCallback((
    compName: string, 
    propsCount: number, 
    reason?: string
  ): (() => void) => {
    if (!state.plugin || !state.isPluginReady) {
      return () => {}; // no-op
    }

    const name = compName || componentName || 'Unknown';
    const result = state.plugin.measureComponentRender(name, propsCount, reason);
    
    if (result.success) {
      return result.data;
    } else {
      logError(LogCategory.PERFORMANCE, 'Failed to start render measurement', result.error);
      return () => {};
    }
  }, [state.plugin, state.isPluginReady, componentName]);

  // API 측정
  const measureAPI = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    if (!state.plugin || !state.isPluginReady) {
      // 플러그인이 준비되지 않은 경우 그냥 API 호출 실행
      return apiCall();
    }

    try {
      const result = await state.plugin.measureAPICall(endpoint, method, apiCall);
      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'API measurement error', error);
      throw error;
    }
  }, [state.plugin, state.isPluginReady]);

  // 성능 보고서 생성
  const generateReport = useCallback(async () => {
    if (!state.plugin || !state.isPluginReady) {
      return null;
    }

    try {
      const result = await state.plugin.generatePerformanceReport();
      if (result.success) {
        return result.data;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to generate performance report', result.error);
        return null;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Performance report generation error', error);
      return null;
    }
  }, [state.plugin, state.isPluginReady]);

  // 성능 통계 조회
  const getStats = useCallback(async (): Promise<PerformanceStats | null> => {
    if (!state.plugin || !state.isPluginReady) {
      return null;
    }

    try {
      const result = await state.plugin.getPerformanceStats();
      if (result.success) {
        safeSetState({ stats: result.data });
        return result.data;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to get performance stats', result.error);
        return null;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Performance stats retrieval error', error);
      return null;
    }
  }, [state.plugin, state.isPluginReady, safeSetState]);

  // 모니터링 시작
  const startMonitoring = useCallback(async (): Promise<boolean> => {
    if (!state.plugin) {
      const initSuccess = await initializePlugin();
      if (!initSuccess) {
        return false;
      }
    }

    if (!state.plugin || !state.isPluginReady) {
      return false;
    }

    try {
      const result = state.plugin.startMonitoring();
      if (result.success) {
        safeSetState({ isMonitoring: true });
        return true;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to start monitoring', result.error);
        return false;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Start monitoring error', error);
      return false;
    }
  }, [state.plugin, state.isPluginReady, initializePlugin, safeSetState]);

  // 모니터링 중지
  const stopMonitoring = useCallback(() => {
    if (!state.plugin || !state.isPluginReady) {
      return;
    }

    try {
      const result = state.plugin.stopMonitoring();
      if (result.success) {
        safeSetState({ isMonitoring: false });
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to stop monitoring', result.error);
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Stop monitoring error', error);
    }
  }, [state.plugin, state.isPluginReady, safeSetState]);

  // ✅ CLAUDE.local 준수: 설정 기반 임계값 동적 변경
  const updateThresholds = useCallback(async (thresholds: {
    audioLatency?: number;
    apiResponseTime?: number;
    renderTime?: number;
    memoryUsage?: number;
  }): Promise<boolean> => {
    if (!state.plugin || !state.isPluginReady) {
      return false;
    }

    try {
      const result = state.plugin.updateThresholds(thresholds);
      if (result.success) {
        logInfo(LogCategory.PERFORMANCE, 'Performance thresholds updated', thresholds);
        return true;
      } else {
        logError(LogCategory.PERFORMANCE, 'Failed to update thresholds', result.error);
        return false;
      }
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Threshold update error', error);
      return false;
    }
  }, [state.plugin, state.isPluginReady]);

  return {
    // State
    ...state,
    
    // Actions
    measureAudioLatency,
    endAudioLatency,
    measureAudio,
    measureRender,
    measureAPI,
    generateReport,
    getStats,
    startMonitoring,
    stopMonitoring,
    updateThresholds
  };
};

export default usePerformanceMonitoring;