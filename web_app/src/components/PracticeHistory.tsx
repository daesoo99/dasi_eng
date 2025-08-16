import React, { useState, useEffect, useRef } from 'react';
import { interviewStorage, InterviewRecord } from '../services/interviewStorage.ts';
import { webSpeechAPI } from '../services/webSpeechAPI.ts';

interface Props {
  onBack: () => void;
}

const InterviewHistory: React.FC<Props> = ({ onBack }) => {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewRecord | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number }>({ used: 0, quota: 0 });
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadInterviews();
    loadStorageInfo();
  }, []);

  // 컴포넌트 언마운트 시 오디오 중지
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // selectedInterview가 변경될 때 오디오 중지
  useEffect(() => {
    stopAllAudio();
  }, [selectedInterview]);

  const stopAllAudio = () => {
    // TTS 중지
    webSpeechAPI.stopSpeaking();
    
    // HTML Audio 중지
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // URL 정리
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    setPlayingIndex(null);
  };

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const records = await interviewStorage.getAllInterviews();
      setInterviews(records);
    } catch (error) {
      console.error('면접 기록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await interviewStorage.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('저장 공간 정보 로드 실패:', error);
    }
  };

  const deleteInterview = async (id: string) => {
    if (window.confirm('이 면접 기록을 삭제하시겠습니까?')) {
      try {
        await interviewStorage.deleteInterview(id);
        await loadInterviews();
        setSelectedInterview(null);
        alert('면접 기록이 삭제되었습니다.');
      } catch (error) {
        console.error('면접 기록 삭제 실패:', error);
        alert('면접 기록 삭제에 실패했습니다.');
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const playAnswer = async (qa: any, index: number) => {
    if (playingIndex === index) {
      // 현재 재생 중인 경우 중지
      stopAllAudio();
      return;
    }

    try {
      // 이전 오디오 중지
      stopAllAudio();
      
      setPlayingIndex(index);
      
      // 실제 녹음된 음성이 있으면 그것을 재생, 없으면 TTS 사용
      if (qa.audioBlob && qa.audioBlob.size > 0) {
        try {
          // 오디오 blob 유효성 검사
          if (!(qa.audioBlob instanceof Blob)) {
            console.warn('오디오 데이터가 Blob 형식이 아닙니다. TTS로 대체합니다.');
            await playTTS(qa.answer);
            return;
          }

          // 지원되는 오디오 타입인지 확인
          const audioType = qa.audioBlob.type;
          if (!audioType || !audioType.startsWith('audio/')) {
            console.warn('지원되지 않는 오디오 형식입니다:', audioType, 'TTS로 대체합니다.');
            await playTTS(qa.answer);
            return;
          }

          const audio = new Audio();
          const audioUrl = URL.createObjectURL(qa.audioBlob);
          
          // ref에 저장
          currentAudioRef.current = audio;
          audioUrlRef.current = audioUrl;
          
          // 오디오 이벤트 리스너 설정
          const cleanup = () => {
            setPlayingIndex(null);
            if (audioUrlRef.current) {
              URL.revokeObjectURL(audioUrlRef.current);
              audioUrlRef.current = null;
            }
            currentAudioRef.current = null;
          };
          
          audio.onended = cleanup;
          audio.onerror = (e) => {
            console.error(`[InterviewHistory] 오디오 재생 실패 (답변 ${index + 1}):`, e);
            console.log(`[InterviewHistory] 오디오 blob 정보:`, {
              size: qa.audioBlob?.size || 'undefined',
              type: qa.audioBlob?.type || 'undefined',
              url: audioUrl,
              hasBlob: !!qa.audioBlob,
              blobConstructor: qa.audioBlob?.constructor?.name
            });
            
            // 즉시 정리하고 TTS로 대체
            try {
              cleanup();
              console.log(`[InterviewHistory] TTS로 대체 재생 시작: "${qa.answer.substring(0, 50)}..."`);
              playTTS(qa.answer).catch(ttsError => {
                console.error('[InterviewHistory] TTS 재생도 실패:', ttsError);
                setPlayingIndex(null);
              });
            } catch (fallbackError) {
              console.error('[InterviewHistory] 폴백 처리 중 오류:', fallbackError);
              setPlayingIndex(null);
            }
          };

          // 타임아웃 설정 (5초 후에도 로드되지 않으면 TTS로 대체)
          const loadTimeout = setTimeout(() => {
            console.warn('오디오 로드 시간 초과, TTS로 대체합니다.');
            cleanup();
            playTTS(qa.answer);
          }, 5000);
          
          audio.oncanplaythrough = () => {
            clearTimeout(loadTimeout);
            audio.play().catch((e) => {
              console.error('오디오 play() 실패:', e);
              cleanup();
              playTTS(qa.answer);
            });
          };

          audio.onloadeddata = () => {
            clearTimeout(loadTimeout);
          };
          
          audio.src = audioUrl;
          audio.load(); // 명시적으로 로드
        } catch (error) {
          console.error('오디오 객체 생성 실패:', error);
          await playTTS(qa.answer);
        }
      } else {
        // 녹음된 음성이 없으면 TTS 사용
        await playTTS(qa.answer);
      }
    } catch (error) {
      console.error('답변 재생 오류:', error);
      setPlayingIndex(null);
    }
  };

  const playTTS = async (answer: string) => {
    try {
      console.log('[InterviewHistory] TTS 재생 시작:', {
        textLength: answer.length,
        preview: answer.substring(0, 100),
        ttsSupported: webSpeechAPI.isTTSSupported()
      });
      
      if (!webSpeechAPI.isTTSSupported()) {
        throw new Error('브라우저에서 TTS를 지원하지 않습니다.');
      }
      
      await webSpeechAPI.speak(answer, 'ko-KR');
      console.log('[InterviewHistory] TTS 재생 완료');
      setPlayingIndex(null);
    } catch (error) {
      console.error('[InterviewHistory] TTS 재생 오류:', error);
      alert('음성 재생에 실패했습니다. 브라우저에서 음성 합성을 지원하지 않거나 오류가 발생했습니다.');
      setPlayingIndex(null);
    }
  };

  if (selectedInterview) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          maxWidth: '900px',
          margin: '0 auto',
          color: '#333'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #f0f0f0'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
              📝 면접 기록 상세
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => deleteInterview(selectedInterview.id)}
                style={{
                  padding: '10px 20px',
                  background: '#ff4757',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🗑️ 삭제
              </button>
              <button
                onClick={() => {
                  stopAllAudio();
                  setSelectedInterview(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ← 목록으로
              </button>
            </div>
          </div>

          {/* 면접 기본 정보 */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '25px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>🏢 면접 정보</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div><strong>회사:</strong> {selectedInterview.config.company}</div>
              <div><strong>직무:</strong> {selectedInterview.config.position}</div>
              <div><strong>경력:</strong> {selectedInterview.config.experience}</div>
              <div><strong>면접 날짜:</strong> {formatDate(selectedInterview.timestamp)}</div>
              {selectedInterview.config.companyType && (
                <div><strong>회사 규모:</strong> {selectedInterview.config.companyType}</div>
              )}
              {selectedInterview.config.industryType && (
                <div><strong>업계:</strong> {selectedInterview.config.industryType}</div>
              )}
            </div>
          </div>

          {/* 면접 통계 */}
          <div style={{
            background: '#e8f5e8',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '25px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d5016' }}>📊 면접 통계</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div><strong>실제 면접시간:</strong> {formatTime(selectedInterview.statistics.actualInterviewTime || selectedInterview.statistics.totalTime - (selectedInterview.statistics.totalFeedbackTime || 0))}</div>
              <div><strong>답변 시간:</strong> {formatTime(selectedInterview.statistics.totalAnswerTime)}</div>
              <div><strong>사고 시간:</strong> {formatTime(selectedInterview.statistics.totalThinkingTime)} <span style={{fontSize: '0.8rem', color: '#666'}}>(질문 듣고 생각하는 시간)</span></div>
              {selectedInterview.statistics.totalFeedbackTime && (
                <div><strong>면접관 피드백:</strong> {formatTime(selectedInterview.statistics.totalFeedbackTime)}</div>
              )}
              <div><strong>질문 개수:</strong> {selectedInterview.statistics.questionCount}개</div>
            </div>
          </div>

          {/* 질문과 답변 */}
          <div>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>💬 질문과 답변</h3>
            {selectedInterview.questionsAndAnswers.map((qa, index) => (
              <div key={index} style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: '#667eea',
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
                  Q{index + 1}. {qa.question}
                </div>
                <div style={{
                  background: '#f8f9fc',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #4CAF50',
                  lineHeight: '1.6'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>답변:</strong> {qa.answer}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '15px' 
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <strong>답변 시간:</strong> {formatTime(qa.answerTime)}
                    </div>
                    <button
                      onClick={() => playAnswer(qa, index)}
                      style={{
                        padding: '8px 16px',
                        background: playingIndex === index ? '#ff4757' : (qa.audioBlob ? '#2196F3' : '#4CAF50'),
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {playingIndex === index ? (
                        <>⏹️ 중지</>
                      ) : qa.audioBlob ? (
                        <>🎵 내 목소리 듣기</>
                      ) : (
                        <>🔊 TTS로 듣기</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxWidth: '1200px',
        margin: '0 auto',
        color: '#333'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
            📚 면접 기록
          </h2>
          <button
            onClick={() => {
              stopAllAudio();
              onBack();
            }}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ← 메인으로
          </button>
        </div>

        {/* 저장 공간 정보 */}
        {storageInfo.quota > 0 && (
          <div style={{
            background: '#fff3cd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px',
            fontSize: '0.9rem'
          }}>
            💾 저장 공간: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)} 사용 중
            ({((storageInfo.used / storageInfo.quota) * 100).toFixed(1)}%)
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#666' }}>
            면접 기록을 불러오는 중...
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📝</div>
            <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>
              아직 저장된 면접 기록이 없습니다.
            </div>
            <div style={{ fontSize: '1rem', color: '#999' }}>
              면접을 완료하면 여기에 기록이 저장됩니다.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {interviews.map((interview) => (
              <div
                key={interview.id}
                onClick={() => setSelectedInterview(interview)}
                style={{
                  background: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>
                      {interview.config.company}
                    </h3>
                    <div style={{ color: '#666', fontSize: '1rem' }}>
                      {interview.config.position}
                    </div>
                  </div>
                  <div style={{
                    background: '#e8f5e8',
                    color: '#2d5016',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {interview.config.experience}
                  </div>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                  📅 {formatDate(interview.timestamp)}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '15px',
                  fontSize: '0.85rem'
                }}>
                  <div><strong>실제 면접:</strong> {formatTime(interview.statistics.actualInterviewTime || interview.statistics.totalTime - (interview.statistics.totalFeedbackTime || 0))}</div>
                  <div><strong>질문 수:</strong> {interview.statistics.questionCount}개</div>
                  <div><strong>답변 시간:</strong> {formatTime(interview.statistics.totalAnswerTime)}</div>
                  <div><strong>사고 시간:</strong> {formatTime(interview.statistics.totalThinkingTime)}</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  color: '#667eea',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  클릭하여 상세 보기 →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewHistory;