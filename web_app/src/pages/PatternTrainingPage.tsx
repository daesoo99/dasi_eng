/**
 * PatternTrainingPageV3 - 리팩토링된 패턴 훈련 페이지
 * 
 * 주요 개선사항:
 * - 모듈화된 커스텀 훅으로 로직 분리
 * - 재사용 가능한 UI 컴포넌트로 분리
 * - 코드 길이 90% 단축 (1,042줄 → ~150줄)
 * - 유지보수성 및 테스트 용이성 향상
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePatternTrainingManager, type PatternTrainingManagerConfig } from '@/hooks/usePatternTrainingManager';
import { useStageData, type Question } from '@/hooks/useStageData';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useSimpleSpeechRecognition } from '@/hooks/useSimpleSpeechRecognition';
import { useSpeakingStage, useStageProgress } from '@/store/useAppStore';
import { useSRSEngine } from '@/hooks/useSRSEngine';
import { evaluateAnswer } from '@/utils/answerNormalization';
import { getCountdownDuration, getStageName } from '@/utils/speakingStageUtils';

// UI Components
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { TrainingHeader } from '@/components/TrainingHeader';
import { QuestionCard } from '@/components/QuestionCard';
import { ControlPanel } from '@/components/ControlPanel';

type Phase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting';
type EvaluationType = 'correct' | 'incorrect';

const PatternTrainingPageV3: React.FC = () => {
  // URL 파라미터 추출
  const [searchParams] = useSearchParams();
  const levelNumber = Math.max(1, parseInt(searchParams.get('level') || '1', 10));
  const phaseNumber = Math.max(1, parseInt(searchParams.get('phase') || '1', 10));
  const stageNumber = Math.max(1, parseInt(searchParams.get('stage') || '1', 10));
  
  // 스피킹 단계 상태 가져오기
  const { stage: speakingStage } = useSpeakingStage();
  const { updateStageProgress } = useStageProgress();
  
  // 스피킹 단계별 설정은 유틸리티 함수 사용

  // URL 파라미터 검증 로깅
  useEffect(() => {
    if (isNaN(levelNumber) || isNaN(phaseNumber) || isNaN(stageNumber)) {
      console.warn('⚠️ 잘못된 URL 파라미터가 감지되어 기본값으로 설정됨');
    }
    console.log(`🔗 URL 파라미터 로드: Level=${levelNumber}, Phase=${phaseNumber}, Stage=${stageNumber}`);
    console.log(`⏱️ 스피킹 단계: ${getStageName(speakingStage)}`);
  }, [levelNumber, phaseNumber, stageNumber, speakingStage]);

  // 상태 관리
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('idle');
  const [countdownText, setCountdownText] = useState<string>('');
  const [recognitionTimeText, setRecognitionTimeText] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [answerEvaluation, setAnswerEvaluation] = useState<string>('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('correct');
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [interimResult, setInterimResult] = useState<string>('');

  // 틀린 문제 복습 모드 상태
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);

  // Refs for state consistency
  const currentQuestionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef<number>(0);
  const pausedStateRef = useRef<{phase: Phase, remainingTime?: number} | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // 커스텀 훅들
  const { currentQuestions, isLoading, loadingMessage, loadStageData } = useStageData({
    levelNumber,
    phaseNumber,
    stageNumber
  });

  const { playKoreanTTS, playEnglishTTS, playBeepSound, stopAllAudio } = useAudioManager();

  // SRS 엔진 초기화 (3단계에서만 틀린 문장 추가용)
  const srsEngine = useSRSEngine({
    userId: 'pattern-training-user', // 실제 구현시 실제 userId 사용
    storageKey: 'pattern-training-srs'
  });

  // 1,2단계 틀린 문제 추적 시스템
  const [incorrectAnswers, setIncorrectAnswers] = useState<Array<{
    question: Question;
    userAnswer: string;
    speakingStage: number;
    timestamp: Date;
  }>>([]);

  // 1,2단계에서 틀린 문제를 추적하는 함수
  const addIncorrectAnswerToTracker = useCallback((question: Question, userAnswer: string) => {
    if (speakingStage <= 2) {
      setIncorrectAnswers(prev => {
        // 중복 방지 - 같은 문제를 이미 틀렸는지 확인
        const exists = prev.some(item =>
          item.question.id === question.id &&
          item.speakingStage === speakingStage
        );

        if (!exists) {
          const newIncorrect = {
            question,
            userAnswer,
            speakingStage,
            timestamp: new Date()
          };
          console.log(`📝 [틀린문제] ${speakingStage}단계 틀린 문제 추가: "${question.ko}"`);
          console.log(`📝 [틀린문제] 사용자 답변: "${userAnswer}"`);
          return [...prev, newIncorrect];
        }
        return prev;
      });
    }
  }, [speakingStage]);

  // 3단계에서만 틀린 문장을 SRS에 추가하는 함수
  const addIncorrectAnswerToSRS = useCallback((question: Question, userAnswer: string) => {
    // 3단계에서만 SRS에 추가
    if (speakingStage !== 3) {
      console.log(`🔄 SRS 추가 스킵: ${speakingStage}단계 (3단계에서만 추가)`);
      return;
    }

    try {
      const srsCard = srsEngine.addCard({
        korean: question.ko,
        english: question.en,
        level: levelNumber,
        stage: stageNumber,
        pattern: `Level ${levelNumber} - Stage ${stageNumber} - 3단계 틀린 문제`
      });

      console.log(`📚 [SRS] 3단계 틀린 문장 추가: "${question.ko}" → "${question.en}"`);
      console.log(`📚 [SRS] 사용자 답변: "${userAnswer}"`);
      console.log(`📚 [SRS] 출처: L${levelNumber}P${phaseNumber}S${stageNumber}-3단계`);
      console.log(`📚 [SRS] 현재 SRS 카드 수: ${srsEngine.cards.length + 1}개`);

    } catch (error) {
      console.error('❌ SRS 카드 추가 실패:', error);
      console.error('❌ Error details:', error);
    }
  }, [speakingStage, levelNumber, stageNumber, phaseNumber, srsEngine]);

  // 틀린 문제 복습 시작
  const startReviewMode = useCallback(() => {
    const stageIncorrect = incorrectAnswers.filter(item => item.speakingStage === speakingStage);
    if (stageIncorrect.length === 0) {
      alert('복습할 틀린 문제가 없습니다.');
      return;
    }

    // 틀린 문제들을 Question 형태로 변환
    const reviewQs = stageIncorrect.map(item => item.question);
    setReviewQuestions(reviewQs);
    setIsReviewMode(true);
    setCurrentIndex(0);
    setCurrentPhase('idle');
    setIsTraining(false);

    console.log(`📖 [복습모드] ${speakingStage}단계 틀린 문제 ${reviewQs.length}개 복습 시작`);
  }, [incorrectAnswers, speakingStage]);

  // 틀린 문제 복습 종료
  const exitReviewMode = useCallback(() => {
    setIsReviewMode(false);
    setReviewQuestions([]);
    setCurrentIndex(0);
    setCurrentPhase('idle');
    setIsTraining(false);

    console.log('📖 [복습모드] 복습 모드 종료');
  }, []);

  // 틀린 문제에서 정답 처리 시 목록에서 제거
  const removeIncorrectAnswer = useCallback((questionId: string) => {
    setIncorrectAnswers(prev =>
      prev.filter(item =>
        !(item.question.id === questionId && item.speakingStage === speakingStage)
      )
    );
  }, [speakingStage]);

  // 다음 문제로 이동
  const moveToNextQuestion = useCallback(() => {
    // 중복 호출 방지 - 더 강력한 체크
    if (isProcessingRef.current) {
      console.warn('⚠️ [DEBUG] moveToNextQuestion 처리 중 - 중복 호출 무시');
      return;
    }

    const currentIdx = currentIndexRef.current;
    console.log(`🔍 [DEBUG] moveToNextQuestion 시작: currentIndex=${currentIdx}`);

    // 처리 시작 플래그 설정
    isProcessingRef.current = true;

    setCurrentIndex(prevIndex => {
      // 이미 처리된 인덱스라면 무시
      if (prevIndex !== currentIdx) {
        console.warn(`⚠️ [DEBUG] 인덱스 불일치 - 이미 처리됨: expected=${currentIdx}, actual=${prevIndex}`);
        isProcessingRef.current = false;
        return prevIndex;
      }

      const nextIndex = prevIndex + 1;
      const questions = currentQuestionsRef.current;

      console.log(`🔍 [DEBUG] moveToNextQuestion: currentIndex=${prevIndex}, nextIndex=${nextIndex}, questions.length=${questions.length}`);

      // 처리 완료 후 플래그 리셋 (더 긴 시간으로 설정)
      setTimeout(() => {
        isProcessingRef.current = false;
        console.log('🔓 [DEBUG] moveToNextQuestion 처리 완료 - 플래그 리셋');
      }, 500);
      
      if (nextIndex >= questions.length) {
        // 모든 문제 완료
        setIsTraining(false);
        setCurrentPhase('idle');
        manager.current.stopAllTimers();
        
        const stageId = `level-${levelNumber}-phase-${phaseNumber}-stage-${stageNumber}`;
        manager.current.handleStageCompletion(stageId);
        
        return 0;
      } else {
        // 다음 문제로 이동
        setCurrentPhase('tts');
        setAnswerEvaluation('');
        setRecognitionResult('');
        setInterimResult('');
        setShowAnswer(false);
        
        // 다음 문제 TTS 재생
        const nextQuestion = questions[nextIndex];
        stopAllAudio(); // 기존 음성 중단
        setTimeout(async () => {
          await playBeepSound('start');
          playKoreanTTS(nextQuestion.ko).then(async () => {
          setCurrentPhase('countdown');
          // 카운트다운 삐소리 제거 - 더 자연스러운 플로우
          const countdownTime = getCountdownDuration(speakingStage);
          manager.current.startCountdown(countdownTime);
          });
        }, 50);
        
        return nextIndex;
      }
    });
  }, [levelNumber, phaseNumber, stageNumber, speakingStage, playKoreanTTS, playBeepSound, stopAllAudio]);

  // stopRecognition 참조를 저장할 ref
  const stopRecognitionRef = useRef<(() => void) | null>(null);

  // 실시간 정답 판정 처리 함수
  const handleAnswerEvaluation = useCallback((userAnswer: string, isRealtime = false) => {
    const currentQuestions = currentQuestionsRef.current;
    const currentIndex = currentIndexRef.current;
    const currentQuestion = currentQuestions[currentIndex];

    if (!currentQuestion) {
      console.warn('❌ currentQuestion이 없음 - currentIndex:', currentIndex, 'questions.length:', currentQuestions.length);
      return false;
    }

    const correctAnswer = currentQuestion.en;
    const evaluation = evaluateAnswer(userAnswer, correctAnswer, levelNumber, 'pattern');

    if (evaluation.isCorrect) {
      console.log(`🎤 ${isRealtime ? '실시간' : '최종'} 정답 인식:`, userAnswer, '/ 정답:', correctAnswer);

      // 중복 호출 방지
      if (isProcessingRef.current) {
        console.warn('⚠️ [DEBUG] handleAnswerEvaluation 처리 중 - 중복 호출 무시');
        return true;
      }

      // 음성인식 타이머 즉시 중지
      manager.current.stopAllTimers();
      if (stopRecognitionRef.current) {
        stopRecognitionRef.current();
      }
      setRecognitionTimeText('');

      setAnswerEvaluation('✅ 정답입니다!');
      setEvaluationType('correct');
      setRecognitionResult(userAnswer);

      // 복습 모드에서 정답 시 틀린 문제 목록에서 제거
      if (isReviewMode && currentQuestion) {
        removeIncorrectAnswer(currentQuestion.id);
      }

      // 영어로 정답 읽어주기
      playEnglishTTS(correctAnswer).then(() => {
        // 실시간 정답 시 즉시, 최종 정답 시 1초 후
        setTimeout(moveToNextQuestion, isRealtime ? 500 : 1000);
      });
      return true;
    }

    return false;
  }, [levelNumber, moveToNextQuestion, playEnglishTTS]);

  const { startRecognition, stopRecognition } = useSimpleSpeechRecognition({
    onInterimResult: useCallback((userAnswer: string, confidence: number) => {
      // 실시간 중간 결과 UI 업데이트
      setInterimResult(userAnswer);
      
      // 실시간 중간 결과로 정답 판정 (높은 신뢰도일 때만)
      if (confidence > 0.7) {
        const wasCorrect = handleAnswerEvaluation(userAnswer, true);
        if (wasCorrect) {
          console.log('⚡ 실시간 정답 처리로 즉시 진행!');
          setInterimResult(''); // 정답 처리 후 중간 결과 클리어
        }
      }
    }, [handleAnswerEvaluation]),
    
    onResult: useCallback((userAnswer: string) => {
      // 중복 호출 방지 - 이미 처리 중인 경우 무시
      if (isProcessingRef.current) {
        console.warn('⚠️ [DEBUG] onResult 처리 중 - 중복 호출 무시');
        return;
      }

      // 최종 결과 처리 (실시간으로 이미 처리되지 않은 경우)
      const currentQuestions = currentQuestionsRef.current;
      const currentIndex = currentIndexRef.current;
      const currentQuestion = currentQuestions[currentIndex];

      if (!currentQuestion) return;

      const correctAnswer = currentQuestion.en;
      console.log('🎤 사용자 최종 답변:', userAnswer, '/ 정답:', correctAnswer);

      const evaluation = evaluateAnswer(userAnswer, correctAnswer, levelNumber, 'pattern');

      // 음성인식 타이머 즉시 중지
      manager.current.stopAllTimers();
      if (stopRecognitionRef.current) {
        stopRecognitionRef.current();
      }
      setRecognitionTimeText('');

      if (evaluation.isCorrect) {
        setAnswerEvaluation('✅ 정답입니다!');
        setEvaluationType('correct');
        setRecognitionResult(userAnswer);

        // 복습 모드에서 정답 시 틀린 문제 목록에서 제거
        if (isReviewMode && currentQuestion) {
          removeIncorrectAnswer(currentQuestion.id);
        }

        // 정답일 때도 영어로 읽어주기
        playEnglishTTS(correctAnswer).then(() => {
          setTimeout(moveToNextQuestion, 1000);
        });
      } else {
        setAnswerEvaluation(`❌ 틀렸습니다. 정답: ${correctAnswer}`);
        setEvaluationType('incorrect');
        setRecognitionResult(userAnswer);
        setShowAnswer(true);

        // 1,2단계: 틀린 문제 추적, 3단계: SRS에 추가
        addIncorrectAnswerToTracker(currentQuestion, userAnswer);
        addIncorrectAnswerToSRS(currentQuestion, userAnswer);

        // 오답일 때 영어로 정답 읽어주기
        playEnglishTTS(correctAnswer).then(() => {
          setTimeout(() => {
            setShowAnswer(false);
            moveToNextQuestion();
          }, 1000);
        });
      }
    }, [levelNumber, handleAnswerEvaluation, moveToNextQuestion, playEnglishTTS, addIncorrectAnswerToTracker, addIncorrectAnswerToSRS, isReviewMode, currentQuestion, removeIncorrectAnswer])
  });

  // stopRecognition 함수 참조를 ref에 저장
  useEffect(() => {
    stopRecognitionRef.current = stopRecognition;
  }, [stopRecognition]);

  // 패턴 훈련 매니저 설정
  const managerConfig: PatternTrainingManagerConfig = useCallback(() => ({
    onCountdownTick: (remainingTime: number) => {
      setCountdownText(remainingTime.toString());
    },
    onCountdownComplete: () => {
      setCurrentPhase('recognition');
      // 카운트다운 완료 시 삐소리 제거 - 바로 음성인식 시작
      startRecognition();
      // 음성인식 타이머 시작 (10초 제한)
      manager.current.startRecognition(10);
    },
    onRecognitionTick: (remainingTime: number) => {
      setRecognitionTimeText(remainingTime.toString());
    },
    onRecognitionComplete: () => {
      console.log('⏰ [DEBUG] onRecognitionComplete 호출됨');

      // 중복 호출 방지 - 이미 처리 중인 경우 무시
      if (isProcessingRef.current) {
        console.warn('⚠️ [DEBUG] onRecognitionComplete 처리 중 - 중복 호출 무시');
        return;
      }

      setCurrentPhase('waiting');
      setRecognitionTimeText('');
      // 음성인식 시간 초과 시 자동으로 다음 문제로
      moveToNextQuestion();
    },
    onCompletionEvent: (stageId: string) => {
      // 해당 스피킹 단계를 완료로 표시
      updateStageProgress(levelNumber, stageNumber, speakingStage, true);
      console.log(`✅ 진행률 업데이트: Level ${levelNumber}, Stage ${stageNumber}, ${speakingStage}단계 완료`);
      alert(`🎉 Stage ${stageNumber} (${speakingStage}단계) 훈련 완료!\n\n${getStageName(speakingStage)}를 성공했습니다!`);
    }
  }), [levelNumber, stageNumber, speakingStage, updateStageProgress, playBeepSound, startRecognition])();

  const manager = useRef(usePatternTrainingManager(managerConfig));

  // 현재 문제 계산 - 복습 모드일 때는 복습 문제 사용
  const currentQuestion = isReviewMode
    ? (reviewQuestions[currentIndex] || { ko: '', en: '' })
    : (currentQuestions[currentIndex] || { ko: '', en: '' });

  // 활성 문제 목록 (복습 모드/일반 모드)
  const activeQuestions = isReviewMode ? reviewQuestions : currentQuestions;

  // Refs 동기화
  useEffect(() => {
    currentQuestionsRef.current = activeQuestions;
  }, [activeQuestions]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // 훈련 시작
  const startTraining = useCallback(() => {
    console.log('🚀 [DEBUG] startTraining 호출됨');

    if (currentQuestions.length === 0) {
      alert('문제 데이터를 먼저 로드해주세요!');
      return;
    }

    setIsTraining(true);
    setCurrentIndex(0);
    setCurrentPhase('tts');
    
    // 첫 번째 문제 시작
    const firstQuestion = currentQuestions[0];
    stopAllAudio(); // 기존 음성 중단
    setTimeout(async () => {
      await playBeepSound('start');
      playKoreanTTS(firstQuestion.ko).then(async () => {
        // 일시정지 상태 확인 (ref 사용으로 정확한 실시간 상태 체크)
        if (pausedStateRef.current) {
          console.log('⏸️ TTS 완료 후 일시정지 상태 감지 - 다음 단계 진행 중단');
          return;
        }

        setCurrentPhase('countdown');
        // 카운트다운 삐소리 제거 - 더 자연스러운 플로우
        const countdownTime = getCountdownDuration(speakingStage);
        manager.current.startCountdown(countdownTime);
      });
    }, 50);
  }, [currentQuestions, speakingStage, playKoreanTTS, playBeepSound, stopAllAudio, isPaused]);

  // 훈련 일시정지
  const pauseTraining = useCallback(() => {
    if (!isTraining) return;

    setIsPaused(true);

    // 현재 상태와 남은 시간 저장
    let remainingTime = 0;
    if (currentPhase === 'countdown') {
      remainingTime = parseInt(countdownText) || 0;
    } else if (currentPhase === 'recognition') {
      remainingTime = parseInt(recognitionTimeText) || 0;
    }

    pausedStateRef.current = {
      phase: currentPhase,
      remainingTime
    };

    // 모든 오디오 중단 (TTS 포함)
    stopAllAudio();

    // 타이머 완전 중지
    manager.current.stopAllTimers();

    // 음성인식 중지
    if (stopRecognitionRef.current) {
      stopRecognitionRef.current();
    }

    // UI 상태 클리어
    setCountdownText('');
    setRecognitionTimeText('');

    console.log(`⏸️ 일시정지: ${currentPhase} 단계, 남은시간: ${remainingTime}초`);
  }, [isTraining, currentPhase, countdownText, recognitionTimeText, stopAllAudio]);

  // 훈련 재개
  const resumeTraining = useCallback(() => {
    if (!isPaused || !pausedStateRef.current) return;

    setIsPaused(false);
    const { phase, remainingTime } = pausedStateRef.current;
    setCurrentPhase(phase);

    console.log(`▶️ 재개: ${phase} 단계, 남은시간: ${remainingTime || 0}초`);

    // 일시정지된 상태에 따라 적절한 재개 처리
    if (phase === 'countdown') {
      // 카운트다운 단계였다면 남은 시간으로 카운트다운 재개
      const timeToUse = remainingTime > 0 ? remainingTime : getCountdownDuration(speakingStage);
      manager.current.startCountdown(timeToUse);
    } else if (phase === 'recognition') {
      // 음성인식 단계였다면 남은 시간으로 음성인식 재개
      startRecognition();
      const timeToUse = remainingTime > 0 ? remainingTime : 10;
      manager.current.startRecognition(timeToUse);
    } else if (phase === 'tts') {
      // TTS 단계였다면 현재 문제 다시 읽기
      const currentQuestion = currentQuestions[currentIndex];
      if (currentQuestion) {
        setTimeout(async () => {
          await playBeepSound('start');
          playKoreanTTS(currentQuestion.ko).then(async () => {
            if (pausedStateRef.current) {
              console.log('⏸️ TTS 완료 후 일시정지 상태 감지 - 다음 단계 진행 중단');
              return;
            }
            setCurrentPhase('countdown');
            // 카운트다운 삐소리 제거 - 더 자연스러운 플로우
            const countdownTime = getCountdownDuration(speakingStage);
            manager.current.startCountdown(countdownTime);
          });
        }, 100);
      }
    }

    pausedStateRef.current = null;
  }, [isPaused, speakingStage, startRecognition, currentQuestions, currentIndex, playKoreanTTS, playBeepSound]);

  // 훈련 중지
  const stopTraining = useCallback(() => {
    setIsTraining(false);
    setIsPaused(false);
    setCurrentPhase('idle');
    setCurrentIndex(0);
    manager.current.stopAllTimers();
    if (stopRecognitionRef.current) {
      stopRecognitionRef.current();
    }
    pausedStateRef.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* 로딩 오버레이 */}
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />

      {/* 헤더 */}
      {isReviewMode ? (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2 text-xl">📖</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {speakingStage}단계 틀린 문제 복습
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentIndex + 1} / {activeQuestions.length} 문제
                </p>
              </div>
            </div>
            <button
              onClick={exitReviewMode}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              복습 종료
            </button>
          </div>
        </div>
      ) : (
        <TrainingHeader
          levelNumber={levelNumber}
          phaseNumber={phaseNumber}
          stageNumber={stageNumber}
          currentIndex={currentIndex}
          totalQuestions={currentQuestions.length}
        />
      )}

      {/* 틀린 문제 복습 버튼 */}
      {!isReviewMode && incorrectAnswers.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-yellow-600 dark:text-yellow-400 mr-2">⚠️</span>
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {speakingStage === 1 ? '1단계' : speakingStage === 2 ? '2단계' : '1,2단계'} 틀린 문제 {incorrectAnswers.filter(item => item.speakingStage === speakingStage).length}개
                </span>
              </div>
              <button
                onClick={startReviewMode}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1 rounded-md transition-colors"
              >
                복습하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 문제 카드 */}
        <QuestionCard
          currentQuestion={currentQuestion}
          currentPhase={currentPhase}
          countdownText={countdownText}
          recognitionTimeText={recognitionTimeText}
          showAnswer={showAnswer}
          answerEvaluation={answerEvaluation}
          evaluationType={evaluationType}
          recognitionResult={recognitionResult}
          interimResult={interimResult}
        />

        {/* 컨트롤 패널 */}
        <ControlPanel
          isTraining={isTraining}
          isPaused={isPaused}
          currentPhase={currentPhase}
          hasQuestions={currentQuestions.length > 0}
          currentIndex={currentIndex}
          totalQuestions={currentQuestions.length}
          onStartTraining={startTraining}
          onPauseTraining={pauseTraining}
          onResumeTraining={resumeTraining}
          onStopTraining={stopTraining}
          onLoadData={loadStageData}
        />
      </div>
    </div>
  );
};

export default PatternTrainingPageV3;