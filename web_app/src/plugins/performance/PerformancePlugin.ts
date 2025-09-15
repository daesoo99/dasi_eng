/**
 * Performance Monitoring Plugin Implementation
 * @description 성능 측정 및 모니터링을 위한 플러그인 구현체
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + 하드코딩 제거
 */

import { BasePlugin } from '@/plugins/core/BasePlugin';
import { Result } from '@/types/core';
import {
  IPerformancePlugin,
  PerformancePluginConfig,
  PerformanceMetric,
  AudioLatencyResult,
  PerformanceStats,
  PerformanceEvent,
  PerformanceEventHandler,
  PerformanceMeasurementEvent,
  PerformanceMeasurementHandler
} from './IPerformancePlugin';
import { logInfo, logWarn, logError, LogCategory } from '@/utils/index';

// Default configuration (✅ CLAUDE.local: 하드코딩 제거)
const DEFAULT_CONFIG: Required<PerformancePluginConfig> = {
  enableAudioTracking: true,
  enableAPITracking: true,
  enableRenderTracking: true,
  enableMemoryTracking: true,
  maxMetricsCount: 1000,
  latencyThresholds: {
    audio: 2000,  // configurable from 2000ms hardcode
    api: 3000,    // configurable from 3000ms hardcode
    render: 16    // configurable from 16ms hardcode
  },
  memoryWarningThreshold: 0.8 // configurable from 80% hardcode
};

export class PerformancePlugin extends BasePlugin implements IPerformancePlugin {
  private metrics: PerformanceMetric[] = [];
  private audioMeasurements: Map<string, { startTime: number; startMark: string }> = new Map();
  private eventHandlers: Set<PerformanceEventHandler> = new Set();
  private measurementHandlers: Set<PerformanceMeasurementHandler> = new Set();
  private performanceObserver?: PerformanceObserver;
  private memoryMonitoringInterval?: NodeJS.Timeout;
  private isMonitoringActive = false;

  // ✅ CLAUDE.local 준수: 설정 기반 동작
  private config: Required<PerformancePluginConfig>;

