// 스마트 복습 알고리즘 백엔드 서비스
const admin = require('firebase-admin');
const db = admin.firestore();

class SmartReviewService {
  
  /**
   * 사용자의 복습 세션 기록
   */
  async recordReviewSession(sessionData) {
    try {
      const { userId, sentenceId, accuracy, responseTime, difficulty } = sessionData;
      
      // 복습 세션 저장
      const sessionRef = await db.collection('reviewSessions').add({
        userId,
        sentenceId,
        accuracy,
        responseTime,
        difficulty,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processed: false
      });
      
      // 사용자별 문장 메모리 강도 업데이트
      await this.updateMemoryStrength(userId, sentenceId, accuracy, difficulty, responseTime);
      
      // 다음 복습 일정 계산
      const nextReviewDate = await this.calculateNextReviewDate(userId, sentenceId, accuracy, difficulty);
      
      return {
        sessionId: sessionRef.id,
        nextReviewDate,
        success: true
      };
      
    } catch (error) {
      console.error('복습 세션 기록 실패:', error);
      throw error;
    }
  }
  
  /**
   * 메모리 강도 업데이트 (SuperMemo SM-2 알고리즘 기반)
   */
  async updateMemoryStrength(userId, sentenceId, accuracy, difficulty, responseTime) {
    const memoryRef = db.collection('userMemoryStrength').doc(`${userId}_${sentenceId}`);
    
    // 기존 메모리 데이터 조회
    const memoryDoc = await memoryRef.get();
    
    let currentData = {
      strength: 0.5,
      easeFactor: 2.5,
      intervalDays: 1,
      reviewCount: 0,
      lastReviewDate: null
    };
    
    if (memoryDoc.exists) {
      currentData = { ...currentData, ...memoryDoc.data() };
    }
    
    // 품질 점수 계산 (0-5)
    const quality = this.calculateQuality(accuracy, difficulty, responseTime);
    
    // SuperMemo SM-2 알고리즘 적용
    let newEaseFactor = currentData.easeFactor;
    let newInterval = currentData.intervalDays;
    let newStrength = currentData.strength;
    
    if (quality >= 3) {
      // 성공적인 복습
      if (currentData.reviewCount === 0) {
        newInterval = 1;
      } else if (currentData.reviewCount === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentData.intervalDays * currentData.easeFactor);
      }
      
      // ease factor 조정
      newEaseFactor = Math.max(1.3, 
        currentData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      
      // 메모리 강도 증가
      newStrength = Math.min(1.0, currentData.strength + (quality / 5) * 0.3);
      
    } else {
      // 실패한 복습
      newInterval = 1;
      newEaseFactor = Math.max(1.3, currentData.easeFactor - 0.2);
      newStrength = Math.max(0.1, currentData.strength - (3 - quality) / 5 * 0.4);
    }
    
    // 다음 복습 날짜 계산
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    // 업데이트된 데이터 저장
    await memoryRef.set({
      userId,
      sentenceId,
      strength: newStrength,
      easeFactor: newEaseFactor,
      intervalDays: newInterval,
      reviewCount: currentData.reviewCount + 1,
      lastReviewDate: admin.firestore.FieldValue.serverTimestamp(),
      nextReviewDate: admin.firestore.Timestamp.fromDate(nextReviewDate),
      lastAccuracy: accuracy,
      lastDifficulty: difficulty,
      lastResponseTime: responseTime,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return {
      newStrength,
      newInterval,
      nextReviewDate
    };
  }
  
  /**
   * 품질 점수 계산 (정확도, 난이도, 응답시간 기반)
   */
  calculateQuality(accuracy, difficulty, responseTime) {
    // 기본 정확도 점수 (0-5)
    let quality = accuracy * 5;
    
    // 응답 시간 가중치
    const timeWeight = this.getTimeWeight(responseTime);
    quality *= timeWeight;
    
    // 난이도 가중치
    const difficultyWeights = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.2
    };
    quality *= difficultyWeights[difficulty] || 1.0;
    
    return Math.max(0, Math.min(5, Math.round(quality)));
  }
  
  /**
   * 응답 시간 기반 가중치
   */
  getTimeWeight(responseTime) {
    const idealMin = 3000; // 3초
    const idealMax = 7000; // 7초
    
    if (responseTime < idealMin) {
      return 0.8; // 너무 빠름
    } else if (responseTime <= idealMax) {
      return 1.0; // 이상적
    } else if (responseTime <= 15000) {
      return 1.0 - (responseTime - idealMax) / 20000;
    } else {
      return 0.6; // 너무 느림
    }
  }
  
  /**
   * 오늘 복습할 문장들 조회
   */
  async getTodayReviewSentences(userId, maxCount = 50) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 1. 복습 예정 문장들 (nextReviewDate가 오늘 이전)
      const scheduledQuery = db.collection('userMemoryStrength')
        .where('userId', '==', userId)
        .where('nextReviewDate', '<=', admin.firestore.Timestamp.fromDate(today))
        .orderBy('nextReviewDate', 'asc')
        .limit(30);
      
      const scheduledDocs = await scheduledQuery.get();
      const scheduledSentences = scheduledDocs.docs.map(doc => doc.data().sentenceId);
      
      // 2. 취약한 문장들 (강도가 낮은 순)
      const weakQuery = db.collection('userMemoryStrength')
        .where('userId', '==', userId)
        .where('strength', '<=', 0.6)
        .orderBy('strength', 'asc')
        .limit(Math.max(0, maxCount - scheduledSentences.length));
      
      const weakDocs = await weakQuery.get();
      const weakSentences = weakDocs.docs
        .map(doc => doc.data().sentenceId)
        .filter(id => !scheduledSentences.includes(id));
      
      // 3. 새로운 문장들 (아직 복습하지 않은 것)
      const newSentencesCount = Math.max(0, maxCount - scheduledSentences.length - weakSentences.length);
      const newSentences = await this.getNewSentencesForUser(userId, newSentencesCount);
      
      return [...scheduledSentences, ...weakSentences, ...newSentences].slice(0, maxCount);
      
    } catch (error) {
      console.error('오늘 복습 문장 조회 실패:', error);
      throw error;
    }
  }
  
  /**
   * 새로운 문장들 조회 (사용자 레벨에 맞춘)
   */
  async getNewSentencesForUser(userId, count) {
    try {
      // 사용자의 현재 레벨 조회
      const userLevel = await this.getUserCurrentLevel(userId);
      
      // 해당 레벨의 문장들 중 복습하지 않은 것들 조회
      const reviewedSentencesQuery = db.collection('userMemoryStrength')
        .where('userId', '==', userId)
        .select('sentenceId');
      
      const reviewedDocs = await reviewedSentencesQuery.get();
      const reviewedIds = reviewedDocs.docs.map(doc => doc.data().sentenceId);
      
      // Curriculum에서 새로운 문장들 조회 (레벨별)
      const curriculumQuery = db.collection('curricula')
        .doc(userLevel.toString())
        .collection('versions')
        .doc('revised')
        .collection('stages')
        .limit(5);
      
      const stageDocs = await curriculumQuery.get();
      const newSentences = [];
      
      for (const stageDoc of stageDocs.docs) {
        const stageData = stageDoc.data();
        if (stageData.sentences) {
          const unreviewed = stageData.sentences
            .filter(s => !reviewedIds.includes(s.id))
            .map(s => s.id)
            .slice(0, Math.max(0, count - newSentences.length));
          
          newSentences.push(...unreviewed);
          
          if (newSentences.length >= count) break;
        }
      }
      
      return newSentences.slice(0, count);
      
    } catch (error) {
      console.error('새로운 문장 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 사용자 현재 레벨 조회
   */
  async getUserCurrentLevel(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data().currentLevel || 1;
      }
      return 1;
    } catch (error) {
      console.error('사용자 레벨 조회 실패:', error);
      return 1;
    }
  }
  
  /**
   * 복습 패턴 분석
   */
  async analyzeReviewPattern(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // 최근 복습 세션들 조회
      const sessionsQuery = db.collection('reviewSessions')
        .where('userId', '==', userId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .orderBy('timestamp', 'desc');
      
      const sessionDocs = await sessionsQuery.get();
      const sessions = sessionDocs.docs.map(doc => doc.data());
      
      if (sessions.length === 0) {
        return {
          totalReviews: 0,
          averageAccuracy: 0,
          averageResponseTime: 0,
          retentionRate: 0,
          masteryLevel: 'beginner'
        };
      }
      
      // 메트릭 계산
      const totalReviews = sessions.length;
      const averageAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalReviews;
      const averageResponseTime = sessions.reduce((sum, s) => sum + s.responseTime, 0) / totalReviews;
      
      // 유지율 계산 (7일 후 재복습 성공률)
      const retentionRate = await this.calculateRetentionRate(userId);
      
      // 숙련도 레벨 결정
      const masteryLevel = this.determineMasteryLevel(averageAccuracy, retentionRate, totalReviews);
      
      return {
        totalReviews,
        averageAccuracy,
        averageResponseTime,
        retentionRate,
        masteryLevel
      };
      
    } catch (error) {
      console.error('복습 패턴 분석 실패:', error);
      throw error;
    }
  }
  
  /**
   * 기억 유지율 계산
   */
  async calculateRetentionRate(userId) {
    try {
      // 7일 전 복습한 문장들 중 최근에 다시 복습한 것들의 성공률
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const oldSessionsQuery = db.collection('reviewSessions')
        .where('userId', '==', userId)
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(weekAgo));
      
      const oldSessions = await oldSessionsQuery.get();
      const oldSentenceIds = [...new Set(oldSessions.docs.map(doc => doc.data().sentenceId))];
      
      if (oldSentenceIds.length === 0) return 0.7; // 기본값
      
      // 해당 문장들의 최근 복습 성공률
      const recentSessionsQuery = db.collection('reviewSessions')
        .where('userId', '==', userId)
        .where('timestamp', '>', admin.firestore.Timestamp.fromDate(weekAgo));
      
      const recentSessions = await recentSessionsQuery.get();
      const recentSuccesses = recentSessions.docs
        .filter(doc => {
          const data = doc.data();
          return oldSentenceIds.includes(data.sentenceId) && data.accuracy > 0.7;
        });
      
      const retentionRate = recentSuccesses.length / oldSentenceIds.length;
      return Math.min(1.0, Math.max(0.0, retentionRate));
      
    } catch (error) {
      console.error('기억 유지율 계산 실패:', error);
      return 0.7;
    }
  }
  
  /**
   * 숙련도 레벨 결정
   */
  determineMasteryLevel(accuracy, retention, totalReviews) {
    if (totalReviews < 50) return 'beginner';
    if (accuracy > 0.9 && retention > 0.85) return 'mastered';
    if (accuracy > 0.75 && retention > 0.7) return 'advanced';
    if (accuracy > 0.6 && retention > 0.6) return 'intermediate';
    return 'beginner';
  }
  
  /**
   * 개인 맞춤 복습 스케줄 생성
   */
  async generatePersonalizedSchedule(userId) {
    try {
      const pattern = await this.analyzeReviewPattern(userId);
      const activityPattern = await this.getUserActivityPattern(userId);
      
      // 개인별 최적 복습 횟수 계산
      const dailyTarget = this.calculateOptimalDailyReviews(pattern, activityPattern);
      
      return {
        daily: dailyTarget,
        weekly: dailyTarget * 7,
        monthlyGoal: dailyTarget * 30,
        optimalTimes: activityPattern.peakHours || ['09:00', '19:00']
      };
      
    } catch (error) {
      console.error('개인 맞춤 스케줄 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 사용자 활동 패턴 분석
   */
  async getUserActivityPattern(userId) {
    try {
      // 최근 복습 시간 패턴 분석
      const sessionsQuery = db.collection('reviewSessions')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(100);
      
      const sessions = await sessionsQuery.get();
      const hourCounts = {};
      
      sessions.docs.forEach(doc => {
        const timestamp = doc.data().timestamp.toDate();
        const hour = timestamp.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      // 가장 활발한 시간대 찾기
      const peakHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([hour]) => `${hour.padStart(2, '0')}:00`);
      
      return {
        peakHours: peakHours.length > 0 ? peakHours : ['09:00', '19:00'],
        preferredDuration: 20,
        consistency: 0.7
      };
      
    } catch (error) {
      console.error('사용자 활동 패턴 분석 실패:', error);
      return {
        peakHours: ['09:00', '19:00'],
        preferredDuration: 20,
        consistency: 0.7
      };
    }
  }
  
  /**
   * 최적 일일 복습 횟수 계산
   */
  calculateOptimalDailyReviews(pattern, activity) {
    const baseTarget = 30;
    
    switch (pattern.masteryLevel) {
      case 'beginner': return Math.max(15, baseTarget * 0.5);
      case 'intermediate': return baseTarget;
      case 'advanced': return baseTarget * 1.5;
      case 'mastered': return baseTarget * 0.7;
      default: return baseTarget;
    }
  }
}

module.exports = new SmartReviewService();