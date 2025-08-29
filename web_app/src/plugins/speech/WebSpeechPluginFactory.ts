/**
 * Web Speech 플러그인 팩토리
 * @description Web Speech 플러그인을 생성하고 관리하는 팩토리
 */

import { IPluginFactory } from '@/plugins/core/IPlugin';
import { ISpeechPluginFactory, ISpeechPlugin, SpeechPluginConfig } from './ISpeechPlugin';
import { WebSpeechPlugin } from './WebSpeechPlugin';
import { NonEmptyString, Result, Ok, Err, assertNonEmptyString } from '@/types/core';

export class WebSpeechPluginFactory implements IPluginFactory<ISpeechPlugin>, ISpeechPluginFactory {
  readonly pluginType = assertNonEmptyString('speech', 'plugin type');
  readonly implementation = 'web' as const;

  /**
   * 플러그인 인스턴스 생성
   */
  async create(config: SpeechPluginConfig = {}): Promise<Result<ISpeechPlugin>> {
    try {
      // 브라우저 지원 확인
      if (!this.isSupported()) {
        return Err(new Error('Web Speech API is not supported in this browser'));
      }

      // 설정 검증
      const configValidation = this.validateConfig(config);
      if (!configValidation.success) {
        return configValidation as Result<never>;
      }

      // 플러그인 인스턴스 생성
      const plugin = new WebSpeechPlugin();
      
      return Ok(plugin);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 설정 검증
   */
  validateConfig(config: SpeechPluginConfig): Result<void> {
    try {
      // speechRate 검증
      if (config.speechRate !== undefined) {
        if (typeof config.speechRate !== 'number' || 
            config.speechRate <= 0 || 
            config.speechRate > 3) {
          return Err(new Error('speechRate must be a number between 0 and 3'));
        }
      }

      // 언어 코드 검증 (기본적인 형식 검사)
      if (config.recognitionLanguage) {
        if (!/^[a-z]{2}-[A-Z]{2}$/.test(config.recognitionLanguage)) {
          return Err(new Error('recognitionLanguage must be in format "xx-XX" (e.g., "ko-KR")'));
        }
      }

      if (config.synthesisLanguage) {
        if (!/^[a-z]{2}-[A-Z]{2}$/.test(config.synthesisLanguage)) {
          return Err(new Error('synthesisLanguage must be in format "xx-XX" (e.g., "ko-KR")'));
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 브라우저 지원 확인
   */
  isSupported(): boolean {
    // SpeechSynthesis는 필수, SpeechRecognition은 선택적
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    
    // 최소한 TTS 기능은 있어야 함
    return hasSpeechSynthesis;
  }

  /**
   * 상세한 지원 기능 확인
   */
  getSupportedFeatures(): {
    speechSynthesis: boolean;
    speechRecognition: boolean;
    audioContext: boolean;
  } {
    return {
      speechSynthesis: 'speechSynthesis' in window,
      speechRecognition: !!(
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition
      ),
      audioContext: !!(
        window.AudioContext || 
        (window as any).webkitAudioContext
      )
    };
  }

  /**
   * 권한 요청 (음성 인식용)
   */
  async requestPermissions(): Promise<Result<void>> {
    try {
      // 마이크 권한 요청
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true 
          });
          
          // 스트림 즉시 정리 (권한 확인이 목적)
          stream.getTracks().forEach(track => track.stop());
          
          return Ok(undefined);
        } catch (permissionError) {
          return Err(new Error(`Microphone permission denied: ${permissionError}`));
        }
      } else {
        return Err(new Error('MediaDevices API not supported'));
      }
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * 기본 설정 반환
   */
  getDefaultConfig(): SpeechPluginConfig {
    return {
      recognitionLanguage: 'ko-KR' as NonEmptyString,
      synthesisLanguage: 'ko-KR' as NonEmptyString,
      speechRate: 1.0 as number,
      enableContinuous: false,
      enableInterimResults: true,
      autoRestart: false
    };
  }

  /**
   * 권장 설정 반환 (사용 사례별)
   */
  getRecommendedConfig(useCase: 'learning' | 'dictation' | 'voice-command'): SpeechPluginConfig {
    const base = this.getDefaultConfig();

    switch (useCase) {
      case 'learning':
        return {
          ...base,
          speechRate: 0.8 as number,
          enableInterimResults: true,
          autoRestart: false
        };

      case 'dictation':
        return {
          ...base,
          enableContinuous: true,
          enableInterimResults: true,
          autoRestart: true
        };

      case 'voice-command':
        return {
          ...base,
          enableContinuous: false,
          enableInterimResults: false,
          autoRestart: false
        };

      default:
        return base;
    }
  }

  /**
   * 디버그 정보 반환
   */
  getDebugInfo(): {
    browserSupport: ReturnType<typeof this.getSupportedFeatures>;
    availableVoices: number;
    userAgent: string;
  } {
    const support = this.getSupportedFeatures();
    
    let voiceCount = 0;
    if (support.speechSynthesis && window.speechSynthesis) {
      voiceCount = window.speechSynthesis.getVoices().length;
    }

    return {
      browserSupport: support,
      availableVoices: voiceCount,
      userAgent: navigator.userAgent
    };
  }
}