import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

export const UserProfile: React.FC = () => {
  const { user, userProgress, logout, isLoading, isAuthenticated, isAnonymous } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xs">👤</span>
        </div>
        <span className="text-sm">체험 모드</span>
      </div>
    );
  }

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    if (isAnonymous) return '익명 사용자';
    return '사용자';
  };

  const getLevelProgress = () => {
    if (!userProgress) return 0;
    const currentLevelExp = userProgress.exp % 100;
    return currentLevelExp;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
          {getDisplayName().charAt(0).toUpperCase()}
        </div>
        
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {getDisplayName()}
            {isAnonymous && <span className="text-xs text-gray-500 ml-1">(체험)</span>}
          </div>
          <div className="text-xs text-gray-600">
            Level {userProgress?.level || 1} • Stage {userProgress?.stage || 1}
          </div>
        </div>
        
        <svg className={`w-4 h-4 text-gray-500 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {getDisplayName().charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{getDisplayName()}</div>
                <div className="text-sm text-gray-600">{user?.email}</div>
                {isAnonymous && (
                  <div className="text-xs text-orange-600">체험 계정 (데이터가 저장되지 않을 수 있습니다)</div>
                )}
              </div>
            </div>

            {userProgress && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-lg font-bold text-blue-600">{userProgress.level}</div>
                    <div className="text-xs text-blue-500">Level</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-lg font-bold text-green-600">{userProgress.exp}</div>
                    <div className="text-xs text-green-500">EXP</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <div className="text-lg font-bold text-orange-600">{userProgress.streak}</div>
                    <div className="text-xs text-orange-500">연속</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>다음 레벨까지</span>
                    <span>{getLevelProgress()}/100 EXP</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getLevelProgress()}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div>총 학습 세션: {userProgress.totalSessions}회</div>
                  {userProgress.lastStudyDate && (
                    <div>마지막 학습: {new Date(userProgress.lastStudyDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-2">
            {isAnonymous && (
              <div className="px-3 py-2 text-xs text-orange-600 bg-orange-50 rounded-md mb-2">
                💡 계정을 생성하면 진행도가 영구적으로 저장됩니다.
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              🚪 로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;