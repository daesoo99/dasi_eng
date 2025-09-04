import { useState, useEffect } from 'react';
import { getAuthService, getFirestoreService } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

interface UserProgress {
  level: number;
  stage: number;
  exp: number;
  streak: number;
  lastStudyDate: string;
  totalSessions: number;
  createdAt: string;
  updatedAt: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const { setUser: setAppUser } = useAppStore();

  useEffect(() => {
    console.log('[DEBUG] 🔐 Auth state 리스너 설정');
    
    const setupAuthListener = async () => {
      const auth = await getAuthService();
      const { onAuthStateChanged } = await import('firebase/auth');
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[DEBUG] 🔄 Auth state 변경:', firebaseUser?.uid || 'null');
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Firebase 사용자가 로그인했을 때 진행도 로드
        await loadUserProgress(firebaseUser.uid);
        
        // App Store 업데이트
        setAppUser({
          id: firebaseUser.uid,
          level: userProgress?.level || 1,
          stage: userProgress?.stage || 1,
          isAuthenticated: true,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          isAnonymous: firebaseUser.isAnonymous
        });
      } else {
        // 로그아웃 시 초기화
        setUserProgress(null);
        setAppUser({
          id: '',
          level: 1,
          stage: 1,
          isAuthenticated: false
        });
      }
      
        setIsLoading(false);
      });

      return unsubscribe;
    };

    setupAuthListener();
  }, [setAppUser]);

  const loadUserProgress = async (userId: string): Promise<UserProgress | null> => {
    try {
      console.log('[DEBUG] 📊 사용자 진행도 로드 시도:', userId);
      
      const db = await getFirestoreService();
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'userProgress', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const progress = userSnap.data() as UserProgress;
        console.log('[DEBUG] ✅ 기존 진행도 로드:', progress);
        setUserProgress(progress);
        return progress;
      } else {
        // 새 사용자 - 기본 진행도 생성
        const newProgress: UserProgress = {
          level: 1,
          stage: 1,
          exp: 0,
          streak: 0,
          lastStudyDate: '',
          totalSessions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(userRef, newProgress);
        console.log('[DEBUG] 🆕 새 사용자 진행도 생성:', newProgress);
        setUserProgress(newProgress);
        return newProgress;
      }
    } catch (error) {
      console.error('[DEBUG] ❌ 진행도 로드 실패:', error);
      return null;
    }
  };

  const updateUserProgress = async (updates: Partial<UserProgress>): Promise<boolean> => {
    if (!user) {
      console.warn('[DEBUG] ⚠️ 로그인되지 않은 상태에서 진행도 업데이트 시도');
      return false;
    }

    try {
      console.log('[DEBUG] 📈 진행도 업데이트:', updates);
      
      const db = await getFirestoreService();
      const { doc, updateDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'userProgress', user.uid);
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(userRef, updatedData);
      
      // 로컬 상태 업데이트
      setUserProgress(prev => prev ? { ...prev, ...updatedData } : null);
      
      // App Store 업데이트
      if (updates.level !== undefined || updates.stage !== undefined) {
        setAppUser({
          id: user.uid,
          level: updates.level ?? userProgress?.level ?? 1,
          stage: updates.stage ?? userProgress?.stage ?? 1,
          isAuthenticated: true,
          displayName: user.displayName,
          email: user.email,
          isAnonymous: user.isAnonymous
        });
      }
      
      console.log('[DEBUG] ✅ 진행도 업데이트 성공');
      return true;
    } catch (error) {
      console.error('[DEBUG] ❌ 진행도 업데이트 실패:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('[DEBUG] 🚪 로그아웃 시도');
      const auth = await getAuthService();
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      console.log('[DEBUG] ✅ 로그아웃 성공');
    } catch (error) {
      console.error('[DEBUG] ❌ 로그아웃 실패:', error);
      throw error;
    }
  };

  const addExp = async (expGain: number): Promise<boolean> => {
    if (!userProgress) return false;

    const newExp = userProgress.exp + expGain;
    const newLevel = Math.floor(newExp / 100) + 1; // 100 exp per level
    
    const updates: Partial<UserProgress> = {
      exp: newExp,
      level: Math.max(userProgress.level, newLevel),
      totalSessions: userProgress.totalSessions + 1
    };

    // 연속 학습 처리
    const today = new Date().toISOString().split('T')[0];
    const lastStudy = userProgress.lastStudyDate?.split('T')[0];
    
    if (lastStudy === today) {
      // 같은 날 - streak 유지
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastStudy === yesterdayStr) {
        // 연속 학습
        updates.streak = userProgress.streak + 1;
      } else {
        // 연속 끊김
        updates.streak = 1;
      }
    }
    
    updates.lastStudyDate = new Date().toISOString();
    
    return await updateUserProgress(updates);
  };

  return {
    user,
    userProgress,
    isLoading,
    loadUserProgress,
    updateUserProgress,
    logout,
    addExp,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous || false
  };
};

export default useAuth;