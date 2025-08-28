import React from 'react';
import { useAudioFlowController, type FlowState } from '@/hooks/useAudioFlowController';

interface AutoSpeakingFlowV2Props {
  currentCard: any;
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  isActive: boolean;
  recordingDuration?: number;
}

export const AutoSpeakingFlowV2: React.FC<AutoSpeakingFlowV2Props> = ({
  currentCard,
  onSpeechResult,
  onTimeout,
  isActive,
  recordingDuration = 10
}) => {
  const controller = useAudioFlowController({
    onSpeechResult,
    onTimeout,
    recordingDuration
  });

  // 카드 변경 시 자동 시작
  React.useEffect(() => {
    if (currentCard && isActive && controller.flowState === 'idle') {
      const koreanText = currentCard.front_ko || currentCard.kr || '문제를 확인해주세요';
      controller.startFlow(koreanText);
    }
  }, [currentCard?.id || currentCard?.kr, isActive, controller.flowState, controller.startFlow]);

  const getStatusMessage = (): string => {
    switch (controller.flowState) {
      case 'tts':
        return controller.isPaused ? '⏸️ 음성 재생 일시정지됨' : '🔊 문제를 들려드리고 있습니다...';
      case 'beep':
        return '🔔 곧 녹음이 시작됩니다...';
      case 'recording':
        const remainingSeconds = Math.ceil(controller.remainingTime);
        return controller.isPaused 
          ? `⏸️ 녹음 일시정지됨 (남은 시간: ${remainingSeconds}초)`
          : `🎤 말씀해 주세요... (남은 시간: ${remainingSeconds}초)`;
      case 'processing':
        return '🤖 답변을 분석 중입니다...';
      case 'timeout':
        return '⏰ 시간 초과 - 정답을 들려드립니다...';
      default:
        return '';
    }
  };

  const getProgressWidth = (): string => {
    if (controller.flowState === 'recording') {
      const elapsed = recordingDuration - controller.remainingTime;
      return `${Math.min((elapsed / recordingDuration) * 100, 100)}%`;
    }
    return '0%';
  };

  const getStatusColor = (): string => {
    if (controller.isPaused) return 'bg-yellow-500';
    
    switch (controller.flowState) {
      case 'tts': return 'bg-green-500 animate-pulse';
      case 'beep': return 'bg-yellow-500 animate-pulse';
      case 'recording': return 'bg-red-500 animate-pulse';
      case 'processing': return 'bg-blue-500';
      case 'timeout': return 'bg-orange-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  const canPause = (): boolean => {
    return ['tts', 'beep', 'recording'].includes(controller.flowState) && !controller.isPaused;
  };

  const canResume = (): boolean => {
    return ['tts', 'recording'].includes(controller.flowState) && controller.isPaused;
  };

  const canStop = (): boolean => {
    return !['idle', 'processing'].includes(controller.flowState);
  };

  if (!isActive || controller.flowState === 'idle') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="text-center">
        {/* 상태 메시지 */}
        <div className="text-lg font-semibold text-blue-800 mb-4">
          {getStatusMessage()}
        </div>

        {/* 녹음 진행 바 */}
        {controller.flowState === 'recording' && (
          <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-100"
              style={{ width: getProgressWidth() }}
            />
          </div>
        )}

        {/* 상태 표시기 */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm text-blue-700">
            {controller.flowState === 'recording' 
              ? `음성을 인식하고 있습니다... (${Math.ceil(controller.remainingTime)}초 남음)`
              : getStatusMessage()
            }
          </span>
        </div>

        {/* 제어 버튼들 */}
        <div className="flex justify-center space-x-3">
          {canPause() && (
            <button
              onClick={controller.pauseFlow}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              aria-label="일시정지"
            >
              ⏸️ 일시정지
            </button>
          )}
          
          {canResume() && (
            <button
              onClick={controller.resumeFlow}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              aria-label="재개"
            >
              ▶️ 재개
            </button>
          )}
          
          {canStop() && (
            <button
              onClick={controller.stopFlow}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              aria-label="중지"
            >
              ⏹️ 중지
            </button>
          )}
          
          {/* 정답 듣기 버튼 (녹음/처리 중이 아닐 때) */}
          {currentCard?.target_en && !['recording', 'processing'].includes(controller.flowState) && (
            <button
              onClick={() => controller.playAnswerAndNext(currentCard.target_en)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              aria-label="정답 듣기"
            >
              🔊 정답 듣기
            </button>
          )}
        </div>

        {/* 접근성을 위한 상태 안내 */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {getStatusMessage()}
          {controller.flowState === 'recording' && 
            `, 남은 시간 ${Math.ceil(controller.remainingTime)}초`
          }
        </div>
      </div>
    </div>
  );
};