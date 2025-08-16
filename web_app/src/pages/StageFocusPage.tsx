import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StageSelector } from '@/components/StageSelector';
import { StageFocusSessionComponent } from '@/components/StageFocusSession';
import { useUser } from '@/store/useAppStore';
import type { StageFocusSettings, SpeedLevel, RepeatCount } from '@/services/stageFocusMode';

type PageMode = 'level_select' | 'stage_select' | 'settings' | 'session' | 'results';

const StageFocusPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  
  const [currentMode, setCurrentMode] = useState<PageMode>('level_select');
  const [selectedLevel, setSelectedLevel] = useState<number>(user.level || 3);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [settings, setSettings] = useState<StageFocusSettings>({
    level: selectedLevel,
    stage: 1,
    speedLevel: 'medium' as SpeedLevel,
    repeatCount: 6 as RepeatCount,
    immediateCorrection: true,
    autoPlayCorrectAnswer: true,
    shuffleQuestions: true
  });
  const [sessionResults, setSessionResults] = useState<any>(null);

  const userId = user.id || 'demo-user';

  // 사용 가능한 레벨 정보
  const availableLevels = [
    { level: 3, title: '고급 문법', description: 'B1-B2 복문 구조', stages: 30 },
    { level: 4, title: '비즈니스', description: 'B2-C1 실무 영어', stages: 24 },
    { level: 5, title: '학술 연구', description: 'C1-C2 학술 영어', stages: 12 },
    { level: 6, title: '고급 표현', description: '네이티브 수준', stages: 8 }
  ];

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level);
    setSettings(prev => ({ ...prev, level }));
    setCurrentMode('stage_select');
  };

  const handleStageSelect = (stage: number) => {
    setSelectedStage(stage);
    setSettings(prev => ({ ...prev, stage }));
    setCurrentMode('settings');
  };

  const handleStartSession = () => {
    setCurrentMode('session');
  };

  const handleSessionComplete = (results: any) => {
    setSessionResults(results);
    setCurrentMode('results');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleNewSession = () => {
    setCurrentMode('level_select');
    setSessionResults(null);
  };

  // 레벨 선택 화면
  const renderLevelSelect = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Stage 집중 모드</h1>
          <p className="text-gray-600">정밀 연습으로 특정 스테이지를 완전히 마스터하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {availableLevels.map((levelInfo) => (
            <div
              key={levelInfo.level}
              onClick={() => handleLevelSelect(levelInfo.level)}
              className="border-2 border-gray-200 hover:border-blue-400 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Level {levelInfo.level}
                </h3>
                <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {levelInfo.stages}개 스테이지
                </span>
              </div>
              
              <h4 className="font-semibold text-gray-800 mb-2">{levelInfo.title}</h4>
              <p className="text-gray-600 text-sm mb-4">{levelInfo.description}</p>
              
              <div className="flex items-center text-blue-600">
                <span className="text-sm font-medium">선택하기</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Stage 집중 모드 특징</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 text-sm">
            <div>• 5-8문장 선별 집중 연습</div>
            <div>• 3단계 속도 조절 (1-3초)</div>
            <div>• 즉시 정답 표시 및 발화</div>
            <div>• 반복 학습으로 완전 마스터</div>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={handleBackToHome}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  // 설정 화면
  const renderSettings = () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Level {selectedLevel} - Stage {selectedStage} 설정
          </h1>
          <p className="text-gray-600">집중 연습 설정을 조정하세요</p>
        </div>

        <div className="space-y-6">
          {/* 속도 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              연습 속도 (문제 간 지연시간)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'slow', label: '느림 (3초)', icon: '🐌' },
                { key: 'medium', label: '보통 (2초)', icon: '🚀' },
                { key: 'fast', label: '빠름 (1초)', icon: '⚡' }
              ].map((speed) => (
                <button
                  key={speed.key}
                  onClick={() => setSettings(prev => ({ ...prev, speedLevel: speed.key as SpeedLevel }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.speedLevel === speed.key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{speed.icon}</div>
                  <div className="text-sm font-medium">{speed.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 문장 수 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              연습 문장 수: {settings.repeatCount}개
            </label>
            <input
              type="range"
              min="5"
              max="8"
              value={settings.repeatCount}
              onChange={(e) => setSettings(prev => ({ ...prev, repeatCount: parseInt(e.target.value) as RepeatCount }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5개 (빠른 연습)</span>
              <span>8개 (완전 마스터)</span>
            </div>
          </div>

          {/* 옵션 설정 */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.immediateCorrection}
                onChange={(e) => setSettings(prev => ({ ...prev, immediateCorrection: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">즉시 정답 표시 (오답 시)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoPlayCorrectAnswer}
                onChange={(e) => setSettings(prev => ({ ...prev, autoPlayCorrectAnswer: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">정답 자동 발화</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) => setSettings(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">문장 순서 섞기</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setCurrentMode('stage_select')}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ← 스테이지 선택으로
          </button>
          
          <button
            onClick={handleStartSession}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            집중 연습 시작 →
          </button>
        </div>
      </div>
    </div>
  );

  // 결과 화면
  const renderResults = () => (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 집중 연습 완료!</h2>
          <p className="text-gray-600">Level {selectedLevel} - Stage {selectedStage} 결과</p>
        </div>

        {sessionResults && (
          <div className="space-y-6">
            {/* 기본 결과 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {sessionResults.totalAccuracy?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">정확도</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(sessionResults.averageResponseTime / 1000).toFixed(1)}초
                </div>
                <div className="text-sm text-gray-600">평균 응답시간</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sessionResults.masteredQuestions?.length || 0}개
                </div>
                <div className="text-sm text-gray-600">마스터 문장</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionResults.needsReviewQuestions?.length || 0}개
                </div>
                <div className="text-sm text-gray-600">추가 연습 필요</div>
              </div>
            </div>

            {/* 연습 효과성 */}
            <div className={`rounded-lg p-6 text-center ${
              sessionResults.practiceEffectiveness === 'excellent' ? 'bg-green-50 border border-green-200' :
              sessionResults.practiceEffectiveness === 'good' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-2 ${
                sessionResults.practiceEffectiveness === 'excellent' ? 'text-green-800' :
                sessionResults.practiceEffectiveness === 'good' ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                {sessionResults.practiceEffectiveness === 'excellent' ? '🌟 완벽한 연습!' :
                 sessionResults.practiceEffectiveness === 'good' ? '👍 좋은 결과!' :
                 '💪 더 연습이 필요해요'}
              </h3>
              <p className="text-gray-700">{sessionResults.nextStageRecommendation}</p>
            </div>

            {/* 개선 영역 */}
            {sessionResults.improvementAreas?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">🎯 집중 개선 영역</h3>
                <div className="flex flex-wrap gap-2">
                  {sessionResults.improvementAreas.map((area: string, index: number) => (
                    <span key={index} className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleNewSession}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            새로운 집중 연습
          </button>
          
          <button
            onClick={handleBackToHome}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  // 메인 렌더링
  switch (currentMode) {
    case 'level_select':
      return renderLevelSelect();
    
    case 'stage_select':
      return (
        <StageSelector
          level={selectedLevel}
          onStageSelect={handleStageSelect}
          onClose={() => setCurrentMode('level_select')}
        />
      );
    
    case 'settings':
      return renderSettings();
    
    case 'session':
      return (
        <StageFocusSessionComponent
          userId={userId}
          settings={settings}
          onComplete={handleSessionComplete}
          onExit={handleNewSession}
        />
      );
    
    case 'results':
      return renderResults();
    
    default:
      return renderLevelSelect();
  }
};

export default StageFocusPage;