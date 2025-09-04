// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy-loaded Firebase services
let firebaseApp: any = null;
let authService: any = null;
let firestoreService: any = null;

// Firebase App 초기화 (동적 import)
export async function initFirebase() {
  if (firebaseApp) return firebaseApp;
  
  const { initializeApp } = await import('firebase/app');
  firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
}

// Firebase Auth 서비스 (동적 import)
export async function getAuthService() {
  if (authService) return authService;
  
  const app = await initFirebase();
  const { getAuth } = await import('firebase/auth');
  authService = getAuth(app);
  return authService;
}

// Firestore 서비스 (동적 import)
export async function getFirestoreService() {
  if (firestoreService) return firestoreService;
  
  const app = await initFirebase();
  const { getFirestore } = await import('firebase/firestore');
  firestoreService = getFirestore(app);
  return firestoreService;
}

// 호환성을 위한 레거시 exports (사용 시 경고)
export const auth = {
  get: async () => {
    console.warn('⚠️  Direct auth access is deprecated. Use getAuthService() instead.');
    return getAuthService();
  }
};

export const db = {
  get: async () => {
    console.warn('⚠️  Direct db access is deprecated. Use getFirestoreService() instead.');
    return getFirestoreService();
  }
};

// 앱 인스턴스도 동적으로
export default {
  get: initFirebase
};