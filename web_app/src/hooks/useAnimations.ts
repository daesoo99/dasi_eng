import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Comprehensive animation system with accessibility support
 * Respects user's motion preferences and provides smooth, performant animations
 */
export const useAnimations = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const animationTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  // Check for reduced motion preference
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach(clearTimeout);
      animationTimeouts.current.clear();
    };
  }, []);

  /**
   * Get animation classes based on motion preference
   */
  const getAnimationClasses = useCallback((animationClass: string, fallbackClass = '') => {
    return prefersReducedMotion ? fallbackClass : animationClass;
  }, [prefersReducedMotion]);

  /**
   * Intersection Observer for scroll-triggered animations
   */
  const useScrollAnimation = useCallback((threshold = 0.1, rootMargin = '0px') => {
    const ref = useRef<HTMLElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
      const element = ref.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsInView(entry.isIntersecting);
        },
        {
          threshold,
          rootMargin
        }
      );

      observer.observe(element);

      return () => {
        observer.unobserve(element);
        observer.disconnect();
      };
    }, [threshold, rootMargin]);

    return { ref, isInView };
  }, []);

  /**
   * Staggered animation for lists
   */
  const useStaggeredAnimation = useCallback((delay = 100, maxDelay = 1000) => {
    const [animatedItems, setAnimatedItems] = useState<Set<number>>(new Set());

    const animateItem = useCallback((index: number) => {
      if (prefersReducedMotion) {
        setAnimatedItems(prev => new Set(prev).add(index));
        return;
      }

      const staggerDelay = Math.min(index * delay, maxDelay);
      const timeoutId = setTimeout(() => {
        setAnimatedItems(prev => new Set(prev).add(index));
        animationTimeouts.current.delete(timeoutId);
      }, staggerDelay);

      animationTimeouts.current.add(timeoutId);
    }, [delay, maxDelay, prefersReducedMotion]);

    const resetAnimation = useCallback(() => {
      setAnimatedItems(new Set());
      animationTimeouts.current.forEach(clearTimeout);
      animationTimeouts.current.clear();
    }, []);

    return {
      animatedItems,
      animateItem,
      resetAnimation,
      isItemAnimated: (index: number) => animatedItems.has(index)
    };
  }, [prefersReducedMotion]);

  /**
   * Page transition animations
   */
  const usePageTransition = useCallback(() => {
    const [isTransitioning, setIsTransitioning] = useState(false);

    const startTransition = useCallback((callback?: () => void) => {
      setIsTransitioning(true);
      
      const duration = prefersReducedMotion ? 0 : 300;
      
      const timeoutId = setTimeout(() => {
        callback?.();
        setIsTransitioning(false);
        animationTimeouts.current.delete(timeoutId);
      }, duration);

      animationTimeouts.current.add(timeoutId);
    }, [prefersReducedMotion]);

    return {
      isTransitioning,
      startTransition
    };
  }, [prefersReducedMotion]);

  /**
   * Loading animation hook
   */
  const useLoadingAnimation = useCallback((initialDelay = 200) => {
    const [showLoading, setShowLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const startLoading = useCallback(() => {
      setIsLoading(true);
      
      const timeoutId = setTimeout(() => {
        setShowLoading(true);
        animationTimeouts.current.delete(timeoutId);
      }, initialDelay);

      animationTimeouts.current.add(timeoutId);
    }, [initialDelay]);

    const stopLoading = useCallback(() => {
      setIsLoading(false);
      setShowLoading(false);
      animationTimeouts.current.forEach(clearTimeout);
      animationTimeouts.current.clear();
    }, []);

    return {
      isLoading,
      showLoading,
      startLoading,
      stopLoading
    };
  }, []);

  /**
   * Hover animation utilities
   */
  const useHoverAnimation = useCallback(() => {
    const [isHovered, setIsHovered] = useState(false);

    const hoverProps = {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onFocus: () => setIsHovered(true),
      onBlur: () => setIsHovered(false)
    };

    const getHoverClasses = (hoverClass: string, baseClass = '') => {
      if (prefersReducedMotion) return baseClass;
      return `${baseClass} ${isHovered ? hoverClass : ''}`;
    };

    return {
      isHovered,
      hoverProps,
      getHoverClasses
    };
  }, [prefersReducedMotion]);

  /**
   * Pulse animation for attention
   */
  const usePulseAnimation = useCallback((duration = 2000, count = 3) => {
    const [isPulsing, setIsPulsing] = useState(false);
    const pulseCountRef = useRef(0);

    const startPulse = useCallback(() => {
      if (prefersReducedMotion) return;
      
      setIsPulsing(true);
      pulseCountRef.current = 0;

      const pulseInterval = setInterval(() => {
        pulseCountRef.current++;
        if (pulseCountRef.current >= count) {
          clearInterval(pulseInterval);
          setIsPulsing(false);
        }
      }, duration / count);

      const timeoutId = setTimeout(() => {
        clearInterval(pulseInterval);
        setIsPulsing(false);
        animationTimeouts.current.delete(timeoutId);
      }, duration);

      animationTimeouts.current.add(timeoutId);
    }, [duration, count, prefersReducedMotion]);

    return {
      isPulsing,
      startPulse
    };
  }, [prefersReducedMotion]);

  /**
   * Shake animation for errors
   */
  const useShakeAnimation = useCallback(() => {
    const [isShaking, setIsShaking] = useState(false);

    const shake = useCallback(() => {
      if (prefersReducedMotion) return;
      
      setIsShaking(true);
      
      const timeoutId = setTimeout(() => {
        setIsShaking(false);
        animationTimeouts.current.delete(timeoutId);
      }, 600);

      animationTimeouts.current.add(timeoutId);
    }, [prefersReducedMotion]);

    return {
      isShaking,
      shake
    };
  }, [prefersReducedMotion]);

  /**
   * Progressive loading animation
   */
  const useProgressiveLoad = useCallback((steps: number) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const nextStep = useCallback(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= steps) {
          setIsComplete(true);
        }
        return Math.min(next, steps);
      });
    }, [steps]);

    const reset = useCallback(() => {
      setCurrentStep(0);
      setIsComplete(false);
    }, []);

    const getStepClasses = useCallback((stepIndex: number) => {
      const isActive = stepIndex <= currentStep;
      const baseClass = 'transition-all duration-300';
      
      if (prefersReducedMotion) {
        return `${baseClass} ${isActive ? 'opacity-100' : 'opacity-50'}`;
      }
      
      return `${baseClass} transform ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`;
    }, [currentStep, prefersReducedMotion]);

    return {
      currentStep,
      isComplete,
      nextStep,
      reset,
      getStepClasses,
      progress: steps > 0 ? (currentStep / steps) * 100 : 0
    };
  }, [prefersReducedMotion]);

  return {
    // State
    prefersReducedMotion,
    isVisible,
    setIsVisible,
    
    // Utilities
    getAnimationClasses,
    
    // Hooks
    useScrollAnimation,
    useStaggeredAnimation,
    usePageTransition,
    useLoadingAnimation,
    useHoverAnimation,
    usePulseAnimation,
    useShakeAnimation,
    useProgressiveLoad
  };
};

