import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * 종합 애니메이션 유틸리티 훅
 * 애니메이션 관련 기능들을 통합 제공
 * 
 * Note: 복잡한 custom hook들은 hooks-in-callback 에러로 인해 제거됨
 * 필요시 별도의 custom hook 파일로 분리하여 구현 필요
 */
export const useAnimations = () => {
  const animationTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Reduced motion 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // 컴포넌트 언마운트 시 모든 애니메이션 타이머 정리
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach(clearTimeout);
      animationTimeouts.current.clear();
    };
  }, []);

  /**
   * 기본 애니메이션 클래스 생성
   */
  const getAnimationClasses = useCallback((animationClass: string, fallbackClass = '') => {
    return prefersReducedMotion ? fallbackClass : animationClass;
  }, [prefersReducedMotion]);

  /**
   * 애니메이션 클래스 헬퍼
   */
  const getFadeInClasses = useCallback((isVisible: boolean) => {
    return getAnimationClasses(
      isVisible ? 'opacity-100 transition-opacity duration-300' : 'opacity-0',
      'opacity-100'
    );
  }, [getAnimationClasses]);

  return {
    // 상태
    prefersReducedMotion,
    
    // 유틸리티
    getAnimationClasses,
    getFadeInClasses,
    
    // 애니메이션 타이머 관리
    animationTimeouts: animationTimeouts.current
  };
};

export default useAnimations;