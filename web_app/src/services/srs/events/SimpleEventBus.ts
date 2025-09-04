/**
 * 간단한 이벤트 버스 구현체
 * ISRSEventBus 인터페이스 구현체
 */

import { ISRSEventBus, SRSEvent } from '../interfaces/ISRSEngine';

export class SimpleEventBus implements ISRSEventBus {
  private listeners = new Map<SRSEvent['type'], Set<(event: SRSEvent) => void>>();
  private eventHistory: SRSEvent[] = [];
  private readonly maxHistorySize = 1000;

  emit(event: SRSEvent): void {
    // 이벤트 히스토리 저장 (디버깅용)
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // 리스너들에게 이벤트 전달
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // 글로벌 리스너들에게도 전달 (와일드카드)
    const globalListeners = this.listeners.get('*' as SRSEvent['type']);
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in global event listener:`, error);
        }
      });
    }
  }

  on(eventType: SRSEvent['type'], handler: (event: SRSEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: SRSEvent['type'], handler: (event: SRSEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * 모든 리스너 제거
   */
  removeAllListeners(eventType?: SRSEvent['type']): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 이벤트 히스토리 조회 (디버깅용)
   */
  getEventHistory(eventType?: SRSEvent['type'], limit = 50): SRSEvent[] {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    return events.slice(-limit);
  }

  /**
   * 특정 시간 범위의 이벤트 조회
   */
  getEventsInTimeRange(startTime: Date, endTime: Date): SRSEvent[] {
    return this.eventHistory.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * 이벤트 통계
   */
  getEventStats(): Map<SRSEvent['type'], number> {
    const stats = new Map<SRSEvent['type'], number>();
    
    this.eventHistory.forEach(event => {
      const count = stats.get(event.type) || 0;
      stats.set(event.type, count + 1);
    });
    
    return stats;
  }

  /**
   * 리스너 수 조회
   */
  getListenerCount(eventType?: SRSEvent['type']): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    
    let total = 0;
    this.listeners.forEach(listeners => {
      total += listeners.size;
    });
    return total;
  }

  /**
   * 이벤트 히스토리 초기화
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 전체 상태 초기화
   */
  clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}

/**
 * 로깅 기능이 강화된 이벤트 버스
 */
export class LoggingEventBus extends SimpleEventBus {
  private isLoggingEnabled: boolean;

  constructor(enableLogging = false) {
    super();
    this.isLoggingEnabled = enableLogging;
  }

  emit(event: SRSEvent): void {
    if (this.isLoggingEnabled) {
      console.log(`[SRS Event] ${event.type}:`, event.data);
    }
    super.emit(event);
  }

  setLogging(enabled: boolean): void {
    this.isLoggingEnabled = enabled;
  }
}

/**
 * 비동기 이벤트 처리를 지원하는 이벤트 버스
 */
export class AsyncEventBus extends SimpleEventBus {
  private asyncListeners = new Map<SRSEvent['type'], Set<(event: SRSEvent) => Promise<void>>>();

  onAsync(eventType: SRSEvent['type'], handler: (event: SRSEvent) => Promise<void>): void {
    if (!this.asyncListeners.has(eventType)) {
      this.asyncListeners.set(eventType, new Set());
    }
    this.asyncListeners.get(eventType)!.add(handler);
  }

  offAsync(eventType: SRSEvent['type'], handler: (event: SRSEvent) => Promise<void>): void {
    const listeners = this.asyncListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.asyncListeners.delete(eventType);
      }
    }
  }

  async emitAsync(event: SRSEvent): Promise<void> {
    // 동기 리스너들 실행
    super.emit(event);

    // 비동기 리스너들 실행
    const asyncListeners = this.asyncListeners.get(event.type);
    if (asyncListeners && asyncListeners.size > 0) {
      const promises = Array.from(asyncListeners).map(listener =>
        listener(event).catch(error => 
          console.error(`Error in async event listener for ${event.type}:`, error)
        )
      );
      await Promise.all(promises);
    }
  }

  clear(): void {
    super.clear();
    this.asyncListeners.clear();
  }
}