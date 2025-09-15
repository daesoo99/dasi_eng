/**
 * Performance Plugin Factory
 * @description Performance Plugin 생성 및 관리를 담당하는 팩토리
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + 팩토리 패턴
 */

import { Result } from '@/types/core';
import { IPerformancePlugin, IPerformancePluginFactory, PerformancePluginConfig } from './IPerformancePlugin';
import { PerformancePlugin } from './PerformancePlugin';
import { logInfo, logError, LogCategory } from '@/utils/index';

export class PerformancePluginFactory implements IPerformancePluginFactory {
  readonly pluginType = 'performance' as const;
  readonly implementation = 'browser' as const;

  async create(config?: PerformancePluginConfig): Promise<Result<IPerformancePlugin>> {
    try {
      // 설정 유효성 검증
      if (config) {
        const validationResult = this.validateConfig(config);
        if (!validationResult.success) {
          return validationResult;
        }
      }

      // 브라우저 지원 확인
      if (!this.isSupported()) {
        return {
          success: false,
          error: new Error('Performance API가 지원되지 않는 브라우저입니다')
        };
      }

      logInfo(LogCategory.PERFORMANCE, 'Creating Performance Plugin', { config });

      const plugin = new PerformancePlugin(config);
      const initResult = await plugin.initialize();
      
      if (!initResult.success) {
        return {
          success: false,
          error: new Error(`Performance Plugin 초기화 실패: ${initResult.error?.message}`)
        };
      }

      logInfo(LogCategory.PERFORMANCE, 'Performance Plugin 생성 완료');
      return { success: true, data: plugin };
    } catch (error) {
      const errorMessage = `Performance Plugin 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logError(LogCategory.PERFORMANCE, errorMessage, error);
      return { success: false, error: new Error(errorMessage) };
    }
  }

  validateConfig(config: PerformancePluginConfig): Result<void> {
    try {
      // 임계값 검증
      if (config.latencyThresholds) {
        const { audio, api, render } = config.latencyThresholds;
        
        if (audio !== undefined && (audio <= 0 || audio > 10000)) {
          return { success: false, error: new Error('Audio latency threshold must be between 0 and 10000ms') };
        }
        
        if (api !== undefined && (api <= 0 || api > 30000)) {
          return { success: false, error: new Error('API latency threshold must be between 0 and 30000ms') };
        }
        
        if (render !== undefined && (render <= 0 || render > 1000)) {
          return { success: false, error: new Error('Render latency threshold must be between 0 and 1000ms') };
        }
      }

      // 메모리 임계값 검증
      if (config.memoryWarningThreshold !== undefined) {
        if (config.memoryWarningThreshold < 0 || config.memoryWarningThreshold > 1) {
          return { success: false, error: new Error('Memory warning threshold must be between 0 and 1') };
        }
      }

      // 최대 메트릭 수 검증
      if (config.maxMetricsCount !== undefined) {
        if (config.maxMetricsCount < 10 || config.maxMetricsCount > 10000) {
          return { success: false, error: new Error('Max metrics count must be between 10 and 10000') };
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  isSupported(): boolean {
    // Performance API 기본 지원 확인
    if (typeof performance === 'undefined') {
      return false;
    }

    // 필수 Performance API 확인
    const requiredAPIs = [
      'performance.now',
      'performance.mark',
      'performance.measure',
      'performance.getEntriesByName'
    ];

    for (const api of requiredAPIs) {
      const parts = api.split('.');
      let obj: any = window;
      
      for (const part of parts) {
        if (!(part in obj)) {
          return false;
        }
        obj = obj[part];
      }
      
      if (typeof obj !== 'function') {
        return false;
      }
    }

    return true;
  }

  checkAPISupport() {
    return {
      performanceObserver: 'PerformanceObserver' in window,
      memoryAPI: 'memory' in performance,
      performanceMarks: 'mark' in performance,
      userTiming: 'measure' in performance
    };
  }
}

// 팩토리 싱글톤 인스턴스
export const performancePluginFactory = new PerformancePluginFactory();