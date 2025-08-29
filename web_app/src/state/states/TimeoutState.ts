/**
 * TimeoutState - 시간 초과 상태
 * 목적: 녹음 시간 초과 시 정답을 제공하는 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class TimeoutState extends BaseFlowState {
  private answerTTSPromise: Promise<void> | null = null;
  private shouldStop = false;

  getStateName(): FlowState {
    return 'timeout';
  }

  async enter(): Promise<void> {
    console.log('[TimeoutState] Entering timeout state');
    this.shouldStop = false;
    this.context.remainingTime = 0;
    
    this.notifyStateChange();
    this.playAnswer();
  }

  async exit(): Promise<void> {
    console.log('[TimeoutState] Exiting timeout state');
    this.shouldStop = true;
    
    if (this.answerTTSPromise) {
      try {
        await this.answerTTSPromise;
      } catch (error) {
        console.warn('[TimeoutState] Answer TTS cleanup error:', error);
      }
    }
  }

  private async playAnswer(): Promise<void> {
    try {
      console.log('[TimeoutState] Playing answer after timeout');
      
      // 정답이 있는 경우에만 TTS 재생
      if (this.context.answerText) {
        this.answerTTSPromise = this.performAnswerTTS();
        await this.answerTTSPromise;
      }
      
      if (!this.shouldStop) {
        // 정답 재생 완료 후 일정 시간 대기 후 idle로 전환
        setTimeout(() => {
          if (!this.shouldStop) {
            this.callbacks.onStateChange('idle');
          }
        }, 1000); // 1초 대기
      }
    } catch (error) {
      if (!this.shouldStop) {
        this.notifyError(`Answer playback failed: ${error}`);
        // 에러가 발생해도 idle로 돌아감
        this.callbacks.onStateChange('idle');
      }
    }
  }

  private async performAnswerTTS(): Promise<void> {
    // 실제 구현시 SpeechProcessingService를 통해 정답 TTS
    // 여기서는 시뮬레이션
    return new Promise((resolve, reject) => {
      const answerDuration = 3000; // 3초 시뮬레이션
      
      console.log(`[TimeoutState] Playing answer: "${this.context.answerText}"`);
      
      const timer = setTimeout(() => {
        if (this.shouldStop) {
          reject(new Error('Answer TTS stopped'));
        } else {
          console.log('[TimeoutState] Answer playback completed');
          resolve();
        }
      }, answerDuration);

      // 중지 신호 체크
      const checkStop = setInterval(() => {
        if (this.shouldStop) {
          clearTimeout(timer);
          clearInterval(checkStop);
          reject(new Error('Answer TTS stopped'));
        }
      }, 100);
    });
  }

  pause(): ActionResult {
    if (this.context.isPaused) {
      return this.createActionResult(false, 'Already paused');
    }
    
    console.log('[TimeoutState] Pausing answer playback');
    return this.createActionResult(true);
  }

  resume(): ActionResult {
    if (!this.context.isPaused) {
      return this.createActionResult(false, 'Not paused');
    }
    
    console.log('[TimeoutState] Resuming answer playback');
    return this.createActionResult(true);
  }

  stop(): ActionResult {
    console.log('[TimeoutState] Stopping timeout state');
    this.shouldStop = true;
    return this.createActionResult(true, undefined, 'idle');
  }

  getDisplayInfo(): StateDisplayInfo {
    const isPaused = this.context.isPaused;
    
    return {
      message: isPaused
        ? '⏸️ 정답 재생 일시정지됨'
        : '⏰ 시간 초과 - 정답을 들려드립니다...',
      progressPercent: 0,
      statusColor: isPaused 
        ? 'bg-yellow-500' 
        : 'bg-orange-500 animate-pulse',
      icon: '⏰',
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

  // complete 액션 처리 (정답 재생 완료 시)
  public handleAction(action: FlowAction): ActionResult {
    if (action === 'complete' && !this.shouldStop) {
      console.log('[TimeoutState] Answer playback completed via action');
      return this.createActionResult(true, undefined, 'idle');
    }
    
    return super.handleAction(action);
  }
}