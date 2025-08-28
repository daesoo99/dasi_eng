/**
 * ReviewCard Component - 복습 카드 UI 컴포넌트
 */

import React, { useState } from 'react';

interface ReviewItem {
  id: string;
  type: 'sentence' | 'pattern' | 'word';
  content: string;
  translation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  dueDate: Date;
  reviewCount: number;
  lastScore?: number;
  associatedWords?: string[]; // 관련 단어들
}

interface ReviewCardProps {
  reviewItem: ReviewItem;
  onComplete: (itemId: string, result: ReviewResult) => void;
  onSkip?: (itemId: string) => void;
  showTranslation?: boolean;
}

interface ReviewResult {
  score: number; // 0-100
  timeSpent: number; // seconds
  confidence: 'low' | 'medium' | 'high';
  needsReview: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  reviewItem,
  onComplete,
  onSkip,
  showTranslation = false
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [startTime] = useState(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sentence': return '📝';
      case 'pattern': return '🔤';
      case 'word': return '📚';
      default: return '📖';
    }
  };

  const getDaysOverdue = () => {
    const now = new Date();
    const due = new Date(reviewItem.dueDate);
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const playAudio = () => {
    // TODO: TTS를 활용한 음성 재생
    console.log('Playing audio for:', reviewItem.content);
  };

  const handleComplete = (confidence: 'low' | 'medium' | 'high') => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const score = confidence === 'high' ? 90 : confidence === 'medium' ? 70 : 40;
    
    const result: ReviewResult = {
      score,
      timeSpent,
      confidence,
      needsReview: confidence === 'low'
    };

    setIsCompleted(true);
    onComplete(reviewItem.id, result);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip(reviewItem.id);
    }
  };

  const daysOverdue = getDaysOverdue();
  const isOverdue = daysOverdue > 0;

  if (isCompleted) {
    return (
      <div className="review-card completed bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">복습 완료!</h3>
          <p className="text-green-600">다음 복습까지 잘 기억해 보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`review-card border-2 rounded-lg p-6 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      {/* 헤더 */}
      <div className="card-header flex justify-between items-start mb-4">
        <div className="item-info flex items-center gap-2">
          <span className="type-icon text-xl">{getTypeIcon(reviewItem.type)}</span>
          <span className={`difficulty-badge px-2 py-1 rounded border text-xs font-medium ${getDifficultyColor(reviewItem.difficulty)}`}>
            {reviewItem.difficulty}
          </span>
          {isOverdue && (
            <span className="overdue-badge px-2 py-1 rounded bg-red-200 text-red-800 text-xs font-medium">
              {daysOverdue}일 연체
            </span>
          )}
        </div>
        
        <div className="review-stats text-xs text-gray-500">
          <div>복습 {reviewItem.reviewCount}회</div>
          {reviewItem.lastScore && (
            <div>이전 점수: {reviewItem.lastScore}/100</div>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="card-content mb-6">
        <div className="main-content mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {reviewItem.content}
            </h3>
            <button
              onClick={playAudio}
              className="play-audio-btn text-blue-500 hover:text-blue-700 text-xl"
              title="음성 재생"
            >
              🔊
            </button>
          </div>
          
          {showTranslation && reviewItem.translation && (
            <div className="translation text-gray-600 italic mb-2">
              "{reviewItem.translation}"
            </div>
          )}

          {/* 관련 단어들 */}
          {reviewItem.associatedWords && reviewItem.associatedWords.length > 0 && (
            <div className="associated-words">
              <h4 className="text-sm font-medium text-gray-600 mb-2">관련 단어:</h4>
              <div className="flex flex-wrap gap-2">
                {reviewItem.associatedWords.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 답안 표시 버튼 */}
        {!showAnswer && reviewItem.type !== 'word' && (
          <button
            onClick={() => setShowAnswer(true)}
            className="show-answer-btn bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            답 확인하기
          </button>
        )}

        {/* 답안 영역 */}
        {(showAnswer || reviewItem.type === 'word') && (
          <div className="answer-section bg-blue-50 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-blue-800 mb-2">학습 포인트:</h4>
            <div className="answer-content text-blue-700">
              {/* TODO: 실제 답안/설명 콘텐츠 렌더링 */}
              <p>이 문장의 핵심은... (답안 설명이 들어갈 예정)</p>
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="card-actions">
        <div className="confidence-selector mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이해도를 평가해 주세요:
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedConfidence(level)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedConfidence === level
                    ? level === 'high' 
                      ? 'bg-green-500 text-white'
                      : level === 'medium'
                      ? 'bg-yellow-500 text-white'  
                      : 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {level === 'high' ? '잘 알겠음' : level === 'medium' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
        </div>

        <div className="action-buttons flex gap-3">
          <button
            onClick={() => handleComplete(selectedConfidence)}
            className="complete-btn flex-1 bg-blue-500 text-white py-3 rounded-md font-medium hover:bg-blue-600 transition-colors"
          >
            복습 완료
          </button>
          
          {onSkip && (
            <button
              onClick={handleSkip}
              className="skip-btn px-4 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              나중에
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;