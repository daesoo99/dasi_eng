/**
 * GetCards UseCase
 * @description 카드 조회 비즈니스 로직
 */

import { ContentPort } from '../ports/ContentPort';
import { DrillCard, CardQuery } from '../../shared/types/core';
import { UserEntity } from '../entities/User';
import { DomainError, ErrorCategory } from '../../shared/errors/DomainError';

export interface GetCardsInput {
  query: CardQuery;
  user: UserEntity;
}

export interface GetCardsOutput {
  cards: DrillCard[];
  total: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

/**
 * 카드 조회 UseCase - 사용자 권한 체크 포함
 */
export class GetCardsUseCase {
  constructor(
    private readonly contentPort: ContentPort
  ) {}

  async execute(input: GetCardsInput): Promise<GetCardsOutput> {
    const { query, user } = input;

    // 비즈니스 규칙: 사용자 레벨 제한 체크
    this.validateUserAccess(query, user);

    // 쿼리 정규화
    const normalizedQuery = this.normalizeQuery(query, user);

    // 포트를 통해 데이터 조회
    const [cards, total] = await Promise.all([
      this.contentPort.findCards(normalizedQuery),
      this.contentPort.countCards(normalizedQuery)
    ]);

    // 페이징 정보 계산
    const limit = normalizedQuery.limit || 20;
    const offset = normalizedQuery.offset || 0;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasMore = offset + cards.length < total;

    return {
      cards,
      total,
      hasMore,
      page,
      totalPages
    };
  }

  /**
   * 사용자 접근 권한 검증
   */
  private validateUserAccess(query: CardQuery, user: UserEntity): void {
    // Level 4+ 콘텐츠는 프리미엄 또는 해당 레벨 이상만 접근
    if (query.level && query.level >= 4) {
      if (!user.canAccessAdvancedContent()) {
        throw new DomainError(
          ErrorCategory.AUTHORIZATION,
          'PREMIUM_CONTENT_REQUIRED',
          `Level ${query.level} content requires premium subscription or higher level`
        );
      }
    }

    // 사용자 레벨보다 2단계 높은 콘텐츠는 제한
    if (query.level && query.level > user.level + 2) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'LEVEL_TOO_HIGH',
        `Content is too advanced for user level ${user.level}`
      );
    }
  }

  /**
   * 쿼리 정규화 및 기본값 적용
   */
  private normalizeQuery(query: CardQuery, user: UserEntity): CardQuery {
    const normalized: CardQuery = {
      ...query,
      limit: Math.min(query.limit || 20, 100), // 최대 100개 제한
      offset: Math.max(query.offset || 0, 0),  // 음수 방지
    };

    // 레벨이 지정되지 않으면 사용자 현재 레벨 사용
    if (!normalized.level) {
      normalized.level = user.level;
    }

    // 난이도 필터 정규화
    if (normalized.difficulty !== undefined) {
      normalized.difficulty = Math.max(1.0, Math.min(5.0, normalized.difficulty));
    }

    // 태그 정규화 (중복 제거, 빈 문자열 제거)
    if (normalized.tags) {
      normalized.tags = [...new Set(normalized.tags.filter(tag => tag.trim().length > 0))];
    }

    return normalized;
  }
}

/**
 * GetCardById UseCase
 */
export class GetCardByIdUseCase {
  constructor(
    private readonly contentPort: ContentPort
  ) {}

  async execute(cardId: string, user: UserEntity): Promise<DrillCard | null> {
    if (!cardId || cardId.trim().length === 0) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_CARD_ID',
        'Card ID cannot be empty'
      );
    }

    const card = await this.contentPort.getCardById(cardId);
    
    if (!card) {
      return null;
    }

    // 사용자 접근 권한 체크
    if (card.level >= 4 && !user.canAccessAdvancedContent()) {
      throw new DomainError(
        ErrorCategory.AUTHORIZATION,
        'PREMIUM_CONTENT_REQUIRED',
        `This card requires premium subscription or higher level`
      );
    }

    if (card.level > user.level + 2) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'LEVEL_TOO_HIGH',
        `This card is too advanced for your current level`
      );
    }

    return card;
  }
}

/**
 * GetCardsByDifficulty UseCase - 맞춤형 난이도 조회
 */
export class GetCardsByDifficultyUseCase {
  constructor(
    private readonly contentPort: ContentPort
  ) {}

  async execute(user: UserEntity, targetDifficulty?: number): Promise<DrillCard[]> {
    // 사용자 레벨 기반 적정 난이도 계산
    const difficulty = targetDifficulty || this.calculateOptimalDifficulty(user);
    
    // 사용자 접근 가능한 최고 레벨 계산
    const maxLevel = user.canAccessPremiumFeatures() ? 10 : Math.min(user.level + 2, 10);
    
    const cards = await this.contentPort.getCardsByDifficulty(maxLevel, difficulty);
    
    return cards;
  }

  /**
   * 사용자별 최적 난이도 계산
   */
  private calculateOptimalDifficulty(user: UserEntity): number {
    const baselineByLevel = {
      1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0, 5: 3.5,
      6: 3.8, 7: 4.0, 8: 4.2, 9: 4.5, 10: 5.0
    };

    let baseDifficulty = baselineByLevel[user.level as keyof typeof baselineByLevel] || 2.0;

    // 신규 사용자는 조금 더 쉽게
    if (user.isNewUser) {
      baseDifficulty = Math.max(1.0, baseDifficulty - 0.3);
    }

    return Math.min(5.0, baseDifficulty);
  }
}