import React from 'react';
import type { FeedbackResponse } from '@/types';

interface FeedbackPanelProps {
  feedback: FeedbackResponse;
  onPlayAnswer?: () => void;
  canPlayAnswer?: boolean;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  feedback,
  onPlayAnswer,
  canPlayAnswer = false,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-accent-600';
    if (score >= 75) return 'text-primary-600';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return '✓';
    if (score >= 75) return '✓';
    if (score >= 50) return '✓';
    return '✗';
  };

  const getBorderColor = (correct: boolean) => {
    return correct ? 'border-accent-200 bg-accent-50' : 'border-warning bg-opacity-10 border-opacity-20';
  };

  return (
    <div className={`rounded-lg border p-8 mb-8 ${getBorderColor(feedback.correct)}`}>
      {/* Score Display */}
      <div className="text-center mb-8">
        <div className="text-display mb-4">
          {feedback.correct ? '✓' : '✗'}
        </div>
        <h3 className={`text-h1 ${feedback.correct ? 'text-accent-800' : 'text-warning'}`}>
          {feedback.feedback_ko}
        </h3>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <span className="text-h2">{getScoreIcon(feedback.score)}</span>
          <span className={`text-h2 ${getScoreColor(feedback.score)}`}>
            {feedback.score}/100점
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4 text-caption">
        {/* What you said */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <span className="text-primary-500 font-medium shrink-0">당신의 답:</span>
            <span className="text-secondary-700 font-mono">"{feedback.sttText}"</span>
          </div>
        </div>

        {/* Correct answer */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <span className="text-accent-500 font-medium shrink-0">정답:</span>
              <span className="text-secondary-700 font-mono">"{feedback.target_en}"</span>
            </div>
            {canPlayAnswer && onPlayAnswer && (
              <button
                onClick={onPlayAnswer}
                className="ml-4 px-4 py-2 bg-primary-500 text-white text-small rounded-lg hover:bg-primary-600 shrink-0"
                title="정답 듣기"
              >
                듣기
              </button>
            )}
          </div>
        </div>

        {/* Correction (if different from target) */}
        {feedback.correction && feedback.correction !== feedback.target_en && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <span className="text-secondary-500 font-medium shrink-0">교정:</span>
              <span className="text-secondary-700">"{feedback.correction}"</span>
            </div>
          </div>
        )}

        {/* Hint */}
        {feedback.hint_ko && (
          <div className="bg-primary-50 border-l-4 border-primary-400 p-4">
            <div className="flex items-start space-x-4">
              <span className="text-primary-600 font-medium shrink-0">힌트:</span>
              <span className="text-primary-800">{feedback.hint_ko}</span>
            </div>
          </div>
        )}
      </div>

      {/* Score breakdown for learning */}
      <div className="mt-8 pt-8 border-t border-secondary-200">
        <div className="grid grid-cols-2 gap-4 text-small text-secondary-500">
          <div className="text-center">
            <div className="font-medium mb-2">통과 기준</div>
            <div>80점 이상</div>
          </div>
          <div className="text-center">
            <div className="font-medium mb-2">현재 점수</div>
            <div className={`font-bold ${getScoreColor(feedback.score)}`}>
              {feedback.score}점 {feedback.correct ? '(통과!)' : '(재도전)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};