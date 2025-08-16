// SRS (Spaced Repetition System) - 망각곡선 기반 복습 시스템

export interface SRSCard {
  id: string;
  cardId: string;
  userId: string;
  
  // SRS 관련 정보
  interval: number; // 다음 복습까지의 간격 (일)
  repetitions: number; // 연속 정답 횟수
  easeFactor: number; // 난이도 계수 (1.3 ~ 2.5)
  nextReviewDate: Date; // 다음 복습 날짜
  
  // 학습 기록
  correctCount: number; // 총 정답 횟수
  incorrectCount: number; // 총 오답 횟수
  lastReviewDate: Date; // 마지막 복습 날짜
  
  // 추가 정보
  level: number;
  stage: number;
  difficulty: 'easy' | 'medium' | 'hard';
  averageResponseTime: number; // 평균 응답 시간 (초)
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

export interface SRSReviewSession {
  sessionId: string;
  userId: string;
  reviewCards: SRSCard[];
  startTime: Date;
  endTime?: Date;
  totalCards: number;
  completedCards: number;
  accuracyRate: number;
}

export interface ReviewPerformance {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 알고리즘 점수
  responseTime: number; // 응답 시간 (초)
  isCorrect: boolean;
}

class SRSService {
  
  /**
   * SuperMemo SM-2 알고리즘 기반 복습 간격 계산
   */
  calculateNextReview(card: SRSCard, performance: ReviewPerformance): Partial<SRSCard> {
    const { quality, responseTime, isCorrect } = performance;
    
    let newInterval = card.interval;
    let newRepetitions = card.repetitions;
    let newEaseFactor = card.easeFactor;
    
    // 정답인 경우
    if (isCorrect && quality >= 3) {
      if (newRepetitions === 0) {
        newInterval = 1;
      } else if (newRepetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(card.interval * card.easeFactor);
      }
      newRepetitions += 1;
    } else {
      // 오답이거나 품질이 낮은 경우
      newRepetitions = 0;
      newInterval = 1;
    }
    
    // Ease Factor 조정 (SM-2 알고리즘)
    newEaseFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // 최소값 제한
    
    // 응답 시간에 따른 추가 조정
    if (responseTime > 10) {
      newEaseFactor = Math.max(1.3, newEaseFactor - 0.1);
    }
    
    // 다음 복습 날짜 계산
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    return {
      interval: newInterval,
      repetitions: newRepetitions,
      easeFactor: newEaseFactor,
      nextReviewDate,
      correctCount: isCorrect ? card.correctCount + 1 : card.correctCount,
      incorrectCount: isCorrect ? card.incorrectCount : card.incorrectCount + 1,
      lastReviewDate: new Date(),
      averageResponseTime: (card.averageResponseTime + responseTime) / 2,
      updatedAt: new Date()
    };
  }
  
