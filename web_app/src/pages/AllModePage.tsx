import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAppStore, useLearningMode } from '@/store/useAppStore';
// TODO: SRS migration completed - legacy imports cleaned up
import type { ReviewCard } from '@/services/srs/SRSEngine';
import { WritingModeInput } from '@/components/WritingModeInput';
import { WritingModeFeedback } from '@/components/WritingModeFeedback';
import { AutoSpeakingFlowV2 } from '@/components/AutoSpeakingFlowV2';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { useSpeech } from '@/hooks/useSpeech';
import { api } from '@/lib/api';
import { getServiceContainer } from '@/container/ServiceContainer';
import type { IScoreCalculationService } from '@/container/ServiceContainer';
import type { DrillCard, FeedbackResponse } from '@/types';
import type { WritingFeedback } from '@/services/writingMode';

export const AllModePage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const user = useUser();
  const learningMode = useLearningMode();
  const { setLoading, setError, clearError } = useAppStore();

  // SRS 관련 상태
  // const [reviewSession, setReviewSession] = useState<SRSReviewSession | null>(null);
  // const [currentSRSCard, setCurrentSRSCard] = useState<SRSCard | null>(null);
  const [reviewSession, setReviewSession] = useState<any | null>(null);
  const [currentSRSCard, setCurrentSRSCard] = useState<ReviewCard | null>(null);
  const [currentCardData, setCurrentCardData] = useState<DrillCard | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 피드백 상태
  const [speechFeedback, setSpeechFeedback] = useState<FeedbackResponse | null>(null);
  const [writingFeedback, setWritingFeedback] = useState<WritingFeedback | null>(null);

  // SRS 통계
  const [srsStats, setSrsStats] = useState({
    totalCards: 0,
    dueToday: 0,
    averageEaseFactor: 2.5,
    accuracyRate: 0,
    streakDays: 0
  });

  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // 서비스 컨테이너에서 의존성 주입
  const serviceContainer = getServiceContainer();
  const scoreCalculator: IScoreCalculationService = serviceContainer.getScoreCalculationService();
  
  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // SRS 통계 로드
  useEffect(() => {
    loadSRSStats();
  }, [user.id]);

  // 복습 세션 시작
  useEffect(() => {
    if (isSessionActive && reviewSession && reviewSession.reviewCards.length > 0) {
      loadCurrentCard();
    }
  }, [reviewSession, currentIndex, isSessionActive]);

  const loadSRSStats = async () => {
    if (!user.id) return;
    
    try {
      // const stats = await srsService.getSRSStats(user.id);
      // TODO: Migrate to new SRS Engine system
      setSrsStats(stats);
    } catch (error) {
      console.error('SRS 통계 로드 실패:', error);
    }
  };

  const loadCurrentCard = async () => {
    if (!reviewSession || currentIndex >= reviewSession.reviewCards.length) return;

    const srsCard = reviewSession.reviewCards[currentIndex];
    setCurrentSRSCard(srsCard);

    try {
      // 실제 카드 데이터 로드 (레벨/스테이지에서)
      const response = await api.getCards(srsCard.level, srsCard.stage);
      
      if (response.success && response.data) {
        // cardId로 특정 카드 찾기
        const foundCard = response.data.cards.find(card => card.id === srsCard.cardId);
        if (foundCard) {
          setCurrentCardData(foundCard);
          setCardStartTime(Date.now());
        } else {
          setError('카드를 찾을 수 없습니다');
        }
      } else {
        setError(response.error || '카드를 불러오는데 실패했습니다');
      }
    } catch (_error) {
      setError('네트워크 오류가 발생했습니다');
    }
  };

  const startReviewSession = async (mode: 'due' | 'random') => {
    if (!user.id) return;

    setLoading(true);
    clearError();

    try {
      let session: any; // TODO: Use new SRS Engine types
      
      if (mode === 'due') {
        // 복습이 필요한 카드들
        session = await srsService.startReviewSession(user.id, 20);
      } else {
        // 가중치 랜덤 선택
        const randomCards = await srsService.getWeightedRandomCards(user.id, 20);
        session = {
          sessionId: `random_${Date.now()}`,
          userId: user.id,
          reviewCards: randomCards,
          startTime: new Date(),
          totalCards: randomCards.length,
          completedCards: 0,
          accuracyRate: 0
        };
      }

      if (session.reviewCards.length === 0) {
        setError('복습할 카드가 없습니다');
        return;
      }

      setReviewSession(session);
      setCurrentIndex(0);
      setIsSessionActive(true);
    } catch (_error) {
      setError('세션 시작에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechResult = async (transcript: string, confidence: number) => {
    if (!currentCardData || !currentSRSCard) return;

    await processAnswer(transcript, confidence, true);
  };

  const handleWritingSubmit = async (userInput: string, feedback: WritingFeedback) => {
    if (!currentCardData || !currentSRSCard) return;

    setWritingFeedback(feedback);
    await processAnswer(userInput, feedback.score / 100, false, feedback);
  };

  const processAnswer = async (
    userAnswer: string, 
    confidence: number, 
    isSpeaking: boolean,
    writingFeedback?: WritingFeedback
  ) => {
    if (!validateAnswerProcessing()) return;

    const responseTime = calculateResponseTime();
    setLoading(true);

    try {
      const evaluationResult = await evaluateUserAnswer(userAnswer, isSpeaking, writingFeedback);
      
      if (evaluationResult) {
        await updateSRSRecord(evaluationResult, responseTime);
      }

    } catch (_error) {
      handleAnswerProcessingError();
    } finally {
      setLoading(false);
    }
  };

  /**
   * 답변 처리 전 검증
   */
  const validateAnswerProcessing = (): boolean => {
    return !!(currentCardData && currentSRSCard);
  };

  /**
   * 응답 시간 계산
   */
  const calculateResponseTime = (): number => {
    return (Date.now() - cardStartTime) / 1000;
  };

  /**
   * 사용자 답변 평가
   */
  const evaluateUserAnswer = async (
    userAnswer: string,
    isSpeaking: boolean,
    writingFeedback?: WritingFeedback
  ): Promise<{ isCorrect: boolean; score: number; confidence: number; responseTime: number } | null> => {
    let isCorrect = false;
    let score = 0;
    const responseTime = calculateResponseTime();

    if (isSpeaking) {
      const speakingResult = await evaluateSpeakingAnswer(userAnswer);
      if (!speakingResult) return null;
      
      isCorrect = speakingResult.isCorrect;
      score = speakingResult.score;
    } else {
      const writingResult = evaluateWritingAnswer(writingFeedback);
      isCorrect = writingResult.isCorrect;
      score = writingResult.score;
    }

    return { isCorrect, score, confidence: Math.max(0.6, score / 100), responseTime };
  };

  /**
   * 말하기 답변 평가
   */
  const evaluateSpeakingAnswer = async (userAnswer: string): Promise<{ isCorrect: boolean; score: number } | null> => {
    if (!currentCardData) return null;

    const feedbackResponse = await api.getFeedback({
      front_ko: currentCardData.front_ko,
      sttText: userAnswer,
      target_en: currentCardData.target_en,
    });

    if (feedbackResponse.success && feedbackResponse.data) {
      setSpeechFeedback(feedbackResponse.data);
      return {
        isCorrect: feedbackResponse.data.correct,
        score: feedbackResponse.data.score
      };
    }

    return null;
  };

  /**
   * 쓰기 답변 평가
   */
  const evaluateWritingAnswer = (writingFeedback?: WritingFeedback): { isCorrect: boolean; score: number } => {
    return {
      isCorrect: writingFeedback?.isCorrect || false,
      score: writingFeedback?.score || 0
    };
  };

  /**
   * SRS 레코드 업데이트
   */
  const updateSRSRecord = async (
    evaluationResult: { isCorrect: boolean; score: number; confidence: number; responseTime: number }
  ): Promise<void> => {
    if (!currentSRSCard) return;

    const qualityResult = calculateLearningQuality(evaluationResult);
    
    console.log('[AllModePage] Quality calculation result:', qualityResult);

    await srsService.updateCardAfterReview(user.id, currentSRSCard.cardId, {
      quality: qualityResult.quality,
      responseTime: evaluationResult.responseTime,
      isCorrect: evaluationResult.isCorrect
    });
  };

  /**
   * 학습 품질 점수 계산
   */
  const calculateLearningQuality = (evaluationResult: { isCorrect: boolean; score: number; confidence: number; responseTime: number }) => {
    return scoreCalculator.calculateQuality({
      isCorrect: evaluationResult.isCorrect,
      confidence: evaluationResult.confidence,
      score: evaluationResult.score,
      responseTime: evaluationResult.responseTime
    });
  };

  /**
   * 답변 처리 에러 처리
   */
  const handleAnswerProcessingError = (): void => {
    setError('답변 처리 중 오류가 발생했습니다');
  };

  const handleNextCard = () => {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < reviewSession!.reviewCards.length) {
      setCurrentIndex(nextIndex);
      setSpeechFeedback(null);
      setWritingFeedback(null);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    // 세션 완료 처리
    await loadSRSStats(); // 통계 업데이트
    navigate('/', { 
      state: { 
        message: `ALL 모드 완료! ${reviewSession?.totalCards}개 카드를 복습했습니다.`
      }
    });
  };

  const hasAnswer = speechFeedback || writingFeedback;

  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <h1 className="text-2xl font-bold text-center">
                🔄 ALL 모드 (망각곡선 복습)
              </h1>
              <div className="w-8"></div>
            </div>
            
            <p className="text-gray-600 text-center">
              SRS 알고리즘으로 최적화된 복습 시스템
            </p>
          </div>

          {/* SRS 통계 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">📊 복습 현황</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{srsStats.totalCards}</div>
                <div className="text-sm text-gray-600">전체 카드</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{srsStats.dueToday}</div>
                <div className="text-sm text-gray-600">오늘 복습</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{srsStats.accuracyRate}%</div>
                <div className="text-sm text-gray-600">정답률</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{srsStats.averageEaseFactor}</div>
                <div className="text-sm text-gray-600">평균 난이도</div>
              </div>
            </div>
          </div>

          {/* 학습 모드 선택 */}
          <div className="space-y-4">
            <button
              onClick={() => startReviewSession('due')}
              disabled={srsStats.dueToday === 0}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200"
            >
              📅 오늘 복습할 카드 ({srsStats.dueToday}개)
            </button>

            <button
              onClick={() => startReviewSession('random')}
              disabled={srsStats.totalCards === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200"
            >
              🎲 가중치 랜덤 복습 (20개)
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 ALL 모드 특징</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>망각곡선 기반:</strong> SuperMemo SM-2 알고리즘 사용</li>
                <li>• <strong>개인 맞춤:</strong> 틀린 문제는 더 자주, 맞힌 문제는 간격 증가</li>
                <li>• <strong>가중치 시스템:</strong> 오답률과 마지막 학습일을 고려한 선택</li>
                <li>• <strong>모드 연동:</strong> {learningMode.mode === 'writing' ? '✍️ Writing' : '🎤 Speaking'} 모드로 학습</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 학습 세션 중인 경우
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 뒤로
            </button>
            <div className="text-center">
              <h1 className="text-lg font-semibold">
                ALL 모드 복습
              </h1>
              <div className="text-sm text-gray-500">
                Level {currentSRSCard?.level}.{currentSRSCard?.stage}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {currentIndex + 1}/{reviewSession?.totalCards}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((currentIndex + 1) / (reviewSession?.totalCards || 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentCardData && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Korean Prompt Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center">
              <h2 className="text-sm font-medium text-gray-500 mb-2">한국어를 영어로</h2>
              <p className="text-2xl font-bold text-gray-800 mb-6">
                {currentCardData.front_ko}
              </p>
              
              {/* Expected Answer (shown after feedback) */}
              {hasAnswer && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                  <span className="font-medium">정답: </span>
                  {currentCardData.target_en}
                </div>
              )}
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center">
              {learningMode.mode === 'writing' ? (
                <WritingModeInput
                  question={{
                    id: currentCardData.id,
                    front_ko: currentCardData.front_ko,
                    target_en: currentCardData.target_en,
                    level: currentSRSCard?.level || 1,
                    stage: currentSRSCard?.stage || 1,
                    difficulty: currentSRSCard?.difficulty || 'medium'
                  }}
                  onSubmit={handleWritingSubmit}
                  disabled={!!writingFeedback}
                />
              ) : (
                <AutoSpeakingFlowV2
                  currentCard={currentCardData}
                  onSpeechResult={handleSpeechResult}
                  onTimeout={() => {
                    // AutoSpeakingFlowV2에서 이미 정답을 재생하므로 바로 다음 카드로
                    console.log('[AllModePage] Timeout - proceeding to next card');
                    setTimeout(() => {
                      if (currentSRSCard) {
                        nextCard();
                      }
                    }, 100);
                  }}
                  isActive={!speechFeedback}
                  recordingDuration={10}
                />
              )}
            </div>
          </div>

          {/* Feedback Section */}
          {writingFeedback && (
            <WritingModeFeedback
              feedback={writingFeedback}
              targetAnswer={currentCardData.target_en}
              onPlayAnswer={() => speech.speak(currentCardData.target_en)}
              canPlayAnswer={speech.isTTSAvailable}
            />
          )}

          {speechFeedback && (
            <FeedbackPanel
              feedback={speechFeedback}
              onPlayAnswer={() => speech.speak(currentCardData.target_en)}
              canPlayAnswer={speech.isTTSAvailable}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-2">
              {hasAnswer && (
                <button
                  onClick={() => speech.speak(currentCardData.target_en)}
                  disabled={!speech.isTTSAvailable}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                >
                  🔊 정답 듣기
                </button>
              )}
            </div>

            {currentIndex < (reviewSession?.totalCards || 0) - 1 ? (
              <button
                onClick={handleNextCard}
                disabled={!hasAnswer}
                className="px-6 py-3 bg-green-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                다음 카드 →
              </button>
            ) : (
              <button
                onClick={finishSession}
                disabled={!hasAnswer}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
              >
                복습 완료
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});