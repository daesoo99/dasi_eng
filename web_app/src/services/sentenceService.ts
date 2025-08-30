/**
 * 🎲 Stage별 랜덤 문장 생성 서비스 (v2.2.0)
 * 
 * 패턴 데이터를 Firebase Storage에서 로드합니다:
 * 1. Firebase Storage (주 데이터 소스)
 * 2. 로컬 파일 (마이그레이션 기간 fallback)
 * 3. examples 필드 (최종 fallback)
 */

import { patternDataLoader, type BankData } from './patternDataLoader';

interface Sentence {
  id: string;
  kr: string;
  en: string;
  form?: string;
}

// BankData interface moved to patternDataLoader.ts

interface RandomSentenceResult {
  sentence: Sentence;
  source: 'sentences' | 'sample_sentences' | 'examples' | 'fallback';
  total: number;
}

class SentenceService {
  // 캐시 로직은 patternDataLoader에서 처리

  /**
   * 🎯 특정 Stage의 랜덤 문장을 가져옵니다
   */
  async getRandomSentence(level: number, stageId: string): Promise<RandomSentenceResult | null> {
    console.log(`[DEBUG] 🎲 문장 요청: Level ${level}, Stage ${stageId}`);
    
    try {
      const bankData = await this.loadBankData(level, stageId);
      if (!bankData) {
        console.warn(`[SentenceService] Bank data not found: ${stageId}`);
        return null;
      }

      // 우선순위: sentences → sample_sentences → examples
      const candidates = this.getSentenceCandidates(bankData);
      if (candidates.sentences.length === 0) {
        console.warn(`[SentenceService] No sentences found: ${stageId}`);
        return this.createFallbackSentence(stageId);
      }

      const randomSentence = this.selectRandomSentence(candidates.sentences);
      
      console.log(`[DEBUG] ✅ 문장 선택됨: "${randomSentence.kr}" (소스: ${candidates.source})`);
      
      return {
        sentence: randomSentence,
        source: candidates.source,
        total: candidates.sentences.length
      };
    } catch (error) {
      console.error(`[SentenceService] Error loading sentence for ${stageId}:`, error);
      return this.createFallbackSentence(stageId);
    }
  }

  /**
   * 🎯 여러 문장을 한 번에 랜덤 선택 (중복 방지)
   */
  async getRandomSentences(level: number, stageId: string, count: number = 5): Promise<RandomSentenceResult[]> {
    console.log(`[DEBUG] 🎲 복수 문장 요청: Level ${level}, Stage ${stageId}, Count ${count}`);
    
    try {
      const bankData = await this.loadBankData(level, stageId);
      if (!bankData) {
        return [];
      }

      const candidates = this.getSentenceCandidates(bankData);
      if (candidates.sentences.length === 0) {
        return [];
      }

      const selectedSentences = this.selectMultipleRandomSentences(candidates.sentences, count);
      
      return selectedSentences.map(sentence => ({
        sentence,
        source: candidates.source,
        total: candidates.sentences.length
      }));
    } catch (error) {
      console.error(`[SentenceService] Error loading sentences for ${stageId}:`, error);
      return [];
    }
  }

  /**
   * 📂 Bank 데이터를 로드합니다 (Firebase Storage + fallback)
   */
  private async loadBankData(level: number, stageId: string): Promise<BankData | null> {
    try {
      const result = await patternDataLoader.loadBankData(level, stageId);
      
      console.log(`[DEBUG] 📦 데이터 로드: ${stageId} (source: ${result.source}, time: ${result.loadTime}ms)`);
      
      return result.data;
    } catch (error) {
      console.error(`[SentenceService] Data load failed for ${stageId}:`, error);
      return null;
    }
  }

  // 데이터 소스 경로 로직은 patternDataLoader에서 처리

  /**
   * 🔍 문장 후보들을 우선순위에 따라 선택합니다
   */
  private getSentenceCandidates(bankData: BankData): { sentences: Sentence[]; source: RandomSentenceResult['source'] } {
    // 1순위: sentences
    if (bankData.sentences && bankData.sentences.length > 0) {
      return { sentences: bankData.sentences, source: 'sentences' };
    }
    
    // 2순위: sample_sentences
    if (bankData.sample_sentences && bankData.sample_sentences.length > 0) {
      return { sentences: bankData.sample_sentences, source: 'sample_sentences' };
    }
    
    // 3순위: examples
    if (bankData.examples && bankData.examples.length > 0) {
      return { sentences: bankData.examples, source: 'examples' };
    }
    
    return { sentences: [], source: 'fallback' };
  }

  /**
   * 🎲 단일 랜덤 문장 선택
   */
  private selectRandomSentence(sentences: Sentence[]): Sentence {
    const randomIndex = Math.floor(Math.random() * sentences.length);
    return sentences[randomIndex];
  }

  /**
   * 🎲 복수 랜덤 문장 선택 (중복 방지)
   */
  private selectMultipleRandomSentences(sentences: Sentence[], count: number): Sentence[] {
    const shuffled = [...sentences].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, sentences.length));
  }

  /**
   * 🛡️ Fallback 문장 생성 (데이터가 없을 때)
   */
  private createFallbackSentence(stageId: string): RandomSentenceResult {
    return {
      sentence: {
        id: `${stageId}-fallback`,
        kr: '문장을 불러오는 중입니다...',
        en: 'Loading sentence...',
        form: 'aff'
      },
      source: 'fallback',
      total: 1
    };
  }

  /**
   * 🧹 캐시 정리 (patternDataLoader에 위임)
   */
  clearCache(): void {
    patternDataLoader.clearCache();
    console.log('[SentenceService] 캐시 정리 완료');
  }

  /**
   * 📊 캐시 상태 확인
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 🌟 글로벌 인스턴스 (싱글톤)
export const sentenceService = new SentenceService();

// 🎯 편의 함수들
export async function getRandomSentence(level: number, stageId: string): Promise<RandomSentenceResult | null> {
  return sentenceService.getRandomSentence(level, stageId);
}

export async function getRandomSentences(level: number, stageId: string, count: number = 5): Promise<RandomSentenceResult[]> {
  return sentenceService.getRandomSentences(level, stageId, count);
}

export type { Sentence, BankData, RandomSentenceResult };