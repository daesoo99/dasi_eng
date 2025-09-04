import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAnswerEvaluation } from '@/hooks/useAnswerEvaluation';

interface Sentence {
  id: string;
  kr: string;
  en: string;
  form: 'aff' | 'neg' | 'wh_q';
}

interface StageData {
  stage_id: string;
  title: string;
  count: number;
  sentences: Sentence[];
  forms_distribution?: {
    aff: number;
    neg: number;
    wh_q: number;
  };
}

export const SituationalTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stageData, setStageData] = useState<StageData[]>([]);
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{type: 'correct' | 'incorrect' | null, message: string}>({type: null, message: ''});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const level = searchParams.get('level');
  const group = searchParams.get('group');
  const groupTitle = searchParams.get('title');

  // Answer evaluation hook with level-appropriate settings
  const { evaluate } = useAnswerEvaluation({
    level: parseInt(level || '4'),
    mode: 'situational',
    enableLogging: true
  });

  // Level별 그룹 스테이지 ID 매핑
  const levelGroupMapping: { [key: string]: { [key: string]: string[] } } = {
    '4': {
      '1': ['Lv4-A5-S17', 'Lv4-A5-S18', 'Lv4-A5-S19', 'Lv4-A5-S20'], // Customer Excellence
      '2': ['Lv4-A4-S13', 'Lv4-A4-S14', 'Lv4-A4-S15', 'Lv4-A4-S16'], // Professional Communication
      '3': ['Lv4-A1-S01', 'Lv4-A1-S02', 'Lv4-A1-S03', 'Lv4-A1-S04'], // Meeting Leadership
      '4': ['Lv4-A2-S05', 'Lv4-A2-S06', 'Lv4-A2-S07', 'Lv4-A2-S08'], // Presentation Mastery
      '5': ['Lv4-A3-S09', 'Lv4-A3-S10', 'Lv4-A3-S11', 'Lv4-A3-S12'], // Strategic Negotiation
      '6': ['Lv4-A6-S21', 'Lv4-A6-S22', 'Lv4-A6-S23', 'Lv4-A6-S24']  // Team Leadership
    },
    '5': {
      '1': ['Lv5-A1-S01', 'Lv5-A1-S02', 'Lv5-A1-S03', 'Lv5-A1-S04'], // Research Foundation
      '2': ['Lv5-A2-S05', 'Lv5-A2-S06', 'Lv5-A2-S07', 'Lv5-A2-S08'], // Academic Presentation
      '3': ['Lv5-A3-S09', 'Lv5-A3-S10', 'Lv5-A3-S11', 'Lv5-A3-S12'], // Research Methodology
      '4': ['Lv5-A4-S13', 'Lv5-A4-S14', 'Lv5-A4-S15', 'Lv5-A4-S16'], // Interdisciplinary Research
      '5': ['Lv5-A5-S17', 'Lv5-A5-S18', 'Lv5-A5-S19', 'Lv5-A5-S20'], // Publication & Peer Review
      '6': ['Lv5-A6-S21', 'Lv5-A6-S22', 'Lv5-A6-S23', 'Lv5-A6-S24']  // Academic Leadership
    },
    '6': {
      '1': ['Lv6-D1-S01', 'Lv6-D1-S02', 'Lv6-D1-S03'], // Legal Excellence
      '2': ['Lv6-D2-S04', 'Lv6-D2-S05', 'Lv6-D2-S06'], // Medical Professional
      '3': ['Lv6-D3-S07', 'Lv6-D3-S08', 'Lv6-D3-S09'], // Technical Engineering
      '4': ['Lv6-D4-S10', 'Lv6-D4-S11', 'Lv6-D4-S12']  // Financial Expertise
    }
  };

  const allSentences = stageData.flatMap(stage => stage.sentences);

  useEffect(() => {
    const loadStageData = async () => {
      if (!level || !group || !levelGroupMapping[level] || !levelGroupMapping[level][group]) {
        console.error('Invalid level or group:', level, group);
        return;
      }

      setIsLoading(true);
      const stageIds = levelGroupMapping[level][group];
      const loadedStages: StageData[] = [];

      for (const stageId of stageIds) {
        try {
          const response = await fetch(`/patterns/level_${level}_situational/${stageId}_bank.json`);
          if (response.ok) {
            const stageData = await response.json();
            loadedStages.push(stageData);
          } else {
            console.error(`Failed to load stage ${stageId}`);
          }
        } catch (error) {
          console.error(`Error loading stage ${stageId}:`, error);
        }
      }

      setStageData(loadedStages);
      setIsLoading(false);
    };

    loadStageData();
  }, [level, group]);

  useEffect(() => {
    if (allSentences.length > 0 && currentIndex < allSentences.length) {
      setCurrentSentence(allSentences[currentIndex]);
      setUserInput('');
      setFeedback({type: null, message: ''});
    }
  }, [allSentences, currentIndex]);

  const checkAnswer = () => {
    if (!currentSentence) return;

    // Use modular answer evaluation with contraction support
    const evaluation = evaluate(userInput, currentSentence.en);
    
    setScore(prev => ({
      correct: prev.correct + (evaluation.isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    setFeedback({
      type: evaluation.isCorrect ? 'correct' : 'incorrect',
      message: evaluation.isCorrect ? '정답입니다! 🎉' : evaluation.feedback
    });

    // 2초 후 다음 문제로
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !feedback.type) {
      checkAnswer();
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '1.5em' }}>
          상황학습 데이터 로딩 중... 🔄
        </div>
      </div>
    );
  }

  if (currentIndex >= allSentences.length) {
    const accuracy = Math.round((score.correct / score.total) * 100);
    
    return (
      <div style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          maxWidth: '500px'
        }}>
          <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>🎉 훈련 완료!</h1>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>
            {accuracy >= 90 ? '🏆' : accuracy >= 80 ? '🥈' : accuracy >= 70 ? '🥉' : '📚'}
          </div>
          <div style={{ fontSize: '2em', color: '#1f2937', marginBottom: '10px' }}>
            정확도: {accuracy}%
          </div>
          <div style={{ color: '#64748b', marginBottom: '30px' }}>
            {score.correct} / {score.total} 정답
          </div>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              홈으로
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              다시 도전
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #4338ca, #7c3aed)',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 15px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)'
            }}
          >
            ← 홈
          </button>

          <h1 style={{ fontSize: '2em', marginBottom: '10px' }}>
            {level === '4' ? '💼' : level === '5' ? '🎓' : '🎯'} Level {level} 상황학습 - {groupTitle}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
            <div>
              <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{currentIndex + 1}</div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>/ {allSentences.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{Math.round((score.correct / Math.max(score.total, 1)) * 100)}%</div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>정확도</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{score.correct}</div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>정답</div>
            </div>
          </div>
        </div>

        {/* 훈련 영역 */}
        <div style={{ padding: '40px' }}>
          {currentSentence && (
            <>
              <div style={{
                background: '#f8fafc',
                borderRadius: '15px',
                padding: '30px',
                textAlign: 'center',
                marginBottom: '30px',
                border: '2px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '1.2em', color: '#64748b', marginBottom: '15px' }}>
                  다음을 영어로 번역하세요:
                </div>
                <div style={{ fontSize: '1.8em', color: '#1f2937', fontWeight: 'bold' }}>
                  {currentSentence.kr}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="영어 번역을 입력하세요..."
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    fontSize: '18px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    outline: 'none',
                    background: feedback.type ? 
                      (feedback.type === 'correct' ? '#f0fdf4' : '#fef2f2') : 'white',
                    borderColor: feedback.type ?
                      (feedback.type === 'correct' ? '#10b981' : '#ef4444') : '#e2e8f0'
                  }}
                  disabled={!!feedback.type}
                />
              </div>

              {feedback.message && (
                <div style={{
                  padding: '15px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  background: feedback.type === 'correct' ? '#dcfce7' : '#fee2e2',
                  color: feedback.type === 'correct' ? '#166534' : '#dc2626',
                  marginBottom: '20px'
                }}>
                  {feedback.message}
                </div>
              )}

              {!feedback.type && (
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={checkAnswer}
                    disabled={!userInput.trim()}
                    style={{
                      background: userInput.trim() ? 
                        'linear-gradient(135deg, #10b981, #059669)' : '#e5e7eb',
                      color: userInput.trim() ? 'white' : '#9ca3af',
                      border: 'none',
                      padding: '15px 30px',
                      borderRadius: '10px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: userInput.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s'
                    }}
                  >
                    확인 ✓
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};