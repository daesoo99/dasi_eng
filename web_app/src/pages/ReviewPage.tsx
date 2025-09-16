import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useUser, useStudy, useUI } from '@/store/useAppStore';
import { SpeechRecorder } from '@/components/SpeechRecorder';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { useSpeech } from '@/hooks/useSpeech';
import { api } from '@/lib/api';
import type { DrillCard } from '@/types';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const study = useStudy();
  const ui = useUI();
  
  const {
    setCurrentCard,
    setCards,
    setFeedback,
    setCurrentSession,
    resetStudyState,
    setLoading,
    setError,
    clearError,
  } = useAppStore();

  const [reviewType, setReviewType] = useState<'random' | 'retry' | null>(null);
  const [reviewCount, setReviewCount] = useState(15);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([2, 3, 4]);
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [incorrectCards, setIncorrectCards] = useState<string[]>([]);

  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetStudyState();
    };
  }, []);

  const startRandomReview = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await api.getRandomReview({
        userId: user.id,
        count: reviewCount,
        levels: selectedLevels,
      });
      
      if (response.success && response.data) {
        setCards(response.data.cards);
        if (response.data.cards.length > 0) {
          setCurrentCard(response.data.cards[0], 0);
          setCardStartTime(Date.now());
          setReviewType('random');
          
          // Create session for review
          setCurrentSession({
            id: `review_${Date.now()}`,
            userId: user.id,
            level: 0, // Mixed levels
            stage: 0, // Review mode
            startedAt: new Date(),
            items: [],
          });
        }
      } else {
        setError(response.error || '복습 카드를 불러오는데 실패했습니다');
      }
    } catch (_error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const startRetryReview = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await api.getRetryReview({
        userId: user.id,
      });
      
      if (response.success && response.data) {
        setCards(response.data.cards);
        if (response.data.cards.length > 0) {
          setCurrentCard(response.data.cards[0], 0);
          setCardStartTime(Date.now());
          setReviewType('retry');
          
          setCurrentSession({
            id: `retry_${Date.now()}`,
            userId: user.id,
            level: 0,
            stage: 0,
            startedAt: new Date(),
            items: [],
          });
        }
      } else {
        setError(response.error || '오답 복습 카드를 불러오는데 실패했습니다');
      }
    } catch (_error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechResult = async (transcript: string, confidence: number) => {
    if (!study.currentCard || !study.currentSession) return;

    const responseTime = Date.now() - cardStartTime;
    setLoading(true);

    try {
      const feedbackResponse = await api.getFeedback({
        front_ko: study.currentCard.front_ko,
        sttText: transcript,
        target_en: study.currentCard.target_en,
      });

      if (feedbackResponse.success && feedbackResponse.data) {
        const feedback = feedbackResponse.data;
        setFeedback(feedback);

        // Track incorrect answers for retry mode
        if (!feedback.correct) {
          setIncorrectCards(prev => [...prev, study.currentCard!.id]);
        }

        // Play correct answer if TTS is available and answer was incorrect
        if (speech.isTTSAvailable && !feedback.correct) {
          setTimeout(() => {
            speech.speak(study.currentCard!.target_en);
          }, 1500);
        }
      } else {
        setError(feedbackResponse.error || '피드백을 받는데 실패했습니다');
      }
    } catch (_error) {
      setError('피드백 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleNextCard = () => {
    const nextIndex = study.currentIndex + 1;
    
    if (nextIndex < study.cards.length) {
      setCurrentCard(study.cards[nextIndex], nextIndex);
      setCardStartTime(Date.now());
      setFeedback(null);
    } else {
      finishReview();
    }
  };

  const handlePreviousCard = () => {
    const prevIndex = study.currentIndex - 1;
    
    if (prevIndex >= 0) {
      setCurrentCard(study.cards[prevIndex], prevIndex);
      setCardStartTime(Date.now());
      setFeedback(null);
    }
  };

  const finishReview = () => {
    const correctCount = study.cards.length - incorrectCards.length;
    const accuracy = Math.round((correctCount / study.cards.length) * 100);
    
    navigate('/result', { 
      state: { 
        summary: {
          totalCards: study.cards.length,
          correctAnswers: correctCount,
          accuracy: accuracy,
          reviewType: reviewType
        }
      }
    });
  };

  const toggleLevel = (level: number) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  // Render setup screen
  if (!reviewType || !study.currentCard) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 mb-4"
            >
              ← 홈으로 돌아가기
            </button>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">복습 모드</h1>
            <p className="text-gray-600">완성된 레벨에서 랜덤 복습하기</p>
          </div>

          {/* Random Review Setup */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔄 랜덤 복습</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                복습할 문장 수: {reviewCount}개
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={reviewCount}
                onChange={(e) => setReviewCount(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5개</span>
                <span>30개</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                복습할 레벨 선택
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      selectedLevels.includes(level)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Level {level}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startRandomReview}
              disabled={selectedLevels.length === 0 || ui.isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {ui.isLoading ? '로딩 중...' : '랜덤 복습 시작'}
            </button>
          </div>

          {/* Retry Review */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔁 오답 복습</h2>
            <p className="text-gray-600 mb-4 text-sm">
              최근 틀린 문제들을 다시 연습해보세요.
            </p>
            <button
              onClick={startRetryReview}
              disabled={ui.isLoading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {ui.isLoading ? '로딩 중...' : '오답 복습 시작'}
            </button>
          </div>

          {ui.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-600">{ui.error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-red-500 hover:text-red-700 font-medium"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render study interface (same as StudyPage)
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
                {reviewType === 'random' ? '🔄 랜덤 복습' : '🔁 오답 복습'}
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              {study.currentIndex + 1}/{study.cards.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((study.currentIndex + 1) / study.cards.length) * 100}%`
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
            <h2 className="text-sm font-medium text-gray-500 mb-2">한국어를 영어로</h2>
            <p className="text-2xl font-bold text-gray-800 mb-6">
              {study.currentCard.front_ko}
            </p>
            
            {/* Card Source Info */}
            {(study.currentCard as any).level && (
              <div className="text-xs text-gray-500 mb-4">
                Level {(study.currentCard as any).level} - {(study.currentCard as any).stageTitle}
              </div>
            )}
            
            {/* Expected Answer (shown after feedback) */}
            {study.feedback && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                <span className="font-medium">정답: </span>
                {study.currentCard.target_en}
              </div>
            )}
          </div>
        </div>

        {/* Speech Recorder */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <SpeechRecorder
              onResult={handleSpeechResult}
              onError={(error) => setError(error)}
              phraseHints={[study.currentCard.target_en]}
              disabled={ui.isLoading || !!study.feedback}
            />
          </div>
        </div>

        {/* Feedback Panel */}
        {study.feedback && (
          <FeedbackPanel
            feedback={study.feedback}
            onPlayAnswer={() => speech.speak(study.currentCard!.target_en)}
            canPlayAnswer={speech.isTTSAvailable}
          />
        )}

        {/* Navigation Controls */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePreviousCard}
            disabled={study.currentIndex === 0}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            ← 이전 카드
          </button>

          <div className="flex space-x-2">
            {study.feedback && (
              <button
                onClick={() => speech.speak(study.currentCard!.target_en)}
                disabled={!speech.isTTSAvailable}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
              >
                🔊 정답 듣기
              </button>
            )}
          </div>

          {study.currentIndex < study.cards.length - 1 ? (
            <button
              onClick={handleNextCard}
              disabled={!study.feedback}
              className="px-6 py-3 bg-green-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
            >
              다음 카드 →
            </button>
          ) : (
            <button
              onClick={finishReview}
              disabled={!study.feedback}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
            >
              복습 완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
};