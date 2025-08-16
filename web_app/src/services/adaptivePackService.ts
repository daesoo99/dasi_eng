// Adaptive Pack Service - 오답 + 망각곡선 + 패턴 완전 자동화

import { srsService, type SRSCard } from './srsService';
import { api } from '@/lib/api';
import type { DrillCard } from '@/types';

export interface WeaknessPattern {
  id: string;
  patternType: 'grammar' | 'vocabulary' | 'structure' | 'pronunciation';
  pattern: string;
  description: string;
  errorCount: number;
  lastErrorDate: Date;
  examples: string[];
  level: number;
  stage: number;
}

export interface AdaptivePackCard {
  id: string;
  cardId: string;
  cardData: DrillCard;
  
  // 선택 이유
  reason: 'wrong_answer' | 'forgetting_curve' | 'weakness_pattern' | 'difficulty_spike';
  reasonDetail: string;
  
  // 우선순위 점수
  priorityScore: number;
  
  // SRS 정보
  srsInfo?: SRSCard;
  
  // 약점 패턴 정보
  weaknessPatterns?: WeaknessPattern[];
  
  // 메타데이터
  selectedAt: Date;
  expectedDifficulty: 'easy' | 'medium' | 'hard';
}

export interface AdaptivePack {
  id: string;
  userId: string;
  title: string;
  description: string;
  
  // 구성 정보
  cards: AdaptivePackCard[];
  totalCards: number;
  estimatedTime: number; // 분
  
  // 분석 정보
  weaknessAnalysis: {
    grammarWeaknesses: WeaknessPattern[];
    vocabularyGaps: WeaknessPattern[];
    structuralIssues: WeaknessPattern[];
    pronunciationProblems: WeaknessPattern[];
  };
  
  // 학습 목표
  learningObjectives: string[];
  
  // 생성 정보
  generatedAt: Date;
  algorithm: 'standard' | 'intensive' | 'review_focused';
}

export interface LearningAnalytics {
  userId: string;
  
  // 전체 통계
  totalAnswered: number;
  correctRate: number;
  averageResponseTime: number;
  
  // 레벨별 성과
  levelPerformance: Record<number, {
    accuracy: number;
    averageTime: number;
    completedStages: number;
  }>;
  
  // 약점 패턴
  identifiedWeaknesses: WeaknessPattern[];
  
  // 학습 패턴
  learningPattern: {
    bestTimeOfDay: number; // 시간 (0-23)
    preferredSessionLength: number; // 분
    optimalDifficulty: 'easy' | 'medium' | 'hard';
  };
  
  // 추세 분석
  trend: {
    improvementRate: number; // 주간 개선율
    consistencyScore: number; // 학습 일관성 점수
    challengeReadiness: number; // 다음 레벨 준비도
  };
}

class AdaptivePackService {
  