/**
 * Animation class definitions
 */
export const animationClasses = {
  // Entrance animations
  fadeIn: 'animate-[fadeIn_0.3s_ease-out]',
  fadeInUp: 'animate-[fadeInUp_0.4s_ease-out]',
  fadeInDown: 'animate-[fadeInDown_0.4s_ease-out]',
  fadeInLeft: 'animate-[fadeInLeft_0.4s_ease-out]',
  fadeInRight: 'animate-[fadeInRight_0.4s_ease-out]',
  scaleIn: 'animate-[scaleIn_0.3s_ease-out]',
  slideInUp: 'animate-[slideInUp_0.4s_ease-out]',
  slideInDown: 'animate-[slideInDown_0.4s_ease-out]',
  
  // Exit animations
  fadeOut: 'animate-[fadeOut_0.3s_ease-in]',
  fadeOutUp: 'animate-[fadeOutUp_0.4s_ease-in]',
  fadeOutDown: 'animate-[fadeOutDown_0.4s_ease-in]',
  scaleOut: 'animate-[scaleOut_0.3s_ease-in]',
  slideOutUp: 'animate-[slideOutUp_0.4s_ease-in]',
  slideOutDown: 'animate-[slideOutDown_0.4s_ease-in]',
  
  // Attention seekers
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  shake: 'animate-[shake_0.6s_ease-in-out]',
  wobble: 'animate-[wobble_1s_ease-in-out]',
  
  // Loading states
  spin: 'animate-spin',
  ping: 'animate-ping',
  
  // Hover effects
  hoverScale: 'hover:scale-105 transition-transform duration-200',
  hoverLift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  hoverGlow: 'hover:shadow-2xl hover:shadow-blue-500/25 transition-shadow duration-300',
  
  // Focus states
  focusRing: 'focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none',
  focusScale: 'focus:scale-105 transition-transform duration-200'
};

/**
 * CSS keyframes for custom animations
 */
export const customAnimationCSS = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes slideInUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  @keyframes slideInDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
  }
  
  @keyframes wobble {
    0% { transform: translateX(0%); }
    15% { transform: translateX(-25%) rotate(-5deg); }
    30% { transform: translateX(20%) rotate(3deg); }
    45% { transform: translateX(-15%) rotate(-3deg); }
    60% { transform: translateX(10%) rotate(2deg); }
    75% { transform: translateX(-5%) rotate(-1deg); }
    100% { transform: translateX(0%); }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    
    .animate-pulse {
      animation: none;
    }
    
    .animate-bounce {
      animation: none;
    }
    
    .animate-spin {
      animation: none;
    }
  }
`;

// Inject animation styles
if (typeof document !== 'undefined' && !document.getElementById('custom-animations')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'custom-animations';
  styleElement.textContent = customAnimationCSS;
  document.head.appendChild(styleElement);
}