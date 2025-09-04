/**
 * 통합 테스트 - 모든 ContentPort 구현체들
 */

import { testContentPortContract } from '../contracts/ContentPort.contract';
import { FsContentAdapter } from '../../src/adapters/fs/FsContentAdapter';
import { CachedContentAdapter } from '../../src/adapters/cache/CachedContentAdapter';

describe('ContentPort 구현체 통합 테스트', () => {
  describe('FileSystem 어댑터', () => {
    const fsAdapter = new FsContentAdapter('web_app/public/patterns/banks');
    testContentPortContract(fsAdapter, 'FsContentAdapter');
  });

  describe('캐시 어댑터', () => {
    const baseAdapter = new FsContentAdapter('web_app/public/patterns/banks');
    const cachedAdapter = new CachedContentAdapter(baseAdapter, {
      ttlSeconds: 60,
      keyPrefix: 'test'
    });
    
    testContentPortContract(cachedAdapter, 'CachedContentAdapter');

    test('캐시 기능이 올바르게 작동해야 함', async () => {
      const query = { level: 1, limit: 5 };
      
      // 첫 번째 호출 (캐시 미스)
      const start1 = Date.now();
      const result1 = await cachedAdapter.findCards(query);
      const time1 = Date.now() - start1;
      
      // 두 번째 호출 (캐시 히트)
      const start2 = Date.now();
      const result2 = await cachedAdapter.findCards(query);
      const time2 = Date.now() - start2;
      
      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // 캐시된 결과가 더 빨라야 함
    });
  });
});