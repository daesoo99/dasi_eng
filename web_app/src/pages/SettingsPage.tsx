import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage, STORAGE_KEYS, type VoiceSettings } from '@/hooks/useLocalStorage';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { value: voiceSettings, updateValue } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);

  const handleVoiceSettingChange = (key: keyof VoiceSettings, value: boolean | number | string) => {
    updateValue(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white">⚙️ 설정</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">음성 설정 및 학습 환경 개인화</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          
          {/* Voice Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white dark:text-white mb-6 flex items-center">
              <span className="text-2xl mr-3">🎤</span>
              음성 설정
            </h2>
            
            {/* 음성 활성화 설정 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-4">음성 출력 설정</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">한국어 음성</div>
                    <div className="text-sm text-gray-600">문제 읽어주기</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.koreanEnabled}
                      onChange={(e) => handleVoiceSettingChange('koreanEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">영어 음성</div>
                    <div className="text-sm text-gray-600">정답 읽어주기</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.englishEnabled}
                      onChange={(e) => handleVoiceSettingChange('englishEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 음성 품질 설정 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">음성 품질</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">향상된 TTS</div>
                    <div className="text-sm text-gray-600">자연스러운 발음과 억양 최적화</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.voiceQuality === 'enhanced'}
                      onChange={(e) => handleVoiceSettingChange('voiceQuality', e.target.checked ? 'enhanced' : 'basic')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 음성 속도 설정 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">음성 속도</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">느림</span>
                  <span className="text-md font-medium text-gray-800 dark:text-white">{voiceSettings.speed.toFixed(1)}x</span>
                  <span className="text-sm text-gray-600">빠름</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.speed}
                  onChange={(e) => handleVoiceSettingChange('speed', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>1.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>

            {/* 음성 톤 설정 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">음성 톤</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">낮음</span>
                    <span className="text-md font-medium text-gray-800 dark:text-white">피치 {voiceSettings.pitch.toFixed(1)}</span>
                    <span className="text-sm text-gray-600">높음</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.pitch}
                    onChange={(e) => handleVoiceSettingChange('pitch', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">작음</span>
                    <span className="text-md font-medium text-gray-800 dark:text-white">볼륨 {Math.round(voiceSettings.volume * 100)}%</span>
                    <span className="text-sm text-gray-600">큼</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={voiceSettings.volume}
                    onChange={(e) => handleVoiceSettingChange('volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 발음 옵션 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">발음 최적화</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">자연스러운 쉼</div>
                    <div className="text-sm text-gray-600">문장 사이에 자연스러운 간격 추가</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.naturalPauses}
                      onChange={(e) => handleVoiceSettingChange('naturalPauses', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">주요 단어 강조</div>
                    <div className="text-sm text-gray-600">중요한 단어를 더 명확하게 발음</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.emphasizeKeyWords}
                      onChange={(e) => handleVoiceSettingChange('emphasizeKeyWords', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">초보자 모드</div>
                    <div className="text-sm text-gray-600">더 천천히, 더 명확하게 발음</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.slowLearnerMode}
                      onChange={(e) => handleVoiceSettingChange('slowLearnerMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-orange-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">문장 단위 읽기</div>
                    <div className="text-sm text-gray-600">긴 문장을 나누어서 읽기</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.sentenceBreaking}
                      onChange={(e) => handleVoiceSettingChange('sentenceBreaking', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 발음 명확도 설정 */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">발음 명확도</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'clear', 'extra-clear'] as const).map((clarity) => (
                    <button
                      key={clarity}
                      onClick={() => handleVoiceSettingChange('pronunciationClarity', clarity)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        voiceSettings.pronunciationClarity === clarity
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {clarity === 'normal' ? '일반' : clarity === 'clear' ? '명확' : '매우 명확'}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {voiceSettings.pronunciationClarity === 'normal' && '기본 발음 속도와 명확도'}
                  {voiceSettings.pronunciationClarity === 'clear' && '조금 더 천천히, 명확한 발음'}
                  {voiceSettings.pronunciationClarity === 'extra-clear' && '매우 천천히, 각 음소를 정확하게'}
                </div>
              </div>
            </div>

            {/* 음성 테스트 */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">음성 테스트</h4>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    if (voiceSettings.koreanEnabled) {
                      const text = voiceSettings.sentenceBreaking
                        ? '안녕하세요. 한국어 테스트입니다. 설정이 적용됐나요?'
                        : '안녕하세요. 한국어 테스트입니다. 설정이 적용됐나요?';

                      try {
                        // 🔧 플러그인을 통한 TTS 테스트
                        const ServiceContainer = (await import('@/container/ServiceContainer')).default;
                        const container = ServiceContainer.getInstanceSync();
                        const speechService = container.getSpeechProcessingService();

                        await speechService.speakAnswer(text, {
                          language: 'ko-KR',
                          rate: voiceSettings.slowLearnerMode ? voiceSettings.speed * 0.7 : voiceSettings.speed,
                          volume: voiceSettings.volume,
                          pitch: voiceSettings.pitch
                        });
                      } catch (error) {
                        console.error('🔧 [SettingsPage] Korean TTS test failed:', error);
                      }
                    }
                  }}
                  disabled={!voiceSettings.koreanEnabled}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  🇰🇷 한국어 테스트
                </button>
                <button
                  onClick={async () => {
                    if (voiceSettings.englishEnabled) {
                      let text = 'Hello. This is an English test with enhanced settings.';

                      // 발음 명확도에 따른 텍스트 조정
                      if (voiceSettings.pronunciationClarity === 'extra-clear') {
                        text = 'Hel-lo. This is an Eng-lish test with en-hanced set-tings.';
                      } else if (voiceSettings.emphasizeKeyWords) {
                        text = 'HELLO. This is an ENGLISH test with ENHANCED settings.';
                      }

                      try {
                        // 🔧 플러그인을 통한 TTS 테스트
                        const ServiceContainer = (await import('@/container/ServiceContainer')).default;
                        const container = ServiceContainer.getInstanceSync();
                        const speechService = container.getSpeechProcessingService();

                        // 문장 단위로 나누기
                        if (voiceSettings.sentenceBreaking) {
                          const sentences = text.split('. ');
                          for (let index = 0; index < sentences.length; index++) {
                            const sentence = sentences[index] + (index < sentences.length - 1 ? '.' : '');
                            const delay = index * (voiceSettings.naturalPauses ? 1000 : 100);

                            setTimeout(async () => {
                              try {
                                await speechService.speakAnswer(sentence, {
                                  language: 'en-US',
                                  rate: voiceSettings.slowLearnerMode ? voiceSettings.speed * 0.7 : voiceSettings.speed,
                                  volume: voiceSettings.volume,
                                  pitch: voiceSettings.pitch
                                });
                              } catch (error) {
                                console.error(`🔧 [SettingsPage] English TTS sentence ${index} failed:`, error);
                              }
                            }, delay);
                          }
                        } else {
                          await speechService.speakAnswer(text, {
                            language: 'en-US',
                            rate: voiceSettings.slowLearnerMode ? voiceSettings.speed * 0.7 : voiceSettings.speed,
                            volume: voiceSettings.volume,
                            pitch: voiceSettings.pitch
                          });
                        }
                      } catch (error) {
                        console.error('🔧 [SettingsPage] English TTS test failed:', error);
                      }
                    }
                  }}
                  disabled={!voiceSettings.englishEnabled}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  🇺🇸 English Test
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * 설정이 비활성화된 음성은 테스트할 수 없습니다
              </p>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 알림 설정 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6 opacity-60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                  <span className="text-2xl mr-3">🔔</span>
                  알림 설정
                </h2>
                <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">준비중</span>
              </div>
              <div className="space-y-3 text-gray-500">
                <div>• 학습 리마인더 설정</div>
                <div>• 복습 알림 시간 설정</div>
                <div>• 진도 알림 활성화</div>
                <div>• 성취 뱃지 알림</div>
              </div>
            </div>

            {/* 학습 환경 설정 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6 opacity-60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                  <span className="text-2xl mr-3">📚</span>
                  학습 환경
                </h2>
                <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">준비중</span>
              </div>
              <div className="space-y-3 text-gray-500">
                <div>• 난이도 자동 조절</div>
                <div>• 개인화 학습 경로</div>
                <div>• 선호 학습 시간 설정</div>
                <div>• 학습 목표 설정</div>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
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
                <span>Web Speech API (브라우저)</span>
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