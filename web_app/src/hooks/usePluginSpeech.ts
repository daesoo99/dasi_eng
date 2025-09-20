/**
 * Speech 플러그인 사용을 위한 React Hook
 * @description 기존 하드코딩된 webSpeechAPI 대신 플러그인 시스템 사용
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSpeechPlugin, isPluginAvailable } from '@/plugins';
import type { ISpeechPlugin, SpeechProcessingState } from '@/plugins/speech/ISpeechPlugin';
import { NonEmptyString, PositiveNumber } from '@/types/core';

// Hook 옵션
export interface UsePluginSpeechOptions {
  readonly autoInitialize?: boolean;
  readonly fallbackToWebAPI?: boolean;
  readonly onStateChange?: (state: SpeechProcessingState) => void;
  readonly onError?: (error: string) => void;
}

// Hook 반환 타입
export interface UsePluginSpeechReturn {
  // 플러그인 상태
  readonly isAvailable: boolean;
  readonly isLoading: boolean;
  readonly processingState: SpeechProcessingState;
  readonly error: string | null;
  
  // TTS 기능
  readonly speakText: (
    text: string,
    options?: {
      language?: string;
      rate?: number;
      volume?: number;
    }
  ) => Promise<boolean>;
  
  // 음성 인식 기능
  readonly recognizeSpeech: (
    options?: {
      language?: string;
      maxDuration?: number;
      continuous?: boolean;
    }
  ) => Promise<{ success: boolean; transcript?: string; confidence?: number }>;
  
  readonly startListening: (
    onResult: (transcript: string, confidence: number) => void,
    options?: {
      language?: string;
      continuous?: boolean;
    }
  ) => boolean;
  
  readonly stopListening: () => boolean;
  
  // 신호음
  readonly playBeep: (
    options?: {
      frequency?: number;
      duration?: number;
    }
  ) => Promise<boolean>;
  
  // 제어
  readonly stopAll: () => boolean;
  readonly isProcessing: () => boolean;
  
  // 기능 확인
  readonly getSupportedLanguages: () => Promise<string[]>;
  readonly getAvailableVoices: () => Promise<SpeechSynthesisVoice[]>;
}

/**
 * Speech 플러그인 사용 Hook
 */
