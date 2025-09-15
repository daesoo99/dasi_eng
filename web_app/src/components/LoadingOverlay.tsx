/**
 * LoadingOverlay - 로딩 오버레이 컴포넌트
 */

import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = '로딩 중...'
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-sm mx-4 shadow-2xl transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">로딩 중...</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</div>
          </div>
        </div>
      </div>
    </div>
  );
};