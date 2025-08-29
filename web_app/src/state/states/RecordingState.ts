/**
 * RecordingState - 녹음 진행 상태
 * 목적: 사용자 음성을 녹음하고 시간을 관리하는 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class RecordingState extends BaseFlowState {
  private recordingTimer: NodeJS.Timeout | null = null;
  private timeUpdateInterval: NodeJS.Timeout | null = null;
  private shouldStop = false;
  private startTime: number = 0;
  private pausedTime: number = 0;

  getStateName(): FlowState {
    return 'recording';
  }

  async enter(): Promise<void> {
    console.log('[RecordingState] Entering recording state');
    this.shouldStop = false;
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.context.remainingTime = this.context.recordingDuration;
    
    this.notifyStateChange();
    this.startRecording();
  }

  async exit(): Promise<void> {
    console.log('[RecordingState] Exiting recording state');
    this.shouldStop = true;
    this.cleanupTimers();
  }

  private startRecording(): void {
    if (this.shouldStop) return;
    
    console.log(`[RecordingState] Starting recording for ${this.context.recordingDuration} seconds`);
    
    // 녹음 시작 (실제 구현시 SpeechRecognition 사용)
    this.startTimer();
    this.startTimeUpdates();
  }

  private startTimer(): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
    }
    
    this.recordingTimer = setTimeout(() => {
      if (!this.shouldStop && !this.context.isPaused) {
        console.log('[RecordingState] Recording timeout reached');
        this.callbacks.onTimeout();
        // 타임아웃 시 timeout 상태로 전환
        this.callbacks.onStateChange('timeout');
      }
    }, this.context.recordingDuration * 1000);
  }

  private startTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.shouldStop || this.context.isPaused) {
        return;
      }
      
      const elapsed = (Date.now() - this.startTime - this.pausedTime) / 1000;
      this.context.remainingTime = Math.max(0, this.context.recordingDuration - elapsed);
      
      this.notifyTimeUpdate(this.context.remainingTime);
      
      if (this.context.remainingTime <= 0) {
        this.cleanupTimers();
      }
    }, 100); // 100ms마다 업데이트
  }

  private cleanupTimers(): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  pause(): ActionResult {
    if (this.context.isPaused) {
      return this.createActionResult(false, 'Already paused');
    }
    
    console.log('[RecordingState] Pausing recording');
    
    // 일시정지 시간 기록
    this.pausedTime += Date.now() - this.startTime;
    
    // 타이머들 정리
    this.cleanupTimers();
    
    return this.createActionResult(true);
  }

  resume(): ActionResult {
    if (!this.context.isPaused) {
      return this.createActionResult(false, 'Not paused');
    }
    
    console.log('[RecordingState] Resuming recording');
    
    // 시작 시간 재설정
    this.startTime = Date.now();
    
    // 타이머들 재시작
    const remainingTime = this.context.remainingTime;
    this.context.recordingDuration = remainingTime; // 남은 시간으로 업데이트
    this.startTimer();
    this.startTimeUpdates();
    
    return this.createActionResult(true);
  }

  stop(): ActionResult {
    console.log('[RecordingState] Stopping recording');
    this.shouldStop = true;
    this.cleanupTimers();
    
    return this.createActionResult(true, undefined, 'idle');
  }

  getDisplayInfo(): StateDisplayInfo {
    const remainingSeconds = Math.ceil(this.context.remainingTime);
    const elapsed = this.context.recordingDuration - this.context.remainingTime;
    const progressPercent = Math.min((elapsed / this.context.recordingDuration) * 100, 100);
    const isPaused = this.context.isPaused;
    
    return {
      message: isPaused
        ? `⏸️ 녹음 일시정지됨 (남은 시간: ${remainingSeconds}초)`
        : `🎤 말씀해 주세요... (남은 시간: ${remainingSeconds}초)`,
      progressPercent,
      statusColor: isPaused 
        ? 'bg-yellow-500' 
        : 'bg-red-500 animate-pulse',
      icon: isPaused ? '⏸️' : '🎤',
      canPause: !isPaused,
      canResume: isPaused,
      canStop: true,
      showProgress: true,
    };
  }

  getAllowedActions(): FlowAction[] {
    const baseActions: FlowAction[] = ['stop', 'complete', 'timeout'];
    
    if (this.context.isPaused) {
      baseActions.push('resume');
    } else {
      baseActions.push('pause');
    }
    
    return baseActions;
  }

  // 특별 액션 처리
  public handleAction(action: FlowAction): ActionResult {
    switch (action) {
      case 'complete':
        // 음성 인식 완료
        console.log('[RecordingState] Speech recognition completed');
        this.cleanupTimers();
        return this.createActionResult(true, undefined, 'processing');
        
      case 'timeout':
        // 녹음 시간 초과
        console.log('[RecordingState] Recording timeout');
        this.cleanupTimers();
        return this.createActionResult(true, undefined, 'timeout');
        
      default:
        return super.handleAction(action);
    }
  }
}