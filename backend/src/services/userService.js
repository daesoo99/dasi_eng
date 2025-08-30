
const { db } = require('../config/firebase');
const ReviewEngineClient = require('./review/reviewEngineClient');

const usersCollection = db.collection('users');
const reviewEngine = new ReviewEngineClient();

/**
 * 사용자 정보를 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<object|null>} 사용자 데이터
 */
const getUser = async (userId) => {
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
        console.log('No such user!');
        return null;
    }
    return userDoc.data();
};

/**
 * 사용자 정보를 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @param {object} data - 업데이트할 데이터
 * @returns {Promise<void>}
 */
const updateUser = async (userId, data) => {
    await usersCollection.doc(userId).update(data);
};

/**
 * 새로운 사용자를 생성합니다.
 * @param {string} userId - 사용자 ID
 * @param {object} initialData - 초기 데이터
 * @returns {Promise<void>}
 */
const createUser = async (userId, initialData) => {
    await usersCollection.doc(userId).set(initialData);
};

/**
 * 사용자의 리뷰 일정을 계산합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} itemId - 아이템 ID
 * @param {number} quality - 응답 품질 (0-5)
 * @param {object} options - 추가 옵션
 * @returns {Promise<object>} 리뷰 일정 데이터
 */
const scheduleUserReview = async (userId, itemId, quality, options = {}) => {
    try {
        const result = await reviewEngine.scheduleReview(userId, itemId, quality, options);
        
        if (result.success) {
            // 사용자 통계 업데이트
            await updateUserReviewStats(userId, quality, result.data.interval);
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error scheduling user review:', error);
        throw error;
    }
};

/**
 * 사용자의 복습 예정 카드를 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @param {object} options - 조회 옵션
 * @returns {Promise<object>} 복습 예정 카드 데이터
 */
const getUserDueCards = async (userId, options = {}) => {
    try {
        const result = await reviewEngine.getDueCards(userId, options);
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error getting user due cards:', error);
        throw error;
    }
};

/**
 * 사용자의 학습 분석 데이터를 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @param {number} days - 분석할 일수
 * @returns {Promise<object>} 분석 데이터
 */
const getUserLearningAnalytics = async (userId, days = 30) => {
    try {
        // Firestore에서 사용자의 리뷰 기록 조회
        const reviewsSnapshot = await db
            .collection('userReviews')
            .where('userId', '==', userId)
            .where('reviewedAt', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
            .orderBy('reviewedAt', 'desc')
            .get();

        const reviews = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            reviewedAt: doc.data().reviewedAt.toDate()
        }));

        // 카드 데이터 조회
        const cardsSnapshot = await db
            .collection('userCards')
            .where('userId', '==', userId)
            .get();

        const cards = cardsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastReviewed: doc.data().lastReviewed?.toDate(),
            nextReview: doc.data().nextReview?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));

        // Analytics Service는 review-engine에 있으므로 기본 분석만 제공
        const totalReviews = reviews.length;
        const correctAnswers = reviews.filter(r => r.quality >= 3).length;
        const accuracy = totalReviews > 0 ? correctAnswers / totalReviews : 0;
        const avgQuality = totalReviews > 0 
            ? reviews.reduce((sum, r) => sum + r.quality, 0) / totalReviews 
            : 0;

        return {
            userId,
            period: { days, start: Date.now() - days * 24 * 60 * 60 * 1000, end: Date.now() },
            stats: {
                totalReviews,
                correctAnswers,
                accuracy: Math.round(accuracy * 100) / 100,
                averageQuality: Math.round(avgQuality * 100) / 100,
                totalCards: cards.length,
                masteredCards: cards.filter(c => c.learningState === 'REVIEW').length,
                learningCards: cards.filter(c => 
                    c.learningState === 'LEARNING' || c.learningState === 'RELEARNING'
                ).length,
                newCards: cards.filter(c => c.learningState === 'NEW').length
            },
            recentActivity: reviews.slice(0, 10)
        };
    } catch (error) {
        console.error('Error getting user learning analytics:', error);
        throw error;
    }
};

/**
 * 사용자 리뷰 통계를 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @param {number} quality - 응답 품질
 * @param {number} interval - 다음 리뷰 간격
 */
const updateUserReviewStats = async (userId, quality, interval) => {
    try {
        const userRef = usersCollection.doc(userId);
        const user = await userRef.get();
        
        if (!user.exists) {
            return;
        }
        
        const userData = user.data();
        const stats = userData.reviewStats || {};
        
        // 통계 업데이트
        const updatedStats = {
            ...stats,
            totalReviews: (stats.totalReviews || 0) + 1,
            lastReviewDate: new Date(),
            avgQuality: stats.totalReviews 
                ? ((stats.avgQuality || 0) * stats.totalReviews + quality) / (stats.totalReviews + 1)
                : quality,
            correctAnswers: quality >= 3 
                ? (stats.correctAnswers || 0) + 1 
                : (stats.correctAnswers || 0)
        };
        
        updatedStats.accuracy = updatedStats.totalReviews > 0 
            ? updatedStats.correctAnswers / updatedStats.totalReviews 
            : 0;
        
        await userRef.update({
            reviewStats: updatedStats,
            updatedAt: new Date()
        });
        
    } catch (error) {
        console.error('Error updating user review stats:', error);
    }
};

/**
 * 배치 리뷰 처리
 * @param {string} userId - 사용자 ID
 * @param {Array} reviews - 리뷰 배열
 * @returns {Promise<object>} 처리 결과
 */
const processBatchUserReviews = async (userId, reviews) => {
    try {
        const result = await reviewEngine.processBatchReviews(reviews);
        
        if (result.success) {
            // 각 성공한 리뷰에 대해 통계 업데이트
            const successfulReviews = result.data.results.filter(r => r.success);
            for (const review of successfulReviews) {
                const originalReview = reviews.find(r => 
                    r.userId === review.userId && r.itemId === review.itemId
                );
                if (originalReview) {
                    await updateUserReviewStats(review.userId, originalReview.quality, review.interval);
                }
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('Error processing batch user reviews:', error);
        throw error;
    }
};

module.exports = {
    getUser,
    updateUser,
    createUser,
    scheduleUserReview,
    getUserDueCards,
    getUserLearningAnalytics,
    processBatchUserReviews
};
