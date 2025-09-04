/**
 * Review Service Index
 * 망각곡선 엔진 통합 관리 - 기존 서비스들을 재-export
 */

// 기존 review 관련 서비스들 import
import * as reviewService from './reviewService';
import smartReviewService from './smartReviewService';
import { reviewEngineClient } from './reviewEngineClient';

interface SentenceData {
  sentenceId: string;
  sentence: string;
  difficulty: 'easy' | 'medium' | 'hard';
  // TODO: 구체적인 타입 정의
}

interface ReviewScheduleItem {
  id: string;
  userId: string;
  sentenceId: string;
  scheduledDate: Date;
  // TODO: 구체적인 타입 정의
}

interface ReviewResult {
  accuracy: number;
  responseTime: number;
  completed: boolean;
  // TODO: 구체적인 타입 정의
}

interface CompleteReviewResult {
  success: boolean;
  expGained: number;
  nextReviewDate?: Date;
  // TODO: 구체적인 타입 정의
}

/**
 * 통합 Review Service
 * 기존 서비스들을 하나의 모듈로 통합하여 관리
 */
class ReviewServiceIndex {
  public name: string;
  public reviewService: typeof reviewService;
  public smartReviewService: typeof smartReviewService;
  public reviewEngineClient: typeof reviewEngineClient;

  constructor() {
    this.name = 'ReviewServiceIndex';
    this.reviewService = reviewService;
    this.smartReviewService = smartReviewService;
    this.reviewEngineClient = reviewEngineClient;
  }

  /**
   * 틀린 문장을 망각곡선에 추가
   * @param userId - 사용자 ID
   * @param sentenceData - 틀린 문장 데이터
   * @returns 추가된 복습 세션
   */
  async addIncorrectSentenceToReview(userId: string, sentenceData: SentenceData): Promise<object> {
    // TODO: 기존 서비스들을 활용한 통합 로직 구현
    return {};
  }

  /**
   * 사용자의 복습 스케줄 조회
   * @param userId - 사용자 ID
   * @returns 복습할 항목들
   */
  async getUserReviewSchedule(userId: string): Promise<ReviewScheduleItem[]> {
    // TODO: 복습 스케줄 조회 로직 구현
    return [];
  }

  /**
   * 복습 완료 처리 및 경험치 부여
   * @param userId - 사용자 ID
   * @param reviewId - 복습 ID
   * @param result - 복습 결과
   * @returns 처리 결과
   */
  async completeReview(userId: string, reviewId: string, result: ReviewResult): Promise<CompleteReviewResult> {
    // TODO: 복습 완료 처리 로직 구현
    return { success: true, expGained: 0 };
  }
}

export default new ReviewServiceIndex();
export type { SentenceData, ReviewScheduleItem, ReviewResult, CompleteReviewResult };