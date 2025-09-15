/**
 * MockAudioFlowStateMachine - 테스트용 상태 머신 Mock
 * 목적: 단위 테스트에서 실제 상태 머신 없이 테스트 가능
 */

import type { FlowState, ActionResult, StateDisplayInfo } from '@/state/types';
import type { IAudioFlowStateMachine } from '@/container/ServiceContainer';

export class MockAudioFlowStateMachine implements IAudioFlowStateMachine {
  private currentState: FlowState = 'idle';
  private context = {
    remainingTime: 0,
    isPaused: false,
    recordingDuration: 10,
  };

  // Mock 동작을 제어하기 위한 테스트 설정
  public mockConfig = {
    shouldFailStart: false,
    shouldFailPause: false,
    simulateTimeout: false,
    customDisplayInfo: null as StateDisplayInfo | null,
  };

  // 호출 추적을 위한 스파이 기능
  public calls = {
    startFlow: 0,
    pauseFlow: 0,
    resumeFlow: 0,
    stopFlow: 0,
    playAnswerAndNext: 0,
    executeAction: 0,
  };

  getCurrentState(): string {
    return this.currentState;
  }

  getContext(): any {
    return { ...this.context };
  }

  getDisplayInfo(): StateDisplayInfo {
    if (this.mockConfig.customDisplayInfo) {
      return this.mockConfig.customDisplayInfo;
    }

    // 기본 Mock 표시 정보
    const baseInfo: StateDisplayInfo = {
      message: `Mock: ${this.currentState} state`,
      progressPercent: this.context.remainingTime > 0 ? 50 : 0,
      statusColor: 'bg-blue-500',
      icon: '🧪',
      canPause: this.currentState === 'recording' && !this.context.isPaused,
      canResume: this.currentState === 'recording' && this.context.isPaused,
      canStop: this.currentState !== 'idle',
      showProgress: this.currentState === 'recording',
    };

    return baseInfo;
  }

  getAllowedActions(): string[] {
    const actionMap: Record<FlowState, string[]> = {
      idle: ['start'],
      tts: ['pause', 'resume', 'stop', 'complete'],
      beep: ['pause', 'resume', 'stop', 'complete'],
      recording: ['pause', 'resume', 'stop', 'complete', 'timeout'],
      processing: ['complete'],
      timeout: ['pause', 'resume', 'stop', 'complete'],
    };

    return actionMap[this.currentState] || [];
  }

  async executeAction(action: string, _data?: any): Promise<ActionResult> {
    this.calls.executeAction++;
    console.log(`[MockStateMachine] Executing action: ${action} in state: ${this.currentState}`);
    
    // 테스트 실패 시뮬레이션
    if (action === 'start' && this.mockConfig.shouldFailStart) {
      return { success: false, error: 'Mock: Start failed' };
    }

    // 상태 전환 시뮬레이션
    switch (action) {
      case 'start':
        this.currentState = 'tts';
        break;
      case 'complete':
        if (this.currentState === 'tts') this.currentState = 'beep';
        else if (this.currentState === 'beep') this.currentState = 'recording';
        else if (this.currentState === 'recording') this.currentState = 'processing';
        else if (this.currentState === 'processing') this.currentState = 'idle';
        break;
      case 'timeout':
        if (this.currentState === 'recording') this.currentState = 'timeout';
        break;
      case 'stop':
        this.currentState = 'idle';
        break;
    }

    return { success: true, newState: this.currentState };
  }

  async startFlow(text: string): Promise<ActionResult> {
    this.calls.startFlow++;
    return this.executeAction('start', { text });
  }

  pauseFlow(): ActionResult {
    this.calls.pauseFlow++;
    
    if (this.mockConfig.shouldFailPause) {
      return { success: false, error: 'Mock: Pause failed' };
    }

    this.context.isPaused = true;
    return { success: true };
  }

  resumeFlow(): ActionResult {
    this.calls.resumeFlow++;
    this.context.isPaused = false;
    return { success: true };
  }

  stopFlow(): ActionResult {
    this.calls.stopFlow++;
    this.currentState = 'idle';
    this.context.isPaused = false;
    this.context.remainingTime = 0;
    return { success: true };
  }

  async playAnswerAndNext(_answerText?: string): Promise<ActionResult> {
    this.calls.playAnswerAndNext++;
    return { success: true };
  }

  updateContext(updates: any): void {
    this.context = { ...this.context, ...updates };
  }

  async cleanup(): Promise<void> {
    console.log('[MockStateMachine] Cleanup called');
    this.reset();
  }

  // 테스트 유틸리티 메서드들
  public reset(): void {
    this.currentState = 'idle';
    this.context = {
      remainingTime: 0,
      isPaused: false,
      recordingDuration: 10,
    };
    this.calls = {
      startFlow: 0,
      pauseFlow: 0,
      resumeFlow: 0,
      stopFlow: 0,
      playAnswerAndNext: 0,
      executeAction: 0,
    };
    this.mockConfig = {
      shouldFailStart: false,
      shouldFailPause: false,
      simulateTimeout: false,
      customDisplayInfo: null,
    };
  }

  public setState(state: FlowState): void {
    this.currentState = state;
  }

  public setContext(context: Partial<typeof this.context>): void {
    this.context = { ...this.context, ...context };
  }

  public getCallCount(method: keyof typeof this.calls): number {
    return this.calls[method];
  }

  public expectCalled(method: keyof typeof this.calls, times: number = 1): boolean {
    return this.calls[method] === times;
  }
}