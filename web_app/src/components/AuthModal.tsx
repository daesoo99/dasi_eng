import React, { useState, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

type AuthMode = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [authMode, email, password, displayName, onAuthSuccess, onClose]);

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
  }, [onAuthSuccess, onClose]);

  const handleAnonymousAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('[DEBUG] 👤 익명 로그인 시도');

    try {
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
  }, [onAuthSuccess, onClose]);

  const getAuthErrorMessage = (error: any): string => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {authMode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* 이메일/비밀번호 로그인 */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                닉네임 (선택사항)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="표시될 이름을 입력하세요"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일을 입력하세요"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? '처리 중...' : (authMode === 'login' ? '로그인' : '회원가입')}
          </button>
        </form>

        {/* 구분선 */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-gray-500 text-sm">또는</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            <span>🔍</span>
            <span>구글 로그인</span>
          </button>
          
          <button
            onClick={handleAnonymousAuth}
            disabled={isLoading}
            className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            <span>👤</span>
            <span>체험하기 (익명)</span>
          </button>
        </div>

        {/* 모드 전환 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            {authMode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;