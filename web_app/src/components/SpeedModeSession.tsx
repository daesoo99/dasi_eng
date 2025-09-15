import React, { useState, useEffect, useCallback } from 'react';
import { useSpeedTraining } from '@/hooks/useSpeedTraining';
import { type SpeedQuestion, type SpeedModeSettings, type DifficultyMode } from '@/services/speedDifficultyModes';

interface SpeedModeSessionProps {
  userId: string;
  settings: SpeedModeSettings;
  questionCount: number;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export const SpeedModeSession: React.FC<SpeedModeSessionProps> = ({
  userId,
  settings,
  questionCount,
  onComplete,
  onExit
}) => {
  // ✅ CLAUDE.local 규칙 준수: 플러그인 우선 아키텍처
  const speedTraining = useSpeedTraining(true);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      if (!speedTraining.isPluginReady) {
        console.log('⏳ Waiting for Speed Training Plugin to be ready...');
        return;
      }

      try {
        console.log('🚀 Creating speed training session via plugin...');
        const sessionOptions = {
          userId,
          mode: 'fast' as DifficultyMode,
          settings,
          questionCount
        };
        
        const newSession = await speedTraining.createSession(sessionOptions);
        if (newSession) {
          setTimeLeft(settings.timeLimit);
          setIsAnswering(true);
          setStartTime(Date.now());
          console.log('✅ Session created successfully via plugin');
        }
      } catch (error) {
        console.error('❌ 세션 초기화 실패:', error);
      }
    };

