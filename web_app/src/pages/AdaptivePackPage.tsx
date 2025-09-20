import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAppStore, useLearningMode } from '@/store/useAppStore';
import { adaptivePackService, type AdaptivePack, type LearningAnalytics, type AdaptivePackCard } from '@/services/adaptivePackService';
import { WritingModeInput } from '@/components/WritingModeInput';
import { WritingModeFeedback } from '@/components/WritingModeFeedback';
import { AutoSpeakingFlowV2 } from '@/components/AutoSpeakingFlowV2';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { useSpeech } from '@/hooks/useSpeech';
import { api } from '@/lib/api';
import type { FeedbackResponse } from '@/types';
import type { WritingFeedback } from '@/services/writingMode';

export const AdaptivePackPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const learningMode = useLearningMode();
  const { setLoading, setError, clearError: _clearError } = useAppStore();

  // Analytics & Packs
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [savedPacks, setSavedPacks] = useState<AdaptivePack[]>([]);
  const [currentPack, setCurrentPack] = useState<AdaptivePack | null>(null);
  
  // Study Session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<AdaptivePackCard | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  
  // Feedback
  const [speechFeedback, setSpeechFeedback] = useState<FeedbackResponse | null>(null);
  const [writingFeedback, setWritingFeedback] = useState<WritingFeedback | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(0);

  // UI States
  const [showPackGenerator, setShowPackGenerator] = useState(false);
  const [generationOptions, setGenerationOptions] = useState({
    algorithm: 'standard' as 'standard' | 'intensive' | 'review_focused',
    targetSize: 15
  });

  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [user.id]);

  // Set current card when pack/index changes
  useEffect(() => {
    if (currentPack && isStudying) {
      if (currentIndex < currentPack.cards.length) {
        setCurrentCard(currentPack.cards[currentIndex]);
        setCardStartTime(Date.now());
        setSpeechFeedback(null);
        setWritingFeedback(null);
      } else {
        finishPack();
      }
    }
  }, [currentPack, currentIndex, isStudying]);

  const loadData = async () => {
    if (!user.id) return;

    setLoading(true);
    try {
      // Load analytics and saved packs
      const [analyticsData, packsData] = await Promise.all([
        adaptivePackService.analyzeLearningData(user.id),
        adaptivePackService.getSavedAdaptivePacks(user.id)
      ]);
      
      setAnalytics(analyticsData);
      setSavedPacks(packsData);
    } catch (_error) {
      setError('데이터 로드에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const generateNewPack = async () => {
    if (!user.id) return;

    setLoading(true);
    try {
      const newPack = await adaptivePackService.generateAdaptivePack(
        user.id,
        generationOptions.targetSize,
        generationOptions.algorithm
      );
      
      setSavedPacks([newPack, ...savedPacks]);
      setShowPackGenerator(false);
      setError(''); // Clear any previous errors
      
      // Optionally start the new pack immediately
      if (newPack.cards.length > 0) {
        setCurrentPack(newPack);
        setCurrentIndex(0);
        setIsStudying(true);
      }
    } catch (_error) {
      setError('학습팩 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const startPack = (pack: AdaptivePack) => {
    setCurrentPack(pack);
    setCurrentIndex(0);
    setIsStudying(true);
  };

  const handleSpeechResult = async (transcript: string, confidence: number) => {
    if (!currentCard) return;

    await processAnswer(transcript, confidence, true);
  };

  const handleWritingSubmit = async (userInput: string, feedback: WritingFeedback) => {
    if (!currentCard) return;

    setWritingFeedback(feedback);
    await processAnswer(userInput, feedback.score / 100, false, feedback);
  };

  const processAnswer = async (
    userAnswer: string,
    confidence: number,
    isSpeaking: boolean,
    writingFeedback?: WritingFeedback
  ) => {
    if (!currentCard) return;

    const responseTime = (Date.now() - cardStartTime) / 1000;
    setLoading(true);

    try {
      let isCorrect = false;
      let score = 0;

      if (isSpeaking) {
        // Speaking mode - use feedback API
        const feedbackResponse = await api.getFeedback({
          front_ko: currentCard.cardData.front_ko,
          sttText: userAnswer,
          target_en: currentCard.cardData.target_en,
        });

        if (feedbackResponse.success && feedbackResponse.data) {
          setSpeechFeedback(feedbackResponse.data);
          isCorrect = feedbackResponse.data.correct;
          score = feedbackResponse.data.score;
        }
      } else {
        // Writing mode - already processed
        isCorrect = writingFeedback?.isCorrect || false;
        score = writingFeedback?.score || 0;
      }

      // Update SRS system
      if (currentCard.srsInfo) {
        let quality: 0 | 1 | 2 | 3 | 4 | 5 = 3;
        
        if (!isCorrect) {
          quality = confidence > 0.7 ? 2 : confidence > 0.4 ? 1 : 0;
        } else {
          if (score >= 90) quality = 5;
          else if (score >= 80) quality = 4;
          else quality = 3;
        }

        // TODO: Migrate to new SRS Engine system
        // const srsEngine = useSRSEngine();
        // await srsEngine.updateCard(currentCard.cardId, {
        //   quality,
        //   responseTime,
        //   isCorrect
        // });
      }

      // Play TTS if available and answer was incorrect
      if (speech.isTTSAvailable && !isCorrect) {
        setTimeout(() => {
          speech.speak(currentCard!.cardData.target_en);
        }, 1500);
      }

    } catch (_error) {
      setError('답변 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleNextCard = () => {
    setCurrentIndex(currentIndex + 1);
  };

  const finishPack = () => {
    setIsStudying(false);
    setCurrentPack(null);
    setCurrentCard(null);
    loadData(); // Refresh analytics
    
    navigate('/', {
      state: {
        message: `Adaptive Pack 완료! ${currentPack?.cards.length}개 카드를 학습했습니다.`
      }
    });
  };

  const hasAnswer = speechFeedback || writingFeedback;

  if (isStudying && currentCard) {
    // Study Session UI
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsStudying(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 뒤로
              </button>
              <div className="text-center">
                <h1 className="text-lg font-semibold">
                  {currentPack?.title}
                </h1>
                <div className="text-sm text-gray-500">
                  {currentCard.reason === 'wrong_answer' ? '🔴 오답 복습' :
                   currentCard.reason === 'forgetting_curve' ? '📅 망각곡선' :
                   currentCard.reason === 'weakness_pattern' ? '🎯 약점 보강' :
                   '🔥 난이도 조절'}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {currentIndex + 1}/{currentPack?.totalCards}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b">
          <div className="max-w-2xl mx-auto px-4 py-2">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentIndex + 1) / (currentPack?.totalCards || 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Korean Prompt Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-sm font-medium text-gray-500">한국어를 영어로</span>
                <span className="ml-3 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  {currentCard.reasonDetail}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-6">
                {currentCard.cardData.front_ko}
              </p>
              
              {/* Expected Answer (shown after feedback) */}
              {hasAnswer && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                  <span className="font-medium">정답: </span>
                  {currentCard.cardData.target_en}
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
                    id: currentCard.cardData.id,
                    front_ko: currentCard.cardData.front_ko,
                    target_en: currentCard.cardData.target_en,
                    level: user.level,
                    stage: user.stage,
                    difficulty: currentCard.expectedDifficulty
                  }}
                  onSubmit={handleWritingSubmit}
                  disabled={!!writingFeedback}
                />
              ) : (
                <AutoSpeakingFlowV2
                  currentCard={currentCard.cardData}
                  onSpeechResult={handleSpeechResult}
                  onTimeout={() => {
                    // AutoSpeakingFlowV2에서 이미 정답을 재생하므로 바로 다음 카드로
                    console.log('[AdaptivePackPage] Timeout - proceeding to next card');
                    setTimeout(() => {
                      if (currentCard) {
                        handleNextCard();
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
              targetAnswer={currentCard.cardData.target_en}
              onPlayAnswer={() => speech.speak(currentCard.cardData.target_en)}
              canPlayAnswer={speech.isTTSAvailable}
            />
          )}

          {speechFeedback && (
            <FeedbackPanel
              feedback={speechFeedback}
              onPlayAnswer={() => speech.speak(currentCard.cardData.target_en)}
              canPlayAnswer={speech.isTTSAvailable}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-2">
              {hasAnswer && (
                <button
                  onClick={() => speech.speak(currentCard.cardData.target_en)}
                  disabled={!speech.isTTSAvailable}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                >
                  🔊 정답 듣기
                </button>
              )}
            </div>

            {currentIndex < (currentPack?.totalCards || 0) - 1 ? (
              <button
                onClick={handleNextCard}
                disabled={!hasAnswer}
                className="px-6 py-3 bg-green-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                다음 카드 →
              </button>
            ) : (
              <button
                onClick={finishPack}
                disabled={!hasAnswer}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
              >
                팩 완료
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Page UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 개인 맞춤팩 (Adaptive)
          </h1>
          <p className="text-gray-600 text-lg">
            AI가 분석한 오답 + 망각곡선 + 약점 패턴 완전 자동화
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Analytics Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📊 학습 분석
              </h2>
              
              {analytics ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{analytics.correctRate}%</div>
                    <div className="text-sm text-gray-600">전체 정답률</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{analytics.totalAnswered}</div>
                    <div className="text-sm text-gray-600">총 학습 카드</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{analytics.averageResponseTime}s</div>
                    <div className="text-sm text-gray-600">평균 응답 시간</div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">{analytics.identifiedWeaknesses.length}</div>
                    <div className="text-sm text-gray-600">식별된 약점</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>분석 데이터 로딩 중...</p>
                </div>
              )}

              <button
                onClick={() => setShowPackGenerator(true)}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium"
              >
                🚀 새 Adaptive Pack 생성
              </button>
            </div>

            {/* Learning Insights */}
            {analytics && analytics.identifiedWeaknesses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 약점 분석</h3>
                <div className="space-y-3">
                  {analytics.identifiedWeaknesses.map((weakness, index) => (
                    <div key={index} className="border-l-4 border-orange-500 bg-orange-50 p-3 rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{weakness.pattern}</span>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                          Level {weakness.level}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{weakness.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saved Packs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📦 생성된 Adaptive Pack</h2>
                <span className="text-sm text-gray-500">{savedPacks.length}개</span>
              </div>

              {savedPacks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-xl font-medium text-gray-700 mb-2">아직 Adaptive Pack이 없습니다</p>
                  <p className="text-gray-500 mb-6">AI가 오답, 망각곡선, 약점 패턴을 분석해서 맞춤형 학습팩을 만들어드립니다</p>
                  <button
                    onClick={() => setShowPackGenerator(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium"
                  >
                    첫 번째 Adaptive Pack 생성
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {savedPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="border rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-white to-purple-50"
                      onClick={() => startPack(pack)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">
                          {pack.title}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {pack.algorithm}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{pack.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>📝 {pack.totalCards}카드</span>
                        <span>⏱️ ~{pack.estimatedTime}분</span>
                      </div>

                      {/* Pack Composition */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pack.cards.filter(c => c.reason === 'wrong_answer').length > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            🔴 오답 {pack.cards.filter(c => c.reason === 'wrong_answer').length}
                          </span>
                        )}
                        {pack.cards.filter(c => c.reason === 'forgetting_curve').length > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            📅 망각 {pack.cards.filter(c => c.reason === 'forgetting_curve').length}
                          </span>
                        )}
                        {pack.cards.filter(c => c.reason === 'weakness_pattern').length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            🎯 약점 {pack.cards.filter(c => c.reason === 'weakness_pattern').length}
                          </span>
                        )}
                      </div>

                      {/* Learning Objectives */}
                      <div className="text-xs text-gray-600">
                        <strong>목표:</strong> {pack.learningObjectives.slice(0, 2).join(', ')}
                        {pack.learningObjectives.length > 2 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pack Generator Modal */}
        {showPackGenerator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">🚀 Adaptive Pack 생성</h3>
                  <button
                    onClick={() => setShowPackGenerator(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">알고리즘</label>
                    <select
                      value={generationOptions.algorithm}
                      onChange={(e) => setGenerationOptions({
                        ...generationOptions, 
                        algorithm: e.target.value as any
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="standard">표준 (균형잡힌 학습)</option>
                      <option value="intensive">집중 (오답 위주)</option>
                      <option value="review_focused">복습 중심 (망각곡선 우선)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">카드 수</label>
                    <select
                      value={generationOptions.targetSize}
                      onChange={(e) => setGenerationOptions({
                        ...generationOptions, 
                        targetSize: parseInt(e.target.value)
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value={10}>10개 (빠른 학습)</option>
                      <option value={15}>15개 (표준)</option>
                      <option value={20}>20개 (심화)</option>
                      <option value={30}>30개 (집중)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">🤖 AI 분석 기반</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 오답률과 망각곡선 데이터 종합 분석</li>
                    <li>• 개인별 약점 패턴 자동 식별</li>
                    <li>• 최적 학습 순서와 난이도 조정</li>
                    <li>• SuperMemo SM-2 알고리즘 적용</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPackGenerator(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={generateNewPack}
                    disabled={!analytics || analytics.totalAnswered < 5}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    생성하기
                  </button>
                </div>
                
                {(!analytics || analytics.totalAnswered < 5) && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    최소 5개 이상의 카드를 학습한 후 생성 가능합니다
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};