  /**
   * 사용자별 학습 분석 수행
   */
  async analyzeLearningData(userId: string): Promise<LearningAnalytics> {
    try {
      // SRS 데이터 가져오기
      const srsStats = await srsService.getSRSStats(userId);
      const storedCards = localStorage.getItem(`srs_cards_${userId}`);
      const allSRSCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
      
      // 학습 기록 분석
      const totalAnswered = allSRSCards.reduce((sum, card) => sum + card.correctCount + card.incorrectCount, 0);
      const totalCorrect = allSRSCards.reduce((sum, card) => sum + card.correctCount, 0);
      const correctRate = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
      
      // 평균 응답 시간 계산
      const averageResponseTime = allSRSCards.length > 0 
        ? allSRSCards.reduce((sum, card) => sum + card.averageResponseTime, 0) / allSRSCards.length 
        : 0;
      
      // 레벨별 성과 분석
      const levelPerformance: Record<number, any> = {};
      allSRSCards.forEach(card => {
        if (!levelPerformance[card.level]) {
          levelPerformance[card.level] = {
            cards: [],
            totalCorrect: 0,
            totalAnswered: 0,
            totalTime: 0
          };
        }
        
        levelPerformance[card.level].cards.push(card);
        levelPerformance[card.level].totalCorrect += card.correctCount;
        levelPerformance[card.level].totalAnswered += card.correctCount + card.incorrectCount;
        levelPerformance[card.level].totalTime += card.averageResponseTime;
      });
      
      // 레벨별 통계 정리
      Object.keys(levelPerformance).forEach(level => {
        const data = levelPerformance[parseInt(level)];
        levelPerformance[parseInt(level)] = {
          accuracy: data.totalAnswered > 0 ? (data.totalCorrect / data.totalAnswered) * 100 : 0,
          averageTime: data.cards.length > 0 ? data.totalTime / data.cards.length : 0,
          completedStages: new Set(data.cards.map((card: SRSCard) => card.stage)).size
        };
      });
      
      // 약점 패턴 식별
      const identifiedWeaknesses = await this.identifyWeaknessPatterns(allSRSCards);
      
      // 학습 패턴 분석
      const learningPattern = {
        bestTimeOfDay: 14, // 기본값: 오후 2시
        preferredSessionLength: 20, // 기본값: 20분
        optimalDifficulty: correctRate > 80 ? 'hard' : correctRate > 60 ? 'medium' : 'easy' as const
      };
      
      // 추세 분석
      const trend = {
        improvementRate: this.calculateImprovementRate(allSRSCards),
        consistencyScore: this.calculateConsistencyScore(allSRSCards),
        challengeReadiness: correctRate > 75 ? 0.8 : correctRate > 60 ? 0.6 : 0.4
      };
      
      return {
        userId,
        totalAnswered,
        correctRate: Math.round(correctRate),
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        levelPerformance,
        identifiedWeaknesses,
        learningPattern,
        trend
      };
      
    } catch (error) {
      console.error('학습 분석 실패:', error);
      throw error;
    }
  }
  
  /**
   * 약점 패턴 식별
   */
  private async identifyWeaknessPatterns(srsCards: SRSCard[]): Promise<WeaknessPattern[]> {
    const weaknesses: WeaknessPattern[] = [];
    
    // 정답률이 낮은 카드들 분석
    const difficultCards = srsCards.filter(card => {
      const total = card.correctCount + card.incorrectCount;
      return total > 0 && (card.correctCount / total) < 0.6;
    });
    
    // 레벨별 그룹화
    const levelGroups = difficultCards.reduce((groups, card) => {
      if (!groups[card.level]) groups[card.level] = [];
      groups[card.level].push(card);
      return groups;
    }, {} as Record<number, SRSCard[]>);
    
    // 각 레벨별 약점 패턴 생성
    Object.entries(levelGroups).forEach(([level, cards]) => {
      if (cards.length >= 3) { // 최소 3개 이상일 때만 패턴으로 인식
        const levelNum = parseInt(level);
        
        weaknesses.push({
          id: `level_${level}_weakness`,
          patternType: levelNum <= 2 ? 'grammar' : levelNum <= 4 ? 'vocabulary' : 'structure',
          pattern: `Level ${level} 전반적 어려움`,
          description: `Level ${level}에서 지속적인 어려움을 보이고 있습니다. 기초 개념 재학습이 필요합니다.`,
          errorCount: cards.reduce((sum, card) => sum + card.incorrectCount, 0),
          lastErrorDate: new Date(Math.max(...cards.map(card => new Date(card.lastReviewDate).getTime()))),
          examples: cards.slice(0, 3).map(card => `Card ID: ${card.cardId}`),
          level: levelNum,
          stage: Math.round(cards.reduce((sum, card) => sum + card.stage, 0) / cards.length)
        });
      }
    });
    
    // easeFactor가 낮은 카드들 (어려운 카드들)
    const hardCards = srsCards.filter(card => card.easeFactor < 2.0);
    if (hardCards.length >= 5) {
      weaknesses.push({
        id: 'difficult_cards_pattern',
        patternType: 'structure',
        pattern: '복잡한 구조 문제',
        description: '복잡한 문법 구조나 고급 어휘에서 어려움을 보이고 있습니다.',
        errorCount: hardCards.reduce((sum, card) => sum + card.incorrectCount, 0),
        lastErrorDate: new Date(Math.max(...hardCards.map(card => new Date(card.lastReviewDate).getTime()))),
        examples: hardCards.slice(0, 3).map(card => `Card ID: ${card.cardId}`),
        level: Math.round(hardCards.reduce((sum, card) => sum + card.level, 0) / hardCards.length),
        stage: Math.round(hardCards.reduce((sum, card) => sum + card.stage, 0) / hardCards.length)
      });
    }
    
    return weaknesses;
  }
  
