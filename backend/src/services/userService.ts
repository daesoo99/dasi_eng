/**
 * UserService - 사용자 관리 및 학습 분석 서비스
 * TypeScript 변환: Firebase + ReviewEngine 통합
 */

import { db } from '../config/firebase';
import { reviewEngineClient as ReviewEngineClient } from './review/reviewEngineClient';
import { 
  User, 
  UserReviewStats, 
  LearningAnalytics, 
  ReviewRecord, 
  UserCard,
  BatchReviewInput,
  BatchReviewResult,
  ReviewEngineOptions 
} from '../shared/types/core';

const usersCollection = db.collection('users');
const reviewEngine = ReviewEngineClient;

/**
 * 사용자 정보 조회
 */
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User not found: ${userId}`);
      return null;
    }
    
    const data = userDoc.data();
    return {
      uid: userId,
      email: data?.email,
      level: data?.level || 1,
      displayName: data?.displayName,
      subscription: data?.subscription || 'free',
      createdAt: data?.createdAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * 사용자 정보 업데이트
 */
export const updateUser = async (
  userId: string, 
  data: Partial<User>
): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    await usersCollection.doc(userId).update(updateData);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * 새 사용자 생성
 */
export const createUser = async (
  userId: string, 
  initialData: Partial<User>
): Promise<void> => {
  try {
    const userData: User = {
      uid: userId,
      level: 1,
      subscription: 'free',
      createdAt: new Date(),
      ...initialData
    };
    
    await usersCollection.doc(userId).set({
      ...userData,
      reviewStats: {
        totalReviews: 0,
        correctAnswers: 0,
        accuracy: 0,
        avgQuality: 0,
        lastReviewDate: new Date()
      } as UserReviewStats
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * 사용자 리뷰 일정 계산
 */
export const scheduleUserReview = async (
  userId: string,
  itemId: string,
  quality: number,
  options: ReviewEngineOptions = {}
): Promise<{ interval: number; nextReview: Date }> => {
  try {
    // TODO: Implement scheduleReview method in ReviewEngineClient
    // Temporary mock implementation
    const interval = 1; // 1 day interval
    const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    
    await updateUserReviewStats(userId, quality, interval);
    
    return { interval, nextReview };
  } catch (error) {
    console.error('Error scheduling user review:', error);
    throw error;
  }
};

/**
 * 복습 예정 카드 조회
 */
export const getUserDueCards = async (
  userId: string,
  options: ReviewEngineOptions = {}
): Promise<string[]> => {
  // TODO: Implement getDueCards method in ReviewEngineClient
  return []; // Temporary empty implementation
};

/**
 * 사용자 학습 분석 데이터 조회
 */
export const getUserLearningAnalytics = async (
  userId: string,
  days: number = 30
): Promise<LearningAnalytics> => {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // 리뷰 기록 조회
    const reviewsSnapshot = await (db as any)
      .collection('userReviews')
      .where('userId', '==', userId)
      .where('reviewedAt', '>=', startDate)
      .orderBy('reviewedAt', 'desc')
      .get();

    const reviews: ReviewRecord[] = reviewsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        cardId: data.cardId,
        quality: data.quality,
        interval: data.interval,
        easinessFactor: data.easinessFactor,
        reviewedAt: data.reviewedAt.toDate(),
        responseTime: data.responseTime || 0
      };
    });

    // 사용자 카드 조회
    const cardsSnapshot = await (db as any)
      .collection('userCards')
      .where('userId', '==', userId)
      .get();

    const cards: UserCard[] = cardsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        cardId: data.cardId,
        learningState: data.learningState || 'NEW',
        repetitions: data.repetitions || 0,
        interval: data.interval || 0,
        easinessFactor: data.easinessFactor || 2.5,
        lastReviewed: data.lastReviewed?.toDate(),
        nextReview: data.nextReview?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });

    // 기본 통계 계산
    const totalReviews = reviews.length;
    const correctAnswers = reviews.filter(r => r.quality >= 3).length;
    const accuracy = totalReviews > 0 ? correctAnswers / totalReviews : 0;
    const avgQuality = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.quality, 0) / totalReviews 
      : 0;

    return {
      userId,
      period: {
        days,
        start: startDate.getTime(),
        end: Date.now()
      },
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
 * 사용자 리뷰 통계 업데이트
 */
const updateUserReviewStats = async (
  userId: string,
  quality: number,
  interval: number
): Promise<void> => {
  try {
    const userRef = usersCollection.doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.warn(`User ${userId} not found for stats update`);
      return;
    }
    
    const userData = userDoc.data();
    const currentStats: UserReviewStats = userData?.reviewStats || {
      totalReviews: 0,
      correctAnswers: 0,
      accuracy: 0,
      avgQuality: 0,
      lastReviewDate: new Date()
    };
    
    // 통계 업데이트
    const newTotalReviews = currentStats.totalReviews + 1;
    const newCorrectAnswers = quality >= 3 
      ? currentStats.correctAnswers + 1 
      : currentStats.correctAnswers;
    
    const updatedStats: UserReviewStats = {
      totalReviews: newTotalReviews,
      correctAnswers: newCorrectAnswers,
      accuracy: newTotalReviews > 0 ? newCorrectAnswers / newTotalReviews : 0,
      avgQuality: (currentStats.avgQuality * currentStats.totalReviews + quality) / newTotalReviews,
      lastReviewDate: new Date()
    };
    
    await userRef.update({
      reviewStats: updatedStats,
      updatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error updating user review stats:', error);
    // 통계 업데이트 실패는 critical하지 않으므로 throw하지 않음
  }
};

/**
 * 배치 리뷰 처리
 */
export const processBatchUserReviews = async (
  userId: string,
  reviews: BatchReviewInput[]
): Promise<{ success: boolean; results: BatchReviewResult[] }> => {
  // TODO: Implement processBatchReviews method in ReviewEngineClient
  // Temporary mock implementation
  return {
    success: false,
    results: reviews.map((review: BatchReviewInput): BatchReviewResult => ({
      success: false,
      userId: review.userId,
      itemId: review.itemId,
      interval: 0,
      score: 0,
      responseTime: 0,
      error: 'Not implemented'
    }))
  };
};