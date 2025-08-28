const { LRUCache } = require('lru-cache');
const cache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 10 }); // 10분
module.exports = cache;