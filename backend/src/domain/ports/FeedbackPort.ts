/**
 * FeedbackPort - 피드백 생성만 담당  
 * Score와 분리된 독립적인 포트
 */

import { ScoreResult, FeedbackResponse, LearningContext } from '../../shared/types/core';

export interface FeedbackPort {
  /**
   * 점수를 바탕으로 피드백 메시지 생성
   */
  generateFeedback(score: ScoreResult, context: LearningContext): FeedbackResponse;
  
  /**
   * 오답 분석 후 개선 제안
   */
  getSuggestions(userAnswer: string, targetAnswer: string, errors: string[]): string[];
  
  /**
   * 격려 메시지 생성 (학습 동기 부여)
   */
  generateEncouragement(sessionProgress: number, recentScores: number[]): string;
  
  /**
   * 다음 액션 추천 (계속/복습/진급)
   */
  recommendNextAction(userLevel: number, currentScore: number, sessionData: any): 'continue' | 'review' | 'advance';
}