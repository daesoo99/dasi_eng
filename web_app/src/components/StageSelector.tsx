import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { stageFocusService } from '@/services/stageFocusMode';

interface StageSelectorProps {
  level: number;
  onStageSelect: (stage: number) => void;
  onClose: () => void;
}

interface StageInfo {
  stage: number;
  title: string;
  difficulty: string;
  questionCount: number;
  completed: boolean;
  lastPracticed?: Date;
}

export const StageSelector: React.FC<StageSelectorProps> = memo(({
  level,
  onStageSelect,
  onClose
}) => {
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  useEffect(() => {
    loadStages();
  }, [level, loadStages]);

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await stageFocusService.getAvailableStages(level);
      setStages(response.stages);
    } catch (error) {
      console.error('스테이지 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [level]);

  const handleStageClick = useCallback((stage: number) => {
    setSelectedStage(stage);
  }, []);

  const handleStartPractice = useCallback(() => {
    if (selectedStage) {
      onStageSelect(selectedStage);
    }
  }, [selectedStage, onStageSelect]);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const formatLastPracticed = useCallback((date?: Date) => {
    if (!date) return '미학습';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '1일 전';
    if (diffDays <= 7) return `${diffDays}일 전`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-600">스테이지를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎯 Stage 집중 모드</h2>
              <p className="text-blue-100">Level {level} - 원하는 스테이지를 선택하세요</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 스테이지 목록 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((stage) => (
              <div
                key={stage.stage}
                onClick={() => handleStageClick(stage.stage)}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                  selectedStage === stage.stage
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* 스테이지 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800">
                      Stage {stage.stage}
                    </span>
                    {stage.completed && (
                      <span className="text-green-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(stage.difficulty)}`}>
                    {stage.difficulty}
                  </span>
                </div>

                {/* 스테이지 정보 */}
                <h3 className="font-medium text-gray-900 mb-2 text-sm">
                  {stage.title}
                </h3>

                {/* 상태 정보 */}
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>문장 수:</span>
                    <span className="font-medium">{stage.questionCount}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span>마지막 학습:</span>
                    <span className="font-medium">{formatLastPracticed(stage.lastPracticed)}</span>
                  </div>
                </div>

                {/* 선택 표시 */}
                {selectedStage === stage.stage && (
                  <div className="mt-3 text-center">
                    <span className="text-blue-600 font-medium text-sm">✓ 선택됨</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            취소
          </button>
          
          <div className="flex gap-3">
            <div className="text-sm text-gray-600 flex items-center">
              {selectedStage ? (
                <>
                  <span className="text-blue-600 font-medium">Stage {selectedStage}</span>
                  <span className="ml-2">선택됨</span>
                </>
              ) : (
                '스테이지를 선택해주세요'
              )}
            </div>
            
            <button
              onClick={handleStartPractice}
              disabled={!selectedStage}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              집중 연습 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});