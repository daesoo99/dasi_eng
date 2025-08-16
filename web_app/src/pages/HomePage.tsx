import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAppStore, useLearningMode, type LearningMode } from '@/store/useAppStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const learningMode = useLearningMode();
  const { setUserLevel, setUserStage, setLearningMode } = useAppStore();
  const [showLevelSelector, setShowLevelSelector] = useState(false);

  const handleStartStudy = () => {
    navigate('/study');
  };

  const handleLevelSelect = (level: number, stage: number = 1) => {
    setUserLevel(level);
    setUserStage(stage);
    setShowLevelSelector(false);
  };

  // 완성된 레벨들과 사용 가능한 스테이지 정보
  const availableLevels = [
    { 
      level: 2, 
      title: '기본 패턴', 
      description: 'A2-B1 기초 문법', 
      stages: 22, 
      completed: true,
      color: 'bg-green-500'
    },
    { 
      level: 3, 
      title: '고급 문법', 
      description: 'B1-B2 복문 구조', 
      stages: 30, 
      completed: true,
      color: 'bg-blue-500'
    },
    { 
      level: 4, 
      title: '비즈니스', 
      description: 'B2-C1 실무 영어', 
      stages: 24, 
      completed: true,
      color: 'bg-purple-500'
    },
    { 
      level: 5, 
      title: '학술 연구', 
      description: 'C1-C2 학술 영어', 
      stages: 12, 
      completed: false, // 1차만 완성
      color: 'bg-indigo-500'
    }
  ];

  const getLevelTitle = (level: number) => {
    const found = availableLevels.find(l => l.level === level);
    return found ? found.title : `Level ${level}`;
  };

  const getProgressPercentage = () => {
    // Calculate progress: each level has 10 stages
    const totalStages = (user.level - 1) * 10 + user.stage;
    const maxStages = 10 * 10; // 10 levels × 10 stages
    return Math.round((totalStages / maxStages) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            DASI English
          </h1>
          <p className="text-gray-600">다시 영어 - AI 영어 학습</p>
        </div>

        {/* Learning Mode Selection */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white mb-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold mb-2">🎯 학습 모드 선택</h2>
            <p className="text-sm opacity-90">모든 학습에 적용되는 입력 방식을 선택하세요</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLearningMode('writing')}
              className={`p-4 rounded-lg transition-all duration-200 ${
                learningMode === 'writing'
                  ? 'bg-white text-purple-600 shadow-lg transform scale-105'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              <div className="text-2xl mb-2">✍️</div>
              <div className="font-bold text-sm mb-1">Writing 모드</div>
              <div className="text-xs opacity-80">키보드 입력, 문법 체크</div>
            </button>
            
            <button
              onClick={() => setLearningMode('speaking')}
              className={`p-4 rounded-lg transition-all duration-200 ${
                learningMode === 'speaking'
                  ? 'bg-white text-purple-600 shadow-lg transform scale-105'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              <div className="text-2xl mb-2">🎤</div>
              <div className="font-bold text-sm mb-1">Speaking 모드</div>
              <div className="text-xs opacity-80">음성 입력, 발음 체크</div>
            </button>
          </div>
        </div>

        {/* Current Level Display */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium opacity-90">현재 레벨</h2>
              <h3 className="text-2xl font-bold">
                Level {user.level} - {getLevelTitle(user.level)}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">스테이지</div>
              <div className="text-xl font-bold">{user.stage}/10</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white bg-opacity-20 rounded-full h-2 mb-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${(user.stage / 10) * 100}%` }}
            />
          </div>
          <div className="text-xs opacity-90">
            전체 진행도: {getProgressPercentage()}% • {learningMode === 'writing' ? '✍️ Writing' : '🎤 Speaking'} 모드
          </div>
        </div>

        {/* Study Buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={handleStartStudy}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            🎯 현재 레벨 학습 시작
          </button>
          
          <button
            onClick={() => setShowLevelSelector(!showLevelSelector)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            📚 다른 레벨 선택
          </button>

          <button
            onClick={() => navigate('/smart-review')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            🧠 스마트 복습 (AI 맞춤)
          </button>

          <button
            onClick={() => navigate('/all-mode')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            🔄 ALL 모드 (망각곡선 복습)
          </button>

          <button
            onClick={() => navigate('/personalized')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            🤖 개인 맞춤팩 (AI 완전자동)
          </button>

          <button
            onClick={() => navigate('/scenario')}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            🎭 시나리오 대화 (5-10턴)
          </button>

          <button
            onClick={() => navigate('/progress')}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            📊 진도 관리 (상세 분석)
          </button>

          <button
            onClick={() => navigate('/speed-mode')}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            ⚡ 속도/난이도 조절 모드
          </button>

          <button
            onClick={() => navigate('/stage-focus')}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            🎯 Stage 집중 모드 (정밀 연습)
          </button>
          
          {showLevelSelector && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 mb-3">완성된 레벨들</h3>
              {availableLevels.map((levelInfo) => (
                <div key={levelInfo.level} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Level {levelInfo.level} - {levelInfo.title}
                      </h4>
                      <p className="text-sm text-gray-600">{levelInfo.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs text-white ${levelInfo.completed ? 'bg-green-500' : 'bg-orange-500'}`}>
                      {levelInfo.completed ? '완성' : '부분완성'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {levelInfo.stages}개 스테이지 이용 가능
                  </div>
                  <button
                    onClick={() => handleLevelSelect(levelInfo.level, 1)}
                    className={`w-full ${levelInfo.color} hover:opacity-90 text-white font-medium py-2 px-4 rounded transition-opacity duration-200`}
                  >
                    Level {levelInfo.level} 시작하기
                  </button>
                </div>
              ))}
              
              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={() => window.open('../lv1_patterns_viewer.html', '_blank')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
                >
                  📖 Level 1 패턴 학습 (별도 페이지)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{user.level}</div>
            <div className="text-sm text-gray-600">레벨</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{user.stage}</div>
            <div className="text-sm text-gray-600">스테이지</div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center space-x-3">
            <span className="text-blue-500">🎤</span>
            <span>음성 인식으로 발음 연습</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-500">🤖</span>
            <span>AI가 제공하는 실시간 피드백</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-purple-500">📈</span>
            <span>레벨별 체계적인 학습 진행</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-orange-500">📚</span>
            <span>376개 기초 패턴 데이터베이스</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-pink-500">🤖</span>
            <span>AI 완전자동 맞춤팩 (오답+망각곡선+약점패턴)</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-teal-500">🎭</span>
            <span>실전 시나리오 기반 대화 연습</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-center space-x-4 text-sm">
            <button 
              onClick={() => navigate('/progress')}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              📊 진행상황
            </button>
            <button 
              onClick={() => window.open('../lv1_patterns_viewer.html', '_blank')}
              className="text-orange-600 hover:text-orange-800 transition-colors"
            >
              📚 패턴학습
            </button>
            <button 
              onClick={() => navigate('/curriculum-test')}
              className="text-purple-600 hover:text-purple-800 transition-colors"
            >
              🧪 커리큘럼 테스트
            </button>
            <button 
              onClick={() => navigate('/curriculum-lint')}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              📋 콘텐츠 린트
            </button>
            <button 
              onClick={() => navigate('/audio-test')}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              🎵 AudioV2 테스트
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ⚙️ 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};