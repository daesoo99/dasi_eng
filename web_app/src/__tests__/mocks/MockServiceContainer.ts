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
  private mockStateMachine: MockAudioFlowStateMachine;
  private mockSpeechService: MockSpeechProcessingService;
  private mockScoreService: MockScoreCalculationService;
  private configuration: ServiceConfiguration;

  constructor(config: ServiceConfiguration = {}) {
    this.configuration = config;
    this.mockStateMachine = new MockAudioFlowStateMachine();
    this.mockSpeechService = new MockSpeechProcessingService();
    this.mockScoreService = new MockScoreCalculationService();
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
  registerService<T>(serviceName: string, service: T): void {
    console.log(`[MockServiceContainer] Registering mock service: ${serviceName}`);
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