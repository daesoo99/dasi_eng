import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useUser, useStudy, useUI, useLearningMode } from '@/store/useAppStore';
import { SpeechRecorder } from '@/components/SpeechRecorder';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { WritingModeInput } from '@/components/WritingModeInput';
import { WritingModeFeedback } from '@/components/WritingModeFeedback';
import { useSpeech } from '@/hooks/useSpeech';
import { api } from '@/lib/api';
import { srsService } from '@/services/srsService';
import type { DrillCard, FeedbackResponse } from '@/types';
import type { WritingFeedback } from '@/services/writingMode';

export const StudyPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const study = useStudy();
  const ui = useUI();
  const learningMode = useLearningMode();
  
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

  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [writingFeedback, setWritingFeedback] = useState<WritingFeedback | null>(null);

  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  // Load cards when component mounts
  useEffect(() => {
    loadCards();
    return () => {
      // Cleanup on unmount
      resetStudyState();
    };
  }, [user.level, user.stage]);

  // Start session when cards are loaded
  useEffect(() => {
    if (study.cards.length > 0 && !isSessionActive) {
      startSession();
    }
  }, [study.cards, isSessionActive]);

  const loadCards = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await api.getCards(user.level, user.stage);
      
      if (response.success && response.data) {
        setCards(response.data.cards);
        if (response.data.cards.length > 0) {
          setCurrentCard(response.data.cards[0], 0);
          setCardStartTime(Date.now());
        }
      } else {
        setError(response.error || '카드를 불러오는데 실패했습니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!user.id || study.cards.length === 0) return;

    try {
      const cardIds = study.cards.map(card => card.id);
      const response = await api.startSession({
        userId: user.id,
        level: user.level,
        stage: user.stage,
        cardIds,
      });

      if (response.success && response.data) {
        setCurrentSession({
          id: response.data.sessionId,
          userId: user.id,
          level: user.level,
          stage: user.stage,
          startedAt: new Date(),
          items: [],
        });
        setIsSessionActive(true);
        setSessionStartTime(Date.now());
      }
    } catch (error) {
      setError('세션 시작에 실패했습니다');
    }
  };

  const handleSpeechResult = async (transcript: string, confidence: number) => {
    if (!study.currentCard || !study.currentSession) return;

    const responseTime = Date.now() - cardStartTime;
    setLoading(true);

    try {
      // Get rule-based feedback
      const feedbackResponse = await api.getFeedback({
        front_ko: study.currentCard.front_ko,
        sttText: transcript,
        target_en: study.currentCard.target_en,
      });

      if (feedbackResponse.success && feedbackResponse.data) {
        const feedback = feedbackResponse.data;
        setFeedback(feedback);

        // Submit answer to session
        await api.submitAnswer({
          sessionId: study.currentSession.id!,
          cardId: study.currentCard.id,
          userAnswer: transcript,
          isCorrect: feedback.correct,
          score: feedback.score,
          timeSpent: Math.round(responseTime / 1000),
        });

        // Play correct answer if TTS is available and answer was incorrect
        if (speech.isTTSAvailable && !feedback.correct) {
          setTimeout(() => {
            speech.speak(study.currentCard!.target_en);
          }, 1500);
        }

        // SRS 시스템에 카드 추가 (첫 학습 시)
        try {
          await srsService.addCardToSRS(user.id, study.currentCard.id, {
            level: user.level,
            stage: user.stage,
            difficulty: 'medium'
          });
        } catch (error) {
          console.error('SRS 카드 추가 실패:', error);
        }
      } else {
        setError(feedbackResponse.error || '피드백을 받는데 실패했습니다');
      }
    } catch (error) {
      setError('피드백 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleWritingSubmit = async (userInput: string, feedback: WritingFeedback) => {
    if (!study.currentCard || !study.currentSession) return;

    setWritingFeedback(feedback);
    setLoading(true);

    try {
      // Submit answer to session
      await api.submitAnswer({
        sessionId: study.currentSession.id!,
        cardId: study.currentCard.id,
        userAnswer: userInput,
        isCorrect: feedback.isCorrect,
        score: feedback.score,
        timeSpent: Math.round((Date.now() - cardStartTime) / 1000),
      });

      // Play correct answer if available
      if (speech.isTTSAvailable) {
        setTimeout(() => {
          speech.speak(study.currentCard!.target_en);
        }, 1000);
      }

      // SRS 시스템에 카드 추가 (Writing 모드)
      try {
        await srsService.addCardToSRS(user.id, study.currentCard.id, {
          level: user.level,
          stage: user.stage,
          difficulty: 'medium'
        });
      } catch (error) {
        console.error('SRS 카드 추가 실패:', error);
      }
    } catch (error) {
      setError('답변 제출 중 오류가 발생했습니다');
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
      setWritingFeedback(null);
    } else {
      finishSession();
    }
  };

  const handlePreviousCard = () => {
    const prevIndex = study.currentIndex - 1;
    
    if (prevIndex >= 0) {
      setCurrentCard(study.cards[prevIndex], prevIndex);
      setCardStartTime(Date.now());
      setFeedback(null);
      setWritingFeedback(null);
    }
  };

  const finishSession = async () => {
    if (!study.currentSession) return;

    setLoading(true);
    
    try {
      const response = await api.finishSession(study.currentSession.id!);
      
      if (response.success) {
        // Navigate to results page with session summary
        navigate('/result', { 
          state: { 
            summary: response.data?.summary,
            level: user.level,
            stage: user.stage,
          }
        });
      } else {
        setError(response.error || '세션 종료에 실패했습니다');
      }
    } catch (error) {
      setError('세션 종료 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (ui.isLoading && !study.currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (ui.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">오류 발생</h2>
          <p className="text-red-600 mb-4">{ui.error}</p>
          <div className="space-x-2">
            <button
              onClick={clearError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              다시 시도
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!study.currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">학습할 카드가 없습니다</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

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
                Level {user.level}.{user.stage}
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
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
            
            {/* Expected Answer (shown after feedback) */}
            {study.feedback && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                <span className="font-medium">정답: </span>
                {study.currentCard.target_en}
              </div>
            )}
          </div>
        </div>

        {/* Input Section - Conditional Rendering Based on Learning Mode */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            {learningMode.mode === 'writing' ? (
              <WritingModeInput
                question={{
                  id: study.currentCard.id,
                  front_ko: study.currentCard.front_ko,
                  target_en: study.currentCard.target_en,
                  level: user.level,
                  stage: user.stage,
                  difficulty: 'medium'
                }}
                onSubmit={handleWritingSubmit}
                disabled={ui.isLoading || !!writingFeedback}
              />
            ) : (
              <SpeechRecorder
                onResult={handleSpeechResult}
                onError={(error) => setError(error)}
                phraseHints={[study.currentCard.target_en]}
                disabled={ui.isLoading || !!study.feedback}
              />
            )}
          </div>
        </div>

        {/* Feedback Section - Conditional Rendering Based on Learning Mode */}
        {learningMode.mode === 'writing' && writingFeedback && (
          <WritingModeFeedback
            feedback={writingFeedback}
            targetAnswer={study.currentCard.target_en}
            onPlayAnswer={() => speech.speak(study.currentCard!.target_en)}
            canPlayAnswer={speech.isTTSAvailable}
          />
        )}

        {learningMode.mode === 'speaking' && study.feedback && (
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
            {(study.feedback || writingFeedback) && (
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
              disabled={!study.feedback && !writingFeedback}
              className="px-6 py-3 bg-green-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
            >
              다음 카드 →
            </button>
          ) : (
            <button
              onClick={finishSession}
              disabled={!study.feedback && !writingFeedback}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
            >
              세션 완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
};