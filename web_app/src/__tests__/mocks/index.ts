/**
 * Mock Services Index - 테스트용 Mock 객체들 통합 export
 * 목적: 테스트에서 쉽게 Mock 객체들을 import할 수 있도록 제공
 */

export { MockAudioFlowStateMachine } from './MockAudioFlowStateMachine';
export { MockServiceContainer } from './MockServiceContainer';
export { MockSpeechProcessingService } from './MockSpeechProcessingService';
export { MockScoreCalculationService } from './MockScoreCalculationService';

// Mock 유틸리티 함수들
export const createMockCallbacks = () => ({
  onStateChange: jest.fn(),
  onTimeUpdate: jest.fn(),
  onSpeechResult: jest.fn(),
  onTimeout: jest.fn(),
  onError: jest.fn(),
});

export const createMockCard = () => ({
  id: 'test-card-1',
  front_ko: '안녕하세요',
  target_en: 'Hello',
  kr: '안녕하세요',
});

// 테스트 헬퍼 함수들
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectMockCalled = (mockFn: jest.Mock, times: number = 1) => {
  expect(mockFn).toHaveBeenCalledTimes(times);
};

export const expectMockCalledWith = (mockFn: jest.Mock, ...args: any[]) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

// Jest 설정 헬퍼
export const setupMockEnvironment = () => {
  // Console 메서드들 모킹 (테스트 출력 정리용)
  const originalConsole = { ...console };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // 테스트 중 console.log 숨기기 (필요시 주석 해제)
    // console.log = jest.fn();
    // console.info = jest.fn();
    // console.warn = jest.fn();
  });

  afterEach(() => {
    // Console 복원
    Object.assign(console, originalConsole);
  });
};

// TypeScript용 타입 가드 함수들
export const isMockFunction = (fn: any): fn is jest.Mock => {
  return typeof fn === 'function' && 'mock' in fn;
};

export const assertMockFunction = (fn: any): asserts fn is jest.Mock => {
  if (!isMockFunction(fn)) {
    throw new Error('Expected a Jest mock function');
  }
};