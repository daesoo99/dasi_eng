const hybridCache = require('../utils/redisCache');

exports.getCachedTTS = async (text, voice) => {
  return await hybridCache.getTTS(voice, text);
};

exports.setCachedTTS = async (text, voice, val) => {
  await hybridCache.setTTS(voice, text, val);
};