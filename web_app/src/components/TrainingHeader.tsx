/**
 * TrainingHeader - 훈련 헤더 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpeakingStage } from '@/store/useAppStore';

interface TrainingHeaderProps {
  levelNumber: number;
  phaseNumber: number;
  stageNumber: number;
  currentIndex: number;
  totalQuestions: number;
}

export const TrainingHeader: React.FC<TrainingHeaderProps> = ({
  levelNumber,
  phaseNumber,
  stageNumber,
  currentIndex,
  totalQuestions
}) => {
  const navigate = useNavigate();
  const { stage: speakingStage } = useSpeakingStage();

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                패턴 훈련 (Level {levelNumber} - Phase {phaseNumber} - Stage {stageNumber})
              </h1>
              {/* 3단계 표시 배지 */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  speakingStage === 1
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : speakingStage === 2
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}
              >
                {speakingStage}단계 ({speakingStage === 1 ? '3초' : speakingStage === 2 ? '2초' : '1초'} 응답)
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              문제 {currentIndex + 1} / {totalQuestions}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            대시보드로
          </button>
        </div>
      </div>
    </div>
  );
};