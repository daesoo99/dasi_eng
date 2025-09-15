/**
 * useTheme - 다크모드 테마 관리 훅
 * 
 * 기능:
 * - 다크모드 상태 관리
 * - localStorage 자동 저장/불러오기
 * - DOM 클래스 자동 토글
 * - 시스템 설정 감지 (선택사항)
 */

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  // 초기 테마 결정 (localStorage > 시스템 설정 > 기본값)
  const getInitialTheme = (): Theme => {
    // 1. localStorage 확인
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    
    // 2. 시스템 설정 확인
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    
    // 3. 기본값
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // DOM 업데이트 함수
  const updateDOM = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // 테마 변경 함수
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateDOM(newTheme);
    
    console.log(`🌙 테마 변경: ${theme} → ${newTheme}`);
  }, [theme, updateDOM]);

  // 특정 테마로 설정
  const setSpecificTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    updateDOM(newTheme);
  }, [updateDOM]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // localStorage에 설정이 없을 때만 시스템 설정을 따름
      const stored = localStorage.getItem('theme');
      if (!stored) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
        updateDOM(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [updateDOM]);

  // 초기 DOM 설정
  useEffect(() => {
    updateDOM(theme);
  }, [theme, updateDOM]);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setTheme: setSpecificTheme,
    // 유틸리티
    getThemeIcon: () => theme === 'dark' ? '☀️' : '🌙',
    getThemeLabel: () => theme === 'dark' ? '라이트 모드' : '다크 모드'
  };
};