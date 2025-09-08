/**
 * 테마 기반 스타일을 제공하는 Hook
 * 김대수님의 개인 맞춤 색상과 기본 깔끔한 테마 사이를 전환
 */

import { useMemo } from 'react';
import { useTheme } from '@/store/useAppStore';

export interface ThemedStyles {
  // Background Colors
  bgPrimary: string;
  bgSecondary: string;
  bgAccent: string;
  bgBase: string;
  
  // Text Colors  
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  
  // Border Colors
  borderPrimary: string;
  borderSecondary: string;
  borderAccent: string;
  
  // Button Styles
  primaryButton: string;
  secondaryButton: string;
  accentButton: string;
  
  // Hover Effects
  hoverPrimary: string;
  hoverSecondary: string;
  hoverAccent: string;
  
  // Progress & Status
  progressBar: string;
  successColor: string;
  warningColor: string;
}

export const useThemedStyles = (): ThemedStyles => {
  const { themeMode, personalTheme } = useTheme();
  
  const styles = useMemo(() => {
    if (themeMode === 'personal') {
      // 미정 테마 (기본 테마와 동일한 깔끔한 회색)
      return {
        // Background Colors
        bgPrimary: '#f9fafb',      // 깔끔한 회색 배경
        bgSecondary: '#ffffff',    // 흰색
        bgAccent: '#6b7280',       // 중간 회색
        bgBase: '#f9fafb',         // 연한 회색 (스피킹 화면과 동일)
        
        // Text Colors
        textPrimary: '#374151',    // 짙은 회색
        textSecondary: '#6b7280',  // 중간 회색
        textAccent: '#4b5563',     // 어두운 회색
        
        // Border Colors
        borderPrimary: '#e5e7eb',  // 연한 회색 테두리
        borderSecondary: '#d1d5db', // 중간 회색 테두리
        borderAccent: '#9ca3af',   // 짙은 회색 테두리
        
        // Button Styles
        primaryButton: 'bg-gray-600 hover:bg-gray-700 text-white',
        secondaryButton: 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700',
        accentButton: 'bg-blue-500 hover:bg-blue-600 text-white',
        
        // Hover Effects
        hoverPrimary: 'hover:border-gray-400',
        hoverSecondary: 'hover:border-blue-400',
        hoverAccent: 'hover:border-gray-500',
        
        // Progress & Status
        progressBar: '#6b7280',    // 회색
        successColor: '#10b981',   // 초록
        warningColor: '#f59e0b',   // 주황
      };
    } else {
      // 기본 깔끔한 테마 (스피킹 화면 스타일)
      return {
        // Background Colors
        bgPrimary: '#f9fafb',      // 깔끔한 회색 배경
        bgSecondary: '#ffffff',    // 흰색
        bgAccent: '#6b7280',       // 중간 회색
        bgBase: '#f9fafb',         // 연한 회색 (스피킹 화면과 동일)
        
        // Text Colors
        textPrimary: '#374151',    // 짙은 회색
        textSecondary: '#6b7280',  // 중간 회색
        textAccent: '#4b5563',     // 어두운 회색
        
        // Border Colors
        borderPrimary: '#e5e7eb',  // 연한 회색 테두리
        borderSecondary: '#d1d5db', // 중간 회색 테두리
        borderAccent: '#9ca3af',   // 짙은 회색 테두리
        
        // Button Styles
        primaryButton: 'bg-gray-600 hover:bg-gray-700 text-white',
        secondaryButton: 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700',
        accentButton: 'bg-blue-500 hover:bg-blue-600 text-white',
        
        // Hover Effects
        hoverPrimary: 'hover:border-gray-400',
        hoverSecondary: 'hover:border-blue-400',
        hoverAccent: 'hover:border-gray-500',
        
        // Progress & Status
        progressBar: '#6b7280',    // 회색
        successColor: '#10b981',   // 초록
        warningColor: '#f59e0b',   // 주황
      };
    }
  }, [themeMode, personalTheme]);
  
  return styles;
};

// 인라인 스타일용 헬퍼
export const useThemedInlineStyles = () => {
  const { themeMode, personalTheme } = useTheme();
  
  return useMemo(() => {
    if (themeMode === 'personal') {
      return {
        primary: '#6b7280',        // 회색 (기본 테마와 동일)
        secondary: '#ffffff',      // 흰색 (기본 테마와 동일)
        accent: '#4b5563',         // 어두운 회색 (기본 테마와 동일)
        base: '#f9fafb',          // 연한 회색 배경 (기본 테마와 동일)
        text: '#374151',          // 짙은 회색 텍스트
        border: '#e5e7eb',        // 연한 회색 테두리 (기본 테마와 동일)
      };
    } else {
      return {
        primary: '#6b7280',        // 회색 (깔끔한 스피킹 화면 스타일)
        secondary: '#ffffff',      // 흰색
        accent: '#4b5563',         // 어두운 회색
        base: '#f9fafb',          // 연한 회색 배경 (스피킹 화면과 동일)
        text: '#374151',          // 짙은 회색 텍스트
        border: '#e5e7eb',        // 연한 회색 테두리
      };
    }
  }, [themeMode, personalTheme]);
};