/**
 * @fileoverview 음성 테스트 전용 컴포넌트
 * @description 마이크 테스트, 발음 연습, 음성 품질 분석 기능 제공
 * @author DaSiStart Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { webSpeechAPI } from '../services/webSpeechAPI.ts';

// ====== 타입 정의 ======

interface AudioTestState {
  currentTest: 'microphone' | 'pronunciation' | 'quality' | 'recording' | null;
  microphoneLevel: number;
  isRecording: boolean;
  testResults: AudioTestResult[];
  recordedAudio: Blob | null;
  isPlaying: boolean;
}

interface AudioTestResult {
  id: string;
  type: 'microphone' | 'pronunciation' | 'quality';
  timestamp: number;
  score: number;
  details: any;
  recommendation: string;
}

interface PronunciationTest {
  word: string;
  expectedPronunciation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: '기본' | '비즈니스' | '기술' | '영어';
}

// ====== 발음 테스트 데이터 ======

const PRONUNCIATION_TESTS: PronunciationTest[] = [
  // 기본 단어
  { word: '안녕하세요', expectedPronunciation: '안녕하세요', difficulty: 1, category: '기본' },
  { word: '감사합니다', expectedPronunciation: '감사합니다', difficulty: 1, category: '기본' },
  { word: '죄송합니다', expectedPronunciation: '죄송합니다', difficulty: 2, category: '기본' },
  
  // 비즈니스 용어
  { word: '프로젝트', expectedPronunciation: '프로젝트', difficulty: 2, category: '비즈니스' },
  { word: '마케팅', expectedPronunciation: '마케팅', difficulty: 2, category: '비즈니스' },
  { word: '커뮤니케이션', expectedPronunciation: '커뮤니케이션', difficulty: 3, category: '비즈니스' },
  
  // 기술 용어
  { word: '알고리즘', expectedPronunciation: '알고리즘', difficulty: 3, category: '기술' },
  { word: '아키텍처', expectedPronunciation: '아키텍처', difficulty: 3, category: '기술' },
  { word: '데이터베이스', expectedPronunciation: '데이터베이스', difficulty: 2, category: '기술' },
  
  // 영어 단어
  { word: 'React', expectedPronunciation: '리액트', difficulty: 2, category: '영어' },
  { word: 'JavaScript', expectedPronunciation: '자바스크립트', difficulty: 3, category: '영어' },
  { word: 'Architecture', expectedPronunciation: '아키텍처', difficulty: 4, category: '영어' }
];

const SAMPLE_SENTENCES = [
  '저는 프론트엔드 개발자로 일하고 있습니다.',
  'React와 TypeScript를 사용한 경험이 있습니다.',
  '사용자 경험을 개선하는 것에 관심이 많습니다.',
  '팀워크를 중시하며 원활한 커뮤니케이션을 지향합니다.',
  '새로운 기술을 배우는 것을 좋아하고 도전을 즐깁니다.'
];

// ====== 메인 컴포넌트 ======

const AudioTest: React.FC = () => {
  
  // ====== CSS 스타일 추가 ======
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ====== 상태 관리 ======

  const [state, setState] = useState<AudioTestState>({
    currentTest: null,
    microphoneLevel: 0,
    isRecording: false,
    testResults: [],
    recordedAudio: null,
    isPlaying: false
  });

  const [currentPronunciationTest, setCurrentPronunciationTest] = useState<PronunciationTest | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // 녹음 관련 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  // ====== 임시 로깅 함수들 ======
  
  const componentLog = useCallback((message: string, data?: any) => {
    console.log(`[AudioTest] ${message}`, data);
  }, []);

  const measureRender = useCallback((_id: number, name: string) => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[AudioTest] ${name} 렌더링 시간: ${end - start}ms`);
    };
  }, []);

  const logInfo = (category: string, message: string, data?: any) => {
    console.log(`[${category}] ${message}`, data);
  };

  const LogCategory = {
    USER_ACTION: 'USER_ACTION'
  };

  // ====== 음성 인식 Hook ======

  const speechRecognition = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: 'ko-KR',
    minConfidence: 0.1,
    debugMode: process.env.NODE_ENV === 'development',
    onResult: (transcript, isFinal, confidence) => {
      if (isFinal && state.currentTest === 'pronunciation') {
        analyzePronunciation(transcript, confidence);
      } else if (isFinal && state.currentTest === 'quality') {
        analyzeQuality(transcript, confidence);
      }
    },
    onError: (error) => {
      componentLog('음성 인식 오류', { error: error.message });
    }
  });

  // ====== 마이크 레벨 모니터링 ======

  const startMicrophoneMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setAudioStream(stream);
      
      const context = new AudioContext();
      setAudioContext(context);
      
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = (average / 255) * 100;
        
        setState(prev => ({ ...prev, microphoneLevel: level }));
        
        if (state.currentTest === 'microphone') {
          requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
      
      componentLog('마이크 모니터링 시작');
    } catch (error: any) {
      componentLog('마이크 접근 실패', { error: error.message });
    }
  }, [state.currentTest, componentLog]);

  const stopMicrophoneMonitoring = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    
    setState(prev => ({ ...prev, microphoneLevel: 0 }));
    componentLog('마이크 모니터링 중지');
  }, [audioStream, audioContext, componentLog]);

  // ====== 테스트 함수들 ======

  const startMicrophoneTest = useCallback(async () => {
    const endRenderMeasure = measureRender(1, 'startMicrophoneTest');
    
    setState(prev => ({ ...prev, currentTest: 'microphone' }));
    await startMicrophoneMonitoring();
    
    // 10초 후 자동 종료
    setTimeout(() => {
      const level = state.microphoneLevel;
      const score = level > 50 ? 100 : level > 30 ? 80 : level > 10 ? 60 : 40;
      const recommendation = level > 50 
        ? '마이크가 정상적으로 작동합니다.' 
        : level > 30 
        ? '마이크 볼륨을 조금 높여보세요.'
        : '마이크가 너무 조용합니다. 설정을 확인해주세요.';
      
      addTestResult('microphone', score, { maxLevel: level }, recommendation);
      stopMicrophoneTest();
    }, 10000);
    
    endRenderMeasure();
    componentLog('마이크 테스트 시작');
  }, [state.microphoneLevel, startMicrophoneMonitoring, measureRender, componentLog, addTestResult, stopMicrophoneTest]);

  const stopMicrophoneTest = useCallback(() => {
    setState(prev => ({ ...prev, currentTest: null }));
    stopMicrophoneMonitoring();
    componentLog('마이크 테스트 종료');
  }, [stopMicrophoneMonitoring, componentLog]);

  const startPronunciationTest = useCallback((category?: string, skipAnnouncement?: boolean) => {
    const endRenderMeasure = measureRender(1, 'startPronunciationTest');
    
    const filteredTests = category 
      ? PRONUNCIATION_TESTS.filter(test => test.category === category)
      : PRONUNCIATION_TESTS;
    
    const randomTest = filteredTests[Math.floor(Math.random() * filteredTests.length)];
    setCurrentPronunciationTest(randomTest);
    setState(prev => ({ ...prev, currentTest: 'pronunciation' }));
    
    // TTS로 단어 읽어주기 (생략 가능)
    if (!skipAnnouncement && webSpeechAPI.isTTSSupported()) {
      webSpeechAPI.speak(`다음 단어를 따라 읽어보세요. ${randomTest.word}`, 'ko-KR');
    }
    
    endRenderMeasure();
    componentLog('발음 테스트 시작', { word: randomTest.word, category: randomTest.category });
  }, [measureRender, componentLog]);

  const startQualityTest = useCallback((skipAnnouncement?: boolean) => {
    const endRenderMeasure = measureRender(1, 'startQualityTest');
    
    const randomSentence = SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)];
    setCurrentSentence(randomSentence);
    setState(prev => ({ ...prev, currentTest: 'quality' }));
    
    // TTS로 문장 읽어주기 (생략 가능)
    if (!skipAnnouncement && webSpeechAPI.isTTSSupported()) {
      webSpeechAPI.speak(`다음 문장을 자연스럽게 읽어보세요. ${randomSentence}`, 'ko-KR');
    }
    
    endRenderMeasure();
    componentLog('음성 품질 테스트 시작', { sentence: randomSentence });
  }, [measureRender, componentLog]);

  // ====== 녹음/재생 기능 ======

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      setAudioStream(stream);
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        console.log('[AudioTest] 녹음 중지 - Blob 생성:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });
        
        setState(prev => {
          const newState = { 
            ...prev, 
            recordedAudio: audioBlob,
            isRecording: false 
          };
          console.log('[AudioTest] 상태 업데이트:', newState);
          return newState;
        });
        
        componentLog('녹음 완료', { 
          size: audioBlob.size, 
          type: audioBlob.type 
        });
      };

      mediaRecorder.start(100); // 100ms마다 데이터 수집
      
      setState(prev => {
        const newState = { 
          ...prev, 
          currentTest: 'recording',
          isRecording: true 
        };
        console.log('[AudioTest] 녹음 시작 - 상태 업데이트:', newState);
        return newState;
      });
      
      componentLog('녹음 시작');
    } catch (error: any) {
      componentLog('녹음 시작 실패', { error: error.message });
      alert('마이크 접근에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  }, [componentLog]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      componentLog('녹음 중지');
    }
  }, [audioStream, state.isRecording, componentLog]);

  const playRecording = useCallback(() => {
    if (!state.recordedAudio) {
      alert('재생할 녹음이 없습니다.');
      return;
    }

    try {
      // 이전 재생 중지
      if (playingAudioRef.current) {
        playingAudioRef.current.pause();
        playingAudioRef.current = null;
      }

      const audio = new Audio();
      const audioUrl = URL.createObjectURL(state.recordedAudio);
      
      playingAudioRef.current = audio;
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(audioUrl);
        playingAudioRef.current = null;
        componentLog('재생 완료');
      };

      audio.onerror = (e) => {
        console.error('[AudioTest] 오디오 재생 실패:', e);
        setState(prev => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(audioUrl);
        playingAudioRef.current = null;
        alert('오디오 재생에 실패했습니다.');
      };

      audio.oncanplaythrough = () => {
        // 🔧 FIX: Check paused state before calling play() to prevent duplicate sounds
        if (audio.paused) {
          console.log('[DEBUG] 🔊 AudioTest: 재생 시작 (paused=true)');
          audio.play().catch((e) => {
            console.error('[AudioTest] 오디오 play() 실패:', e);
            setState(prev => ({ ...prev, isPlaying: false }));
            URL.revokeObjectURL(audioUrl);
            playingAudioRef.current = null;
            alert('오디오 재생에 실패했습니다. 브라우저에서 자동 재생이 차단되었을 수 있습니다.');
          });
        } else {
          console.log('[DEBUG] 🚫 AudioTest: 이미 재생 중 - 스킵');
        }
      };

      setState(prev => ({ ...prev, isPlaying: true }));
      audio.src = audioUrl;
      audio.load();
      
      componentLog('재생 시작', { 
        size: state.recordedAudio.size, 
        type: state.recordedAudio.type 
      });
    } catch (error) {
      console.error('[AudioTest] 재생 준비 실패:', error);
      alert('오디오 재생 준비에 실패했습니다.');
    }
  }, [state.recordedAudio, componentLog]);

  const stopPlaying = useCallback(() => {
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
      setState(prev => ({ ...prev, isPlaying: false }));
      componentLog('재생 중지');
    }
  }, [componentLog]);

  const clearRecording = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      recordedAudio: null,
      currentTest: null 
    }));
    componentLog('녹음 삭제');
  }, [componentLog]);

  // ====== 분석 함수들 ======

  const analyzePronunciation = useCallback((transcript: string, confidence: number) => {
    if (!currentPronunciationTest) return;
    
    const similarity = calculateSimilarity(transcript.trim(), currentPronunciationTest.word);
    const score = Math.round((similarity * 0.7 + confidence * 0.3) * 100);
    
    let recommendation = '';
    if (score >= 90) {
      recommendation = '완벽한 발음입니다!';
    } else if (score >= 70) {
      recommendation = '좋은 발음입니다. 조금 더 또렷하게 해보세요.';
    } else if (score >= 50) {
      recommendation = '발음을 다시 연습해보세요.';
    } else {
      recommendation = '천천히 다시 발음해보세요.';
    }
    
    addTestResult('pronunciation', score, {
      word: currentPronunciationTest.word,
      transcript,
      similarity,
      confidence,
      difficulty: currentPronunciationTest.difficulty
    }, recommendation);
    
    setState(prev => ({ ...prev, currentTest: null }));
    setCurrentPronunciationTest(null);
    
    componentLog('발음 분석 완료', { score, transcript, word: currentPronunciationTest.word });
  }, [currentPronunciationTest, componentLog, addTestResult, calculateSimilarity]);

  const analyzeQuality = useCallback((transcript: string, confidence: number) => {
    if (!currentSentence) return;
    
    const wordCount = transcript.trim().split(' ').length;
    const completeness = Math.min(wordCount / currentSentence.split(' ').length, 1);
    const score = Math.round((confidence * 0.4 + completeness * 0.6) * 100);
    
    let recommendation = '';
    if (score >= 90) {
      recommendation = '완벽한 음성 품질입니다!';
    } else if (score >= 70) {
      recommendation = '좋은 음성 품질입니다.';
    } else if (score >= 50) {
      recommendation = '조금 더 또렷하게 말해보세요.';
    } else {
      recommendation = '마이크와 거리를 조절하고 천천히 말해보세요.';
    }
    
    addTestResult('quality', score, {
      sentence: currentSentence,
      transcript,
      wordCount,
      completeness,
      confidence
    }, recommendation);
    
    setState(prev => ({ ...prev, currentTest: null }));
    setCurrentSentence('');
    
    componentLog('음성 품질 분석 완료', { score, transcript });
  }, [currentSentence, componentLog, addTestResult]);

  // ====== 유틸리티 함수들 ======

  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }, []);

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const addTestResult = useCallback((type: AudioTestResult['type'], score: number, details: any, recommendation: string) => {
    const result: AudioTestResult = {
      id: `${type}_${Date.now()}`,
      type,
      timestamp: Date.now(),
      score,
      details,
      recommendation
    };
    
    setState(prev => ({
      ...prev,
      testResults: [...prev.testResults, result]
    }));
    
    logInfo(LogCategory.USER_ACTION, `오디오 테스트 완료: ${type}`, {
      score,
      recommendation
    });
  }, [LogCategory.USER_ACTION]);

  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, testResults: [] }));
    componentLog('테스트 결과 초기화');
  }, [componentLog]);

  // ====== 렌더링 함수들 ======

  const renderMicrophoneTest = () => (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3 style={{ color: '#333', marginBottom: '20px' }}>🎤 마이크 테스트</h3>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        마이크에 대고 말해보세요. 소리 레벨을 측정합니다.
      </p>
      
      {/* 마이크 레벨 표시 */}
      <div style={{
        width: '300px',
        height: '20px',
        background: '#f0f0f0',
        borderRadius: '10px',
        margin: '20px auto',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${state.microphoneLevel}%`,
          height: '100%',
          background: state.microphoneLevel > 70 
            ? 'linear-gradient(90deg, #4CAF50, #45a049)' 
            : state.microphoneLevel > 40 
            ? 'linear-gradient(90deg, #FF9800, #F57C00)'
            : 'linear-gradient(90deg, #f44336, #d32f2f)',
          transition: 'width 0.1s ease'
        }} />
      </div>
      
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
        {Math.round(state.microphoneLevel)}%
      </div>
      
      <button
        onClick={stopMicrophoneTest}
        style={{
          padding: '12px 24px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        테스트 중지
      </button>
    </div>
  );

  const renderPronunciationTest = () => (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3 style={{ color: '#333', marginBottom: '20px' }}>🗣️ 발음 테스트</h3>
      {currentPronunciationTest && (
        <>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#2196F3',
            margin: '20px 0',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #e9ecef'
          }}>
            {currentPronunciationTest.word}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              background: currentPronunciationTest.category === '기본' ? '#4CAF50' :
                         currentPronunciationTest.category === '비즈니스' ? '#2196F3' :
                         currentPronunciationTest.category === '기술' ? '#FF9800' : '#9C27B0',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '14px',
              marginRight: '10px'
            }}>
              {currentPronunciationTest.category}
            </span>
            
            <span style={{ color: '#666' }}>
              난이도: {'★'.repeat(currentPronunciationTest.difficulty)}{'☆'.repeat(5 - currentPronunciationTest.difficulty)}
            </span>
          </div>
          
          <p style={{ color: '#666', marginBottom: '20px' }}>
            위 단어를 정확하게 발음해보세요.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                // TTS 중단 후 음성인식 시작
                webSpeechAPI.stopSpeaking();
                speechRecognition.startListening();
              }}
              disabled={speechRecognition.isListening}
              style={{
                padding: '12px 24px',
                background: speechRecognition.isListening ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: speechRecognition.isListening ? 'not-allowed' : 'pointer'
              }}
            >
              {speechRecognition.isListening ? '인식 중...' : '🎤 발음하기'}
            </button>
            
            <button
              onClick={() => webSpeechAPI.stopSpeaking()}
              style={{
                padding: '12px 24px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🔇 안내 중지
            </button>
            
            <button
              onClick={() => setState(prev => ({ ...prev, currentTest: null }))}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderQualityTest = () => (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3 style={{ color: '#333', marginBottom: '20px' }}>🎯 음성 품질 테스트</h3>
      {currentSentence && (
        <>
          <div style={{
            fontSize: '18px',
            color: '#333',
            margin: '20px 0',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #e9ecef',
            lineHeight: '1.6'
          }}>
            "{currentSentence}"
          </div>
          
          <p style={{ color: '#666', marginBottom: '20px' }}>
            위 문장을 자연스럽고 또렷하게 읽어보세요.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                // TTS 중단 후 음성인식 시작
                webSpeechAPI.stopSpeaking();
                speechRecognition.startListening();
              }}
              disabled={speechRecognition.isListening}
              style={{
                padding: '12px 24px',
                background: speechRecognition.isListening ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: speechRecognition.isListening ? 'not-allowed' : 'pointer'
              }}
            >
              {speechRecognition.isListening ? '인식 중...' : '🎤 읽기 시작'}
            </button>
            
            <button
              onClick={() => webSpeechAPI.stopSpeaking()}
              style={{
                padding: '12px 24px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🔇 안내 중지
            </button>
            
            <button
              onClick={() => setState(prev => ({ ...prev, currentTest: null }))}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderRecordingTest = () => {
    console.log('[AudioTest] renderRecordingTest 호출됨 - 현재 상태:', {
      isRecording: state.isRecording,
      hasRecordedAudio: !!state.recordedAudio,
      recordedAudioSize: state.recordedAudio?.size || 0,
      isPlaying: state.isPlaying
    });
    
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3 style={{ color: '#333', marginBottom: '20px' }}>🎙️ 녹음 테스트</h3>
      
      {!state.recordedAudio ? (
        <>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            {state.isRecording 
              ? '녹음 중입니다. 말씀해 보세요!' 
              : '녹음 버튼을 눌러 음성을 녹음해보세요.'}
          </p>
          
          {state.isRecording && (
            <div style={{
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, #ff4757, #ff3742)',
              borderRadius: '50%',
              margin: '20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
              fontSize: '24px'
            }}>
              🎤
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            {!state.isRecording ? (
              <button
                onClick={startRecording}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🎤 녹음 시작
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ⏹️ 녹음 중지
              </button>
            )}
            
            <button
              onClick={() => setState(prev => ({ ...prev, currentTest: null }))}
              style={{
                padding: '12px 24px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            background: '#e8f5e8',
            padding: '20px',
            borderRadius: '12px',
            margin: '20px 0',
            border: '2px solid #4CAF50'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <h4 style={{ color: '#2d5016', margin: '10px 0' }}>녹음 완료!</h4>
            <p style={{ color: '#666', fontSize: '14px' }}>
              크기: {(state.recordedAudio.size / 1024).toFixed(1)} KB | 
              형식: {state.recordedAudio.type}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={state.isPlaying ? stopPlaying : playRecording}
              style={{
                padding: '12px 24px',
                background: state.isPlaying ? '#ff4757' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {state.isPlaying ? '⏹️ 재생 중지' : '▶️ 내 목소리 듣기'}
            </button>
            
            <button
              onClick={startRecording}
              style={{
                padding: '12px 24px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔄 다시 녹음
            </button>
            
            <button
              onClick={clearRecording}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🗑️ 삭제
            </button>
            
            <button
              onClick={() => setState(prev => ({ ...prev, currentTest: null }))}
              style={{
                padding: '12px 24px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              완료
            </button>
          </div>
        </>
      )}
    </div>
    );
  };

  const renderResults = () => (
    <div style={{ marginTop: '30px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h3 style={{ color: '#333' }}>📊 테스트 결과</h3>
        {state.testResults.length > 0 && (
          <button
            onClick={clearResults}
            style={{
              padding: '8px 16px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            결과 지우기
          </button>
        )}
      </div>
      
      {state.testResults.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
          아직 테스트 결과가 없습니다.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {state.testResults.map((result) => (
            <div
              key={result.id}
              style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  {result.type === 'microphone' ? '🎤 마이크' :
                   result.type === 'pronunciation' ? '🗣️ 발음' : '🎯 음성품질'} 테스트
                </span>
                <span style={{
                  background: result.score >= 80 ? '#4CAF50' : result.score >= 60 ? '#FF9800' : '#f44336',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {result.score}점
                </span>
              </div>
              
              <p style={{ color: '#666', margin: '10px 0' }}>
                {result.recommendation}
              </p>
              
              <div style={{ fontSize: '12px', color: '#999' }}>
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ====== 메인 렌더링 ======

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          maxWidth: '800px',
          width: '100%',
          color: '#333'
        }}>
          <h2 style={{
            textAlign: 'center',
            color: '#333',
            marginBottom: '30px',
            fontSize: '1.8rem'
          }}>
            🎙️ 음성 테스트 센터
          </h2>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <p style={{
              color: '#666',
              marginBottom: '15px',
              fontSize: '0.9rem'
            }}>
              면접 전에 마이크와 음성을 테스트해보세요.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, currentTest: 'recording' }))}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#c0392b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e74c3c';
                }}
              >
                🎙️ 바로 녹음하기
              </button>
              
              <button
                onClick={startMicrophoneTest}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#45a049';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#4CAF50';
                }}
              >
                🎤 바로 마이크 테스트
              </button>
              
              <button
                onClick={() => startPronunciationTest(undefined, true)}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1976D2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2196F3';
                }}
              >
                🗣️ 바로 발음 테스트
              </button>
            </div>
          </div>

          {/* 현재 테스트 화면 */}
          {state.currentTest === 'microphone' && renderMicrophoneTest()}
          {state.currentTest === 'pronunciation' && renderPronunciationTest()}
          {state.currentTest === 'quality' && renderQualityTest()}
          {state.currentTest === 'recording' && renderRecordingTest()}

          {/* 테스트 선택 메뉴 */}
          {!state.currentTest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, currentTest: 'recording' }))}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎙️</div>
                <div>녹음 테스트</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
                  내 목소리 녹음 및 재생
                </div>
              </button>

              <button
                onClick={startMicrophoneTest}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎤</div>
                <div>마이크 테스트</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
                  마이크 작동 및 음량 확인
                </div>
              </button>

              <button
                onClick={() => startPronunciationTest()}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🗣️</div>
                <div>발음 테스트</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
                  단어 발음 정확도 측정
                </div>
              </button>

              <button
                onClick={startQualityTest}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎯</div>
                <div>음성 품질 테스트</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
                  문장 읽기 품질 분석
                </div>
              </button>
            </div>
          )}

          {/* 발음 테스트 카테고리 선택 */}
          {!state.currentTest && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#333', marginBottom: '15px', textAlign: 'center' }}>
                또는 카테고리별 발음 테스트
              </h4>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['기본', '비즈니스', '기술', '영어'].map(category => (
                  <button
                    key={category}
                    onClick={() => startPronunciationTest(category)}
                    style={{
                      padding: '8px 16px',
                      background: '#f8f9fa',
                      color: '#333',
                      border: '2px solid #e9ecef',
                      borderRadius: '20px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e9ecef';
                      e.currentTarget.style.borderColor = '#dee2e6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e9ecef';
                    }}
                  >
                    {category} 발음
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 테스트 결과 */}
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default AudioTest;