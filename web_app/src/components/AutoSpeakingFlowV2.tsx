import React, { useEffect, useMemo, useCallback } from 'react';
import { useAudioFlowController } from '@/hooks/useAudioFlowController';
import { pluginManager, getSpeechPlugin } from '@/plugins/PluginManager';
import { getServiceContainer } from '@/container/ServiceContainer';

interface AutoSpeakingFlowV2Props {
  currentCard: any;
  onSpeechResult: (transcript: string, confidence: number) => void;
  onTimeout?: () => void;
  isActive: boolean;
  recordingDuration?: number;
  // 의존성 주입을 위한 옵션 (테스트용)
  serviceContainer?: ReturnType<typeof getServiceContainer>;
  // 플러그인 시스템 사용 여부 (기본: true)
  usePluginSystem?: boolean;
}

export const AutoSpeakingFlowV2: React.FC<AutoSpeakingFlowV2Props> = React.memo(({
  currentCard,
  onSpeechResult,
  onTimeout,
  isActive,
  recordingDuration = 10,
  serviceContainer,
  usePluginSystem = true
}) => {
  // 플러그인 시스템 활용
  const speechPlugin = useMemo(() => {
    if (usePluginSystem) {
      try {
        return getSpeechPlugin();
      } catch (error) {
        console.warn('Speech plugin not available, falling back to default:', error);
        return null;
      }
    }
    return null;
  }, [usePluginSystem]);

  // 플러그인 매니저를 통한 기능 확장
  const enhancedFeatures = useMemo(() => {
    if (!usePluginSystem) return null;
    
    try {
      // 플러그인 매니저에서 고급 기능들 가져오기
      const analyticsPlugin = pluginManager.getPlugin('analytics');
      const speechEnhancer = pluginManager.getPlugin('speech-enhancer');
      
      return {
        analytics: analyticsPlugin?.isEnabled() ? analyticsPlugin : null,
        speechEnhancer: speechEnhancer?.isEnabled() ? speechEnhancer : null,
        hasAdvancedFeatures: Boolean(analyticsPlugin || speechEnhancer)
      };
    } catch (error) {
      console.warn('Plugin manager features not available:', error);
      return null;
    }
  }, [usePluginSystem]);

  const controller = useAudioFlowController({
    onSpeechResult,
    onTimeout,
    recordingDuration,
    serviceContainer,
    speechPlugin
  });

  // 카드 식별자 메모이제이션
  const cardId = useMemo(() => 
    currentCard?.id || currentCard?.kr, 
    [currentCard?.id, currentCard?.kr]
  );

  // 카드 텍스트 메모이제이션
  const koreanText = useMemo(() => 
    currentCard ? (currentCard.front_ko || currentCard.kr || '문제를 확인해주세요') : '',
    [currentCard]
  );

  // 카드 변경 시 자동 시작
  useEffect(() => {
    if (currentCard && isActive && controller.flowState === 'idle' && koreanText) {
      controller.startFlow(koreanText);
      
      // 분석 플러그인이 있으면 이벤트 추적
      if (enhancedFeatures?.analytics) {
        enhancedFeatures.analytics.trackEvent('speech_flow_started', {
          cardId: cardId,
          hasKoreanText: Boolean(koreanText),
          recordingDuration
        });
      }
    }
  }, [cardId, isActive, currentCard, controller, koreanText, enhancedFeatures?.analytics, recordingDuration]);

  // 상태 머신에서 UI 정보 가져오기 - 메모이제이션
  const displayInfo = useMemo(() => {
    const baseInfo = controller.getDisplayInfo?.() || {
      message: '',
      progressPercent: 0,
      statusColor: 'bg-gray-500',
      icon: '⚪',
      canPause: false,
      canResume: false,
      canStop: false,
      showProgress: false,
    };

    // Speech enhancer 플러그인이 있으면 메시지 개선
    if (enhancedFeatures?.speechEnhancer) {
      const enhancedMessage = enhancedFeatures.speechEnhancer.enhanceStatusMessage?.(baseInfo.message, controller.flowState);
      if (enhancedMessage) {
        baseInfo.message = enhancedMessage;
      }
    }

    return baseInfo;
  }, [controller, enhancedFeatures?.speechEnhancer]);

  // 진행률 계산 메모이제이션
  const progressWidth = useMemo(() => {
    if (displayInfo.showProgress && displayInfo.progressPercent !== undefined) {
      return `${displayInfo.progressPercent}%`;
    }
    return '0%';
  }, [displayInfo.showProgress, displayInfo.progressPercent]);

  // 버튼 핸들러 메모이제이션
  const handlePlayAnswer = useCallback(() => {
    if (currentCard?.target_en) {
      controller.playAnswerAndNext(currentCard.target_en);
      
      // 분석 플러그인으로 정답 재생 추적
      if (enhancedFeatures?.analytics) {
        enhancedFeatures.analytics.trackEvent('answer_played', {
          cardId: cardId,
          answerText: currentCard.target_en,
          currentState: controller.flowState
        });
      }
    }
  }, [controller, currentCard?.target_en, enhancedFeatures?.analytics, cardId]);

  if (!isActive || controller.flowState === 'idle') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="text-center">
        {/* 상태 메시지 */}
        <div className="text-lg font-semibold text-blue-800 mb-4">
          {displayInfo.message}
        </div>

        {/* 녹음 진행 바 */}
        {displayInfo.showProgress && (
          <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-100"
              style={{ width: progressWidth }}
            />
          </div>
        )}

        {/* 상태 표시기 */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${displayInfo.statusColor}`}></div>
          <span className="text-sm text-blue-700">
            {displayInfo.message}
          </span>
        </div>

        {/* 제어 버튼들 */}
        <div className="flex justify-center space-x-3">
          {displayInfo.canPause && (
            <button
              onClick={controller.pauseFlow}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              aria-label="일시정지"
            >
              ⏸️ 일시정지
            </button>
          )}
          
          {displayInfo.canResume && (
            <button
              onClick={controller.resumeFlow}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              aria-label="재개"
            >
              ▶️ 재개
            </button>
          )}
          
          {displayInfo.canStop && (
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
              onClick={handlePlayAnswer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              aria-label="정답 듣기"
            >
              🔊 정답 듣기
            </button>
          )}
        </div>

        {/* 접근성을 위한 상태 안내 */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {displayInfo.message}
          {controller.flowState === 'recording' && 
            `, 남은 시간 ${Math.ceil(controller.remainingTime)}초`
          }
        </div>
      </div>
    </div>
  );
});