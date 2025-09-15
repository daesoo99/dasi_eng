import { useState, useCallback, useEffect, useMemo } from 'react';
import { ServiceContainer, type ISpeechProcessingService } from '@/container/ServiceContainer';

interface VoiceGuidanceSettings {
  enabled: boolean;
  systemVoice: boolean;
  volume: number;
  rate: number;
  pitch: number;
  language: string;
}

interface VoiceGuidanceHook {
  settings: VoiceGuidanceSettings;
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string, type?: 'system' | 'content') => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  updateSettings: (newSettings: Partial<VoiceGuidanceSettings>) => void;
}

interface VoiceGuidanceOptions {
  serviceContainer?: ServiceContainer;
}

export const useVoiceGuidance = (options: VoiceGuidanceOptions = {}): VoiceGuidanceHook => {
  const [settings, setSettings] = useState<VoiceGuidanceSettings>(() => {
    const saved = localStorage.getItem('voiceGuidanceSettings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      systemVoice: true,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0,
      language: 'en-US'
    };
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // 🔧 의존성 주입: ServiceContainer를 통해 SpeechPlugin 획득
  const serviceContainer = useMemo(() => {
    return options.serviceContainer || ServiceContainer.getInstance();
  }, [options.serviceContainer]);

  // 🔧 의존성 주입: ServiceContainer를 통해 SpeechProcessingService 획득
  const speechService = useMemo(() => {
    try {
      return serviceContainer.getSpeechProcessingService();
    } catch (error) {
      console.error('[useVoiceGuidance] Failed to get speech service:', error);
      return null;
    }
  }, [serviceContainer]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    localStorage.setItem('voiceGuidanceSettings', JSON.stringify(settings));
  }, [settings]);

  // 🔧 플러그인 이벤트 시스템 사용
  useEffect(() => {
    if (!isSupported || !speechService) return;

    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);

    // speechService 이벤트 리스너 등록 (플러그인 기반)
    try {
      // speechService가 이벤트 시스템을 지원하는 경우 사용
      if (typeof speechService.on === 'function') {
        speechService.on('speechStart', handleSpeechStart);
        speechService.on('speechEnd', handleSpeechEnd);

        return () => {
          if (typeof speechService.off === 'function') {
            speechService.off('speechStart', handleSpeechStart);
            speechService.off('speechEnd', handleSpeechEnd);
          }
        };
      } else {
        // speechService가 이벤트 시스템을 지원하지 않는 경우 polling으로 상태 확인
        const interval = setInterval(() => {
          const wasSpeaking = isSpeaking;
          const currentlySpeaking = speechService?.isProcessing?.() || false;
          if (wasSpeaking !== currentlySpeaking) {
            setIsSpeaking(currentlySpeaking);
          }
        }, 100);

        return () => clearInterval(interval);
      }
    } catch (error) {
      console.warn('[useVoiceGuidance] Event listener setup failed, using polling fallback:', error);

      // 최종 fallback: polling으로 상태 확인
      const interval = setInterval(() => {
        const wasSpeaking = isSpeaking;
        const currentlySpeaking = speechService?.isProcessing?.() || false;
        if (wasSpeaking !== currentlySpeaking) {
          setIsSpeaking(currentlySpeaking);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isSupported, speechService, isSpeaking]);

  const speak = useCallback(async (text: string, type: 'system' | 'content' = 'system') => {
    if (!isSupported || !settings.enabled || !speechService) return;
    
    // 시스템 음성과 콘텐츠 음성 구분
    if (type === 'system' && !settings.systemVoice) return;

    try {
      // 🔧 Direct Web API 제거: speechService.speakAnswer 사용
      const speechOptions = {
        language: settings.language,
        rate: type === 'system' ? settings.rate * 1.2 : settings.rate,
        volume: type === 'system' ? Math.min(settings.volume, 0.6) : settings.volume,
        pitch: type === 'system' ? settings.pitch * 0.9 : settings.pitch
      };

      // speechService의 speakAnswer 메서드 사용 (TTS 기능)
      await speechService.speakAnswer(text, speechOptions);
    } catch (error) {
      console.error('[useVoiceGuidance] Speech service error:', error);
      
      // 🔧 플러그인 fallback: AdvancedSpeechPlugin 또는 기본 플러그인 사용
      try {
        // ServiceContainer의 AdvancedSpeechPlugin 시도
        const advancedPlugin = serviceContainer.getAdvancedSpeechPlugin();
        if (advancedPlugin) {
          await advancedPlugin.speakText(text, {
            language: settings.language,
            rate: type === 'system' ? settings.rate * 1.2 : settings.rate,
            volume: type === 'system' ? Math.min(settings.volume, 0.6) : settings.volume,
            pitch: type === 'system' ? settings.pitch * 0.9 : settings.pitch
          });
          return;
        }
      } catch (pluginError) {
        console.warn('[useVoiceGuidance] Advanced speech plugin fallback failed:', pluginError);
      }

      // 🚫 Direct Web API 호출 완전 제거 - 플러그인만 사용
      console.error('[useVoiceGuidance] All speech plugins failed, unable to speak text');
      throw new Error('Speech plugins not available');
    }
  }, [isSupported, settings, speechService]);

  const stop = useCallback(() => {
    if (!isSupported || !speechService) return;

    try {
      // 🔧 Direct Web API 제거: speechService.stopAllSpeech 사용
      speechService.stopAllSpeech();
      setIsSpeaking(false);
    } catch (error) {
      console.error('[useVoiceGuidance] Stop speech error:', error);
      
      // 🔧 플러그인 fallback: AdvancedSpeechPlugin 또는 기본 플러그인 사용
      try {
        const advancedPlugin = serviceContainer.getAdvancedSpeechPlugin();
        if (advancedPlugin && typeof advancedPlugin.stopAll === 'function') {
          advancedPlugin.stopAll();
          setIsSpeaking(false);
          return;
        }
      } catch (pluginError) {
        console.warn('[useVoiceGuidance] Advanced speech plugin stop failed:', pluginError);
      }

      // 🚫 Direct Web API 호출 완전 제거
      console.error('[useVoiceGuidance] All speech plugins failed, unable to stop speech');
      setIsSpeaking(false);
    }
  }, [isSupported, speechService]);

  const pause = useCallback(() => {
    if (!isSupported || !speechService) return;

    try {
      // 🔧 Direct Web API 제거: speechService.pauseSpeech 사용
      speechService.pauseSpeech();
    } catch (error) {
      console.error('[useVoiceGuidance] Pause speech error:', error);
      
      // 🚫 Direct Web API 호출 완전 제거
      console.error('[useVoiceGuidance] Speech pause not supported by current plugin system');
    }
  }, [isSupported, speechService]);

  const resume = useCallback(() => {
    if (!isSupported || !speechService) return;

    try {
      // 🔧 Direct Web API 제거: speechService.resumeSpeech 사용
      speechService.resumeSpeech();
    } catch (error) {
      console.error('[useVoiceGuidance] Resume speech error:', error);
      
      // 🚫 Direct Web API 호출 완전 제거
      console.error('[useVoiceGuidance] Speech resume not supported by current plugin system');
    }
  }, [isSupported, speechService]);

  const updateSettings = useCallback((newSettings: Partial<VoiceGuidanceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    settings,
    isSupported,
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
    updateSettings
  };
};