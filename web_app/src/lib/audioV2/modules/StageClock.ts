export class StageClock {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  private isActive: boolean = false;

  start(): void {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.isPaused = false;
    this.isActive = true;
  }

  pause(): void {
    if (this.isActive && !this.isPaused) {
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isActive && this.isPaused) {
      this.pausedTime += Date.now() - this.getLastPauseTime();
      this.isPaused = false;
    }
  }

  stop(): void {
    this.isActive = false;
    this.isPaused = false;
  }

  getElapsed(): number {
    if (!this.isActive) return 0;
    
    const now = Date.now();
    if (this.isPaused) {
      return this.getLastActiveTime() - this.startTime;
    }
    
    return now - this.startTime - this.pausedTime;
  }

  private getLastPauseTime(): number {
    // In a real implementation, we'd track when pause was called
    return Date.now();
  }

  private getLastActiveTime(): number {
    // In a real implementation, we'd track the last active timestamp
    return Date.now();
  }

  isRunning(): boolean {
    return this.isActive && !this.isPaused;
  }
}