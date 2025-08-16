import React, { useState, useEffect, useCallback } from 'react';
import { stageFocusService, type StageFocusSettings, type StageFocusSession, type StageFocusQuestion, type SpeedLevel } from '@/services/stageFocusMode';

interface StageFocusSessionProps {
  userId: string;
  settings: StageFocusSettings;
  onComplete: (results: any) => void;
  onExit: () => void;
}

export const StageFocusSessionComponent: React.FC<StageFocusSessionProps> = ({
  userId,
  settings,
  onComplete,
  onExit
}) => {
  const [session, setSession] = useState<StageFocusSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isWaitingForDelay, setIsWaitingForDelay] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [delayTimeLeft, setDelayTimeLeft] = useState(0);
  const [isAnswering, setIsAnswering] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // 속도별 지연 시간 (밀리초)
  const getDelayTime = (speedLevel: SpeedLevel): number => {
    switch (speedLevel) {
      case 'slow': return 3000;   // 3초
      case 'medium': return 2000; // 2초
      case 'fast': return 1000;   // 1초
      default: return 2000;
    }
  };

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSession = await stageFocusService.createStageFocusSession(userId, settings);
        setSession(newSession);
        setQuestionStartTime(Date.now());
      } catch (error) {
        console.error('Stage 집중 모드 세션 초기화 실패:', error);
      }
    };

    initSession();
  }, [userId, settings]);

  // 답변 제출
  const handleSubmit = async () => {
    if (!session || !isAnswering) return;

    const currentQuestion = session.questions[currentQuestionIndex];
    const responseTime = Date.now() - questionStartTime;

    setIsAnswering(false);

    try {
      const { result, feedback } = await stageFocusService.processAnswer(
        session.sessionId,
        currentQuestion,
        userAnswer,
        responseTime
      );

      setCurrentResult({ result, feedback });

      // 즉시 피드백 표시
      if (settings.immediateCorrection && !feedback.isCorrect) {
        setShowCorrectAnswer(true);
        
        // 정답 자동 발화 (TTS가 있다면)
        if (settings.autoPlayCorrectAnswer && feedback.shouldPlayAudio) {
          // TTS 호출 (실제 구현에서는 TTS 서비스 사용)
          speakText(feedback.correctAnswer);
        }
      }

      // 지연 시간 시작
      startDelayTimer();

    } catch (error) {
      console.error('답변 처리 실패:', error);
    }
  };

  // 지연 타이머 시작
  const startDelayTimer = () => {
    const delayMs = getDelayTime(settings.speedLevel);
    setIsWaitingForDelay(true);
    setDelayTimeLeft(Math.ceil(delayMs / 1000));

    const timer = setInterval(() => {
      setDelayTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          proceedToNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 다음 문제로 진행
  const proceedToNextQuestion = () => {
    if (!session) return;

    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer('');
      setShowCorrectAnswer(false);
      setCurrentResult(null);
      setIsWaitingForDelay(false);
      setIsAnswering(true);
      setQuestionStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  // 세션 완료
  const completeSession = async () => {
    if (!session) return;

    try {
      const results = await stageFocusService.completeSession(session.sessionId);
      onComplete(results);
    } catch (error) {
      console.error('세션 완료 실패:', error);
    }
  };

  // TTS 함수 (실제 구현에서는 Web Speech API 또는 외부 TTS 서비스 사용)
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // 건너뛰기 (긴급 상황용)
  const handleSkip = () => {
    if (isWaitingForDelay) {
      proceedToNextQuestion();
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Stage 집중 모드를 준비하고 있습니다...</div>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🎯 Stage {settings.stage} 집중 연습
            </h1>
            <p className="text-gray-600">
              문제 {currentQuestionIndex + 1} / {session.questions.length}
              {currentQuestion.repeatIndex > 1 && (
                <span className="ml-2 text-blue-600 font-medium">
                  (반복 #{currentQuestion.repeatIndex})
                </span>
              )}
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">속도 설정</div>
            <div className={`text-lg font-bold ${
              settings.speedLevel === 'fast' ? 'text-red-600' :
              settings.speedLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {settings.speedLevel === 'fast' ? '⚡ 빠름 (1초)' :
               settings.speedLevel === 'medium' ? '🚀 보통 (2초)' : '🐌 느림 (3초)'}
            </div>
          </div>
        </div>

        {/* 진행률 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 설정 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>📝 {settings.repeatCount}문장 선택</div>
          <div>🔀 {settings.shuffleQuestions ? '랜덤 순서' : '순차 진행'}</div>
          <div>⚡ {settings.immediateCorrection ? '즉시 정정' : '일반 모드'}</div>
          {settings.autoPlayCorrectAnswer && <div>🔊 정답 자동 발화</div>}
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Level {settings.level}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {currentQuestion.front_ko}
          </h2>

          {/* 정답 표시 (오답 시) */}
          {showCorrectAnswer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-green-700 mb-1">정답</div>
              <div className="text-lg font-medium text-green-800">
                {currentQuestion.target_en}
              </div>
            </div>
          )}
        </div>

        {/* 답변 입력 또는 대기 화면 */}
        {!isWaitingForDelay ? (
          <div className="space-y-4">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && isAnswering && userAnswer.trim() && handleSubmit()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="영어로 답변하세요..."
              disabled={!isAnswering}
              autoFocus
            />
            
            <button
              onClick={handleSubmit}
              disabled={!isAnswering || !userAnswer.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
            >
              {isAnswering ? '답변 제출' : '처리 중...'}
            </button>
          </div>
        ) : (
          /* 지연 대기 화면 */
          <div className="text-center py-8">
            <div className="mb-4">
              {currentResult?.feedback?.isCorrect ? (
                <div className="text-green-600 text-xl font-bold mb-2">
                  ✅ {currentResult.feedback.encouragement}
                </div>
              ) : (
                <div className="text-red-600 text-xl font-bold mb-2">
                  ❌ {currentResult.feedback.encouragement}
                </div>
              )}
            </div>
            
            <div className="text-4xl font-bold text-gray-700 mb-2">
              {delayTimeLeft}
            </div>
            <div className="text-gray-600 mb-4">초 후 다음 문제</div>
            
            <button
              onClick={handleSkip}
              className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
            >
              건너뛰기 →
            </button>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="flex justify-between items-center">
        <button
          onClick={onExit}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          나가기
        </button>
        
        <div className="text-sm text-gray-600">
          {!isWaitingForDelay && '⏎ Enter로 빠른 제출'}
        </div>
        
        <div className="text-sm text-gray-600">
          {Math.round(progress)}% 완료
        </div>
      </div>
    </div>
  );
};