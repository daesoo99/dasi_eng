import React from 'react';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';

export const VoiceGuidanceSettings: React.FC = () => {
  const { settings, isSupported, updateSettings, speak } = useVoiceGuidance();

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
        <h3 className="font-medium text-yellow-800">Voice Guidance Not Supported</h3>
        <p className="text-sm text-yellow-600 mt-1">
          Your browser does not support speech synthesis. Please use a modern browser for voice guidance features.
        </p>
      </div>
    );
  }

  const testVoice = (type: 'system' | 'content') => {
    const testMessages = {
      system: "Voice guidance is working. This is a system notification.",
      content: "This is how content will sound when read aloud."
    };
    speak(testMessages[type], type);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Voice Guidance Settings</h2>
      
      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="voice-enabled"
            checked={settings.enabled}
            onChange={(e) => updateSettings({ enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
            aria-describedby="voice-enabled-desc"
          />
          <label htmlFor="voice-enabled" className="font-medium text-gray-900">
            Enable Voice Guidance
          </label>
        </div>
        <p id="voice-enabled-desc" className="text-sm text-gray-600 ml-7">
          Provides audio announcements for interface actions and status updates
        </p>

        {settings.enabled && (
          <>
            {/* System Voice */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="system-voice"
                checked={settings.systemVoice}
                onChange={(e) => updateSettings({ systemVoice: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                aria-describedby="system-voice-desc"
              />
              <label htmlFor="system-voice" className="font-medium text-gray-900">
                System Announcements
              </label>
            </div>
            <p id="system-voice-desc" className="text-sm text-gray-600 ml-7">
              Announces system status like "Recording started" or "Migration completed"
            </p>

            {/* Volume Control */}
            <div className="space-y-2">
              <label htmlFor="voice-volume" className="font-medium text-gray-900">
                Volume: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                id="voice-volume"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-describedby="voice-volume-desc"
              />
              <p id="voice-volume-desc" className="text-sm text-gray-600">
                Adjust the volume of voice guidance announcements
              </p>
            </div>

            {/* Speech Rate */}
            <div className="space-y-2">
              <label htmlFor="voice-rate" className="font-medium text-gray-900">
                Speech Rate: {settings.rate.toFixed(1)}x
              </label>
              <input
                type="range"
                id="voice-rate"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.rate}
                onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-describedby="voice-rate-desc"
              />
              <p id="voice-rate-desc" className="text-sm text-gray-600">
                Control how fast or slow the voice speaks
              </p>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <label htmlFor="voice-pitch" className="font-medium text-gray-900">
                Pitch: {settings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                id="voice-pitch"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => updateSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                aria-describedby="voice-pitch-desc"
              />
              <p id="voice-pitch-desc" className="text-sm text-gray-600">
                Adjust the pitch/tone of the voice
              </p>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label htmlFor="voice-language" className="font-medium text-gray-900">
                Language
              </label>
              <select
                id="voice-language"
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="w-full p-2 border-2 border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                aria-describedby="voice-language-desc"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="ko-KR">한국어</option>
                <option value="ja-JP">日本語</option>
                <option value="zh-CN">中文</option>
              </select>
              <p id="voice-language-desc" className="text-sm text-gray-600">
                Select the language for voice guidance
              </p>
            </div>

            {/* Test Buttons */}
            <div className="space-y-3" role="group" aria-label="Voice Test Controls">
              <h3 className="font-medium text-gray-900">Test Voice Settings</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => testVoice('system')}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  aria-label="Test system voice settings"
                >
                  <span aria-hidden="true">🔊</span> Test System Voice
                </button>
                <button
                  onClick={() => testVoice('content')}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  aria-label="Test content voice settings"
                >
                  <span aria-hidden="true">🎵</span> Test Content Voice
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};