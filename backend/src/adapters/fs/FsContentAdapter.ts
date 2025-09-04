/**
 * FsContentAdapter - 파일 시스템 기반 컨텐츠 어댑터 (개발용)
 * 기존 JSON 파일들을 읽어서 ContentPort 인터페이스 제공
 */

import { ContentPort } from '../../domain/ports/ContentPort';
import { DrillCard, CardQuery } from '../../shared/types/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class FsContentAdapter implements ContentPort {
  private cardCache: Map<string, DrillCard[]> = new Map();
  private readonly baseDir: string;

  constructor(baseDir: string = '../web_app/public/patterns/banks') {
    this.baseDir = baseDir;
  }

  async findCards(query: CardQuery): Promise<DrillCard[]> {
    const { level, stage, limit = 20, offset = 0, difficulty, tags } = query;
    
    let cards: DrillCard[] = [];
    
    if (level && stage) {
      cards = await this.getStageCards(level, stage);
    } else if (level) {
      cards = await this.getLevelCards(level);
    } else {
      cards = await this.getAllCards();
    }

    // 필터링
    if (difficulty !== undefined) {
      cards = cards.filter(card => Math.abs(card.difficulty - difficulty) < 0.5);
    }
    
    if (tags && tags.length > 0) {
      cards = cards.filter(card => 
        card.tags && card.tags.some(tag => tags.includes(tag))
      );
    }

    // 페이징
    return cards.slice(offset, offset + limit);
  }

  async getStageCards(level: number, stage: number): Promise<DrillCard[]> {
    const cacheKey = `L${level}-S${stage}`;
    
    if (this.cardCache.has(cacheKey)) {
      return this.cardCache.get(cacheKey)!;
    }

    try {
      const filename = `Lv${level}-P1-S${String(stage).padStart(2, '0')}_bank.json`;
      const filePath = join(this.baseDir, `level_${level}`, filename);
      
      console.log(`📁 FsContentAdapter: Looking for file at ${filePath}`);
      
      if (!existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return [];
      }

      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // JSON 구조를 DrillCard 형태로 변환
      // Level 4+ JSON 파일은 sentences 배열 구조 사용
      const sourceArray = data.sentences || data.patterns || data.cards || [];
      const cards: DrillCard[] = sourceArray.map((item: any, index: number) => ({
        id: `${cacheKey}-${index}`,
        front_ko: item.korean || item.front_ko || '',
        back_en: item.english || item.back_en || '',
        target_en: item.english || item.back_en || '', // StudyPage에서 target_en 필드 필요
        kr: item.korean || item.front_ko || '', // StudyPage에서 kr 필드 필요
        level: level,
        stage: stage,
        difficulty: item.difficulty || this.calculateDifficulty(level, stage),
        tags: item.tags || []
      }));

      this.cardCache.set(cacheKey, cards);
      return cards;
    } catch (error) {
      console.error(`Failed to load cards from ${level}-${stage}:`, error);
      return [];
    }
  }

  async countCards(query: CardQuery): Promise<number> {
    const cards = await this.findCards({ ...query, limit: 10000 });
    return cards.length;
  }

  async getCardById(cardId: string): Promise<DrillCard | null> {
    // cardId 형태: "L1-S1-0" (Level-Stage-Index)
    const match = cardId.match(/L(\d+)-S(\d+)-(\d+)/);
    if (!match) return null;

    const [, level, stage, index] = match;
    const cards = await this.getStageCards(parseInt(level), parseInt(stage));
    
    return cards[parseInt(index)] || null;
  }

  async getCardsByDifficulty(level: number, difficulty: number): Promise<DrillCard[]> {
    const cards = await this.getLevelCards(level);
    return cards.filter(card => Math.abs(card.difficulty - difficulty) < 0.5);
  }

  // ============ Private Methods ============

  private async getLevelCards(level: number): Promise<DrillCard[]> {
    const allCards: DrillCard[] = [];
    
    // Level의 모든 스테이지 카드 수집
    for (let stage = 1; stage <= 20; stage++) { // 일반적으로 스테이지는 1-20
      const stageCards = await this.getStageCards(level, stage);
      if (stageCards.length === 0) break; // 더 이상 스테이지 없음
      allCards.push(...stageCards);
    }
    
    return allCards;
  }

  private async getAllCards(): Promise<DrillCard[]> {
    const allCards: DrillCard[] = [];
    
    // 모든 레벨의 카드 수집
    for (let level = 1; level <= 10; level++) {
      const levelCards = await this.getLevelCards(level);
      allCards.push(...levelCards);
    }
    
    return allCards;
  }

  private calculateDifficulty(level: number, stage: number): number {
    // 간단한 난이도 계산 로직
    return Math.min(5.0, level + (stage * 0.1));
  }

  // ContentPort 인터페이스의 새로운 메서드들
  async getLevel(levelId: string): Promise<any> {
    // 레벨 ID에서 숫자 추출
    const levelNum = parseInt(levelId.replace(/\D/g, ''));
    if (isNaN(levelNum)) return null;

    return {
      id: levelId,
      name: `Level ${levelNum}`,
      level: levelNum,
      description: `Level ${levelNum} content`,
      totalStages: 20
    };
  }

  async getLevels(): Promise<any[]> {
    // 1-10 레벨 반환
    return Array.from({ length: 10 }, (_, i) => ({
      id: `level_${i + 1}`,
      name: `Level ${i + 1}`,
      level: i + 1,
      description: `Level ${i + 1} content`,
      totalStages: 20
    }));
  }

  async getStage(stageId: string): Promise<any> {
    // 스테이지 ID 파싱 (예: "L1-S1")
    const match = stageId.match(/L(\d+)-S(\d+)/);
    if (!match) return null;

    const [, level, stage] = match;
    return {
      id: stageId,
      name: `Stage ${stage}`,
      level: parseInt(level),
      stage: parseInt(stage),
      description: `Level ${level} Stage ${stage} content`
    };
  }

  async getCards(filters: any): Promise<any[]> {
    const { level, stage, limit, offset } = filters;
    const query: CardQuery = {
      level,
      stage,
      limit: limit || 20,
      offset: offset || 0
    };
    
    return await this.findCards(query);
  }
}