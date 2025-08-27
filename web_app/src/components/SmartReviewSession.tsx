import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { reviewAlgorithmService } from '../services/reviewAlgorithm';
import { ErrorBoundary } from './ErrorBoundary';

interface ReviewSentence {
  id: string;
  kr: string;
  en: string;
  level: number;
  stage: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ReviewSessionProps {
  userId: string;
  onComplete: (results: ReviewResults) => void;
}

interface ReviewResults {
  totalSentences: number;
  correctAnswers: number;
  averageTime: number;
  improvementAreas: string[];
}

const SmartReviewSession: React.FC<ReviewSessionProps> = memo(({ userId, onComplete }) => {
  const [sentences, setSentences] = useState<ReviewSentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionResults, setSessionResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    streak: 0,
    maxStreak: 0
  });

  useEffect(() => {
    initializeSession();
  }, [userId]);

  const initializeSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // 오늘의 복습 문장들 가져오기
      const sentenceIds = await reviewAlgorithmService.getTodayReviewSentences(userId, 30);
      
      // 실제로는 Firestore에서 문장 데이터 가져오기
      const reviewSentences: ReviewSentence[] = sentenceIds.map((id, index) => ({
        id,
        kr: `복습 문장 ${index + 1}`,
        en: `Review sentence ${index + 1}`,
        level: Math.floor(Math.random() * 6) + 1,
        stage: `Stage ${Math.floor(index / 10) + 1}`,
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard'
      }));
      
