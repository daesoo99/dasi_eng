import { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Custom hook for performance optimization utilities
 * Provides debouncing, throttling, and memoization helpers
 */
export const usePerformanceOptimization = () => {
  // Ref to store timeout IDs for cleanup
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const throttleRefs = useRef<Map<string, { lastCall: number; timeout?: NodeJS.Timeout }>>(new Map());

  // Cleanup function to clear all timeouts
  const cleanup = useCallback(() => {
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    throttleRefs.current.forEach(({ timeout }) => {
      if (timeout) clearTimeout(timeout);
    });
    throttleRefs.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Debounce function with automatic cleanup
   * @param key - Unique identifier for this debounced function
   * @param func - Function to debounce
   * @param delay - Delay in milliseconds
   */
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    return (...args: Parameters<T>) => {
      // Clear existing timeout for this key
      const existingTimeout = timeoutRefs.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        func(...args);
        timeoutRefs.current.delete(key);
      }, delay);

      timeoutRefs.current.set(key, timeoutId);
    };
  }, []);

  /**
   * Throttle function with automatic cleanup
   * @param key - Unique identifier for this throttled function
   * @param func - Function to throttle
   * @param delay - Delay in milliseconds
   */
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const throttleData = throttleRefs.current.get(key);

      if (!throttleData || now - throttleData.lastCall >= delay) {
        // Execute immediately if enough time has passed
        func(...args);
        throttleRefs.current.set(key, { lastCall: now });
      } else {
        // Schedule execution for later
        if (throttleData.timeout) {
          clearTimeout(throttleData.timeout);
        }

        const remaining = delay - (now - throttleData.lastCall);
        const timeoutId = setTimeout(() => {
          func(...args);
          throttleRefs.current.set(key, { lastCall: Date.now() });
        }, remaining);

        throttleRefs.current.set(key, { 
          lastCall: throttleData.lastCall, 
          timeout: timeoutId 
        });
      }
    };
  }, []);

  /**
   * Memoized computation with dependency tracking
   * Similar to useMemo but with performance monitoring
   */
  const memoizeWithPerf = useCallback(<T>(
    factory: () => T,
    deps: React.DependencyList,
    debugName?: string
  ): T => {
    return useMemo(() => {
      const startTime = performance.now();
      const result = factory();
      const endTime = performance.now();
      
      if (debugName && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${debugName}: ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      return result;
    }, deps);
  }, []);

  /**
   * Performance-monitored callback
   * Wraps useCallback with performance tracking
   */
  const callbackWithPerf = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList,
    debugName?: string
  ): T => {
    return useCallback((...args: Parameters<T>) => {
      const startTime = performance.now();
      const result = callback(...args);
      const endTime = performance.now();
      
      if (debugName && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${debugName}: ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      return result;
    }, deps) as T;
  }, []);

  /**
   * Batch multiple state updates to prevent unnecessary re-renders
   */
  const batchUpdates = useCallback((updates: (() => void)[]): void => {
    // Use React's automatic batching in React 18+
    // For older versions, you might need ReactDOM.unstable_batchedUpdates
    updates.forEach(update => update());
  }, []);

  /**
   * Intersection Observer hook for lazy loading
   */
  const useIntersectionObserver = useCallback((
    targetRef: React.RefObject<Element>,
    options: IntersectionObserverInit = {},
    callback?: (isIntersecting: boolean) => void
  ) => {
    useEffect(() => {
      const target = targetRef.current;
      if (!target) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          callback?.(entry.isIntersecting);
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
          ...options,
        }
      );

      observer.observe(target);

      return () => {
        observer.unobserve(target);
        observer.disconnect();
      };
    }, [targetRef, callback, options]);
  }, []);

  return {
    debounce,
    throttle,
    memoizeWithPerf,
    callbackWithPerf,
    batchUpdates,
    useIntersectionObserver,
    cleanup,
  };
};

/**
 * Hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Render Performance] ${componentName}: Render #${renderCount.current}, ` +
        `Time since last: ${timeSinceLastRender}ms`
      );
    }
  });

  return { renderCount: renderCount.current };
};

/**
 * Hook for preventing unnecessary re-renders with deep comparison
 */
export const useDeepMemo = <T>(value: T): T => {
  const ref = useRef<T>(value);
  
  const isEqual = useMemo(() => {
    return JSON.stringify(ref.current) === JSON.stringify(value);
  }, [value]);

  if (!isEqual) {
    ref.current = value;
  }

  return ref.current;
};

/**
 * Hook for measuring async operation performance
 */
export const useAsyncPerformance = () => {
  const measure = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      
      if (operationName && process.env.NODE_ENV === 'development') {
        console.log(
          `[Async Performance] ${operationName}: ${(endTime - startTime).toFixed(2)}ms`
        );
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      if (operationName && process.env.NODE_ENV === 'development') {
        console.error(
          `[Async Performance] ${operationName} failed after ${(endTime - startTime).toFixed(2)}ms:`,
          error
        );
      }
      
      throw error;
    }
  }, []);

  return { measure };
};