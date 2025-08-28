/**
 * 🎲 Stage별 랜덤 문장 생성 서비스
 * 
 * 여러 데이터 소스에서 fallback 로직으로 문장을 가져옵니다:
 * 1. /patterns/level_X_situational/ (주 데이터 소스)
 * 2. /patterns/banks/level_X/ (백업 소스) 
 * 3. examples 필드 (최종 fallback)
 */

interface Sentence {
  id: string;
  kr: string;
  en: string;
  form?: string;
}

interface BankData {
  stage_id: string;
  title?: string;
  count?: number;
  sentences?: Sentence[];
  sample_sentences?: Sentence[];
  examples?: Sentence[];
}

interface RandomSentenceResult {
  sentence: Sentence;
  source: 'sentences' | 'sample_sentences' | 'examples' | 'fallback';
  total: number;
}

class SentenceService {
  private cache = new Map<string, BankData>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분 캐시
  private cacheTimestamps = new Map<string, number>();

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
   * 📂 Bank 데이터를 로드합니다 (캐시 및 fallback 포함)
   */
  private async loadBankData(level: number, stageId: string): Promise<BankData | null> {
    const cacheKey = `${level}-${stageId}`;
    
    // 캐시 확인
    if (this.isCacheValid(cacheKey)) {
      console.log(`[DEBUG] 💾 캐시에서 로드: ${stageId}`);
      return this.cache.get(cacheKey) || null;
    }

    // 데이터 소스 우선순위
    const dataSources = this.getDataSourcePaths(level, stageId);
    
    for (const source of dataSources) {
      try {
        console.log(`[DEBUG] 🔍 시도 중: ${source.path}`);
        const response = await fetch(source.path);
        if (response.ok) {
          const data: BankData = await response.json();
          console.log(`[DEBUG] ✅ 로드 성공: ${source.path} (문장: ${data.sentences?.length || 0}개)`);
          
          // 캐시 저장
          this.cache.set(cacheKey, data);
          this.cacheTimestamps.set(cacheKey, Date.now());
          
          return data;
        }
      } catch (error) {
        console.log(`[DEBUG] ❌ 로드 실패: ${source.path}`, error);
      }
    }

    console.warn(`[SentenceService] 모든 데이터 소스에서 로드 실패: ${stageId}`);
    return null;
  }

  /**
   * 📍 레벨과 스테이지별 데이터 소스 경로를 생성합니다
   */
  private getDataSourcePaths(level: number, stageId: string): { path: string; priority: number }[] {
    const paths = [
      // 1순위: situational 폴더 (레벨 4-6)
      {
        path: `/patterns/level_${level}_situational/${stageId}_bank.json`,
        priority: 1
      },
      // 2순위: banks 폴더
      {
        path: `/patterns/banks/level_${level}/${stageId}_bank.json`,
        priority: 2
      },
      // 3순위: 직접 경로 (레벨 1-3의 경우)
      {
        path: `/patterns/level_${level}_basic_patterns/${stageId}_bank.json`,
        priority: 3
      },
      {
        path: `/patterns/level_${level}_basic_grammar/${stageId}_bank.json`,
        priority: 3
      },
      {
        path: `/patterns/level_${level}_advanced_grammar/${stageId}_bank.json`,
        priority: 3
      }
    ];

    return paths.sort((a, b) => a.priority - b.priority);
  }

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
   * ⚡ 캐시 유효성 확인
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    const isValid = Date.now() - timestamp < this.CACHE_TTL;
    if (!isValid) {
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    }
    
    return isValid;
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
   * 🧹 캐시 정리
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
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