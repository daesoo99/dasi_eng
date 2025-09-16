/**
 * 🔄 Pattern Data Loader (Firebase Storage)
 * 
 * 패턴 데이터를 Firebase Storage에서 로드하는 서비스
 * 기존 로컬 파일 시스템 대신 원격 저장소 사용
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

interface LoadResult {
  data: BankData | null;
  source: 'cache' | 'storage' | 'fallback';
  loadTime: number;
}

class PatternDataLoader {
  private cache = new Map<string, BankData>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10분 캐시 (더 길게)
  private cacheTimestamps = new Map<string, number>();
  private readonly STORAGE_BASE_URL: string;
  
  constructor() {
    // Vite 환경변수 사용 (REACT_APP -> VITE)
    this.STORAGE_BASE_URL = import.meta.env.VITE_FIREBASE_STORAGE_URL || 
      'https://storage.googleapis.com/dasi-english-default-rtdb.appspot.com';
      
    console.log(`[PatternDataLoader] Storage URL: ${this.STORAGE_BASE_URL}`);
  }

  /**
   * 🎯 패턴 데이터 로드 (메인 메서드)
   */
  async loadBankData(level: number, stageId: string): Promise<LoadResult> {
    const startTime = Date.now();
    const cacheKey = `${level}-${stageId}`;
    
    // 1. 캐시 확인
    if (this.isCacheValid(cacheKey)) {
      const data = this.cache.get(cacheKey) || null;
      return {
        data,
        source: 'cache',
        loadTime: Date.now() - startTime
      };
    }

    // 2. Firebase Storage에서 로드
    try {
      const data = await this.loadFromStorage(level, stageId);
      if (data) {
        // 캐시 저장
        this.cache.set(cacheKey, data);
        this.cacheTimestamps.set(cacheKey, Date.now());
        
        return {
          data,
          source: 'storage',
          loadTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error(`[PatternDataLoader] Storage load failed for ${stageId}:`, error);
    }

    // 3. 로컬 fallback (마이그레이션 기간 중)
    try {
      const data = await this.loadFromLocal(level, stageId);
      return {
        data,
        source: 'fallback',
        loadTime: Date.now() - startTime
      };
    } catch (error) {
      console.error(`[PatternDataLoader] Fallback load failed for ${stageId}:`, error);
      return {
        data: null,
        source: 'fallback',
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * 📦 Firebase Storage에서 데이터 로드
   */
  private async loadFromStorage(level: number, stageId: string): Promise<BankData | null> {
    const url = `${this.STORAGE_BASE_URL}/patterns/banks/level_${level}/${stageId}_bank.json`;
    
    console.log(`[DEBUG] 🔍 Loading from Storage: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Storage fetch failed: ${response.status}`);
    }
    
    const data: BankData = await response.json();
    console.log(`[DEBUG] ✅ Storage load success: ${stageId} (${data.sentences?.length || 0} sentences)`);
    
    return data;
  }

  /**
   * 💾 로컬 파일에서 데이터 로드 (fallback)
   */
  private async loadFromLocal(level: number, stageId: string): Promise<BankData | null> {
    const paths = [
      `/patterns/banks/level_${level}/${stageId}_bank.json`,
      `/patterns/level_${level}_situational/${stageId}_bank.json`,
      `/patterns/level_${level}_basic_patterns/${stageId}_bank.json`
    ];

    for (const path of paths) {
      try {
        console.log(`[DEBUG] 🔍 Trying local fallback: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          const data: BankData = await response.json();
          console.log(`[DEBUG] ✅ Local fallback success: ${path}`);
          return data;
        }
      } catch (_error) {
        // Continue to next path
      }
    }
    
    return null;
  }

  /**
   * 🕒 캐시 유효성 확인
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.cache.has(cacheKey)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) {
      return false;
    }
    
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * 🧹 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('[PatternDataLoader] Cache cleared');
  }

  /**
   * 📊 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
      entries: Array.from(this.cache.keys())
    };
  }
}

// 싱글톤 인스턴스
const patternDataLoader = new PatternDataLoader();

export { patternDataLoader, PatternDataLoader };
export type { BankData, Sentence, LoadResult };