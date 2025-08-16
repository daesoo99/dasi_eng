
const { db } = require('../config/firebase');

const reviewsCollection = db.collection('reviews');

/**
 * 새로운 복습 카드를 생성합니다.
 * @param {object} reviewData - 복습 카드 데이터
 * @returns {Promise<void>}
 */
const createReviewCard = async (reviewData) => {
    await reviewsCollection.add(reviewData);
};

/**
 * 특정 사용자의 복습 카드를 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array<object>>} 복습 카드 목록
 */
const getReviewCards = async (userId) => {
    const snapshot = await reviewsCollection.where('userId', '==', userId).get();
    const reviewCards = [];
    snapshot.forEach(doc => {
        reviewCards.push({ id: doc.id, ...doc.data() });
    });
    return reviewCards;
};

/**
 * 복습 카드의 다음 복습일을 업데이트합니다.
 * @param {string} reviewId - 복습 카드 ID
 * @param {string} nextReviewDate - 다음 복습일 (YYYY-MM-DD 형식)
 * @param {number} newStage - 새로운 복습 단계
 * @returns {Promise<void>}
 */
const updateReviewCard = async (reviewId, nextReviewDate, newStage) => {
    await reviewsCollection.doc(reviewId).update({
        nextReview: nextReviewDate,
        stage: newStage,
    });
};

module.exports = {
    createReviewCard,
    getReviewCards,
    updateReviewCard,
};
