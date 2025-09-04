/**
 * EventLifecycleManager - 이벤트 라이프사이클 관리 모듈
 * 
 * 역할:
 * - 완료 알림 중복 방지
 * - 이벤트 리스너 중복 등록 방지
 * - 컴포넌트 상태 변화에 따른 이벤트 정리
 */

export type EventType = 'completion' | 'tts' | 'recognition' | 'navigation';

export interface EventConfig {
  id: string;
  type: EventType;
  handler: Function;
  element?: EventTarget;
  eventName?: string;
}

export interface EventState {
  id: string;
  type: EventType;
  handler: Function;
  element?: EventTarget;
  eventName?: string;
  isActive: boolean;
  registeredAt: number;
}

class EventLifecycleManager {
  private events: Map<string, EventState> = new Map();
  private completionHistory: Set<string> = new Set(); // 완료 이벤트 중복 방지
  private static instance: EventLifecycleManager | null = null;

  // Singleton pattern
  static getInstance(): EventLifecycleManager {
    if (!EventLifecycleManager.instance) {
      EventLifecycleManager.instance = new EventLifecycleManager();
    }
    return EventLifecycleManager.instance;
  }

  /**
   * 이벤트 등록 (중복 방지)
   */
  registerEvent(config: EventConfig): boolean {
    // 이미 등록된 이벤트는 무시
    if (this.events.has(config.id)) {
      console.log(`⚠️ [EventManager] 이벤트 이미 등록됨: ${config.id}`);
      return false;
    }

    const state: EventState = {
      id: config.id,
      type: config.type,
      handler: config.handler,
      element: config.element,
      eventName: config.eventName,
      isActive: true,
      registeredAt: Date.now()
    };

    // DOM 이벤트 리스너 등록
    if (config.element && config.eventName) {
      config.element.addEventListener(config.eventName, config.handler as EventListener);
      console.log(`📡 [EventManager] DOM 이벤트 등록: ${config.eventName} on ${config.element.constructor.name}`);
    }

    this.events.set(config.id, state);
    console.log(`✅ [EventManager] 이벤트 등록: ${config.id} (타입: ${config.type})`);
    return true;
  }

  /**
   * 이벤트 제거
   */
  unregisterEvent(id: string): boolean {
    const state = this.events.get(id);
    if (!state) return false;

    // DOM 이벤트 리스너 제거
    if (state.element && state.eventName) {
      state.element.removeEventListener(state.eventName, state.handler as EventListener);
      console.log(`📡 [EventManager] DOM 이벤트 제거: ${state.eventName}`);
    }

    state.isActive = false;
    this.events.delete(id);
    console.log(`🗑️ [EventManager] 이벤트 제거: ${id}`);
    return true;
  }

  /**
   * 특정 타입의 모든 이벤트 제거
   */
  unregisterEventsByType(type: EventType): number {
    let count = 0;
    for (const [id, state] of this.events.entries()) {
      if (state.type === type) {
        this.unregisterEvent(id);
        count++;
      }
    }
    console.log(`🗑️ [EventManager] ${type} 타입 이벤트 ${count}개 제거`);
    return count;
  }

  /**
   * 완료 이벤트 중복 방지 처리
   */
  handleCompletion(completionId: string, callback: () => void): boolean {
    // 이미 처리된 완료 이벤트는 무시
    if (this.completionHistory.has(completionId)) {
      console.log(`⚠️ [EventManager] 완료 이벤트 중복 무시: ${completionId}`);
      return false;
    }

    // 완료 이벤트 처리
    this.completionHistory.add(completionId);
    callback();
    
    console.log(`🎉 [EventManager] 완료 이벤트 처리: ${completionId}`);

    // 5초 후 히스토리에서 제거 (메모리 누수 방지)
    setTimeout(() => {
      this.completionHistory.delete(completionId);
      console.log(`🧹 [EventManager] 완료 히스토리 정리: ${completionId}`);
    }, 5000);

    return true;
  }

  /**
   * TTS 이벤트 관리
   */
  manageTTSEvent(utterance: SpeechSynthesisUtterance, eventType: 'start' | 'end' | 'error', handler: Function): void {
    const eventId = `tts-${eventType}-${Date.now()}`;
    
    // 기존 TTS 이벤트 정리
    this.unregisterEventsByType('tts');

    // 새로운 TTS 이벤트 등록
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      // TTS 이벤트는 일회성이므로 자동 정리
      this.unregisterEvent(eventId);
    };

    this.registerEvent({
      id: eventId,
      type: 'tts',
      handler: wrappedHandler
    });

    // SpeechSynthesisUtterance에 직접 할당
    if (eventType === 'start') {
      utterance.onstart = wrappedHandler;
    } else if (eventType === 'end') {
      utterance.onend = wrappedHandler;
    } else if (eventType === 'error') {
      utterance.onerror = wrappedHandler;
    }
  }

  /**
   * 음성인식 이벤트 관리
   */
  manageRecognitionEvent(recognition: any, eventType: 'result' | 'end' | 'error', handler: Function): void {
    const eventId = `recognition-${eventType}-${Date.now()}`;
    
    // 새로운 음성인식 이벤트 등록
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      // result 이벤트는 여러 번 발생할 수 있으므로 end/error만 자동 정리
      if (eventType !== 'result') {
        this.unregisterEvent(eventId);
      }
    };

    this.registerEvent({
      id: eventId,
      type: 'recognition',
      handler: wrappedHandler
    });

    // Recognition 객체에 직접 할당
    if (eventType === 'result') {
      recognition.onresult = wrappedHandler;
    } else if (eventType === 'end') {
      recognition.onend = wrappedHandler;
    } else if (eventType === 'error') {
      recognition.onerror = wrappedHandler;
    }
  }

  /**
   * 모든 이벤트 정리
   */
  clearAllEvents(): void {
    for (const [id] of this.events.entries()) {
      this.unregisterEvent(id);
    }
    this.completionHistory.clear();
    console.log(`🧹 [EventManager] 모든 이벤트 정리 완료`);
  }

  /**
   * 이벤트 상태 조회
   */
  getEventState(id: string): EventState | null {
    return this.events.get(id) || null;
  }

  /**
   * 활성 이벤트 목록
   */
  getActiveEvents(): EventState[] {
    return Array.from(this.events.values()).filter(state => state.isActive);
  }

  /**
   * 완료 히스토리 조회
   */
  getCompletionHistory(): string[] {
    return Array.from(this.completionHistory);
  }

  /**
   * 디버그 정보
   */
  debug(): void {
    console.log(`🔍 [EventManager] 활성 이벤트: ${this.events.size}개`);
    console.log(`🔍 [EventManager] 완료 히스토리: ${this.completionHistory.size}개`);
    
    for (const [id, state] of this.events.entries()) {
      const age = Date.now() - state.registeredAt;
      console.log(`  - ${id}: ${state.type} (수명: ${age}ms)`);
    }
  }

  /**
   * 오래된 이벤트 정리 (메모리 누수 방지)
   */
  cleanupOldEvents(maxAge: number = 30000): number { // 30초
    let cleaned = 0;
    const now = Date.now();
    
    for (const [id, state] of this.events.entries()) {
      if (now - state.registeredAt > maxAge) {
        this.unregisterEvent(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [EventManager] 오래된 이벤트 ${cleaned}개 정리`);
    }
    
    return cleaned;
  }
}

export default EventLifecycleManager;