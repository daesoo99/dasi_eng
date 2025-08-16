import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onError?: (error: string) => void;
}

export const useSpeechRecognitionSimple = (options: SpeechRecognitionOptions = {}) => {
  const {
    interimResults = true,
    language = 'ko-KR',
    onResult,
    onError
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    transcript: '',
    confidence: 0,
    error: null
  });

  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      const errorMsg = '이 브라우저에서는 음성 인식을 지원하지 않습니다.';
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      return false;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // 더 긴 시간 인식
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;

      recognitionRef.current.onstart = () => {
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognitionRef.current.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let confidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const resultConfidence = result[0].confidence || 0;

          if (result.isFinal) {
            finalTranscript += transcript;
            confidence = Math.max(confidence, resultConfidence);
            onResult?.(transcript, true, resultConfidence);
          } else {
            onResult?.(transcript, false, 0);
          }
        }

        if (finalTranscript) {
          setState(prev => ({
            ...prev,
            transcript: prev.transcript + finalTranscript,
            confidence
          }));
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        const errorMsg = `음성 인식 오류: ${event.error}`;
        setState(prev => ({ ...prev, error: errorMsg, isListening: false }));
        onError?.(errorMsg);
      };

      recognitionRef.current.start();
      return true;
    } catch (error: any) {
      const errorMsg = `음성 인식 시작 실패: ${error.message}`;
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      return false;
    }
  }, [state.isSupported, interimResults, language, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useSpeechRecognitionSimple;