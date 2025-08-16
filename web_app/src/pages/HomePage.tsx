import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAppStore, useLearningMode, type LearningMode } from '@/store/useAppStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const learningMode = useLearningMode();
  const { setUserLevel, setUserStage, setLearningMode } = useAppStore();

  const handleStartStudy = () => {
    navigate('/study');
  };

  const handleLevelSelect = (level: number, stage: number = 1) => {
    setUserLevel(level);
    setUserStage(stage);
  };

  // 완성된 레벨들과 사용 가능한 스테이지 정보
  const availableLevels = [
    { 
      level: 1, 
      title: '기초 표현', 
      description: 'A1 영어 기초 패턴', 
      stages: 19, 
      completed: true,
      color: 'bg-emerald-500'
    },
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
    },
    { 
      level: 6, 
      title: '실용 영어', 
      description: 'C2 고급 활용', 
      stages: 24, 
      completed: true,
      color: 'bg-orange-500'
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

        {/* Main Study Section */}
        <div className="space-y-4 mb-6">
          {/* Quick Level Selector */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">📚 레벨 선택</h3>
            <div className="grid grid-cols-3 gap-2">
              {availableLevels.map((levelInfo) => (
                <button
                  key={levelInfo.level}
                  onClick={() => handleLevelSelect(levelInfo.level, 1)}
                  className={`p-3 rounded-lg text-center transition-all duration-200 ${
                    user.level === levelInfo.level
                      ? `${levelInfo.color} text-white shadow-lg`
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-lg">L{levelInfo.level}</div>
                  <div className="text-xs mt-1 opacity-80">{levelInfo.title}</div>
                  <div className="text-xs mt-1">{levelInfo.stages}단계</div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Study Button */}
          <button
            onClick={handleStartStudy}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 text-lg shadow-lg"
          >
            🎯 Level {user.level} 학습 시작
          </button>

          {/* Secondary Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/all-mode')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 text-sm"
            >
              🔄 ALL 모드
              <div className="text-xs opacity-90 mt-1">망각곡선 복습</div>
            </button>

            <button
              onClick={() => navigate('/personalized')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 text-sm"
            >
              🤖 맞춤팩
              <div className="text-xs opacity-90 mt-1">AI 자동생성</div>
            </button>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">🚀 고급 기능</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/scenario')}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
            >
              🎭 시나리오 대화
            </button>
            
            <button
              onClick={() => navigate('/progress')}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 text-sm"
            >
              📊 진도 관리
            </button>
          </div>
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
            <span>1000+ 학습 카드 데이터베이스</span>
          </div>
        </div>

        {/* Development Tools */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors">
              🔧 개발 도구
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button 
                onClick={() => navigate('/curriculum-test')}
                className="text-purple-600 hover:text-purple-800 transition-colors p-2 bg-purple-50 rounded"
              >
                🧪 커리큘럼 테스트
              </button>
              <button 
                onClick={() => navigate('/curriculum-lint')}
                className="text-indigo-600 hover:text-indigo-800 transition-colors p-2 bg-indigo-50 rounded"
              >
                📋 콘텐츠 린트
              </button>
              <button 
                onClick={() => navigate('/audio-test')}
                className="text-red-600 hover:text-red-800 transition-colors p-2 bg-red-50 rounded"
              >
                🎵 AudioV2 테스트
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="text-gray-600 hover:text-gray-800 transition-colors p-2 bg-gray-50 rounded"
              >
                ⚙️ 설정
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};