/**
 * TTSCache - TTS 결과 캐싱 관리
 * TypeScript 변환: Redis 하이브리드 캐시 래퍼
 */

import { TTSResult } from '../shared/types/core';

// hybridCache 모듈 임시 타입 정의 (utils/redisCache가 없을 경우)
interface HybridCache {
  getTTS(voice: string, text: string): Promise<TTSResult | null>;
  setTTS(voice: string, text: string, result: TTSResult): Promise<void>;
}

// Dynamic import with fallback
let hybridCache: HybridCache;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hybridCache = require('../utils/redisCache');
} catch (error) {
  console.warn('⚠️ RedisCache not found, using in-memory fallback');
  
  // In-memory fallback implementation
  const memoryCache = new Map<string, { data: TTSResult; expiry: number }>();
  
  hybridCache = {
    async getTTS(voice: string, text: string): Promise<TTSResult | null> {
      const key = `${voice}:${text}`;
      const cached = memoryCache.get(key);
      
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      
      if (cached) {
        memoryCache.delete(key);
      }
      
      return null;
    },
    
    async setTTS(voice: string, text: string, result: TTSResult): Promise<void> {
      const key = `${voice}:${text}`;
      const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24시간
      
      memoryCache.set(key, { data: result, expiry });
      
      // Memory cleanup (prevent memory leak)
      if (memoryCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of memoryCache.entries()) {
          if (v.expiry <= now) {
            memoryCache.delete(k);
          }
        }
      }
    }
  };
}

/**
 * TTS 결과 조회 (캐시)
 */
export const getCachedTTS = async (
  text: string, 
  voice: string
): Promise<TTSResult | null> => {
  try {
    return await hybridCache.getTTS(voice, text);
  } catch (error) {
    console.error('Error getting cached TTS:', error);
    return null;
  }
};

/**
 * TTS 결과 저장 (캐시)
 */
export const setCachedTTS = async (
  text: string, 
  voice: string, 
  result: TTSResult
): Promise<void> => {
  try {
    await hybridCache.setTTS(voice, text, result);
  } catch (error) {
    console.error('Error setting cached TTS:', error);
    // 캐시 저장 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
};

/**
 * TTS 캐시 통계 (개발/디버깅용)
 */
export const getTTSCacheStats = (): { 
  implementation: string; 
  available: boolean 
} => {
  return {
    implementation: hybridCache ? 'redis-hybrid' : 'memory-fallback',
    available: !!hybridCache
  };
};