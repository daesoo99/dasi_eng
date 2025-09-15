/**
 * AudioFlowStateMachine 단위 테스트
 * 목적: 상태 머신의 상태 전환 로직 검증
 */

import { AudioFlowStateMachine } from '@/state/AudioFlowStateMachine';
import { createMockCallbacks } from '../mocks';
import type { FlowCallbacks } from '@/state/types';

describe('AudioFlowStateMachine', () => {
  let stateMachine: AudioFlowStateMachine;
  let mockCallbacks: FlowCallbacks;

  beforeEach(() => {
    mockCallbacks = createMockCallbacks();
    stateMachine = new AudioFlowStateMachine(mockCallbacks, 10);
  });

  afterEach(async () => {
    await stateMachine.cleanup();
  });

  describe('초기화', () => {
    test('초기 상태는 idle이어야 함', () => {
      expect(stateMachine.getCurrentState()).toBe('idle');
    });

    test('초기 컨텍스트 설정이 올바르게 됨', () => {
      const context = stateMachine.getContext();
      expect(context.remainingTime).toBe(0);
      expect(context.isPaused).toBe(false);
      expect(context.recordingDuration).toBe(10);
    });

    test('초기 상태에서 허용되는 액션은 start만 있어야 함', () => {
      const allowedActions = stateMachine.getAllowedActions();
      expect(allowedActions).toEqual(['start']);
    });
  });

  describe('상태 전환', () => {
    test('idle에서 start 액션으로 tts 상태로 전환', async () => {
      const result = await stateMachine.startFlow('안녕하세요');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('tts');
      expect(mockCallbacks.onStateChange).toHaveBeenCalledWith('tts');
    });

    test('잘못된 상태에서 액션 실행 시 실패', async () => {
      // idle 상태에서 pause 시도
      const result = stateMachine.pauseFlow();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed in state');
    });

    test('전체 플로우 진행 (idle → tts → beep → recording → processing → idle)', async () => {
      // 1. Start flow
      await stateMachine.startFlow('테스트');
      expect(stateMachine.getCurrentState()).toBe('tts');

      // 2. TTS complete
      await stateMachine.executeAction('complete');
      expect(stateMachine.getCurrentState()).toBe('beep');

      // 3. Beep complete
      await stateMachine.executeAction('complete');
      expect(stateMachine.getCurrentState()).toBe('recording');

      // 4. Recording complete
      await stateMachine.executeAction('complete');
      expect(stateMachine.getCurrentState()).toBe('processing');

      // 5. Processing complete
      await stateMachine.executeAction('complete');
      expect(stateMachine.getCurrentState()).toBe('idle');
    });
  });

  describe('일시정지 및 재개', () => {
    beforeEach(async () => {
      await stateMachine.startFlow('테스트');
      await stateMachine.executeAction('complete'); // tts → beep
      await stateMachine.executeAction('complete'); // beep → recording
    });

    test('recording 상태에서 일시정지 가능', () => {
      expect(stateMachine.getCurrentState()).toBe('recording');
      
      const result = stateMachine.pauseFlow();
      expect(result.success).toBe(true);
      
      const context = stateMachine.getContext();
      expect(context.isPaused).toBe(true);
    });

    test('일시정지 후 재개 가능', () => {
      stateMachine.pauseFlow();
      
      const result = stateMachine.resumeFlow();
      expect(result.success).toBe(true);
      
      const context = stateMachine.getContext();
      expect(context.isPaused).toBe(false);
    });

    test('일시정지되지 않은 상태에서 재개 시도 시 실패', () => {
      const result = stateMachine.resumeFlow();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not paused');
    });
  });

  describe('중지 기능', () => {
    test('진행 중인 플로우를 중지하면 idle로 돌아감', async () => {
      await stateMachine.startFlow('테스트');
      expect(stateMachine.getCurrentState()).toBe('tts');
      
      const result = stateMachine.stopFlow();
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('idle');
      
      const context = stateMachine.getContext();
      expect(context.isPaused).toBe(false);
      expect(context.remainingTime).toBe(0);
    });
  });

  describe('타임아웃 처리', () => {
    test('recording에서 timeout 액션으로 timeout 상태로 전환', async () => {
      await stateMachine.startFlow('테스트');
      await stateMachine.executeAction('complete'); // tts → beep
      await stateMachine.executeAction('complete'); // beep → recording
      
      const result = await stateMachine.executeAction('timeout');
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('timeout');
      expect(mockCallbacks.onTimeout).toHaveBeenCalled();
    });
  });

  describe('표시 정보', () => {
    test('각 상태별로 적절한 표시 정보 반환', async () => {
      // idle 상태
      let displayInfo = stateMachine.getDisplayInfo();
      expect(displayInfo.canPause).toBe(false);
      expect(displayInfo.canStop).toBe(false);
      
      // recording 상태로 이동
      await stateMachine.startFlow('테스트');
      await stateMachine.executeAction('complete'); // tts → beep
      await stateMachine.executeAction('complete'); // beep → recording
      
      displayInfo = stateMachine.getDisplayInfo();
      expect(displayInfo.canPause).toBe(true);
      expect(displayInfo.canStop).toBe(true);
      expect(displayInfo.showProgress).toBe(true);
    });
  });

  describe('컨텍스트 업데이트', () => {
    test('컨텍스트 부분 업데이트', () => {
      stateMachine.updateContext({ remainingTime: 5 });
      
      const context = stateMachine.getContext();
      expect(context.remainingTime).toBe(5);
      expect(context.recordingDuration).toBe(10); // 기존 값 유지
    });
  });

  describe('에러 처리', () => {
    test('존재하지 않는 액션 실행 시 에러', async () => {
      const result = await stateMachine.executeAction('invalid_action');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not implemented');
    });

    test('콜백에서 에러 발생 시 처리', async () => {
      // 에러 발생하는 콜백 설정
      const errorCallbacks = {
        ...mockCallbacks,
        onStateChange: jest.fn(() => { throw new Error('Callback error'); }),
      };
      
      const errorStateMachine = new AudioFlowStateMachine(errorCallbacks, 10);
      
      // 에러가 발생해도 상태 머신은 계속 동작해야 함
      const result = await errorStateMachine.startFlow('테스트');
      expect(result.success).toBe(true);
      
      await errorStateMachine.cleanup();
    });
  });

  describe('정리', () => {
    test('cleanup 호출 시 모든 리소스가 정리됨', async () => {
      await stateMachine.startFlow('테스트');
      
      await stateMachine.cleanup();
      
      // cleanup 후에는 상태 머신이 정리 상태가 되어야 함
      // 실제 구현에서는 내부 상태를 확인하는 방법이 필요할 수 있음
    });
  });
});

