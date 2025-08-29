/**
 * BeepState - 비프음 재생 상태
 * 목적: 녹음 시작 전 알림 비프음을 재생하는 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class BeepState extends BaseFlowState {
  private beepTimer: NodeJS.Timeout | null = null;
  private shouldStop = false;

  getStateName(): FlowState {
    return 'beep';
  }

  async enter(): Promise<void> {
    console.log('[BeepState] Entering beep state');
    this.shouldStop = false;
    this.notifyStateChange();
    
    // 비프음 시작
    this.startBeep();
  }

  async exit(): Promise<void> {
    console.log('[BeepState] Exiting beep state');
    this.shouldStop = true;
    
    if (this.beepTimer) {
      clearTimeout(this.beepTimer);
      this.beepTimer = null;
    }
  }

  private startBeep(): void {
    if (this.shouldStop) return;
    
    // 비프음 재생 (실제 구현시 AudioContext 사용)
    console.log('[BeepState] Playing beep sound');
    
    // 1초 후 자동으로 녹음 상태로 전환
    this.beepTimer = setTimeout(() => {
      if (!this.shouldStop && !this.context.isPaused) {
        // beep 완료 후 자동으로 recording 상태로 전환
        this.callbacks.onStateChange('recording');
      }
    }, 1000);
  }

  pause(): ActionResult {
    if (this.context.isPaused) {
      return this.createActionResult(false, 'Already paused');
    }
    
    console.log('[BeepState] Pausing beep');
    if (this.beepTimer) {
      clearTimeout(this.beepTimer);
      this.beepTimer = null;
    }
    
    return this.createActionResult(true);
  }

  resume(): ActionResult {
    if (!this.context.isPaused) {
      return this.createActionResult(false, 'Not paused');
    }
    
    console.log('[BeepState] Resuming beep');
    this.startBeep(); // 비프음 재시작
    
    return this.createActionResult(true);
  }

  stop(): ActionResult {
    console.log('[BeepState] Stopping beep');
    this.shouldStop = true;
    
    if (this.beepTimer) {
      clearTimeout(this.beepTimer);
      this.beepTimer = null;
    }
    
    return this.createActionResult(true, undefined, 'idle');
  }

  getDisplayInfo(): StateDisplayInfo {
    const isPaused = this.context.isPaused;
    
    return {
      message: isPaused 
        ? '⏸️ 비프음 일시정지됨' 
        : '🔔 곧 녹음이 시작됩니다...',
      progressPercent: 0,
      statusColor: isPaused 
        ? 'bg-yellow-500' 
        : 'bg-yellow-500 animate-pulse',
      icon: '🔔',
      canPause: !isPaused,
      canResume: isPaused,
      canStop: true,
      showProgress: false,
    };
  }

  getAllowedActions(): FlowAction[] {
    const baseActions: FlowAction[] = ['stop', 'complete'];
    
    if (this.context.isPaused) {
      baseActions.push('resume');
    } else {
      baseActions.push('pause');
    }
    
    return baseActions;
  }

  // complete 액션 처리 (비프음 완료 시)
  public handleAction(action: FlowAction): ActionResult {
    if (action === 'complete' && !this.shouldStop && !this.context.isPaused) {
      return this.createActionResult(true, undefined, 'recording');
    }
    
    return super.handleAction(action);
  }
}