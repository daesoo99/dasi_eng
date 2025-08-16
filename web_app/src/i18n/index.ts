import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ko: {
    translation: {
      // Navigation
      home: '홈',
      study: '학습하기',
      progress: '진행상황',
      settings: '설정',
      
      // Study page
      level: '레벨',
      stage: '스테이지',
      startStudy: '학습 시작',
      nextCard: '다음 문제',
      previousCard: '이전 문제',
      finishSession: '세션 완료',
      
      // Audio controls
      record: '녹음하기',
      recording: '녹음중...',
      processing: '처리중...',
      playAnswer: '정답 듣기',
      
      // Feedback
      correct: '정답!',
      incorrect: '틀림',
      tryAgain: '다시 시도',
      hint: '힌트',
      correction: '교정',
      score: '점수',
      
      // Results
      sessionComplete: '세션 완료',
      accuracy: '정확도',
      averageScore: '평균 점수',
      totalTime: '총 시간',
      timePerCard: '문제당 시간',
      passed: '통과',
      failed: '재도전',
      
      // Settings
      language: '언어',
      korean: '한국어',
      english: 'English',
      sttEngine: '음성 인식',
      browser: '브라우저',
      cloud: '클라우드',
      ttsEnabled: '음성 재생',
      volume: '볼륨',
      
      // Errors
      microphoneError: '마이크 접근 오류',
      networkError: '네트워크 오류',
      speechNotSupported: '브라우저에서 음성 인식을 지원하지 않습니다',
      tryAgainLater: '잠시 후 다시 시도해주세요',
      
      // Common
      loading: '로딩중...',
      retry: '다시 시도',
      cancel: '취소',
      ok: '확인',
      back: '뒤로',
      next: '다음',
      finish: '완료',
    }
  },
  en: {
    translation: {
      // Navigation
      home: 'Home',
      study: 'Study',
      progress: 'Progress',
      settings: 'Settings',
      
      // Study page
      level: 'Level',
      stage: 'Stage',
      startStudy: 'Start Study',
      nextCard: 'Next Card',
      previousCard: 'Previous Card',
      finishSession: 'Finish Session',
      
      // Audio controls
      record: 'Record',
      recording: 'Recording...',
      processing: 'Processing...',
      playAnswer: 'Play Answer',
      
      // Feedback
      correct: 'Correct!',
      incorrect: 'Incorrect',
      tryAgain: 'Try Again',
      hint: 'Hint',
      correction: 'Correction',
      score: 'Score',
      
      // Results
      sessionComplete: 'Session Complete',
      accuracy: 'Accuracy',
      averageScore: 'Average Score',
      totalTime: 'Total Time',
      timePerCard: 'Time per Card',
      passed: 'Passed',
      failed: 'Try Again',
      
      // Settings
      language: 'Language',
      korean: '한국어',
      english: 'English',
      sttEngine: 'Speech Recognition',
      browser: 'Browser',
      cloud: 'Cloud',
      ttsEnabled: 'Text to Speech',
      volume: 'Volume',
      
      // Errors
      microphoneError: 'Microphone access error',
      networkError: 'Network error',
      speechNotSupported: 'Speech recognition not supported in this browser',
      tryAgainLater: 'Please try again later',
      
      // Common
      loading: 'Loading...',
      retry: 'Retry',
      cancel: 'Cancel',
      ok: 'OK',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // default language
    fallbackLng: 'ko',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;