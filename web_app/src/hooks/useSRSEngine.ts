/**
 * SRS Engine React Hook
 * 
 * 기능:
 * - 통합 SRS 엔진 관리
 * - 복습 카드 상태 관리
 * - 복습 세션 처리
 * - 학습 통계 제공
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StorageManager } from './useLocalStorage';
import { 
  ISRSEngine, 
  ReviewCard, 
  ReviewSession, 
  SRSConfig 
} from '../services/srs/interfaces/ISRSEngine';
import { getGlobalSRSContainer } from '../services/srs/container/SRSContainer';
import { SRS_SERVICES } from '../services/srs/container/SRSContainer';

export interface UseSRSEngineConfig {
  userId: string;
  srsConfig?: Partial<SRSConfig>;
  storageKey?: string;
}

export interface UseSRSEngineReturn {
  // 카드 관리
  cards: ReviewCard[];
  addCard: (content: ReviewCard['content']) => ReviewCard;
  updateCard: (cardId: string, session: ReviewSession) => void;
  removeCard: (cardId: string) => void;
  
  // 복습 시스템
  dueCards: ReviewCard[];
  getDueCards: () => ReviewCard[];
  getCardById: (cardId: string) => ReviewCard | undefined;
  
  // 세션 관리
  processReviewSession: (cardId: string, session: Omit<ReviewSession, 'timestamp'>) => ReviewCard | null;
  
  // 통계
  stats: {
    totalCards: number;
    dueForReview: number;
    averageMemoryStrength: number;
    masteredCards: number;
    learningCards: number;
    avgAccuracy: number;
    avgResponseTime: number;
  };
  
  // 유틸리티
  clearAllData: () => void;
  exportData: () => string;
  importData: (data: string) => boolean;
  
  // 엔진 설정
  updateConfig: (config: Partial<SRSConfig>) => void;
  getConfig: () => SRSConfig;
}

export const useSRSEngine = ({
  userId,
  srsConfig = {},
  storageKey = 'srs-cards'
}: UseSRSEngineConfig): UseSRSEngineReturn => {
  
  // 모듈화된 SRS 엔진 인스턴스 (컨테이너에서 주입)
  const engineRef = useRef<ISRSEngine | null>(null);
  
  // 엔진 초기화 (첫 렌더링시에만)
  if (!engineRef.current) {
    const container = getGlobalSRSContainer();
    const engine = container.resolve<ISRSEngine>(SRS_SERVICES.ENGINE);
    
    // 사용자 설정이 있다면 적용
    if (Object.keys(srsConfig).length > 0) {
      engine.updateConfig(srsConfig);
    }
    
    engineRef.current = engine;
  }
  
  // 로컬 스토리지에서 카드 데이터 관리 (직접 구현)
  const [cards, setCardsState] = useState<ReviewCard[]>([]);
  const fullStorageKey = `${storageKey}-${userId}`;

  // 초기 데이터 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(fullStorageKey);
      if (stored) {
        const parsedCards = JSON.parse(stored);
        if (Array.isArray(parsedCards)) {
          setCardsState(parsedCards);
        }
      }
    } catch (error) {
      console.error('Failed to load SRS cards:', error);
      setCardsState([]);
    }
  }, [fullStorageKey]);

  // 카드 업데이트 함수
  const setCards = useCallback((updater: (prev: ReviewCard[]) => ReviewCard[]) => {
    setCardsState(prevCards => {
      const newCards = updater(prevCards);
      try {
        localStorage.setItem(fullStorageKey, JSON.stringify(newCards));
      } catch (error) {
        console.error('Failed to save SRS cards:', error);
      }
      return newCards;
    });
  }, [fullStorageKey]);

  // 복습 예정 카드들 (메모이제이션)
  const dueCards = useMemo(() => {
    if (!engineRef.current) return [];
    // 방어적 코딩: cards가 undefined이거나 배열이 아닌 경우 빈 배열 전달
    const safeCards = Array.isArray(cards) ? cards : [];
    return engineRef.current.getCardsForReview(safeCards);
  }, [cards]);

  // 학습 통계 (메모이제이션)
  const stats = useMemo(() => {
    if (!engineRef.current) {
      return {
        totalCards: 0,
        dueForReview: 0,
        averageMemoryStrength: 0,
        masteredCards: 0,
        learningCards: 0,
        avgAccuracy: 0,
        avgResponseTime: 0
      };
    }
    // 방어적 코딩: cards가 undefined이거나 배열이 아닌 경우 빈 배열 전달
    const safeCards = Array.isArray(cards) ? cards : [];
    return engineRef.current.calculateStats(safeCards);
  }, [cards]);

  // 새 카드 추가
  const addCard = useCallback((content: ReviewCard['content']): ReviewCard => {
    if (!engineRef.current) {
      throw new Error('SRS 엔진이 초기화되지 않았습니다.');
    }
    const newCard = engineRef.current.createCard(content);
    
    setCards(prevCards => {
      // 중복 카드 확인
      const existingCard = prevCards.find(card => 
        card.content.korean === content.korean && 
        card.content.english === content.english &&
        card.content.pattern === content.pattern
      );
      
      if (existingCard) {
        console.warn('이미 존재하는 카드입니다:', content.korean);
        return prevCards;
      }
      
      console.log('새 SRS 카드 추가:', content.korean);
      return [...prevCards, newCard];
    });
    
    return newCard;
  }, [setCards]);

  // 카드 업데이트 (복습 결과 반영)
  const updateCard = useCallback((cardId: string, session: ReviewSession) => {
    setCards(prevCards => {
      const cardIndex = prevCards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        console.warn('카드를 찾을 수 없습니다:', cardId);
        return prevCards;
      }
      
      if (!engineRef.current) return prevCards;
      const updatedCard = engineRef.current.updateCard(prevCards[cardIndex], session);
      const newCards = [...prevCards];
      newCards[cardIndex] = updatedCard;
      
      console.log(`카드 업데이트됨: ${updatedCard.content.korean} (강도: ${updatedCard.memory.strength.toFixed(2)})`);
      return newCards;
    });
  }, [setCards]);

  // 카드 제거
  const removeCard = useCallback((cardId: string) => {
    setCards(prevCards => {
      const filteredCards = prevCards.filter(card => card.id !== cardId);
      console.log('카드 삭제됨:', cardId);
      return filteredCards;
    });
  }, [setCards]);

  // 복습 예정 카드들 가져오기
  const getDueCards = useCallback(() => {
    if (!engineRef.current) return [];
    // 방어적 코딩: cards가 undefined이거나 배열이 아닌 경우 빈 배열 전달
    const safeCards = Array.isArray(cards) ? cards : [];
    return engineRef.current.getCardsForReview(safeCards);
  }, [cards]);

  // ID로 카드 찾기
  const getCardById = useCallback((cardId: string) => {
    // 방어적 코딩: cards가 undefined이거나 배열이 아닌 경우 undefined 반환
    if (!Array.isArray(cards)) return undefined;
    return cards.find(card => card.id === cardId);
  }, [cards]);

  // 복습 세션 처리
  const processReviewSession = useCallback((
    cardId: string, 
    sessionData: Omit<ReviewSession, 'timestamp'>
  ): ReviewCard | null => {
    const card = getCardById(cardId);
    if (!card) {
      console.warn('복습 세션 처리 실패 - 카드를 찾을 수 없음:', cardId);
      return null;
    }

    const session: ReviewSession = {
      ...sessionData,
      timestamp: new Date()
    };

    updateCard(cardId, session);
    
    // 업데이트된 카드 반환
    if (!engineRef.current) return null;
    return engineRef.current.updateCard(card, session);
  }, [getCardById, updateCard]);

  // 모든 데이터 초기화
  const clearAllData = useCallback(() => {
    setCards([]);
    console.log('SRS 데이터가 초기화되었습니다.');
  }, [setCards]);

  // 데이터 내보내기
  const exportData = useCallback((): string => {
    const exportData = {
      cards,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      userId
    };
    return JSON.stringify(exportData, null, 2);
  }, [cards, userId]);

  // 데이터 가져오기
  const importData = useCallback((data: string): boolean => {
    try {
      const parsedData = JSON.parse(data);
      
      if (!Array.isArray(parsedData.cards)) {
        console.error('잘못된 데이터 형식: cards 배열이 없습니다.');
        return false;
      }

      // 데이터 검증
      const validCards = parsedData.cards.filter((card: any) => 
        card.id && card.content && card.memory && card.performance
      );

      if (validCards.length !== parsedData.cards.length) {
        console.warn(`${parsedData.cards.length - validCards.length}개의 잘못된 카드가 필터링되었습니다.`);
      }

      setCards(validCards);
      console.log(`${validCards.length}개의 카드를 가져왔습니다.`);
      return true;
      
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      return false;
    }
  }, [setCards]);

  // 엔진 설정 업데이트
  const updateConfig = useCallback((config: Partial<SRSConfig>) => {
    if (!engineRef.current) {
      console.warn('SRS 엔진이 초기화되지 않았습니다.');
      return;
    }
    engineRef.current.updateConfig(config);
    console.log('SRS 엔진 설정이 업데이트되었습니다.');
  }, []);

  // 현재 엔진 설정 반환
  const getConfig = useCallback(() => {
    if (!engineRef.current) {
      throw new Error('SRS 엔진이 초기화되지 않았습니다.');
    }
    return engineRef.current.getConfig();
  }, []);

  return {
    // 카드 관리
    cards,
    addCard,
    updateCard,
    removeCard,
    
    // 복습 시스템
    dueCards,
    getDueCards,
    getCardById,
    
    // 세션 관리
    processReviewSession,
    
    // 통계
    stats,
    
    // 유틸리티
    clearAllData,
    exportData,
    importData,
    
    // 엔진 설정
    updateConfig,
    getConfig
  };
};

export default useSRSEngine;