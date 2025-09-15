/**
 * ThemeToggle - 재사용 가능한 다크모드 토글 컴포넌트
 * 
 * 기능:
 * - 다양한 크기와 스타일 지원
 * - 애니메이션 효과
 * - 접근성 준수
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'switch' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'button',
  showLabel = false,
  className = ''
}) => {
  const { toggleTheme, isDark, getThemeIcon, getThemeLabel } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg'
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
    ${sizeClasses[size]}
  `;

  if (variant === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${baseClasses}
          relative w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full
          ${className}
        `}
        aria-label={getThemeLabel()}
      >
        <div
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
            transform transition-transform duration-200
            ${isDark ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
        {showLabel && (
          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
            {getThemeLabel()}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${baseClasses}
          text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200
          ${className}
        `}
        aria-label={getThemeLabel()}
      >
        <span className="text-xl">{getThemeIcon()}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${baseClasses}
        bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
        text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600
        ${className}
      `}
      aria-label={getThemeLabel()}
    >
      <span className="text-lg mr-2">{getThemeIcon()}</span>
      {showLabel && <span>{getThemeLabel()}</span>}
    </button>
  );
};