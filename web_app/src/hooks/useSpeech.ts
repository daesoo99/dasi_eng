import { useState, useCallback, useRef } from 'react';
import { useSimpleSpeech } from '@/plugins/simple/SimpleSpeechPlugin';

// Helper function to detect Korean text
const isKorean = (text: string): boolean => {
  const koreanRegex = /[\u3131-\u318E\uAC00-\uD7A3]/;
  return koreanRegex.test(text);
};

export interface UseSpeechOptions {
  apiBaseUrl?: string;
  preferCloudSTT?: boolean;
  language?: string;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: STTResult | null;
}

export const useSpeech = (options: UseSpeechOptions = {}) => {
  const [state, setState] = useState<SpeechState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    lastResult: null,
  });

  // Use simplified speech plugin
  const speech = useSimpleSpeech();
  const activeRecognitionRef = useRef<AbortController | null>(null);
  const activeTTSRef = useRef<AbortController | null>(null);

  // Check if speech services are available
  const isSTTAvailable = !speech.isLoading && !speech.error;
  const isTTSAvailable = !speech.isLoading && !speech.error;

  // Start recording and transcription
  const startRecording = useCallback(async (_phraseHints: string[] = []) => {
    if (speech.isLoading || speech.error) {
      setState(prev => ({
        ...prev,
        error: speech.error || 'Speech plugin not ready'
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isRecording: true, 
      error: null,
      lastResult: null 
    }));

    // Cancel any existing recognition
    if (activeRecognitionRef.current) {
      activeRecognitionRef.current.abort();
    }
    activeRecognitionRef.current = new AbortController();
  }, [speech.isLoading, speech.error]);

  // Stop recording and get transcription
  const stopRecording = useCallback(async (_phraseHints: string[] = []): Promise<STTResult | null> => {
    if (speech.isLoading || speech.error) {
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: speech.error || 'Speech plugin not ready'
      }));
      return null;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isProcessing: true,
        error: null 
      }));

      const result = await speech.recognizeSpeech({
        language: options.language || 'en-US',
        maxDuration: 30000,
        signal: activeRecognitionRef.current?.signal
      });

      if (result.success && result.transcript) {
        const sttResult: STTResult = {
          transcript: result.transcript,
          confidence: result.confidence || 0.9,
          isFinal: true
        };

        setState(prev => ({
          ...prev,
          isProcessing: false,
          lastResult: sttResult,
        }));

        return sttResult;
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: '음성이 인식되지 않았습니다',
        }));
        return null;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '음성 인식 실패';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      return null;
    } finally {
      activeRecognitionRef.current = null;
    }
  }, [speech.isLoading, speech.error, speech.recognizeSpeech, options.language]);

  // Text-to-Speech with language detection
  const speak = useCallback(async (text: string, voiceOptions: {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  } = {}) => {
    if (speech.isLoading || speech.error) {
      setState(prev => ({
        ...prev,
        error: speech.error || 'Speech plugin not ready'
      }));
      return;
    }

    try {
      // Cancel any existing TTS
      if (activeTTSRef.current) {
        activeTTSRef.current.abort();
      }
      activeTTSRef.current = new AbortController();

      // Auto-detect language if not specified
      const detectedLang = voiceOptions.lang || 
        (isKorean(text) ? 'ko-KR' : options.language || 'en-US');

      const success = await speech.speakText(text, {
        language: detectedLang,
        rate: voiceOptions.rate || (detectedLang === 'ko-KR' ? 0.8 : 0.9),
        signal: activeTTSRef.current.signal
      });

      if (!success) {
        setState(prev => ({
          ...prev,
          error: speech.error || '음성 재생 실패',
        }));
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '음성 재생 실패',
      }));
    } finally {
      activeTTSRef.current = null;
    }
  }, [speech.isLoading, speech.error, speech.speakText, speech.error, options.language]);

  // Play beep sound with control
  const playBeep = useCallback(async (_frequency: number = 800, _duration: number = 500) => {
    if (speech.isLoading || speech.error) {
      // Fallback: create a brief pause
      return new Promise<void>(resolve => setTimeout(resolve, 300));
    }

    try {
      const success = await speech.playBeep();
      if (!success) {
        // Fallback: create a brief pause
        return new Promise<void>(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.warn('Beep sound failed:', error);
      // Fallback: create a brief pause
      return new Promise<void>(resolve => setTimeout(resolve, 300));
    }
  }, [speech.isLoading, speech.error, speech.playBeep]);

  // Stop beep sound immediately
  const stopBeep = useCallback(() => {
    // Simple plugin system handles stopping internally
    speech.stopAll();
  }, [speech.stopAll]);

  // Auto-flow for speaking mode with better error handling
  const startAutoFlow = useCallback(async (koreanText: string, onReadyForSpeech?: () => void) => {
    if (speech.isLoading || speech.error) {
      const error = new Error(speech.error || 'Speech plugin not ready');
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Step 1: Play Korean TTS with timeout protection
      const ttsPromise = speak(koreanText, { lang: 'ko-KR' });
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('TTS 시간 초과')), 10000)
      );
      
      await Promise.race([ttsPromise, timeoutPromise]);
      
      // Small delay to ensure TTS is completely finished
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 2: Play beep sound
      await playBeep();
      
      // Small delay after beep
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 3: Callback to indicate ready for speech
      if (onReadyForSpeech) {
        onReadyForSpeech();
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '자동 플로우 실행 실패',
      }));
      throw error; // Re-throw to allow component to handle state reset
    }
  }, [speech.isLoading, speech.error, speak, playBeep]);

  // TTS control methods (simplified - the simple plugin system handles these internally)
  const pauseTTS = useCallback(() => {
    // Simple plugin doesn't expose pause/resume, so we stop instead
    speech.stopAll();
  }, [speech.stopAll]);

  const resumeTTS = useCallback(() => {
    // Resume not directly supported in simple plugin
    console.warn('Resume TTS not supported in simple plugin system');
  }, []);

  const isTTSPaused = useCallback(() => {
    // Simple plugin doesn't track paused state
    return false;
  }, []);

  const isTTSSpeaking = useCallback(() => {
    return speech.isProcessing;
  }, [speech.isProcessing]);

  // Stop all speech activities
  const stopAll = useCallback(() => {
    speech.stopAll();
    
    // Cancel active operations
    if (activeRecognitionRef.current) {
      activeRecognitionRef.current.abort();
      activeRecognitionRef.current = null;
    }
    if (activeTTSRef.current) {
      activeTTSRef.current.abort();
      activeTTSRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isProcessing: false,
    }));
  }, [speech.stopAll]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get available TTS voices (not directly supported in simple plugin)
  const getVoices = useCallback(() => {
    return [];
  }, []);

  return {
    // State
    ...state,
    
    // Capabilities
    isSTTAvailable,
    isTTSAvailable,
    
    // Actions
    startRecording,
    stopRecording,
    speak,
    playBeep,
    stopBeep,
    startAutoFlow,
    stopAll,
    clearError,
    getVoices,
    
    // TTS Control
    pauseTTS,
    resumeTTS,
    isTTSPaused,
    isTTSSpeaking,
  };
};