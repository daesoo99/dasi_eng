/**
 * AudioTimerService - 오디오 플로우의 타이머 관리 전용 서비스
 * 단일 책임: 타이머 생성, 일시정지, 재개, 정리
 */

export type TimerCallback = () => void;

export interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  isPaused: boolean;
}

export class AudioTimerService {
  private timer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private totalDuration: number = 0;
  private updateInterval: number = 100; // 100ms 간격으로 업데이트
  
  // 콜백들
  private onTick: ((remainingTime: number) => void) | null = null;
  private onComplete: TimerCallback | null = null;

  constructor() {
    this.reset();
  }

  /**
   * 타이머 시작
   * @param duration 타이머 지속시간 (초)
   * @param onTick 매 틱마다 호출될 콜백 (남은 시간)
   * @param onComplete 타이머 완료시 호출될 콜백
   */
  start(
    duration: number,
    onTick: (remainingTime: number) => void,
    onComplete: TimerCallback
  ): void {
    if (duration <= 0) {
      throw new Error('Duration must be greater than 0');
    }

    this.stop(); // 기존 타이머 정리
    
    this.startTime = Date.now();
    this.totalDuration = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    
    console.log(`[AudioTimerService] Starting timer: ${duration}s`);
    
    // 즉시 첫 업데이트
    this.onTick(duration);
    
    // 타이머 시작
    this.timer = setInterval(() => {
      this.tick();
    }, this.updateInterval);
  }

  /**
   * 타이머 일시정지
   */
  pause(): void {
    if (!this.timer || this.isPaused()) {
      return;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    this.pausedAt = Math.max(0, this.totalDuration - elapsed);
    
    console.log(`[AudioTimerService] Pausing timer at: ${this.pausedAt.toFixed(1)}s remaining`);
    
    this.clearTimer();
  }

  /**
   * 타이머 재개
   */
  resume(): void {
    if (!this.isPaused() || this.pausedAt <= 0) {
      return;
    }

    console.log(`[AudioTimerService] Resuming timer from: ${this.pausedAt.toFixed(1)}s`);
    
    // 새로운 시작점 설정
    this.startTime = Date.now();
    this.totalDuration = this.pausedAt;
    this.pausedAt = 0;
    
    // 타이머 재시작
    this.timer = setInterval(() => {
      this.tick();
    }, this.updateInterval);
  }

  /**
   * 타이머 중지 및 정리
   */
  stop(): void {
    console.log('[AudioTimerService] Stopping timer');
    this.clearTimer();
    this.reset();
  }

  /**
   * 현재 타이머 상태 조회
   */
  getState(): TimerState {
    const remainingTime = this.calculateRemainingTime();
    
    return {
      remainingTime,
      isRunning: this.timer !== null,
      isPaused: this.isPaused()
    };
  }

  /**
   * 일시정지 상태 확인
   */
  isPaused(): boolean {
    return this.pausedAt > 0;
  }

  /**
   * 실행 중 상태 확인
   */
  isRunning(): boolean {
    return this.timer !== null && !this.isPaused();
  }

  // Private Methods
  private tick(): void {
    const remainingTime = this.calculateRemainingTime();
    
    if (this.onTick) {
      this.onTick(remainingTime);
    }
    
    if (remainingTime <= 0) {
      console.log('[AudioTimerService] Timer completed');
      this.clearTimer();
      
      if (this.onComplete) {
        this.onComplete();
      }
      
      this.reset();
    }
  }

  private calculateRemainingTime(): number {
    if (this.isPaused()) {
      return this.pausedAt;
    }
    
    if (this.timer === null) {
      return 0;
    }
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    return Math.max(0, this.totalDuration - elapsed);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private reset(): void {
    this.startTime = 0;
    this.pausedAt = 0;
    this.totalDuration = 0;
    this.onTick = null;
    this.onComplete = null;
  }

  /**
   * 리소스 정리 (컴포넌트 언마운트 시 호출)
   */
  cleanup(): void {
    this.stop();
    console.log('[AudioTimerService] Cleanup completed');
  }
}