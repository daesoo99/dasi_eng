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

// 전역 SpeechPlugin 인스턴스 관리 - 단순화된 접근
let globalSpeechPlugin: ISpeechPlugin | null = null;
let initializationPromise: Promise<ISpeechPlugin | null> | null = null;

// 모든 useAudioManager 인스턴스가 참조할 수 있는 전역 getter
const getGlobalSpeechPlugin = (): ISpeechPlugin | null => globalSpeechPlugin;

const initializeGlobalSpeechPlugin = async (): Promise<ISpeechPlugin | null> => {
  if (globalSpeechPlugin) {
    return globalSpeechPlugin;
  }

  // 이미 초기화 중이면 같은 promise 반환
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('🔍 [GLOBAL] SpeechPlugin 전역 초기화 시작...');
      const result = await getSpeechPlugin();
      if (result?.success) {
        globalSpeechPlugin = result.data;
        console.log('🔊 [GLOBAL] SpeechPlugin 전역 초기화 완료:', result.data);
        return globalSpeechPlugin;
      } else {
        console.error('❌ [GLOBAL] SpeechPlugin 전역 초기화 실패:', result?.error);
        return null;
      }
    } catch (error) {
      console.error('❌ [GLOBAL] SpeechPlugin 전역 초기화 예외:', error);
      return null;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

interface UseAudioManagerReturn {
  playKoreanTTS: (text: string) => Promise<void>;
  playEnglishTTS: (text: string) => Promise<void>;
  playBeepSound: (type?: 'start' | 'countdown' | 'recognition') => Promise<void>;
  stopAllAudio: () => void;
  isPlaying: boolean;
}

export const useAudioManager = (): UseAudioManagerReturn => {
  const { value: voiceSettings } = useLocalStorage(STORAGE_KEYS.VOICE_SETTINGS);
  const [isPlayingState, setIsPlayingState] = useState(false);

  // 전역 플러그인 초기화 - 한 번만 실행
  useEffect(() => {
    const initializePlugin = async () => {
      if (!globalSpeechPlugin) {
        console.log('🔍 [HOOK] 전역 SpeechPlugin 초기화 시도...');
        const plugin = await initializeGlobalSpeechPlugin();
        if (plugin) {
          console.log('🔊 [HOOK] 전역 SpeechPlugin 초기화 완료:', plugin);
        } else {
          console.error('❌ [HOOK] 전역 SpeechPlugin 초기화 실패');
        }
      } else {
        console.log('🔄 [HOOK] 기존 전역 SpeechPlugin 확인됨');
      }
    };

    initializePlugin();
  }, []); // 한 번만 실행

  // 항상 전역 플러그인을 직접 사용 - 로컬 state 제거
  const getSpeechPlugin = (): ISpeechPlugin | null => globalSpeechPlugin;


  /**
   * 한국어 TTS 재생 - 100% 플러그인 기반 (전역 플러그인 사용)
   */
  const playKoreanTTS = useCallback(async (text: string): Promise<void> => {
    if (!voiceSettings.koreanEnabled) {
      console.log('🔇 한국어 음성이 비활성화됨');
      return;
    }

    const speechPlugin = getSpeechPlugin(); // 항상 전역 플러그인 사용
    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 한국어 TTS 스킵');
      return;
    }

    try {
      // 기존 음성 중단 (필요한 경우에만)
      if (speechPlugin.isProcessing()) {
        speechPlugin.stopAll();
      }
      setIsPlayingState(true);

      // 플러그인을 통한 TTS 실행
      const result = await speechPlugin.speakText(text as NonEmptyString, {
        language: 'ko-KR' as NonEmptyString,
        rate: voiceSettings.speed,
        volume: voiceSettings.volume,
        pitch: voiceSettings.pitch
      });

      if (!result.success) {
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
  }, [voiceSettings]); // speechPlugin dependency 제거

  /**
   * 영어 TTS 재생 - 100% 플러그인 기반 (전역 플러그인 사용)
   */
  const playEnglishTTS = useCallback(async (text: string): Promise<void> => {
    if (!voiceSettings.englishEnabled) {
      console.log('🔇 영어 음성이 비활성화됨');
      return;
    }

    const speechPlugin = getSpeechPlugin(); // 항상 전역 플러그인 사용
    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 영어 TTS 스킵');
      return;
    }

    try {
      // 기존 음성 중단 (필요한 경우에만)
      if (speechPlugin.isProcessing()) {
        speechPlugin.stopAll();
      }
      setIsPlayingState(true);

      // 플러그인을 통한 TTS 실행
      const result = await speechPlugin.speakText(text as NonEmptyString, {
        language: 'en-US' as NonEmptyString,
        rate: voiceSettings.speed,
        volume: voiceSettings.volume,
        pitch: voiceSettings.pitch
      });

      if (!result.success) {
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
  }, [voiceSettings]); // speechPlugin dependency 제거

  /**
   * 모든 음성 재생 중단 - 100% 플러그인 기반 (전역 플러그인 사용)
   */
  const stopAllAudio = useCallback((): void => {
    const speechPlugin = getSpeechPlugin(); // 항상 전역 플러그인 사용
    if (!speechPlugin) {
      console.warn('⚠️ SpeechPlugin 미초기화 - 음성 중단 불가');
      return;
    }

    const result = speechPlugin.stopAll();
    setIsPlayingState(false);

    if (!result.success) {
      console.error('❌ 플러그인 음성 중단 오류:', result.error);
    }
  }, []); // dependency 제거

  // 음성 재생 상태를 실시간으로 업데이트 (전역 플러그인 사용)
  useEffect(() => {
    const checkPlayingStatus = () => {
      const speechPlugin = getSpeechPlugin();
      if (speechPlugin) {
        const currentlyPlaying = speechPlugin.isProcessing();
        setIsPlayingState(currentlyPlaying);
      }
    };

    // 100ms마다 재생 상태 확인
    const interval = setInterval(checkPlayingStatus, 100);
    return () => clearInterval(interval);
  }, []); // dependency 제거

  /**
   * 삐소리 재생 함수 - 100% 플러그인 기반 (전역 플러그인 사용)
   */
  const playBeepSound = useCallback(async (type: 'start' | 'countdown' | 'recognition' = 'start'): Promise<void> => {
    const speechPlugin = getSpeechPlugin(); // 항상 전역 플러그인 사용
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

    if (!result.success) {
      console.error('❌ 플러그인 삐소리 재생 오류:', result.error);
    } else {
      console.log('🔊 삐소리 재생 완료 (플러그인)');
    }
  }, []); // dependency 제거

  return {
    playKoreanTTS,
    playEnglishTTS,
    playBeepSound,
    stopAllAudio,
    isPlaying: isPlayingState
  };
};