// 통합 테스트
describe('AudioFlowStateMachine Integration', () => {
  test('전체 시나리오: 정상 플로우 완주', async () => {
    const mockCallbacks = createMockCallbacks();
    const stateMachine = new AudioFlowStateMachine(mockCallbacks, 5);
    
    try {
      // 전체 플로우 진행
      await stateMachine.startFlow('테스트 문장');
      
      // 각 단계별로 complete 호출
      await stateMachine.executeAction('complete'); // tts → beep
      await stateMachine.executeAction('complete'); // beep → recording
      await stateMachine.executeAction('complete'); // recording → processing
      await stateMachine.executeAction('complete'); // processing → idle
      
      // 최종 상태 검증
      expect(stateMachine.getCurrentState()).toBe('idle');
      
      // 모든 상태 변화 콜백이 호출되었는지 확인
      expect(mockCallbacks.onStateChange).toHaveBeenCalledTimes(5);
      expect(mockCallbacks.onStateChange).toHaveBeenNthCalledWith(1, 'tts');
      expect(mockCallbacks.onStateChange).toHaveBeenNthCalledWith(2, 'beep');
      expect(mockCallbacks.onStateChange).toHaveBeenNthCalledWith(3, 'recording');
      expect(mockCallbacks.onStateChange).toHaveBeenNthCalledWith(4, 'processing');
      expect(mockCallbacks.onStateChange).toHaveBeenNthCalledWith(5, 'idle');
      
    } finally {
      await stateMachine.cleanup();
    }
  });

  test('에러 시나리오: 중간에 중지', async () => {
    const mockCallbacks = createMockCallbacks();
    const stateMachine = new AudioFlowStateMachine(mockCallbacks, 5);
    
    try {
      await stateMachine.startFlow('테스트');
      await stateMachine.executeAction('complete'); // tts → beep
      
      // 중간에 중지
      const stopResult = stateMachine.stopFlow();
      expect(stopResult.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('idle');
      
    } finally {
      await stateMachine.cleanup();
    }
  });
});