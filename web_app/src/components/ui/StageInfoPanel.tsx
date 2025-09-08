/**
 * Stage Info Panel Component - 정보 표시 컴포넌트 모듈화
 */

import React from 'react';
import { StageMetadata } from '@/services/stageMetadataService';

export interface StageInfoPanelProps {
  selectedStage: number | null;
  metadata: StageMetadata | null;
  isLoading?: boolean;
}

export const StageInfoPanel: React.FC<StageInfoPanelProps> = ({
  selectedStage,
  metadata,
  isLoading = false,
}) => {
  if (selectedStage && metadata) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-fadeIn">
          <div className="text-center mb-4">
            <h5 className="text-xl font-bold text-gray-800 mb-2">
              🎯 Stage {selectedStage}: {metadata.title}
            </h5>
            <p className="text-blue-600 font-medium">
              {metadata.grammar_pattern}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {metadata.description}
              </p>
            </div>
            
            {metadata.examples.length > 0 && (
              <div>
                <h6 className="font-medium text-gray-800 mb-2">📝 예문:</h6>
                <div className="grid gap-2">
                  {metadata.examples.slice(0, 2).map((example, idx) => (
                    <div key={idx} className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h6 className="font-medium text-gray-800 mb-1">💡 학습 포인트:</h6>
              <p className="text-gray-700">{metadata.learning_points}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedStage && isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Stage {selectedStage} 정보 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h6 className="text-lg font-medium text-gray-800 mb-2">스테이지를 선택해주세요</h6>
        <p className="text-gray-600 mb-4">상세한 학습 정보를 확인할 수 있습니다</p>
        <div className="flex justify-center space-x-8 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <span>🎯</span>
            <span>학습 패턴</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>📝</span>
            <span>예문 확인</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>💡</span>
            <span>학습 포인트</span>
          </div>
        </div>
      </div>
    </div>
  );
};