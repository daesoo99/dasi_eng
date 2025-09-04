/**
 * 메모리 저장소 어댑터 (테스트용)
 * ISRSStorage 인터페이스 구현체
 */

import { ISRSStorage, ReviewCard } from '../../interfaces/ISRSEngine';

export class MemoryStorageAdapter implements ISRSStorage {
  private storage = new Map<string, {
    data: ReviewCard[];
    timestamp: Date;
    version: string;
  }>();

  async save(key: string, data: ReviewCard[]): Promise<void> {
    this.storage.set(key, {
      data: JSON.parse(JSON.stringify(data)), // deep copy
      timestamp: new Date(),
      version: '1.0'
    });
  }

  async load(key: string): Promise<ReviewCard[]> {
    const item = this.storage.get(key);
    if (!item) {
      return [];
    }

    // deep copy를 반환하여 원본 데이터 보호
    return JSON.parse(JSON.stringify(item.data));
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async lastModified(key: string): Promise<Date> {
    const item = this.storage.get(key);
    if (!item) {
      throw new Error(`Key not found: ${key}`);
    }
    return new Date(item.timestamp);
  }

  async size(key: string): Promise<number> {
    const item = this.storage.get(key);
    if (!item) {
      return 0;
    }
    
    // 대략적인 크기 계산 (JSON 문자열 길이)
    return JSON.stringify(item.data).length;
  }

  /**
   * 테스트용 - 전체 저장소 상태 조회
   */
  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * 테스트용 - 저장소 상태 덤프
   */
  dump(): Record<string, any> {
    const result: Record<string, any> = {};
    this.storage.forEach((value, key) => {
      result[key] = {
        dataCount: value.data.length,
        timestamp: value.timestamp,
        version: value.version
      };
    });
    return result;
  }

  /**
   * 테스트용 - 직접 데이터 설정
   */
  setTestData(key: string, data: ReviewCard[]): void {
    this.storage.set(key, {
      data: JSON.parse(JSON.stringify(data)),
      timestamp: new Date(),
      version: '1.0'
    });
  }
}