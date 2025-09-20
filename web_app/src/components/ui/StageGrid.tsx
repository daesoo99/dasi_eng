/**
 * Stage Grid Component - UI 컴포넌트 모듈화
 */

import React from 'react';
import { STAGE_CONFIG } from '@/config/stageConfig';
import { calculateStageCompletionRatio, isStageFullyCompleted } from '@/utils/stageUnlockUtils';

export interface StageGridProps {
  stages: number;
  currentLevel: number;
  currentStage: number | string;
  selectedStage: number | null;
  onStageHover: (stage: number) => void;
  onStageLeave: () => void;
  onStageSelect: (stage: number) => void;
  getStageProgress?: (level: number, stage: number) => boolean[];
}

export const StageGrid: React.FC<StageGridProps> = ({
  stages,
  currentLevel,
  currentStage,
  selectedStage,
  onStageHover,
  onStageLeave,
  onStageSelect,
  getStageProgress,
}) => {
  const stageNumbers = Array.from({ length: stages }, (_, i) => i + 1);
  const { columns: _columns, gap: _gap } = STAGE_CONFIG.gridLayout;
  const { width: _width, height: _height } = STAGE_CONFIG.buttonSizes.stage;

  return (
    <div className="grid grid-cols-8 gap-4 mb-8 justify-items-center">
      {stageNumbers.map((stageNum) => {
        const isCurrentStage = currentLevel === currentLevel && Number(currentStage) === stageNum;

        // 진행률 정보 가져오기
        const stageProgress = getStageProgress ? getStageProgress(currentLevel, stageNum) : [false, false, false];
        const isCompleted = isStageFullyCompleted(stageProgress);
        const completionRatio = calculateStageCompletionRatio(stageProgress);
        const hasProgress = stageProgress.some(Boolean);

        return (
          <div key={stageNum} className="flex flex-col items-center">
            <button
              onClick={() => onStageSelect(stageNum)}
              onMouseEnter={() => onStageHover(stageNum)}
              onMouseLeave={onStageLeave}
              className={`group relative w-16 h-16 rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:scale-110 ${
                isCurrentStage
                  ? 'bg-blue-600 text-white shadow-lg animate-pulse transform scale-105'
                  : isCompleted
                  ? 'bg-green-500 text-white shadow-md'
                  : hasProgress
                  ? 'bg-yellow-400 text-white shadow-md'
                  : selectedStage === stageNum
                  ? 'bg-blue-100 border-2 border-blue-500 text-blue-700 transform scale-105 shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
              }`}
              title={
                isCompleted
                  ? `완료됨 - Stage ${stageNum} (${completionRatio})`
                  : hasProgress
                  ? `진행 중 - Stage ${stageNum} (${completionRatio})`
                  : `Stage ${stageNum} 시작하기`
              }
            >
              <span className="relative z-10">{stageNum}</span>
              {/* 완료 표시 */}
              {isCompleted && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                  <span className="text-green-500 text-xs">✓</span>
                </div>
              )}
              {/* 호버시 통통튀는 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>

            {/* 진행률 표시 */}
            <div className="mt-1 text-xs font-semibold">
              {hasProgress ? (
                <span className={`${isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                  {completionRatio}
                </span>
              ) : (
                <span className="text-gray-400">0/3</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};