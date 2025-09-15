import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 접근성 관련 유틸리티 훅
 * 
 * Note: 복잡한 custom hook들은 hooks-in-callback 에러로 인해 제거됨
 * 필요시 별도의 custom hook 파일로 분리하여 구현 필요
 */
export const useAccessibility = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('medium');

  // 접근성 설정 감지
  useEffect(() => {
    // Reduced motion 감지
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    // High contrast 감지
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(contrastQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
      contrastQuery.addEventListener('change', handleContrastChange);
      
      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        contrastQuery.removeEventListener('change', handleContrastChange);
      };
    }
  }, []);

  /**
   * ARIA 레이블 생성 헬퍼
   */
  const createAriaLabel = useCallback((
    label: string, 
    description?: string
  ): { 'aria-label': string; 'aria-describedby'?: string } => {
    const result: { 'aria-label': string; 'aria-describedby'?: string } = {
      'aria-label': label
    };

    if (description) {
      const descriptionId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      result['aria-describedby'] = descriptionId;
    }

    return result;
  }, []);

  /**
   * 포커스 관리 유틸리티
   */
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus();
    }
  }, []);

  /**
   * 키보드 네비게이션 헬퍼
   */
  const isNavigationKey = useCallback((key: string): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Space', 'Escape'].includes(key);
  }, []);

  return {
    // 접근성 상태
    prefersReducedMotion,
    highContrast,
    fontSize,
    
    // 유틸리티 함수
    createAriaLabel,
    focusElement,
    isNavigationKey,
    
    // 설정 변경
    setFontSize
  };
};

export default useAccessibility;