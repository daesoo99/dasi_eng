import { useState, useCallback, useRef } from 'react';
import { BrowserSTT, BrowserTTS, CloudSTT, AudioRecorder, STTResult } from '@/utils/speechUtils';

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

  // Initialize speech services
  const browserSTT = useRef(new BrowserSTT());
  const browserTTS = useRef(new BrowserTTS());
  const cloudSTT = useRef(options.apiBaseUrl ? new CloudSTT(options.apiBaseUrl) : null);
  const audioRecorder = useRef(new AudioRecorder());

  // Beep audio control
  const currentBeepRefs = useRef<{
    audioContext?: AudioContext;
    oscillator?: OscillatorNode;
    gainNode?: GainNode;
  }>({});

  // Check if speech services are available
  const isSTTAvailable = browserSTT.current.isAvailable() || !!cloudSTT.current;
  const isTTSAvailable = browserTTS.current.isAvailable();

  // Start recording and transcription
  const startRecording = useCallback(async (phraseHints: string[] = []) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        lastResult: null 
      }));

      if (options.preferCloudSTT && cloudSTT.current) {
        // Use cloud STT with audio recording
        await audioRecorder.current.startRecording();
      } else {
        // Use browser STT directly
        if (!browserSTT.current.isAvailable()) {
          throw new Error('브라우저에서 음성 인식을 지원하지 않습니다');
        }
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error ? error.message : '녹음 시작 실패',
      }));
    }
  }, [options.preferCloudSTT]);

  // Stop recording and get transcription
  const stopRecording = useCallback(async (phraseHints: string[] = []): Promise<STTResult | null> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isProcessing: true,
        error: null 
      }));

      let result: STTResult;

      if (options.preferCloudSTT && cloudSTT.current && audioRecorder.current.isRecording()) {
        // Cloud STT path
        const audioBlob = await audioRecorder.current.stopRecording();
        result = await cloudSTT.current.transcribeAudio(audioBlob, {
          language: options.language || 'en-US',
          phraseHints
        });
      } else {
        // Browser STT path
        result = await browserSTT.current.startRecording({
          language: options.language || 'en-US',
          continuous: false,
          interim: false
        });
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
      }));

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '음성 인식 실패';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [options.preferCloudSTT, options.language]);

  // Text-to-Speech with language detection
  const speak = useCallback(async (text: string, voiceOptions: {
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  } = {}) => {
    try {
      if (!browserTTS.current.isAvailable()) {
        throw new Error('브라우저에서 음성 합성을 지원하지 않습니다');
      }

      // Auto-detect language if not specified
      const detectedLang = voiceOptions.lang || 
        (isKorean(text) ? 'ko-KR' : options.language || 'en-US');

      await browserTTS.current.speak(text, {
        lang: detectedLang,
        rate: voiceOptions.rate || (detectedLang === 'ko-KR' ? 0.8 : 0.9),
        pitch: voiceOptions.pitch || 1.0,
        volume: voiceOptions.volume || 1.0,
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '음성 재생 실패',
      }));
    }
  }, [options.language]);

  // Play beep sound with control
  const playBeep = useCallback(async (frequency: number = 800, duration: number = 500) => {
    try {
      // Stop any existing beep
      stopBeep();

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      // Store references for control
      currentBeepRefs.current = { audioContext, oscillator, gainNode };
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
      return new Promise<void>((resolve) => {
        oscillator.onended = () => {
          audioContext.close();
          currentBeepRefs.current = {};
          resolve();
        };
      });
    } catch (error) {
      console.warn('Beep sound failed:', error);
      // Fallback: create a brief pause
      return new Promise<void>(resolve => setTimeout(resolve, 300));
    }
  }, []);

  // Stop beep sound immediately
  const stopBeep = useCallback(() => {
    try {
      if (currentBeepRefs.current.oscillator) {
        currentBeepRefs.current.oscillator.stop();
      }
      if (currentBeepRefs.current.audioContext) {
        currentBeepRefs.current.audioContext.close();
      }
      currentBeepRefs.current = {};
    } catch (error) {
      console.warn('Failed to stop beep:', error);
    }
  }, []);

  // Auto-flow for speaking mode with better error handling
  const startAutoFlow = useCallback(async (koreanText: string, onReadyForSpeech?: () => void) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Check TTS availability before starting
      if (!browserTTS.current.isAvailable()) {
        throw new Error('음성 합성을 지원하지 않는 브라우저입니다');
      }
      
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
  }, [speak, playBeep]);

  // TTS control methods
  const pauseTTS = useCallback(() => {
    browserTTS.current.pause();
  }, []);

  const resumeTTS = useCallback(() => {
    browserTTS.current.resume();
  }, []);

  const isTTSPaused = useCallback(() => {
    return browserTTS.current.isPaused();
  }, []);

  const isTTSSpeaking = useCallback(() => {
    return browserTTS.current.isSpeaking();
  }, []);

  // Stop all speech activities
  const stopAll = useCallback(() => {
    browserSTT.current.stopRecording();
    browserTTS.current.stop();
    stopBeep();
    
    if (audioRecorder.current.isRecording()) {
      audioRecorder.current.stopRecording().catch(() => {
        // Ignore errors when stopping
      });
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isProcessing: false,
    }));
  }, [stopBeep]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get available TTS voices
  const getVoices = useCallback(() => {
    return browserTTS.current.getVoices();
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