export function usePluginSpeech(options: UsePluginSpeechOptions = {}): UsePluginSpeechReturn {
  const {
    autoInitialize = true,
    fallbackToWebAPI: _fallbackToWebAPI = true,
    onStateChange,
    onError
  } = options;

  // 상태
  const [isLoading, setIsLoading] = useState(true);
  const [processingState, setProcessingState] = useState<SpeechProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // 플러그인 인스턴스
  const speechPluginRef = useRef<ISpeechPlugin | null>(null);
  const isAvailable = isPluginAvailable('speech');

  // 플러그인 초기화
  useEffect(() => {
    if (!autoInitialize) return;

    const initializePlugin = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getSpeechPlugin();
        if (result.success) {
          speechPluginRef.current = result.data;
          
          // 상태 변경 리스너 등록
          result.data.onSpeechEvent((event) => {
            if (event.type === 'stateChange' && event.data?.state) {
              setProcessingState(event.data.state);
              onStateChange?.(event.data.state);
            }
            if (event.type === 'error' && event.data?.error) {
              const errorMsg = typeof event.data.error === 'string' 
                ? event.data.error 
                : 'Unknown plugin error';
              setError(errorMsg);
              onError?.(errorMsg);
            }
          });

          console.log('✅ Speech plugin initialized successfully');
        } else {
          throw new Error(`Failed to initialize speech plugin: ${result.error}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Plugin initialization failed';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error('❌ Speech plugin initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializePlugin();
  }, [autoInitialize, onStateChange, onError]);

  // TTS 함수
  const speakText = useCallback(async (
    text: string,
    options: {
      language?: string;
      rate?: number;
      volume?: number;
    } = {}
  ): Promise<boolean> => {
    const plugin = speechPluginRef.current;
    if (!plugin) {
      console.warn('Speech plugin not available');
      return false;
    }

    try {
      const result = await plugin.speakText(
        text as NonEmptyString,
        {
          language: options.language as NonEmptyString | undefined,
          rate: options.rate as PositiveNumber | undefined,
          volume: options.volume
        }
      );
      return result.success;
    } catch (error) {
      console.error('TTS error:', error);
      return false;
    }
  }, []);

  // 음성 인식 함수
  const recognizeSpeech = useCallback(async (
    options: {
      language?: string;
      maxDuration?: number;
      continuous?: boolean;
    } = {}
  ): Promise<{ success: boolean; transcript?: string; confidence?: number }> => {
    const plugin = speechPluginRef.current;
    if (!plugin) {
      console.warn('Speech plugin not available');
      return { success: false };
    }

    try {
      const result = await plugin.recognizeSpeech({
        language: options.language as NonEmptyString | undefined,
        maxDuration: options.maxDuration as PositiveNumber | undefined,
        continuous: options.continuous
      });

      if (result.success && result.data.success) {
        return {
          success: true,
          transcript: result.data.transcript,
          confidence: result.data.confidence
        };
      } else {
        return { 
          success: false,
          transcript: undefined,
          confidence: undefined
        };
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      return { success: false };
    }
  }, []);

  // 실시간 음성 인식 시작
  const startListening = useCallback((
    onResult: (transcript: string, confidence: number) => void,
    options: {
      language?: string;
      continuous?: boolean;
    } = {}
  ): boolean => {
    const plugin = speechPluginRef.current;
    if (!plugin) {
      console.warn('Speech plugin not available');
      return false;
    }

    try {
      const result = plugin.startListening(
        onResult,
        {
          language: options.language as NonEmptyString | undefined,
          continuous: options.continuous
        }
      );
      return result.success;
    } catch (error) {
      console.error('Start listening error:', error);
      return false;
    }
  }, []);

  // 음성 인식 중지
  const stopListening = useCallback((): boolean => {
    const plugin = speechPluginRef.current;
    if (!plugin) return false;

    try {
      const result = plugin.stopListening();
      return result.success;
    } catch (error) {
      console.error('Stop listening error:', error);
      return false;
    }
  }, []);

  // 신호음 재생
  const playBeep = useCallback(async (
    options: {
      frequency?: number;
      duration?: number;
    } = {}
  ): Promise<boolean> => {
    const plugin = speechPluginRef.current;
    if (!plugin) {
      console.warn('Speech plugin not available');
      return false;
    }

    try {
      const result = await plugin.playBeep({
        frequency: options.frequency as PositiveNumber | undefined,
        duration: options.duration as PositiveNumber | undefined
      });
      return result.success;
    } catch (error) {
      console.error('Play beep error:', error);
      return false;
    }
  }, []);

  // 모든 처리 중지
  const stopAll = useCallback((): boolean => {
    const plugin = speechPluginRef.current;
    if (!plugin) return false;

    try {
      const result = plugin.stopAll();
      return result.success;
    } catch (error) {
      console.error('Stop all error:', error);
      return false;
    }
  }, []);

  // 처리 상태 확인
  const isProcessing = useCallback((): boolean => {
    const plugin = speechPluginRef.current;
    return plugin?.isProcessing() ?? false;
  }, []);

  // 지원 언어 조회
  const getSupportedLanguages = useCallback(async (): Promise<string[]> => {
    const plugin = speechPluginRef.current;
    if (!plugin) return [];

    try {
      const result = await plugin.getSupportedLanguages();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Get supported languages error:', error);
      return [];
    }
  }, []);

  // 사용 가능한 음성 조회
  const getAvailableVoices = useCallback(async (): Promise<SpeechSynthesisVoice[]> => {
    const plugin = speechPluginRef.current;
    if (!plugin) return [];

    try {
      const result = await plugin.getAvailableVoices();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Get available voices error:', error);
      return [];
    }
  }, []);

  return {
    // 상태
    isAvailable,
    isLoading,
    processingState,
    error,
    
    // 메서드
    speakText,
    recognizeSpeech,
    startListening,
    stopListening,
    playBeep,
    stopAll,
    isProcessing,
    getSupportedLanguages,
    getAvailableVoices
  };
}