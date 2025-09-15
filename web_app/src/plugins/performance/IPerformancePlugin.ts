/**
 * Performance Monitoring 플러그인 인터페이스
 * @description 성능 측정 및 모니터링 관련 플러그인들이 구현해야 하는 인터페이스
 * CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처 + 인터페이스 우선 설계
 */

import { IPlugin } from '@/plugins/core/IPlugin';
import { Result } from '@/types/core';

// 성능 메트릭 타입
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly timestamp: number;
  readonly category: 'network' | 'rendering' | 'memory' | 'audio' | 'api' | 'user_interaction';
  readonly unit: 'ms' | 'bytes' | 'count' | 'percentage';
  readonly tags?: Record<string, string>;
}

// 오디오 지연 측정 결과
export interface AudioLatencyResult {
  readonly measurementId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly totalLatency: number;
  readonly transcription?: string;
  readonly performanceScore: number; // 0-100
}

// 성능 설정
export interface PerformancePluginConfig {
  readonly enableAudioTracking?: boolean;
  readonly enableAPITracking?: boolean;
  readonly enableRenderTracking?: boolean;
  readonly enableMemoryTracking?: boolean;
  readonly maxMetricsCount?: number;
  readonly latencyThresholds?: {
    readonly audio?: number;
    readonly api?: number;
    readonly render?: number;
  };
  readonly memoryWarningThreshold?: number; // 0-1
}

// 성능 통계
export interface PerformanceStats {
  readonly audioPerformance: {
    readonly averageLatency: number;
    readonly totalMeasurements: number;
    readonly performanceScore: number;
  };
  readonly apiPerformance: {
    readonly averageResponseTime: number;
    readonly totalCalls: number;
    readonly errorRate: number;
  };
  readonly rendering: {
    readonly averageRenderTime: number;
    readonly slowRendersCount: number;
    readonly totalRenders: number;
  };
  readonly memory: {
    readonly currentUsage: number;
    readonly peakUsage: number;
    readonly averageUsage: number;
  };
}

// 성능 이벤트
export interface PerformanceEvent {
  readonly type: 'metric' | 'threshold_exceeded' | 'warning' | 'error';
  readonly timestamp: number;
  readonly data: {
    readonly metric?: PerformanceMetric;
    readonly threshold?: number;
    readonly actualValue?: number;
    readonly message?: string;
  };
}

export type PerformanceEventHandler = (event: PerformanceEvent) => void;

/**
 * Performance Monitoring 플러그인 인터페이스
 * ✅ CLAUDE.local 준수: 하드코딩 제거 + 설정 기반 동작
 */
export interface IPerformancePlugin extends IPlugin {
  // 오디오 지연 측정
  measureAudioLatency(): Promise<Result<string>>;
  endAudioLatency(measurementId: string, transcription?: string): Promise<Result<AudioLatencyResult>>;
  
  // 오디오 성능 점수 계산 (measureAudio 기능)
  calculateAudioScore(latencyMs: number, transcription?: string): Promise<Result<number>>;
  
  // API 호출 측정
  measureAPICall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<Result<T>>;
  
  // 렌더링 측정
  measureComponentRender(
    componentName: string,
    propsCount: number,
    reRenderReason?: string
  ): Result<() => void>;
  
  // 성능 통계 조회
  getPerformanceStats(): Promise<Result<PerformanceStats>>;
  
  // 성능 보고서 생성
  generatePerformanceReport(): Promise<Result<{
    readonly timestamp: string;
    readonly overallScore: number;
    readonly issues: readonly string[];
    readonly recommendations: readonly string[];
    readonly details: PerformanceStats;
  }>>;
  
  // 메트릭 관리
  addMetric(metric: PerformanceMetric): Result<void>;
  exportMetrics(): Promise<Result<readonly PerformanceMetric[]>>;
  clearMetrics(): Result<void>;
  
  // 이벤트 핸들러
  onPerformanceEvent(handler: PerformanceEventHandler): void;
  offPerformanceEvent(handler: PerformanceEventHandler): void;
  
  // 설정 관리 (✅ CLAUDE.local: 하드코딩 제거)
  updateThresholds(thresholds: {
    audioLatency?: number;
    apiResponseTime?: number;
    renderTime?: number;
    memoryUsage?: number;
  }): Result<void>;
  
  // 실시간 모니터링
  startMonitoring(): Result<void>;
  stopMonitoring(): Result<void>;
  isMonitoring(): boolean;
}

// Performance 플러그인 팩토리
export interface IPerformancePluginFactory {
  readonly pluginType: 'performance';
  readonly implementation: 'browser' | 'mock' | 'custom';
  
  create(config?: PerformancePluginConfig): Promise<Result<IPerformancePlugin>>;
  validateConfig(config: PerformancePluginConfig): Result<void>;
  
  // 브라우저 지원 확인
  isSupported(): boolean;
  
  // 성능 API 지원 확인
  checkAPISupport(): {
    readonly performanceObserver: boolean;
    readonly memoryAPI: boolean;
    readonly performanceMarks: boolean;
    readonly userTiming: boolean;
  };
}

// 성능 측정 이벤트
export interface PerformanceMeasurementEvent {
  readonly measurementId: string;
  readonly type: 'audio' | 'api' | 'render';
  readonly phase: 'start' | 'end' | 'error';
  readonly timestamp: number;
  readonly data?: Record<string, any>;
}

export type PerformanceMeasurementHandler = (event: PerformanceMeasurementEvent) => void;