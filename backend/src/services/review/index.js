/**
 * Review Service Index
 * 망각곡선 엔진 통합 관리 - 기존 서비스들을 재-export
 */

// 기존 review 관련 서비스들 import
const reviewService = require('./reviewService');
const smartReviewService = require('./smartReviewService');
const reviewEngineClient = require('./reviewEngineClient');

/**
 * 통합 Review Service
 * 기존 서비스들을 하나의 모듈로 통합하여 관리
 */
class ReviewServiceIndex {
  constructor() {
    this.name = 'ReviewServiceIndex';
    this.reviewService = reviewService;
    this.smartReviewService = smartReviewService;
    this.reviewEngineClient = reviewEngineClient;
  }

  /**
   * 틀린 문장을 망각곡선에 추가
   * @param {string} userId - 사용자 ID
   * @param {Object} sentenceData - 틀린 문장 데이터
   * @returns {Promise<Object>} 추가된 복습 세션
   */
  async addIncorrectSentenceToReview(userId, sentenceData) {
    // TODO: 기존 서비스들을 활용한 통합 로직 구현
    return {};
  }

  /**
   * 사용자의 복습 스케줄 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Array>} 복습할 항목들
   */
  async getUserReviewSchedule(userId) {
    // TODO: 복습 스케줄 조회 로직 구현
    return [];
  }

  /**
   * 복습 완료 처리 및 경험치 부여
   * @param {string} userId - 사용자 ID
   * @param {string} reviewId - 복습 ID
   * @param {Object} result - 복습 결과
   * @returns {Promise<Object>} 처리 결과
   */
  async completeReview(userId, reviewId, result) {
    // TODO: 복습 완료 처리 로직 구현
    return {};
  }
}

module.exports = new ReviewServiceIndex();