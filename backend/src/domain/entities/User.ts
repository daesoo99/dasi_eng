/**
 * User Domain Entity
 * @description 사용자 엔티티 - 비즈니스 규칙과 검증 포함
 */

import { User as IUser } from '../../shared/types/core';
import { DomainError, ErrorCategory } from '../../shared/errors/DomainError';

export class UserEntity {
  private constructor(
    private readonly data: IUser
  ) {
    this.validate();
  }

  /**
   * 새로운 사용자 생성
   */
  static create(userData: {
    uid: string;
    email?: string;
    displayName?: string;
    level?: number;
    subscription?: 'free' | 'premium';
  }): UserEntity {
    const now = new Date();
    
    const user: IUser = {
      uid: userData.uid,
      email: userData.email,
      level: userData.level || 1,
      displayName: userData.displayName,
      subscription: userData.subscription || 'free',
      createdAt: now
    };

    return new UserEntity(user);
  }

  /**
   * 기존 데이터로부터 사용자 엔티티 복원
   */
  static fromData(userData: IUser): UserEntity {
    return new UserEntity(userData);
  }

  /**
   * 데이터 검증
   */
  private validate(): void {
    if (!this.data.uid || this.data.uid.trim().length === 0) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_USER_ID',
        'User ID cannot be empty'
      );
    }

    if (this.data.level < 1 || this.data.level > 10) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_LEVEL',
        'User level must be between 1 and 10'
      );
    }

    if (this.data.email && !this.isValidEmail(this.data.email)) {
      throw new DomainError(
        ErrorCategory.VALIDATION,
        'INVALID_EMAIL',
        'Invalid email format'
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 비즈니스 규칙: 레벨 업 가능 여부
   */
  canLevelUp(): boolean {
    return this.data.level < 10;
  }

  /**
   * 비즈니스 규칙: 프리미엄 기능 접근 가능
   */
  canAccessPremiumFeatures(): boolean {
    return this.data.subscription === 'premium';
  }

  /**
   * 비즈니스 규칙: 고급 레벨 콘텐츠 접근 (Level 4+)
   */
  canAccessAdvancedContent(): boolean {
    return this.data.level >= 4 || this.canAccessPremiumFeatures();
  }

  /**
   * 레벨 업
   */
  levelUp(): UserEntity {
    if (!this.canLevelUp()) {
      throw new DomainError(
        ErrorCategory.BUSINESS_RULE,
        'MAX_LEVEL_REACHED',
        'User has reached maximum level'
      );
    }

    const newData: IUser = {
      ...this.data,
      level: this.data.level + 1
    };

    return new UserEntity(newData);
  }

  /**
   * 구독 업그레이드
   */
  upgradeToPremium(): UserEntity {
    if (this.data.subscription === 'premium') {
      return this; // 이미 프리미엄
    }

    const newData: IUser = {
      ...this.data,
      subscription: 'premium'
    };

    return new UserEntity(newData);
  }

  /**
   * 사용자 프로필 업데이트
   */
  updateProfile(updates: {
    displayName?: string;
    email?: string;
  }): UserEntity {
    const newData: IUser = {
      ...this.data,
      ...updates
    };

    return new UserEntity(newData);
  }

  /**
   * Getter 메서드들
   */
  get uid(): string {
    return this.data.uid;
  }

  get email(): string | undefined {
    return this.data.email;
  }

  get level(): number {
    return this.data.level;
  }

  get displayName(): string | undefined {
    return this.data.displayName;
  }

  get subscription(): 'free' | 'premium' {
    return this.data.subscription || 'free';
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get isPremium(): boolean {
    return this.subscription === 'premium';
  }

  get isNewUser(): boolean {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.data.createdAt > weekAgo;
  }

  /**
   * 도메인 데이터 반환
   */
  toData(): IUser {
    return { ...this.data };
  }

  /**
   * JSON 직렬화
   */
  toJSON(): IUser {
    return this.toData();
  }

  /**
   * 동등성 비교
   */
  equals(other: UserEntity): boolean {
    return this.uid === other.uid;
  }

  /**
   * 로깅을 위한 안전한 문자열 표현
   */
  toSafeString(): string {
    return `User(${this.uid}, level: ${this.level}, subscription: ${this.subscription})`;
  }
}