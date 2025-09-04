/**
 * ContentPort 계약 테스트 - 모든 어댑터 구현체가 동일한 인터페이스 준수 보장
 */

import { ContentPort } from '../../src/domain/ports/ContentPort';
import { DrillCard, CardQuery } from '../../src/shared/types/core';

export function testContentPortContract(adapter: ContentPort, adapterName: string) {
  describe(`ContentPort 계약 테스트: ${adapterName}`, () => {
    
    beforeAll(async () => {
      // 테스트 데이터 준비 (필요시)
      await setupTestData(adapter);
    });

    afterAll(async () => {
      // 정리 작업 (필요시)
      await cleanupTestData(adapter);
    });

    describe('findCards 메서드', () => {
      test('유효한 DrillCard 배열을 반환해야 함', async () => {
        const query: CardQuery = { level: 1, limit: 5 };
        const cards = await adapter.findCards(query);

        expect(Array.isArray(cards)).toBe(true);
        expect(cards.length).toBeLessThanOrEqual(5);

        cards.forEach(card => {
          expect(card).toMatchObject({
            id: expect.any(String),
            front_ko: expect.any(String),
            back_en: expect.any(String),
            level: expect.any(Number),
            stage: expect.any(Number),
            difficulty: expect.any(Number)
          });

          // 비즈니스 규칙 검증
          expect(card.level).toBeGreaterThanOrEqual(1);
          expect(card.stage).toBeGreaterThanOrEqual(1);
          expect(card.difficulty).toBeGreaterThanOrEqual(0);
          expect(card.difficulty).toBeLessThanOrEqual(5);
        });
      });

      test('limit 파라미터를 준수해야 함', async () => {
        const query: CardQuery = { limit: 3 };
        const cards = await adapter.findCards(query);

        expect(cards.length).toBeLessThanOrEqual(3);
      });

      test('level 필터링이 정확해야 함', async () => {
        const query: CardQuery = { level: 2, limit: 10 };
        const cards = await adapter.findCards(query);

        cards.forEach(card => {
          expect(card.level).toBe(2);
        });
      });

      test('빈 결과를 올바르게 처리해야 함', async () => {
        const query: CardQuery = { level: 999, limit: 10 };
        const cards = await adapter.findCards(query);

        expect(Array.isArray(cards)).toBe(true);
        expect(cards.length).toBe(0);
      });
    });

    describe('getStageCards 메서드', () => {
      test('level과 stage로 정확히 필터링해야 함', async () => {
        const cards = await adapter.getStageCards(2, 3);

        cards.forEach(card => {
          expect(card.level).toBe(2);
          expect(card.stage).toBe(3);
        });
      });

      test('존재하지 않는 스테이지는 빈 배열을 반환해야 함', async () => {
        const cards = await adapter.getStageCards(999, 999);
        expect(cards).toEqual([]);
      });

      test('유효하지 않은 입력에 대해 적절히 처리해야 함', async () => {
        const cards = await adapter.getStageCards(-1, 0);
        expect(cards).toEqual([]);
      });
    });

    describe('countCards 메서드', () => {
      test('올바른 카드 개수를 반환해야 함', async () => {
        const query: CardQuery = { level: 1 };
        const count = await adapter.countCards(query);
        const actualCards = await adapter.findCards({ ...query, limit: 1000 });

        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBe(actualCards.length);
      });
    });

    describe('getCardById 메서드', () => {
      test('존재하는 카드를 올바르게 반환해야 함', async () => {
        // 먼저 카드를 조회해서 ID를 얻음
        const cards = await adapter.findCards({ level: 1, limit: 1 });
        
        if (cards.length > 0) {
          const cardId = cards[0].id;
          const foundCard = await adapter.getCardById(cardId);

          expect(foundCard).not.toBeNull();
          expect(foundCard!.id).toBe(cardId);
        }
      });

      test('존재하지 않는 카드는 null을 반환해야 함', async () => {
        const card = await adapter.getCardById('nonexistent-id');
        expect(card).toBeNull();
      });
    });

    describe('getCardsByDifficulty 메서드', () => {
      test('난이도로 올바르게 필터링해야 함', async () => {
        const cards = await adapter.getCardsByDifficulty(1, 2.0);

        cards.forEach(card => {
          expect(card.level).toBe(1);
          // 난이도는 ±0.5 범위 내에 있어야 함 (어댑터 구현에 따라)
          expect(Math.abs(card.difficulty - 2.0)).toBeLessThanOrEqual(0.5);
        });
      });
    });

    // 새로운 메서드들 테스트
    describe('새로운 인터페이스 메서드들', () => {
      test('getLevel은 유효한 레벨 정보를 반환해야 함', async () => {
        const level = await adapter.getLevel('1');
        
        if (level) {
          expect(level).toHaveProperty('id');
          expect(level).toHaveProperty('name');
          expect(typeof level.name).toBe('string');
        }
      });

      test('getLevels는 레벨 배열을 반환해야 함', async () => {
        const levels = await adapter.getLevels();
        
        expect(Array.isArray(levels)).toBe(true);
        levels.forEach(level => {
          expect(level).toHaveProperty('id');
          expect(level).toHaveProperty('name');
        });
      });

      test('getStage는 유효한 스테이지 정보를 반환해야 함', async () => {
        const stage = await adapter.getStage('L1-S1');
        
        if (stage) {
          expect(stage).toHaveProperty('id');
          expect(stage).toHaveProperty('name');
          expect(typeof stage.name).toBe('string');
        }
      });

      test('getCards는 필터와 함께 올바르게 작동해야 함', async () => {
        const filters = { level: 1, limit: 5 };
        const cards = await adapter.getCards(filters);
        
        expect(Array.isArray(cards)).toBe(true);
        expect(cards.length).toBeLessThanOrEqual(5);
      });
    });

    describe('에러 처리', () => {
      test('잘못된 쿼리 파라미터에 대해 우아하게 처리해야 함', async () => {
        // 음수 limit
        const cards1 = await adapter.findCards({ limit: -1 });
        expect(Array.isArray(cards1)).toBe(true);

        // 매우 큰 limit
        const cards2 = await adapter.findCards({ limit: 999999 });
        expect(Array.isArray(cards2)).toBe(true);
      });

      test('null/undefined 파라미터를 적절히 처리해야 함', async () => {
        await expect(async () => {
          await adapter.getCardById('');
        }).not.toThrow();
      });
    });

    describe('성능 테스트', () => {
      test('대량 쿼리도 합리적인 시간 내에 완료되어야 함', async () => {
        const startTime = Date.now();
        
        await adapter.findCards({ limit: 100 });
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // 100개 카드 조회는 5초 이내에 완료되어야 함
        expect(executionTime).toBeLessThan(5000);
      }, 10000);
    });
  });
}

// 헬퍼 함수들
async function setupTestData(adapter: ContentPort): Promise<void> {
  // 테스트 데이터 설정 (구현체에 따라 다를 수 있음)
  // 예: 메모리 어댑터의 경우 샘플 데이터 추가
}

async function cleanupTestData(adapter: ContentPort): Promise<void> {
  // 테스트 후 정리 작업
}