  /**
   * 개선율 계산
   */
  private calculateImprovementRate(srsCards: SRSCard[]): number {
    // 최근 학습한 카드들의 repetitions 평균으로 개선율 추정
    const recentCards = srsCards.filter(card => {
      const daysSince = (Date.now() - new Date(card.lastReviewDate).getTime()) / (24 * 60 * 60 * 1000);
      return daysSince <= 7; // 최근 7일
    });
    
    if (recentCards.length === 0) return 0;
    
    const averageRepetitions = recentCards.reduce((sum, card) => sum + card.repetitions, 0) / recentCards.length;
    return Math.min(100, averageRepetitions * 20); // 0-100 점수로 변환
  }
  
  /**
   * 일관성 점수 계산
   */
  private calculateConsistencyScore(srsCards: SRSCard[]): number {
    if (srsCards.length === 0) return 0;
    
    // 학습 간격의 일관성 측정
    const intervals = srsCards.map(card => {
      const daysSince = (Date.now() - new Date(card.lastReviewDate).getTime()) / (24 * 60 * 60 * 1000);
      return Math.min(daysSince, 30); // 최대 30일로 제한
    });
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 일관성 점수 (표준편차가 낮을수록 높은 점수)
    return Math.max(0, 100 - (standardDeviation * 10));
  }
  
