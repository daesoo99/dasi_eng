/**
 * AudioFlowStateMachine - 메인 상태 머신
 * 목적: 오디오 플로우 상태를 체계적으로 관리하고 전환을 제어
 */

import { BaseFlowState } from './BaseFlowState';
import type { 
  FlowState, 
  FlowAction, 
  ActionResult, 
  StateDisplayInfo, 
  StateMachineContext, 
  FlowCallbacks,
  StateTransition 
} from './types';

// 구체 상태 클래스들 import (Phase 2에서 구현)
import { IdleState } from './states/IdleState';
import { TTSState } from './states/TTSState';
import { BeepState } from './states/BeepState';
import { RecordingState } from './states/RecordingState';
import { ProcessingState } from './states/ProcessingState';
import { TimeoutState } from './states/TimeoutState';

export class AudioFlowStateMachine {
  private currentState: BaseFlowState;
  private context: StateMachineContext;
  private callbacks: FlowCallbacks;
  private states: Map<FlowState, BaseFlowState>;
  private transitionMap: Map<string, StateTransition[]>;

  constructor(callbacks: FlowCallbacks, recordingDuration: number = 10) {
    this.callbacks = callbacks;
    this.context = {
      remainingTime: 0,
      isPaused: false,
      recordingDuration,
    };

    // 상태 인스턴스들 초기화
    this.states = new Map();
    this.initializeStates();
    
    // 상태 전환 규칙 초기화
    this.transitionMap = new Map();
    this.initializeTransitions();

    // 초기 상태 설정
    this.currentState = this.states.get('idle')!;
  }

  private initializeStates(): void {
    const stateClasses = [
      IdleState,
      TTSState,
      BeepState,
      RecordingState,
      ProcessingState,
      TimeoutState,
    ];

    stateClasses.forEach(StateClass => {
      const stateInstance = new StateClass(this.context, this.callbacks);
      this.states.set(stateInstance.getStateName(), stateInstance);
    });
  }

  private initializeTransitions(): void {
    const transitions: StateTransition[] = [
      // 정상 플로우
      { from: 'idle', to: 'tts', action: 'start' },
      { from: 'tts', to: 'beep', action: 'complete' },
      { from: 'beep', to: 'recording', action: 'complete' },
      { from: 'recording', to: 'processing', action: 'complete' },
      { from: 'processing', to: 'idle', action: 'complete' },
      
      // 타임아웃 플로우
      { from: 'recording', to: 'timeout', action: 'timeout' },
      { from: 'timeout', to: 'idle', action: 'complete' },
      
      // 중지 플로우
      { from: 'tts', to: 'idle', action: 'stop' },
      { from: 'beep', to: 'idle', action: 'stop' },
      { from: 'recording', to: 'idle', action: 'stop' },
      { from: 'timeout', to: 'idle', action: 'stop' },
    ];

    transitions.forEach(transition => {
      const key = `${transition.from}-${transition.action}`;
      const existing = this.transitionMap.get(key) || [];
      existing.push(transition);
      this.transitionMap.set(key, existing);
    });
  }

  /**
   * 현재 상태 반환
   */
  public getCurrentState(): FlowState {
    return this.currentState.getStateName();
  }

  /**
   * 컨텍스트 정보 반환
   */
  public getContext(): StateMachineContext {
    return { ...this.context };
  }

  /**
   * 상태 표시 정보 반환
   */
  public getDisplayInfo(): StateDisplayInfo {
    return this.currentState.getDisplayInfo();
  }

  /**
   * 허용된 액션 목록 반환
   */
  public getAllowedActions(): FlowAction[] {
    return this.currentState.getAllowedActions();
  }

  /**
   * 액션 실행
   */
  public async executeAction(action: FlowAction, data?: any): Promise<ActionResult> {
    console.log(`[StateMachine] Executing action '${action}' in state '${this.getCurrentState()}'`);
    
    try {
      const result = this.currentState.handleAction(action);
      
      if (result.success && result.newState && result.newState !== this.getCurrentState()) {
        await this.transitionTo(result.newState, action, data);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError(`Action execution failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 직접 상태 전환 (내부용)
   */
  public async transitionTo(newStateName: FlowState, action?: FlowAction, data?: any): Promise<void> {
    const currentStateName = this.getCurrentState();
    
    console.log(`[StateMachine] Transitioning: ${currentStateName} → ${newStateName}`);
    
    // 전환 가능성 검증
    if (action && !this.isTransitionAllowed(currentStateName, newStateName, action)) {
      throw new Error(
        `Transition from '${currentStateName}' to '${newStateName}' with action '${action}' is not allowed`
      );
    }

    const newState = this.states.get(newStateName);
    if (!newState) {
      throw new Error(`State '${newStateName}' not found`);
    }

    // 현재 상태 종료
    await this.currentState.exit();
    
    // 새 상태로 전환
    this.currentState = newState;
    
    // 새 상태 진입
    await this.currentState.enter();
    
    console.log(`[StateMachine] Transition completed: ${newStateName}`);
  }

  /**
   * 전환 가능성 검증
   */
  private isTransitionAllowed(from: FlowState, to: FlowState, action: FlowAction): boolean {
    const key = `${from}-${action}`;
    const transitions = this.transitionMap.get(key) || [];
    
    return transitions.some(transition => 
      transition.to === to && 
      (!transition.condition || transition.condition())
    );
  }

  /**
   * 플로우 시작 (외부 인터페이스)
   */
  public async startFlow(text: string): Promise<ActionResult> {
    this.context.currentText = text;
    return this.executeAction('start');
  }

  /**
   * 일시정지
   */
  public pauseFlow(): ActionResult {
    if (this.context.isPaused) {
      return { success: false, error: 'Already paused' };
    }
    
    const result = this.currentState.handleAction('pause');
    if (result.success) {
      this.context.isPaused = true;
    }
    return result;
  }

  /**
   * 재개
   */
  public resumeFlow(): ActionResult {
    if (!this.context.isPaused) {
      return { success: false, error: 'Not paused' };
    }
    
    const result = this.currentState.handleAction('resume');
    if (result.success) {
      this.context.isPaused = false;
    }
    return result;
  }

  /**
   * 중지
   */
  public stopFlow(): ActionResult {
    const result = this.currentState.handleAction('stop');
    if (result.success) {
      this.context.isPaused = false;
      this.context.remainingTime = 0;
    }
    return result;
  }

  /**
   * 정답 재생
   */
  public async playAnswerAndNext(answerText?: string): Promise<ActionResult> {
    this.context.answerText = answerText;
    return this.executeAction('complete');
  }

  /**
   * 컨텍스트 업데이트
   */
  public updateContext(updates: Partial<StateMachineContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 정리
   */
  public async cleanup(): Promise<void> {
    console.log('[StateMachine] Cleaning up...');
    
    try {
      await this.currentState.exit();
    } catch (error) {
      console.warn('[StateMachine] Error during cleanup:', error);
    }
    
    // 모든 상태 정리
    this.states.clear();
    this.transitionMap.clear();
  }
}