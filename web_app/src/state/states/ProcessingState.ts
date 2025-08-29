/**
 * ProcessingState - 음성 처리 상태
 * 목적: 녹음된 음성을 텍스트로 변환하고 분석하는 상태
 */

import { BaseFlowState } from '../BaseFlowState';
import type { FlowState, FlowAction, ActionResult, StateDisplayInfo } from '../types';

export class ProcessingState extends BaseFlowState {
  private processingPromise: Promise<void> | null = null;
  private shouldStop = false;

  getStateName(): FlowState {
    return 'processing';
  }

  async enter(): Promise<void> {
    console.log('[ProcessingState] Entering processing state');
    this.shouldStop = false;
    this.context.remainingTime = 0;
    
    this.notifyStateChange();
    this.startProcessing();
  }

  async exit(): Promise<void> {
    console.log('[ProcessingState] Exiting processing state');
    this.shouldStop = true;
    
    if (this.processingPromise) {
      try {
        await this.processingPromise;
      } catch (error) {
        console.warn('[ProcessingState] Processing cleanup error:', error);
      }
    }
  }

  private async startProcessing(): Promise<void> {
    try {
      console.log('[ProcessingState] Starting speech processing');
      
      this.processingPromise = this.performProcessing();
      await this.processingPromise;
      
      if (!this.shouldStop) {
        console.log('[ProcessingState] Processing completed successfully');
        // 처리 완료 후 자동으로 idle 상태로 전환
        this.callbacks.onStateChange('idle');
      }
    } catch (error) {
      if (!this.shouldStop) {
        this.notifyError(`Processing failed: ${error}`);
        // 에러 발생 시에도 idle로 돌아감
        this.callbacks.onStateChange('idle');
      }
    }
  }

  private async performProcessing(): Promise<void> {
    // 실제 구현시 SpeechProcessingService를 통해 처리
    // 여기서는 시뮬레이션
    return new Promise((resolve, reject) => {
      const processingTime = 2000; // 2초 시뮬레이션
      
      const timer = setTimeout(() => {
        if (this.shouldStop) {
          reject(new Error('Processing stopped'));
        } else {
          // 모의 음성 인식 결과 생성
          const mockTranscript = 'Hello world';
          const mockConfidence = 0.95;
          
          console.log(`[ProcessingState] Mock result: "${mockTranscript}" (${mockConfidence})`);
          this.callbacks.onSpeechResult(mockTranscript, mockConfidence);
          
          resolve();
        }
      }, processingTime);

      // 중지 신호 체크
      const checkStop = setInterval(() => {
        if (this.shouldStop) {
          clearTimeout(timer);
          clearInterval(checkStop);
          reject(new Error('Processing stopped'));
        }
      }, 100);
    });
  }

  pause(): ActionResult {
    return this.createActionResult(false, 'Cannot pause during processing');
  }

  resume(): ActionResult {
    return this.createActionResult(false, 'Cannot resume during processing');
  }

  stop(): ActionResult {
    console.log('[ProcessingState] Stopping processing');
    this.shouldStop = true;
    return this.createActionResult(true, undefined, 'idle');
  }

  getDisplayInfo(): StateDisplayInfo {
    return {
      message: '🤖 답변을 분석 중입니다...',
      progressPercent: 0, // 진행률을 알 수 없음
      statusColor: 'bg-blue-500',
      icon: '🤖',
      canPause: false,
      canResume: false,
      canStop: false, // 처리 중에는 중지 불가
      showProgress: false,
    };
  }

  getAllowedActions(): FlowAction[] {
    return ['complete']; // processing 상태에서는 완료만 가능
  }

  // complete 액션 처리 (처리 완료 시)
  public handleAction(action: FlowAction): ActionResult {
    if (action === 'complete' && !this.shouldStop) {
      console.log('[ProcessingState] Processing completed via action');
      return this.createActionResult(true, undefined, 'idle');
    }
    
    return super.handleAction(action);
  }
}