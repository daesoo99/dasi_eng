/**
 * AudioFlow 통합 테스트
 * 목적: 상태 머신, 훅, 컴포넌트의 통합 동작 검증
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoSpeakingFlowV2 } from '@/components/AutoSpeakingFlowV2';
import { MockServiceContainer, createMockCard } from '../mocks';

// Mock ServiceContainer를 전역으로 설정
const mockServiceContainer = new MockServiceContainer();

// getServiceContainer 함수를 모킹
jest.mock('@/container/ServiceContainer', () => ({
  getServiceContainer: jest.fn(() => mockServiceContainer),
}));

// 테스트용 래퍼 컴포넌트
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('AudioFlow Integration Tests', () => {
  const mockCard = createMockCard();
  const mockOnSpeechResult = jest.fn();
  const mockOnTimeout = jest.fn();

  const defaultProps = {
    currentCard: mockCard,
    onSpeechResult: mockOnSpeechResult,
    onTimeout: mockOnTimeout,
    isActive: true,
    recordingDuration: 5,
    serviceContainer: mockServiceContainer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceContainer.resetAllMocks();
  });

  describe('컴포넌트 렌더링', () => {
    test('비활성 상태에서는 컴포넌트가 렌더링되지 않음', () => {
      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} isActive={false} />
        </TestWrapper>
      );

      expect(screen.queryByText(/말씀해 주세요/)).not.toBeInTheDocument();
    });

    test('활성 상태에서 초기 UI가 올바르게 렌더링됨', async () => {
      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 상태 머신에서 제공하는 기본 정보가 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText(/Mock: idle state/)).toBeInTheDocument();
      });
    });
  });

  describe('카드 변경 시 자동 시작', () => {
    test('새 카드가 설정되면 자동으로 플로우 시작', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} currentCard={null} />
        </TestWrapper>
      );

      // 카드 설정
      rerender(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} currentCard={mockCard} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockServiceContainer.getMockStateMachine().getCallCount('startFlow')).toBe(1);
      });
    });

    test('동일한 카드로 재설정해도 중복 시작하지 않음', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 동일한 카드로 재렌더링
      rerender(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockServiceContainer.getMockStateMachine().getCallCount('startFlow')).toBe(1);
      });
    });
  });

  describe('상태별 UI 표시', () => {
    test('recording 상태에서 진행 바와 제어 버튼 표시', async () => {
      // Mock 설정: recording 상태
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🎤 말씀해 주세요... (남은 시간: 3초)',
        progressPercent: 60,
        statusColor: 'bg-red-500 animate-pulse',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        // 메시지 표시 확인
        expect(screen.getByText(/말씀해 주세요/)).toBeInTheDocument();
        
        // 일시정지 버튼 표시 확인
        expect(screen.getByText('⏸️ 일시정지')).toBeInTheDocument();
        
        // 중지 버튼 표시 확인
        expect(screen.getByText('⏹️ 중지')).toBeInTheDocument();
        
        // 재개 버튼은 표시되지 않음
        expect(screen.queryByText('▶️ 재개')).not.toBeInTheDocument();
      });
    });

    test('일시정지 상태에서 재개 버튼 표시', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '⏸️ 녹음 일시정지됨',
        progressPercent: 30,
        statusColor: 'bg-yellow-500',
        icon: '⏸️',
        canPause: false,
        canResume: true,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('▶️ 재개')).toBeInTheDocument();
        expect(screen.queryByText('⏸️ 일시정지')).not.toBeInTheDocument();
      });
    });
  });

  describe('사용자 인터랙션', () => {
    test('일시정지 버튼 클릭 시 상태 머신 호출', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🎤 말씀해 주세요...',
        progressPercent: 50,
        statusColor: 'bg-red-500',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      const pauseButton = await screen.findByText('⏸️ 일시정지');
      fireEvent.click(pauseButton);

      expect(mockStateMachine.getCallCount('pauseFlow')).toBe(1);
    });

    test('재개 버튼 클릭 시 상태 머신 호출', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '⏸️ 일시정지됨',
        progressPercent: 50,
        statusColor: 'bg-yellow-500',
        icon: '⏸️',
        canPause: false,
        canResume: true,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      const resumeButton = await screen.findByText('▶️ 재개');
      fireEvent.click(resumeButton);

      expect(mockStateMachine.getCallCount('resumeFlow')).toBe(1);
    });

    test('중지 버튼 클릭 시 상태 머신 호출', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🎤 말씀해 주세요...',
        progressPercent: 50,
        statusColor: 'bg-red-500',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      const stopButton = await screen.findByText('⏹️ 중지');
      fireEvent.click(stopButton);

      expect(mockStateMachine.getCallCount('stopFlow')).toBe(1);
    });

    test('정답 듣기 버튼 클릭 시 상태 머신 호출', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🔊 문제를 들려드리고 있습니다...',
        progressPercent: 0,
        statusColor: 'bg-green-500',
        icon: '🔊',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: false,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 
            {...defaultProps} 
            currentCard={{ ...mockCard, target_en: 'Hello World' }} 
          />
        </TestWrapper>
      );

      const answerButton = await screen.findByText('🔊 정답 듣기');
      fireEvent.click(answerButton);

      expect(mockStateMachine.getCallCount('playAnswerAndNext')).toBe(1);
    });
  });

  describe('진행 바 표시', () => {
    test('showProgress가 true일 때 진행 바 표시', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '녹음 중...',
        progressPercent: 75,
        statusColor: 'bg-red-500',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 진행 바가 표시되는지 확인
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle('width: 75%');
    });

    test('showProgress가 false일 때 진행 바 숨김', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '처리 중...',
        progressPercent: 0,
        statusColor: 'bg-blue-500',
        icon: '🤖',
        canPause: false,
        canResume: false,
        canStop: false,
        showProgress: false,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 진행 바 컨테이너가 렌더링되지 않는지 확인
      const progressContainer = document.querySelector('.bg-blue-200');
      expect(progressContainer).not.toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    test('screen reader를 위한 상태 안내가 제공됨', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🎤 말씀해 주세요...',
        progressPercent: 50,
        statusColor: 'bg-red-500',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // aria-live 영역 확인
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveClass('sr-only');
    });

    test('버튼들에 적절한 aria-label 설정', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      mockStateMachine.mockConfig.customDisplayInfo = {
        message: '🎤 말씀해 주세요...',
        progressPercent: 50,
        statusColor: 'bg-red-500',
        icon: '🎤',
        canPause: true,
        canResume: false,
        canStop: true,
        showProgress: true,
      };

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('일시정지')).toBeInTheDocument();
      expect(screen.getByLabelText('중지')).toBeInTheDocument();
    });
  });

  describe('에러 처리', () => {
    test('상태 머신 에러 시에도 UI가 정상적으로 표시됨', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      
      // Mock 에러 설정
      mockStateMachine.mockConfig.shouldFailStart = true;

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 에러 발생해도 기본 UI는 표시되어야 함
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /일시정지|재개|중지/ })).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    test('표시 정보가 없어도 기본 UI 제공', async () => {
      const mockStateMachine = mockServiceContainer.getMockStateMachine();
      
      // getDisplayInfo에서 null 반환하도록 설정
      jest.spyOn(mockStateMachine, 'getDisplayInfo').mockReturnValue(null as any);

      render(
        <TestWrapper>
          <AutoSpeakingFlowV2 {...defaultProps} />
        </TestWrapper>
      );

      // 기본 fallback UI가 표시되는지 확인
      expect(screen.getByText('')).toBeInTheDocument(); // 빈 메시지라도 엘리먼트는 있어야 함
    });
  });
});

// 전체 시나리오 통합 테스트
describe('AudioFlow End-to-End Scenarios', () => {
  test('완전한 플로우: 시작 → 일시정지 → 재개 → 완료', async () => {
    const mockServiceContainer = new MockServiceContainer();
    const mockStateMachine = mockServiceContainer.getMockStateMachine();
    
    const mockOnSpeechResult = jest.fn();
    const mockCard = createMockCard();

    let currentDisplayInfo = {
      message: 'Mock: idle state',
      progressPercent: 0,
      statusColor: 'bg-gray-500',
      icon: '⚪',
      canPause: false,
      canResume: false,
      canStop: false,
      showProgress: false,
    };

    mockStateMachine.mockConfig.customDisplayInfo = currentDisplayInfo;

    const { rerender } = render(
      <TestWrapper>
        <AutoSpeakingFlowV2
          currentCard={mockCard}
          onSpeechResult={mockOnSpeechResult}
          isActive={true}
          recordingDuration={10}
          serviceContainer={mockServiceContainer}
        />
      </TestWrapper>
    );

    // 1. 자동 시작 확인
    await waitFor(() => {
      expect(mockStateMachine.getCallCount('startFlow')).toBe(1);
    });

    // 2. recording 상태로 변경
    currentDisplayInfo = {
      message: '🎤 말씀해 주세요...',
      progressPercent: 50,
      statusColor: 'bg-red-500',
      icon: '🎤',
      canPause: true,
      canResume: false,
      canStop: true,
      showProgress: true,
    };
    mockStateMachine.mockConfig.customDisplayInfo = currentDisplayInfo;
    
    rerender(
      <TestWrapper>
        <AutoSpeakingFlowV2
          currentCard={mockCard}
          onSpeechResult={mockOnSpeechResult}
          isActive={true}
          recordingDuration={10}
          serviceContainer={mockServiceContainer}
        />
      </TestWrapper>
    );

    // 3. 일시정지 버튼 클릭
    const pauseButton = await screen.findByText('⏸️ 일시정지');
    fireEvent.click(pauseButton);

    // 4. 일시정지 상태로 변경
    currentDisplayInfo = {
      message: '⏸️ 녹음 일시정지됨',
      progressPercent: 50,
      statusColor: 'bg-yellow-500',
      icon: '⏸️',
      canPause: false,
      canResume: true,
      canStop: true,
      showProgress: true,
    };
    mockStateMachine.mockConfig.customDisplayInfo = currentDisplayInfo;
    
    rerender(
      <TestWrapper>
        <AutoSpeakingFlowV2
          currentCard={mockCard}
          onSpeechResult={mockOnSpeechResult}
          isActive={true}
          recordingDuration={10}
          serviceContainer={mockServiceContainer}
        />
      </TestWrapper>
    );

    // 5. 재개 버튼 클릭
    const resumeButton = await screen.findByText('▶️ 재개');
    fireEvent.click(resumeButton);

    // 모든 상호작용이 올바르게 호출되었는지 확인
    expect(mockStateMachine.getCallCount('startFlow')).toBe(1);
    expect(mockStateMachine.getCallCount('pauseFlow')).toBe(1);
    expect(mockStateMachine.getCallCount('resumeFlow')).toBe(1);
  });
});