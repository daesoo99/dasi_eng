/**
 * useAnswerEvaluation Hook
 * 모든 훈련 페이지에서 일관된 답변 평가 시스템 사용을 위한 훅
 */

import { useCallback } from 'react';
import { evaluateAnswer, type AnswerComparisonResult } from '@/utils/answerNormalization';

export interface UseAnswerEvaluationConfig {
  level?: number;
  mode?: 'pattern' | 'situational' | 'speed' | 'review';
  onCorrectAnswer?: (result: AnswerComparisonResult) => void;
  onIncorrectAnswer?: (result: AnswerComparisonResult) => void;
  enableLogging?: boolean;
}

export const useAnswerEvaluation = (config: UseAnswerEvaluationConfig = {}) => {
  const {
    level = 1,
    mode = 'pattern', 
    onCorrectAnswer,
    onIncorrectAnswer,
    enableLogging = true
  } = config;

  /**
   * 답변 평가 함수
   */
  const evaluate = useCallback((userAnswer: string, correctAnswer: string): AnswerComparisonResult => {
    const result = evaluateAnswer(userAnswer, correctAnswer, level, mode);
    
    // 로깅
    if (enableLogging) {
      console.log(`📊 [Answer Evaluation] 사용자: "${userAnswer}", 정답: "${correctAnswer}"`);
      console.log(`🔍 [Answer Evaluation] 정규화된 사용자: "${result.normalizedUser}"`);
      console.log(`🔍 [Answer Evaluation] 정규화된 정답: "${result.normalizedCorrect}"`);
      console.log(`🎯 [Answer Evaluation] 유사도: ${Math.round(result.similarity * 100)}%`);
      console.log(`✅ [Answer Evaluation] 결과: ${result.isCorrect ? '정답' : '오답'}`);
    }
    
    // 콜백 실행
    if (result.isCorrect && onCorrectAnswer) {
      onCorrectAnswer(result);
    } else if (!result.isCorrect && onIncorrectAnswer) {
      onIncorrectAnswer(result);
    }
    
    return result;
  }, [level, mode, onCorrectAnswer, onIncorrectAnswer, enableLogging]);

  /**
   * 간단한 정답/오답 체크 함수
   */
  const isCorrect = useCallback((userAnswer: string, correctAnswer: string): boolean => {
    return evaluate(userAnswer, correctAnswer).isCorrect;
  }, [evaluate]);

  /**
   * 피드백 메시지 생성 함수
   */
  const getFeedback = useCallback((userAnswer: string, correctAnswer: string): string => {
    return evaluate(userAnswer, correctAnswer).feedback;
  }, [evaluate]);

  /**
   * 유사도 계산 함수
   */
  const getSimilarity = useCallback((userAnswer: string, correctAnswer: string): number => {
    return evaluate(userAnswer, correctAnswer).similarity;
  }, [evaluate]);

  return {
    evaluate,
    isCorrect,
    getFeedback,
    getSimilarity,
    // 설정값들도 반환 (디버깅용)
    config: { level, mode }
  };
};

export default useAnswerEvaluation;