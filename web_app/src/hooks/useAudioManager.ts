/**
 * useAudioManager - TTS 및 오디오 관리 훅
 */

import { useCallback } from 'react';

interface UseAudioManagerReturn {
  playKoreanTTS: (text: string) => Promise<void>;
  playBeepSound: (type?: 'start' | 'countdown' | 'recognition') => void;
}

export const useAudioManager = (): UseAudioManagerReturn => {
  /**
   * 한국어 TTS 재생
   */
  const playKoreanTTS = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.error('❌ Speech Synthesis API 지원 안함');
        resolve();
        return;
      }

      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // 한국어 음성 선택
      const voices = speechSynthesis.getVoices();
      const koreanVoice = voices.find(voice => 
        voice.lang.includes('ko') || voice.lang.includes('KR')
      );
      
      if (koreanVoice) {
        utterance.voice = koreanVoice;
        console.log(`🔊 한국어 음성 선택: ${koreanVoice.name}`);
      }

      utterance.onend = () => {
        console.log('🔊 한국어 TTS 완료');
        resolve();
      };

      utterance.onerror = (e) => {
        console.error('❌ 한국어 TTS 오류:', e);
        resolve();
      };

      // 타임아웃 안전장치 (5초)
      setTimeout(() => {
        console.log('🔊 한국어 TTS 타임아웃 - 강제 resolve');
        resolve();
      }, 5000);

      speechSynthesis.speak(utterance);
    });
  }, []);

  /**
   * 삐소리 재생 함수 (Web Audio API)
   */
  const playBeepSound = useCallback((type: 'start' | 'countdown' | 'recognition' = 'start'): void => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        start: 800,        // 시작 삐소리
        countdown: 600,    // 카운트다운 삐소리
        recognition: 1000  // 인식 시작 삐소리
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      console.log(`🔊 ${type} 삐소리 재생`);
    } catch (error) {
      console.error('❌ 삐소리 재생 오류:', error);
    }
  }, []);

  return {
    playKoreanTTS,
    playBeepSound
  };
};