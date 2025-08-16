import { useState, useCallback, useRef } from 'react';
import { BrowserSTT, BrowserTTS, CloudSTT, AudioRecorder, STTResult } from '@/utils/speechUtils';

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

  // Text-to-Speech
  const speak = useCallback(async (text: string, voiceOptions: {
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}) => {
    try {
      if (!browserTTS.current.isAvailable()) {
        throw new Error('브라우저에서 음성 합성을 지원하지 않습니다');
      }

      await browserTTS.current.speak(text, {
        lang: options.language || 'en-US',
        rate: voiceOptions.rate || 0.9,
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

  // Stop all speech activities
  const stopAll = useCallback(() => {
    browserSTT.current.stopRecording();
    browserTTS.current.stop();
    
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
  }, []);

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
    stopAll,
    clearError,
    getVoices,
  };
};