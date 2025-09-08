import React, { useState, useEffect } from 'react';
import { useStageSelection, useUser, useSpeakingStage } from '@/store/useAppStore';
import { STAGE_CONFIG } from '@/config/stageConfig';
import { StageMetadataService, StageMetadata } from '@/services/stageMetadataService';
import { NavigationService, LevelInfo } from '@/services/navigationService';
import { StageGrid } from '@/components/ui/StageGrid';
import { StageInfoPanel } from '@/components/ui/StageInfoPanel';

interface StageSelectionModalProps {
  availableLevels: LevelInfo[];
}

export const StageSelectionModal: React.FC<StageSelectionModalProps> = ({
  availableLevels,
}) => {
  const { stageSelection, setStageModalOpen, selectLevelAndStage } = useStageSelection();
  const { selectedLevel, isStageModalOpen } = stageSelection;
  const { stage: speakingStage, setSpeakingStage } = useSpeakingStage();
  const user = useUser();
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);
  const [stageMetadata, setStageMetadata] = useState<StageMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isStageModalOpen || !selectedLevel) return null;

  const levelInfo = availableLevels.find(l => l.level === selectedLevel);
  if (!levelInfo) return null;

  // 개선된 메타데이터 로딩 - 서비스 사용
  useEffect(() => {
    async function loadStageMetadata(level: number, stage: number) {
      setIsLoading(true);
      try {
        const metadata = await StageMetadataService.loadMetadata(level, stage);
        setStageMetadata(metadata);
      } catch (error) {
        console.error('Failed to load stage metadata:', error);
        setStageMetadata(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (selectedStageNum && selectedLevel) {
      loadStageMetadata(selectedLevel, selectedStageNum);
    } else {
      setStageMetadata(null);
      setIsLoading(false);
    }
  }, [selectedStageNum, selectedLevel]);

  const handleStageHover = (stage: number) => {
    setSelectedStageNum(stage);
  };

  const handleStageLeave = () => {
    setSelectedStageNum(null);
    setStageMetadata(null);
  };

  const handleStageSelect = (stage: number | 'ALL') => {
    selectLevelAndStage(selectedLevel, stage);
    
    // 개선된 네비게이션 - 서비스 사용
    NavigationService.navigateToPatternTraining(
      {
        level: selectedLevel,
        stage,
        targetAccuracy: 80,
        developerMode: false
      },
      levelInfo
    );
  };

  const handleClose = () => {
    setStageModalOpen(false);
  };

  const { maxWidth, maxHeight } = STAGE_CONFIG.modalSize;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* 개선된 모달 - 설정 기반 크기 */}
      <div className={`bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-2xl ${maxWidth} w-full ${maxHeight} overflow-y-auto`}>
        
        {/* Header - 스피킹 화면 스타일의 깔끔함 + 홈화면의 통통튀는 느낌 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 p-6 rounded-t-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Level {selectedLevel}</h2>
              <h3 className="text-lg text-gray-600">{levelInfo.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{levelInfo.description}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* 제목 - 스피킹 화면의 깔끔한 스타일 */}
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-gray-800 mb-2">
              스테이지를 선택하세요
            </h4>
            <p className="text-gray-600">총 {levelInfo.stages}개 스테이지로 구성되어 있습니다</p>
          </div>

          {/* 3단계 선택 버튼 */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h5 className="text-lg font-semibold text-gray-700 mb-2">학습 단계 선택</h5>
              <p className="text-sm text-gray-500">속도에 따라 단계를 선택하세요</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <button
                onClick={() => setSpeakingStage(1)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  speakingStage === 1
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <div className="text-lg font-bold mb-1">1단계</div>
                <div className="text-xs text-gray-600">3초 응답</div>
              </button>
              
              <button
                onClick={() => setSpeakingStage(2)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  speakingStage === 2
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-lg font-bold mb-1">2단계</div>
                <div className="text-xs text-gray-600">2초 응답</div>
              </button>
              
              <button
                onClick={() => setSpeakingStage(3)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  speakingStage === 3
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <div className="text-lg font-bold mb-1">3단계</div>
                <div className="text-xs text-gray-600">1초 응답</div>
              </button>
            </div>
            
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500">
                현재 선택: <span className="font-semibold text-gray-700">{speakingStage}단계 ({speakingStage === 1 ? '3초' : speakingStage === 2 ? '2초' : '1초'} 응답)</span>
              </p>
            </div>
          </div>
          
          {/* 모듈화된 스테이지 그리드 */}
          <StageGrid
            stages={levelInfo.stages}
            currentLevel={selectedLevel}
            currentStage={user.stage}
            selectedStage={selectedStageNum}
            onStageHover={handleStageHover}
            onStageLeave={handleStageLeave}
            onStageSelect={handleStageSelect}
          />

          {/* ALL Button - 설정 기반 크기 */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => handleStageSelect('ALL')}
              className={`group relative w-20 h-20 rounded-xl font-bold text-base transition-all duration-300 hover:shadow-xl hover:-translate-y-3 hover:scale-110 ${
                user.level === selectedLevel && user.stage === 'ALL'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md'
              }`}
              title="레벨 전체 스테이지 통합 훈련"
            >
              <span className="relative z-10">ALL</span>
              <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
          
          {/* 모듈화된 정보 패널 */}
          <StageInfoPanel
            selectedStage={selectedStageNum}
            metadata={stageMetadata}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};