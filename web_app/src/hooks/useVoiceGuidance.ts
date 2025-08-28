import { useState, useCallback, useEffect } from 'react';

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

export const useVoiceGuidance = (): VoiceGuidanceHook => {
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
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    localStorage.setItem('voiceGuidanceSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isSupported) return;

    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);

    speechSynthesis.addEventListener('start', handleSpeechStart);
    speechSynthesis.addEventListener('end', handleSpeechEnd);

    return () => {
      speechSynthesis.removeEventListener('start', handleSpeechStart);
      speechSynthesis.removeEventListener('end', handleSpeechEnd);
    };
  }, [isSupported]);

  const speak = useCallback((text: string, type: 'system' | 'content' = 'system') => {
    if (!isSupported || !settings.enabled) return;
    
    // 시스템 음성과 콘텐츠 음성 구분
    if (type === 'system' && !settings.systemVoice) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 시스템 메시지와 콘텐츠 구분
    if (type === 'system') {
      utterance.volume = Math.min(settings.volume, 0.6); // 시스템 음성은 더 조용히
      utterance.rate = settings.rate * 1.2; // 시스템 음성은 더 빠르게
      utterance.pitch = settings.pitch * 0.9; // 시스템 음성은 낮은 톤
    } else {
      utterance.volume = settings.volume;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
    }
    
    utterance.lang = settings.language;
    
    speechSynthesis.speak(utterance);
  }, [isSupported, settings]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }, [isSupported]);

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