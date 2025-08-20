import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Types
type FlowPhase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting';

interface Question {
  en: string;
  ko: string;
}

interface StageData {
  stage: number;
  phase: number;
  title: string;
  grammar_focus: string;
  patterns: string[];
  sentence_variations: {
    [key: string]: Question[];
  };
}

// Web Speech Recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface WebkitSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI?: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => WebkitSpeechRecognition;
    speechSynthesis: SpeechSynthesis;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

// ==== 전역 핸들 ====
let currentKoUtter: SpeechSynthesisUtterance | null = null;
let currentEnUtter: SpeechSynthesisUtterance | null = null;
let activeRecognition: any = null;
let beepCtx: AudioContext | null = null;

// ==== TTS 준비 ====
let voices: SpeechSynthesisVoice[] = [];
let koVoice: SpeechSynthesisVoice | null = null;
let enVoice: SpeechSynthesisVoice | null = null;

// voices 목록 로드가 끝날 때까지 대기하는 Promise
const voicesReady = new Promise<void>((resolve) => {
  function loadVoices() {
    voices = speechSynthesis.getVoices() || [];
    if (voices.length) {
      koVoice = voices.find(v => v.lang && v.lang.startsWith('ko')) || null;
      enVoice = voices.find(v => v.lang && v.lang.startsWith('en')) || null;
      resolve();
    }
  }
  // 일부 브라우저는 즉시 로드됨
  loadVoices();
  // 나머지는 이벤트로 로드됨
  speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
});

async function ensureTTSReady() {
  try {
    // 간혹 대기 상태가 걸려있을 수 있으니 큐 비우고 resume
    speechSynthesis.cancel();
    speechSynthesis.resume();
  } catch (_) {}
  await voicesReady; // voices가 실제 로딩될 때까지 대기
}

function stopAllAudio() {
  try { speechSynthesis.cancel(); } catch {}
  if (activeRecognition) {
    try { 
      activeRecognition.onresult = null; 
      activeRecognition.onerror = null; 
      activeRecognition.onend = null; 
      activeRecognition.stop(); 
    } catch {}
    activeRecognition = null;
  }
  if (beepCtx && beepCtx.state !== 'closed') {
    try { beepCtx.close(); } catch {}
  }
  beepCtx = null;
}

