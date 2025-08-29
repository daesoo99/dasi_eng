/**
 * BaseFlowState - 추상 상태 클래스
 * 목적: State 패턴의 기본 인터페이스 정의
 */

import type { 
  FlowState, 
  FlowAction, 
  ActionResult, 
  StateDisplayInfo, 
  StateMachineContext, 
  FlowCallbacks 
} from './types';

export abstract class BaseFlowState {
  protected context: StateMachineContext;
  protected callbacks: FlowCallbacks;
  
  constructor(context: StateMachineContext, callbacks: FlowCallbacks) {
    this.context = context;
    this.callbacks = callbacks;
  }

  // 추상 메서드들 - 각 상태에서 반드시 구현해야 함
  abstract getStateName(): FlowState;
  abstract enter(): Promise<void>;
  abstract exit(): Promise<void>;
  abstract pause(): ActionResult;
  abstract resume(): ActionResult;
  abstract stop(): ActionResult;
  abstract getDisplayInfo(): StateDisplayInfo;
  abstract getAllowedActions(): FlowAction[];

  // 공통 유틸리티 메서드들
  protected createActionResult(
    success: boolean, 
    error?: string, 
    newState?: FlowState
  ): ActionResult {
    return { success, error, newState };
  }

  protected isActionAllowed(action: FlowAction): boolean {
    return this.getAllowedActions().includes(action);
  }

  protected validateAction(action: FlowAction): ActionResult {
    if (!this.isActionAllowed(action)) {
      return this.createActionResult(
        false, 
        `Action '${action}' is not allowed in state '${this.getStateName()}'`
      );
    }
    return this.createActionResult(true);
  }

  // 상태 진입 시 자동으로 호출되는 콜백
  protected notifyStateChange(): void {
    this.callbacks.onStateChange(this.getStateName());
  }

  protected notifyTimeUpdate(timeRemaining: number): void {
    this.callbacks.onTimeUpdate(timeRemaining);
  }

  protected notifyError(error: string): void {
    this.callbacks.onError(`[${this.getStateName()}] ${error}`);
  }

  // 디폴트 액션 구현 (하위 클래스에서 오버라이드 가능)
  public handleAction(action: FlowAction): ActionResult {
    const validation = this.validateAction(action);
    if (!validation.success) {
      return validation;
    }

    switch (action) {
      case 'pause':
        return this.pause();
      case 'resume':
        return this.resume();
      case 'stop':
        return this.stop();
      default:
        return this.createActionResult(
          false, 
          `Action '${action}' not implemented in ${this.getStateName()}`
        );
    }
  }
}