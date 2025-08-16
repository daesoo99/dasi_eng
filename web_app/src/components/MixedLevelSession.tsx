import React, { useState, useEffect } from 'react';
import { speedDifficultyService, type SpeedSession, type MixedLevelSettings } from '@/services/speedDifficultyModes';

interface MixedLevelSessionProps {
  userId: string;
  settings: MixedLevelSettings;
  questionCount: number;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export const MixedLevelSession: React.FC<MixedLevelSessionProps> = ({
  userId,
  settings,
  questionCount,
  onComplete,
  onExit
}) => {
  const [session, setSession] = useState<SpeedSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isAnswering, setIsAnswering] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [levelStats, setLevelStats] = useState<Record<number, { correct: number; total: number }>>({});

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSession = await speedDifficultyService.createMixedLevelSession(userId, settings, questionCount);
        setSession(newSession);
        
        // 레벨별 통계 초기화
        const stats: Record<number, { correct: number; total: number }> = {};
        settings.includedLevels.forEach(level => {
          stats[level] = { correct: 0, total: 0 };
        });
        setLevelStats(stats);
        
      } catch (error) {
        console.error('레벨 혼합 모드 세션 초기화 실패:', error);
      }
    };

    initSession();
  }, [userId, settings, questionCount]);

  // 답변 제출
  const handleSubmit = async () => {
    if (!session || !isAnswering) return;

    setIsAnswering(false);
    
    try {
      const currentQuestion = session.questions[currentQuestionIndex];
      const responseTime = 4000; // 레벨 혼합 모드는 적당한 시간
      
      const result = await speedDifficultyService.processAnswer(
        session.sessionId,
        currentQuestion.questionId,
        userAnswer,
        responseTime
      );

      setResults(prev => [...prev, result]);
      
      // 레벨별 통계 업데이트
      setLevelStats(prev => ({
        ...prev,
        [currentQuestion.level]: {
          correct: prev[currentQuestion.level].correct + (result.isCorrect ? 1 : 0),
          total: prev[currentQuestion.level].total + 1
        }
      }));

      // 잠시 결과 표시 후 다음 문제
      setTimeout(() => {
        if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setUserAnswer('');
          setIsAnswering(true);
        } else {
          completeSession();
        }
      }, 1500);

    } catch (error) {
      console.error('답변 처리 실패:', error);
    }
  };

  // 세션 완료
  const completeSession = async () => {
    if (!session) return;

    try {
      const finalResults = await speedDifficultyService.completeSession(session.sessionId);
      
      // 레벨별 상세 결과 추가
      const levelAnalysis = Object.entries(levelStats).map(([level, stats]) => ({
        level: parseInt(level),
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        correct: stats.correct,
        total: stats.total
      }));

      setShowResult(true);
      onComplete({
        ...finalResults,
        levelAnalysis
      });
      
    } catch (error) {
      console.error('세션 완료 실패:', error);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-gray-600">레벨 혼합 모드를 준비하고 있습니다...</div>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  if (showResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🎯 레벨 혼합 모드 완료!</h2>
            <p className="text-gray-600">다양한 레벨의 문제를 종합적으로 테스트했습니다</p>
          </div>
          
          {/* 전체 결과 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{results.filter(r => r.isCorrect).length}</div>
              <div className="text-sm text-gray-600">정답 수</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(((results.filter(r => r.isCorrect).length / results.length) * 100))}%
              </div>
              <div className="text-sm text-gray-600">전체 정확도</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {settings.includedLevels.length}개
              </div>
              <div className="text-sm text-gray-600">테스트한 레벨</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length / 1000).toFixed(1)}초
              </div>
              <div className="text-sm text-gray-600">평균 응답시간</div>
            </div>
          </div>

          {/* 레벨별 상세 결과 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 레벨별 상세 결과</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(levelStats).map(([level, stats]) => {
                const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                const levelColor = 
                  accuracy >= 80 ? 'green' :
                  accuracy >= 60 ? 'yellow' : 'red';
                
                return (
                  <div key={level} className={`bg-${levelColor}-50 border border-${levelColor}-200 rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold text-${levelColor}-800`}>Level {level}</h4>
                      <span className={`text-sm bg-${levelColor}-100 text-${levelColor}-700 px-2 py-1 rounded`}>
                        {stats.correct}/{stats.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${levelColor}-500 h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium text-${levelColor}-600`}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 강점과 약점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">💪 강점 레벨</h3>
              <div className="space-y-2">
                {Object.entries(levelStats)
                  .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) >= 0.8)
                  .map(([level, stats]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className="text-green-700">Level {level}</span>
                      <span className="text-green-600 font-medium">
                        {((stats.correct / stats.total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-3">🎯 개선 필요 레벨</h3>
              <div className="space-y-2">
                {Object.entries(levelStats)
                  .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.6)
                  .map(([level, stats]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className="text-red-700">Level {level}</span>
                      <span className="text-red-600 font-medium">
                        {((stats.correct / stats.total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 학습 권장사항 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📚 학습 권장사항</h3>
            <div className="space-y-2 text-blue-700">
              <div>
                • <strong>집중 학습:</strong> 정확도가 낮은 레벨을 우선적으로 복습하세요
              </div>
              <div>
                • <strong>균형 학습:</strong> 강점 레벨도 지속적으로 유지하세요
              </div>
              <div>
                • <strong>종합 복습:</strong> 레벨 혼합 모드를 정기적으로 실시하여 실력을 점검하세요
              </div>
            </div>
          </div>

          <button
            onClick={onExit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 레벨 혼합 모드</h1>
            <p className="text-gray-600">
              문제 {currentQuestionIndex + 1} / {session.questions.length}
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">진행률</div>
            <div className="text-xl font-bold text-green-600">{Math.round(progress)}%</div>
          </div>
        </div>

        {/* 진행률 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 레벨별 진행 현황 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {settings.includedLevels.map(level => {
            const stats = levelStats[level];
            const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            
            return (
              <div key={level} className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">L{level}</div>
                <div className="text-sm font-medium">
                  {stats.correct}/{stats.total}
                </div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? `${accuracy.toFixed(0)}%` : '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Level {currentQuestion.level}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentQuestion.difficulty}
            </span>
            {currentQuestion.tags.map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {currentQuestion.content}
          </h2>
        </div>

        {/* 답변 입력 */}
        <div className="space-y-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && isAnswering && userAnswer.trim() && handleSubmit()}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            placeholder="답을 입력하세요..."
            disabled={!isAnswering}
            autoFocus
          />
          
          <button
            onClick={handleSubmit}
            disabled={!isAnswering || !userAnswer.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
          >
            {isAnswering ? '답변 제출하기' : '처리 중...'}
          </button>
        </div>
      </div>

      {/* 설정 정보 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>
            📋 레벨: {settings.includedLevels.join(', ')}
          </div>
          <div>
            🔀 순서: {settings.randomOrder ? '랜덤' : '순차'}
          </div>
          <div>
            ⚖️ 난이도: {settings.balanceByDifficulty ? '균형' : '일반'}
          </div>
          {settings.adaptiveSelection && (
            <div>🎯 실력 맞춤: 활성화</div>
          )}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="flex justify-between">
        <button
          onClick={onExit}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          나가기
        </button>
        
        <div className="text-sm text-gray-600 flex items-center">
          Enter 키로 빠른 제출
        </div>
      </div>
    </div>
  );
};