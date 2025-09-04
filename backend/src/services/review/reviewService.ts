
/**
 * @deprecated 이 서비스는 deprecated입니다.
 * 새 프로젝트에서는 smartReviewService.ts를 사용하세요.
 * 
 * 마이그레이션 가이드:
 * - createReviewCard() → SmartReviewService.recordReviewSession()
 * - getReviewCards() → SmartReviewService.getScheduledReviews()
 * - updateReviewCard() → SmartReviewService.updateMemoryData()
 * 
 * 2025-01-12: SSOT 백엔드 시스템으로 통합 중
 */

import { db } from '../../config/firebase';

const reviewsCollection = db.collection('reviews');

interface ReviewData {
    userId: string;
    sentence: string;
    stage: number;
    nextReview: string;
    createdAt: Date;
    // TODO: 구체적인 타입 정의
}

interface ReviewCard extends ReviewData {
    id: string;
}

/**
 * 새로운 복습 카드를 생성합니다.
 * @param reviewData - 복습 카드 데이터
 * @returns Promise<void>
 */
const createReviewCard = async (reviewData: ReviewData): Promise<void> => {
    await reviewsCollection.add(reviewData);
};

/**
 * 특정 사용자의 복습 카드를 가져옵니다.
 * @param userId - 사용자 ID
 * @returns 복습 카드 목록
 */
const getReviewCards = async (userId: string): Promise<ReviewCard[]> => {
    const snapshot = await reviewsCollection.where('userId', '==', userId).get();
    const reviewCards: ReviewCard[] = [];
    snapshot.forEach(doc => {
        reviewCards.push({ id: doc.id, ...doc.data() } as ReviewCard);
    });
    return reviewCards;
};

/**
 * 복습 카드의 다음 복습일을 업데이트합니다.
 * @param reviewId - 복습 카드 ID
 * @param nextReviewDate - 다음 복습일 (YYYY-MM-DD 형식)
 * @param newStage - 새로운 복습 단계
 * @returns Promise<void>
 */
const updateReviewCard = async (reviewId: string, nextReviewDate: string, newStage: number): Promise<void> => {
    await reviewsCollection.doc(reviewId).update({
        nextReview: nextReviewDate,
        stage: newStage,
    });
};

export {
    createReviewCard,
    getReviewCards,
    updateReviewCard,
};

export type { ReviewData, ReviewCard };
