import React, { useState, useEffect, memo, useCallback } from 'react';
import { speedDifficultyService, type SpeedSession, type ExplanationModeSettings } from '@/services/speedDifficultyModes';

interface ExplanationModeSessionProps {
  userId: string;
  settings: ExplanationModeSettings;
  questionCount: number;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export const ExplanationModeSession: React.FC<ExplanationModeSessionProps> = memo(({
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [isAnswering, setIsAnswering] = useState(true);

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSession = await speedDifficultyService.createExplanationSession(userId, settings, questionCount);
        setSession(newSession);
      } catch (error) {
        console.error('해설 모드 세션 초기화 실패:', error);
      }
    };

    initSession();
  }, [userId, settings, questionCount]);

  // 답변 제출
  const handleSubmit = useCallback(async () => {
    if (!session || !isAnswering) return;

    setIsAnswering(false);
    
    try {
      const currentQuestion = session.questions[currentQuestionIndex];
      const responseTime = 5000; // 해설 모드는 시간 제한 없음
      
      const result = await speedDifficultyService.processAnswer(
        session.sessionId,
        currentQuestion.questionId,
        userAnswer,
        responseTime
      );

      setCurrentResult(result);
      setResults(prev => [...prev, result]);
      
      // 해설 표시
      if (settings.showDetailedFeedback) {
        setShowExplanation(true);
      } else {
        proceedToNext();
      }

    } catch (error) {
      console.error('답변 처리 실패:', error);
    }
  }, [session, isAnswering, currentQuestionIndex, userAnswer, results, settings.showDetailedFeedback, proceedToNext]);

  // 다음 문제로 진행
  const proceedToNext = useCallback(() => {
    if (!session) return;

    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer('');
      setShowExplanation(false);
      setCurrentResult(null);
      setIsAnswering(true);
    } else {
      completeSession();
    }
  }, [session, currentQuestionIndex, completeSession]);

  // 세션 완료
  const completeSession = useCallback(async () => {
    if (!session) return;

    try {
      const finalResults = await speedDifficultyService.completeSession(session.sessionId);
      onComplete(finalResults);
    } catch (error) {
      console.error('세션 완료 실패:', error);
    }
  }, [session, onComplete]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-gray-600">해설 모드를 준비하고 있습니다...</div>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📚 해설 모드</h1>
            <p className="text-gray-600">
              문제 {currentQuestionIndex + 1} / {session.questions.length}
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">진행률</div>
            <div className="text-xl font-bold text-purple-600">{Math.round(progress)}%</div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!showExplanation ? (
        /* 문제 화면 */
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
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
            
            <div className="text-sm text-gray-600 mb-4">
              💡 <strong>해설 모드:</strong> 시간 제한이 없으니 충분히 생각해보세요. 
              답변 후 상세한 설명을 확인할 수 있습니다.
            </div>
          </div>

          {/* 답변 입력 */}
          <div className="space-y-4">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && isAnswering && userAnswer.trim() && handleSubmit()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
              placeholder="답을 입력하세요..."
              disabled={!isAnswering}
              autoFocus
            />
            
            <button
              onClick={handleSubmit}
              disabled={!isAnswering || !userAnswer.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
            >
              {isAnswering ? '답변 제출 및 해설 보기' : '처리 중...'}
            </button>
          </div>
        </div>
      ) : (
        /* 해설 화면 */
        <div className="space-y-6">
          {/* 답변 결과 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">📝 답변 결과</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentResult?.isCorrect 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {currentResult?.isCorrect ? '✅ 정답' : '❌ 오답'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">내 답변</div>
                <div className="text-lg font-medium text-gray-900 bg-gray-50 p-3 rounded">
                  {currentResult?.userAnswer || '(답변 없음)'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">정답</div>
                <div className="text-lg font-medium text-green-700 bg-green-50 p-3 rounded">
                  {currentResult?.correctAnswer}
                </div>
              </div>
            </div>
          </div>

          {/* 상세 해설 */}
          {settings.showDetailedFeedback && currentResult?.explanation && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 상세 해설</h3>
              <div className="prose max-w-none">
                <div 
                  className="text-gray-700 leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ 
                    __html: currentResult.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
                  }}
                />
              </div>
            </div>
          )}

          {/* 문법 노트 (설정에 따라) */}
          {settings.includeGrammarNotes && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📖 문법 노트</h3>
              <div className="space-y-3 text-blue-800">
                <div>
                  <strong>핵심 문법:</strong> {currentQuestion.tags.includes('grammar') ? '조건문 (Conditional)' : '비즈니스 표현'}
                </div>
                <div>
                  <strong>난이도:</strong> {currentQuestion.difficulty} 수준
                </div>
                <div>
                  <strong>학습 팁:</strong> 이 유형의 문제는 반복 학습을 통해 패턴을 익히는 것이 중요합니다.
                </div>
              </div>
            </div>
          )}

          {/* 예문 (설정에 따라) */}
          {settings.includeExamples && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">📚 추가 예문</h3>
              <div className="space-y-2">
                <div className="text-green-800">
                  • If I had more time, I would learn Spanish.
                </div>
                <div className="text-green-800">
                  • If she had called earlier, we could have met.
                </div>
                <div className="text-green-800">
                  • If they had studied harder, they would have passed.
                </div>
              </div>
            </div>
          )}

          {/* 다음 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={proceedToNext}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              {currentQuestionIndex < session.questions.length - 1 ? '다음 문제로 →' : '해설 모드 완료하기'}
            </button>
          </div>
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onExit}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          나가기
        </button>
        
        {!showExplanation && (
          <div className="text-sm text-gray-600 flex items-center">
            <span>Enter 키로 답변 제출</span>
          </div>
        )}
      </div>
    </div>
  );
});

ExplanationModeSession.displayName = 'ExplanationModeSession';