import React, { useState, memo, useCallback } from 'react';
import { useSRSEngine } from '@/hooks/useSRSEngine';
import { QuestionItem } from '@/data/patternData';

export interface ReviewSystemProps {
  className?: string;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = memo(({ className = '' }) => {
  // 🔧 새 SRS 시스템 사용
  const srsEngine = useSRSEngine({ userId: 'current-user' });

  // 레거시 API와의 호환성을 위한 어댑터 로직
  const dueReviews = srsEngine.cards.filter(card => card.isDue);
  const mistakeCount = srsEngine.stats.totalReviews - srsEngine.stats.correctReviews;
  const reviewCount = srsEngine.stats.totalReviews;
  const masteredCount = srsEngine.cards.filter(card => card.memory.interval > 14).length;

  const [selectedMode, setSelectedMode] = useState<'all' | 'pattern' | 'weak-patterns'>('all');
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [reviewQuestions, setReviewQuestions] = useState<QuestionItem[]>([]);

  // 🔧 새 SRS 시스템과 호환되도록 어댑터 구현
  const availablePatterns = Array.from(new Set(
    dueReviews.map(review => review.content.korean || '기본 패턴')
  )).sort();

  const getReviewQuestions = useCallback((mode: string, pattern?: string): QuestionItem[] => {
    // 새 SRS 시스템에서 복습 카드를 QuestionItem 형태로 변환
    const filteredCards = srsEngine.cards.filter(card => {
      if (!card.isDue) return false;

      if (mode === 'pattern' && pattern) {
        return card.content.korean?.includes(pattern) || card.content.english?.includes(pattern);
      }
      if (mode === 'weak-patterns') {
        return card.memory.easeFactor < 2.0; // 어려운 카드만
      }
      return true; // 'all' mode
    });

    // ReviewCard를 QuestionItem으로 변환
    return filteredCards.map(card => ({
      id: card.id,
      korean: card.content.korean || '',
      english: card.content.english || '',
      level: card.content.level || 1,
      stage: 1, // 기본값
      pattern: card.content.korean || '기본 패턴',
      verb: '',
      timestamp: Date.now()
    }));
  }, [srsEngine.cards]);

  const handleStartReview = useCallback(() => {
    const questions = getReviewQuestions(selectedMode, selectedPattern);
    setReviewQuestions(questions);
    console.log(`복습 시작: ${selectedMode} 모드, ${questions.length}개 문제`);
  }, [getReviewQuestions, selectedMode, selectedPattern]);

  const handleModeChange = useCallback((mode: 'all' | 'pattern' | 'weak-patterns') => {
    setSelectedMode(mode);
    if (mode !== 'pattern') {
      setSelectedPattern('');
    }
  }, []);

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  if (reviewQuestions.length > 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">
                복습이 시작되었습니다!
              </h3>
              <p className="text-green-700">
                총 {reviewQuestions.length}개의 문제가 준비되었습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">복습 진행 중</span>
            </div>
            <button
              onClick={() => setReviewQuestions([])}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="복습 종료하기"
            >
              복습 종료
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} role="region" aria-label="Review system dashboard">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" role="group" aria-label="Review statistics">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">❌</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{mistakeCount}</div>
            <div className="text-sm text-blue-600 font-medium">총 틀린 문제</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">⏰</span>
            </div>
            <div className="text-2xl font-bold text-orange-800">{dueReviews.length}</div>
            <div className="text-sm text-orange-600 font-medium">복습 대기중</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">📚</span>
            </div>
            <div className="text-2xl font-bold text-purple-800">{reviewCount}</div>
            <div className="text-sm text-purple-600 font-medium">복습 진행중</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✅</span>
            </div>
            <div className="text-2xl font-bold text-green-800">{masteredCount}</div>
            <div className="text-sm text-green-600 font-medium">마스터 완료</div>
          </div>
        </div>
      </div>

      {/* Review Mode Selection */}
      {dueReviews.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">📖</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              복습 시작하기
            </h3>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="복습 모드 선택">
              <button
                onClick={() => handleModeChange('all')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 ${
                  selectedMode === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                role="radio"
                aria-checked={selectedMode === 'all'}
                aria-label={`전체 복습 ${dueReviews.length}개 문제`}
              >
                <span className="flex items-center space-x-2">
                  <span>🌍</span>
                  <span>전체 복습 ({dueReviews.length}개)</span>
                </span>
              </button>
              
              <button
                onClick={() => handleModeChange('pattern')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 ${
                  selectedMode === 'pattern'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                role="radio"
                aria-checked={selectedMode === 'pattern'}
                aria-label="패턴별 복습"
              >
                <span className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>패턴별 복습</span>
                </span>
              </button>
              
              <button
                onClick={() => handleModeChange('weak-patterns')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 ${
                  selectedMode === 'weak-patterns'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                role="radio"
                aria-checked={selectedMode === 'weak-patterns'}
                aria-label="약한 패턴 집중 복습"
              >
                <span className="flex items-center space-x-2">
                  <span>🔥</span>
                  <span>약한 패턴 집중</span>
                </span>
              </button>
            </div>

            {/* Pattern Selection (only for pattern mode) */}
            {selectedMode === 'pattern' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 animate-fade-in">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                  <span className="text-blue-500">🎯</span>
                  <span>복습할 패턴 선택:</span>
                </label>
                <select
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                  aria-label="복습할 패턴 선택"
                >
                  <option value="">패턴을 선택하세요</option>
                  {availablePatterns.map(pattern => {
                    const patternCount = dueReviews.filter(r => r.pattern === pattern).length;
                    return (
                      <option key={pattern} value={pattern}>
                        {pattern} ({patternCount}개)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Start Review Button */}
          <button
            onClick={handleStartReview}
            disabled={selectedMode === 'pattern' && !selectedPattern}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            aria-label="선택한 모드로 복습 시작하기"
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🚀</span>
              <span>복습 시작하기</span>
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-8 text-center shadow-lg animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            복습할 문제가 없습니다!
          </h3>
          <p className="text-gray-600 mb-4">
            모든 문제를 마스터했거나 아직 복습 시간이 되지 않았습니다.
          </p>
          <div className="inline-flex items-center space-x-2 text-green-600 font-medium">
            <span>✨</span>
            <span>훌륭한 진전입니다!</span>
          </div>
        </div>
      )}

      {/* Due Reviews List */}
      {dueReviews.length > 0 && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-xl">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span className="text-blue-500">📋</span>
              <span>복습 대기 목록 ({dueReviews.length}개)</span>
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {dueReviews.slice(0, 10).map((review, _index) => (
              <div key={review.id} className="px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 mb-1">{review.korean}</div>
                    <div className="text-sm text-gray-600 mb-2">{review.english}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
                        📝 {review.pattern}
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">
                        ❌ {review.mistakeCount}번
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full font-medium">
                        📚 {review.reviewStage + 1}/4단계
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 ml-4 text-right">
                    <div className="font-medium">{formatTimeAgo(review.lastMistake)}</div>
                  </div>
                </div>
              </div>
            ))}
            {dueReviews.length > 10 && (
              <div className="px-6 py-3 text-center text-gray-500 text-sm">
                그 외 {dueReviews.length - 10}개 더...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Button (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6">
          <button
            onClick={() => console.log('SRS Engine Debug:', srsEngine)}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            aria-label="개발용 디버그 정보 출력"
          >
            🐛 디버그 출력
          </button>
        </div>
      )}
    </div>
  );
});

ReviewSystem.displayName = 'ReviewSystem';

// Add custom CSS animations
const reviewStyles = `
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.4s ease-out;
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`;

// Inject styles for ReviewSystem
if (typeof document !== 'undefined' && !document.getElementById('review-system-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'review-system-styles';
  styleElement.textContent = reviewStyles;
  document.head.appendChild(styleElement);
}