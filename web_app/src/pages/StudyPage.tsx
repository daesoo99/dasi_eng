import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useUser, useStudy, useUI, useLearningMode, useSpeakingStage } from '@/store/useAppStore';
import { SpeechRecorder } from '@/components/SpeechRecorder';
import { SpeakingStageSelector } from '@/components/SpeakingStageSelector';
import { SpeakingFlowController } from '@/components/SpeakingFlowController';
import { PatternTrainingFlow } from '@/components/PatternTrainingFlow';
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
  const speakingStage = useSpeakingStage();
  
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
  const [writingInputValue, setWritingInputValue] = useState<string>('');
  const [autoNextTimeoutId, setAutoNextTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number>(0);
  const [speakingFlowState, setSpeakingFlowState] = useState<'idle' | 'tts' | 'beep' | 'waiting' | 'recording'>('idle');
  const [isTrainingRunning, setIsTrainingRunning] = useState(false);
  const [isTrainingPaused, setIsTrainingPaused] = useState(false);

  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false,
    language: 'en-US',
  });

  const loadCards = useCallback(async () => {
    setLoading(true);
    clearError();
    
    try {
      console.log(`🔄 카드 로딩 시작: Level ${user.level}, Stage ${user.stage}`);
      
      let response;
      if (user.stage === 'ALL') {
        console.log(`🔄 ALL 모드로 카드 로딩: Level ${user.level}`);
        response = await api.getAllLevelCards(user.level);
      } else {
        response = await api.getCards(user.level, user.stage);
      }
      
      // 📋 상세한 API 응답 구조 로깅
      console.log('📥 API 응답 전체:', JSON.stringify(response, null, 2));
      console.log('📥 response.success:', response.success);
      console.log('📥 response.data:', response.data);
      console.log('📥 response.data?.cards:', response.data?.cards);
      console.log('📥 response.data?.cards 타입:', typeof response.data?.cards);
      console.log('📥 response.data?.cards Array.isArray:', Array.isArray(response.data?.cards));
      
      if (response.success && response.data) {
        // ✅ 이중 래핑된 구조에서 카드 데이터 접근
        const cards = response.data.data?.cards;
        
        if (Array.isArray(cards)) {
          console.log(`✅ 카드 로딩 성공: ${cards.length}개`);
          setCards(cards);
          
          if (cards.length > 0) {
            setCurrentCard(cards[0], 0);
            setCardStartTime(Date.now());
            // 새 세션 시작 시 입력값 클리어
            setWritingInputValue('');
          } else {
            console.warn('⚠️ 카드 배열이 비어있음');
            setError('이 레벨/스테이지에 카드가 없습니다');
          }
        } else {
          console.error('❌ response.data.cards가 배열이 아님:', cards);
          setError('카드 데이터 형식이 올바르지 않습니다');
        }
      } else {
        console.error('❌ API 응답 실패:');
        console.error('  - response.success:', response.success);
        console.error('  - response.error:', response.error);
        console.error('  - response.data:', response.data);
        setError(response.error || '카드를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('❌ 네트워크 오류:', error);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [user.level, user.stage, setLoading, clearError, setCards, setCurrentCard, setError]);

  // Load cards when component mounts
  useEffect(() => {
    console.log('🏁 StudyPage 마운트, 사용자 상태:', user);
    if (user.id) {
      loadCards();
    } else {
      console.warn('⚠️ 사용자 ID가 없어 카드 로딩을 건너뜀');
      setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
    }
    return () => {
      // Cleanup on unmount
      if (autoNextTimeoutId) {
        clearTimeout(autoNextTimeoutId);
      }
      resetStudyState();
    };
  }, [loadCards, resetStudyState, user.id]);

  // Start session when cards are loaded and training is running
  useEffect(() => {
    if (study.cards?.length && study.cards.length > 0 && !isSessionActive && isTrainingRunning) {
      startSession();
    }
  }, [study.cards, isSessionActive, isTrainingRunning]);

  const startSession = async () => {
    if (!user.id || !study.cards?.length || study.cards.length === 0) return;

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

  // Pattern Training Flow Result Handler (same as handleSpeechResult but with different naming)
  const handlePatternTrainingResult = async (userAnswer: string, isCorrect: boolean, confidence: number, responseTime?: number) => {
    console.log('🎯 StudyPage: handlePatternTrainingResult 호출됨', { userAnswer, isCorrect, confidence, responseTime });
    
    // Simply call handleSpeechResult with the userAnswer as transcript
    await handleSpeechResult(userAnswer, confidence);
  };

  const handleSpeechResult = async (transcript: string, confidence: number) => {
    console.log('🎯 StudyPage: handleSpeechResult 호출됨', { transcript, confidence });
    console.log('🎯 StudyPage: currentCard:', study.currentCard);
    console.log('🎯 StudyPage: currentSession:', study.currentSession);
    
    if (!study.currentCard) {
      console.error('❌ StudyPage: currentCard가 없음');
      return;
    }
    
    // 세션이 없으면 자동으로 생성 시도
    if (!study.currentSession && user.id) {
      console.log('🔄 StudyPage: 세션이 없어서 자동으로 세션 시작 시도');
      try {
        await startSession();
      } catch (error) {
        console.error('❌ 세션 시작 실패:', error);
      }
    }

    const responseTime = Date.now() - cardStartTime;
    console.log('🕐 StudyPage: responseTime:', responseTime);
    setLoading(true);

    // 빈 transcript인 경우 기본값으로 처리
    const processedTranscript = transcript.trim() || '[음성 인식 실패]';
    
    try {
      
      // Get rule-based feedback
      const feedbackResponse = await api.getFeedback({
        front_ko: study.currentCard.front_ko,
        sttText: processedTranscript,
        target_en: study.currentCard.target_en,
      });

      console.log('📝 StudyPage: feedbackResponse:', feedbackResponse);
      
      if (feedbackResponse.success && feedbackResponse.data) {
        const feedback = feedbackResponse.data;
        console.log('✅ StudyPage: 피드백 설정:', feedback);
        setFeedback(feedback);

        // Submit answer to session (세션이 있는 경우에만)
        if (study.currentSession?.id) {
          await api.submitAnswer({
            sessionId: study.currentSession.id,
            cardId: study.currentCard.id,
            userAnswer: transcript,
            isCorrect: feedback.correct,
            score: feedback.score,
            timeSpent: Math.round(responseTime / 1000),
          });
        } else {
          console.log('⚠️ StudyPage: 세션이 없어서 답변 제출 건너뜀');
        }

        // Play correct answer if TTS is available and answer was incorrect
        // Speaking 모드에서는 자동 플로우가 TTS를 담당하므로 여기서는 재생하지 않음
        if (speech.isTTSAvailable && !feedback.correct && learningMode.mode !== 'speaking') {
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
        
        // Speaking 모드에서 자동으로 4초 후 다음 카드로 진행 (HTML 버전과 동일)
        console.log('🎯 StudyPage: learningMode:', learningMode);
        if (learningMode.mode === 'speaking') {
          console.log('🎤 StudyPage: Speaking 모드 - 4초 후 자동 진행 설정');
          const timeout = setTimeout(() => {
            console.log('⏰ StudyPage: 4초 후 다음 카드 이동');
            handleNextCard();
          }, 4000); // HTML 버전과 동일하게 4초로 변경
          setAutoNextTimeoutId(timeout);
          setAutoNextCountdown(4); // 4초로 변경
          
          // 카운트다운 타이머
          const countdownInterval = setInterval(() => {
            setAutoNextCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        console.error('❌ StudyPage: 피드백 실패:', feedbackResponse.error);
        
        // 피드백 실패 시에도 기본 피드백 생성하여 진행
        const fallbackFeedback = {
          correct: false,
          score: 0,
          message: '음성 인식에 실패했습니다. 다음 문제로 넘어갑니다.',
          userAnswer: processedTranscript,
          correctAnswer: study.currentCard.target_en,
          feedback: '음성을 다시 한 번 명확하게 말해주세요.'
        };
        
        console.log('🔄 StudyPage: 기본 피드백으로 진행:', fallbackFeedback);
        setFeedback(fallbackFeedback);
        
        // Speaking 모드에서 자동으로 4초 후 다음 카드로 진행 (HTML 버전과 동일)
        console.log('🎯 StudyPage: learningMode:', learningMode);
        if (learningMode.mode === 'speaking') {
          console.log('🎤 StudyPage: Speaking 모드 - 4초 후 자동 진행 설정');
          const timeout = setTimeout(() => {
            console.log('⏰ StudyPage: 4초 후 다음 카드 이동');
            handleNextCard();
          }, 4000);
          setAutoNextTimeoutId(timeout);
          setAutoNextCountdown(4);
          
          // 카운트다운 타이머
          const countdownInterval = setInterval(() => {
            setAutoNextCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ StudyPage: 피드백 처리 오류:', error);
      
      // 오류 발생 시에도 기본 피드백 생성하여 진행
      const errorFeedback = {
        correct: false,
        score: 0,
        message: '처리 중 오류가 발생했습니다. 다음 문제로 넘어갑니다.',
        userAnswer: processedTranscript || '[처리 오류]',
        correctAnswer: study.currentCard.target_en,
        feedback: '다시 시도해주세요.'
      };
      
      console.log('🔄 StudyPage: 오류 시 기본 피드백으로 진행:', errorFeedback);
      setFeedback(errorFeedback);
      
      // Speaking 모드에서 자동으로 4초 후 다음 카드로 진행
      if (learningMode.mode === 'speaking') {
        console.log('🎤 StudyPage: 오류 시에도 Speaking 모드 - 4초 후 자동 진행');
        const timeout = setTimeout(() => {
          console.log('⏰ StudyPage: 오류 처리 후 4초 후 다음 카드 이동');
          handleNextCard();
        }, 4000);
        setAutoNextTimeoutId(timeout);
        setAutoNextCountdown(4);
        
        // 카운트다운 타이머
        const countdownInterval = setInterval(() => {
          setAutoNextCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
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

  const handleStartTraining = () => {
    console.log('🚀 Training 시작');
    setIsTrainingRunning(true);
    setIsTrainingPaused(false);
  };

  const handlePauseTraining = () => {
    console.log('⏸️ Training 일시정지');
    setIsTrainingPaused(true);
    
    // 자동 진행 타이머 중지
    if (autoNextTimeoutId) {
      clearTimeout(autoNextTimeoutId);
      setAutoNextTimeoutId(null);
    }
    
    // PatternTrainingFlow에 일시정지 신호 전달 (disabled prop을 통해)
    // 실제로는 disabled prop이 true가 되어 PatternTrainingFlow가 일시정지됨
  };

  const handleResumeTraining = () => {
    console.log('▶️ Training 재개');
    setIsTrainingPaused(false);
    
    // PatternTrainingFlow가 자동으로 재개됨 (disabled가 false가 되고 autoStart가 true이므로)
  };

  const handleResetTraining = () => {
    console.log('🔄 Training 재시작');
    setIsTrainingRunning(false);
    setIsTrainingPaused(false);
    setFeedback(null);
    setWritingFeedback(null);
    
    // 자동 진행 타이머 중지
    if (autoNextTimeoutId) {
      clearTimeout(autoNextTimeoutId);
      setAutoNextTimeoutId(null);
    }
    
    // 첫 번째 카드로 돌아가기
    if (study.cards?.length && study.cards.length > 0) {
      setCurrentCard(study.cards[0], 0);
      setCardStartTime(Date.now());
      setWritingInputValue('');
    }
  };

  const handleNextCard = () => {
    console.log('🔄 StudyPage: handleNextCard 호출됨');
    
    // 자동 진행 타이머가 있다면 클리어
    if (autoNextTimeoutId) {
      clearTimeout(autoNextTimeoutId);
      setAutoNextTimeoutId(null);
    }

    const nextIndex = study.currentIndex + 1;
    
    if (study.cards?.length && nextIndex < study.cards.length) {
      console.log(`🔄 StudyPage: 다음 카드로 이동 (${nextIndex + 1}/${study.cards.length})`);
      
      // 다음 카드로 자동 진행
      setCurrentCard(study.cards[nextIndex], nextIndex);
      setCardStartTime(Date.now());
      setFeedback(null);
      setWritingFeedback(null);
      
      // Speaking 모드 상태 초기화
      setSpeakingFlowState('idle');
      setAutoNextCountdown(0);
      
      // 입력값 자동 클리어
      setWritingInputValue('');
      
      // 음성 인식이 진행 중이라면 중지
      if (speech.isRecording) {
        speech.stopRecording();
      }
    } else {
      // 마지막 카드인 경우 세션 완료
      console.log('🏁 StudyPage: 마지막 카드 도달, 세션 완료');
      finishSession();
    }
  };

  const handlePreviousCard = () => {
    // 자동 진행 타이머가 있다면 클리어
    if (autoNextTimeoutId) {
      clearTimeout(autoNextTimeoutId);
      setAutoNextTimeoutId(null);
    }

    const prevIndex = study.currentIndex - 1;
    
    if (study.cards?.length && prevIndex >= 0) {
      setCurrentCard(study.cards[prevIndex], prevIndex);
      setCardStartTime(Date.now());
      setFeedback(null);
      setWritingFeedback(null);
      // 입력값 자동 클리어
      setWritingInputValue('');
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
              onClick={loadCards}
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
              {study.currentIndex + 1}/{study.cards?.length || 0}
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
                width: `${study.cards?.length ? ((study.currentIndex + 1) / study.cards.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Korean Prompt Card - Only show in Writing mode */}
        {learningMode.mode === 'writing' && (
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
        )}



        {/* Input Section - Conditional Rendering Based on Learning Mode */}
        <div className="mb-8">
          {learningMode.mode === 'writing' ? (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <WritingModeInput
                  question={{
                    id: study.currentCard.id,
                    front_ko: study.currentCard.front_ko,
                    target_en: study.currentCard.target_en,
                    level: user.level,
                    stage: user.stage,
                    difficulty: 'medium'
                  }}
                  value={writingInputValue}
                  onInputChange={setWritingInputValue}
                  onSubmit={handleWritingSubmit}
                  onAutoNext={handleNextCard}
                  disabled={ui.isLoading || !!writingFeedback}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <PatternTrainingFlow
                koreanText={study.currentCard.front_ko}
                expectedEnglish={study.currentCard.target_en}
                onResult={handlePatternTrainingResult}
                onError={(error) => setError(error)}
                stage={speakingStage.stage}
                disabled={ui.isLoading || !!study.feedback || !isTrainingRunning || isTrainingPaused}
                autoStart={isTrainingRunning && !isTrainingPaused && !study.feedback}
                className="text-center"
                showCorrectAnswer={true}
                mistakeId={undefined}
              />
            </div>
          )}
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
          <>
            <FeedbackPanel
              feedback={study.feedback}
              onPlayAnswer={() => speech.speak(study.currentCard!.target_en)}
              canPlayAnswer={speech.isTTSAvailable}
            />
            
            {/* 자동 진행 안내 */}
            {autoNextCountdown > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-6">
                <div className="text-green-800">
                  <div className="text-lg font-semibold mb-2">✅ 답변 완료!</div>
                  <div className="text-sm">
                    {autoNextCountdown}초 후 다음 문제로 이동합니다...
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={handleNextCard}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      지금 이동하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Training Controls - Speaking 모드에서만 표시하되, PatternTrainingFlow가 idle 상태일 때만 */}
        {learningMode.mode === 'speaking' && (
          <div className="flex justify-center gap-4 mb-6">
            {!isTrainingRunning ? (
              <button
                onClick={handleStartTraining}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🚀 시작하기
              </button>
            ) : (
              <div className="flex gap-4">
                {!isTrainingPaused ? (
                  <button
                    onClick={handlePauseTraining}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    ⏸️ 일시정지
                  </button>
                ) : (
                  <button
                    onClick={handleResumeTraining}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    ▶️ 재개
                  </button>
                )}
                <button
                  onClick={handleResetTraining}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  🔄 다시하기
                </button>
              </div>
            )}
          </div>
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

          {study.cards?.length && study.currentIndex < study.cards.length - 1 ? (
            <button
              onClick={handleNextCard}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              다음 카드 →
            </button>
          ) : (
            <button
              onClick={handleNextCard}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              세션 완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
};