export const PatternTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // URL parameters (reactive to route changes)
  const levelNumber = parseInt(searchParams.get('level') || '1');
  const stageNumber = parseInt(searchParams.get('stage') || '1');

  // Data state
  const [stageData, setStageData] = useState<StageData | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Training state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  
  // Phase control
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('idle');
  const [remainingCountdownTime, setRemainingCountdownTime] = useState(0);
  const [remainingRecognitionTime, setRemainingRecognitionTime] = useState(0);
  const [remainingWaitTime, setRemainingWaitTime] = useState(0);
  
  // Timer refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // B안: 단순화된 상태 (컴포넌트에서 처리)
  const [results, setResults] = useState<any[]>([]);
  
  // 응급처치: A안 상태들 임시 복원 (크래시 방지용)
  const [speechResult, setSpeechResult] = useState('잠시 후 자동으로 음성 인식이 시작됩니다');
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerEvaluation, setAnswerEvaluation] = useState('');
  const [evaluationType, setEvaluationType] = useState<'correct' | 'incorrect'>('correct');
  const [countdownText, setCountdownText] = useState('3초 후 음성 인식 시작...');
  const [micStatus, setMicStatus] = useState('🎤 준비 중...');
  const [isListening, setIsListening] = useState(false);
  const [showSpeechArea, setShowSpeechArea] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // Load level data from JSON based on level and stage
  const loadLevelData = useCallback(async () => {
    try {
      // 레벨에 따른 JSON 파일 경로 설정
      const levelPaths: { [key: number]: string } = {
        1: '/patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json',
        2: '/patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json', 
        3: '/patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json',
        4: '/patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json',
        5: '/patterns/level_5_advanced_business/lv5_stage_system_REVISED.json',
        6: '/patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json'
      };
      
      const filePath = levelPaths[levelNumber];
      if (!filePath) {
        console.warn(`Level ${levelNumber} not supported, using dummy data`);
        loadDummyData();
        return;
      }
      
      const response = await fetch(filePath);
      const data = await response.json();
      
      // 스테이지 번호로 찾기 (1부터 시작) - Level 1은 phase_N 구조 사용
      let foundStage;
      if (levelNumber === 1) {
        // Level 1은 더미 데이터 사용 (복잡한 구조)
        console.warn(`Level 1 uses complex structure, using dummy data`);
        loadDummyData();
        return;
      } else {
        // Level 2+ 는 stages 구조
        foundStage = data.stages[stageNumber - 1];
      }
      if (!foundStage) {
        console.warn(`Level ${levelNumber} Stage ${stageNumber} not found in data, using dummy data`);
        loadDummyData();
        return;
      }
      
      setStageData(foundStage);
      
      // Combine all sentence variations into one array
      const allQuestions: Question[] = [];
      
      if (foundStage.sentence_variations) {
        Object.values(foundStage.sentence_variations).forEach((variations: any) => {
          if (Array.isArray(variations)) {
            allQuestions.push(...variations);
          }
        });
      } else if (foundStage.patterns) {
        // Level 1 구조: patterns 배열을 questions로 변환
        foundStage.patterns.forEach((pattern: any, index: number) => {
          allQuestions.push({
            ko: pattern.korean || `문제 ${index + 1}`,
            en: pattern.english || pattern.pattern || `Pattern ${index + 1}`
          });
        });
      }
      
      setCurrentQuestions(allQuestions);
      console.log(`Level ${levelNumber} Stage ${stageNumber} 로드 완료: ${allQuestions.length}개 문제`);
    } catch (error) {
      console.error(`Level ${levelNumber} 데이터 로드 실패:`, error);
      loadDummyData();
    }
  }, [levelNumber, stageNumber]);

  // Load dummy data for testing
  const loadDummyData = useCallback(() => {
    const dummyData: StageData = {
      stage: stageNumber,
      stage_id: `Lv${levelNumber}-P1-S${stageNumber.toString().padStart(2, '0')}`,
      phase: 1,
      title: `Level ${levelNumber} Stage ${stageNumber} 학습`,
      pattern: "기본 패턴 연습",
      grammar_focus: "기본 문장 구조 연습",
      patterns: [
        "Be동사 패턴",
        "일반동사 패턴", 
        "부정문 패턴"
      ],
      sentence_variations: {
        basic_patterns: [
          {"en": "I am a student", "ko": "나는 학생이야"},
          {"en": "You are my friend", "ko": "너는 내 친구야"},
          {"en": "He is tall", "ko": "그는 키가 커"},
          {"en": "She is kind", "ko": "그녀는 친절해"},
          {"en": "We are happy", "ko": "우리는 행복해"},
          {"en": "I go to school", "ko": "나는 학교에 가"},
          {"en": "You like music", "ko": "너는 음악을 좋아해"},
          {"en": "He plays soccer", "ko": "그는 축구를 해"},
          {"en": "She reads books", "ko": "그녀는 책을 읽어"},
          {"en": "We study English", "ko": "우리는 영어를 공부해"}
        ]
      }
    };
    
    setStageData(dummyData);
    
    // Combine all variations
    const allQuestions: Question[] = [];
    Object.values(dummyData.sentence_variations).forEach(variations => {
      allQuestions.push(...variations);
    });
    
    setCurrentQuestions(allQuestions);
    console.log(`더미 데이터 로드 완료: ${allQuestions.length}개 문제`);
  }, [levelNumber, stageNumber]);

  // Shuffle questions based on stage
  const shuffleQuestions = useCallback((questions: Question[]) => {
    if (currentStage === 1) {
      // Stage 1: Keep order
      return [...questions];
    } else if (currentStage === 2) {
      // Stage 2: Light shuffle
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i -= 2) {
        const j = Math.max(0, i - 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    } else {
      // Stage 3: Full shuffle
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  }, [currentStage]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (recognitionCountdownRef.current) {
      clearInterval(recognitionCountdownRef.current);
      recognitionCountdownRef.current = null;
    }
    if (waitTimeoutRef.current) {
      clearInterval(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
  }, []);

  // Play microphone start sound using Web Audio API
  const playMicrophoneStartSound = useCallback(() => {
    try {
      // beepCtx 재사용 또는 생성
      if (!beepCtx || beepCtx.state === 'closed') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        beepCtx = new AudioContext();
      }
      
      const oscillator = beepCtx.createOscillator();
      const gainNode = beepCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(beepCtx.destination);
      
      oscillator.frequency.setValueAtTime(800, beepCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, beepCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, beepCtx.currentTime + 0.2);
      
      oscillator.start(beepCtx.currentTime);
      oscillator.stop(beepCtx.currentTime + 0.2);
    } catch (e) {
      console.warn('Beep sound failed:', e);
    }
  }, []);

  // Calculate string similarity using Levenshtein distance
  const calculateSimilarity = useCallback((str1: string, str2: string) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }, []);

  // Levenshtein distance algorithm
  const levenshteinDistance = useCallback((str1: string, str2: string) => {
    const matrix: number[][] = [];
    
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
  }, []);

  // Evaluate answer
  const evaluateAnswer = useCallback((userAnswer: string, correctAnswer: string) => {
    setShowAnswer(true);
    
    // Play English TTS (참조 저장)
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      currentEnUtter = new SpeechSynthesisUtterance(correctAnswer);
      currentEnUtter.lang = 'en-US';
      currentEnUtter.voice = enVoice || null; // 선택된 enVoice가 있으면 사용
      currentEnUtter.rate = 0.95;
      currentEnUtter.volume = 1.0;
      
      currentEnUtter.onstart = () => console.log('🔊 영어 TTS 재생 시작:', correctAnswer);
      currentEnUtter.onend = () => console.log('🔊 영어 TTS 재생 완료');
      currentEnUtter.onerror = (e) => console.error('❌ 영어 TTS 재생 오류:', e);
      
      console.log('🔊 영어 TTS 재생 시도:', correctAnswer);
      speechSynthesis.speak(currentEnUtter);
    }
    
    // Calculate similarity
    const similarity = calculateSimilarity(userAnswer.toLowerCase(), correctAnswer.toLowerCase());
    
    if (similarity > 0.8) {
      setEvaluationType('correct');
      setAnswerEvaluation('🎉 훌륭합니다! 정확한 발음이에요.');
    } else if (similarity > 0.6) {
      setEvaluationType('correct');
      setAnswerEvaluation('✅ 좋아요! 조금 더 연습하면 완벽해요.');
    } else {
      setEvaluationType('incorrect');
      setAnswerEvaluation(`❌ 다시 한번! 정답: "${correctAnswer}"`);
    }
    
    // Wait 4 seconds before next question
    setCurrentPhase('waiting');
    setRemainingWaitTime(4);
    setCountdownText('4초 후 다음 문제');
    
    waitTimeoutRef.current = setInterval(() => {
      setRemainingWaitTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 후 다음 문제`);
        
        if (newTime <= 0) {
          if (waitTimeoutRef.current) {
            clearInterval(waitTimeoutRef.current);
            waitTimeoutRef.current = null;
          }
          setCurrentPhase('idle');
          nextQuestion();
        }
        
        return newTime;
      });
    }, 1000);
  }, [calculateSimilarity]);

  // Start web speech recognition
  const startWebSpeechRecognition = useCallback((correctAnswer: string) => {
    const startTime = Date.now();
    console.log(`🎤 [${new Date().toLocaleTimeString()}] 음성인식 시작 - 6초 제한시간`);
    
    // 기존 recognition이 있다면 정리
    if (activeRecognition) {
      try {
        activeRecognition.onresult = null;
        activeRecognition.onerror = null;
        activeRecognition.onend = null;
        activeRecognition.stop();
      } catch {}
    }

    activeRecognition = new window.webkitSpeechRecognition();
    activeRecognition.lang = 'en-US';
    activeRecognition.continuous = false;
    activeRecognition.interimResults = true;
    activeRecognition.maxAlternatives = 5;
    
    setMicStatus('🎤 듣고 있습니다...');
    setIsListening(true);
    setSpeechResult('음성을 인식하고 있습니다...');
    
    // Start recognition timer
    setRemainingRecognitionTime(6);
    setCountdownText('6초 남음');
    
    recognitionCountdownRef.current = setInterval(() => {
      setRemainingRecognitionTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 남음`);
        
        if (newTime <= 0) {
          if (recognitionCountdownRef.current) {
            clearInterval(recognitionCountdownRef.current);
            recognitionCountdownRef.current = null;
          }
          setCountdownText('시간 종료!');
        }
        
        return newTime;
      });
    }, 1000);
    
    let isCompleted = false;
    
    activeRecognition.onresult = (event) => {
      if (isCompleted) return;
      isCompleted = true;
      
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      const userSpeech = event.results[0][0].transcript;
      
      console.log(`✅ [${new Date().toLocaleTimeString()}] 음성인식 완료 - 응답시간: ${responseTime.toFixed(1)}초`);
      console.log(`📝 [${new Date().toLocaleTimeString()}] 인식된 음성: "${userSpeech}"`);
      
      if (recognitionCountdownRef.current) {
        clearInterval(recognitionCountdownRef.current);
        recognitionCountdownRef.current = null;
      }
      
      setCurrentPhase('idle');
      setSpeechResult(`인식된 음성: "${userSpeech}"`);
      setCountdownText(`응답시간: ${responseTime.toFixed(1)}초`);
      
      evaluateAnswer(userSpeech, correctAnswer);
    };
    
    activeRecognition.onerror = (event) => {
      if (isCompleted) return;
      isCompleted = true;
      
      console.log(`❌ [${new Date().toLocaleTimeString()}] 음성인식 오류: ${event.error}`);
      if (recognitionCountdownRef.current) {
        clearInterval(recognitionCountdownRef.current);
        recognitionCountdownRef.current = null;
      }
      
      setCurrentPhase('idle');
      setSpeechResult('음성 인식 오류가 발생했습니다.');
      
      setTimeout(() => {
        nextQuestion();
      }, 2000);
    };
    
    activeRecognition.onend = () => {
      setIsListening(false);
      console.log(`🔇 [${new Date().toLocaleTimeString()}] 음성인식 종료`);
      if (activeRecognition) activeRecognition = null;
    };
    
    activeRecognition.start();
    
    // Auto stop after 6 seconds
    setTimeout(() => {
      if (isCompleted) return;
      isCompleted = true;
      
      console.log(`⏰ [${new Date().toLocaleTimeString()}] 음성인식 시간초과 (6초)`);
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch {}
        activeRecognition = null;
      }
      
      if (recognitionCountdownRef.current) {
        clearInterval(recognitionCountdownRef.current);
        recognitionCountdownRef.current = null;
      }
      
      setCurrentPhase('idle');
      
      // B안: speechResult 참조 제거 - 컴포넌트에서 처리
    }, 6000);
  }, [evaluateAnswer]);

  // Start speech recognition
  const startSpeechRecognition = useCallback((correctAnswer: string) => {
    setShowSpeechArea(true);
    setAnswerEvaluation('');
    
    // Stage-based countdown (1:3sec, 2:2sec, 3:1sec)
    const waitTime = currentStage === 1 ? 3 : currentStage === 2 ? 2 : 1;
    console.log(`⏳ [${new Date().toLocaleTimeString()}] 사고시간 카운트다운 시작 - ${waitTime}초 대기`);
    
    setCurrentPhase('countdown');
    setRemainingCountdownTime(waitTime);
    
    countdownIntervalRef.current = setInterval(() => {
      setRemainingCountdownTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 후 음성 인식 시작...`);
        
        if (newTime <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCurrentPhase('recognition');
          setCountdownText('지금 영어로 말해주세요!');
          console.log(`🔔 [${new Date().toLocaleTimeString()}] 사고시간 종료 - 마이크 시작음 재생`);
          
          // Play microphone start sound
          playMicrophoneStartSound();
          
          // Start actual speech recognition
          setTimeout(() => {
            if ('webkitSpeechRecognition' in window) {
              startWebSpeechRecognition(correctAnswer);
            } else {
              // Simulate speech recognition for unsupported browsers
              setTimeout(() => {
                setSpeechResult(`시뮬레이션 결과: "${correctAnswer}"`);
                evaluateAnswer(correctAnswer, correctAnswer);
              }, 3000);
            }
          }, 200);
        }
        
        return newTime;
      });
    }, 1000);
  }, [currentStage, playMicrophoneStartSound, startWebSpeechRecognition, evaluateAnswer]);

  // Show next question
  const showNextQuestion = useCallback(() => {
    console.log(`🎯 showNextQuestion 호출 - running: ${isRunning}, paused: ${isPaused}, index: ${currentIndex}, total: ${currentQuestions.length}`);
    
    if (!isRunning || isPaused) {
      console.log('❌ 학습이 중단된 상태');
      return;
    }
    
    if (currentIndex >= currentQuestions.length) {
      console.log('✅ 모든 문제 완료');
      setIsRunning(false);
      alert('🎉 모든 문제를 완료했습니다!');
      return;
    }
    
    const question = currentQuestions[currentIndex];
    if (!question) {
      console.log('❌ 문제 데이터가 없음');
      return;
    }
    
    console.log(`📝 문제 ${currentIndex + 1}: "${question.ko}" → "${question.en}"`);
    
    // Reset UI state for new question
    setShowAnswer(false);
    setAnswerEvaluation('');
    setShowSpeechArea(false);
    setSpeechResult('음성 인식 준비 중...');
    setMicStatus('🎤 준비 중...');
    setIsListening(false);
    
    // 한국어 TTS 재생
    console.log('[TTS Gate Check] koVoice:', koVoice, 'speechSynthesis available:', 'speechSynthesis' in window);
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      currentKoUtter = new SpeechSynthesisUtterance(question.ko);
      currentKoUtter.lang = 'ko-KR';
      currentKoUtter.voice = koVoice || null;
      currentKoUtter.rate = 0.9;
      currentKoUtter.volume = 1.0;
      
      currentKoUtter.onstart = () => console.log('🔊 TTS 재생 시작:', question.ko);
      currentKoUtter.onend = () => console.log('🔊 TTS 재생 완료');
      currentKoUtter.onerror = (e) => console.error('❌ TTS 재생 오류:', e);
      
      console.log('🔊 한국어 TTS 재생 시도:', question.ko);
      speechSynthesis.speak(currentKoUtter);
    } else {
      console.error('❌ speechSynthesis 지원하지 않음');
    }
    
    // Start countdown using the existing mechanism
    const waitTime = currentStage === 1 ? 3 : currentStage === 2 ? 2 : 1;
    console.log(`⏳ 사고시간 카운트다운 시작 - ${waitTime}초 대기`);
    
    startSpeechRecognition(question.en);
  }, [currentIndex, currentQuestions, isRunning, isPaused, currentStage, startSpeechRecognition]);

  // Next question
  const nextQuestion = useCallback(() => {
    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      
      if (newIndex >= currentQuestions.length) {
        // Training complete
        setIsRunning(false);
        alert(`🎉 Stage ${stageNumber} 훈련 완료!\n\n모든 고급 문법 패턴을 연습했습니다.\n계속해서 다른 스테이지도 도전해보세요!`);
        return prev;
      }
      
      // B안: showNextQuestion 호출 제거 (컴포넌트가 처리)
      
      return newIndex;
    });
  }, [currentQuestions.length, stageNumber, showNextQuestion, isPaused]);

  // Resume functions for pause/resume
  const resumeCountdown = useCallback(() => {
    countdownIntervalRef.current = setInterval(() => {
      setRemainingCountdownTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 후 음성 인식 시작...`);
        
        if (newTime <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCurrentPhase('recognition');
          setCountdownText('지금 영어로 말해주세요!');
          playMicrophoneStartSound();
          
          setTimeout(() => {
            const currentQuestion = currentQuestions[currentIndex];
            if ('webkitSpeechRecognition' in window) {
              startWebSpeechRecognition(currentQuestion.en);
            }
          }, 200);
        }
        
        return newTime;
      });
    }, 1000);
  }, [currentIndex, currentQuestions, playMicrophoneStartSound, startWebSpeechRecognition]);

  const resumeRecognition = useCallback(() => {
    setShowSpeechArea(true);
    setMicStatus('🎤 듣고 있습니다...');
    setIsListening(true);
    setSpeechResult('음성을 인식하고 있습니다...');
    
    recognitionCountdownRef.current = setInterval(() => {
      setRemainingRecognitionTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 남음`);
        
        if (newTime <= 0) {
          if (recognitionCountdownRef.current) {
            clearInterval(recognitionCountdownRef.current);
            recognitionCountdownRef.current = null;
          }
          setCurrentPhase('idle');
          setCountdownText('시간 종료!');
          setSpeechResult('시간이 초과되었습니다.');
          setTimeout(() => {
            nextQuestion();
          }, 2000);
        }
        
        return newTime;
      });
    }, 1000);
    
    // Start new recognition
    const currentQuestion = currentQuestions[currentIndex];
    if ('webkitSpeechRecognition' in window) {
      startWebSpeechRecognition(currentQuestion.en);
    }
  }, [currentIndex, currentQuestions, startWebSpeechRecognition, nextQuestion]);

  const resumeWaiting = useCallback(() => {
    waitTimeoutRef.current = setInterval(() => {
      setRemainingWaitTime(prev => {
        const newTime = prev - 1;
        setCountdownText(`${newTime}초 후 다음 문제`);
        
        if (newTime <= 0) {
          if (waitTimeoutRef.current) {
            clearInterval(waitTimeoutRef.current);
            waitTimeoutRef.current = null;
          }
          setCurrentPhase('idle');
          nextQuestion();
        }
        
        return newTime;
      });
    }, 1000);
  }, [nextQuestion]);

  // Audio context initialization (user interaction required)
  const initializeAudio = useCallback(async () => {
    try {
      // Initialize speechSynthesis
      if ('speechSynthesis' in window) {
        // Load voices
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.getVoices(); // Trigger loading
        }
        console.log('🔊 TTS 초기화 완료');
      }
      
      // Initialize Web Audio API
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        console.log('🔊 Web Audio API 초기화 완료');
      }
    } catch (error) {
      console.error('오디오 초기화 실패:', error);
    }
  }, []);

  // Start training
  const startTraining = useCallback(async () => {
    if (isRunning && !isPaused) return;
    
    // TTS 준비 (사용자 제스처 직후 활성화)
    await ensureTTSReady();
    
    // 재시작/재개 전, 남아있을 수 있는 리소스 정리
    stopAllAudio();
    
    if (!isRunning) {
      // Initialize audio on first start
      await initializeAudio();
      const shuffledQuestions = shuffleQuestions(currentQuestions);
      setCurrentQuestions(shuffledQuestions);
      setCurrentIndex(0);
      setCurrentPhase('idle');
    }
    
    setIsRunning(true);
    setIsPaused(false);
    
    // Resume from paused state
    if (currentPhase === 'countdown' && remainingCountdownTime > 0) {
      console.log(`▶️ [${new Date().toLocaleTimeString()}] 카운트다운 재개 - ${remainingCountdownTime}초 남음`);
      resumeCountdown();
    } else if (currentPhase === 'recognition' && remainingRecognitionTime > 0) {
      console.log(`▶️ [${new Date().toLocaleTimeString()}] 음성인식 재개 - ${remainingRecognitionTime}초 남음`);
      resumeRecognition();
    } else if (currentPhase === 'waiting' && remainingWaitTime > 0) {
      console.log(`▶️ [${new Date().toLocaleTimeString()}] 대기시간 재개 - ${remainingWaitTime}초 남음`);
      resumeWaiting();
    }
    // ❌ 여기서 showNextQuestion() 직접 호출 금지 → useEffect가 발동
  }, [
    initializeAudio,
    isRunning, 
    isPaused, 
    currentQuestions, 
    shuffleQuestions, 
    currentPhase, 
    remainingCountdownTime, 
    remainingRecognitionTime, 
    remainingWaitTime,
    resumeCountdown,
    resumeRecognition,
    resumeWaiting,
    showNextQuestion
  ]);

  // Pause training
  const pauseTraining = useCallback(() => {
    if (!isRunning) return;
    
    console.log(`⏸️ [${new Date().toLocaleTimeString()}] 일시정지 - 현재 Phase: ${currentPhase}`);
    
    setIsPaused(true);
    clearAllTimers();
    
    // Update countdown text for paused state
    if (currentPhase === 'countdown') {
      setCountdownText(`일시정지됨 - 사고시간 ${remainingCountdownTime}초 남음`);
    } else if (currentPhase === 'recognition') {
      setCountdownText(`일시정지됨 - 음성인식 ${remainingRecognitionTime}초 남음`);
    } else if (currentPhase === 'waiting') {
      setCountdownText(`일시정지됨 - 다음 문제까지 ${remainingWaitTime}초 남음`);
    }
  }, [isRunning, currentPhase, remainingCountdownTime, remainingRecognitionTime, remainingWaitTime, clearAllTimers]);

  // Reset training
  const resetTraining = useCallback(() => {
    stopAllAudio();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(0);
    
    clearAllTimers();
    
    // Reset state
    setRemainingCountdownTime(0);
    setRemainingRecognitionTime(0);
    setRemainingWaitTime(0);
    setCurrentPhase('idle');
    
    setShowAnswer(false);
    setShowSpeechArea(false);
    setShowTimer(false);
    setSpeechResult('잠시 후 자동으로 음성 인식이 시작됩니다');
    setCountdownText('3초 후 음성 인식 시작...');
    setMicStatus('🎤 준비 중...');
    setIsListening(false);
    setAnswerEvaluation('');
  }, [clearAllTimers]);

  // Stage selection
  const handleStageSelect = useCallback((stage: number) => {
    setCurrentStage(stage);
    resetTraining();
  }, [resetTraining]);

  // Initialize on mount
  useEffect(() => {
    loadLevelData();
  }, [loadLevelData]);

  // 상태 세팅 완료 이후에 첫 문제를 자동 재생
  useEffect(() => {
    if (
      isRunning &&
      !isPaused &&
      currentQuestions.length > 0 &&
      currentIndex === 0 &&
      currentPhase === 'idle'
    ) {
      // 첫 문제: 한국어 TTS → 카운트다운 → 비프 → STT로 진입
      showNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused, currentQuestions.length, currentIndex, currentPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Calculate progress
  const progress = currentQuestions.length > 0 ? (currentIndex / currentQuestions.length) * 100 : 0;
  const completionRate = Math.round(progress);

  if (!stageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">데이터 로딩 중...</h2>
            <p className="text-gray-600">Level 3 Stage {stageNumber} 데이터를 불러오고 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentIndex < currentQuestions.length ? currentQuestions[currentIndex] : null;

  return (
    <div 
      className="min-h-screen py-5 px-4"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          ← 돌아가기
        </button>

        {/* Main Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 
              className="text-4xl font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              🎯 Level {levelNumber} Speaking
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              패턴 학습 - 한국어 듣고 영어로 말하기
            </p>
          </div>

          {/* Stage Info */}
          <div 
            className="p-5 rounded-2xl mb-8 border-l-4"
            style={{
              background: 'linear-gradient(135deg, #f3e5f5, #e8f5e8)',
              borderLeftColor: '#7c3aed'
            }}
          >
            <div 
              className="inline-block px-4 py-1 rounded-full text-white text-sm font-bold mb-3"
              style={{ background: '#7c3aed' }}
            >
              Phase {stageData.phase}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Stage {stageNumber}: {stageData.title}
            </h3>
            <div className="bg-yellow-100 p-3 rounded-lg border-l-4 border-yellow-500">
              <div className="text-yellow-800 font-medium">
                {stageData.patterns ? stageData.patterns.join(' / ') : '고급 문법 패턴'}
              </div>
            </div>
          </div>

          {/* Stage Selector */}
          <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3].map(stage => (
              <button
                key={stage}
                onClick={() => handleStageSelect(stage)}
                className={`p-4 border-3 rounded-xl font-bold text-base transition-all hover:-translate-y-1 hover:shadow-lg ${
                  currentStage === stage
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <div>{stage}단계</div>
                <div className="text-sm font-normal">
                  {stage === 1 ? '순서대로 (3초)' : stage === 2 ? '조금 섞기 (2초)' : '완전 섞기 (1초)'}
                </div>
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 mb-8">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #c026d3)',
                width: `${progress}%`
              }}
            />
          </div>

          {/* Question Area */}
          <div className="text-center mb-10 min-h-[300px] flex flex-col justify-center">
            {/* Korean Text */}
            <div className="text-3xl font-bold text-gray-800 mb-5 min-h-[60px] flex items-center justify-center">
              {currentQuestion ? currentQuestion.ko : '한국어를 듣고 영어로 말해보세요'}
            </div>

            {/* English Answer */}
            <div className={`text-2xl text-purple-600 font-semibold min-h-[50px] mb-5 transition-opacity duration-500 ${showAnswer ? 'opacity-100' : 'opacity-0'}`}>
              {showAnswer && currentQuestion ? currentQuestion.en : ''}
            </div>

            {/* Always Show Status Area - Fixed for better UX */}
            {isRunning && !isPaused && (
              <div className="bg-blue-50 border-2 border-dashed border-purple-600 rounded-2xl p-6 mt-5">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-red-500 mb-3">
                    {countdownText}
                  </div>
                  {(showSpeechArea || isListening) && (
                    <div className={`text-base font-bold p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700'}`}>
                      {micStatus}
                    </div>
                  )}
                </div>
                {showSpeechArea && (
                  <div className="bg-white p-5 rounded-xl border-2 border-gray-200 min-h-[60px] text-lg text-center mb-4">
                    {speechResult}
                  </div>
                )}
                {answerEvaluation && (
                  <div className={`p-4 rounded-xl text-center font-bold border-2 ${
                    evaluationType === 'correct' 
                      ? 'bg-green-100 text-green-800 border-green-500' 
                      : 'bg-red-100 text-red-800 border-red-500'
                  }`}>
                    {answerEvaluation}
                  </div>
                )}
              </div>
            )}

            {/* Timer Circle */}
            {showTimer && (
              <div className="w-15 h-15 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-5" />
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-5 mb-8">
            <button
              onClick={isRunning && !isPaused ? pauseTraining : startTraining}
              className="px-8 py-4 rounded-full text-lg font-bold text-white min-w-[150px] transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ 
                background: isRunning && !isPaused 
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(135deg, #10b981, #059669)' 
              }}
            >
              {isRunning && !isPaused ? '⏸️ 일시정지' : '🚀 시작하기'}
            </button>
            <button
              onClick={resetTraining}
              className="px-6 py-3 rounded-full text-sm font-bold text-white min-w-[100px] transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}
            >
              🔄 다시하기
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-gray-50 p-5 rounded-xl text-center border-2 border-gray-200">
              <div className="text-2xl font-bold text-purple-600">{currentIndex + 1}</div>
              <div className="text-gray-600 mt-1">현재 문제</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl text-center border-2 border-gray-200">
              <div className="text-2xl font-bold text-purple-600">{currentQuestions.length}</div>
              <div className="text-gray-600 mt-1">전체 문제</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl text-center border-2 border-gray-200">
              <div className="text-2xl font-bold text-purple-600">{completionRate}%</div>
              <div className="text-gray-600 mt-1">완료율</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};