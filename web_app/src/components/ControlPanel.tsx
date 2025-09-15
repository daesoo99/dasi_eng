/**
 * ControlPanel - 훈련 컨트롤 패널 컴포넌트
 */

import React from 'react';

type Phase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting';

interface ControlPanelProps {
  isTraining: boolean;
  isPaused: boolean;
  currentPhase: Phase;
  hasQuestions: boolean;
  currentIndex: number;
  totalQuestions: number;
  onStartTraining: () => void;
  onPauseTraining: () => void;
  onResumeTraining: () => void;
  onStopTraining: () => void;
  onLoadData: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isTraining,
  isPaused,
  currentPhase,
  hasQuestions,
  currentIndex,
  totalQuestions,
  onStartTraining,
  onPauseTraining,
  onResumeTraining,
  onStopTraining,
  onLoadData
}) => {
  const getPhaseText = () => {
    switch (currentPhase) {
      case 'tts': return 'TTS 재생 중';
      case 'countdown': return '카운트다운';
      case 'recognition': return '음성 인식 중';
      case 'waiting': return '처리 중';
      default: return '대기 중';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors duration-300">
      <div className="flex flex-col space-y-4">
        {/* 상태 표시 */}
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">현재 상태</div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isTraining 
              ? (isPaused ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300')
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isTraining
                ? (isPaused ? 'bg-yellow-400' : 'bg-green-400')
                : 'bg-gray-400'
            }`}></div>
            {isTraining ? (isPaused ? '일시정지' : getPhaseText()) : '대기 중'}
          </div>
        </div>

        {/* 진행률 바 */}
        {hasQuestions && (
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex flex-wrap gap-3 justify-center">
          {!hasQuestions ? (
            <button
              onClick={onLoadData}
              className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium"
            >
              데이터 로드
            </button>
          ) : !isTraining ? (
            <button
              onClick={onStartTraining}
              className="px-6 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors font-medium"
            >
              훈련 시작
            </button>
          ) : (
            <div className="flex gap-3">
              {!isPaused ? (
                <button
                  onClick={onPauseTraining}
                  className="px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded-lg hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors"
                >
                  일시정지
                </button>
              ) : (
                <button
                  onClick={onResumeTraining}
                  className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                >
                  재개
                </button>
              )}
              <button
                onClick={onStopTraining}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                중지
              </button>
            </div>
          )}
          
          {/* 데이터 새로고침 버튼 */}
          {hasQuestions && (
            <button
              onClick={onLoadData}
              disabled={isTraining && !isPaused}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isTraining && !isPaused
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              새로고침
            </button>
          )}
        </div>

        {/* 통계 정보 */}
        {hasQuestions && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{currentIndex + 1}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">현재 문제</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{totalQuestions}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">전체 문제</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">진행률</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};