/**
 * ContentPort - 패턴 데이터 조회 및 필터링
 */

import { DrillCard, CardQuery } from '../../shared/types/core';

export interface ContentPort {
  /**
   * 쿼리 조건에 맞는 카드 검색
   */
  findCards(query: CardQuery): Promise<DrillCard[]>;
  
  /**
   * 특정 레벨/스테이지 카드 조회
   */
  getStageCards(level: number, stage: number): Promise<DrillCard[]>;
  
  /**
   * 카드 개수 카운트
   */
  countCards(query: CardQuery): Promise<number>;
  
  /**
   * 카드 ID로 단일 카드 조회
   */
  getCardById(cardId: string): Promise<DrillCard | null>;
  
  /**
   * 난이도별 카드 필터링
   */
  getCardsByDifficulty(level: number, difficulty: number): Promise<DrillCard[]>;

  /**
   * 레벨 정보 조회
   */
  getLevel(levelId: string): Promise<any>;
  
  /**
   * 모든 레벨 조회
   */
  getLevels(): Promise<any[]>;
  
  /**
   * 스테이지 정보 조회
   */
  getStage(stageId: string): Promise<any>;
  
  /**
   * 카드 목록 조회 (필터 지원)
   */
  getCards(filters: any): Promise<any[]>;
}