  constructor(config?: PerformancePluginConfig) {
    super('performance-plugin', '1.0.0');
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<Result<void>> {
    try {
      logInfo(LogCategory.PERFORMANCE, 'Performance Plugin 초기화 시작', { 
        config: this.config 
      });

      if (this.config.enableRenderTracking || this.config.enableAPITracking) {
        this.initializePerformanceObserver();
      }

      if (this.config.enableMemoryTracking) {
        this.startMemoryMonitoring();
      }

      this.isInitialized = true;
      logInfo(LogCategory.PERFORMANCE, 'Performance Plugin 초기화 완료');
      
      return { success: true, data: undefined };
    } catch (error) {
      const message = '성능 플러그인 초기화 실패';
      logError(LogCategory.PERFORMANCE, message, error);
      return { success: false, error: new Error(message) };
    }
  }

  async dispose(): Promise<Result<void>> {
    try {
      this.stopMonitoring();
      this.eventHandlers.clear();
      this.measurementHandlers.clear();
      this.audioMeasurements.clear();
      this.clearMetrics();

      this.isInitialized = false;
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // ✅ 오디오 지연 측정 (플러그인 기반)
  async measureAudioLatency(): Promise<Result<string>> {
    if (!this.isInitialized || !this.config.enableAudioTracking) {
      return { success: false, error: new Error('Audio tracking disabled') };
    }

    try {
      const measurementId = `audio_latency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startMark = `${measurementId}_start`;
      
      performance.mark(startMark);
      
      this.audioMeasurements.set(measurementId, {
        startTime: performance.now(),
        startMark
      });

      // 이벤트 발생
      this.emitMeasurementEvent({
        measurementId,
        type: 'audio',
        phase: 'start',
        timestamp: Date.now()
      });

      logInfo(LogCategory.PERFORMANCE, 'Audio latency measurement started', { measurementId });
      
      return { success: true, data: measurementId };
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Failed to start audio latency measurement', error);
      return { success: false, error: error as Error };
    }
  }

  async endAudioLatency(measurementId: string, transcription?: string): Promise<Result<AudioLatencyResult>> {
    if (!this.isInitialized || !this.config.enableAudioTracking) {
      return { success: false, error: new Error('Audio tracking disabled') };
    }

    const measurement = this.audioMeasurements.get(measurementId);
    if (!measurement) {
      return { success: false, error: new Error('Measurement not found') };
    }

    try {
      const endMark = `${measurementId}_end`;
      performance.mark(endMark);
      performance.measure(measurementId, measurement.startMark, endMark);

      const measure = performance.getEntriesByName(measurementId)[0];
      const endTime = performance.now();
      const totalLatency = measure.duration;

      // ✅ CLAUDE.local 준수: 설정 기반 점수 계산
      const performanceScore = await this.calculateAudioScore(totalLatency, transcription);
      
      const result: AudioLatencyResult = {
        measurementId,
        startTime: measurement.startTime,
        endTime,
        totalLatency,
        transcription,
        performanceScore: performanceScore.success ? performanceScore.data : 0
      };

      // 메트릭 추가
      this.addMetric({
        name: 'audio_latency',
        value: totalLatency,
        timestamp: Date.now(),
        category: 'audio',
        unit: 'ms',
        tags: {
          measurementId,
          transcription: transcription?.substring(0, 50) || 'unknown'
        }
      });

      // ✅ CLAUDE.local 준수: 설정 기반 임계값 체크
      if (totalLatency > this.config.latencyThresholds.audio!) {
        this.emitPerformanceEvent({
          type: 'threshold_exceeded',
          timestamp: Date.now(),
          data: {
            threshold: this.config.latencyThresholds.audio,
            actualValue: totalLatency,
            message: '음성 인식 지연시간이 임계값을 초과했습니다'
          }
        });
      }

      // 이벤트 발생
      this.emitMeasurementEvent({
        measurementId,
        type: 'audio',
        phase: 'end',
        timestamp: Date.now(),
        data: result
      });

      // 정리
      this.audioMeasurements.delete(measurementId);
      performance.clearMarks(measurement.startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measurementId);

      logInfo(LogCategory.PERFORMANCE, 'Audio latency measurement completed', { 
        measurementId, 
        totalLatency,
        performanceScore: result.performanceScore
      });

      return { success: true, data: result };
    } catch (error) {
      logError(LogCategory.PERFORMANCE, 'Failed to end audio latency measurement', error);
      return { success: false, error: error as Error };
    }
  }

  // ✅ measureAudio 기능 (설정 기반 점수 계산)
  async calculateAudioScore(latencyMs: number, transcription?: string): Promise<Result<number>> {
    try {
      let score = 100;
      const threshold = this.config.latencyThresholds.audio!;
      
      // ✅ CLAUDE.local 준수: 설정 기반 점수 계산 (하드코딩 제거)
      if (latencyMs > threshold * 1.5) {
        score = Math.max(0, score - 40); // 3000ms 이상
      } else if (latencyMs > threshold) {
        score = Math.max(0, score - 20); // 2000ms 이상
      } else if (latencyMs > threshold * 0.5) {
        score = Math.max(0, score - 10); // 1000ms 이상
      }

      // 전사 품질 보너스
      if (transcription && transcription.length > 0) {
        score = Math.min(100, score + 5);
      }

      return { success: true, data: score };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // API 호출 측정
  async measureAPICall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<Result<T>> {
    if (!this.config.enableAPITracking) {
      // API tracking disabled, just execute the call
      try {
        const result = await apiCall();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    }

    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      this.addMetric({
        name: `api_${endpoint.replace(/\//g, '_')}`,
        value: duration,
        timestamp: Date.now(),
        category: 'api',
        unit: 'ms',
        tags: { method, endpoint, status: '200' }
      });

      // ✅ 설정 기반 임계값 체크
      if (duration > this.config.latencyThresholds.api!) {
        this.emitPerformanceEvent({
          type: 'threshold_exceeded',
          timestamp: Date.now(),
          data: {
            threshold: this.config.latencyThresholds.api,
            actualValue: duration,
            message: `API ${endpoint} 응답시간이 임계값을 초과했습니다`
          }
        });
      }

      return { success: true, data: result };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.addMetric({
        name: `api_error_${endpoint.replace(/\//g, '_')}`,
        value: duration,
        timestamp: Date.now(),
        category: 'api',
        unit: 'ms',
        tags: { 
          method, 
          endpoint, 
          status: '500',
          error: (error as Error).message 
        }
      });

      return { success: false, error: error as Error };
    }
  }

  // 렌더링 측정
  measureComponentRender(
    componentName: string,
    propsCount: number,
    reRenderReason?: string
  ): Result<() => void> {
    if (!this.config.enableRenderTracking) {
      return { success: true, data: () => {} }; // no-op
    }

    const startTime = performance.now();
    
    return {
      success: true,
      data: () => {
        const duration = performance.now() - startTime;
        
        this.addMetric({
          name: `component_render_${componentName}`,
          value: duration,
          timestamp: Date.now(),
          category: 'rendering',
          unit: 'ms',
          tags: {
            componentName,
            propsCount: propsCount.toString(),
            reRenderReason: reRenderReason || 'unknown'
          }
        });

        // ✅ 설정 기반 임계값 체크
        if (duration > this.config.latencyThresholds.render!) {
          this.emitPerformanceEvent({
            type: 'threshold_exceeded',
            timestamp: Date.now(),
            data: {
              threshold: this.config.latencyThresholds.render,
              actualValue: duration,
              message: `컴포넌트 ${componentName} 렌더링이 임계값을 초과했습니다`
            }
          });
        }
      }
    };
  }

  // 성능 통계 조회
  async getPerformanceStats(): Promise<Result<PerformanceStats>> {
    try {
      const audioMetrics = this.metrics.filter(m => m.category === 'audio');
      const apiMetrics = this.metrics.filter(m => m.category === 'api');
      const renderMetrics = this.metrics.filter(m => m.category === 'rendering');
      
      const stats: PerformanceStats = {
        audioPerformance: {
          averageLatency: this.calculateAverage(audioMetrics.map(m => m.value)),
          totalMeasurements: audioMetrics.length,
          performanceScore: this.calculateAverageScore(audioMetrics)
        },
        apiPerformance: {
          averageResponseTime: this.calculateAverage(apiMetrics.map(m => m.value)),
          totalCalls: apiMetrics.length,
          errorRate: this.calculateErrorRate(apiMetrics)
        },
        rendering: {
          averageRenderTime: this.calculateAverage(renderMetrics.map(m => m.value)),
          slowRendersCount: renderMetrics.filter(m => m.value > this.config.latencyThresholds.render!).length,
          totalRenders: renderMetrics.length
        },
        memory: {
          currentUsage: this.getCurrentMemoryUsage(),
          peakUsage: this.getPeakMemoryUsage(),
          averageUsage: this.getAverageMemoryUsage()
        }
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // 성능 보고서 생성
  async generatePerformanceReport(): Promise<Result<{
    readonly timestamp: string;
    readonly overallScore: number;
    readonly issues: readonly string[];
    readonly recommendations: readonly string[];
    readonly details: PerformanceStats;
  }>> {
    const statsResult = await this.getPerformanceStats();
    if (!statsResult.success) {
      return statsResult;
    }

    const stats = statsResult.data;
    const issues = this.identifyPerformanceIssues(stats);
    const recommendations = this.generateRecommendations(stats);
    const overallScore = this.calculateOverallScore(stats);

    const report = {
      timestamp: new Date().toISOString(),
      overallScore,
      issues,
      recommendations,
      details: stats
    };

    logInfo(LogCategory.PERFORMANCE, 'Performance report generated', {
      overallScore,
      issuesCount: issues.length,
      recommendationsCount: recommendations.length
    });

    return { success: true, data: report };
  }

  // 메트릭 관리
  addMetric(metric: PerformanceMetric): Result<void> {
    try {
      if (this.metrics.length >= this.config.maxMetricsCount) {
        this.metrics.shift();
      }
      this.metrics.push(metric);

      this.emitPerformanceEvent({
        type: 'metric',
        timestamp: Date.now(),
        data: { metric }
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async exportMetrics(): Promise<Result<readonly PerformanceMetric[]>> {
    return { success: true, data: [...this.metrics] };
  }

  clearMetrics(): Result<void> {
    this.metrics = [];
    return { success: true, data: undefined };
  }

  // 이벤트 핸들러
  onPerformanceEvent(handler: PerformanceEventHandler): void {
    this.eventHandlers.add(handler);
  }

  offPerformanceEvent(handler: PerformanceEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  // ✅ CLAUDE.local 준수: 설정 동적 변경
  updateThresholds(thresholds: {
    audioLatency?: number;
    apiResponseTime?: number;
    renderTime?: number;
    memoryUsage?: number;
  }): Result<void> {
    try {
      if (thresholds.audioLatency !== undefined) {
        this.config.latencyThresholds.audio = thresholds.audioLatency;
      }
      if (thresholds.apiResponseTime !== undefined) {
        this.config.latencyThresholds.api = thresholds.apiResponseTime;
      }
      if (thresholds.renderTime !== undefined) {
        this.config.latencyThresholds.render = thresholds.renderTime;
      }
      if (thresholds.memoryUsage !== undefined) {
        this.config.memoryWarningThreshold = thresholds.memoryUsage;
      }

      logInfo(LogCategory.PERFORMANCE, 'Performance thresholds updated', thresholds);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // 실시간 모니터링
  startMonitoring(): Result<void> {
    if (this.isMonitoringActive) {
      return { success: true, data: undefined };
    }

    this.isMonitoringActive = true;
    
    if (this.config.enableRenderTracking || this.config.enableAPITracking) {
      this.initializePerformanceObserver();
    }

    if (this.config.enableMemoryTracking) {
      this.startMemoryMonitoring();
    }

    return { success: true, data: undefined };
  }

  stopMonitoring(): Result<void> {
    this.isMonitoringActive = false;
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }

    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = undefined;
    }

    return { success: true, data: undefined };
  }

  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  // Private helper methods
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window && !this.performanceObserver) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.processPerformanceEntry(entry);
        });
      });

      try {
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'mark', 'paint', 'largest-contentful-paint']
        });
      } catch (error) {
        logWarn(LogCategory.PERFORMANCE, '일부 성능 메트릭을 관찰할 수 없습니다', error);
      }
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || 0,
      timestamp: entry.startTime + performance.timeOrigin,
      category: this.categorizeEntry(entry),
      unit: 'ms',
      tags: { entryType: entry.entryType }
    };

    this.addMetric(metric);
  }

  private categorizeEntry(entry: PerformanceEntry): PerformanceMetric['category'] {
    if (entry.entryType === 'resource') {
      return 'network';
    } else if (entry.entryType === 'paint' || entry.entryType === 'largest-contentful-paint') {
      return 'rendering';
    } else if (entry.name.includes('api') || entry.name.includes('fetch')) {
      return 'api';
    }
    return 'user_interaction';
  }

  private startMemoryMonitoring(): void {
    if ('memory' in performance && !this.memoryMonitoringInterval) {
      this.memoryMonitoringInterval = setInterval(() => {
        const memInfo = (performance as any).memory;
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (usageRatio > this.config.memoryWarningThreshold) {
          this.emitPerformanceEvent({
            type: 'warning',
            timestamp: Date.now(),
            data: {
              threshold: this.config.memoryWarningThreshold,
              actualValue: usageRatio,
              message: `높은 메모리 사용량 감지: ${(usageRatio * 100).toFixed(1)}%`
            }
          });
        }

        this.addMetric({
          name: 'memory_usage',
          value: usageRatio * 100,
          timestamp: Date.now(),
          category: 'memory',
          unit: 'percentage'
        });
      }, 10000);
    }
  }

  private emitPerformanceEvent(event: PerformanceEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        logError(LogCategory.PERFORMANCE, 'Performance event handler error', error);
      }
    });
  }

  private emitMeasurementEvent(event: PerformanceMeasurementEvent): void {
    this.measurementHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        logError(LogCategory.PERFORMANCE, 'Measurement event handler error', error);
      }
    });
  }

  // Statistical helper methods
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateAverageScore(metrics: PerformanceMetric[]): number {
    // Calculate performance score based on latency compared to thresholds
    if (metrics.length === 0) return 100;
    
    const scores = metrics.map(metric => {
      const threshold = this.config.latencyThresholds.audio!;
      if (metric.value <= threshold * 0.5) return 100;
      if (metric.value <= threshold) return 80;
      if (metric.value <= threshold * 1.5) return 60;
      return 40;
    });

    return this.calculateAverage(scores);
  }

  private calculateErrorRate(apiMetrics: PerformanceMetric[]): number {
    if (apiMetrics.length === 0) return 0;
    const errorCount = apiMetrics.filter(metric => 
      metric.tags?.status && parseInt(metric.tags.status) >= 400
    ).length;
    return (errorCount / apiMetrics.length) * 100;
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  private getPeakMemoryUsage(): number {
    const memoryMetrics = this.metrics.filter(m => m.category === 'memory');
    if (memoryMetrics.length === 0) return 0;
    return Math.max(...memoryMetrics.map(m => m.value));
  }

  private getAverageMemoryUsage(): number {
    const memoryMetrics = this.metrics.filter(m => m.category === 'memory');
    return this.calculateAverage(memoryMetrics.map(m => m.value));
  }

  private identifyPerformanceIssues(stats: PerformanceStats): string[] {
    const issues: string[] = [];

    if (stats.audioPerformance.averageLatency > this.config.latencyThresholds.audio!) {
      issues.push('음성 인식 지연시간이 과도합니다');
    }

    if (stats.apiPerformance.errorRate > 10) {
      issues.push('API 에러율이 높습니다');
    }

    if (stats.rendering.slowRendersCount > stats.rendering.totalRenders * 0.2) {
      issues.push('렌더링 성능이 저하되어 있습니다');
    }

    if (stats.memory.currentUsage > this.config.memoryWarningThreshold * 100) {
      issues.push('메모리 사용량이 높습니다');
    }

    return issues;
  }

  private generateRecommendations(stats: PerformanceStats): string[] {
    const recommendations: string[] = [];

    if (stats.audioPerformance.averageLatency > this.config.latencyThresholds.audio!) {
      recommendations.push('음성 인식 설정을 최적화하고 연속 모드를 고려해보세요');
    }

    if (stats.apiPerformance.averageResponseTime > this.config.latencyThresholds.api!) {
      recommendations.push('API 요청을 최적화하고 캐싱을 고려해보세요');
    }

    if (stats.rendering.slowRendersCount > 10) {
      recommendations.push('React.memo나 useMemo를 사용하여 불필요한 리렌더링을 방지하세요');
    }

    if (stats.memory.currentUsage > 60) {
      recommendations.push('메모리 누수를 확인하고 불필요한 객체 참조를 제거하세요');
    }

    return recommendations;
  }

  private calculateOverallScore(stats: PerformanceStats): number {
    let score = 100;

    // Audio performance (30%)
    const audioThreshold = this.config.latencyThresholds.audio!;
    if (stats.audioPerformance.averageLatency > audioThreshold * 1.5) score -= 20;
    else if (stats.audioPerformance.averageLatency > audioThreshold) score -= 10;
    else if (stats.audioPerformance.averageLatency > audioThreshold * 0.5) score -= 5;

    // API performance (25%)
    const apiThreshold = this.config.latencyThresholds.api!;
    if (stats.apiPerformance.averageResponseTime > apiThreshold * 1.67) score -= 15;
    else if (stats.apiPerformance.averageResponseTime > apiThreshold) score -= 10;
    else if (stats.apiPerformance.averageResponseTime > apiThreshold * 0.33) score -= 5;

    // Rendering performance (25%)
    const renderThreshold = this.config.latencyThresholds.render!;
    if (stats.rendering.averageRenderTime > renderThreshold * 3.1) score -= 15;
    else if (stats.rendering.averageRenderTime > renderThreshold * 1.9) score -= 10;
    else if (stats.rendering.averageRenderTime > renderThreshold) score -= 5;

    // Memory usage (20%)
    const memoryThreshold = this.config.memoryWarningThreshold * 100;
    if (stats.memory.currentUsage > memoryThreshold) score -= 15;
    else if (stats.memory.currentUsage > memoryThreshold * 0.75) score -= 10;
    else if (stats.memory.currentUsage > memoryThreshold * 0.5) score -= 5;

    return Math.max(0, score);
  }
}