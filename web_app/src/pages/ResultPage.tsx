import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore, useUser } from '@/store/useAppStore';

interface SessionSummary {
  totalCards: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
  totalTime: number;
  averageTimePerCard: number;
}

interface LocationState {
  summary: SessionSummary;
  level: number;
  stage: number;
}

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { setUser } = useAppStore();
  
  const state = location.state as LocationState;
  
  if (!state || !state.summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">결과를 찾을 수 없습니다</p>
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

  const { summary, level, stage } = state;
  
  // Determine if user passed the stage (80% accuracy threshold)
  const passed = summary.accuracy >= 80;
  
  // Calculate next level/stage
  const getNextStage = () => {
    if (passed) {
      if (stage < 10) {
        return { level, stage: stage + 1 };
      } else if (level < 10) {
        return { level: level + 1, stage: 1 };
      } else {
        return { level: 10, stage: 10 }; // Max level reached
      }
    }
    return { level, stage }; // Stay at current stage if failed
  };

  const handleContinue = () => {
    if (passed) {
      const nextStage = getNextStage();
      setUser({
        level: nextStage.level,
        stage: nextStage.stage,
      });
    }
    navigate('/');
  };

  const handleRetry = () => {
    navigate('/study');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  const getPerformanceLevel = (accuracy: number) => {
    if (accuracy >= 95) return { level: '완벽!', color: 'text-green-600', emoji: '🌟' };
    if (accuracy >= 80) return { level: '우수', color: 'text-blue-600', emoji: '🎉' };
    if (accuracy >= 60) return { level: '보통', color: 'text-yellow-600', emoji: '👍' };
    return { level: '재도전', color: 'text-red-600', emoji: '💪' };
  };

  const performance = getPerformanceLevel(summary.accuracy);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{performance.emoji}</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            세션 완료
          </h1>
          <p className="text-gray-600">
            Level {level}.{stage} 결과
          </p>
        </div>

        {/* Overall Performance */}
        <div className={`text-center mb-8 p-6 rounded-lg ${
          passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 ${
            passed ? 'text-green-800' : 'text-red-800'
          }`}>
            {passed ? '🎉 통과!' : '💪 재도전!'}
          </h2>
          <p className={`text-lg ${performance.color}`}>
            {performance.level}
          </p>
        </div>

        {/* Detailed Stats */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎯</span>
              <span className="font-medium">정확도</span>
            </div>
            <span className={`text-xl font-bold ${performance.color}`}>
              {summary.accuracy}%
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <span className="font-medium">평균 점수</span>
            </div>
            <span className="text-xl font-bold text-blue-600">
              {summary.averageScore}/100
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <span className="font-medium">정답/전체</span>
            </div>
            <span className="text-xl font-bold text-green-600">
              {summary.correctAnswers}/{summary.totalCards}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⏱️</span>
              <span className="font-medium">총 시간</span>
            </div>
            <span className="text-xl font-bold text-purple-600">
              {formatTime(summary.totalTime)}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🚀</span>
              <span className="font-medium">문제당 평균시간</span>
            </div>
            <span className="text-xl font-bold text-indigo-600">
              {summary.averageTimePerCard}초
            </span>
          </div>
        </div>

        {/* Progress Message */}
        {passed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-center text-blue-800">
              {level === 10 && stage === 10 ? (
                <p className="font-medium">🏆 모든 레벨을 완료했습니다!</p>
              ) : stage === 10 ? (
                <p className="font-medium">
                  🎉 Level {level} 완료! Level {level + 1}으로 진급합니다
                </p>
              ) : (
                <p className="font-medium">
                  🎯 Stage {stage + 1}로 진행합니다
                </p>
              )}
            </div>
          </div>
        )}

        {!passed && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="text-center text-orange-800">
              <p className="font-medium">
                💪 80% 이상의 정확도가 필요합니다
              </p>
              <p className="text-sm mt-1">
                다시 도전해서 실력을 향상시켜보세요!
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {passed ? (
            <button
              onClick={handleContinue}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
            >
              {level === 10 && stage === 10 ? '🏆 완료' : '🚀 다음 단계로'}
            </button>
          ) : (
            <button
              onClick={handleRetry}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
            >
              💪 다시 도전하기
            </button>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🏠 홈으로 돌아가기
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">💡 학습 팁</h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li>• 정확한 발음보다는 자연스러운 억양에 집중하세요</li>
            <li>• 틀린 문제는 정답을 듣고 따라 말해보세요</li>
            <li>• 매일 조금씩이라도 꾸준히 연습하는 것이 중요합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
};