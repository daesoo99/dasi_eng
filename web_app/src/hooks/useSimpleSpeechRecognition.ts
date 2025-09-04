/**
 * useSimpleSpeechRecognition - 간단한 음성인식 훅 (PatternTraining용)
 */

import { useRef, useCallback } from 'react';

interface UseSimpleSpeechRecognitionConfig {
  onResult: (transcript: string) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

interface UseSimpleSpeechRecognitionReturn {
  startRecognition: () => void;
  stopRecognition: () => void;
  isRecognitionActive: () => boolean;
}

export const useSimpleSpeechRecognition = ({
  onResult,
  onError,
  onEnd
}: UseSimpleSpeechRecognitionConfig): UseSimpleSpeechRecognitionReturn => {
  const recognitionRef = useRef<any>(null);

  /**
   * 음성인식 시작
   */
  const startRecognition = useCallback((): void => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('❌ Speech Recognition API 지원 안함');
      alert('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    try {
      // 기존 인식 중지
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 음성인식 시작됨');
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript.trim();
          console.log('🎤 음성인식 결과:', transcript);
          onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ 음성인식 오류:', event.error);
        if (onError) {
          onError(event);
        }
      };

      recognition.onend = () => {
        console.log('🎤 음성인식 종료됨');
        recognitionRef.current = null;
        if (onEnd) {
          onEnd();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
      console.log('🎤 음성인식 시작 시도');
    } catch (error) {
      console.error('❌ 음성인식 초기화 오류:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [onResult, onError, onEnd]);

  /**
   * 음성인식 중지
   */
  const stopRecognition = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      console.log('🎤 음성인식 수동 중지');
    }
  }, []);

  /**
   * 음성인식 활성 상태 확인
   */
  const isRecognitionActive = useCallback((): boolean => {
    return recognitionRef.current !== null;
  }, []);

  return {
    startRecognition,
    stopRecognition,
    isRecognitionActive
  };
};