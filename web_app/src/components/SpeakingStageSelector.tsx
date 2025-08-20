import React from 'react';

interface SpeakingStageSelectorProps {
  currentStage: 1 | 2 | 3;
  onStageChange: (stage: 1 | 2 | 3) => void;
  disabled?: boolean;
}

export const SpeakingStageSelector: React.FC<SpeakingStageSelectorProps> = ({
  currentStage,
  onStageChange,
  disabled = false,
}) => {
  const stages = [
    {
      stage: 1 as const,
      title: '1단계',
      subtitle: '순서대로 (3초)',
      description: '3초 사고시간 + 6초 음성인식',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      stage: 2 as const,
      title: '2단계', 
      subtitle: '조금 섞기 (2초)',
      description: '2초 사고시간 + 6초 음성인식',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
    },
    {
      stage: 3 as const,
      title: '3단계',
      subtitle: '완전 섞기 (1초)', 
      description: '1초 사고시간 + 6초 음성인식',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Speaking 단계 선택</h3>
      
      <div className="grid grid-cols-3 gap-4">
        {stages.map((stage) => {
          const isActive = currentStage === stage.stage;
          
          return (
            <button
              key={stage.stage}
              onClick={() => onStageChange(stage.stage)}
              disabled={disabled}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                isActive
                  ? `${stage.color} text-white border-transparent shadow-lg scale-105`
                  : `bg-gray-50 text-gray-700 border-gray-200 ${stage.hoverColor} hover:text-white hover:border-transparent hover:shadow-md ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'
                    }`
              }`}
            >
              <div className="font-bold text-lg mb-1">{stage.title}</div>
              <div className="text-sm mb-2">{stage.subtitle}</div>
              <div className="text-xs opacity-90">{stage.description}</div>
              
              {isActive && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-800">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">💡 단계별 특징</div>
          <ul className="text-xs space-y-1">
            <li><strong>1단계:</strong> 문제 순서대로, 충분한 사고시간</li>
            <li><strong>2단계:</strong> 약간 랜덤, 적당한 사고시간</li>
            <li><strong>3단계:</strong> 완전 랜덤, 즉석 반응 연습</li>
          </ul>
        </div>
      </div>
    </div>
  );
};