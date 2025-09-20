/**
 * Jest 테스트 환경 설정
 * 목적: 모든 테스트에서 공통으로 사용할 설정 및 Mock
 */

import '@testing-library/jest-dom';

// Web API Mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Web Speech API Mock
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: window.SpeechRecognition,
});

// Speech Synthesis Mock
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: jest.fn().mockImplementation((text) => ({
    text,
    lang: 'en-US',
    voice: null,
    volume: 1,
    rate: 1,
    pitch: 1,
    onstart: null,
    onend: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onmark: null,
    onboundary: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

// Audio Context Mock
class MockAudioContext {
  currentTime = 0;
  destination = {};
  listener = {};
  sampleRate = 44100;
  state = 'running';

  createGain() {
    return {
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createOscillator() {
    return {
      frequency: { value: 440 },
      type: 'sine',
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
  }

  close() {
    return Promise.resolve();
  }

  resume() {
    return Promise.resolve();
  }

  suspend() {
    return Promise.resolve();
  }
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

// ResizeObserver Mock
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// IntersectionObserver Mock
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Console 경고 억제 (테스트 출력 정리용)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// 전역 테스트 설정
beforeEach(() => {
  // 각 테스트 전에 모든 Mock 초기화
  jest.clearAllMocks();
});

afterEach(() => {
  // 각 테스트 후에 타이머 정리
  jest.clearAllTimers();
  jest.useRealTimers();
});

// 비동기 작업을 위한 유틸리티 함수
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForTime = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 커스텀 매처
expect.extend({
  toBeCalledWithExactly(received: jest.Mock, ...expected: any[]) {
    const pass = received.mock.calls.length === 1 &&
                  received.mock.calls[0].every((arg: any, index: number) =>
                    Object.is(arg, expected[index])
                  );
    
    return {
      pass,
      message: () => pass 
        ? `Expected mock not to be called with exactly [${expected.join(', ')}]`
        : `Expected mock to be called with exactly [${expected.join(', ')}], but was called with [${received.mock.calls[0]?.join(', ') || 'nothing'}]`,
    };
  },
});

// TypeScript를 위한 타입 확장
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeCalledWithExactly(...args: any[]): R;
      toBeInTheDocument(): R;
      toHaveStyle(style: string | object): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attribute: string, value?: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
    }
  }
}