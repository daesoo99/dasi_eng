import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { webSpeechAPI } from '../services/webSpeechAPI.ts';
import { useSpeechRecognitionSimple } from '../hooks/useSpeechRecognitionSimple.ts';

interface Props {
  onExit?: () => void;
}

const AudioTestSimple: React.FC<Props> = memo(({ onExit: _onExit }) => {
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showResult, setShowResult] = useState<any>(null);
  
  // 녹음 관련 상태
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingLines, setRecordingLines] = useState<Array<{
    text: string;
    timestamp: number;
    thinkingTime: number;
    isFinal: boolean;
  }>>([]);
  const [currentLineText, setCurrentLineText] = useState<string>('');
  const accumulatedTextRef = useRef<string>('');
  
  // 녹음 관련 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingSpeechRecognition = useRef<any>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechDisplayRef = useRef<HTMLDivElement | null>(null);

  const speechRecognition = useSpeechRecognitionSimple({
    continuous: false,
    interimResults: true,
    language: 'ko-KR',
    onResult: (transcript, isFinal, confidence) => {
      console.log('음성 인식 결과:', { transcript, isFinal, confidence, currentTest });
      if (isFinal && currentTest === 'voice') {
        // 통합 음성 테스트 평가
        const cleanTranscript = transcript.trim();
        let score = Math.round(confidence * 100);
        let recommendation = '';
        
        if (cleanTranscript.includes('안녕하세요') || cleanTranscript.includes('안녕')) {
          score = Math.max(score, 85);
          recommendation = '마이크와 음성 인식이 정상적으로 작동합니다!';
        } else if (cleanTranscript.length > 0) {
          score = Math.max(score, 70);
          recommendation = '음성은 인식되지만, "안녕하세요"를 다시 말해보세요.';
        } else {
          score = 30;
          recommendation = '음성이 잘 인식되지 않았습니다. 마이크를 확인해주세요.';
        }
        
        const result = {
          id: Date.now(),
          type: 'voice',
          score,
          recommendation,
          transcript: cleanTranscript
        };
        
        console.log('결과 창 표시:', result);
        setShowResult(result);
        setCurrentTest(null);
      }
    },
    onError: (error) => {
      console.error('음성 인식 오류:', error);
    }
  });

  const stopRecordingSpeechRecognition = useCallback(() => {
    if (recordingSpeechRecognition.current) {
      recordingSpeechRecognition.current.stop();
      recordingSpeechRecognition.current = null;
    }
    
    // 타이머 정리
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // 마지막 누적된 텍스트가 있으면 최종 줄에 추가
    if (accumulatedTextRef.current.trim()) {
      const now = Date.now();
      const thinkingTime = recordingLines.length > 0 
        ? Math.max(0, now - (recordingLines[recordingLines.length - 1]?.timestamp + 2000) || 0)
        : 0;
      
      setRecordingLines(prev => {
        const newLine = {
          text: accumulatedTextRef.current.trim(),
          timestamp: now,
          thinkingTime: thinkingTime,
          isFinal: true
        };
        
        // 최근 3줄만 유지
        const updatedLines = [...prev, newLine];
        const recentLines = updatedLines.slice(-3);
        
        // 자동 스크롤
        setTimeout(() => {
          if (speechDisplayRef.current) {
            speechDisplayRef.current.scrollTop = speechDisplayRef.current.scrollHeight;
          }
        }, 100);
        
        return recentLines;
      });
      
      // 초기화
      accumulatedTextRef.current = '';
      setCurrentLineText('');
    }
    
    console.log('[AudioTestSimple] 음성 인식 중지');
  }, [recordingLines]);

  // 모든 오디오 관련 기능을 정리하는 통합 함수
  const cleanupAllAudio = useCallback(() => {
    // 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 오디오 재생 중지
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
    }
    
    // 오디오 스트림 정리
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // 음성 인식 중지
    stopRecordingSpeechRecognition();
    speechRecognition.stopListening();
    
    // TTS 중지
    webSpeechAPI.stopSpeaking();
    
    // 상태 초기화
    setIsRecording(false);
    setIsPlaying(false);
    
    console.log('[AudioTestSimple] 모든 오디오 정리 완료');
  }, [speechRecognition, stopRecordingSpeechRecognition]);

  // 컴포넌트 언마운트 시 모든 오디오 정리
  useEffect(() => {
    return () => {
      cleanupAllAudio();
      setCurrentTest(null);
    };
  }, [cleanupAllAudio]);

  

  // ====== 녹음 기능들 ======
  
  const startRecording = async () => {
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

      audioStreamRef.current = stream;
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
        
        console.log('[AudioTestSimple] 녹음 완료:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });
        
        setRecordedAudio(audioBlob);
        setIsRecording(false);
      };

      mediaRecorder.start(100);
      setCurrentTest('recording');
      setIsRecording(true);
      setRecordingLines([]);
      setCurrentLineText('');
      
      // 누적된 텍스트 초기화
      accumulatedTextRef.current = '';
      lastSpeechTimeRef.current = Date.now();
      
      // 녹음과 동시에 음성 인식 시작
      startRecordingSpeechRecognition();
      
      console.log('[AudioTestSimple] 녹음 시작');
    } catch (error: any) {
      console.error('[AudioTestSimple] 녹음 시작 실패:', error);
      alert('마이크 접근에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // 음성 인식도 중지
      stopRecordingSpeechRecognition();
      
      console.log('[AudioTestSimple] 녹음 중지');
    }
  };

  const playRecording = () => {
    if (!recordedAudio) {
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
      const audioUrl = URL.createObjectURL(recordedAudio);
      
      playingAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        playingAudioRef.current = null;
        console.log('[AudioTestSimple] 재생 완료');
      };

      audio.onerror = (e) => {
        console.error('[AudioTestSimple] 오디오 재생 실패:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        playingAudioRef.current = null;
        alert('오디오 재생에 실패했습니다.');
      };

      audio.oncanplaythrough = () => {
        // 🔧 FIX: Check paused state before calling play() to prevent duplicate sounds
        if (audio.paused) {
          console.log('[DEBUG] 🔊 AudioTestSimple: 재생 시작 (paused=true)');
          audio.play().catch((e) => {
            console.error('[AudioTestSimple] 오디오 play() 실패:', e);
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            playingAudioRef.current = null;
            alert('오디오 재생에 실패했습니다.');
          });
        } else {
          console.log('[DEBUG] 🚫 AudioTestSimple: 이미 재생 중 - 스킨');
        }
      };

      setIsPlaying(true);
      audio.src = audioUrl;
      audio.load();
      
      console.log('[AudioTestSimple] 재생 시작');
    } catch (error) {
      console.error('[AudioTestSimple] 재생 준비 실패:', error);
      alert('오디오 재생 준비에 실패했습니다.');
    }
  };

  const stopPlaying = () => {
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
      setIsPlaying(false);
      console.log('[AudioTestSimple] 재생 중지');
    }
  };

  const clearRecording = () => {
    cleanupAllAudio();
    
    setRecordedAudio(null);
    setRecordingLines([]);
    setCurrentLineText('');
    setCurrentTest(null);
    
    // 누적된 텍스트 초기화
    accumulatedTextRef.current = '';
    
    // 타임아웃 정리
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    console.log('[AudioTestSimple] 녹음 삭제');
  };

  // 녹음용 음성 인식 함수들
  const startRecordingSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('이 브라우저는 음성 인식을 지원하지 않습니다.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        const now = Date.now();
        
        if (currentTranscript.trim()) {
          // 최종 결과인 경우, 누적된 텍스트에 추가
          if (finalTranscript) {
            accumulatedTextRef.current += finalTranscript;
            setCurrentLineText(accumulatedTextRef.current);
          } else {
            // 임시 결과인 경우, 누적된 텍스트 + 임시 텍스트 표시
            setCurrentLineText(accumulatedTextRef.current + interimTranscript);
          }
          
          lastSpeechTimeRef.current = now;
          
          // 실시간 스크롤 (말하는 도중에도)
          if (speechDisplayRef.current) {
            speechDisplayRef.current.scrollTop = speechDisplayRef.current.scrollHeight;
          }
          
          // 기존 침묵 타이머 제거
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          // 침묵 시 새로운 줄로 넘어가는 타이머 설정
          silenceTimeoutRef.current = setTimeout(() => {
            const textToAdd = accumulatedTextRef.current.trim();
            if (textToAdd) {
              const currentTime = Date.now();
              const thinkingTime = recordingLines.length > 0 
                ? Math.max(0, currentTime - (recordingLines[recordingLines.length - 1]?.timestamp + 2000) || 0)
                : 0;
              
              setRecordingLines(prev => {
                const newLine = {
                  text: textToAdd,
                  timestamp: currentTime,
                  thinkingTime: thinkingTime,
                  isFinal: true
                };
                console.log('[AudioTestSimple] 새로운 줄 추가:', {
                  text: textToAdd,
                  thinkingTime: Math.round(thinkingTime / 100) / 10,
                  totalLines: prev.length + 1
                });
                
                // 최근 3줄만 유지
                const updatedLines = [...prev, newLine];
                const recentLines = updatedLines.slice(-3);
                
                return recentLines;
              });
              
              // 새 줄 시작을 위해 초기화
              accumulatedTextRef.current = '';
              setCurrentLineText('');
              lastSpeechTimeRef.current = currentTime;
            }
          }, 1500);
          
          console.log('[AudioTestSimple] 음성 인식:', currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[AudioTestSimple] 음성 인식 오류:', event.error);
      };

      recognition.onend = () => {
        console.log('[AudioTestSimple] 음성 인식 종료');
      };

      recordingSpeechRecognition.current = recognition;
      recognition.start();
      console.log('[AudioTestSimple] 음성 인식 시작');
    } catch (error) {
      console.error('[AudioTestSimple] 음성 인식 시작 실패:', error);
    }
  };

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
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{
              color: '#666',
              marginBottom: '20px',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              면접 전에 마이크와 음성을 테스트해보세요
            </p>
          </div>

          {/* 현재 테스트 화면 */}
          {currentTest && (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '20px' }}>
                {currentTest === 'voice' && (speechRecognition.isListening ? '🎙️ "안녕하세요"라고 말해주세요' : '🔊 음성 안내를 들어주세요...')}
                {currentTest === 'recording' && (isRecording ? '🎙️ 녹음 중입니다. 말씀해 보세요!' : recordedAudio ? '✅ 녹음이 완료되었습니다!' : '🎤 녹음을 시작하세요')}
              </h3>
              
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '25px'
              }}>
                {currentTest === 'voice' ? 
                  (speechRecognition.isListening ? '마이크가 음성을 듣고 있습니다' : '음성 안내가 끝나면 말씀해 주세요') :
                  currentTest === 'recording' ?
                    (isRecording ? '🎙️ 자유롭게 말씀하세요' : recordedAudio ? '녹음 완료! 재생하거나 다시 녹음하세요' : '녹음 버튼을 눌러 시작하세요') :
                    '테스트를 진행해주세요'
                }
              </div>
              
              <div style={{
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: currentTest === 'recording' ?
                  (isRecording ? 'linear-gradient(45deg, #ff4757, #ff3742)' : recordedAudio ? 'linear-gradient(45deg, #4CAF50, #45a049)' : 'linear-gradient(45deg, #666, #555)') :
                  speechRecognition.isListening 
                    ? 'linear-gradient(45deg, #ff5722, #d84315)' 
                    : 'linear-gradient(45deg, #2196F3, #1976D2)',
                margin: '0 auto 25px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: (currentTest === 'recording' && isRecording) || speechRecognition.isListening ? 'pulse 1s infinite' : 'pulse 2s infinite',
                boxShadow: (currentTest === 'recording' && isRecording) ? '0 0 30px rgba(255, 71, 87, 0.5)' : 
                          speechRecognition.isListening ? '0 0 30px rgba(255, 87, 34, 0.5)' : 
                          '0 0 20px rgba(33, 150, 243, 0.3)'
              }}>
                <span style={{ fontSize: '64px' }}>
                  {currentTest === 'recording' ? 
                    (isRecording ? '🎙️' : recordedAudio ? '✅' : '🎤') :
                    (speechRecognition.isListening ? '🎙️' : '🔊')
                  }
                </span>
              </div>
              
              {speechRecognition.transcript && currentTest === 'voice' && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#e8f5e8',
                  borderRadius: '10px',
                  color: '#2e7d32',
                  border: '2px solid #4caf50'
                }}>
                  <strong>인식된 음성:</strong> "{speechRecognition.transcript}"
                </div>
              )}
              
              {currentTest === 'recording' && (recordingLines.length > 0 || currentLineText) && (
                <div 
                  ref={speechDisplayRef}
                  style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#e3f2fd',
                    borderRadius: '10px',
                    color: '#1565c0',
                    border: '2px solid #2196f3',
                    minHeight: '100px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    scrollBehavior: 'smooth'
                  }}>
                  <strong>인식된 음성:</strong>
                  <div style={{ marginTop: '8px', fontSize: '16px', lineHeight: '1.6' }}>
                    {recordingLines.map((line, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        {line.thinkingTime > 500 && (
                          <div style={{
                            fontSize: '12px',
                            color: '#90a4ae',
                            fontStyle: 'italic',
                            marginBottom: '2px'
                          }}>
                            💭 {(line.thinkingTime / 1000).toFixed(1)}초 사고
                          </div>
                        )}
                        <span style={{
                          opacity: index === recordingLines.length - 1 ? 0.9 : 0.5,
                          transition: 'opacity 0.3s ease',
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: index === recordingLines.length - 1 ? '16px' : '15px',
                          fontWeight: index === recordingLines.length - 1 ? '500' : '400'
                        }}>
                          "{line.text}"
                        </span>
                      </div>
                    ))}
                    {currentLineText && (
                      <div style={{
                        opacity: 1,
                        display: 'block',
                        borderLeft: '3px solid #2196f3',
                        paddingLeft: '8px',
                        background: 'rgba(33, 150, 243, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginTop: '4px',
                        fontSize: '16px',
                        fontWeight: '600',
                        animation: 'pulse 1.5s infinite ease-in-out'
                      }}>
                        <span style={{ color: '#1565c0' }}>💬 </span>"{currentLineText}"
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {currentTest === 'recording' && recordedAudio && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: '#e8f5e8',
                  borderRadius: '8px',
                  color: '#2e7d32',
                  border: '1px solid #4caf50',
                  fontSize: '14px'
                }}>
                  <strong>녹음 완료</strong> • 크기: {(recordedAudio.size / 1024).toFixed(1)} KB • 형식: {recordedAudio.type.split('/')[1]}
                  <br/>
                  <strong>최근 발화:</strong> {recordingLines.length}개 문장 • 총 사고시간: {
                    recordingLines.reduce((sum, line) => sum + line.thinkingTime, 0) > 0 
                      ? (recordingLines.reduce((sum, line) => sum + line.thinkingTime, 0) / 1000).toFixed(1) + '초'
                      : '0초'
                  }
                  <br/>
                  <small style={{ opacity: 0.8 }}>💾 메모리에 임시 저장됨 (페이지 새로고침 시 삭제) • 전체 기록은 면접 후 확인 가능</small>
                </div>
              )}
              
              {currentTest === 'voice' && speechRecognition.isListening && (
                <div style={{
                  marginTop: '20px',
                  padding: '10px',
                  color: '#666',
                  fontSize: '13px'
                }}>
                  💡 마이크에 가까이 대고 또렷하게 말씀해 주세요
                </div>
              )}
              
              {/* 테스트 제어 버튼들 */}
              {currentTest === 'recording' && (
                <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {!recordedAudio ? (
                    <>
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          style={{
                            padding: '12px 20px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          🎤 녹음 시작
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          style={{
                            padding: '12px 20px',
                            background: '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          ⏹️ 녹음 중지
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={isPlaying ? stopPlaying : playRecording}
                        style={{
                          padding: '12px 20px',
                          background: isPlaying ? '#ff4757' : '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isPlaying ? '⏹️ 재생 중지' : '▶️ 내 목소리 듣기'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setRecordedAudio(null);
                          startRecording();
                        }}
                        style={{
                          padding: '12px 20px',
                          background: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔄 다시 녹음
                      </button>
                      
                      <button
                        onClick={clearRecording}
                        style={{
                          padding: '12px 20px',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        🗑️ 삭제
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      cleanupAllAudio();
                      setCurrentTest(null);
                      setRecordedAudio(null);
                      setRecordingLines([]);
                      setCurrentLineText('');
                      accumulatedTextRef.current = '';
                      
                      // 타임아웃 정리
                      if (silenceTimeoutRef.current) {
                        clearTimeout(silenceTimeoutRef.current);
                        silenceTimeoutRef.current = null;
                      }
                    }}
                    style={{
                      padding: '12px 20px',
                      background: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ❌ 테스트 종료
                  </button>
                </div>
              )}
              
              {currentTest === 'voice' && (
                <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {speechRecognition.isListening ? (
                    <button
                      onClick={() => {
                        speechRecognition.stopListening();
                      }}
                      style={{
                        padding: '12px 20px',
                        background: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⏸️ 인식 정지
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        speechRecognition.resetTranscript();
                        speechRecognition.startListening();
                      }}
                      style={{
                        padding: '12px 20px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🎙️ 다시 시도
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      cleanupAllAudio();
                      setCurrentTest(null);
                    }}
                    style={{
                      padding: '12px 20px',
                      background: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ❌ 테스트 종료
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 결과 확인 창 */}
          {showResult && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '15px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%'
              }}>
                <h3 style={{ color: '#333', marginBottom: '20px' }}>
                  🎉 테스트 완료!
                </h3>
                
                <div style={{
                  fontSize: '48px',
                  margin: '20px 0',
                  color: showResult.score >= 80 ? '#4CAF50' : '#FF9800'
                }}>
                  {showResult.score >= 90 ? '🌟' : showResult.score >= 80 ? '👍' : '📝'}
                </div>
                
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}>
                  <strong>인식된 음성:</strong><br/>
                  "{showResult.transcript}"
                </div>
                
                <div style={{
                  background: showResult.score >= 80 ? '#e8f5e8' : '#fff3cd',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#333'
                }}>
                  <strong>점수: {showResult.score}점</strong><br/>
                  {showResult.recommendation}
                </div>
                
                <button
                  onClick={() => {
                    setTestResults(prev => [...prev, showResult]);
                    setShowResult(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          )}

          {/* 테스트 선택 메뉴 */}
          {!currentTest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px', maxWidth: '700px', margin: '0 auto 40px auto' }}>
              <button
                onClick={() => {
                  webSpeechAPI.stopSpeaking();
                  startRecording();
                }}
                style={{
                  padding: '28px 24px',
                  background: '#fff',
                  color: '#333',
                  border: '2px solid #f0f0f0',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4CAF50';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(76,175,80,0.2)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎙️</div>
                <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#333' }}>음성 테스트</div>
                <div style={{ fontSize: '15px', color: '#666', lineHeight: '1.5' }}>
                  마이크 • 음성 인식 • 녹음/재생<br/>
                  종합적인 음성 기능을 한번에 테스트
                </div>
              </button>

              <button
                onClick={() => alert('카메라 테스트 기능을 준비 중입니다!')}
                style={{
                  padding: '28px 24px',
                  background: '#fff',
                  color: '#333',
                  border: '2px solid #f0f0f0',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2196F3';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(33,150,243,0.2)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📹</div>
                <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#333' }}>카메라 테스트</div>
                <div style={{ fontSize: '15px', color: '#666', lineHeight: '1.5' }}>
                  웹캠 • 화질 • 조명 • 배경<br/>
                  화상 면접을 위한 카메라 점검
                </div>
              </button>
            </div>
          )}

          {/* 테스트 결과 */}
          {testResults.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>📊 테스트 결과</h3>
              {testResults.map((result) => (
                <div
                  key={result.id}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>
                      {result.type === 'microphone' ? '🎤 마이크' :
                       result.type === 'pronunciation' ? '🗣️ 발음' : '🎯 음성품질'} 테스트
                    </span>
                    <span style={{
                      background: result.score >= 80 ? '#4CAF50' : '#FF9800',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {result.score}점
                    </span>
                  </div>
                  <p style={{ color: '#666', margin: '10px 0 0 0' }}>
                    {result.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
});

AudioTestSimple.displayName = 'AudioTestSimple';

export default AudioTestSimple;
