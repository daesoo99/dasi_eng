/**
 * Firebase Configuration - TypeScript Edition
 * @description 환경별 Firebase 초기화 및 Mock 서비스
 */

import * as firebaseAdmin from 'firebase-admin';

export interface FirebaseServices {
  db: firebaseAdmin.firestore.Firestore | MockFirestore;
  auth: firebaseAdmin.auth.Auth | MockAuth;
  fcm: firebaseAdmin.messaging.Messaging | MockMessaging;
  admin: typeof firebaseAdmin;
}

// Mock interfaces for development
interface MockFirestore {
  collection: (path: string) => MockCollection;
}

interface MockCollection {
  doc: (id: string) => MockDocument;
  limit: (count: number) => MockCollection;
  get: () => Promise<{ empty: boolean; docs: any[]; forEach: (callback: (doc: any) => void) => void }>;
  add: (data: any) => Promise<any>;
  where: (field: string, op: string, value: any) => MockCollection;
}

interface MockDocument {
  get: () => Promise<{ exists: false }>;
  set: (data: any) => Promise<void>;
  update: (data: any) => Promise<void>;
  delete: () => Promise<void>;
}

interface MockAuth {
  verifyIdToken: (token: string) => Promise<never>;
}

interface MockMessaging {
  send: (message: any) => Promise<never>;
}

class FirebaseManager {
  private services: FirebaseServices | null = null;
  private initialized = false;

  /**
   * Firebase 서비스 초기화
   */
  private initializeFirebase(): FirebaseServices {
    if (this.services && this.initialized) {
      return this.services;
    }

    // 환경 변수 검증
    const requiredEnvVars = [
      'FIREBASE_SERVICE_ACCOUNT_PATH',
      'FIREBASE_DATABASE_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
      console.error('   Please check your .env file configuration');
    }

    // 서비스 계정 로드
    let serviceAccount: firebaseAdmin.ServiceAccount | null = null;
    
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Option 1: JSON string from environment variable
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Option 2: JSON file path from environment variable
        serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      } else {
        throw new Error('No Firebase service account configuration found');
      }
    } catch (error: any) {
      console.log("⚠️ Firebase 서비스 계정 키를 환경변수에서 찾을 수 없습니다.");
      console.log("   개발 모드로 실행합니다. (Firebase 기능 제한)");
      console.log("   Error:", error.message);
    }

    // Firebase 초기화 또는 Mock 생성
    if (serviceAccount && process.env.FIREBASE_DATABASE_URL) {
      try {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });

        this.services = {
          db: firebaseAdmin.firestore(),
          auth: firebaseAdmin.auth(),
          fcm: firebaseAdmin.messaging(),
          admin: firebaseAdmin
        };
        
        this.initialized = true;
        console.log("✅ Firebase 초기화 완료");
      } catch (error: any) {
        console.error("❌ Firebase 초기화 실패:", error.message);
        this.services = this.createMockServices();
      }
    } else {
      console.log("🔧 개발 모드: Firebase Mock 객체 사용");
      this.services = this.createMockServices();
    }

    return this.services;
  }

  /**
   * Mock 서비스 생성 (개발/테스트용)
   */
  private createMockServices(): FirebaseServices {
    const createMockCollection = (): MockCollection => ({
      doc: (id: string) => ({
        get: () => Promise.resolve({ exists: false }),
        set: (data: any) => Promise.resolve(),
        update: (data: any) => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      limit: (count: number) => createMockCollection(),
      get: () => Promise.resolve({ 
        empty: true, 
        docs: [],
        forEach: (callback: (doc: any) => void) => {}
      }),
      add: (data: any) => Promise.resolve({ id: 'mock-doc-id' }),
      where: (field: string, op: string, value: any) => createMockCollection()
    });

    const mockDb: MockFirestore = {
      collection: (path: string) => createMockCollection()
    };

    const mockAuth: MockAuth = {
      verifyIdToken: (token: string) => Promise.reject(new Error("Firebase not initialized"))
    };

    const mockFcm: MockMessaging = {
      send: (message: any) => Promise.reject(new Error("Firebase not initialized"))
    };

    return {
      db: mockDb as any,
      auth: mockAuth as any,
      fcm: mockFcm as any,
      admin: firebaseAdmin
    };
  }

  /**
   * Firebase 서비스 가져오기
   */
  getServices(): FirebaseServices {
    return this.initializeFirebase();
  }

  /**
   * 특정 서비스만 가져오기
   */
  getFirestore(): firebaseAdmin.firestore.Firestore | MockFirestore {
    return this.getServices().db;
  }

  getAuth(): firebaseAdmin.auth.Auth | MockAuth {
    return this.getServices().auth;
  }

  getMessaging(): firebaseAdmin.messaging.Messaging | MockMessaging {
    return this.getServices().fcm;
  }

  /**
   * Firebase 초기화 상태 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false; // Mock 모드는 false (실제 Firebase 연결 없음)
    }

    try {
      // Firestore 연결 테스트
      await this.getFirestore().collection('_health').limit(1).get();
      return true;
    } catch (error) {
      console.error('Firebase health check failed:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
const firebaseManager = new FirebaseManager();

// 기존 호환성을 위한 export
const services = firebaseManager.getServices();
export const db = services.db;
export const auth = services.auth;
export const fcm = services.fcm;
export const admin = services.admin;

// 새로운 방식 export
export { firebaseManager };
export default firebaseManager;