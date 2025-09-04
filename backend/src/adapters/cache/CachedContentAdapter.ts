/**
 * CachedContentAdapter - 데코레이터 패턴 캐시 구현
 * TTL 정책과 캐시 키 관리를 어댑터 내부에서 처리
 */

import { ContentPort } from '../../domain/ports/ContentPort';
import { DrillCard, CardQuery } from '../../shared/types/core';

interface CacheConfig {
  redis?: any; // Redis client (optional)
  ttlSeconds?: number;
  keyPrefix?: string;
}

export class CachedContentAdapter implements ContentPort {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  
  constructor(
    private upstream: ContentPort,
    private config: CacheConfig = {}
  ) {}

  async findCards(query: CardQuery): Promise<DrillCard[]> {
    const cacheKey = this.buildCacheKey('cards', 'v1', query);
    
    // 캐시 확인
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    // Upstream 호출
    const result = await this.upstream.findCards(query);
    
    // 캐시 저장 (TTL 정책 내부화)
    await this.setToCache(cacheKey, result, this.getTTL('cards'));
    return result;
  }

  async getStageCards(level: number, stage: number): Promise<DrillCard[]> {
    const cacheKey = this.buildCacheKey('stage', 'v1', { level, stage });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.upstream.getStageCards(level, stage);
    await this.setToCache(cacheKey, result, this.getTTL('stage'));
    return result;
  }

  async countCards(query: CardQuery): Promise<number> {
    const cacheKey = this.buildCacheKey('count', 'v1', query);
    
    const cached = await this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    const result = await this.upstream.countCards(query);
    await this.setToCache(cacheKey, result, this.getTTL('count'));
    return result;
  }

  async getCardById(cardId: string): Promise<DrillCard | null> {
    const cacheKey = this.buildCacheKey('card', 'v1', { id: cardId });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.upstream.getCardById(cardId);
    await this.setToCache(cacheKey, result, this.getTTL('card'));
    return result;
  }

  async getCardsByDifficulty(level: number, difficulty: number): Promise<DrillCard[]> {
    const cacheKey = this.buildCacheKey('difficulty', 'v1', { level, difficulty });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.upstream.getCardsByDifficulty(level, difficulty);
    await this.setToCache(cacheKey, result, this.getTTL('difficulty'));
    return result;
  }

  // ============ 캐시 내부 구현 ============

  private buildCacheKey(type: string, version: string, params: any): string {
    const prefix = this.config.keyPrefix || 'dasi';
    const serialized = this.serializeParams(params);
    return `${prefix}:${type}:${version}:${serialized}`;
  }

  private serializeParams(params: any): string {
    if (!params) return 'empty';
    
    // 정렬된 키로 일관된 캐시 키 생성
    const sortedKeys = Object.keys(params).sort();
    const parts = sortedKeys.map(key => `${key}:${params[key]}`);
    return parts.join(':');
  }

  private getTTL(type: string): number {
    // 캐시 정책 (어댑터 내부)
    const policies: Record<string, number> = {
      'cards': 3600,       // 1시간 - 카드 데이터는 자주 변경되지 않음
      'stage': 7200,       // 2시간 - 스테이지 데이터는 더 안정적
      'count': 1800,       // 30분 - 카운트는 상대적으로 자주 변경
      'card': 14400,       // 4시간 - 개별 카드는 매우 안정적
      'difficulty': 3600   // 1시간 - 난이도별 필터링
    };
    
    return this.config.ttlSeconds ?? policies[type] ?? 1800; // 기본 30분
  }

  private async getFromCache(key: string): Promise<any> {
    if (this.config.redis) {
      // Redis 구현
      const result = await this.config.redis.get(key);
      return result ? JSON.parse(result) : null;
    } else {
      // 메모리 캐시 구현 (개발용)
      const cached = this.cache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      // 만료된 캐시 제거
      if (cached) {
        this.cache.delete(key);
      }
      return null;
    }
  }

  private async setToCache(key: string, data: any, ttlSeconds: number): Promise<void> {
    if (this.config.redis) {
      // Redis 구현
      await this.config.redis.setex(key, ttlSeconds, JSON.stringify(data));
    } else {
      // 메모리 캐시 구현 (개발용)
      const expiry = Date.now() + (ttlSeconds * 1000);
      this.cache.set(key, { data, expiry });
      
      // 메모리 누수 방지: 주기적으로 만료된 캐시 정리
      if (this.cache.size > 1000) {
        this.cleanExpiredCache();
      }
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  // ============ 캐시 관리 메서드 ============

  /**
   * 특정 키 패턴의 캐시 무효화
   */
  async invalidateCache(pattern: string): Promise<void> {
    if (this.config.redis) {
      const keys = await this.config.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.config.redis.del(...keys);
      }
    } else {
      // 메모리 캐시에서 패턴 매칭으로 제거
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    // 간단한 구현 (실제로는 더 정교한 메트릭 필요)
    return {
      size: this.cache.size,
      hits: 0, // TODO: 히트/미스 카운터 추가
      misses: 0
    };
  }

  // ContentPort 인터페이스의 새로운 메서드들 (캐시 지원)
  async getLevel(levelId: string): Promise<any> {
    const cacheKey = this.buildCacheKey('level', 'v1', { id: levelId });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.upstream.getLevel(levelId);
    await this.setToCache(cacheKey, result, this.getTTL('level'));
    return result;
  }

  async getLevels(): Promise<any[]> {
    const cacheKey = this.buildCacheKey('levels', 'v1', {});
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.upstream.getLevels();
    await this.setToCache(cacheKey, result, this.getTTL('levels'));
    return result;
  }

  async getStage(stageId: string): Promise<any> {
    const cacheKey = this.buildCacheKey('stage_info', 'v1', { id: stageId });
    
    const cached = await this.getFromCache(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.upstream.getStage(stageId);
    await this.setToCache(cacheKey, result, this.getTTL('stage_info'));
    return result;
  }

  async getCards(filters: any): Promise<any[]> {
    const cacheKey = this.buildCacheKey('cards_filtered', 'v1', filters);
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.upstream.getCards(filters);
    await this.setToCache(cacheKey, result, this.getTTL('cards_filtered'));
    return result;
  }
}