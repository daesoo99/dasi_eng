/**
 * LocalStorage SRS 어댑터
 * ISRSStorage 인터페이스 구현체
 * 
 * 느슨한 결합: 저장소 구현체를 교체 가능
 */

import { ISRSStorage, ReviewCard } from '../../interfaces/ISRSEngine';

export class LocalStorageAdapter implements ISRSStorage {
  private readonly prefix = 'srs_';

  async save(key: string, data: ReviewCard[]): Promise<void> {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
      
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  }

  async load(key: string): Promise<ReviewCard[]> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      
      if (!item) {
        return [];
      }

      const parsed = JSON.parse(item);
      
      // 데이터 마이그레이션 지원
      if (parsed.version === '1.0') {
        return parsed.data.map((card: any) => ({
          ...card,
          memory: {
            ...card.memory,
            lastReviewed: new Date(card.memory.lastReviewed),
            nextReview: new Date(card.memory.nextReview)
          }
        }));
      }

      // 레거시 형식 지원
      return Array.isArray(parsed) ? parsed : [];
      
    } catch (error) {
      console.error(`Failed to load from localStorage:`, error);
      return [];
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    // SRS 관련 키만 제거
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async lastModified(key: string): Promise<Date> {
    const item = localStorage.getItem(this.getKey(key));
    
    if (!item) {
      throw new Error(`Key not found: ${key}`);
    }

    try {
      const parsed = JSON.parse(item);
      return parsed.timestamp ? new Date(parsed.timestamp) : new Date();
    } catch {
      return new Date(); // 레거시 데이터
    }
  }

  async size(key: string): Promise<number> {
    const item = localStorage.getItem(this.getKey(key));
    return item ? new Blob([item]).size : 0;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 저장소 용량 체크
   */
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    total: number;
  }> {
    let used = 0;
    
    // 모든 localStorage 항목 크기 계산
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += new Blob([key + value]).size;
        }
      }
    }

    // 브라우저별 제한 (일반적으로 5-10MB)
    const total = 10 * 1024 * 1024; // 10MB 가정
    
    return {
      used,
      available: total - used,
      total
    };
  }

  /**
   * 데이터 압축 (선택적)
   */
  private compress(data: string): string {
    // 간단한 압축 로직 (실제로는 LZ 압축 등 사용)
    return data;
  }

  private decompress(data: string): string {
    // 압축 해제 로직
    return data;
  }
}