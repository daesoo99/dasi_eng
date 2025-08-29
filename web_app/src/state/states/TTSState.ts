/**
 * TTSState - 텍스트 음성 변환 상태
 * 목적: 문제 텍스트를 음성으로 재생하는 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class TTSState extends BaseFlowState {
  private ttsPromise: Promise<void> | null = null;
  private shouldStop = false;

  getStateName(): FlowState {
    return 'tts';
  }

  async enter(): Promise<void> {
    console.log('[TTSState] Entering TTS state');
    this.shouldStop = false;
    this.notifyStateChange();
    
    // TTS 시작 (비동기)
    this.startTTS();
  }

  async exit(): Promise<void> {
    console.log('[TTSState] Exiting TTS state');
    this.shouldStop = true;
    
    if (this.ttsPromise) {
      try {
        await this.ttsPromise;
      } catch (error) {
        console.warn('[TTSState] TTS cleanup error:', error);
      }
    }
  }

  private async startTTS(): Promise<void> {
    try {
      this.ttsPromise = this.performTTS();
      await this.ttsPromise;
      
      if (!this.shouldStop && !this.context.isPaused) {
        // TTS 완료 후 자동으로 beep 상태로 전환
        this.callbacks.onStateChange('beep');
      }
    } catch (error) {
      if (!this.shouldStop) {
        this.notifyError(`TTS failed: ${error}`);
      }
    }
  }

  private async performTTS(): Promise<void> {
    // 실제 TTS 구현은 서비스에서 주입받아야 함
    // 여기서는 시뮬레이션
    return new Promise((resolve, reject) => {
      const duration = 2000; // 2초 시뮬레이션
      
      const timer = setTimeout(() => {
        if (this.shouldStop) {
          reject(new Error('TTS stopped'));
        } else {
          resolve();
        }
      }, duration);

      // 중지 신호 체크
      const checkStop = setInterval(() => {
        if (this.shouldStop) {
          clearTimeout(timer);
          clearInterval(checkStop);
          reject(new Error('TTS stopped'));
        }
      }, 100);
    });
  }

  pause(): ActionResult {
    if (this.context.isPaused) {
      return this.createActionResult(false, 'Already paused');
    }
    
    // TTS 일시정지 로직
    console.log('[TTSState] Pausing TTS');
    return this.createActionResult(true);
  }

  resume(): ActionResult {
    if (!this.context.isPaused) {
      return this.createActionResult(false, 'Not paused');
    }
    
    // TTS 재개 로직
    console.log('[TTSState] Resuming TTS');
    return this.createActionResult(true);
  }

  stop(): ActionResult {
    console.log('[TTSState] Stopping TTS');
    this.shouldStop = true;
    return this.createActionResult(true, undefined, 'idle');
  }

  getDisplayInfo(): StateDisplayInfo {
    const isPaused = this.context.isPaused;
    
    return {
      message: isPaused 
        ? '⏸️ 음성 재생 일시정지됨' 
        : '🔊 문제를 들려드리고 있습니다...',
      progressPercent: 0,
      statusColor: isPaused 
        ? 'bg-yellow-500' 
        : 'bg-green-500 animate-pulse',
      icon: isPaused ? '⏸️' : '🔊',
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

  // complete 액션 처리 (TTS 완료 시)
  public handleAction(action: FlowAction): ActionResult {
    if (action === 'complete' && !this.shouldStop && !this.context.isPaused) {
      return this.createActionResult(true, undefined, 'beep');
    }
    
    return super.handleAction(action);
  }
}