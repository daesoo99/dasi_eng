/**
 * useAudioManager - TTS 및 오디오 관리 훅 (플러그인 기반)
 * - 플러그인 아키텍처를 통한 TTS 관리
 * - 고급 TTS 설정 지원  
 * - 자연스러운 음성 출력
 * - 개인화된 음성 설정 적용
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import { getSpeechPlugin, type ISpeechPlugin } from '@/plugins';
import { NonEmptyString } from '@/types/core';

interface UseAudioManagerReturn {
  playKoreanTTS: (text: string) => Promise<void>;
  playEnglishTTS: (text: string) => Promise<void>;
  playBeepSound: (type?: 'start' | 'countdown' | 'recognition') => Promise<void>;
  stopAllAudio: () => void;
  isPlaying: boolean;
}

export const useAudioManager = (): UseAudioManagerReturn => {
  const { value: voiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  const [speechPlugin, setSpeechPlugin] = useState<ISpeechPlugin | null>(null);
  const [isPlayingState, setIsPlayingState] = useState(false);

  // 플러그인 초기화
  useEffect(() => {
    const initializePlugin = async () => {
      try {
        const result = await getSpeechPlugin();
        if (result.isOk) {
          setSpeechPlugin(result.value);
          console.log('🔊 SpeechPlugin 초기화 완료');
        } else {
          console.error('❌ SpeechPlugin 초기화 실패:', result.error);
        }
      } catch (error) {
        console.error('❌ SpeechPlugin 초기화 예외:', error);
      }
    };

    initializePlugin();
  }, []);


  /**
   * 한국어 TTS 재생 - 100% 플러그인 기반
   */
  const playKoreanTTS = useCallback(async (text: string): Promise<void> => {
    if (!voiceSettings.koreanEnabled) {
      console.log('🔇 한국어 음성이 비활성화됨');
      return;
    }

    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 한국어 TTS 스킵');
      return;
    }

    try {
      // 기존 음성 중단
      speechPlugin.stopAll();
      setIsPlayingState(true);

      // 플러그인을 통한 TTS 실행
      const result = await speechPlugin.speakText(text as NonEmptyString, {
        language: 'ko-KR' as NonEmptyString,
        rate: voiceSettings.speed,
        volume: voiceSettings.volume,
        pitch: voiceSettings.pitch
      });

      if (result.isErr) {
        console.error('❌ 한국어 TTS 플러그인 오류:', result.error);
        setIsPlayingState(false);
        return;
      }

      console.log('🔊 한국어 TTS 완룼 (플러그인)');
      setIsPlayingState(false);
    } catch (error) {
      console.error('❌ 한국어 TTS 예외:', error);
      setIsPlayingState(false);
    }
  }, [speechPlugin, voiceSettings]);

  /**
   * 영어 TTS 재생 - 100% 플러그인 기반
   */
  const playEnglishTTS = useCallback(async (text: string): Promise<void> => {
    if (!voiceSettings.englishEnabled) {
      console.log('🔇 영어 음성이 비활성화됨');
      return;
    }

    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 영어 TTS 스킵');
      return;
    }

    try {
      // 기존 음성 중단
      speechPlugin.stopAll();
      setIsPlayingState(true);

      // 플러그인을 통한 TTS 실행
      const result = await speechPlugin.speakText(text as NonEmptyString, {
        language: 'en-US' as NonEmptyString,
        rate: voiceSettings.speed,
        volume: voiceSettings.volume,
        pitch: voiceSettings.pitch
      });

      if (result.isErr) {
        console.error('❌ 영어 TTS 플러그인 오류:', result.error);
        setIsPlayingState(false);
        return;
      }

      console.log('🔊 영어 TTS 완료 (플러그인)');
      setIsPlayingState(false);
    } catch (error) {
      console.error('❌ 영어 TTS 예외:', error);
      setIsPlayingState(false);
    }
  }, [speechPlugin, voiceSettings]);

  /**
   * 모든 음성 재생 중단 - 100% 플러그인 기반
   */
  const stopAllAudio = useCallback((): void => {
    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 음성 중단 불가');
      return;
    }

    const result = speechPlugin.stopAll();
    setIsPlayingState(false);

    if (result.isErr) {
      console.error('❌ 플러그인 음성 중단 오류:', result.error);
    }
  }, [speechPlugin]);

  // 음성 재생 상태를 실시간으로 업데이트
  useEffect(() => {
    if (!speechPlugin) return;
    
    const checkPlayingStatus = () => {
      const currentlyPlaying = speechPlugin.isProcessing();
      setIsPlayingState(currentlyPlaying);
    };
    
    // 100ms마다 재생 상태 확인
    const interval = setInterval(checkPlayingStatus, 100);
    return () => clearInterval(interval);
  }, [speechPlugin]);

  /**
   * 삐소리 재생 함수 - 100% 플러그인 기반
   */
  const playBeepSound = useCallback(async (type: 'start' | 'countdown' | 'recognition' = 'start'): Promise<void> => {
    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 삐소리 재생 불가');
      return;
    }

    const frequencies = {
      start: 800,
      countdown: 600,
      recognition: 1000
    };
    
    const result = await speechPlugin.playBeep({
      frequency: frequencies[type],
      duration: 200,
      volume: 0.1
    });
    
    if (result.isErr) {
      console.error('❌ 플러그인 삐소리 재생 오류:', result.error);
    }
  }, [speechPlugin]);

  return {
    playKoreanTTS,
    playEnglishTTS,
    playBeepSound,
    stopAllAudio,
    isPlaying: isPlayingState
  };
};