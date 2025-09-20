import React, { useState, useEffect } from 'react';
import { useStageSelection, useUser, useSpeakingStage, useStageProgress } from '@/store/useAppStore';
import { STAGE_CONFIG } from '@/config/stageConfig';
import { StageMetadataService, StageMetadata } from '@/services/stageMetadataService';
import { NavigationService, LevelInfo } from '@/services/navigationService';
import { StageGrid } from '@/components/ui/StageGrid';
import { StageInfoPanel } from '@/components/ui/StageInfoPanel';
import {
  isSpeakingStageUnlocked,
  getLockMessage,
  getUnlockMessage
} from '@/utils/stageUnlockUtils';

interface StageSelectionModalProps {
  availableLevels: LevelInfo[];
}

export const StageSelectionModal: React.FC<StageSelectionModalProps> = ({
  availableLevels,
}) => {
  const { stageSelection, setStageModalOpen, selectLevelAndStage } = useStageSelection();
  const { selectedLevel, isStageModalOpen } = stageSelection;
  const { stage: speakingStage, setSpeakingStage } = useSpeakingStage();
  const { getStageProgress } = useStageProgress();
  const user = useUser();
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);
  const [stageMetadata, setStageMetadata] = useState<StageMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 현재 선택된 스테이지의 진행률 가져오기
  const currentStageProgress = selectedStageNum
    ? getStageProgress(selectedLevel || 1, selectedStageNum)
    : [false, false, false];

  const levelInfo = availableLevels.find(l => l.level === selectedLevel);

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

  if (!isStageModalOpen || !selectedLevel) return null;

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
      <div className={`bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl shadow-2xl ${maxWidth} w-full ${maxHeight} overflow-y-auto transition-colors duration-300`}>
        
        {/* Header - 스피킹 화면 스타일의 깔끔함 + 홈화면의 통통튀는 느낌 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 border-b border-blue-200 dark:border-gray-600 p-6 rounded-t-xl shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Level {selectedLevel}</h2>
              <h3 className="text-lg text-gray-600 dark:text-gray-300">{levelInfo?.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{levelInfo?.description}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-3xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-gray-900 transition-colors duration-300">
          {/* 제목 - 스피킹 화면의 깔끔한 스타일 */}
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              스테이지를 선택하세요
            </h4>
            <p className="text-gray-600 dark:text-gray-300">총 {levelInfo?.stages}개 스테이지로 구성되어 있습니다</p>
          </div>

          {/* 3단계 선택 버튼 */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h5 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">학습 단계 선택</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">속도에 따라 단계를 선택하세요</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {/* 1단계 - 항상 잠금 해제 */}
              <button
                onClick={() => setSpeakingStage(1)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  speakingStage === 1
                    ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  1단계
                  {currentStageProgress[0] && <span className="text-green-500 ml-1">✓</span>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">3초 응답 (연습)</div>
              </button>

              {/* 2단계 - 1단계 완료 시 잠금 해제 */}
              <button
                onClick={() => {
                  if (isSpeakingStageUnlocked(2, currentStageProgress)) {
                    setSpeakingStage(2);
                  } else {
                    alert(getLockMessage(2));
                  }
                }}
                disabled={!isSpeakingStageUnlocked(2, currentStageProgress)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 relative ${
                  !isSpeakingStageUnlocked(2, currentStageProgress)
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : speakingStage === 2
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  2단계
                  {!isSpeakingStageUnlocked(2, currentStageProgress) && <span className="text-red-500 ml-1">🔒</span>}
                  {currentStageProgress[1] && <span className="text-blue-500 ml-1">✓</span>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">2초 응답 (연습)</div>
              </button>

              {/* 3단계 - 2단계 완료 시 잠금 해제 */}
              <button
                onClick={() => {
                  if (isSpeakingStageUnlocked(3, currentStageProgress)) {
                    setSpeakingStage(3);
                  } else {
                    alert(getLockMessage(3));
                  }
                }}
                disabled={!isSpeakingStageUnlocked(3, currentStageProgress)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 relative ${
                  !isSpeakingStageUnlocked(3, currentStageProgress)
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : speakingStage === 3
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  3단계
                  {!isSpeakingStageUnlocked(3, currentStageProgress) && <span className="text-red-500 ml-1">🔒</span>}
                  {currentStageProgress[2] && <span className="text-purple-500 ml-1">✓</span>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">1초 응답 (실전)</div>
              </button>
            </div>
            
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                현재 선택: <span className="font-semibold text-gray-700 dark:text-gray-300">{speakingStage}단계 ({speakingStage === 1 ? '3초' : speakingStage === 2 ? '2초' : '1초'} 응답)</span>
              </p>
            </div>
          </div>
          
          {/* 모듈화된 스테이지 그리드 */}
          <StageGrid
            stages={levelInfo?.stages || 0}
            currentLevel={selectedLevel}
            currentStage={user.stage}
            selectedStage={selectedStageNum}
            onStageHover={handleStageHover}
            onStageLeave={handleStageLeave}
            onStageSelect={handleStageSelect}
            getStageProgress={getStageProgress}
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