      setSentences(reviewSentences);
      setStartTime(Date.now());
    } catch (error) {
      console.error('복습 세션 초기화 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleSubmitAnswer = useCallback(() => {
    if (!userAnswer.trim()) return;
    
    setShowAnswer(true);
  }, [userAnswer]);

  const handleDifficultyFeedback = useCallback(async (difficulty: 'easy' | 'medium' | 'hard') => {
    const currentSentence = sentences[currentIndex];
    const responseTime = Date.now() - startTime;
    
    // 정확도 계산 (간단한 유사도 비교)
    const accuracy = calculateAccuracy(userAnswer, currentSentence.en);
    
    // 복습 세션 데이터 저장
    const sessionData = {
      sentenceId: currentSentence.id,
      userId,
      accuracy,
      responseTime,
      difficulty,
      timestamp: new Date(),
      reviewCount: 0, // 실제로는 기존 카운트 + 1
      intervalDays: 1
    };

    // 알고리즘에 피드백 전달 및 다음 복습 일정 계산
    try {
      // await reviewAlgorithmService.recordReviewSession(sessionData);
      
      // 세션 결과 기록
      setSessionResults(prev => [...prev, { ...sessionData, correct: accuracy > 0.7 }]);
      
      // 통계 업데이트
      const isCorrect = accuracy > 0.7;
      setSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: isCorrect ? prev.streak + 1 : 0,
        maxStreak: Math.max(prev.maxStreak, isCorrect ? prev.streak + 1 : prev.streak)
      }));
      
    } catch (error) {
      console.error('복습 결과 저장 실패:', error);
    }

    // 다음 문장으로 이동
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowAnswer(false);
      setStartTime(Date.now());
    } else {
      // 세션 완료
      completeSession();
    }
  }, [sentences, currentIndex, userAnswer, userId, startTime, sessionResults]);

  const calculateAccuracy = useCallback((userAnswer: string, correctAnswer: string): number => {
    // 간단한 유사도 계산 (실제로는 더 정교한 알고리즘 사용)
    const userWords = userAnswer.toLowerCase().split(' ');
    const correctWords = correctAnswer.toLowerCase().split(' ');
    
    let matches = 0;
    correctWords.forEach(word => {
      if (userWords.includes(word)) matches++;
    });
    
    return correctWords.length > 0 ? matches / correctWords.length : 0;
  }, []);

  const completeSession = useCallback(() => {
    const results: ReviewResults = {
      totalSentences: sessionResults.length,
      correctAnswers: sessionResults.filter(r => r.correct).length,
      averageTime: sessionResults.reduce((sum, r) => sum + r.responseTime, 0) / sessionResults.length,
      improvementAreas: analyzeImprovementAreas()
    };
    
    onComplete(results);
  }, [sessionResults, onComplete]);

  const analyzeImprovementAreas = (): string[] => {
    const areas: string[] = [];
    
    // 응답 시간 분석
    const avgTime = sessionResults.reduce((sum, r) => sum + r.responseTime, 0) / sessionResults.length;
    if (avgTime > 10000) areas.push('응답 속도 개선');
    
    // 정확도 분석
    const accuracy = sessionResults.filter(r => r.correct).length / sessionResults.length;
    if (accuracy < 0.7) areas.push('정확도 향상');
    
    // 어려운 문장 분석
    const hardSentenceErrors = sessionResults.filter(r => r.difficulty === 'hard' && !r.correct);
    if (hardSentenceErrors.length > 2) areas.push('고급 문법 집중 학습');
    
    return areas;
  };

  const getProgressPercentage = () => {
    return sentences.length > 0 ? ((currentIndex + 1) / sentences.length) * 100 : 0;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">개인 맞춤 복습 세션을 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">오늘 복습할 문장이 없습니다!</h3>
        <p className="text-gray-600">새로운 학습을 시작하거나 내일 다시 확인해보세요.</p>
      </div>
    );
  }

  const currentSentence = sentences[currentIndex];

  return (
    <ErrorBoundary 
      level="component"
      onError={(error, errorInfo) => {
        console.error('[DEBUG] SmartReviewSession 에러:', error, errorInfo);
      }}
    >
      <div className="max-w-4xl mx-auto p-6">
      {/* 진행률 및 통계 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">🧠 스마트 복습</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">정답: {sessionStats.correct}</span>
            <span className="text-gray-600">총계: {sessionStats.total}</span>
            <span className="text-blue-600">연속: {sessionStats.streak}</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>{currentIndex + 1} / {sentences.length}</span>
          <span className={getDifficultyColor(currentSentence.difficulty)}>
            {currentSentence.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* 문장 정보 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-sm text-gray-500">{currentSentence.stage}</span>
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              Level {currentSentence.level}
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-lg text-gray-900 mb-2">다음 문장을 영어로 번역하세요:</p>
          <p className="text-xl font-medium text-blue-900 bg-blue-50 p-4 rounded-lg">
            {currentSentence.kr}
          </p>
        </div>

        {/* 답변 입력 */}
        <div className="mb-6">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="영어 번역을 입력하세요..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={showAnswer}
          />
        </div>

        {/* 답변 확인 또는 결과 */}
        {!showAnswer ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            답변 확인
          </button>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">정답:</h4>
              <p className="text-lg text-gray-800">{currentSentence.en}</p>
              
              <h4 className="font-medium text-gray-900 mt-4 mb-2">내 답변:</h4>
              <p className="text-lg text-blue-800">{userAnswer}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">이 문제의 난이도는 어떠셨나요?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDifficultyFeedback('easy')}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                >
                  😊 쉬웠어요
                </button>
                <button
                  onClick={() => handleDifficultyFeedback('medium')}
                  className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                >
                  🤔 보통이에요
                </button>
                <button
                  onClick={() => handleDifficultyFeedback('hard')}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                >
                  😅 어려웠어요
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 세션 통계 (실시간) */}
      {sessionStats.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">현재 세션 통계</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {Math.round((sessionStats.correct / sessionStats.total) * 100)}%
              </div>
              <div className="text-gray-600">정확도</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{sessionStats.maxStreak}</div>
              <div className="text-gray-600">최고 연속</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {sessionResults.length > 0 ? 
                  Math.round(sessionResults.reduce((sum, r) => sum + r.responseTime, 0) / sessionResults.length / 1000) : 0}초
              </div>
              <div className="text-gray-600">평균 시간</div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
});

SmartReviewSession.displayName = 'SmartReviewSession';

export default SmartReviewSession;