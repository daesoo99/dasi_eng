import React, { useState, useCallback, memo, useMemo } from 'react';
import { getAuthService } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

type AuthMode = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = memo(({ isOpen, onClose, onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth 에러 메시지 처리 함수
  const getAuthErrorMessage = useCallback((error: any): string => {
    switch (error.code) {
      case 'auth/user-not-found':
        return '등록되지 않은 이메일입니다.';
      case 'auth/wrong-password':
        return '잘못된 비밀번호입니다.';
      case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
      case 'auth/weak-password':
        return '비밀번호는 6자 이상이어야 합니다.';
      case 'auth/invalid-email':
        return '올바르지 않은 이메일 형식입니다.';
      case 'auth/popup-closed-by-user':
        return '로그인이 취소되었습니다.';
      default:
        return error.message || '로그인 중 오류가 발생했습니다.';
    }
  }, []);

  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log(`[DEBUG] 📧 이메일 ${authMode} 시도:`, { email, hasPassword: !!password });

    try {
      let userCredential;
      
      if (authMode === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 회원가입 시 displayName 설정
        if (displayName && userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: displayName
          });
          console.log('[DEBUG] ✅ 프로필 업데이트 완료:', displayName);
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      console.log('[DEBUG] ✅ 이메일 인증 성공:', userCredential.user.uid);
      onAuthSuccess(userCredential.user);
      onClose();
    } catch (error: any) {
      console.error('[DEBUG] ❌ 이메일 인증 실패:', error);
      setError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [authMode, email, password, displayName, onAuthSuccess, onClose, getAuthErrorMessage]);

  const handleGoogleAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('[DEBUG] 🔍 구글 로그인 시도');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      console.log('[DEBUG] ✅ 구글 로그인 성공:', userCredential.user.uid);
      onAuthSuccess(userCredential.user);
      onClose();
    } catch (error: any) {
      console.error('[DEBUG] ❌ 구글 로그인 실패:', error);
      setError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [onAuthSuccess, onClose, getAuthErrorMessage]);

  const handleAnonymousAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('[DEBUG] 👤 익명 로그인 시도');

    try {
      // 🎯 모듈화: Firebase 의존성을 동적으로 로드 
      const auth = await getAuthService();
      const { signInAnonymously } = await import('firebase/auth');
      
      const userCredential = await signInAnonymously(auth);
      
      console.log('[DEBUG] ✅ 익명 로그인 성공:', userCredential.user.uid);
      onAuthSuccess(userCredential.user);
      onClose();
    } catch (error: any) {
      console.error('[DEBUG] ❌ 익명 로그인 실패:', error);
      setError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [onAuthSuccess, onClose, getAuthErrorMessage]);

  const handleModeToggle = useCallback(() => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
    setError(null);
  }, [authMode]);

  const modalTitle = useMemo(() => {
    return authMode === 'login' ? '로그인' : '회원가입';
  }, [authMode]);

  const submitButtonText = useMemo(() => {
    if (isLoading) return '처리 중...';
    return authMode === 'login' ? '로그인' : '회원가입';
  }, [isLoading, authMode]);

  const toggleButtonText = useMemo(() => {
    return authMode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인';
  }, [authMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        {/* 이메일/비밀번호 로그인 */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                닉네임 (선택사항)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="표시될 이름을 입력하세요"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
              placeholder="이메일을 입력하세요"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            {submitButtonText}
          </button>
        </form>

        {/* 구분선 */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">또는</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>🔍</span>
            <span>구글 로그인</span>
          </button>
          
          <button
            onClick={handleAnonymousAuth}
            disabled={isLoading}
            className="w-full bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>👤</span>
            <span>체험하기 (익명)</span>
          </button>
        </div>

        {/* 모드 전환 */}
        <div className="mt-6 text-center">
          <button
            onClick={handleModeToggle}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors duration-200"
          >
            {toggleButtonText}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AuthModal;