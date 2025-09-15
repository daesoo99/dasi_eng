/**
 * ServiceContainer - 의존성 주입 컨테이너
 * 목적: 모든 서비스 인스턴스를 중앙에서 관리하여 결합도를 낮추고 테스트 가능성을 향상
 */

import { AdapterFactory, AudioAdapters } from '@/factories/AdapterFactory';
import { SpeechProcessingService } from '@/services/SpeechProcessingService';
import { AudioFlowOrchestrator } from '@/services/AudioFlowOrchestrator';
import { ScoreCalculationService } from '@/services/ScoreCalculationService';
import { AudioFlowStateMachine } from '@/state/AudioFlowStateMachine';
import { PerformancePluginFactory } from '@/plugins/performance/PerformancePluginFactory';
import { AdvancedSpeechPlugin } from '@/plugins/simple/AdvancedSpeechPlugin';
import type { FlowCallbacks, FlowOptions } from '@/services/AudioFlowOrchestrator';
import type { FlowCallbacks as StateMachineCallbacks } from '@/state/types';
import type { IPerformancePlugin, PerformancePluginConfig } from '@/plugins/performance/IPerformancePlugin';
import type { IAdvancedSpeechPlugin } from '@/plugins/simple/AdvancedPluginSystem';

// 서비스 인터페이스 정의
export interface ISpeechProcessingService {
  speakQuestion(questionText: string, options?: any): Promise<any>;
  speakAnswer(answerText: string, options?: any): Promise<any>;
  recognizeSpeech(onResult: Function, onError?: Function, options?: any): Promise<any>;
  stopRecognition(): void;
  pauseSpeech(): void;
  resumeSpeech(): void;
  stopAllSpeech(): void;
  cleanup(): void;
}

export interface IScoreCalculationService {
  calculateQuality(input: any): any;
  getDetailedAnalysis(input: any): any;
  getQualityDescription(quality: any): string;
}

export interface IAudioFlowOrchestrator {
  startFlow(questionText: string): Promise<any>;
  pauseFlow(): void;
  resumeFlow(): void;
  stopFlow(): void;
  playAnswerAndNext(answerText?: string): Promise<void>;
  getStatus(): any;
  cleanup(): void;
}

export interface IAudioFlowStateMachine {
  getCurrentState(): string;
  getContext(): any;
  getDisplayInfo(): any;
  getAllowedActions(): string[];
  executeAction(action: string, data?: any): Promise<any>;
  startFlow(text: string): Promise<any>;
  pauseFlow(): any;
  resumeFlow(): any;
  stopFlow(): any;
  playAnswerAndNext(answerText?: string): Promise<any>;
  updateContext(updates: any): void;
  cleanup(): Promise<void>;
}

// 서비스 설정 인터페이스
export interface ServiceConfiguration {
  speechOptions?: {
    recognitionLanguage?: string;
    synthesisLanguage?: string;
    speechRate?: number;
    confidenceThreshold?: number;
  };
  flowOptions?: FlowOptions;
  performanceOptions?: PerformancePluginConfig;
  environment?: 'development' | 'production' | 'test';
}

