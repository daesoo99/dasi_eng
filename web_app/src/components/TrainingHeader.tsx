/**
 * TrainingHeader - 훈련 헤더 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div className="bg-white shadow-sm border-b sticky top-16 z-40">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              패턴 훈련 (Level {levelNumber} - Phase {phaseNumber} - Stage {stageNumber})
            </h1>
            <p className="text-sm text-gray-600 mt-1">
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