/**
 * PatternTrainingPageV2 - Enhanced Pattern Training with Fixed Architecture
 * 
 * 주요 개선사항:
 * - TimerManager: 타이머 중복 방지 및 중앙관리
 * - EventLifecycleManager: 완료 알림 중복 방지
 * - usePatternTrainingManager: 통합 관리 훅
 * - 향상된 UI: 단계별 피드백, 애니메이션, 음향 효과
 * - Web Audio API: 단계 전환시 삐소리
 * - 고정된 음성인식 플로우
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePatternTrainingManager, type PatternTrainingManagerConfig } from '@/hooks/usePatternTrainingManager';
import { evaluateAnswer } from '@/utils/answerNormalization';

// 타입 정의
interface Question {
  ko: string;
  en: string;
}

interface StageData {
  stage_id: string;
  sentences: Sentence[];
  count: number;
}

interface Sentence {
  id: string;
  kr: string;
  en: string;
  form: string;
}

type Phase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting';
type EvaluationType = 'correct' | 'incorrect';

const PatternTrainingPageV2: React.FC = () => {
  // Navigation 
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL 파라미터에서 level, phase, stage 추출 및 검증
  const levelNumber = Math.max(1, parseInt(searchParams.get('level') || '1', 10));
  const phaseNumber = Math.max(1, parseInt(searchParams.get('phase') || '1', 10));
  const stageNumber = Math.max(1, parseInt(searchParams.get('stage') || '1', 10));

  // 파라미터 검증 (유효범위 확인)
  useEffect(() => {
    if (isNaN(levelNumber) || isNaN(phaseNumber) || isNaN(stageNumber)) {
      console.warn('⚠️ 잘못된 URL 파라미터가 감지되어 기본값으로 설정됨');
    }
    console.log(`🔗 URL 파라미터 로드: Level=${levelNumber}, Phase=${phaseNumber}, Stage=${stageNumber}`);
  }, [levelNumber, phaseNumber, stageNumber]);

  // 상태 관리
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('idle');
  const [countdownText, setCountdownText] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [answerEvaluation, setAnswerEvaluation] = useState<string>('');
  const [evaluationType, setEvaluationType] = useState<EvaluationType>('correct');
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  
  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const manager = useRef<ReturnType<typeof usePatternTrainingManager> | null>(null);
  const currentQuestionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef<number>(0);
  const pausedStateRef = useRef<{phase: Phase, remainingTime?: number} | null>(null);

  // 현재 문제
  const currentQuestion = useMemo(() => {
    return currentQuestions[currentIndex] || { ko: '', en: '' };
  }, [currentQuestions, currentIndex]);

  /**
   * 스테이지 데이터 로드
   */
  const loadStageData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setLoadingMessage(`Level ${levelNumber} Phase ${phaseNumber} Stage ${stageNumber} 데이터 로딩 중...`);
      
      const bankPath = `/patterns/banks/level_${levelNumber}/Lv${levelNumber}-P${phaseNumber}-S${stageNumber.toString().padStart(2, '0')}_bank.json`;
      console.log(`📂 데이터 로드 시작: ${bankPath} (Level: ${levelNumber}, Phase: ${phaseNumber}, Stage: ${stageNumber})`);
      
      const response = await fetch(bankPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      setLoadingMessage('데이터 처리 중...');
      const data: StageData = await response.json();
      console.log(`✅ 데이터 로드 성공:`, data);
      
      if (data.sentences && Array.isArray(data.sentences) && data.sentences.length > 0) {
        // sentences 배열을 questions 형식으로 변환
        const questions: Question[] = data.sentences.map(sentence => ({
          ko: sentence.kr,
          en: sentence.en
        }));
        
        setCurrentQuestions(questions);
        setCurrentIndex(0);
        
        // Refs 업데이트
        currentQuestionsRef.current = questions;
        currentIndexRef.current = 0;
        
        console.log(`📊 총 ${questions.length}개 문제 로드됨`);
        setIsLoading(false);
        setLoadingMessage('');
      } else {
        throw new Error('올바른 문제 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      
      // 에러 타입별 처리
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('HTTP 404')) {
          // 파일이 존재하지 않는 경우
          alert(`⚠️ 스테이지 데이터를 찾을 수 없습니다.\n\nLevel ${levelNumber}, Phase ${phaseNumber}, Stage ${stageNumber}에 해당하는 데이터가 아직 준비되지 않았습니다.\n\n다른 스테이지를 선택해주세요.`);
        } else if (error.message.includes('JSON')) {
          // JSON 파싱 오류
          alert(`⚠️ 데이터 형식 오류가 발생했습니다.\n\n스테이지 데이터 파일이 손상되었을 수 있습니다.\n\n잠시 후 다시 시도해주세요.`);
        } else if (error.message.includes('올바른 문제 데이터가 없습니다')) {
          // 데이터 구조 오류
          alert(`⚠️ 스테이지 데이터가 비어있습니다.\n\nLevel ${levelNumber}, Phase ${phaseNumber}, Stage ${stageNumber}의 문장 데이터가 없습니다.\n\n다른 스테이지를 선택해주세요.`);
        } else {
          // 기타 오류
          alert(`❌ 데이터 로드 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n새로고침 후 다시 시도해주세요.`);
        }
      } else {
        // 알 수 없는 오류
        alert('❌ 알 수 없는 오류가 발생했습니다.\n\n페이지를 새로고침 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [levelNumber, phaseNumber, stageNumber]);

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

  /**
   * 음성인식 시작
   */
  const startSpeechRecognition = useCallback((): void => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('❌ Speech Recognition API 지원 안함');
      alert('이 브라우저는 음성인식을 지원하지 않습니다.');
      return;
    }

    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'en-US'; // 영어로 답변해야 하므로 영어 인식
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 음성인식 시작됨');
        setRecognitionResult('🎤 듣고 있습니다...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log(`🎤 음성인식 결과: "${transcript}"`);
        setRecognitionResult(transcript);
        
        if (manager.current) {
          // 인식 결과 처리
          handleSpeechResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ 음성인식 오류:', event.error);
        setRecognitionResult(`❌ 오류: ${event.error}`);
        
        if (manager.current) {
          handleRecognitionTimeout();
        }
      };

      recognition.onend = () => {
        console.log('🎤 음성인식 종료됨');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('❌ 음성인식 시작 오류:', error);
      alert('음성인식 시작에 실패했습니다.');
    }
  }, []);

  /**
   * 다음 문제 표시
   */
  const showNextQuestion = useCallback(async (): Promise<void> => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎯 [${timestamp}] ===== showNextQuestion 시작 =====`);
    
    if (currentIndex >= currentQuestions.length) {
      console.log('🎉 모든 문제 완료!');
      if (manager.current) {
        const stageId = `level-${levelNumber}-phase-${phaseNumber}-stage-${stageNumber}`;
        manager.current.handleStageCompletion(stageId);
      }
      return;
    }

    const question = currentQuestions[currentIndex];
    console.log(`📝 현재 문제 [${currentIndex + 1}/${currentQuestions.length}]: "${question.ko}"`);

    // 초기화
    setShowAnswer(false);
    setAnswerEvaluation('');
    setRecognitionResult('');
    setCurrentPhase('tts');

    try {
      // 1. 삐소리 재생
      playBeepSound('start');
      
      // 2. 한국어 TTS 재생
      console.log('🔊 한국어 TTS 시작:', question.ko);
      await playKoreanTTS(question.ko);
      
      // 3. 3초 카운트다운 시작
      setCurrentPhase('countdown');
      playBeepSound('countdown');
      
      if (manager.current) {
        // 기존 타이머 완전 정리 후 새 타이머 시작
        manager.current.stopAllTimers();
        setTimeout(() => {
          if (manager.current) {
            manager.current.startCountdown(3);
          }
        }, 50);
      }
    } catch (error) {
      console.error('❌ showNextQuestion 오류:', error);
      // 오류 발생시에도 카운트다운으로 진행
      setCurrentPhase('countdown');
      if (manager.current) {
        // 기존 타이머 완전 정리 후 새 타이머 시작
        manager.current.stopAllTimers();
        setTimeout(() => {
          if (manager.current) {
            manager.current.startCountdown(3);
          }
        }, 50);
      }
    }
  }, [currentIndex, currentQuestions, levelNumber, phaseNumber, stageNumber, playKoreanTTS, playBeepSound]);

  /**
   * 음성인식 단계 시작
   */
  const startRecognitionPhase = useCallback((): void => {
    setCurrentPhase('recognition');
    setCountdownText('🎤 말씀하세요');
    
    // 삐소리 재생 후 음성인식 시작
    playBeepSound('recognition');
    
    setTimeout(() => {
      startSpeechRecognition();
      
      // 6초 타이머 시작
      if (manager.current) {
        // 기존 타이머 완전 정리 후 새 타이머 시작
        manager.current.stopAllTimers();
        setTimeout(() => {
          if (manager.current) {
            manager.current.startRecognition(6);
          }
        }, 50);
      }
    }, 300); // 삐소리 후 약간의 딜레이
  }, [startSpeechRecognition, playBeepSound]);

  /**
   * 음성 결과 처리
   */
  const handleSpeechResult = useCallback((userAnswer: string): void => {
    console.log(`🎯 handleSpeechResult 함수 시작: "${userAnswer}"`);
    
    // Ref를 통해 최신 상태값들을 참조
    const currentQuestions = currentQuestionsRef.current;
    const currentIndex = currentIndexRef.current;
    const currentQuestion = currentQuestions[currentIndex];
    
    if (!currentQuestion) {
      console.log(`❌ currentQuestion이 없음 - currentIndex: ${currentIndex}, questions.length: ${currentQuestions.length}`);
      return;
    }

    console.log(`📝 현재 문제: "${currentQuestion.ko}" → "${currentQuestion.en}"`);

    // 음성인식 즉시 중지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('🛑 음성인식 중지됨');
      } catch (e) {
        console.log('음성인식 중지 시도');
      }
    }

    // 타이머 중지
    if (manager.current) {
      manager.current.stopAllTimers();
      console.log('⏰ 모든 타이머 중지됨');
    }

    const correctAnswer = currentQuestion.en;
    console.log(`📊 사용자 답변: "${userAnswer}", 정답: "${correctAnswer}"`);

    // 정답 표시
    setShowAnswer(true);
    
    // 모듈화된 답변 평가 시스템 사용
    const evaluation = evaluateAnswer(userAnswer, correctAnswer, levelNumber, 'pattern');
    
    console.log(`🔍 정규화된 사용자 답변: "${evaluation.normalizedUser}"`);
    console.log(`🔍 정규화된 정답: "${evaluation.normalizedCorrect}"`);
    console.log(`🎯 유사도: ${Math.round(evaluation.similarity * 100)}%`);
    
    if (evaluation.isCorrect) {
      setEvaluationType('correct');
      setAnswerEvaluation(evaluation.feedback);
    } else {
      setEvaluationType('incorrect'); 
      setAnswerEvaluation(evaluation.feedback);
    }

    // 영어 TTS 재생 (원어민 발음)
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      
      // 원어민다운 자연스러운 발음을 위한 텍스트 전처리
      let nativeText = correctAnswer;
      
      // 자주 사용되는 표현의 자연스러운 발음 가이드
      const nativePronunciation = {
        'I am': 'I\'m', // 축약형이 더 자연스러움
        'You are': 'You\'re',
        'We are': 'We\'re', 
        'They are': 'They\'re',
        'It is': 'It\'s',
        'He is': 'He\'s',
        'She is': 'She\'s'
      };
      
      // 자연스러운 축약형으로 변환
      for (const [formal, contracted] of Object.entries(nativePronunciation)) {
        if (nativeText.includes(formal)) {
          nativeText = nativeText.replace(formal, contracted);
          console.log(`🔊 자연스러운 발음: "${formal}" → "${contracted}"`);
        }
      }
      
      const utterance = new SpeechSynthesisUtterance(nativeText);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;  // 자연스러운 대화 속도
      utterance.pitch = 1.0; // 표준 피치
      utterance.volume = 0.9; // 적절한 볼륨
      
      // 원어민다운 자연스러운 발음을 위한 음성 선택
      const voices = speechSynthesis.getVoices();
      
      // 우선순위: Neural/Natural > Google > Microsoft > 기본 미국 음성
      const nativeVoicePreference = [
        'Google US English',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)', 
        'Microsoft Guy Online (Natural) - English (United States)',
        'Alex', // macOS 기본 음성
        'Samantha' // macOS 여성 음성
      ];
      
      let selectedVoice = null;
      
      // 우선순위에 따라 음성 선택
      for (const preferredName of nativeVoicePreference) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(preferredName) || voice.name === preferredName
        );
        if (selectedVoice) break;
      }
      
      // fallback: en-US 중에서 가장 자연스러운 것 선택
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang === 'en-US' && 
          (voice.name.toLowerCase().includes('natural') || 
           voice.name.toLowerCase().includes('neural') ||
           voice.name.toLowerCase().includes('premium'))
        );
      }
      
      // 최종 fallback: 첫 번째 en-US 음성
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'en-US');
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`🔊 원어민 음성 선택: ${selectedVoice.name} (${selectedVoice.lang})`);
      }
      
      if (manager.current) {
        manager.current.manageTTSEvents(utterance);
      }
      speechSynthesis.speak(utterance);
    }

    // 4초 대기 후 다음 문제
    setCurrentPhase('waiting');
    if (manager.current) {
      manager.current.startWaiting(4);
    }
  }, []); // 의존성 배열을 빈 배열로 변경

  /**
   * 음성인식 시간 초과 처리
   */
  const handleRecognitionTimeout = useCallback((): void => {
    console.log('⏰ 음성인식 시간 초과 - 평가 진행');
    
    // 타임아웃이어도 빈 답변으로 평가 진행
    const emptyAnswer = '';
    handleSpeechResult(emptyAnswer);
  }, [handleSpeechResult]);

  /**
   * 다음 문제로 이동
   */
  const moveToNextQuestion = useCallback((): void => {
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      
      // Ref 업데이트
      currentIndexRef.current = nextIndex;
      
      setCurrentPhase('idle');
      
      // 인덱스 업데이트 후 다음 문제 표시
      setTimeout(() => {
        const currentQuestions = currentQuestionsRef.current;
        
        if (nextIndex >= currentQuestions.length) {
          console.log('🎉 모든 문제 완료!');
          if (manager.current) {
            const stageId = `level-${levelNumber}-phase-${phaseNumber}-stage-${stageNumber}`;
            manager.current.handleStageCompletion(stageId);
          }
          return;
        }
        
        const question = currentQuestions[nextIndex];
        console.log(`📝 다음 문제 [${nextIndex + 1}/${currentQuestions.length}]: "${question.ko}"`);
        
        // 초기화
        setShowAnswer(false);
        setAnswerEvaluation('');
        setRecognitionResult('');
        setCurrentPhase('tts');

        try {
          // 1. 삐소리 재생
          playBeepSound('start');
          
          // 2. 한국어 TTS 재생
          console.log('🔊 한국어 TTS 시작:', question.ko);
          
          // 기존 TTS 중지
          if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
          }
          
          playKoreanTTS(question.ko).then(() => {
            // 3. 3초 카운트다운 시작
            setCurrentPhase('countdown');
            playBeepSound('countdown');
            
            if (manager.current) {
              // 기존 타이머 완전 정리 후 새 타이머 시작
              manager.current.stopAllTimers();
              setTimeout(() => {
                if (manager.current) {
                  manager.current.startCountdown(3);
                }
              }, 50);
            }
          }).catch((error) => {
            console.error('❌ TTS 오류:', error);
            // 오류 발생시에도 카운트다운으로 진행
            setCurrentPhase('countdown');
            if (manager.current) {
              // 기존 타이머 완전 정리 후 새 타이머 시작
              manager.current.stopAllTimers();
              setTimeout(() => {
                if (manager.current) {
                  manager.current.startCountdown(3);
                }
              }, 50);
            }
          });
        } catch (error) {
          console.error('❌ moveToNextQuestion 오류:', error);
          // 오류 발생시에도 카운트다운으로 진행
          setCurrentPhase('countdown');
          if (manager.current) {
            // 기존 타이머 완전 정리 후 새 타이머 시작
            manager.current.stopAllTimers();
            setTimeout(() => {
              if (manager.current) {
                manager.current.startCountdown(3);
              }
            }, 50);
          }
        }
      }, 100);
      
      return nextIndex;
    });
  }, [levelNumber, phaseNumber, stageNumber, playKoreanTTS, playBeepSound]);

  /**
   * 훈련 시작
   */
  const startTraining = useCallback((): void => {
    if (currentQuestions.length === 0) {
      alert('문제 데이터를 먼저 로드해주세요!');
      return;
    }

    console.log('🚀 Pattern Training 시작!');
    setIsTraining(true);
    setIsPaused(false);
    setCurrentIndex(0);
    
    // Ref 업데이트
    currentIndexRef.current = 0;
    
    showNextQuestion();
  }, [currentQuestions.length, showNextQuestion]);

  /**
   * 일시정지/재개 토글
   */
  const togglePause = useCallback((): void => {
    if (isPaused) {
      // 재개
      console.log('▶️ 훈련 재개');
      setIsPaused(false);
      
      // 일시정지된 상태 복원
      const pausedState = pausedStateRef.current;
      if (pausedState) {
        console.log(`🔄 단계 복원: ${pausedState.phase}`);
        
        const savedTime = pausedState.remainingTime;
        console.log(`🔄 저장된 시간으로 복원: ${savedTime}초`);
        
        switch (pausedState.phase) {
          case 'countdown':
            setCurrentPhase('countdown');
            if (manager.current && savedTime !== undefined) {
              manager.current.startCountdown(savedTime); // 저장된 시간부터 시작
            } else if (manager.current) {
              manager.current.startCountdown(3); // fallback
            }
            break;
            
          case 'recognition':
            setCurrentPhase('recognition');
            setCountdownText('🎤 말씀하세요');
            startSpeechRecognition();
            if (manager.current && savedTime !== undefined) {
              manager.current.startRecognition(savedTime); // 저장된 시간부터 시작
            } else if (manager.current) {
              manager.current.startRecognition(6); // fallback
            }
            break;
            
          case 'waiting':
            setCurrentPhase('waiting');
            if (manager.current && savedTime !== undefined) {
              manager.current.startWaiting(savedTime); // 저장된 시간부터 시작
            } else if (manager.current) {
              manager.current.startWaiting(4); // fallback
            }
            break;
            
          default:
            // TTS나 idle 상태면 현재 문제 다시 시작
            const currentQuestions = currentQuestionsRef.current;
            const currentIndex = currentIndexRef.current;
            const question = currentQuestions[currentIndex];
            
            if (question) {
              setCurrentPhase('tts');
              playBeepSound('start');
              playKoreanTTS(question.ko).then(() => {
                setCurrentPhase('countdown');
                playBeepSound('countdown');
                if (manager.current) {
                  manager.current.startCountdown(3);
                }
              });
            }
            break;
        }
        
        pausedStateRef.current = null;
      }
    } else {
      // 일시정지
      console.log('⏸️ 훈련 일시정지');
      
      // 1. 먼저 현재 타이머 상태 저장 (중지 전에!)
      let remainingTime: number | undefined;
      if (manager.current) {
        console.log(`🔍 타이머 매니저 디버깅:`);
        manager.current.debug();
        
        const timerState = manager.current.getTimerState();
        remainingTime = timerState?.remainingTime;
        console.log(`🕰️ 가져온 타이머 상태:`, timerState);
        console.log(`🕰️ 남은 시간: ${remainingTime}초`);
      }

      // 2. 상태 저장
      pausedStateRef.current = {
        phase: currentPhase,
        remainingTime
      };
      console.log(`💾 현재 단계 저장: ${currentPhase}, 남은 시간: ${remainingTime}초`);
      
      // 3. 타이머 완전 중지 (상태 저장 후!)
      if (manager.current) {
        manager.current.stopAllTimers();
        // 추가: 모든 활성 타이머 강제 정리
        setTimeout(() => {
          if (manager.current) {
            manager.current.stopAllTimers();
            console.log('🛑 타이머 강제 정리 완료');
          }
        }, 100);
      }
      
      // 4. 마지막에 일시정지 상태로 전환
      setIsPaused(true);
      
      // 음성인식 중지
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          console.log('음성인식 정지');
        }
      }
      
      // TTS 중지
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    }
  }, [isPaused, currentPhase, startSpeechRecognition, playBeepSound, playKoreanTTS]);

  // 매니저 설정 (모든 함수 선언 후 배치)
  const managerConfig: PatternTrainingManagerConfig = useMemo(() => ({
    onCountdownTick: (remainingTime: number) => {
      if (remainingTime > 0) {
        setCountdownText(`${remainingTime} 초 후 시작`);
      } else {
        setCountdownText('시작!');
      }
    },
    onCountdownComplete: () => {
      console.log('⏰ 카운트다운 완료 - 음성인식 시작');
      startRecognitionPhase();
    },
    onRecognitionTick: (remainingTime: number) => {
      setCountdownText(`🎤 ${remainingTime}초 남음`);
    },
    onRecognitionComplete: () => {
      console.log('⏰ 음성인식 시간 완료');
      handleRecognitionTimeout();
    },
    onWaitingTick: (remainingTime: number) => {
      setCountdownText(`${remainingTime}초 후 다음 문제`);
    },
    onWaitingComplete: () => {
      console.log('⏰ 대기 완료 - 다음 문제로');
      moveToNextQuestion();
    },
    onCompletionEvent: (stageId: string) => {
      console.log(`🎉 스테이지 완료: ${stageId}`);
      setIsTraining(false);
    }
  }), [startRecognitionPhase, handleRecognitionTimeout, moveToNextQuestion]);

  // 패턴 트레이닝 매니저 초기화
  const patternManager = usePatternTrainingManager(managerConfig);
  
  // useEffect로 안전하게 manager.current 설정
  useEffect(() => {
    manager.current = patternManager;
    console.log('🔧 패턴 트레이닝 매니저 초기화 완료');
  }, [patternManager]);

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    loadStageData();
  }, [loadStageData]);

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      if (manager.current) {
        manager.current.cleanup();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 이미 정지됨
        }
      }
      
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // 단계별 UI 렌더링
  const renderPhaseUI = () => {
    switch (currentPhase) {
      case 'tts':
        return (
          <div className="text-center">
            <div className="animate-pulse">
              <span className="text-6xl">🔊</span>
            </div>
            <p className="text-xl font-medium text-blue-600 mt-4">
              한국어를 듣고 있습니다...
            </p>
          </div>
        );
        
      case 'countdown':
        const countNum = parseInt(countdownText.match(/\d+/)?.[0] || '0');
        const emoji = countNum === 3 ? '3️⃣' : countNum === 2 ? '2️⃣' : countNum === 1 ? '1️⃣' : '🚀';
        
        return (
          <div className="text-center">
            <div className="animate-bounce">
              <span className="text-8xl">{emoji}</span>
            </div>
            <p className="text-2xl font-bold text-orange-500 mt-4">
              {countdownText}
            </p>
          </div>
        );
        
      case 'recognition':
        const isListening = recognitionResult === '🎤 듣고 있습니다...';
        
        return (
          <div className="text-center">
            <div className={isListening ? 'animate-pulse' : ''}>
              <span className="text-7xl">
                {isListening ? '🎤' : '🗣️'}
              </span>
            </div>
            <p className="text-xl font-semibold text-green-600 mt-4">
              {countdownText}
            </p>
            <div className={`mt-4 px-6 py-3 rounded-lg ${
              isListening 
                ? 'bg-green-100 border-2 border-green-300' 
                : 'bg-gray-100 border-2 border-gray-300'
            }`}>
              <p className="text-lg">
                {isListening ? '🔴 녹음중' : '⭕ 녹음 완료'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                인식결과: {recognitionResult || '없음'}
              </p>
            </div>
          </div>
        );
        
      case 'waiting':
        return (
          <div className="text-center">
            <div className="animate-spin">
              <span className="text-6xl">⏳</span>
            </div>
            <p className="text-xl font-medium text-purple-600 mt-4">
              {countdownText}
            </p>
            {showAnswer && (
              <div className={`mt-6 p-6 rounded-lg ${
                evaluationType === 'correct' 
                  ? 'bg-green-50 border-2 border-green-200' 
                  : 'bg-red-50 border-2 border-red-200'
              }`}>
                <p className={`text-lg font-bold ${
                  evaluationType === 'correct' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {answerEvaluation}
                </p>
                <p className="text-gray-600 mt-2">
                  정답: <span className="font-medium">{currentQuestion.en}</span>
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="text-center">
            <span className="text-6xl">📚</span>
            <p className="text-xl text-gray-600 mt-4">훈련을 시작하려면 버튼을 눌러주세요</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                패턴 훈련 (Level {levelNumber} - Phase {phaseNumber} - Stage {stageNumber})
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                문제 {currentIndex + 1} / {currentQuestions.length}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              대시보드로
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <div className="text-lg font-semibold text-gray-900">로딩 중...</div>
                <div className="text-sm text-gray-600 mt-1">{loadingMessage}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 현재 문제 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {currentQuestion.ko || '문제를 로드중...'}
            </h2>
            
            {/* 단계별 UI */}
            <div className="min-h-[300px] flex items-center justify-center">
              {renderPhaseUI()}
            </div>
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex justify-center gap-4">
            {!isTraining ? (
              <button
                onClick={startTraining}
                disabled={currentQuestions.length === 0}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                🚀 훈련 시작
              </button>
            ) : (
              <button
                onClick={togglePause}
                className={`px-8 py-3 font-semibold rounded-lg transition-colors ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
              </button>
            )}
            
            <button
              onClick={loadStageData}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 데이터 새로고침
            </button>
          </div>
        </div>

        {/* 진행률 표시 */}
        {currentQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">진행률</span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round((currentIndex / currentQuestions.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(currentIndex / currentQuestions.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternTrainingPageV2;