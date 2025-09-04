/**
 * 문제 진행 관리 훅
 * 하드코딩 방지 원칙에 따라 모듈화된 문제 진행 로직
 * 
 * @architecture Plugin-style question progression for Pattern Training
 */

import { useState, useCallback } from 'react';

export interface Question {
  ko: string;
  en: string;
  id?: string;
}

export interface QuestionProgressConfig {
  questions: Question[];
  onQuestionStart?: (question: Question, index: number) => void;
  onQuestionComplete?: (question: Question, index: number) => void;
  onAllComplete?: () => void;
}

export interface QuestionProgressState {
  currentIndex: number;
  currentQuestion: Question | null;
  isComplete: boolean;
  progress: number; // 0-100%
  totalQuestions: number;
}

/**
 * 문제 진행 관리 훅
 * 완전히 모듈화되어 재사용 가능
 */
export function useQuestionProgress(config: QuestionProgressConfig): QuestionProgressState & {
  nextQuestion: () => void;
  resetProgress: () => void;
  jumpToQuestion: (index: number) => void;
} {
  const { questions, onQuestionStart, onQuestionComplete, onAllComplete } = config;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentQuestion = questions[currentIndex] || null;
  const isComplete = currentIndex >= questions.length;
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
  
  const nextQuestion = useCallback(() => {
    console.log(`🎯 [${new Date().toLocaleTimeString()}] nextQuestion 호출: ${currentIndex} -> ${currentIndex + 1}`);
    
    if (currentIndex < questions.length) {
      // 현재 문제 완료 콜백
      onQuestionComplete?.(questions[currentIndex], currentIndex);
    }
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= questions.length) {
      console.log(`🎉 [${new Date().toLocaleTimeString()}] 모든 문제 완료!`);
      onAllComplete?.();
      return;
    }
    
    setCurrentIndex(nextIndex);
    
    // 다음 문제 시작 콜백
    const nextQuestion = questions[nextIndex];
    if (nextQuestion) {
      console.log(`📝 [${new Date().toLocaleTimeString()}] 문제 ${nextIndex + 1}: "${nextQuestion.ko}" → "${nextQuestion.en}"`);
      onQuestionStart?.(nextQuestion, nextIndex);
    }
  }, [currentIndex, questions, onQuestionStart, onQuestionComplete, onAllComplete]);

  const resetProgress = useCallback(() => {
    setCurrentIndex(0);
    if (questions.length > 0) {
      onQuestionStart?.(questions[0], 0);
    }
  }, [questions, onQuestionStart]);

  const jumpToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      onQuestionStart?.(questions[index], index);
    }
  }, [questions, onQuestionStart]);

  return {
    currentIndex,
    currentQuestion,
    isComplete,
    progress,
    totalQuestions: questions.length,
    nextQuestion,
    resetProgress,
    jumpToQuestion
  };
}

/**
 * 패턴 트레이닝 전용 문제 진행 훅
 * TTS + 타이머 통합
 */
export function usePatternTrainingProgress(
  questions: Question[],
  onTTSComplete: (question: Question) => void,
  onTrainingComplete: () => void
) {
  return useQuestionProgress({
    questions,
    onQuestionStart: (question, index) => {
      console.log(`🎤 [${new Date().toLocaleTimeString()}] TTS 재생 시작: "${question.ko}"`);
      // TTS 재생 로직은 컴포넌트에서 처리
      onTTSComplete(question);
    },
    onAllComplete: () => {
      console.log(`🎉 [${new Date().toLocaleTimeString()}] 패턴 트레이닝 완료!`);
      onTrainingComplete();
    }
  });
}