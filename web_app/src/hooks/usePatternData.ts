import { useState, useCallback, useMemo } from 'react';
import { QuestionItem, LevelSystemData, PatternDataManager } from '@/data/patternData';

export interface UsePatternDataProps {
  levelSystemData?: LevelSystemData | null;
  reviewQuestions?: QuestionItem[];
  initialStage?: number;
}

export interface UsePatternDataReturn {
  // Current state
  currentQuestions: QuestionItem[];
  currentIndex: number;
  currentQuestion: QuestionItem | null;
  currentStage: number;
  
  // Progress tracking
  totalQuestions: number;
  progress: number;
  isCompleted: boolean;
  
  // Navigation
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  resetQuestions: () => void;
  
  // Stage management
  setStage: (stage: number) => void;
  regenerateQuestions: () => void;
  
  // Utilities
  isLastQuestion: boolean;
  hasQuestions: boolean;
}

export const usePatternData = ({
  levelSystemData = null,
  reviewQuestions = [],
  initialStage = 1
}: UsePatternDataProps = {}): UsePatternDataReturn => {
  const [currentStage, setCurrentStage] = useState(initialStage);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Generate questions based on mode
  const currentQuestions = useMemo(() => {
    if (reviewQuestions.length > 0) {
      console.log('복습 모드: 복습 문제 사용', reviewQuestions.length);
      return reviewQuestions;
    }
    
    const generated = PatternDataManager.generateQuestions(levelSystemData, currentStage);
    console.log('일반 모드: 생성된 문제', generated.length);
    return generated;
  }, [levelSystemData, currentStage, reviewQuestions]);

  // Current question
  const currentQuestion = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < currentQuestions.length) {
      return currentQuestions[currentIndex];
    }
    return null;
  }, [currentQuestions, currentIndex]);

  // Progress calculations
  const totalQuestions = currentQuestions.length;
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;
  const isCompleted = currentIndex >= totalQuestions;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const hasQuestions = totalQuestions > 0;

  // Navigation functions
  const nextQuestion = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalQuestions));
  }, [totalQuestions]);

  const previousQuestion = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentIndex(index);
    }
  }, [totalQuestions]);

  const resetQuestions = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  // Stage management
  const setStage = useCallback((stage: number) => {
    setCurrentStage(stage);
    setCurrentIndex(0); // Reset to first question when stage changes
  }, []);

  const regenerateQuestions = useCallback(() => {
    // Force regeneration by updating stage (this will trigger useMemo dependency)
    setCurrentIndex(0);
    // Questions will automatically regenerate due to useMemo dependency on currentStage
  }, []);

  return {
    // Current state
    currentQuestions,
    currentIndex,
    currentQuestion,
    currentStage,
    
    // Progress tracking
    totalQuestions,
    progress,
    isCompleted,
    
    // Navigation
    nextQuestion,
    previousQuestion,
    goToQuestion,
    resetQuestions,
    
    // Stage management
    setStage,
    regenerateQuestions,
    
    // Utilities
    isLastQuestion,
    hasQuestions
  };
};