    initSession();
  }, [userId, settings, questionCount, speedTraining]);

  // 타이머
  useEffect(() => {
    if (!isAnswering || !settings.showTimer) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswering, settings.showTimer, handleTimeUp]);

  // 시간 초과 처리
  const handleTimeUp = useCallback(() => {
    if (!speedTraining.currentSession) return;
    
    const responseTime = Date.now() - startTime;
    processAnswer(userAnswer || '', responseTime, true);
  }, [speedTraining.currentSession, userAnswer, startTime, processAnswer]);

  // 답변 처리  
  const processAnswer = useCallback(async (answer: string, responseTime: number, timeExceeded = false) => {
    const { currentSession } = speedTraining;
    if (!currentSession) return;

    setIsAnswering(false);
    
    try {
      const currentQuestion = currentSession.questions[currentQuestionIndex];
      console.log('📝 Processing answer via plugin...', { 
        questionId: currentQuestion.questionId,
        answer, 
        responseTime 
      });
      
      // ✅ CLAUDE.local 규칙 준수: 플러그인을 통한 답변 처리
      const result = await speedTraining.processAnswer(
        currentQuestion.questionId,
        answer,
        responseTime
      );

      if (result) {
        result.timeExceeded = timeExceeded;
        setResults(prev => [...prev, result]);

        // 다음 문제 또는 완료
        setTimeout(() => {
          if (currentQuestionIndex < currentSession.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer('');
            setTimeLeft(settings.timeLimit);
            setIsAnswering(true);
            setStartTime(Date.now());
          } else {
            completeSession();
          }
        }, 1500);
      }

    } catch (error) {
      console.error('❌ 답변 처리 실패:', error);
    }
  }, [speedTraining, currentQuestionIndex, settings, completeSession]);

  // 답변 제출
  const handleSubmit = () => {
    const responseTime = Date.now() - startTime;
    processAnswer(userAnswer, responseTime);
  };

  // 세션 완료
  const completeSession = useCallback(async () => {
    const { currentSession } = speedTraining;
    if (!currentSession) return;

    try {
      console.log('🏁 Completing session via plugin...');
      // ✅ CLAUDE.local 규칙 준수: 플러그인을 통한 세션 완료
      const finalResults = await speedTraining.completeSession();
      if (finalResults) {
        setShowResult(true);
        onComplete(finalResults);
        console.log('✅ Session completed successfully via plugin');
      }
    } catch (error) {
      console.error('❌ 세션 완료 실패:', error);
    }
  }, [speedTraining, onComplete]);

  // Plugin loading state
  if (!speedTraining.isPluginReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Speed Training Plugin을 로딩 중...</div>
          {speedTraining.pluginError && (
            <div className="text-red-600 mt-2">오류: {speedTraining.pluginError}</div>
          )}
        </div>
      </div>
    );
  }

  // Session loading state  
  if (!speedTraining.currentSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">세션을 준비하고 있습니다...</div>
        </div>
      </div>
    );
  }

  const currentQuestion: SpeedQuestion = speedTraining.currentSession.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / speedTraining.currentSession.questions.length) * 100;
  
  // SpeedQuestion 타입의 모든 속성 활용한 문제 메타데이터
  const questionMeta = {
    id: currentQuestion.questionId,
    level: currentQuestion.level,
    stage: currentQuestion.stage,
    difficulty: currentQuestion.difficulty,
    tags: currentQuestion.tags,
    timeLimit: currentQuestion.timeLimit || settings.timeLimit,
    content: currentQuestion.content
  };

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">⚡ 빠른 모드 완료!</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{results.filter(r => r.isCorrect).length}</div>
              <div className="text-sm text-gray-600">정답 수</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(((results.filter(r => r.isCorrect).length / results.length) * 100))}%
              </div>
              <div className="text-sm text-gray-600">정확도</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-lg font-semibold text-gray-900 mb-2">평균 응답 시간</div>
            <div className="text-2xl font-bold text-purple-600">
              {(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length / 1000).toFixed(1)}초
            </div>
          </div>

          {settings.earlyFinishBonus && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <div className="text-lg font-semibold text-yellow-800 mb-2">⭐ 보너스 점수</div>
              <div className="text-xl font-bold text-yellow-600">
                +{results.reduce((sum, r) => sum + r.bonusPoints, 0)}점
              </div>
            </div>
          )}

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
            <h1 className="text-2xl font-bold text-gray-900">⚡ 빠른 모드</h1>
            <p className="text-gray-600">
              문제 {currentQuestionIndex + 1} / {speedTraining.currentSession.questions.length}
              {speedTraining.sessionProgress && (
                <span className="ml-2 text-sm">
                  (정답: {speedTraining.sessionProgress.correctAnswers})
                </span>
              )}
            </p>
          </div>
          
          {settings.showTimer && (
            <div className={`text-center ${timeLeft <= 1 ? 'animate-pulse text-red-600' : ''}`}>
              <div className="text-3xl font-bold">
                {timeLeft}
              </div>
              <div className="text-sm text-gray-600">초 남음</div>
            </div>
          )}
        </div>

        {/* 진행률 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Level {questionMeta.level} - Stage {questionMeta.stage}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
              questionMeta.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              questionMeta.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {questionMeta.difficulty}
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {questionMeta.timeLimit}초 제한
            </span>
          </div>
          
          {/* 태그 표시 */}
          {questionMeta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {questionMeta.tags.map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {questionMeta.content}
          </h2>
        </div>

        {/* 답변 입력 */}
        <div className="space-y-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && isAnswering && handleSubmit()}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="답을 입력하세요..."
            disabled={!isAnswering}
            autoFocus
          />
          
          <button
            onClick={handleSubmit}
            disabled={!isAnswering || !userAnswer.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
          >
            {isAnswering ? '제출하기' : '처리 중...'}
          </button>
        </div>
      </div>

      {/* 압박 수준 표시 */}
      {settings.pressureLevel === 'high' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-red-500">🔥</span>
            <span className="text-red-700 font-medium">고강도 모드 - 빠른 답변이 필요합니다!</span>
          </div>
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="flex justify-between">
        <button
          onClick={onExit}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          나가기
        </button>
        
        <div className="text-sm text-gray-600">
          Enter 키로 빠른 제출
        </div>
      </div>
    </div>
  );
};