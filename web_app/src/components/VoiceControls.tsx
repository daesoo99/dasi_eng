import React, { useState, useEffect, useCallback, memo } from 'react';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';

export interface VoiceControlsProps {
  className?: string;
  onVoiceSettingsChange?: (settings: VoiceSettings) => void;
}

export interface VoiceSettings {
  koreanEnabled: boolean;
  englishEnabled: boolean;
  speed: number;
  koreanVoice?: string;
  englishVoice?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = memo(({ 
  className = '',
  onVoiceSettingsChange 
}) => {
  const { value: voiceSettings, setValue: setVoiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // 🔧 플러그인을 통한 음성 목록 로드
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const ServiceContainer = (await import('@/container/ServiceContainer')).default;
        const container = ServiceContainer.getInstanceSync();
        const speechService = container.getSpeechProcessingService();

        // 플러그인이 getAvailableVoices를 지원하는지 확인
        if (typeof speechService.getAvailableVoices === 'function') {
          const voices = await speechService.getAvailableVoices();
          setAvailableVoices(voices || []);
        } else {
          // fallback: 기본 음성 목록 설정
          setAvailableVoices([]);
          console.warn('🔧 Speech plugin does not support getAvailableVoices');
        }
      } catch (error) {
        console.error('🔧 [VoiceControls] Failed to load voices:', error);
        setAvailableVoices([]);
      }
    };

    loadVoices();
  }, []);

  // Filter voices by language
  const koreanVoices = availableVoices.filter(voice => 
    voice.lang.startsWith('ko') || voice.name.includes('Korean')
  );
  
  const englishVoices = availableVoices.filter(voice => 
    voice.lang.startsWith('en') || voice.name.includes('English')
  );

  // Update voice settings and notify parent
  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    const updated = { ...voiceSettings, ...newSettings };
    setVoiceSettings(updated);
    onVoiceSettingsChange?.(updated);
  }, [voiceSettings, setVoiceSettings, onVoiceSettingsChange]);

  // 🔧 플러그인을 통한 음성 테스트 함수
  const testVoice = useCallback(async (text: string, lang: 'ko' | 'en') => {
    try {
      const ServiceContainer = (await import('@/container/ServiceContainer')).default;
      const container = ServiceContainer.getInstanceSync();
      const speechService = container.getSpeechProcessingService();

      await speechService.speakAnswer(text, {
        language: lang === 'ko' ? 'ko-KR' : 'en-US',
        rate: voiceSettings.speed,
        volume: 1.0,
        pitch: 1.0
      });

      console.log(`🔧 [VoiceControls] Voice test completed: ${lang}`);
    } catch (error) {
      console.error(`🔧 [VoiceControls] Voice test failed for ${lang}:`, error);
    }
  }, [voiceSettings]);

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
      role="region"
      aria-label="Voice settings control panel"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 rounded-t-xl"
        aria-expanded={isExpanded}
        aria-controls="voice-controls-panel"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🔊</span>
          </div>
          <span className="font-semibold text-gray-800">음성 설정</span>
        </div>
        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Controls */}
      {isExpanded && (
        <div 
          id="voice-controls-panel"
          className="px-4 pb-4 space-y-6 border-t border-gray-100 animate-fade-in"
        >
          {/* Voice Speed Control */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <label className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span className="flex items-center space-x-2">
                <span className="text-blue-500">⚡</span>
                <span>음성 속도</span>
              </span>
              <span className="text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full text-xs">{voiceSettings.speed}x</span>
            </label>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 font-medium">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voiceSettings.speed}
                onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
                className="flex-1 h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider shadow-inner"
                aria-label={`음성 속도 ${voiceSettings.speed}배`}
              />
              <span className="text-xs text-gray-500 font-medium">1.5x</span>
            </div>
          </div>

          {/* Korean Voice Settings */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="text-green-500">🇰🇷</span>
                <span>한국어 음성</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceSettings.koreanEnabled}
                  onChange={(e) => updateSettings({ koreanEnabled: e.target.checked })}
                  className="sr-only peer"
                  aria-label="한국어 음성 사용 여부"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500 shadow-inner"></div>
              </label>
            </div>
            
            {voiceSettings.koreanEnabled && (
              <div className="space-y-2">
                <select
                  value={voiceSettings.koreanVoice || ''}
                  onChange={(e) => updateSettings({ koreanVoice: e.target.value || undefined })}
                  className="w-full p-3 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                  aria-label="한국어 음성 선택"
                >
                  <option value="">시스템 기본</option>
                  {koreanVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} {voice.default ? '(기본)' : ''}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => testVoice('안녕하세요, 한국어 음성 테스트입니다.', 'ko')}
                  className="w-full px-3 py-3 text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-lg hover:from-green-200 hover:to-emerald-200 transition-all duration-200 font-medium border border-green-200 shadow-sm hover:shadow-md"
                  aria-label="한국어 음성 테스트 재생"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>🎵</span>
                    <span>한국어 음성 테스트</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* English Voice Settings */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span className="text-purple-500">🇺🇸</span>
                <span>영어 음성</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceSettings.englishEnabled}
                  onChange={(e) => updateSettings({ englishEnabled: e.target.checked })}
                  className="sr-only peer"
                  aria-label="영어 음성 사용 여부"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-blue-500 shadow-inner"></div>
              </label>
            </div>
            
            {voiceSettings.englishEnabled && (
              <div className="space-y-2">
                <select
                  value={voiceSettings.englishVoice || ''}
                  onChange={(e) => updateSettings({ englishVoice: e.target.value || undefined })}
                  className="w-full p-3 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                  aria-label="영어 음성 선택"
                >
                  <option value="">시스템 기본</option>
                  {englishVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} {voice.default ? '(기본)' : ''}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => testVoice('Hello, this is an English voice test.', 'en')}
                  className="w-full px-3 py-3 text-sm bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-blue-200 transition-all duration-200 font-medium border border-purple-200 shadow-sm hover:shadow-md"
                  aria-label="영어 음성 테스트 재생"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>🎵</span>
                    <span>영어 음성 테스트</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
            <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <span className="text-orange-500">⚡</span>
              <span>빠른 설정</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateSettings({ speed: 0.8, koreanEnabled: true, englishEnabled: false })}
                className="px-3 py-3 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md font-medium"
                aria-label="한국어만 0.8배속으로 설정"
              >
                <span className="flex flex-col items-center space-y-1">
                  <span>🇰🇷</span>
                  <span>한국어만 (0.8x)</span>
                </span>
              </button>
              <button
                onClick={() => updateSettings({ speed: 1.0, koreanEnabled: true, englishEnabled: true })}
                className="px-3 py-3 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md font-medium"
                aria-label="모든 음성 1배속으로 설정"
              >
                <span className="flex flex-col items-center space-y-1">
                  <span>🌍</span>
                  <span>모든 음성 (1.0x)</span>
                </span>
              </button>
              <button
                onClick={() => updateSettings({ speed: 1.2, koreanEnabled: false, englishEnabled: true })}
                className="px-3 py-3 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md font-medium"
                aria-label="영어만 1.2배속으로 설정"
              >
                <span className="flex flex-col items-center space-y-1">
                  <span>🇺🇸</span>
                  <span>영어만 (1.2x)</span>
                </span>
              </button>
              <button
                onClick={() => updateSettings({ speed: 0.6, koreanEnabled: true, englishEnabled: true })}
                className="px-3 py-3 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md font-medium"
                aria-label="모든 음성 0.6배속으로 설정"
              >
                <span className="flex flex-col items-center space-y-1">
                  <span>🐌</span>
                  <span>느리게 (0.6x)</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        
        .slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
});

VoiceControls.displayName = 'VoiceControls';