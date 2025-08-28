/**
 * Optimized cache TTL configuration based on usage patterns
 * Hot keys get shorter TTL for freshness, cold keys get longer TTL
 */

const CACHE_TTL = {
  // Hot API endpoints (frequent access, short TTL for freshness)
  CURRICULUM_DATA: 30 * 60,        // 30 minutes - frequently accessed
  SESSION_DATA: 5 * 60,           // 5 minutes - active session data
  FEEDBACK_RESULTS: 10 * 60,      // 10 minutes - feedback caching
  USER_PROGRESS: 15 * 60,         // 15 minutes - user progress data
  
  // Warm data (moderate access)
  PATTERN_DATA: 60 * 60,          // 1 hour - pattern templates
  LEVEL_METADATA: 45 * 60,        // 45 minutes - level configurations
  ANALYTICS_DATA: 20 * 60,        // 20 minutes - analytics results
  
  // Cold data (infrequent access, longer TTL for efficiency)
  TTS_AUDIO: 7 * 24 * 60 * 60,    // 7 days - generated audio files
  STATIC_CONTENT: 2 * 60 * 60,    // 2 hours - static content
  VOCABULARY_LISTS: 4 * 60 * 60,  // 4 hours - vocabulary data
  
  // System data
  HEALTH_CHECK: 1 * 60,           // 1 minute - health status
  METRICS_SNAPSHOT: 2 * 60,       // 2 minutes - metrics data
  CONFIG_DATA: 30 * 60,           // 30 minutes - app configuration
};

/**
 * Cache key patterns with TTL mapping
 */
const CACHE_PATTERNS = {
  'curriculum:*': CACHE_TTL.CURRICULUM_DATA,
  'session:*': CACHE_TTL.SESSION_DATA,
  'feedback:*': CACHE_TTL.FEEDBACK_RESULTS,
  'user:*:progress': CACHE_TTL.USER_PROGRESS,
  'pattern:*': CACHE_TTL.PATTERN_DATA,
  'level:*:meta': CACHE_TTL.LEVEL_METADATA,
  'analytics:*': CACHE_TTL.ANALYTICS_DATA,
  'tts:*': CACHE_TTL.TTS_AUDIO,
  'static:*': CACHE_TTL.STATIC_CONTENT,
  'vocab:*': CACHE_TTL.VOCABULARY_LISTS,
  'health': CACHE_TTL.HEALTH_CHECK,
  'metrics:*': CACHE_TTL.METRICS_SNAPSHOT,
  'config:*': CACHE_TTL.CONFIG_DATA
};

/**
 * Get TTL for a cache key based on pattern matching
 */
function getTTL(cacheKey) {
  for (const [pattern, ttl] of Object.entries(CACHE_PATTERNS)) {
    if (matchPattern(cacheKey, pattern)) {
      return ttl;
    }
  }
  
  // Default TTL for unknown patterns
  return CACHE_TTL.SESSION_DATA; // 5 minutes default
}

/**
 * Simple pattern matching (supports * wildcard)
 */
function matchPattern(str, pattern) {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return str === pattern;
  
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(str);
}

/**
 * Cache performance monitoring
 */
const CACHE_MONITORING = {
  HIT_RATE_THRESHOLD: 0.7,        // 70% hit rate target
  MISS_ALERT_THRESHOLD: 100,      // Alert after 100 consecutive misses
  TTL_ADJUSTMENT_INTERVAL: 60000, // Check every minute
  PERFORMANCE_TRACKING: true
};

/**
 * Dynamic TTL adjustment based on hit rates
 */
class CacheTTLOptimizer {
  constructor() {
    this.hitRates = new Map();
    this.adjustmentHistory = new Map();
  }

  recordHit(cacheKey, isHit) {
    if (!this.hitRates.has(cacheKey)) {
      this.hitRates.set(cacheKey, { hits: 0, total: 0 });
    }
    
    const stats = this.hitRates.get(cacheKey);
    if (isHit) stats.hits++;
    stats.total++;
    
    // Adjust TTL if we have enough data
    if (stats.total >= 100) {
      this.adjustTTL(cacheKey, stats.hits / stats.total);
    }
  }

  adjustTTL(cacheKey, hitRate) {
    const currentTTL = getTTL(cacheKey);
    let newTTL = currentTTL;
    
    if (hitRate < 0.3) {
      // Low hit rate - reduce TTL for fresher data
      newTTL = Math.max(currentTTL * 0.7, 60); // Minimum 1 minute
    } else if (hitRate > 0.9) {
      // High hit rate - can increase TTL for efficiency
      newTTL = Math.min(currentTTL * 1.3, 24 * 60 * 60); // Maximum 24 hours
    }
    
    if (newTTL !== currentTTL) {
      console.log(`🔧 TTL adjusted for ${cacheKey}: ${currentTTL}s → ${newTTL}s (hit rate: ${(hitRate * 100).toFixed(1)}%)`);
      this.adjustmentHistory.set(cacheKey, {
        oldTTL: currentTTL,
        newTTL,
        hitRate,
        timestamp: Date.now()
      });
    }
    
    return newTTL;
  }

  getOptimizedTTL(cacheKey) {
    const adjustment = this.adjustmentHistory.get(cacheKey);
    return adjustment ? adjustment.newTTL : getTTL(cacheKey);
  }
}

const ttlOptimizer = new CacheTTLOptimizer();

module.exports = {
  CACHE_TTL,
  CACHE_PATTERNS,
  CACHE_MONITORING,
  getTTL,
  ttlOptimizer,
  CacheTTLOptimizer
};