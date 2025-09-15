/**
 * MockServiceContainer - 테스트용 서비스 컨테이너 Mock
 * 목적: 단위 테스트에서 실제 서비스 없이 테스트 가능
 */

import { MockAudioFlowStateMachine } from './MockAudioFlowStateMachine';
import { MockSpeechProcessingService } from './MockSpeechProcessingService';
import { MockScoreCalculationService } from './MockScoreCalculationService';
import type { 
  IAudioFlowStateMachine, 
  ISpeechProcessingService, 
  IScoreCalculationService,
  ServiceConfiguration 
} from '@/container/ServiceContainer';
import type { FlowCallbacks as StateMachineCallbacks } from '@/state/types';

export class MockServiceContainer {
  private services: Map<string, any> = new Map();
  private adapters: any = null;
  private mockStateMachine: MockAudioFlowStateMachine;
  private mockSpeechService: MockSpeechProcessingService;
  private mockScoreService: MockScoreCalculationService;
  private configuration: ServiceConfiguration;

  constructor(config: ServiceConfiguration = {}) {
    this.configuration = config;
    this.mockStateMachine = new MockAudioFlowStateMachine();
    this.mockSpeechService = new MockSpeechProcessingService();
    this.mockScoreService = new MockScoreCalculationService();
    
    // 서비스들을 Map에 등록 (실제 ServiceContainer와 호환성 유지)
    this.services.set('speechProcessing', this.mockSpeechService);
    this.services.set('scoreCalculation', this.mockScoreService);
  }

  /**
   * Mock 상태 머신 생성
   */
  createAudioFlowStateMachine(
    callbacks: StateMachineCallbacks,
    recordingDuration?: number
  ): IAudioFlowStateMachine {
    console.log('[MockServiceContainer] Creating mock state machine');
    
    // 콜백을 실제 호출하도록 설정
    this.mockStateMachine.onCallbacks = callbacks;
    
    if (recordingDuration) {
      this.mockStateMachine.setContext({ recordingDuration });
    }
    
    return this.mockStateMachine;
  }

  /**
   * Mock 음성 처리 서비스 반환
   */
  getSpeechProcessingService(): ISpeechProcessingService {
    return this.mockSpeechService;
  }

  /**
   * Mock 점수 계산 서비스 반환
   */
  getScoreCalculationService(): IScoreCalculationService {
    return this.mockScoreService;
  }

  /**
   * 서비스 초기화 (실제 ServiceContainer 호환)
   */
  initializeServices(): void {
    console.log('[MockServiceContainer] Services initialized');
  }

  /**
   * ScoreCalculationService 등록 (실제 ServiceContainer 호환)
   */
  registerScoreCalculationService(): void {
    this.services.set('scoreCalculation', this.mockScoreService);
  }

  /**
   * SpeechProcessingService 등록 (실제 ServiceContainer 호환)
   */
  registerSpeechProcessingService(): void {
    this.services.set('speechProcessing', this.mockSpeechService);
  }

  /**
   * AudioFlowOrchestrator 생성 (실제 ServiceContainer 호환)
   */
  createAudioFlowOrchestrator(_callbacks: any, _options?: any): any {
    return {
      startFlow: jest.fn(),
      pauseFlow: jest.fn(),
      resumeFlow: jest.fn(),
      stopFlow: jest.fn(),
      playAnswerAndNext: jest.fn(),
      getStatus: jest.fn(() => ({ state: 'idle' })),
      cleanup: jest.fn()
    };
  }

  /**
   * Mock 설정 반환
   */
  getConfiguration(): ServiceConfiguration {
    return { ...this.configuration };
  }

  /**
   * 서비스 존재 여부 (항상 true 반환)
   */
  hasService(serviceName: string): boolean {
    return ['speechProcessing', 'scoreCalculation'].includes(serviceName);
  }

  /**
   * Mock 서비스 등록
   */
  registerService<T>(serviceName: string, _service: T): void {
    console.log(`[MockServiceContainer] Registering mock service: ${serviceName}`);
  }

  /**
   * 어댑터 반환 (실제 ServiceContainer 호환)
   */
  getAdapters(): any {
    return this.adapters || {};
  }

  /**
   * 설정 업데이트 (실제 ServiceContainer 호환)
   */
  updateConfiguration(config: Partial<ServiceConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * 서비스 재초기화 (실제 ServiceContainer 호환)
   */
  reinitializeServices(): void {
    console.log('[MockServiceContainer] Reinitializing services');
  }

  /**
   * 서비스 상태 반환 (실제 ServiceContainer 호환)
   */
  getServicesStatus(): any {
    return {
      speechProcessing: 'active',
      scoreCalculation: 'active'
    };
  }

  /**
   * 의존성 검증 (실제 ServiceContainer 호환)
   */
  validateDependencies(): boolean {
    return true;
  }

  /**
   * Mock 정리
   */
  cleanup(): void {
    console.log('[MockServiceContainer] Cleaning up mock services');
    this.mockStateMachine.reset();
    this.mockSpeechService.reset();
    this.mockScoreService.reset();
  }

  /**
   * 테스트 유틸리티: Mock 인스턴스들에 접근
   */
  public getMockStateMachine(): MockAudioFlowStateMachine {
    return this.mockStateMachine;
  }

  public getMockSpeechService(): MockSpeechProcessingService {
    return this.mockSpeechService;
  }

  public getMockScoreService(): MockScoreCalculationService {
    return this.mockScoreService;
  }

  /**
   * 테스트 유틸리티: 모든 Mock 리셋
   */
  public resetAllMocks(): void {
    this.mockStateMachine.reset();
    this.mockSpeechService.reset();
    this.mockScoreService.reset();
  }

  /**
   * 테스트 유틸리티: Mock 동작 설정
   */
  public configureMocks(config: {
    stateMachine?: Partial<MockAudioFlowStateMachine['mockConfig']>;
    speechService?: Partial<MockSpeechProcessingService['mockConfig']>;
    scoreService?: Partial<MockScoreCalculationService['mockConfig']>;
  }): void {
    if (config.stateMachine) {
      Object.assign(this.mockStateMachine.mockConfig, config.stateMachine);
    }
    if (config.speechService) {
      Object.assign(this.mockSpeechService.mockConfig, config.speechService);
    }
    if (config.scoreService) {
      Object.assign(this.mockScoreService.mockConfig, config.scoreService);
    }
  }
}

// MockServiceContainer를 실제 ServiceContainer 인터페이스에 맞게 확장
declare module './MockAudioFlowStateMachine' {
  interface MockAudioFlowStateMachine {
    onCallbacks?: StateMachineCallbacks;
  }
}