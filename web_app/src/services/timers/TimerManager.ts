/**
 * TimerManager - 타이머 라이프사이클 관리 모듈
 * 
 * 역할:
 * - 모든 타이머의 중앙집중식 관리
 * - 타이머 중복 실행 방지
 * - 컴포넌트 언마운트시 자동 정리
 * - 일시정지/재개 기능 통합 관리
 */

export type TimerType = 'countdown' | 'recognition' | 'waiting' | 'tts';

export interface TimerConfig {
  id: string;
  type: TimerType;
  interval: number; // milliseconds
  callback: (remainingTime: number) => void;
  onComplete?: () => void;
}

export interface TimerState {
  id: string;
  type: TimerType;
  intervalId: number | null;
  startTime: number;
  duration: number;
  remainingTime: number;
  isPaused: boolean;
  isActive: boolean;
}

class TimerManager {
  private timers: Map<string, TimerState> = new Map();
  private static instance: TimerManager | null = null;

  // Singleton pattern
  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * 새로운 타이머 시작
   */
  startTimer(config: TimerConfig, duration: number): void {
    // 기존 타이머가 있으면 중지
    this.stopTimer(config.id);

    const now = Date.now();
    const state: TimerState = {
      id: config.id,
      type: config.type,
      intervalId: null,
      startTime: now,
      duration: duration * 1000, // convert to ms
      remainingTime: duration,
      isPaused: false,
      isActive: true
    };

    // 초기 상태 콜백 실행 (3초부터 시작)
    config.callback(state.remainingTime);

    // 타이머 실행
    state.intervalId = window.setInterval(() => {
      this.tick(config.id, config);
    }, config.interval);

    this.timers.set(config.id, state);
    console.log(`⏰ [TimerManager] 타이머 시작: ${config.id} (${duration}초)`);
  }

  /**
   * 타이머 중지
   */
  stopTimer(id: string): boolean {
    const state = this.timers.get(id);
    if (!state) return false;

    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
    }

    this.timers.delete(id);
    console.log(`🛑 [TimerManager] 타이머 중지: ${id}`);
    return true;
  }

  /**
   * 타이머 일시정지
   */
  pauseTimer(id: string): boolean {
    const state = this.timers.get(id);
    if (!state || state.isPaused) return false;

    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.isPaused = true;
    console.log(`⏸️ [TimerManager] 타이머 일시정지: ${id}`);
    return true;
  }

  /**
   * 타이머 재개
   */
  resumeTimer(id: string, config: TimerConfig): boolean {
    const state = this.timers.get(id);
    if (!state || !state.isPaused) return false;

    // 남은 시간으로 다시 시작
    state.intervalId = window.setInterval(() => {
      this.tick(id, config);
    }, config.interval);

    state.isPaused = false;
    console.log(`▶️ [TimerManager] 타이머 재개: ${id} (남은시간: ${state.remainingTime}초)`);
    return true;
  }

  /**
   * 특정 타입의 모든 타이머 일시정지
   */
  pauseAllTimers(type?: TimerType): void {
    for (const [id, state] of this.timers.entries()) {
      if (!type || state.type === type) {
        if (state.intervalId !== null) {
          clearInterval(state.intervalId);
          state.intervalId = null;
          state.isPaused = true;
        }
      }
    }
    console.log(`⏸️ [TimerManager] 모든 ${type || ''} 타이머 일시정지`);
  }

  /**
   * 특정 타입의 모든 타이머 재개
   */
  resumeAllTimers(type?: TimerType, configs?: Map<string, TimerConfig>): void {
    for (const [id, state] of this.timers.entries()) {
      if ((!type || state.type === type) && state.isPaused) {
        const config = configs?.get(id);
        if (config) {
          this.resumeTimer(id, config);
        }
      }
    }
    console.log(`▶️ [TimerManager] 모든 ${type || ''} 타이머 재개`);
  }

  /**
   * 모든 타이머 정리
   */
  clearAllTimers(): void {
    for (const [id, state] of this.timers.entries()) {
      if (state.intervalId !== null) {
        clearInterval(state.intervalId);
      }
    }
    this.timers.clear();
    console.log(`🧹 [TimerManager] 모든 타이머 정리 완료`);
  }

  /**
   * 타이머 상태 조회
   */
  getTimerState(id: string): TimerState | null {
    return this.timers.get(id) || null;
  }

  /**
   * 활성 타이머 목록
   */
  getActiveTimers(): TimerState[] {
    return Array.from(this.timers.values()).filter(state => state.isActive);
  }

  /**
   * 타이머 틱 처리
   */
  private tick(id: string, config: TimerConfig): void {
    const state = this.timers.get(id);
    if (!state || state.isPaused) return;

    state.remainingTime -= 1;

    // 콜백 실행
    config.callback(state.remainingTime);

    // 완료 처리
    if (state.remainingTime <= 0) {
      if (state.intervalId !== null) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
      
      state.isActive = false;
      
      // 완료 콜백 실행
      if (config.onComplete) {
        config.onComplete();
      }
      
      // 타이머 제거
      this.timers.delete(id);
      console.log(`✅ [TimerManager] 타이머 완료: ${id}`);
    }
  }

  /**
   * 디버그 정보
   */
  debug(): void {
    console.log(`🔍 [TimerManager] 활성 타이머: ${this.timers.size}개`);
    for (const [id, state] of this.timers.entries()) {
      console.log(`  - ${id}: ${state.type} (남은시간: ${state.remainingTime}초, 일시정지: ${state.isPaused})`);
    }
  }
}

export default TimerManager;