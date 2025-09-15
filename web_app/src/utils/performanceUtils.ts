/**
 * @fileoverview 성능 모니터링 및 최적화 유틸리티
 * @description AI 면접 시뮬레이터의 성능을 측정하고 최적화하는 도구들
 * @author DaSiStart Team
 * @version 1.0.0
 */

// 성능 메트릭 타입 정의
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'network' | 'rendering' | 'memory' | 'audio' | 'api' | 'user_interaction';
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
}

export interface AudioLatencyMetric {
  speechRecognitionStart: number;
  speechRecognitionEnd: number;
  transcriptionComplete: number;
  totalLatency: number;
  recognitionLatency: number;
}

export interface APIPerformanceMetric {
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  responseSize?: number;
  retryCount?: number;
}

export interface RenderingMetric {
  componentName: string;
  renderStart: number;
  renderEnd: number;
  renderDuration: number;
  propsCount: number;
  reRenderReason?: string;
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

/**
 * 성능 모니터링 클래스
 * 애플리케이션의 다양한 성능 지표를 수집하고 분석
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private audioMetrics: AudioLatencyMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];
  private renderingMetrics: RenderingMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private readonly maxMetricsCount = 1000;
  private performanceObserver?: PerformanceObserver;

  private constructor() {
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 성능 관찰자 초기화
   */
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.processPerformanceEntry(entry);
        });
      });

      // 다양한 성능 엔트리 타입 관찰
      try {
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'mark', 'paint', 'largest-contentful-paint']
        });
      } catch (error) {
        console.warn('일부 성능 메트릭을 관찰할 수 없습니다:', error);
      }
    }
  }

  /**
   * 성능 엔트리 처리
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || 0,
      timestamp: entry.startTime + performance.timeOrigin,
      category: this.categorizeEntry(entry),
      unit: 'ms',
      tags: {
        entryType: entry.entryType
      }
    };

    this.addMetric(metric);
  }

  /**
   * 엔트리 카테고리 분류
   */
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

  /**
   * 메트릭 추가
   */
  private addMetric(metric: PerformanceMetric): void {
    if (this.metrics.length >= this.maxMetricsCount) {
      this.metrics.shift();
    }
    this.metrics.push(metric);
  }

  /**
   * 메모리 모니터링 시작
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const metric: MemoryMetric = {
          usedJSHeapSize: memInfo.usedJSHeapSize,
          totalJSHeapSize: memInfo.totalJSHeapSize,
          jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
          timestamp: Date.now()
        };
        
        if (this.memoryMetrics.length >= 100) {
          this.memoryMetrics.shift();
        }
        this.memoryMetrics.push(metric);

        // 메모리 사용량이 80% 이상이면 경고
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        if (usageRatio > 0.8) {
          console.warn(`높은 메모리 사용량 감지: ${(usageRatio * 100).toFixed(1)}%`);
          this.addMetric({
            name: 'high_memory_usage',
            value: usageRatio * 100,
            timestamp: Date.now(),
            category: 'memory',
            unit: 'percentage'
          });
        }
      }, 10000); // 10초마다 체크
    }
  }

  /**
   * 음성 인식 지연시간 측정 시작
   */
  public startAudioLatencyMeasurement(): string {
    const measurementId = `audio_latency_${Date.now()}`;
    performance.mark(`${measurementId}_start`);
    return measurementId;
  }

  /**
   * 음성 인식 지연시간 측정 완료
   */
  public endAudioLatencyMeasurement(measurementId: string, transcription?: string): AudioLatencyMetric {
    const endMark = `${measurementId}_end`;
    performance.mark(endMark);
    performance.measure(measurementId, `${measurementId}_start`, endMark);

    const measure = performance.getEntriesByName(measurementId)[0];
    const metric: AudioLatencyMetric = {
      speechRecognitionStart: measure.startTime,
      speechRecognitionEnd: measure.startTime + measure.duration,
      transcriptionComplete: performance.now(),
      totalLatency: measure.duration,
      recognitionLatency: measure.duration
    };

    this.audioMetrics.push(metric);
    
    // 지연시간이 2초 이상이면 성능 이슈로 기록
    if (metric.totalLatency > 2000) {
      this.addMetric({
        name: 'slow_audio_recognition',
        value: metric.totalLatency,
        timestamp: Date.now(),
        category: 'audio',
        unit: 'ms',
        tags: {
          transcription: transcription?.substring(0, 50) || 'unknown'
        }
      });
    }

    return metric;
  }

  /**
   * API 호출 성능 측정
   */
  public measureAPICall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const metric: APIPerformanceMetric = {
      endpoint,
      method,
      startTime,
      endTime: 0,
      duration: 0,
      status: 0
    };

    return apiCall()
      .then(result => {
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.status = 200; // 성공으로 가정
        
        this.apiMetrics.push(metric);
        
        this.addMetric({
          name: `api_${endpoint.replace(/\//g, '_')}`,
          value: metric.duration,
          timestamp: Date.now(),
          category: 'api',
          unit: 'ms',
          tags: {
            method,
            endpoint,
            status: metric.status.toString()
          }
        });

        return result;
      })
      .catch(error => {
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.status = error.response?.status || 500;
        
        this.apiMetrics.push(metric);
        
        this.addMetric({
          name: `api_error_${endpoint.replace(/\//g, '_')}`,
          value: metric.duration,
          timestamp: Date.now(),
          category: 'api',
          unit: 'ms',
          tags: {
            method,
            endpoint,
            status: metric.status.toString(),
            error: error.message
          }
        });

        throw error;
      });
  }

  /**
   * React 컴포넌트 렌더링 성능 측정
   */
  public measureComponentRender(
    componentName: string,
    propsCount: number,
    reRenderReason?: string
  ): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const metric: RenderingMetric = {
        componentName,
        renderStart: startTime,
        renderEnd: endTime,
        renderDuration: duration,
        propsCount,
        reRenderReason
      };
      
      this.renderingMetrics.push(metric);
      
      // 렌더링이 16ms(60fps) 이상 걸리면 성능 이슈로 기록
      if (duration > 16) {
        this.addMetric({
          name: `slow_component_render_${componentName}`,
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
      }
    };
  }

  /**
   * 성능 통계 생성
   */
  public getPerformanceStats() {
    return {
      totalMetrics: this.metrics.length,
      audioPerformance: {
        averageLatency: this.calculateAverageAudioLatency(),
        totalMeasurements: this.audioMetrics.length,
        slowRecognitionCount: this.audioMetrics.filter(m => m.totalLatency > 2000).length
      },
      apiPerformance: {
        averageResponseTime: this.calculateAverageAPIResponseTime(),
        totalCalls: this.apiMetrics.length,
        errorRate: this.calculateAPIErrorRate(),
        slowCallsCount: this.apiMetrics.filter(m => m.duration > 3000).length
      },
      rendering: {
        averageRenderTime: this.calculateAverageRenderTime(),
        slowRendersCount: this.renderingMetrics.filter(m => m.renderDuration > 16).length,
        totalRenders: this.renderingMetrics.length
      },
      memory: {
        currentUsage: this.getCurrentMemoryUsage(),
        peakUsage: this.getPeakMemoryUsage(),
        averageUsage: this.getAverageMemoryUsage()
      }
    };
  }

  /**
   * 평균 음성 인식 지연시간 계산
   */
  private calculateAverageAudioLatency(): number {
    if (this.audioMetrics.length === 0) return 0;
    const total = this.audioMetrics.reduce((sum, metric) => sum + metric.totalLatency, 0);
    return total / this.audioMetrics.length;
  }

  /**
   * 평균 API 응답시간 계산
   */
  private calculateAverageAPIResponseTime(): number {
    if (this.apiMetrics.length === 0) return 0;
    const total = this.apiMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.apiMetrics.length;
  }

  /**
   * API 에러율 계산
   */
  private calculateAPIErrorRate(): number {
    if (this.apiMetrics.length === 0) return 0;
    const errorCount = this.apiMetrics.filter(metric => metric.status >= 400).length;
    return (errorCount / this.apiMetrics.length) * 100;
  }

  /**
   * 평균 렌더링 시간 계산
   */
  private calculateAverageRenderTime(): number {
    if (this.renderingMetrics.length === 0) return 0;
    const total = this.renderingMetrics.reduce((sum, metric) => sum + metric.renderDuration, 0);
    return total / this.renderingMetrics.length;
  }

  /**
   * 현재 메모리 사용량 반환
   */
  private getCurrentMemoryUsage(): number {
    if (this.memoryMetrics.length === 0) return 0;
    const latest = this.memoryMetrics[this.memoryMetrics.length - 1];
    return (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;
  }

  /**
   * 최대 메모리 사용량 반환
   */
  private getPeakMemoryUsage(): number {
    if (this.memoryMetrics.length === 0) return 0;
    const peak = Math.max(...this.memoryMetrics.map(m => m.usedJSHeapSize));
    const limit = this.memoryMetrics[0].jsHeapSizeLimit;
    return (peak / limit) * 100;
  }

  /**
   * 평균 메모리 사용량 계산
   */
  private getAverageMemoryUsage(): number {
    if (this.memoryMetrics.length === 0) return 0;
    const totalUsage = this.memoryMetrics.reduce((sum, metric) => 
      sum + (metric.usedJSHeapSize / metric.jsHeapSizeLimit), 0);
    return (totalUsage / this.memoryMetrics.length) * 100;
  }

  /**
   * 성능 보고서 생성
   */
  public generatePerformanceReport() {
    const stats = this.getPerformanceStats();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overallScore: this.calculateOverallPerformanceScore(),
        issues: this.identifyPerformanceIssues()
      },
      details: stats,
      recommendations: this.generateRecommendations(stats)
    };

    console.group('📊 성능 보고서');
    console.log('전체 점수:', report.summary.overallScore + '/100');
    console.log('발견된 이슈:', report.summary.issues);
    console.log('상세 통계:', report.details);
    console.log('개선 권장사항:', report.recommendations);
    console.groupEnd();

    return report;
  }

  /**
   * 전체 성능 점수 계산 (0-100)
   */
  private calculateOverallPerformanceScore(): number {
    const stats = this.getPerformanceStats();
    let score = 100;

    // 음성 인식 지연시간 평가 (30점)
    if (stats.audioPerformance.averageLatency > 3000) score -= 20;
    else if (stats.audioPerformance.averageLatency > 2000) score -= 10;
    else if (stats.audioPerformance.averageLatency > 1000) score -= 5;

    // API 응답시간 평가 (25점)
    if (stats.apiPerformance.averageResponseTime > 5000) score -= 15;
    else if (stats.apiPerformance.averageResponseTime > 3000) score -= 10;
    else if (stats.apiPerformance.averageResponseTime > 1000) score -= 5;

    // 렌더링 성능 평가 (25점)
    if (stats.rendering.averageRenderTime > 50) score -= 15;
    else if (stats.rendering.averageRenderTime > 30) score -= 10;
    else if (stats.rendering.averageRenderTime > 16) score -= 5;

    // 메모리 사용량 평가 (20점)
    if (stats.memory.currentUsage > 80) score -= 15;
    else if (stats.memory.currentUsage > 60) score -= 10;
    else if (stats.memory.currentUsage > 40) score -= 5;

    return Math.max(0, score);
  }

  /**
   * 성능 이슈 식별
   */
  private identifyPerformanceIssues(): string[] {
    const issues: string[] = [];
    const stats = this.getPerformanceStats();

    if (stats.audioPerformance.averageLatency > 2000) {
      issues.push('음성 인식 지연시간이 과도합니다');
    }

    if (stats.apiPerformance.errorRate > 10) {
      issues.push('API 에러율이 높습니다');
    }

    if (stats.rendering.slowRendersCount > stats.rendering.totalRenders * 0.2) {
      issues.push('렌더링 성능이 저하되어 있습니다');
    }

    if (stats.memory.currentUsage > 70) {
      issues.push('메모리 사용량이 높습니다');
    }

    return issues;
  }

  /**
   * 성능 개선 권장사항 생성
   */
  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.audioPerformance.averageLatency > 2000) {
      recommendations.push('음성 인식 설정을 최적화하고 연속 모드를 고려해보세요');
    }

    if (stats.apiPerformance.averageResponseTime > 3000) {
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

  /**
   * 모든 메트릭 내보내기
   */
  public exportMetrics() {
    return {
      performance: this.metrics,
      audio: this.audioMetrics,
      api: this.apiMetrics,
      rendering: this.renderingMetrics,
      memory: this.memoryMetrics
    };
  }

  /**
   * 메트릭 클리어
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.audioMetrics = [];
    this.apiMetrics = [];
    this.renderingMetrics = [];
    this.memoryMetrics = [];
  }
}

// ✅ CLAUDE.local 준수: 기존 유틸리티를 플러그인 기반으로 변경
// ⚠️ DEPRECATED: 직접 PerformanceMonitor 사용 대신 플러그인 기반 usePerformanceMonitoring Hook 사용 권장

/**
 * @deprecated Use usePerformanceMonitoring Hook with IPerformancePlugin instead
 * CLAUDE.local violation: Direct class usage instead of plugin architecture
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * @deprecated Use usePerformanceMonitoring().measureAudioLatency() instead
 * CLAUDE.local violation: Direct utility function instead of plugin interface
 */
export const measureAudioLatency = () => {
  console.warn('DEPRECATED: Use usePerformanceMonitoring().measureAudioLatency() for plugin-based architecture');
  return performanceMonitor.startAudioLatencyMeasurement();
};

/**
 * @deprecated Use usePerformanceMonitoring().endAudioLatency() instead  
 * CLAUDE.local violation: Direct utility function instead of plugin interface
 */
export const endAudioLatency = (measurementId: string, transcription?: string) => {
  console.warn('DEPRECATED: Use usePerformanceMonitoring().endAudioLatency() for plugin-based architecture');
  return performanceMonitor.endAudioLatencyMeasurement(measurementId, transcription);
};

/**
 * @deprecated Use usePerformanceMonitoring().measureAPI() instead
 * CLAUDE.local violation: Direct utility function instead of plugin interface
 */
export const measureAPI = <T>(endpoint: string, method: string, apiCall: () => Promise<T>) => {
  console.warn('DEPRECATED: Use usePerformanceMonitoring().measureAPI() for plugin-based architecture');
  return performanceMonitor.measureAPICall(endpoint, method, apiCall);
};

/**
 * @deprecated Use usePerformanceMonitoring().measureRender() instead
 * CLAUDE.local violation: Direct utility function instead of plugin interface
 */
export const measureRender = (componentName: string, propsCount: number, reason?: string) => {
  console.warn('DEPRECATED: Use usePerformanceMonitoring().measureRender() for plugin-based architecture');
  return performanceMonitor.measureComponentRender(componentName, propsCount, reason);
};

/**
 * @deprecated Use usePerformanceMonitoring().generateReport() instead
 * CLAUDE.local violation: Direct utility function instead of plugin interface
 */
export const getPerformanceReport = () => {
  console.warn('DEPRECATED: Use usePerformanceMonitoring().generateReport() for plugin-based architecture');
  return performanceMonitor.generatePerformanceReport();
};

/**
 * @deprecated Use import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring' instead
 * CLAUDE.local violation: Utility-based hook instead of proper plugin-based Hook
 */
export const usePerformanceMonitoring = (componentName: string) => {
  console.warn('DEPRECATED: Use proper usePerformanceMonitoring Hook from @/hooks/usePerformanceMonitoring for plugin-based architecture');
  return {
    measureRender: (propsCount: number, reason?: string) => 
      measureRender(componentName, propsCount, reason),
    measureAudioLatency,
    endAudioLatency,
    measureAudio: (latencyMs: number) => {
      // Fallback implementation for backward compatibility
      return Math.max(0, 100 - (latencyMs / 20)); // Simple score calculation
    }
  };
};

export default PerformanceMonitor;