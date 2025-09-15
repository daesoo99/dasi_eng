import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 성능 최적화 관련 유틸리티 훅
 * 
 * Note: 복잡한 custom hook들은 hooks-in-callback 에러로 인해 제거됨
 * 필요시 별도의 custom hook 파일로 분리하여 구현 필요
 */
export const usePerformanceOptimization = () => {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const renderCount = useRef(0);

  // 디바이스 성능 감지
  useEffect(() => {
    // 간단한 성능 판단 (실제로는 더 정교한 로직이 필요)
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 4;
    
    setIsLowEndDevice(hardwareConcurrency <= 2 && memory <= 2);
  }, []);

  // 렌더링 카운터
  useEffect(() => {
    renderCount.current += 1;
  });

  /**
   * 디바운스 유틸리티
   */
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  /**
   * 쓰로틀 유틸리티
   */
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let isThrottled = false;
    
    return (...args: Parameters<T>) => {
      if (!isThrottled) {
        func(...args);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  }, []);

  /**
   * 메모리 사용량 추정
   */
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }, []);

  return {
    // 상태
    isLowEndDevice,
    renderCount: renderCount.current,
    
    // 유틸리티
    debounce,
    throttle,
    getMemoryUsage
  };
};

export default usePerformanceOptimization;