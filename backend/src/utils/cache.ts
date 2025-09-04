import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({ 
  max: 1000, 
  ttl: 1000 * 60 * 10 // 10분
});

export default cache;