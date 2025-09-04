/**
 * FirebaseAuthAdapter - Admin SDK 보안 검증
 * 주의: Admin SDK는 보안 규칙을 우회하므로 직접 권한 검증 필요
 */

import admin from 'firebase-admin';
import { DomainError, ErrorCategory } from '../../shared/errors/DomainError';

export interface AuthUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  subscription?: 'free' | 'premium';
  level?: number;
}

export interface ResourcePermission {
  resource: string;
  action: 'read' | 'write' | 'delete';
  resourceId?: string;
}

export class FirebaseAuthAdapter {
  constructor(private firestore: admin.firestore.Firestore) {}

  /**
   * Firebase ID 토큰 검증
   */
  async verifyToken(idToken: string): Promise<AuthUser> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // 사용자 프로필 정보 추가 조회
      const userDoc = await this.firestore.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        subscription: userData?.subscription || 'free',
        level: userData?.level || 1
      };
    } catch (error) {
      throw new DomainError(
        ErrorCategory.AUTHENTICATION,
        'INVALID_TOKEN',
        'Firebase ID token verification failed',
        { originalError: this.getErrorMessage(error) }
      );
    }
  }

  /**
   * 리소스 접근 권한 검증
   * Admin SDK는 보안 규칙을 우회하므로 직접 구현 필요
   */
  async checkPermission(user: AuthUser, permission: ResourcePermission): Promise<boolean> {
    const { resource, action, resourceId } = permission;

    try {
      // 1. 기본 인증 확인
      if (!user.uid) return false;

      // 2. 이메일 인증 필수 (민감한 작업의 경우)
      if (action === 'write' || action === 'delete') {
        if (!user.emailVerified) {
          throw new DomainError(
            ErrorCategory.AUTHORIZATION,
            'EMAIL_NOT_VERIFIED',
            'Email verification required for this action'
          );
        }
      }

      // 3. 리소스별 권한 검증
      switch (resource) {
        case 'sessions':
          return this.checkSessionPermission(user, action, resourceId);
        
        case 'cards':
          return this.checkCardPermission(user, action);
          
        case 'users':
          return this.checkUserPermission(user, action, resourceId);
          
        case 'admin':
          return this.checkAdminPermission(user);
          
        default:
          throw new DomainError(
            ErrorCategory.AUTHORIZATION,
            'UNKNOWN_RESOURCE',
            `Unknown resource: ${resource}`
          );
      }
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      
      throw new DomainError(
        ErrorCategory.SYSTEM,
        'PERMISSION_CHECK_FAILED',
        'Permission check failed',
        { originalError: this.getErrorMessage(error) }
      );
    }
  }

  private async checkSessionPermission(user: AuthUser, action: string, sessionId?: string): Promise<boolean> {
    if (action === 'read' || action === 'write') {
      // 사용자는 자신의 세션만 조회/수정 가능
      if (sessionId) {
        const sessionDoc = await this.firestore.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return false;
        
        const sessionData = sessionDoc.data()!;
        return sessionData.userId === user.uid;
      }
      return true; // sessionId가 없으면 사용자 자신의 세션 목록 조회로 간주
    }
    
    return false; // delete는 일반 사용자 불가
  }

  private checkCardPermission(user: AuthUser, action: string): boolean {
    if (action === 'read') {
      // Level 1-3: 모든 사용자 접근 가능
      // Level 4+: 프리미엄 구독자만
      return user.subscription === 'premium' || (typeof user.level === 'number' && user.level <= 3);
    }
    
    // write/delete: 관리자만
    return false;
  }

  private checkUserPermission(user: AuthUser, action: string, targetUserId?: string): boolean {
    if (action === 'read' || action === 'write') {
      // 사용자는 자신의 정보만 조회/수정 가능
      return !targetUserId || targetUserId === user.uid;
    }
    
    return false; // delete는 관리자만
  }

  private async checkAdminPermission(user: AuthUser): Promise<boolean> {
    // 관리자 권한 확인 (Firestore에서 admin 역할 조회)
    const userDoc = await this.firestore.collection('users').doc(user.uid).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data()!;
    return userData.role === 'admin' || userData.role === 'super_admin';
  }

  /**
   * 사용자 프로필 업데이트 (권한 있는 필드만)
   */
  async updateUserProfile(uid: string, updates: Partial<{
    displayName: string;
    level: number;
    preferences: any;
  }>): Promise<void> {
    try {
      // 허용된 필드만 업데이트
      const allowedFields = ['displayName', 'level', 'preferences'];
      const sanitized = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key as keyof typeof updates];
          return obj;
        }, {} as any);

      if (Object.keys(sanitized).length === 0) {
        throw new DomainError(
          ErrorCategory.VALIDATION,
          'NO_VALID_FIELDS',
          'No valid fields to update'
        );
      }

      await this.firestore.collection('users').doc(uid).set(sanitized, { merge: true });
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      
      throw new DomainError(
        ErrorCategory.SYSTEM,
        'PROFILE_UPDATE_FAILED',
        'Failed to update user profile',
        { originalError: this.getErrorMessage(error) }
      );
    }
  }

  /**
   * 보안 이벤트 로깅 (의심스러운 접근 기록)
   */
  async logSecurityEvent(event: {
    uid: string;
    action: string;
    resource: string;
    allowed: boolean;
    ip?: string;
    userAgent?: string;
    reason?: string;
  }): Promise<void> {
    try {
      await this.firestore.collection('security_logs').add({
        ...event,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: event.allowed ? 'info' : 'warning'
      });
    } catch (error) {
      // 보안 로깅 실패는 메인 기능에 영향주지 않음
      console.error('Security logging failed:', error);
    }
  }

  /**
   * unknown 타입 에러를 안전하게 문자열로 변환
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return JSON.stringify(error);
  }
}