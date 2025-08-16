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
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟';
    if (score >= 75) return '👍';
    if (score >= 50) return '💪';
    return '🎯';
  };

  const getBorderColor = (correct: boolean) => {
    return correct ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50';
  };

  return (
    <div className={`rounded-lg shadow-lg p-6 mb-8 border-2 ${getBorderColor(feedback.correct)}`}>
      {/* Score Display */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">
          {feedback.correct ? '✅' : '⚠️'}
        </div>
        <h3 className={`text-xl font-bold ${feedback.correct ? 'text-green-800' : 'text-yellow-800'}`}>
          {feedback.feedback_ko}
        </h3>
        <div className="flex items-center justify-center space-x-2 mt-2">
          <span className="text-2xl">{getScoreEmoji(feedback.score)}</span>
          <span className={`text-lg font-bold ${getScoreColor(feedback.score)}`}>
            {feedback.score}/100점
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4 text-sm">
        {/* What you said */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 font-medium shrink-0">🎤 당신의 답:</span>
            <span className="text-gray-700 font-mono">"{feedback.sttText}"</span>
          </div>
        </div>

        {/* Correct answer */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <span className="text-green-500 font-medium shrink-0">✅ 정답:</span>
              <span className="text-gray-700 font-mono">"{feedback.target_en}"</span>
            </div>
            {canPlayAnswer && onPlayAnswer && (
              <button
                onClick={onPlayAnswer}
                className="ml-4 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 shrink-0"
                title="정답 듣기"
              >
                🔊
              </button>
            )}
          </div>
        </div>

        {/* Correction (if different from target) */}
        {feedback.correction && feedback.correction !== feedback.target_en && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-purple-500 font-medium shrink-0">📝 교정:</span>
              <span className="text-gray-700">"{feedback.correction}"</span>
            </div>
          </div>
        )}

        {/* Hint */}
        {feedback.hint_ko && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 font-medium shrink-0">💡 힌트:</span>
              <span className="text-blue-800">{feedback.hint_ko}</span>
            </div>
          </div>
        )}
      </div>

      {/* Score breakdown for learning */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div className="text-center">
            <div className="font-medium">통과 기준</div>
            <div>80점 이상</div>
          </div>
          <div className="text-center">
            <div className="font-medium">현재 점수</div>
            <div className={`font-bold ${getScoreColor(feedback.score)}`}>
              {feedback.score}점 {feedback.correct ? '(통과!)' : '(재도전)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};