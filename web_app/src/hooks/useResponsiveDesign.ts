import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Comprehensive responsive design system
 * Provides breakpoint detection, responsive utilities, and mobile optimization
 */

// Define breakpoints (matching Tailwind CSS defaults)
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof breakpoints;

interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  devicePixelRatio: number;
}

export const useResponsiveDesign = () => {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg' as Breakpoint,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLandscape: true,
        isPortrait: false,
        devicePixelRatio: 1
      };
    }

    return getViewportInfo();
  });

  function getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Determine current breakpoint
    let breakpoint: Breakpoint = 'xs';
    if (width >= breakpoints['2xl']) breakpoint = '2xl';
    else if (width >= breakpoints.xl) breakpoint = 'xl';
    else if (width >= breakpoints.lg) breakpoint = 'lg';
    else if (width >= breakpoints.md) breakpoint = 'md';
    else if (width >= breakpoints.sm) breakpoint = 'sm';
    
    // Device type detection
    const isMobile = width < breakpoints.md;
    const isTablet = width >= breakpoints.md && width < breakpoints.lg;
    const isDesktop = width >= breakpoints.lg;
    
    // Orientation
    const isLandscape = width > height;
    const isPortrait = height > width;

    return {
      width,
      height,
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isLandscape,
      isPortrait,
      devicePixelRatio
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportInfo());
    };

    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => {
        setViewport(getViewportInfo());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  /**
   * Check if current breakpoint matches the specified breakpoint or larger
   */
  const isBreakpoint = useCallback((bp: Breakpoint) => {
    return viewport.width >= breakpoints[bp];
  }, [viewport.width]);

  /**
   * Check if current breakpoint is exactly the specified breakpoint
   */
  const isExactBreakpoint = useCallback((bp: Breakpoint) => {
    return viewport.breakpoint === bp;
  }, [viewport.breakpoint]);

  /**
   * Get responsive value based on current breakpoint
   */
  const getResponsiveValue = useCallback(<T>(
    values: Partial<Record<Breakpoint, T>>
  ): T | undefined => {
    // Get breakpoints in descending order
    const sortedBreakpoints = (Object.keys(breakpoints) as Breakpoint[])
      .filter(bp => breakpoints[bp] <= viewport.width)
      .sort((a, b) => breakpoints[b] - breakpoints[a]);

    // Find the first matching value
    for (const bp of sortedBreakpoints) {
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }

    // Fallback to xs if no match found
    return values.xs;
  }, [viewport.width]);

  /**
   * Generate responsive className based on breakpoint
   */
  const getResponsiveClasses = useCallback((
    classes: Partial<Record<Breakpoint, string>>
  ): string => {
    const sortedBreakpoints = (Object.keys(breakpoints) as Breakpoint[])
      .filter(bp => breakpoints[bp] <= viewport.width)
      .sort((a, b) => breakpoints[b] - breakpoints[a]);

    for (const bp of sortedBreakpoints) {
      if (classes[bp]) {
        return classes[bp]!;
      }
    }

    return classes.xs || '';
  }, [viewport.width]);

  /**
   * Touch device detection
   */
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  /**
   * Safe area insets for mobile devices (iPhone X+ notch support)
   */
  const safeAreaInsets = useMemo(() => {
    if (typeof window === 'undefined' || typeof CSS === 'undefined' || !CSS.supports) {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const getInset = (property: string) => {
      if (CSS.supports(`padding: env(${property})`)) {
        const testElement = document.createElement('div');
        testElement.style.padding = `env(${property})`;
        document.body.appendChild(testElement);
        const computed = window.getComputedStyle(testElement).padding;
        document.body.removeChild(testElement);
        return parseInt(computed) || 0;
      }
      return 0;
    };

    return {
      top: getInset('safe-area-inset-top'),
      bottom: getInset('safe-area-inset-bottom'),
      left: getInset('safe-area-inset-left'),
      right: getInset('safe-area-inset-right')
    };
  }, []);

  /**
   * Generate container classes based on breakpoint
   */
  const getContainerClasses = useCallback((
    type: 'full' | 'contained' | 'narrow' = 'contained'
  ): string => {
    const baseClasses = 'mx-auto px-4';
    
    switch (type) {
      case 'full':
        return 'w-full px-4';
      case 'narrow':
        return `${baseClasses} max-w-4xl`;
      case 'contained':
      default:
        if (viewport.isMobile) return `${baseClasses} max-w-full`;
        if (viewport.isTablet) return `${baseClasses} max-w-4xl`;
        return `${baseClasses} max-w-7xl`;
    }
  }, [viewport.isMobile, viewport.isTablet]);

  /**
   * Grid system utilities
   */
  const getGridClasses = useCallback((
    cols: Partial<Record<Breakpoint, number>>
  ): string => {
    const currentCols = getResponsiveValue(cols) || 1;
    return `grid grid-cols-${currentCols} gap-4`;
  }, [getResponsiveValue]);

  /**
   * Mobile-first responsive text sizing
   */
  const getTextClasses = useCallback((
    size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  ): string => {
    const sizeMap = {
      xs: { xs: 'text-xs', sm: 'sm:text-sm' },
      sm: { xs: 'text-sm', sm: 'sm:text-base' },
      base: { xs: 'text-base', sm: 'sm:text-lg' },
      lg: { xs: 'text-lg', sm: 'sm:text-xl' },
      xl: { xs: 'text-xl', sm: 'sm:text-2xl' },
      '2xl': { xs: 'text-2xl', sm: 'sm:text-3xl' },
      '3xl': { xs: 'text-3xl', sm: 'sm:text-4xl' },
      '4xl': { xs: 'text-4xl', sm: 'sm:text-5xl' }
    };

    const classes = sizeMap[size];
    return `${classes.xs} ${classes.sm || ''}`;
  }, []);

  /**
   * Performance-optimized media query hook
   */
  const useMediaQuery = useCallback((query: string) => {
    const [matches, setMatches] = useState(() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia(query).matches;
    });

    useEffect(() => {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setMatches(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }, [query]);

    return matches;
  }, []);

  /**
   * Print styles detection
   */
  const isPrint = useMediaQuery('print');

  /**
   * Dark mode detection
   */
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  /**
   * High DPI display detection
   */
  const isHighDPI = viewport.devicePixelRatio > 1;

  return {
    // Viewport information
    viewport,
    
    // Device type helpers
    isTouchDevice,
    isPrint,
    prefersDarkMode,
    isHighDPI,
    
    // Breakpoint utilities
    isBreakpoint,
    isExactBreakpoint,
    
    // Responsive value getters
    getResponsiveValue,
    getResponsiveClasses,
    
    // Layout utilities
    getContainerClasses,
    getGridClasses,
    getTextClasses,
    
    // Safe area support
    safeAreaInsets,
    
    // Media query hook
    useMediaQuery
  };
};