const Redis = require('ioredis');
const { LRUCache } = require('lru-cache');
const crypto = require('crypto');

class HybridCache {
  constructor() {
    // Local LRU cache for fast access
    this.localCache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 10 }); // 10분
    
    // Redis connection (optional for distributed caching)
    this.redis = null;
    this.isRedisEnabled = false;
    
    this.init();
  }

  async init() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.isRedisEnabled = true;
        console.log('✅ Redis cache initialized');
        
        this.redis.on('error', (error) => {
          console.warn('⚠️ Redis error, falling back to local cache:', error.message);
          this.isRedisEnabled = false;
        });
      }
    } catch (error) {
      console.warn('⚠️ Redis unavailable, using local cache only:', error.message);
      this.isRedisEnabled = false;
    }
  }

  // Generate cache keys according to specification
  levelKey(id) {
    return `level:${id}`;
  }

  patternKey(id) {
    return `pattern:${id}`;
  }

  ttsKey(voice, text) {
    const hash = crypto.createHash('sha256').update(`${voice}::${text}`).digest('hex');
    return `tts:${hash}`;
  }

  async get(key) {
    // Try local cache first for fastest access
    const localHit = this.localCache.get(key);
    if (localHit) {
      return localHit;
    }

    // Try Redis for distributed cache
    if (this.isRedisEnabled && this.redis) {
      try {
        const redisHit = await this.redis.get(key);
        if (redisHit) {
          const parsed = JSON.parse(redisHit);
          // Store in local cache for future fast access
          this.localCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.warn('⚠️ Redis get error:', error.message);
      }
    }

    return null;
  }

  async set(key, value, options = {}) {
    const { ttl = 1000 * 60 * 10 } = options; // Default 10 minutes
    
    // Always set in local cache
    this.localCache.set(key, value, { ttl });

    // Set in Redis if available
    if (this.isRedisEnabled && this.redis) {
      try {
        const serialized = JSON.stringify(value);
        await this.redis.set(key, serialized, 'PX', ttl);
      } catch (error) {
        console.warn('⚠️ Redis set error:', error.message);
      }
    }
  }

  // Specific methods for different cache types with appropriate TTLs
  async getLevel(id) {
    return this.get(this.levelKey(id));
  }

  async setLevel(id, data) {
    const ttl = 1000 * 60 * 30; // 30 minutes as per requirements
    return this.set(this.levelKey(id), data, { ttl });
  }

  async getPattern(id) {
    return this.get(this.patternKey(id));
  }

  async setPattern(id, data) {
    const ttl = 1000 * 60 * 30; // 30 minutes as per requirements
    return this.set(this.patternKey(id), data, { ttl });
  }

  async getTTS(voice, text) {
    const key = this.ttsKey(voice, text);
    const cached = await this.get(key);
    if (cached) {
      console.log(`🚀 TTS Cache hit: ${text.slice(0, 30)}... (${voice})`);
    }
    return cached;
  }

  async setTTS(voice, text, audioData) {
    const key = this.ttsKey(voice, text);
    const ttl = 1000 * 60 * 60 * 24 * 7; // 7 days (within 1-7d requirement)
    await this.set(key, audioData, { ttl });
    console.log(`✅ TTS Cached: ${text.slice(0, 30)}... (${voice}) - TTL: 7 days`);
  }

  // Cache hit rate metrics
  getStats() {
    return {
      localCacheSize: this.localCache.size,
      isRedisEnabled: this.isRedisEnabled,
      redisConnected: this.redis ? this.redis.status === 'ready' : false
    };
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

// Singleton instance
const hybridCache = new HybridCache();

// Backwards compatibility with existing cache interface
hybridCache.get = hybridCache.get.bind(hybridCache);
hybridCache.set = hybridCache.set.bind(hybridCache);

module.exports = hybridCache;