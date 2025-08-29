/**
 * IdleState - 대기 상태
 * 목적: 플로우가 시작되기 전이나 완료 후의 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class IdleState extends BaseFlowState {
  getStateName(): FlowState {
    return 'idle';
  }

  async enter(): Promise<void> {
    console.log('[IdleState] Entering idle state');
    this.context.remainingTime = 0;
    this.context.isPaused = false;
    this.notifyStateChange();
  }

  async exit(): Promise<void> {
    console.log('[IdleState] Exiting idle state');
  }

  pause(): ActionResult {
    return this.createActionResult(false, 'Cannot pause in idle state');
  }

  resume(): ActionResult {
    return this.createActionResult(false, 'Cannot resume in idle state');
  }

  stop(): ActionResult {
    return this.createActionResult(false, 'Already in idle state');
  }

  getDisplayInfo(): StateDisplayInfo {
    return {
      message: '',
      progressPercent: 0,
      statusColor: 'bg-gray-500',
      icon: '⚪',
      canPause: false,
      canResume: false,
      canStop: false,
      showProgress: false,
    };
  }

  getAllowedActions(): FlowAction[] {
    return ['start'];
  }

  // start 액션 처리 (오버라이드)
  public handleAction(action: FlowAction): ActionResult {
    if (action === 'start') {
      if (!this.context.currentText) {
        return this.createActionResult(false, 'No text provided for TTS');
      }
      return this.createActionResult(true, undefined, 'tts');
    }
    
    return super.handleAction(action);
  }
}