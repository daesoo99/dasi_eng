/**
 * AdapterFactory - 어댑터 인스턴스 생성 및 관리
 * 목적: 어댑터 생성을 중앙화하여 의존성 관리 개선
 */

import { SpeechRecognitionAdapter } from '@/adapters/SpeechRecognitionAdapter';
import { SpeechSynthesisAdapter } from '@/adapters/SpeechSynthesisAdapter';
import { AudioContextAdapter } from '@/adapters/AudioContextAdapter';
import { AudioTimerService } from '@/services/AudioTimerService';
import {
  ISpeechRecognitionAdapter,
  ISpeechSynthesisAdapter,
  IAudioContextAdapter
} from '@/adapters/BrowserAPIAdapter';

export interface AudioAdapters {
  speechRecognition: ISpeechRecognitionAdapter;
  speechSynthesis: ISpeechSynthesisAdapter;
  audioContext: IAudioContextAdapter;
  timer: AudioTimerService;
}

export class AdapterFactory {
  private static instances: AudioAdapters | null = null;

  /**
   * 오디오 관련 어댑터들을 생성
   * 싱글톤 패턴 적용하여 동일한 인스턴스 재사용
   */
  static createAudioAdapters(): AudioAdapters {
    if (!this.instances) {
      console.log('[AdapterFactory] Creating new audio adapter instances');
      
      this.instances = {
        speechRecognition: new SpeechRecognitionAdapter(),
        speechSynthesis: new SpeechSynthesisAdapter(),
        audioContext: new AudioContextAdapter(),
        timer: new AudioTimerService()
      };
    }

    return this.instances;
  }

  /**
   * 테스트용 어댑터 생성 (의존성 주입)
   */
  static createTestAdapters(
    speechRecognition?: ISpeechRecognitionAdapter,
    speechSynthesis?: ISpeechSynthesisAdapter,
    audioContext?: IAudioContextAdapter,
    timer?: AudioTimerService
  ): AudioAdapters {
    return {
      speechRecognition: speechRecognition || new SpeechRecognitionAdapter(),
      speechSynthesis: speechSynthesis || new SpeechSynthesisAdapter(),
      audioContext: audioContext || new AudioContextAdapter(),
      timer: timer || new AudioTimerService()
    };
  }

  /**
   * 어댑터 인스턴스 정리
   */
  static cleanup(): void {
    if (this.instances) {
      console.log('[AdapterFactory] Cleaning up adapter instances');
      
      this.instances.speechRecognition.cleanup();
      this.instances.speechSynthesis.cleanup();
      this.instances.audioContext.cleanup();
      this.instances.timer.cleanup();
      
      this.instances = null;
    }
  }

  /**
   * 개발/프로덕션 환경별 어댑터 설정
   */
  static createAdaptersForEnvironment(environment: 'development' | 'production' | 'test'): AudioAdapters {
    switch (environment) {
      case 'test':
        return this.createTestAdapters();
      
      case 'development':
        // 개발 환경에서는 더 자세한 로깅
        console.log('[AdapterFactory] Creating adapters for development environment');
        return this.createAudioAdapters();
      
      case 'production':
        // 프로덕션에서는 최적화된 설정
        return this.createAudioAdapters();
      
      default:
        return this.createAudioAdapters();
    }
  }

  /**
   * 어댑터 상태 확인
   */
  static getAdapterStatus(): {
    speechRecognition: boolean;
    speechSynthesis: boolean;
    audioContext: boolean;
    timer: boolean;
  } {
    const adapters = this.createAudioAdapters();
    
    return {
      speechRecognition: adapters.speechRecognition.isSupported(),
      speechSynthesis: adapters.speechSynthesis.isSupported(),
      audioContext: adapters.audioContext.isSupported(),
      timer: true // AudioTimerService는 항상 지원됨
    };
  }

  /**
   * 브라우저 지원 여부 확인
   */
  static checkBrowserSupport(): {
    isSupported: boolean;
    unsupportedFeatures: string[];
  } {
    const status = this.getAdapterStatus();
    const unsupportedFeatures: string[] = [];

    if (!status.speechRecognition) {
      unsupportedFeatures.push('Speech Recognition');
    }
    
    if (!status.speechSynthesis) {
      unsupportedFeatures.push('Speech Synthesis');
    }
    
    if (!status.audioContext) {
      unsupportedFeatures.push('Web Audio API');
    }

    return {
      isSupported: unsupportedFeatures.length === 0,
      unsupportedFeatures
    };
  }
}