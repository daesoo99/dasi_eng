import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAppStore, useLearningMode, useSpeakingStage, useStageSelection, type LearningMode } from '@/store/useAppStore';
import { StageSelectionModal } from '@/components/StageSelectionModal';
import { SpeakingStageSelector } from '@/components/SpeakingStageSelector';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const learningMode = useLearningMode();
  const speakingStage = useSpeakingStage();
  const { setUserLevel, setUserStage, setLearningMode } = useAppStore();
  const { setSelectedLevel, setStageModalOpen } = useStageSelection();

  const handleStartStudy = () => {
    // ver2 동사군 레이블 매핑 (level-system.html과 100% 일치)
    const verbsByLevel: Record<number, string> = {
      1: 'Be동사, 일반동사, 부정문, 의문문, 기초확장',
      2: 'be동사, 일반동사, 조동사, 현재진행형, 과거형, 미래형',
      3: '미래형심화, 현재완료, 과거완료, 수동태, 조동사확장, 조건문, 가정법',
      4: 'buy, sell, use, try, find',
      5: 'give, tell, show, meet, help',
      6: 'come, leave, start, finish, plan',
      7: 'choose, decide, prefer, expect, suppose',
      8: 'keep, let, allow, suggest, recommend',
      9: 'improve, reduce, compare, analyze, design',
      10: 'coordinate, negotiate, prioritize, implement, evaluate'
    };

    // Navigate to pattern training with current level and stage
    const params = new URLSearchParams();
    params.set('level', user.level.toString());
    params.set('stage', user.stage.toString());
    params.set(
      'verbs',
      verbsByLevel[user.level] 
        || availableLevels.find(l => l.level === user.level)?.title 
        || 'General'
    );
    params.set('targetAccuracy', '80');
    params.set('developerMode', 'false');
    
    window.location.href = `/pattern-training?${params.toString()}`;
  };

  const handleLevelSelect = (level: number, stage: number = 1) => {
    setUserLevel(level);
    setUserStage(stage);
  };

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level);
    setStageModalOpen(true);
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
      stages: 20, 
      completed: true,
      color: 'bg-green-500'
    },
    { 
      level: 3, 
      title: '고급 문법', 
      description: 'B1-B2 복문 구조', 
      stages: 28, 
      completed: true,
      color: 'bg-blue-500'
    },
    { 
      level: 4, 
      title: '고급 표현', 
      description: 'B2-C1 실무 영어', 
      stages: 29, 
      completed: true,
      color: 'bg-purple-500'
    },
    { 
      level: 5, 
      title: '고급 비즈니스', 
      description: 'C1-C2 비즈니스 영어', 
      stages: 29, 
      completed: true,
      color: 'bg-indigo-500'
    },
    { 
      level: 6, 
      title: '도메인 전문성', 
      description: 'C2 전문 분야 영어', 
      stages: 34, 
      completed: true,
      color: 'bg-orange-500'
    },
    { 
      level: 7, 
      title: '비즈니스 영어', 
      description: 'C2 고급 비즈니스', 
      stages: 42, 
      completed: true,
      color: 'bg-red-500'
    },
    { 
      level: 8, 
      title: '고급 담화', 
      description: 'C2+ 고급 표현', 
      stages: 46, 
      completed: true,
      color: 'bg-pink-500'
    },
    { 
      level: 9, 
      title: '전문가 담화', 
      description: 'Expert 전문가 수준', 
      stages: 52, 
      completed: true,
      color: 'bg-violet-500'
    },
    { 
      level: 10, 
      title: '원어민 수준', 
      description: 'Native 원어민 수준', 
      stages: 52, 
      completed: true,
      color: 'bg-slate-600'
    }
  ];

  const getLevelTitle = (level: number) => {
    const found = availableLevels.find(l => l.level === level);
    return found ? found.title : `Level ${level}`;
  };

  const getProgressPercentage = () => {
    // Calculate progress based on available levels
    const totalStages = availableLevels.slice(0, user.level - 1).reduce((acc, level) => acc + level.stages, 0) + user.stage;
    const maxStages = availableLevels.reduce((acc, level) => acc + level.stages, 0);
    return Math.round((totalStages / maxStages) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 DASI English
          </h1>
          <p className="text-gray-600">다시 영어 - 한국인 특화 AI 영어 학습</p>
        </div>

        {/* Learning Mode Selection */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-3">🎯 학습 모드 선택</h2>
            <p className="text-sm opacity-90">모든 학습에 적용되는 입력 방식을 선택하세요</p>
            
            {/* 현재 선택된 모드 표시 */}
            <div className="mt-4 px-4 py-2 bg-white bg-opacity-20 rounded-lg inline-block">
              <div className="text-sm font-medium">
                현재 선택: {learningMode === 'writing' ? '✍️ Writing 모드' : '🎤 Speaking 모드'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLearningMode('writing')}
              className={`p-6 rounded-lg transition-all duration-300 border-2 ${
                learningMode === 'writing'
                  ? 'bg-white text-purple-600 shadow-xl transform scale-105 border-white'
                  : 'bg-white bg-opacity-10 hover:bg-opacity-20 border-white border-opacity-30 hover:border-opacity-50'
              }`}
            >
              <div className="text-3xl mb-3">✍️</div>
              <div className={`font-bold text-base mb-2 ${
                learningMode === 'writing' ? 'text-purple-600' : 'text-white'
              }`}>
                Writing 모드
              </div>
              <div className={`text-sm ${
                learningMode === 'writing' ? 'text-purple-500' : 'text-white opacity-80'
              }`}>
                키보드 입력, 문법 체크
              </div>
              {learningMode === 'writing' && (
                <div className="mt-3 text-purple-600 font-bold text-sm">
                  ✓ 선택됨
                </div>
              )}
            </button>
            
            <button
              onClick={() => setLearningMode('speaking')}
              className={`p-6 rounded-lg transition-all duration-300 border-2 ${
                learningMode === 'speaking'
                  ? 'bg-white text-purple-600 shadow-xl transform scale-105 border-white'
                  : 'bg-white bg-opacity-10 hover:bg-opacity-20 border-white border-opacity-30 hover:border-opacity-50'
              }`}
            >
              <div className="text-3xl mb-3">🎤</div>
              <div className={`font-bold text-base mb-2 ${
                learningMode === 'speaking' ? 'text-purple-600' : 'text-white'
              }`}>
                Speaking 모드
              </div>
              <div className={`text-sm ${
                learningMode === 'speaking' ? 'text-purple-500' : 'text-white opacity-80'
              }`}>
                음성 입력, 발음 체크
              </div>
              {learningMode === 'speaking' && (
                <div className="mt-3 text-purple-600 font-bold text-sm">
                  ✓ 선택됨
                </div>
              )}
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
              <div className="text-xl font-bold">
                {user.stage === 'ALL' ? 'ALL' : `${user.stage}/${availableLevels.find(l => l.level === user.level)?.stages || 10}`}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white bg-opacity-20 rounded-full h-2 mb-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ 
                width: user.stage === 'ALL' 
                  ? '100%' 
                  : `${(user.stage / (availableLevels.find(l => l.level === user.level)?.stages || 10)) * 100}%` 
              }}
            />
          </div>
          <div className="text-xs opacity-90 flex items-center justify-center space-x-2">
            <span>전체 진행도: {getProgressPercentage()}%</span>
            <span>•</span>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              learningMode === 'writing' 
                ? 'bg-blue-500 text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {learningMode === 'writing' ? '✍️ Writing' : '🎤 Speaking'} 모드
            </div>
          </div>
        </div>

        {/* Speaking Stage Selector - Only show in Speaking mode */}
        {learningMode === 'speaking' && (
          <SpeakingStageSelector
            currentStage={speakingStage.stage}
            onStageChange={speakingStage.setSpeakingStage}
          />
        )}

        {/* 메인 학습 섹션 3개로 분리 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 메인 학습 섹션 */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-lg">
              <h2 className="text-lg font-bold">메인 학습</h2>
              <p className="text-sm opacity-90">주요 학습 기능</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={handleStartStudy}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
              >
                🎯 Level {user.level}{user.stage === 'ALL' ? ' ALL 모드' : ` Stage ${user.stage}`} 학습 시작
              </button>
              
              <button
                onClick={() => navigate('/all-mode')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
              >
                🔄 ALL 모드
                <div className="text-xs opacity-90 mt-1">망각곡선 복습</div>
              </button>
              
              <button
                onClick={() => navigate('/personalized')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
              >
                🤖 맞춤팩
                <div className="text-xs opacity-90 mt-1">AI 자동생성</div>
              </button>
            </div>
          </div>

          {/* 학습 관리 섹션 */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-lg">
              <h2 className="text-lg font-bold">학습 관리</h2>
              <p className="text-sm opacity-90">진도 및 성과 관리</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => navigate('/progress')}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                📊 진도 관리
              </button>
              
              {/* 레벨 선택자 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="font-medium text-gray-800 mb-2 text-sm">📚 레벨 선택</h3>
                <div className="grid grid-cols-5 gap-1">
                  {availableLevels.slice(0, 10).map((levelInfo) => (
                    <button
                      key={levelInfo.level}
                      onClick={() => handleLevelClick(levelInfo.level)}
                      className={`p-2 rounded text-xs font-bold transition-all duration-200 ${
                        user.level === levelInfo.level
                          ? `${levelInfo.color} text-white shadow-md`
                          : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                      title={`Level ${levelInfo.level}: ${levelInfo.title}`}
                    >
                      {levelInfo.level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 보조 학습 섹션 */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-t-lg">
              <h2 className="text-lg font-bold">보조 학습</h2>
              <p className="text-sm opacity-90">추가 기능 및 도구</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => navigate('/scenario')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                🎭 시나리오 대화
              </button>
              
              <button
                onClick={() => alert('준비중입니다.')}
                className="w-full relative bg-gray-400 text-white font-medium py-3 px-4 rounded-lg cursor-not-allowed"
                disabled
              >
                📋 학습 계획
                <span className="absolute top-1 right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">준비중</span>
              </button>
              
              <button
                onClick={() => alert('준비중입니다.')}
                className="w-full relative bg-gray-400 text-white font-medium py-3 px-4 rounded-lg cursor-not-allowed"
                disabled
              >
                📄 성과 분석
                <span className="absolute top-1 right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">준비중</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-tile 통계 미리보기 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{user.level}</div>
            <div className="text-sm opacity-90">현재 레벨</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{user.stage}</div>
            <div className="text-sm opacity-90">현재 스테이지</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{getProgressPercentage()}%</div>
            <div className="text-sm opacity-90">전체 진도</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{learningMode === 'writing' ? '✍️' : '🎤'}</div>
            <div className="text-sm opacity-90">{learningMode === 'writing' ? 'Writing' : 'Speaking'} 모드</div>
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

        {/* Stage Selection Modal */}
        <StageSelectionModal availableLevels={availableLevels} />
      </div>
    </div>
  );
};