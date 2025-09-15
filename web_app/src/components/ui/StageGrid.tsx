/**
 * Stage Grid Component - UI 컴포넌트 모듈화
 */

import React from 'react';
import { STAGE_CONFIG } from '@/config/stageConfig';

export interface StageGridProps {
  stages: number;
  currentLevel: number;
  currentStage: number | string;
  selectedStage: number | null;
  onStageHover: (stage: number) => void;
  onStageLeave: () => void;
  onStageSelect: (stage: number) => void;
}

export const StageGrid: React.FC<StageGridProps> = ({
  stages,
  currentLevel,
  currentStage,
  selectedStage,
  onStageHover,
  onStageLeave,
  onStageSelect,
}) => {
  const stageNumbers = Array.from({ length: stages }, (_, i) => i + 1);
  const { columns: _columns, gap: _gap } = STAGE_CONFIG.gridLayout;
  const { width: _width, height: _height } = STAGE_CONFIG.buttonSizes.stage;

  return (
    <div className="grid grid-cols-8 gap-4 mb-8 justify-items-center">
      {stageNumbers.map((stageNum) => {
        const isCurrentStage = currentLevel === currentLevel && Number(currentStage) === stageNum;
        const isCompleted = false; // TODO: 완료 상태 로직
        
        return (
          <button
            key={stageNum}
            onClick={() => onStageSelect(stageNum)}
            onMouseEnter={() => onStageHover(stageNum)}
            onMouseLeave={onStageLeave}
            className={`group relative w-16 h-16 rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:scale-110 ${
              isCurrentStage
                ? 'bg-blue-600 text-white shadow-lg animate-pulse transform scale-105'
                : isCompleted
                ? 'bg-green-500 text-white shadow-md'
                : selectedStage === stageNum
                ? 'bg-blue-100 border-2 border-blue-500 text-blue-700 transform scale-105 shadow-md'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
            }`}
            title={isCompleted ? `완료됨 - Stage ${stageNum}` : `Stage ${stageNum} 시작하기`}
          >
            <span className="relative z-10">{stageNum}</span>
            {/* 호버시 통통튀는 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        );
      })}
    </div>
  );
};