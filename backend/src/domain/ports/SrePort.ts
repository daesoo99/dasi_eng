/**
 * SrePort - 망각곡선 (Spaced Repetition Engine)
 * 핵심 비즈니스 로직: 언제 복습할지 계산
 */

import { User, ReviewPlan, ReviewHistory, AttemptRecord, RetentionScore } from '../../shared/types/core';

export interface SrePort {
  /**
   * 사용자별 다음 복습 계획 수립
   */
  planNextReviews(user: User, history: ReviewHistory): ReviewPlan;
  
  /**
   * 개별 카드의 기억 보유 확률 계산
   */
  calculateRetention(attempts: AttemptRecord[]): RetentionScore;
  
  /**
   * 복습이 필요한 카드 ID 목록 반환
   */
  getDueCards(userId: string): Promise<string[]>;
  
  /**
   * 학습 성과 기반 다음 복습 일정 계산
   * @param attempts 시도 기록
   * @returns 다음 복습까지의 일수
   */
  calculateNextReviewDays(attempts: AttemptRecord[]): number;
  
  /**
   * 사용자의 학습 패턴 분석
   */
  analyzeLearningPattern(userId: string, timeSpanDays: number): Promise<{
    optimalReviewTime: 'morning' | 'afternoon' | 'evening';
    averageSessionLength: number;
    successRate: number;
  }>;
}