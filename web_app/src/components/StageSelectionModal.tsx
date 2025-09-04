import React, { useState, useEffect } from 'react';
import { useStageSelection, useUser } from '@/store/useAppStore';

interface StageSelectionModalProps {
  availableLevels: Array<{
    level: number;
    title: string;
    description: string;
    stages: number;
    completed: boolean;
    color: string;
  }>;
}

interface StageMetadata {
  stage_id: string;
  title: string;
  description: string;
  grammar_pattern: string;
  examples: string[];
  learning_points: string;
  phase: number;
}

export const StageSelectionModal: React.FC<StageSelectionModalProps> = ({
  availableLevels,
}) => {
  const { stageSelection, setStageModalOpen, selectLevelAndStage } = useStageSelection();
  const { selectedLevel, isStageModalOpen } = stageSelection;
  const user = useUser();
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);
  const [stageMetadata, setStageMetadata] = useState<StageMetadata | null>(null);

  if (!isStageModalOpen || !selectedLevel) return null;

  const levelInfo = availableLevels.find(l => l.level === selectedLevel);
  if (!levelInfo) return null;

  // Dynamic stage metadata loading
  useEffect(() => {
    async function loadStageMetadata(level: number, stage: number) {
      try {
        const phaseNumber = Math.ceil(stage / 4);
        const stageId = `Lv${level}-P${phaseNumber}-S${stage.toString().padStart(2, '0')}`;
        const bankFilePath = `/patterns/banks/level_${level}/${stageId}_bank.json`;
        
        const response = await fetch(bankFilePath);
        if (!response.ok) {
          throw new Error(`Failed to load stage metadata: ${response.status}`);
        }
        
        const bankData = await response.json();
        setStageMetadata({
          stage_id: bankData.stage_id,
          title: bankData.title,
          description: bankData.description,
          grammar_pattern: bankData.grammar_pattern,
          examples: bankData.examples || [],
          learning_points: bankData.learning_points,
          phase: bankData.phase
        });
      } catch (error) {
        console.error('Failed to load stage metadata:', error);
        setStageMetadata(null);
      }
    }

    if (selectedStageNum && selectedLevel) {
      loadStageMetadata(selectedLevel, selectedStageNum);
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

    // Navigate to pattern training with proper URL parameters to match original HTML behavior
    const params = new URLSearchParams();
    params.set('level', selectedLevel.toString());
    params.set('stage', stage.toString());
    params.set('verbs', verbsByLevel[selectedLevel] || levelInfo.title);
    params.set('targetAccuracy', '80'); // Default target accuracy
    params.set('developerMode', 'false');
    
    window.location.href = `/pattern-training?${params.toString()}`;
  };

  const handleClose = () => {
    setStageModalOpen(false);
  };

  // 스테이지 번호 배열 생성 (1부터 N까지)
  const stageNumbers = Array.from({ length: levelInfo.stages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className={`${levelInfo.color} text-white p-6 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Level {selectedLevel}</h2>
              <h3 className="text-lg">{levelInfo.title}</h3>
              <p className="text-sm opacity-90 mt-1">{levelInfo.description}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stage Selection - ver2 스타일 일치 */}
        <div className="p-6">
          <h4 className="font-semibold text-gray-800 mb-4">
            스테이지를 선택하세요 ({levelInfo.stages}개 스테이지)
          </h4>
          
          {/* Stage Grid - ver2처럼 10열 원형 버튼 */}
          <div className="grid grid-cols-10 gap-2 mb-4 p-4 bg-gray-50 rounded-lg justify-items-center">
            {stageNumbers.map((stageNum) => {
              const isCurrentStage = user.level === selectedLevel && user.stage === stageNum;
              const isCompleted = false; // TODO: 완료 상태 로직
              
              return (
                <button
                  key={stageNum}
                  onClick={() => handleStageSelect(stageNum)}
                  onMouseEnter={() => handleStageHover(stageNum)}
                  onMouseLeave={handleStageLeave}
                  className={`w-12 h-12 rounded-full font-bold text-sm transition-all duration-200 hover:shadow-md ${
                    isCurrentStage
                      ? 'bg-blue-500 text-white shadow-lg animate-pulse'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : selectedStageNum === stageNum
                      ? 'bg-blue-100 border-2 border-blue-400 text-blue-700 transform scale-110'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  title={isCompleted ? `완료됨 - Stage ${stageNum}` : `Stage ${stageNum} 시작하기`}
                >
                  {stageNum}
                </button>
              );
            })}
          </div>

          {/* ALL Button - ver2 스타일 일치 */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => handleStageSelect('ALL')}
              className={`w-16 h-16 rounded-full font-bold text-sm transition-all duration-200 hover:shadow-md ${
                user.level === selectedLevel && user.stage === 'ALL'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg transform scale-110 border-2 border-yellow-400'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:transform hover:scale-105'
              }`}
              title="레벨 전체 동사 통합 훈련"
            >
              ALL
            </button>
          </div>
          
          {/* Dynamic Stage Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            {selectedStageNum && stageMetadata ? (
              <div className="animate-fadeIn">
                <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                  🎯 Stage {selectedStageNum}: {stageMetadata.title}
                </h5>
                <p className="text-sm text-blue-700 mb-3">
                  <strong>패턴:</strong> {stageMetadata.grammar_pattern}
                </p>
                <p className="text-sm text-blue-600 mb-3 leading-relaxed">
                  {stageMetadata.description}
                </p>
                {stageMetadata.examples.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-blue-800 font-medium mb-1">📝 예문:</p>
                    <div className="text-xs text-blue-600 space-y-1">
                      {stageMetadata.examples.slice(0, 2).map((example, idx) => (
                        <div key={idx} className="bg-white px-2 py-1 rounded text-gray-700">
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-blue-600">
                  <strong>학습 포인트:</strong> {stageMetadata.learning_points}
                </div>
              </div>
            ) : selectedStageNum ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-blue-600">Stage {selectedStageNum} 정보 로딩중...</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-2">스테이지를 선택하면 상세 정보가 표시됩니다</p>
                <div className="text-xs text-gray-400">
                  🎯 실제 학습 패턴과 예문 확인<br/>
                  📚 각 단계별 맞춤 설명 제공
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};