  /**
   * 복습이 필요한 카드들 조회
   */
  async getCardsForReview(userId: string, maxCards: number = 20): Promise<SRSCard[]> {
    // 실제로는 백엔드 API 호출
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 오늘 끝까지
    
    try {
      // 임시로 localStorage에서 가져오기 (실제로는 API 호출)
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      // 복습이 필요한 카드들 필터링
      const reviewCards = allCards.filter(card => {
        const reviewDate = new Date(card.nextReviewDate);
        return reviewDate <= today;
      });
      
      // 우선순위 정렬 (오래된 것부터, 난이도 높은 것부터)
      reviewCards.sort((a, b) => {
        const aOverdue = new Date().getTime() - new Date(a.nextReviewDate).getTime();
        const bOverdue = new Date().getTime() - new Date(b.nextReviewDate).getTime();
        
        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue; // 더 오래된 것부터
        }
        
        return a.easeFactor - b.easeFactor; // 어려운 것부터
      });
      
      return reviewCards.slice(0, maxCards);
    } catch (error) {
      console.error('SRS 카드 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 새 카드를 SRS 시스템에 추가
   */
  async addCardToSRS(userId: string, cardId: string, cardData: {
    level: number;
    stage: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }): Promise<SRSCard> {
    
    const newSRSCard: SRSCard = {
      id: `srs_${cardId}_${Date.now()}`,
      cardId,
      userId,
      interval: 1, // 첫 복습은 1일 후
      repetitions: 0,
      easeFactor: 2.5, // 기본값
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 내일
      correctCount: 0,
      incorrectCount: 0,
      lastReviewDate: new Date(),
      level: cardData.level,
      stage: cardData.stage,
      difficulty: cardData.difficulty,
      averageResponseTime: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // 임시로 localStorage에 저장 (실제로는 API 호출)
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      // 중복 제거
      const existingIndex = allCards.findIndex(card => card.cardId === cardId);
      if (existingIndex >= 0) {
        allCards[existingIndex] = newSRSCard;
      } else {
        allCards.push(newSRSCard);
      }
      
      localStorage.setItem(`srs_cards_${userId}`, JSON.stringify(allCards));
      return newSRSCard;
    } catch (error) {
      console.error('SRS 카드 추가 실패:', error);
      throw error;
    }
  }
  
  /**
   * 복습 결과 업데이트
   */
  async updateCardAfterReview(
    userId: string, 
    cardId: string, 
    performance: ReviewPerformance
  ): Promise<SRSCard | null> {
    
    try {
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      const cardIndex = allCards.findIndex(card => card.cardId === cardId);
      if (cardIndex === -1) {
        console.error('SRS 카드를 찾을 수 없습니다:', cardId);
        return null;
      }
      
      const currentCard = allCards[cardIndex];
      const updates = this.calculateNextReview(currentCard, performance);
      
      // 카드 업데이트
      allCards[cardIndex] = { ...currentCard, ...updates };
      localStorage.setItem(`srs_cards_${userId}`, JSON.stringify(allCards));
      
      return allCards[cardIndex];
    } catch (error) {
      console.error('SRS 카드 업데이트 실패:', error);
      return null;
    }
  }
  
  /**
   * 복습 세션 시작
   */
  async startReviewSession(userId: string, maxCards: number = 20): Promise<SRSReviewSession> {
    const reviewCards = await this.getCardsForReview(userId, maxCards);
    
    const session: SRSReviewSession = {
      sessionId: `review_${Date.now()}`,
      userId,
      reviewCards,
      startTime: new Date(),
      totalCards: reviewCards.length,
      completedCards: 0,
      accuracyRate: 0
    };
    
    return session;
  }
  
  /**
   * SRS 통계 조회
   */
  async getSRSStats(userId: string): Promise<{
    totalCards: number;
    dueToday: number;
    averageEaseFactor: number;
    accuracyRate: number;
    streakDays: number;
  }> {
    
    try {
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const dueCards = allCards.filter(card => new Date(card.nextReviewDate) <= today);
      const totalCorrect = allCards.reduce((sum, card) => sum + card.correctCount, 0);
      const totalIncorrect = allCards.reduce((sum, card) => sum + card.incorrectCount, 0);
      const averageEaseFactor = allCards.length > 0 
        ? allCards.reduce((sum, card) => sum + card.easeFactor, 0) / allCards.length 
        : 2.5;
      
      return {
        totalCards: allCards.length,
        dueToday: dueCards.length,
        averageEaseFactor: Math.round(averageEaseFactor * 100) / 100,
        accuracyRate: totalCorrect + totalIncorrect > 0 
          ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) 
          : 0,
        streakDays: 0 // 추후 구현
      };
    } catch (error) {
      console.error('SRS 통계 조회 실패:', error);
      return {
        totalCards: 0,
        dueToday: 0,
        averageEaseFactor: 2.5,
        accuracyRate: 0,
        streakDays: 0
      };
    }
  }
  
  /**
   * 레벨별 가중치가 적용된 랜덤 카드 선택
   */
  async getWeightedRandomCards(userId: string, maxCards: number = 20): Promise<SRSCard[]> {
    try {
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      if (allCards.length === 0) return [];
      
      // 가중치 계산 (틀린 횟수가 많을수록, 오래된 것일수록 높은 가중치)
      const weightedCards = allCards.map(card => {
        const daysSinceLastReview = Math.floor(
          (new Date().getTime() - new Date(card.lastReviewDate).getTime()) / (24 * 60 * 60 * 1000)
        );
        
        const errorWeight = card.incorrectCount + 1;
        const timeWeight = Math.max(1, daysSinceLastReview);
        const difficultyWeight = card.difficulty === 'hard' ? 1.5 : card.difficulty === 'medium' ? 1.2 : 1.0;
        
        return {
          card,
          weight: errorWeight * timeWeight * difficultyWeight
        };
      });
      
      // 가중치에 따른 랜덤 선택
      const selectedCards: SRSCard[] = [];
      const availableCards = [...weightedCards];
      
      for (let i = 0; i < Math.min(maxCards, availableCards.length); i++) {
        const totalWeight = availableCards.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let j = 0; j < availableCards.length; j++) {
          random -= availableCards[j].weight;
          if (random <= 0) {
            selectedCards.push(availableCards[j].card);
            availableCards.splice(j, 1);
            break;
          }
        }
      }
      
      return selectedCards;
    } catch (error) {
      console.error('가중치 랜덤 카드 선택 실패:', error);
      return [];
    }
  }
}

export const srsService = new SRSService();