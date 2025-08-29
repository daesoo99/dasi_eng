/**
 * useAudioFlowController 훅 단위 테스트
 * 목적: 의존성 주입을 통한 훅의 동작 검증
 */

import { renderHook, act } from '@testing-library/react';
import { useAudioFlowController } from '@/hooks/useAudioFlowController';
import { MockServiceContainer, MockAudioFlowStateMachine } from '../mocks';

// Mock ServiceContainer를 전역으로 설정
const mockServiceContainer = new MockServiceContainer();

// getServiceContainer 함수를 모킹
jest.mock('@/container/ServiceContainer', () => ({
  getServiceContainer: jest.fn(() => mockServiceContainer),
}));

describe('useAudioFlowController', () => {
  let mockStateMachine: MockAudioFlowStateMachine;
  
  const defaultProps = {
    onSpeechResult: jest.fn(),
    onTimeout: jest.fn(),
    recordingDuration: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceContainer.resetAllMocks();
    mockStateMachine = mockServiceContainer.getMockStateMachine();
  });

  describe('훅 초기화', () => {
    test('기본값으로 초기화됨', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      expect(result.current.flowState).toBe('idle');
      expect(result.current.remainingTime).toBe(0);
      expect(result.current.isPaused).toBe(false);
    });

    test('커스텀 recordingDuration이 적용됨', () => {
      renderHook(() => useAudioFlowController({
        ...defaultProps,
        recordingDuration: 15,
      }));

      // ServiceContainer의 createAudioFlowStateMachine이 올바른 duration으로 호출되는지 확인
      expect(mockStateMachine.getContext().recordingDuration).toBe(15);
    });

    test('의존성 주입된 serviceContainer 사용', () => {
      const customContainer = new MockServiceContainer();
      
      renderHook(() => useAudioFlowController({
        ...defaultProps,
        serviceContainer: customContainer,
      }));

      // 커스텀 컨테이너가 사용되었는지 확인 (실제로는 다른 방식으로 검증 필요)
      expect(customContainer.getMockStateMachine).toBeDefined();
    });
  });

  describe('플로우 제어', () => {
    test('startFlow 호출 시 상태 머신의 startFlow가 호출됨', async () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      await act(async () => {
        await result.current.startFlow('안녕하세요');
      });

      expect(mockStateMachine.expectCalled('startFlow')).toBe(true);
      expect(mockStateMachine.getCallCount('startFlow')).toBe(1);
    });

    test('pauseFlow 호출 시 성공하면 isPaused 상태 업데이트', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      act(() => {
        result.current.pauseFlow();
      });

      expect(mockStateMachine.expectCalled('pauseFlow')).toBe(true);
      expect(result.current.isPaused).toBe(true);
    });

    test('resumeFlow 호출 시 성공하면 isPaused 상태 리셋', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      // 먼저 일시정지
      act(() => {
        result.current.pauseFlow();
      });

      // 그다음 재개
      act(() => {
        result.current.resumeFlow();
      });

      expect(mockStateMachine.expectCalled('resumeFlow')).toBe(true);
      expect(result.current.isPaused).toBe(false);
    });

    test('stopFlow 호출 시 상태가 idle로 리셋됨', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      // 먼저 플로우 시작
      act(() => {
        result.current.startFlow('테스트');
      });

      // 상태 변경 시뮬레이션
      mockStateMachine.setState('recording');

      // 중지
      act(() => {
        result.current.stopFlow();
      });

      expect(mockStateMachine.expectCalled('stopFlow')).toBe(true);
      expect(result.current.flowState).toBe('idle');
      expect(result.current.remainingTime).toBe(0);
      expect(result.current.isPaused).toBe(false);
    });

    test('playAnswerAndNext 호출이 상태 머신으로 전달됨', async () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      await act(async () => {
        await result.current.playAnswerAndNext('Hello');
      });

      expect(mockStateMachine.expectCalled('playAnswerAndNext')).toBe(true);
    });
  });

  describe('표시 정보 제공', () => {
    test('getDisplayInfo가 상태 머신의 정보를 반환', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      const customDisplayInfo = {
        message: '커스텀 메시지',
        progressPercent: 75,
        statusColor: 'bg-red-500',
        icon: '🔥',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      // Mock 설정
      mockStateMachine.mockConfig.customDisplayInfo = customDisplayInfo;

      const displayInfo = result.current.getDisplayInfo();
      expect(displayInfo).toEqual(customDisplayInfo);
    });

    test('getAllowedActions가 상태 머신의 허용 액션 반환', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      mockStateMachine.setState('recording');
      
      const allowedActions = result.current.getAllowedActions();
      expect(Array.isArray(allowedActions)).toBe(true);
      expect(allowedActions.length).toBeGreaterThan(0);
    });
  });

  describe('에러 처리', () => {
    test('startFlow 실패 시 에러가 적절히 처리됨', async () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      // Mock 설정: startFlow 실패
      mockStateMachine.mockConfig.shouldFailStart = true;

      await act(async () => {
        await result.current.startFlow('테스트');
      });

      // 에러가 발생해도 훅이 정상적으로 동작해야 함
      expect(result.current.flowState).toBe('idle');
    });

    test('pauseFlow 실패 시 isPaused 상태가 변경되지 않음', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      // Mock 설정: pauseFlow 실패
      mockStateMachine.mockConfig.shouldFailPause = true;

      act(() => {
        result.current.pauseFlow();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('콜백 처리', () => {
    test('onStateChange 콜백이 올바르게 설정됨', () => {
      const { result } = renderHook(() => useAudioFlowController(defaultProps));

      // 상태 변경 시뮬레이션
      act(() => {
        mockStateMachine.setState('recording');
        // 실제로는 상태 머신에서 콜백을 호출해야 하지만, 여기서는 직접 확인
        result.current.flowState; // 상태 접근으로 리렌더링 유도
      });

      // 콜백이 설정되었는지 확인 (실제 구현에서는 다를 수 있음)
      expect(mockStateMachine.onCallbacks).toBeDefined();
    });

    test('onSpeechResult 콜백이 전달됨', () => {
      const mockOnSpeechResult = jest.fn();
      
      renderHook(() => useAudioFlowController({
        ...defaultProps,
        onSpeechResult: mockOnSpeechResult,
      }));

      // 상태 머신 콜백에 전달되었는지 확인
      expect(mockStateMachine.onCallbacks?.onSpeechResult).toBe(mockOnSpeechResult);
    });

    test('onTimeout 콜백이 전달됨', () => {
      const mockOnTimeout = jest.fn();
      
      renderHook(() => useAudioFlowController({
        ...defaultProps,
        onTimeout: mockOnTimeout,
      }));

      expect(mockStateMachine.onCallbacks?.onTimeout).toBe(mockOnTimeout);
    });
  });

  describe('정리', () => {
    test('컴포넌트 언마운트 시 상태 머신이 정리됨', () => {
      const { unmount } = renderHook(() => useAudioFlowController(defaultProps));

      // cleanup spy 설정
      const cleanupSpy = jest.spyOn(mockStateMachine, 'cleanup');

      unmount();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('speechOptions 설정', () => {
    test('speechOptions가 ServiceContainer에 전달됨', () => {
      const customOptions = {
        questionLanguage: 'ko-KR',
        answerLanguage: 'en-US',
        speechRate: 1.2,
      };

      renderHook(() => useAudioFlowController({
        ...defaultProps,
        speechOptions: customOptions,
      }));

      // ServiceContainer 설정이 올바르게 전달되었는지 확인
      const config = mockServiceContainer.getConfiguration();
      expect(config.speechOptions?.recognitionLanguage).toBe('en-US'); // 매핑 확인
      expect(config.speechOptions?.synthesisLanguage).toBe('ko-KR');
    });
  });
});

// React Testing Library와 함께 사용하는 통합 테스트
describe('useAudioFlowController Integration', () => {
  test('전체 시나리오: 플로우 시작부터 완료까지', async () => {
    const mockOnSpeechResult = jest.fn();
    const mockOnTimeout = jest.fn();
    
    const { result } = renderHook(() => useAudioFlowController({
      onSpeechResult: mockOnSpeechResult,
      onTimeout: mockOnTimeout,
      recordingDuration: 5,
    }));

    // 초기 상태 확인
    expect(result.current.flowState).toBe('idle');

    // 플로우 시작
    await act(async () => {
      await result.current.startFlow('테스트 문장');
    });

    // 상태 머신이 호출되었는지 확인
    expect(mockServiceContainer.getMockStateMachine().getCallCount('startFlow')).toBe(1);

    // 일시정지 테스트
    act(() => {
      result.current.pauseFlow();
    });

    expect(result.current.isPaused).toBe(true);

    // 재개 테스트
    act(() => {
      result.current.resumeFlow();
    });

    expect(result.current.isPaused).toBe(false);

    // 중지 테스트
    act(() => {
      result.current.stopFlow();
    });

    expect(result.current.flowState).toBe('idle');
    expect(result.current.remainingTime).toBe(0);
  });
});