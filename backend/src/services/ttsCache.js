const crypto = require('crypto');
const cache = require('../utils/cache');

function key(text, voice) {
  return 'tts:' + crypto.createHash('sha256').update(`${voice}::${text}`).digest('hex');
}

exports.getCachedTTS = (text, voice) => {
  const cacheKey = key(text, voice);
  const hit = cache.get(cacheKey);
  if (hit) {
    console.log(`🚀 TTS Cache hit: ${text.slice(0, 30)}... (${voice})`);
  }
  return hit;
};

exports.setCachedTTS = (text, voice, val, ttlMs = 1000 * 60 * 60 * 24) => {
  const cacheKey = key(text, voice);
  cache.set(cacheKey, val, { ttl: ttlMs });
  console.log(`✅ TTS Cached: ${text.slice(0, 30)}... (${voice}) - TTL: ${ttlMs/1000/60}min`);
};