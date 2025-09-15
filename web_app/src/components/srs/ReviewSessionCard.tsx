/**
 * Review Session Card Component
 * 
 * 기능:
 * - 복습 세션 진행 UI
 * - 카드별 복습 인터페이스
 * - 실시간 기억 강도 업데이트
 * - 세션 완료 처리
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ReviewCard } from '@/services/srs/SRSEngine';
import { useSRSEngine } from '@/hooks/useSRSEngine';

export interface ReviewSessionCardProps {
  userId: string;
  cards: ReviewCard[];
  onComplete: (results: Array<{ cardId: string; isCorrect: boolean; responseTime: number; confidence: number }>) => void;
  onCancel: () => void;
  className?: string;
}

type SessionPhase = 'ready' | 'reviewing' | 'feedback' | 'completed';

export const ReviewSessionCard: React.FC<ReviewSessionCardProps> = ({
  userId,
  cards,
  onComplete,
  onCancel,
  className = ''
}) => {
  const srsEngine = useSRSEngine({ userId });
  
  // 세션 상태
  const [phase, setPhase] = useState<SessionPhase>('ready');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [sessionResults, setSessionResults] = useState<Array<{
    cardId: string;
    isCorrect: boolean;
    responseTime: number;
    confidence: number;
    userAnswer: string;
    correctAnswer: string;
  }>>([]);
  
  // 타이밍 관련
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // 현재 카드
  const currentCard = cards[currentIndex];
  
  // 진행률
  const progress = ((currentIndex + (phase === 'completed' ? 1 : 0)) / cards.length) * 100;

  // 세션 시작
  const startSession = useCallback(() => {
    setPhase('reviewing');
    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
  }, []);

  // 답변 제출
  const submitAnswer = useCallback(() => {
    if (!currentCard || userAnswer.trim() === '') return;

    const responseTime = Date.now() - questionStartTime;
    const isCorrect = userAnswer.trim().toLowerCase() === currentCard.content.english.trim().toLowerCase();
    
    // 사용자에게 신뢰도 확인 (간단한 구현)
    const confidence = isCorrect ? 0.8 : 0.3;

    // 결과 기록
    const result = {
      cardId: currentCard.id,
      isCorrect,
      responseTime,
      confidence,
      userAnswer: userAnswer.trim(),
      correctAnswer: currentCard.content.english
    };

    setSessionResults(prev => [...prev, result]);

    // 즉시 SRS 엔진에 반영
    srsEngine.processReviewSession(currentCard.id, {
      cardId: currentCard.id,
      userAnswer: userAnswer.trim(),
      correctAnswer: currentCard.content.english,
      isCorrect,
      responseTime,
      difficulty: responseTime > 10000 ? 'hard' : responseTime > 5000 ? 'medium' : 'easy',
      confidence
    });

    setPhase('feedback');

    // 피드백 표시 후 다음 카드 또는 완료
    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        // 다음 카드로
        setCurrentIndex(prev => prev + 1);
        setUserAnswer('');
        setPhase('reviewing');
        setQuestionStartTime(Date.now());
      } else {
        // 세션 완료 - sessionStartTime 활용한 통계 생성
        const totalSessionTime = Date.now() - sessionStartTime;
        const correctCount = results.filter(r => r.isCorrect).length;
        const accuracy = (correctCount / results.length) * 100;
        const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        console.log('🎯 SRS Session completed:', {
          totalTime: `${Math.round(totalSessionTime / 1000)}s`,
          accuracy: `${accuracy.toFixed(1)}%`,
          avgResponseTime: `${Math.round(averageResponseTime / 1000)}s`,
          cardsReviewed: results.length
        });
        
        setPhase('completed');
      }
    }, 2000);
  }, [currentCard, userAnswer, questionStartTime, currentIndex, cards.length, srsEngine, sessionStartTime, results]);

  // 건너뛰기
  const skipCard = useCallback(() => {
    if (!currentCard) return;

    const responseTime = Date.now() - questionStartTime;
    const result = {
      cardId: currentCard.id,
      isCorrect: false,
      responseTime,
      confidence: 0.1,
      userAnswer: '(건너뜀)',
      correctAnswer: currentCard.content.english
    };

    setSessionResults(prev => [...prev, result]);

    // SRS 엔진에 반영
    srsEngine.processReviewSession(currentCard.id, {
      cardId: currentCard.id,
      userAnswer: '',
      correctAnswer: currentCard.content.english,
      isCorrect: false,
      responseTime,
      difficulty: 'hard',
      confidence: 0.1
    });

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setQuestionStartTime(Date.now());
    } else {
      setPhase('completed');
    }
  }, [currentCard, questionStartTime, currentIndex, cards.length, srsEngine]);

  // 세션 완료 처리
  const handleComplete = useCallback(() => {
    const finalResults = sessionResults.map(result => ({
      cardId: result.cardId,
      isCorrect: result.isCorrect,
      responseTime: result.responseTime,
      confidence: result.confidence
    }));

    onComplete(finalResults);
  }, [sessionResults, onComplete]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (phase === 'reviewing' && event.key === 'Enter' && userAnswer.trim() !== '') {
        submitAnswer();
      } else if (phase === 'reviewing' && event.key === 'Escape') {
        skipCard();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, userAnswer, submitAnswer, skipCard]);

  // 세션 통계 계산
  const sessionStats = {
    correct: sessionResults.filter(r => r.isCorrect).length,
    total: sessionResults.length,
    averageTime: sessionResults.length > 0 ? 
      sessionResults.reduce((sum, r) => sum + r.responseTime, 0) / sessionResults.length : 0,
    accuracy: sessionResults.length > 0 ? 
      sessionResults.filter(r => r.isCorrect).length / sessionResults.length : 0
  };

  if (cards.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 text-center ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">복습할 카드가 없습니다</h2>
        <p className="text-gray-600 mb-6">새로운 카드를 추가하거나 나중에 다시 시도해보세요.</p>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">복습 세션</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
            title="세션 종료"
          >
            ✕
          </button>
        </div>
        
        {/* 진행률 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{currentIndex + 1} / {cards.length}</span>
          <span>{sessionStats.total > 0 && `정답률: ${(sessionStats.accuracy * 100).toFixed(0)}%`}</span>
        </div>
      </div>

      {/* 세션 시작 화면 */}
      {phase === 'ready' && (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">복습 세션을 시작하시겠습니까?</h3>
          <p className="text-gray-600 mb-6">총 {cards.length}개의 카드를 복습합니다.</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={startSession}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              시작하기
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 복습 진행 화면 */}
      {phase === 'reviewing' && currentCard && (
        <div className="space-y-6">
          {/* 문제 카드 */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-100 text-center">
            <h3 className="text-2xl font-bold text-blue-900 mb-2">{currentCard.content.korean}</h3>
            {currentCard.content.pattern && (
              <p className="text-sm text-blue-600">패턴: {currentCard.content.pattern}</p>
            )}
          </div>

          {/* 답변 입력 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              영어로 번역하세요:
            </label>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && userAnswer.trim() && submitAnswer()}
              placeholder="영어 번역을 입력하세요..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipCard}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
            >
              건너뛰기 (ESC)
            </button>
            <button
              onClick={submitAnswer}
              disabled={userAnswer.trim() === ''}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              제출 (Enter)
            </button>
          </div>
        </div>
      )}

      {/* 피드백 화면 */}
      {phase === 'feedback' && currentCard && (
        <div className="space-y-6 text-center">
          {/* 정답/오답 표시 */}
          <div className={`rounded-lg p-6 border ${
            sessionResults[sessionResults.length - 1]?.isCorrect
              ? 'bg-green-50 border-green-100'
              : 'bg-red-50 border-red-100'
          }`}>
            <div className={`text-6xl mb-4 ${
              sessionResults[sessionResults.length - 1]?.isCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {sessionResults[sessionResults.length - 1]?.isCorrect ? '✅' : '❌'}
            </div>
            
            <h3 className={`text-xl font-bold mb-2 ${
              sessionResults[sessionResults.length - 1]?.isCorrect ? 'text-green-800' : 'text-red-800'
            }`}>
              {sessionResults[sessionResults.length - 1]?.isCorrect ? '정답!' : '틀렸습니다'}
            </h3>

            <div className="space-y-2 text-lg">
              <p><strong>정답:</strong> {currentCard.content.english}</p>
              {!sessionResults[sessionResults.length - 1]?.isCorrect && (
                <p><strong>입력:</strong> {sessionResults[sessionResults.length - 1]?.userAnswer}</p>
              )}
            </div>
          </div>

          {/* 기억 강도 업데이트 정보 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              기억 강도가 업데이트되었습니다: {(currentCard.memory.strength * 100).toFixed(0)}% 
              {sessionResults[sessionResults.length - 1]?.isCorrect ? ' ↗️' : ' ↘️'}
            </p>
          </div>
        </div>
      )}

      {/* 완료 화면 */}
      {phase === 'completed' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">복습 완료!</h3>
          
          {/* 세션 통계 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p>
                <p className="text-sm text-gray-600">정답</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{sessionStats.total - sessionStats.correct}</p>
                <p className="text-sm text-gray-600">오답</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{(sessionStats.accuracy * 100).toFixed(0)}%</p>
                <p className="text-sm text-gray-600">정답률</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{(sessionStats.averageTime / 1000).toFixed(1)}s</p>
                <p className="text-sm text-gray-600">평균 시간</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
          >
            완료
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewSessionCard;