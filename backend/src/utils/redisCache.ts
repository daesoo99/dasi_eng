/**
 * Hybrid Cache System - Redis + Local LRU Cache
 * @description 분산 캐시(Redis)와 로컬 캐시(LRU) 하이브리드 시스템
 */

import Redis, { RedisOptions } from 'ioredis';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import logger from '../monitoring/logger';

interface CacheOptions {
  localMaxSize?: number;
  localTtl?: number; // milliseconds
  redisTtl?: number; // seconds
  redisUrl?: string;
  keyPrefix?: string;
}

interface CacheItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

type CacheValue = string | number | object | Buffer;

export class HybridCache {
  private localCache: LRUCache<string, CacheItem>;
  private redis: Redis | null = null;
  private isRedisEnabled = false;
  private keyPrefix: string;
  private defaultRedisTtl: number;

  constructor(options: CacheOptions = {}) {
    // Local LRU cache configuration
    this.localCache = new LRUCache<string, CacheItem>({
      max: options.localMaxSize || 1000,
      ttl: options.localTtl || 1000 * 60 * 10, // 10분
      updateAgeOnGet: true
    });
    
    this.keyPrefix = options.keyPrefix || 'dasi:';
    this.defaultRedisTtl = options.redisTtl || 3600; // 1시간
    
    this.init(options.redisUrl);
  }

  private async init(redisUrl?: string): Promise<void> {
    try {
      const connectionString = redisUrl || process.env.REDIS_URL;
      
      if (connectionString) {
        const redisOptions: RedisOptions = {
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        };

        this.redis = new Redis(connectionString, redisOptions);
        
        this.redis.on('connect', () => {
          this.isRedisEnabled = true;
          logger.info('✅ Redis cache initialized');
        });
        
        this.redis.on('error', (error: Error) => {
          logger.warn({ error: error.message }, '⚠️ Redis error, falling back to local cache');
          this.isRedisEnabled = false;
        });

        this.redis.on('close', () => {
          logger.warn('Redis connection closed');
          this.isRedisEnabled = false;
        });

        // Test connection
        await this.redis.ping();
        this.isRedisEnabled = true;
      } else {
        logger.info('Redis URL not provided, using local cache only');
      }
    } catch (error) {
      logger.warn({ error: (error as Error).message }, '⚠️ Redis unavailable, using local cache only');
      this.isRedisEnabled = false;
    }
  }

  /**
   * Get value from cache (local first, then Redis)
   */
  async get<T = any>(key: string): Promise<T | null> {
    const hashedKey = this.hashKey(key);
    
    try {
      // 1. Check local cache first
      const localItem = this.localCache.get(hashedKey);
      if (localItem && !this.isExpired(localItem)) {
        logger.debug({ key, source: 'local' }, 'Cache hit (local)');
        return localItem.value as T;
      }

      // 2. Check Redis if available
      if (this.isRedisEnabled && this.redis) {
        const redisValue = await this.redis.get(this.keyPrefix + hashedKey);
        if (redisValue) {
          const parsedValue = this.parseValue<T>(redisValue);
          
          // Store in local cache for faster future access
          this.localCache.set(hashedKey, {
            value: parsedValue,
            timestamp: Date.now()
          });
          
          logger.debug({ key, source: 'redis' }, 'Cache hit (Redis)');
          return parsedValue;
        }
      }

      logger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ key, error: (error as Error).message }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set value in both local and Redis cache
   */
  async set(key: string, value: CacheValue, ttlSeconds?: number): Promise<boolean> {
    const hashedKey = this.hashKey(key);
    const ttl = ttlSeconds || this.defaultRedisTtl;
    
    try {
      // Store in local cache
      this.localCache.set(hashedKey, {
        value,
        timestamp: Date.now(),
        ttl: ttl * 1000 // Convert to milliseconds
      });

      // Store in Redis if available
      if (this.isRedisEnabled && this.redis) {
        const serializedValue = this.serializeValue(value);
        await this.redis.setex(this.keyPrefix + hashedKey, ttl, serializedValue);
      }

      logger.debug({ key, ttl }, 'Cache set');
      return true;
    } catch (error) {
      logger.error({ key, error: (error as Error).message }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete key from both caches
   */
  async del(key: string): Promise<boolean> {
    const hashedKey = this.hashKey(key);
    
    try {
      // Remove from local cache
      this.localCache.delete(hashedKey);

      // Remove from Redis if available
      if (this.isRedisEnabled && this.redis) {
        await this.redis.del(this.keyPrefix + hashedKey);
      }

      logger.debug({ key }, 'Cache delete');
      return true;
    } catch (error) {
      logger.error({ key, error: (error as Error).message }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.localCache.clear();
      
      if (this.isRedisEnabled && this.redis) {
        const keys = await this.redis.keys(this.keyPrefix + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      logger.info('Cache cleared');
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Cache clear error');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    local: { size: number; max: number };
    redis: { enabled: boolean; connected: boolean };
  } {
    return {
      local: {
        size: this.localCache.size,
        max: this.localCache.max
      },
      redis: {
        enabled: this.isRedisEnabled,
        connected: this.redis?.status === 'ready'
      }
    };
  }

  /**
   * Hash key for consistent storage
   */
  private hashKey(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem): boolean {
    if (!item.ttl) return false;
    return (Date.now() - item.timestamp) > item.ttl;
  }

  /**
   * Serialize value for Redis storage
   */
  private serializeValue(value: CacheValue): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Parse value from Redis
   */
  private parseValue<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Cleanup expired local cache entries
   */
  cleanup(): void {
    // LRU cache handles this automatically, but we can trigger manual cleanup
    this.localCache.purgeStale();
    logger.debug('Cache cleanup completed');
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.isRedisEnabled = false;
      logger.info('Redis connection closed');
    }
  }
}

// Export singleton instance
export const hybridCache = new HybridCache();

// Export types
export type { CacheOptions, CacheItem, CacheValue };