  /**
   * Adaptive Pack 생성
   */
  async generateAdaptivePack(
    userId: string, 
    targetSize: number = 15,
    algorithm: 'standard' | 'intensive' | 'review_focused' = 'standard'
  ): Promise<AdaptivePack> {
    
    try {
      // 1. 학습 분석 수행
      const analytics = await this.analyzeLearningData(userId);
      
      // 2. 오답 카드 수집
      const wrongAnswerCards = await this.getWrongAnswerCards(userId);
      
      // 3. 망각곡선 복습 카드 수집
      const forgettingCurveCards = await srsService.getCardsForReview(userId, 50);
      
      // 4. 약점 패턴 기반 추가 카드 수집
      const patternCards = await this.getPatternReinforcementCards(analytics.identifiedWeaknesses);
      
      // 5. 우선순위 점수 계산 및 카드 선별
      const candidateCards = await this.prioritizeAndSelectCards(
        wrongAnswerCards,
        forgettingCurveCards,
        patternCards,
        targetSize,
        algorithm
      );
      
      // 6. 학습 목표 생성
      const learningObjectives = this.generateLearningObjectives(analytics, candidateCards);
      
      // 7. Adaptive Pack 생성
      const adaptivePack: AdaptivePack = {
        id: `adaptive_pack_${Date.now()}`,
        userId,
        title: this.generatePackTitle(analytics, algorithm),
        description: this.generatePackDescription(analytics, candidateCards.length),
        cards: candidateCards,
        totalCards: candidateCards.length,
        estimatedTime: Math.ceil(candidateCards.length * 1.5), // 카드당 1.5분 추정
        weaknessAnalysis: {
          grammarWeaknesses: analytics.identifiedWeaknesses.filter(w => w.patternType === 'grammar'),
          vocabularyGaps: analytics.identifiedWeaknesses.filter(w => w.patternType === 'vocabulary'),
          structuralIssues: analytics.identifiedWeaknesses.filter(w => w.patternType === 'structure'),
          pronunciationProblems: analytics.identifiedWeaknesses.filter(w => w.patternType === 'pronunciation')
        },
        learningObjectives,
        generatedAt: new Date(),
        algorithm
      };
      
      // 8. 로컬 저장
      this.saveAdaptivePack(userId, adaptivePack);
      
      return adaptivePack;
      
    } catch (error) {
      console.error('Adaptive Pack 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 오답 카드 수집
   */
  private async getWrongAnswerCards(userId: string): Promise<AdaptivePackCard[]> {
    const storedCards = localStorage.getItem(`srs_cards_${userId}`);
    const allSRSCards: SRSCard[] = storedCards ? JSON.parse(storedCards) : [];
    
    // 오답률이 높은 카드들 (최소 2번 이상 시도)
    const wrongCards = allSRSCards.filter(card => {
      const total = card.correctCount + card.incorrectCount;
      return total >= 2 && (card.incorrectCount / total) > 0.4;
    });
    
    const adaptiveCards: AdaptivePackCard[] = [];
    
    for (const srsCard of wrongCards) {
      try {
        // 실제 카드 데이터 로드
        const response = await api.getCards(srsCard.level, srsCard.stage);
        if (response.success && response.data) {
          const cardData = response.data.cards.find(card => card.id === srsCard.cardId);
          if (cardData) {
            adaptiveCards.push({
              id: `wrong_${srsCard.cardId}`,
              cardId: srsCard.cardId,
              cardData,
              reason: 'wrong_answer',
              reasonDetail: `오답률 ${Math.round((srsCard.incorrectCount / (srsCard.correctCount + srsCard.incorrectCount)) * 100)}%`,
              priorityScore: srsCard.incorrectCount * 2,
              srsInfo: srsCard,
              selectedAt: new Date(),
              expectedDifficulty: 'hard'
            });
          }
        }
      } catch (error) {
        console.error(`카드 로드 실패: ${srsCard.cardId}`, error);
      }
    }
    
    return adaptiveCards;
  }
  
  /**
   * 패턴 보강 카드 수집
   */
  private async getPatternReinforcementCards(weaknesses: WeaknessPattern[]): Promise<AdaptivePackCard[]> {
    const adaptiveCards: AdaptivePackCard[] = [];
    
    for (const weakness of weaknesses) {
      try {
        // 약점 패턴과 관련된 레벨/스테이지에서 추가 카드 수집
        const response = await api.getCards(weakness.level, weakness.stage);
        if (response.success && response.data) {
          // 랜덤하게 2-3개 카드 선택
          const shuffled = response.data.cards.sort(() => 0.5 - Math.random());
          const selectedCards = shuffled.slice(0, 3);
          
          selectedCards.forEach(cardData => {
            adaptiveCards.push({
              id: `pattern_${cardData.id}`,
              cardId: cardData.id,
              cardData,
              reason: 'weakness_pattern',
              reasonDetail: `${weakness.pattern} 보강`,
              priorityScore: weakness.errorCount,
              weaknessPatterns: [weakness],
              selectedAt: new Date(),
              expectedDifficulty: 'medium'
            });
          });
        }
      } catch (error) {
        console.error(`패턴 카드 로드 실패: Level ${weakness.level}`, error);
      }
    }
    
    return adaptiveCards;
  }
  
  /**
   * 카드 우선순위 계산 및 선별
   */
  private async prioritizeAndSelectCards(
    wrongCards: AdaptivePackCard[],
    forgettingCards: SRSCard[],
    patternCards: AdaptivePackCard[],
    targetSize: number,
    algorithm: 'standard' | 'intensive' | 'review_focused'
  ): Promise<AdaptivePackCard[]> {
    
    // 망각곡선 카드를 AdaptivePackCard로 변환
    const forgettingAdaptiveCards: AdaptivePackCard[] = [];
    for (const srsCard of forgettingCards) {
      try {
        const response = await api.getCards(srsCard.level, srsCard.stage);
        if (response.success && response.data) {
          const cardData = response.data.cards.find(card => card.id === srsCard.cardId);
          if (cardData) {
            const overdueDays = Math.floor(
              (Date.now() - new Date(srsCard.nextReviewDate).getTime()) / (24 * 60 * 60 * 1000)
            );
            
            forgettingAdaptiveCards.push({
              id: `forgetting_${srsCard.cardId}`,
              cardId: srsCard.cardId,
              cardData,
              reason: 'forgetting_curve',
              reasonDetail: `${overdueDays}일 지연`,
              priorityScore: Math.max(0, overdueDays) + srsCard.incorrectCount,
              srsInfo: srsCard,
              selectedAt: new Date(),
              expectedDifficulty: srsCard.easeFactor < 2.0 ? 'hard' : 'medium'
            });
          }
        }
      } catch (error) {
        console.error(`망각곡선 카드 로드 실패: ${srsCard.cardId}`, error);
      }
    }
    
    // 모든 카드 합치기
    const allCards = [...wrongCards, ...forgettingAdaptiveCards, ...patternCards];
    
    // 중복 제거
    const uniqueCards = allCards.filter((card, index, self) => 
      index === self.findIndex(c => c.cardId === card.cardId)
    );
    
    // 알고리즘별 가중치 적용
    uniqueCards.forEach(card => {
      switch (algorithm) {
        case 'intensive':
          if (card.reason === 'wrong_answer') card.priorityScore *= 2;
          break;
        case 'review_focused':
          if (card.reason === 'forgetting_curve') card.priorityScore *= 1.5;
          break;
        default: // standard
          // 균형잡힌 가중치 유지
          break;
      }
    });
    
    // 우선순위 정렬 및 선별
    uniqueCards.sort((a, b) => b.priorityScore - a.priorityScore);
    return uniqueCards.slice(0, targetSize);
  }
  
  /**
   * 학습 목표 생성
   */
  private generateLearningObjectives(analytics: LearningAnalytics, cards: AdaptivePackCard[]): string[] {
    const objectives: string[] = [];
    
    // 정답률 기반 목표
    if (analytics.correctRate < 70) {
      objectives.push('기초 정확도 70% 이상 달성');
    } else if (analytics.correctRate < 85) {
      objectives.push('학습 정확도 85% 이상 향상');
    }
    
    // 약점 패턴 기반 목표
    analytics.identifiedWeaknesses.forEach(weakness => {
      objectives.push(`${weakness.pattern} 개선`);
    });
    
    // 카드 구성 기반 목표
    const wrongAnswerCount = cards.filter(c => c.reason === 'wrong_answer').length;
    if (wrongAnswerCount > 0) {
      objectives.push(`오답 문제 ${wrongAnswerCount}개 완전 정복`);
    }
    
    const forgettingCount = cards.filter(c => c.reason === 'forgetting_curve').length;
    if (forgettingCount > 0) {
      objectives.push(`복습 지연 문제 ${forgettingCount}개 해결`);
    }
    
    return objectives.slice(0, 4); // 최대 4개
  }
  
  /**
   * 팩 제목 생성
   */
  private generatePackTitle(analytics: LearningAnalytics, algorithm: string): string {
    const algorithmNames = {
      standard: '맞춤형',
      intensive: '집중',
      review_focused: '복습 중심'
    };
    
    const accuracyLevel = analytics.correctRate > 80 ? '고급' : 
                         analytics.correctRate > 60 ? '중급' : '기초';
    
    return `${algorithmNames[algorithm]} ${accuracyLevel} 학습팩`;
  }
  
  /**
   * 팩 설명 생성
   */
  private generatePackDescription(analytics: LearningAnalytics, cardCount: number): string {
    const weaknessCount = analytics.identifiedWeaknesses.length;
    const accuracyText = `현재 정답률 ${analytics.correctRate}%`;
    
    return `${accuracyText}를 바탕으로 ${weaknessCount}개의 약점 패턴을 분석하여 ${cardCount}개의 맞춤형 문제를 선별했습니다. AI가 추천하는 최적의 학습 순서로 구성되었습니다.`;
  }
  
  /**
   * Adaptive Pack 저장
   */
  private saveAdaptivePack(userId: string, pack: AdaptivePack): void {
    try {
      const key = `adaptive_pack_${userId}`;
      const existingPacks = localStorage.getItem(key);
      const packs: AdaptivePack[] = existingPacks ? JSON.parse(existingPacks) : [];
      
      // 최신 팩을 맨 앞에 추가 (최대 5개 유지)
      packs.unshift(pack);
      const limitedPacks = packs.slice(0, 5);
      
      localStorage.setItem(key, JSON.stringify(limitedPacks));
    } catch (error) {
      console.error('Adaptive Pack 저장 실패:', error);
    }
  }
  
  /**
   * 저장된 Adaptive Pack 조회
   */
  async getSavedAdaptivePacks(userId: string): Promise<AdaptivePack[]> {
    try {
      const key = `adaptive_pack_${userId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Adaptive Pack 조회 실패:', error);
      return [];
    }
  }
}

export const adaptivePackService = new AdaptivePackService();