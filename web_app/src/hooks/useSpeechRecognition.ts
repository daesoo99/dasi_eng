import { useState, useCallback, useRef, useEffect } from 'react';
import { webSpeechAPI } from '../services/api';

interface SpeechRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
  const {
    continuous = true,
    interimResults = true,
    language = 'ko-KR',
    maxAlternatives = 1,
    onStart,
    onEnd,
    onResult,
    onError
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isSupported: webSpeechAPI.isSupported(),
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0
  });

  const recognitionRef = useRef<any>(null);
  const isManualStop = useRef(false);

  // 초기화
  useEffect(() => {
    if (!webSpeechAPI.isSupported()) {
      setState(prev => ({
        ...prev,
        error: '이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.'
      }));
      return;
    }

    // SpeechRecognition 인스턴스 생성
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      
      // 기본 설정
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      // 이벤트 핸들러 설정
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setState(prev => ({
          ...prev,
          isListening: true,
          error: null
        }));
        onStart?.();
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setState(prev => ({
          ...prev,
          isListening: false
        }));
        
        // 수동으로 중지한게 아니고 continuous 모드라면 자동 재시작
        if (!isManualStop.current && continuous) {
          setTimeout(() => {
            if (recognitionRef.current && !isManualStop.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log('Auto restart failed, recognition might already be running');
              }
            }
          }, 1000);
        }
        
        onEnd?.();
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;

        // 결과 처리
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0;

          if (result.isFinal) {
            finalTranscript += transcript;
            maxConfidence = Math.max(maxConfidence, confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        setState(prev => ({
          ...prev,
          transcript: prev.transcript + finalTranscript,
          interimTranscript,
          confidence: maxConfidence
        }));

        // 콜백 호출
        if (finalTranscript) {
          onResult?.(finalTranscript, true);
        } else if (interimTranscript) {
          onResult?.(interimTranscript, false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = '음성 인식 중 오류가 발생했습니다.';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = '음성이 감지되지 않았습니다. 다시 시도해주세요.';
            break;
          case 'audio-capture':
            errorMessage = '마이크에 접근할 수 없습니다. 마이크 권한을 확인해주세요.';
            break;
          case 'not-allowed':
            errorMessage = '마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
            break;
          case 'network':
            errorMessage = '네트워크 오류로 음성 인식에 실패했습니다.';
            break;
          case 'service-not-allowed':
            errorMessage = '음성 인식 서비스를 사용할 수 없습니다.';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          isListening: false
        }));
        
        onError?.(errorMessage);
      };

      recognitionRef.current.onnomatch = () => {
        console.log('No speech recognition match');
        setState(prev => ({
          ...prev,
          error: '음성을 인식하지 못했습니다. 다시 시도해주세요.'
        }));
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, interimResults, language, maxAlternatives, onStart, onEnd, onResult, onError]);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !state.isSupported) {
      setState(prev => ({
        ...prev,
        error: '음성 인식을 사용할 수 없습니다.'
      }));
      return false;
    }

    if (state.isListening) {
      console.log('Already listening');
      return true;
    }

    try {
      isManualStop.current = false;
      recognitionRef.current.start();
      console.log('Starting speech recognition');
      return true;
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);
      setState(prev => ({
        ...prev,
        error: '음성 인식을 시작할 수 없습니다: ' + error.message
      }));
      return false;
    }
  }, [state.isSupported, state.isListening]);

  // 음성 인식 중지
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      isManualStop.current = true;
      recognitionRef.current.stop();
      console.log('Stopping speech recognition');
    } catch (error: any) {
      console.error('Failed to stop speech recognition:', error);
    }
  }, []);

  // 트랜스크립트 초기화
  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null
    }));
  }, []);

  // 에러 클리어
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // 마이크 권한 요청
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 권한 확인 후 스트림 정리
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission denied:', error);
      setState(prev => ({
        ...prev,
        error: '마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.'
      }));
      return false;
    }
  }, []);

  // 브라우저 호환성 확인
  const getBrowserSupport = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);

    return {
      isSupported: webSpeechAPI.isSupported(),
      isChrome,
      isEdge,
      isSafari,
      isFirefox,
      recommendation: !webSpeechAPI.isSupported() 
        ? 'Chrome 또는 Edge 브라우저를 사용하시기 바랍니다.' 
        : '지원되는 브라우저입니다.'
    };
  }, []);

  // 현재 상태의 전체 텍스트 (final + interim)
  const fullTranscript = state.transcript + state.interimTranscript;

  // 텍스트가 있는지 확인
  const hasTranscript = fullTranscript.trim().length > 0;

  // 현재 말하고 있는지 확인 (interim 결과가 있으면)
  const isSpeaking = state.interimTranscript.length > 0;

  return {
    // 상태
    ...state,
    fullTranscript,
    hasTranscript,
    isSpeaking,

    // 액션
    startListening,
    stopListening,
    resetTranscript,
    clearError,
    requestMicrophonePermission,

    // 유틸리티
    getBrowserSupport,

    // 설정 정보
    config: {
      continuous,
      interimResults,
      language,
      maxAlternatives
    }
  };
};