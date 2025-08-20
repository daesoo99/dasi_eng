import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Comprehensive accessibility hook for enhanced user experience
 * Provides keyboard navigation, screen reader support, and focus management
 */
export const useAccessibility = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementTimeouts = useRef<NodeJS.Timeout[]>([]);

  /**
   * Announce text to screen readers
   * @param message - Text to announce
   * @param priority - Announcement priority ('polite' | 'assertive')
   * @param timeout - Auto-clear timeout in milliseconds
   */
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    timeout = 5000
  ) => {
    if (!message.trim()) return;

    // Add announcement with priority
    const announcement = `[${priority}] ${message}`;
    setAnnouncements(prev => [...prev, announcement]);

    // Auto-clear announcement after timeout
    const timeoutId = setTimeout(() => {
      setAnnouncements(prev => prev.filter(ann => ann !== announcement));
    }, timeout);

    announcementTimeouts.current.push(timeoutId);
  }, []);

  /**
   * Clear all announcements
   */
  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
    announcementTimeouts.current.forEach(clearTimeout);
    announcementTimeouts.current = [];
  }, []);

  /**
   * Enhanced keyboard navigation hook
   * @param ref - Ref to the container element
   * @param options - Configuration options
   */
  const useKeyboardNavigation = useCallback((
    ref: React.RefObject<HTMLElement>,
    options: {
      enableArrowKeys?: boolean;
      enableTabTrapping?: boolean;
      enableEscapeKey?: boolean;
      onEscape?: () => void;
      selectableSelector?: string;
    } = {}
  ) => {
    const {
      enableArrowKeys = true,
      enableTabTrapping = false,
      enableEscapeKey = true,
      onEscape,
      selectableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    } = options;

    useEffect(() => {
      const container = ref.current;
      if (!container) return;

      const getFocusableElements = (): HTMLElement[] => {
        return Array.from(container.querySelectorAll(selectableSelector))
          .filter((el): el is HTMLElement => {
            const htmlEl = el as HTMLElement;
            return htmlEl.offsetParent !== null && !htmlEl.disabled;
          });
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        const focusableElements = getFocusableElements();
        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            if (enableArrowKeys && focusableElements.length > 0) {
              event.preventDefault();
              const nextIndex = (currentIndex + 1) % focusableElements.length;
              focusableElements[nextIndex]?.focus();
              announce(`Focused on ${focusableElements[nextIndex]?.textContent || 'element'}`);
            }
            break;

          case 'ArrowUp':
          case 'ArrowLeft':
            if (enableArrowKeys && focusableElements.length > 0) {
              event.preventDefault();
              const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
              focusableElements[prevIndex]?.focus();
              announce(`Focused on ${focusableElements[prevIndex]?.textContent || 'element'}`);
            }
            break;

          case 'Home':
            if (enableArrowKeys && focusableElements.length > 0) {
              event.preventDefault();
              focusableElements[0]?.focus();
              announce('Moved to first element');
            }
            break;

          case 'End':
            if (enableArrowKeys && focusableElements.length > 0) {
              event.preventDefault();
              focusableElements[focusableElements.length - 1]?.focus();
              announce('Moved to last element');
            }
            break;

          case 'Tab':
            if (enableTabTrapping && focusableElements.length > 0) {
              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];

              if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
              } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
              }
            }
            break;

          case 'Escape':
            if (enableEscapeKey) {
              event.preventDefault();
              onEscape?.();
              announce('Escaped from current context');
            }
            break;
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }, [ref, enableArrowKeys, enableTabTrapping, enableEscapeKey, onEscape, selectableSelector]);
  }, [announce]);

  /**
   * Focus management utilities
   */
  const focusManagement = {
    /**
     * Save current focus and return restore function
     */
    saveFocus: useCallback(() => {
      const activeElement = document.activeElement as HTMLElement;
      return () => {
        if (activeElement && typeof activeElement.focus === 'function') {
          activeElement.focus();
        }
      };
    }, []),

    /**
     * Focus first focusable element in container
     */
    focusFirst: useCallback((container: HTMLElement) => {
      const firstFocusable = container.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }, []),

    /**
     * Set focus trap within container
     */
    trapFocus: useCallback((container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);
      firstElement.focus();

      return () => {
        container.removeEventListener('keydown', handleTabKey);
      };
    }, [])
  };

  /**
   * Screen reader utilities
   */
  const screenReader = {
    /**
     * Check if screen reader is active
     */
    isActive: useCallback(() => {
      // Simple heuristic - not 100% reliable but helpful
      return window.navigator.userAgent.includes('NVDA') ||
             window.navigator.userAgent.includes('JAWS') ||
             window.speechSynthesis?.speaking ||
             (window as any).speechSynthesis?.pending;
    }, []),

    /**
     * Announce with different strategies
     */
    announceChange: useCallback((message: string) => {
      announce(message, 'polite');
    }, [announce]),

    announceError: useCallback((message: string) => {
      announce(`Error: ${message}`, 'assertive');
    }, [announce]),

    announceSuccess: useCallback((message: string) => {
      announce(`Success: ${message}`, 'polite');
    }, [announce])
  };

  /**
   * High contrast mode detection
   */
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const testElement = document.createElement('div');
      testElement.style.borderStyle = 'solid';
      testElement.style.borderWidth = '1px';
      testElement.style.borderColor = 'red green';
      testElement.style.position = 'absolute';
      testElement.style.top = '-999px';
      
      document.body.appendChild(testElement);
      const styles = window.getComputedStyle(testElement);
      const highContrast = styles.borderTopColor === styles.borderRightColor;
      document.body.removeChild(testElement);
      
      setIsHighContrast(highContrast);
    };

    checkHighContrast();
    
    // Listen for high contrast changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = () => checkHighContrast();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  /**
   * Reduced motion detection
   */
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  /**
   * Skip link functionality
   */
  const createSkipLink = useCallback((targetId: string, label: string) => {
    const handleSkip = (e: React.KeyboardEvent | React.MouseEvent) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        announce(`Skipped to ${label}`);
      }
    };

    return {
      href: `#${targetId}`,
      onClick: handleSkip,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSkip(e);
        }
      }
    };
  }, [announce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnnouncements();
    };
  }, [clearAnnouncements]);

  return {
    // Core functions
    announce,
    clearAnnouncements,
    
    // Hooks
    useKeyboardNavigation,
    
    // Utilities
    focusManagement,
    screenReader,
    createSkipLink,
    
    // State
    announcements,
    isHighContrast,
    prefersReducedMotion
  };
};

/**
 * Hook for managing ARIA live regions
 */
export const useAriaLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
};

/**
 * Hook for accessible form handling
 */
export const useAccessibleForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { announce } = useAriaLiveRegion();

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    announce(`Error in ${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const getFieldProps = useCallback((fieldName: string) => ({
    'aria-invalid': !!errors[fieldName],
    'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined
  }), [errors]);

  const getErrorProps = useCallback((fieldName: string) => ({
    id: `${fieldName}-error`,
    role: 'alert',
    'aria-live': 'polite' as const
  }), []);

  return {
    errors,
    setFieldError,
    clearFieldError,
    getFieldProps,
    getErrorProps
  };
};