// 서비스 컨테이너 클래스
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;
  private services: Map<string, any> = new Map();
  private adapters: AudioAdapters | null = null;
  private performancePlugin: IPerformancePlugin | null = null;
  private advancedSpeechPlugin: IAdvancedSpeechPlugin | null = null;
  private configuration: ServiceConfiguration;

  private constructor(config: ServiceConfiguration = {}) {
    this.configuration = {
      speechOptions: {
        recognitionLanguage: 'en-US',
        synthesisLanguage: 'ko-KR',
        speechRate: 0.9,
        confidenceThreshold: 0.6,
        ...config.speechOptions
      },
      flowOptions: {
        recordingDuration: 10,
        ...config.flowOptions
      },
      performanceOptions: {
        enableAudioTracking: true,
        enableAPITracking: true,
        enableRenderTracking: true,
        enableMemoryTracking: true,
        maxMetricsCount: 1000,
        latencyThresholds: {
          audio: 2000,
          api: 5000,
          render: 16
        },
        memoryWarningThreshold: 0.8,
        ...config.performanceOptions
      },
      environment: config.environment || 'development'
    };

    // 비동기 초기화는 getInstance에서 처리
    this.initializeServicesSync();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static async getInstance(config?: ServiceConfiguration): Promise<ServiceContainer> {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(config);
      await ServiceContainer.instance.initializeAsyncServices();
    }
    return ServiceContainer.instance;
  }

  /**
   * 동기 싱글톤 인스턴스 반환 (Performance Plugin 제외)
   */
  public static getInstanceSync(config?: ServiceConfiguration): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(config);
    }
    return ServiceContainer.instance;
  }

  /**
   * 테스트용 인스턴스 생성 (싱글톤 무시)
   */
  public static createTestInstance(config: ServiceConfiguration = {}): ServiceContainer {
    return new ServiceContainer(config);
  }

  /**
   * 동기 서비스들 초기화
   */
  private initializeServicesSync(): void {
    try {
      // 어댑터 초기화
      this.adapters = AdapterFactory.createAdaptersForEnvironment(
        this.configuration.environment!
      );

      // 핵심 서비스들 등록
      this.registerScoreCalculationService();
      this.registerSpeechProcessingService();

      console.log('[ServiceContainer] Sync services initialized successfully');
    } catch (error) {
      console.error('[ServiceContainer] Failed to initialize sync services:', error);
      throw error;
    }
  }

  /**
   * 비동기 서비스들 초기화 (Performance Plugin, Advanced Speech Plugin)
   */
  private async initializeAsyncServices(): Promise<void> {
    try {
      await this.registerPerformancePlugin();
      await this.registerAdvancedSpeechPlugin();
      console.log('[ServiceContainer] Async services initialized successfully');
    } catch (error) {
      console.error('[ServiceContainer] Failed to initialize async services:', error);
      throw error;
    }
  }

  /**
   * ScoreCalculationService 등록
   */
  private registerScoreCalculationService(): void {
    const scoreService = new ScoreCalculationService();
    this.services.set('scoreCalculation', scoreService);
  }

  /**
   * SpeechProcessingService 등록
   */
  private registerSpeechProcessingService(): void {
    if (!this.adapters) {
      throw new Error('Adapters not initialized');
    }

    const speechService = new SpeechProcessingService(
      this.adapters.speechRecognition,
      this.adapters.speechSynthesis,
      this.configuration.speechOptions
    );

    this.services.set('speechProcessing', speechService);
  }

  /**
   * PerformancePlugin 등록 (비동기)
   */
  private async registerPerformancePlugin(): Promise<void> {
    try {
      const factory = new PerformancePluginFactory();
      const pluginResult = await factory.create(this.configuration.performanceOptions);
      
      if (pluginResult.success && pluginResult.data) {
        this.performancePlugin = pluginResult.data;
        this.services.set('performance', this.performancePlugin);
        console.log('[ServiceContainer] Performance plugin registered successfully');
      } else {
        console.warn('[ServiceContainer] Failed to create performance plugin:', pluginResult.error);
      }
    } catch (error) {
      console.error('[ServiceContainer] Error registering performance plugin:', error);
    }
  }

  /**
   * AdvancedSpeechPlugin 등록 (비동기)
   */
  private async registerAdvancedSpeechPlugin(): Promise<void> {
    try {
      const plugin = new AdvancedSpeechPlugin();
      const initResult = await plugin.initialize({
        maxConcurrency: 3,
        queuePolicy: 'priority'
      });
      
      if (initResult.success) {
        this.advancedSpeechPlugin = plugin;
        this.services.set('advancedSpeech', plugin);
        console.log('[ServiceContainer] Advanced speech plugin registered successfully');
      } else {
        console.warn('[ServiceContainer] Failed to initialize advanced speech plugin:', initResult.error);
      }
    } catch (error) {
      console.error('[ServiceContainer] Error registering advanced speech plugin:', error);
    }
  }

  /**
   * AudioFlowOrchestrator 생성 (콜백 의존적이므로 팩토리 메서드)
   */
  public createAudioFlowOrchestrator(
    callbacks: FlowCallbacks,
    options?: Partial<FlowOptions>
  ): IAudioFlowOrchestrator {
    if (!this.adapters) {
      throw new Error('Adapters not initialized');
    }

    const speechService = this.getSpeechProcessingService();
    
    const mergedOptions = {
      ...this.configuration.flowOptions,
      ...options
    };

    return new AudioFlowOrchestrator(
      speechService,
      this.adapters.timer,
      this.adapters.audioContext,
      callbacks,
      mergedOptions
    );
  }

  /**
   * AudioFlowStateMachine 생성 (상태 머신 패턴)
   */
  public createAudioFlowStateMachine(
    callbacks: StateMachineCallbacks,
    recordingDuration?: number
  ): IAudioFlowStateMachine {
    const duration = recordingDuration || this.configuration.flowOptions?.recordingDuration || 10;
    
    console.log('[ServiceContainer] Creating AudioFlowStateMachine');
    return new AudioFlowStateMachine(callbacks, duration);
  }

  /**
   * ScoreCalculationService 반환
   */
  public getScoreCalculationService(): IScoreCalculationService {
    const service = this.services.get('scoreCalculation');
    if (!service) {
      throw new Error('ScoreCalculationService not found');
    }
    return service;
  }

  /**
   * SpeechProcessingService 반환
   */
  public getSpeechProcessingService(): ISpeechProcessingService {
    const service = this.services.get('speechProcessing');
    if (!service) {
      throw new Error('SpeechProcessingService not found');
    }
    return service;
  }

  /**
   * PerformancePlugin 반환
   */
  public getPerformancePlugin(): IPerformancePlugin | null {
    return this.performancePlugin;
  }

  /**
   * AdvancedSpeechPlugin 반환
   */
  public getAdvancedSpeechPlugin(): IAdvancedSpeechPlugin | null {
    return this.advancedSpeechPlugin;
  }

  /**
   * PerformancePlugin이 초기화되었는지 확인
   */
  public async ensurePerformancePlugin(): Promise<IPerformancePlugin> {
    if (!this.performancePlugin) {
      await this.initializeAsyncServices();
    }
    
    if (!this.performancePlugin) {
      throw new Error('PerformancePlugin initialization failed');
    }
    
    return this.performancePlugin;
  }

  /**
   * AdvancedSpeechPlugin이 초기화되었는지 확인
   */
  public async ensureAdvancedSpeechPlugin(): Promise<IAdvancedSpeechPlugin> {
    if (!this.advancedSpeechPlugin) {
      await this.initializeAsyncServices();
    }
    
    if (!this.advancedSpeechPlugin) {
      throw new Error('AdvancedSpeechPlugin initialization failed');
    }
    
    return this.advancedSpeechPlugin;
  }

  /**
   * 어댑터들 반환
   */
  public getAdapters(): AudioAdapters {
    if (!this.adapters) {
      throw new Error('Adapters not initialized');
    }
    return this.adapters;
  }

  /**
   * 특정 서비스 존재 여부 확인
   */
  public hasService(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * 서비스 직접 등록 (테스트용)
   */
  public registerService<T>(serviceName: string, service: T): void {
    this.services.set(serviceName, service);
  }

  /**
   * 설정 업데이트
   */
  public updateConfiguration(config: Partial<ServiceConfiguration>): void {
    this.configuration = {
      ...this.configuration,
      ...config,
      speechOptions: {
        ...this.configuration.speechOptions,
        ...config.speechOptions
      },
      flowOptions: {
        ...this.configuration.flowOptions,
        ...config.flowOptions
      }
    };

    // 설정 변경 시 관련 서비스들 다시 초기화
    this.reinitializeServices();
    
    // Performance Plugin도 재초기화
    if (config.performanceOptions) {
      this.reinitializePerformancePlugin();
    }
  }

  /**
   * 설정 변경 후 서비스 재초기화
   */
  private reinitializeServices(): void {
    try {
      // 음성 처리 서비스 재생성
      this.registerSpeechProcessingService();
      
      console.log('[ServiceContainer] Services reinitialized with new configuration');
    } catch (error) {
      console.error('[ServiceContainer] Failed to reinitialize services:', error);
    }
  }

  /**
   * Performance Plugin 재초기화
   */
  private async reinitializePerformancePlugin(): Promise<void> {
    try {
      // 기존 Performance Plugin 정리
      if (this.performancePlugin) {
        if (typeof this.performancePlugin.cleanup === 'function') {
          this.performancePlugin.cleanup();
        }
        this.performancePlugin = null;
        this.services.delete('performance');
      }
      
      // 새로운 Performance Plugin 생성
      await this.registerPerformancePlugin();
      
      console.log('[ServiceContainer] Performance plugin reinitialized with new configuration');
    } catch (error) {
      console.error('[ServiceContainer] Failed to reinitialize performance plugin:', error);
    }
  }

  /**
   * 현재 설정 반환
   */
  public getConfiguration(): ServiceConfiguration {
    return { ...this.configuration };
  }

  /**
   * 모든 서비스 상태 반환
   */
  public getServicesStatus(): {
    scoreCalculation: boolean;
    speechProcessing: boolean;
    performancePlugin: boolean;
    advancedSpeechPlugin: boolean;
    adapters: boolean;
    totalServices: number;
  } {
    return {
      scoreCalculation: this.hasService('scoreCalculation'),
      speechProcessing: this.hasService('speechProcessing'),
      performancePlugin: this.hasService('performance'),
      advancedSpeechPlugin: this.hasService('advancedSpeech'),
      adapters: this.adapters !== null,
      totalServices: this.services.size
    };
  }

  /**
   * 컨테이너 정리
   */
  public async cleanup(): Promise<void> {
    console.log('[ServiceContainer] Cleaning up services...');

    // 각 서비스의 cleanup 호출
    this.services.forEach((service, name) => {
      try {
        if (typeof service.cleanup === 'function') {
          service.cleanup();
        }
      } catch (error) {
        console.warn(`[ServiceContainer] Failed to cleanup service ${name}:`, error);
      }
    });

    // Performance Plugin 정리
    if (this.performancePlugin) {
      try {
        if (typeof this.performancePlugin.cleanup === 'function') {
          this.performancePlugin.cleanup();
        }
      } catch (error) {
        console.warn('[ServiceContainer] Failed to cleanup performance plugin:', error);
      }
      this.performancePlugin = null;
    }

    // Advanced Speech Plugin 정리
    if (this.advancedSpeechPlugin) {
      try {
        if (typeof this.advancedSpeechPlugin.dispose === 'function') {
          await this.advancedSpeechPlugin.dispose();
        }
      } catch (error) {
        console.warn('[ServiceContainer] Failed to cleanup advanced speech plugin:', error);
      }
      this.advancedSpeechPlugin = null;
    }

    // 어댑터 정리
    if (this.adapters) {
      AdapterFactory.cleanup();
      this.adapters = null;
    }

    // 서비스 맵 정리
    this.services.clear();

    console.log('[ServiceContainer] Cleanup completed');
  }

  /**
   * 싱글톤 인스턴스 재설정 (테스트용)
   */
  public static async resetInstance(): Promise<void> {
    if (ServiceContainer.instance) {
      await ServiceContainer.instance.cleanup();
      ServiceContainer.instance = null;
    }
  }

  /**
   * 서비스 의존성 상태 체크
   */
  public validateDependencies(): {
    isValid: boolean;
    missingDependencies: string[];
    errors: string[];
  } {
    const missing: string[] = [];
    const errors: string[] = [];

    try {
      // 필수 서비스 체크
      if (!this.hasService('scoreCalculation')) {
        missing.push('ScoreCalculationService');
      }

      if (!this.hasService('speechProcessing')) {
        missing.push('SpeechProcessingService');
      }

      // 어댑터 체크
      if (!this.adapters) {
        missing.push('AudioAdapters');
      } else {
        const adapterStatus = AdapterFactory.getAdapterStatus();
        if (!adapterStatus.speechRecognition) {
          errors.push('Speech Recognition not supported');
        }
        if (!adapterStatus.speechSynthesis) {
          errors.push('Speech Synthesis not supported');
        }
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }

    return {
      isValid: missing.length === 0 && errors.length === 0,
      missingDependencies: missing,
      errors
    };
  }
}

// 편의 함수들
export const getServiceContainer = async (config?: ServiceConfiguration) => 
  await ServiceContainer.getInstance(config);

export const getServiceContainerSync = (config?: ServiceConfiguration) =>
  ServiceContainer.getInstanceSync(config);

export const createTestServiceContainer = (config?: ServiceConfiguration) =>
  ServiceContainer.createTestInstance(config);

// 기본 내보내기
export default ServiceContainer;