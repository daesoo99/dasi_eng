import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useSettings } from '@/store/useAppStore';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettings();
  const { updateSettings } = useAppStore();

  const handleLanguageChange = (language: 'ko' | 'en') => {
    updateSettings({ language });
  };

  const handleSTTEngineChange = (sttEngine: 'browser' | 'cloud') => {
    updateSettings({ sttEngine });
  };

  const handleTTSToggle = () => {
    updateSettings({ ttsEnabled: !settings.ttsEnabled });
  };

  const handleVolumeChange = (volume: number) => {
    updateSettings({ volume });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 뒤로
            </button>
            <h1 className="text-lg font-semibold">설정</h1>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          
          {/* Language Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">🌐</span>
              언어 설정
            </h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="ko"
                  checked={settings.language === 'ko'}
                  onChange={() => handleLanguageChange('ko')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">한국어</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={settings.language === 'en'}
                  onChange={() => handleLanguageChange('en')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">English</span>
              </label>
            </div>
          </div>

          {/* Speech Recognition Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">🎤</span>
              음성 인식 엔진
            </h2>
            <div className="space-y-3 mb-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="sttEngine"
                  value="browser"
                  checked={settings.sttEngine === 'browser'}
                  onChange={() => handleSTTEngineChange('browser')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-gray-700 font-medium">브라우저</div>
                  <div className="text-sm text-gray-500">빠르고 무료 (정확도 보통)</div>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="sttEngine"
                  value="cloud"
                  checked={settings.sttEngine === 'cloud'}
                  onChange={() => handleSTTEngineChange('cloud')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-gray-700 font-medium">클라우드</div>
                  <div className="text-sm text-gray-500">높은 정확도 (인터넷 필요)</div>
                </div>
              </label>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">🔊</span>
              오디오 설정
            </h2>
            
            {/* TTS Toggle */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-gray-700 font-medium">음성 피드백</div>
                  <div className="text-sm text-gray-500">정답을 음성으로 재생</div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.ttsEnabled}
                    onChange={handleTTSToggle}
                    className="sr-only"
                  />
                  <div
                    className={`block w-14 h-8 rounded-full transition-colors ${
                      settings.ttsEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${
                        settings.ttsEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </label>
            </div>

            {/* Volume Control */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                볼륨: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                disabled={!settings.ttsEnabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>

          {/* App Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              앱 정보
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>버전</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>음성 인식</span>
                <span>{settings.sttEngine === 'browser' ? 'Web Speech API' : 'Google Cloud STT'}</span>
              </div>
              <div className="flex justify-between">
                <span>음성 합성</span>
                <span>Web Speech API</span>
              </div>
              <div className="flex justify-between">
                <span>AI 모델</span>
                <span>Google Gemini 1.5 Flash</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔒 개인정보 보호</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 음성 녹음은 임시로만 처리되며 저장되지 않습니다</li>
              <li>• 학습 진도와 텍스트 결과만 안전하게 저장됩니다</li>
              <li>• 모든 데이터는 암호화되어 전송됩니다</li>
            </ul>
          </div>

          {/* Support */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">문제가 있나요?</p>
            <p className="text-xs text-gray-500">
              브라우저를 새로고침하거나 마이크 권한을 확인해보세요
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};