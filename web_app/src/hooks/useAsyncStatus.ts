import { useState, useCallback } from 'react';

export interface AsyncState<T = any> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
  progress?: number;
  retryCount: number;
}

export function useAsyncStatus<T = any>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    retryCount: 0
  });

  const setLoading = useCallback((progress?: number) => {
    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      progress, 
      error: undefined 
    }));
  }, []);

  const setSuccess = useCallback((data?: T) => {
    setState(prev => ({ 
      ...prev, 
      status: 'success', 
      data, 
      error: undefined, 
      progress: 100 
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ 
      ...prev, 
      status: 'error', 
      error, 
      retryCount: prev.retryCount + 1 
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', retryCount: 0 });
  }, []);

  return { 
    ...state, 
    setLoading, 
    setSuccess, 
    setError, 
    reset 
  };
}