import React, { useState } from 'react';
import { PracticeConfig } from '../App';

interface Props {
  onStart: (config: PracticeConfig) => void;
  onAudioTest?: () => void;
  onShowHistory?: () => void;
}

const PracticeSetup: React.FC<Props> = ({ onStart, onAudioTest, onShowHistory }) => {
  const [level, setLevel] = useState('middle');
  const [topic, setTopic] = useState('free_talking');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ level, topic });
  };

  const levels = {
    newborn: '신생아 (1-2 단어)',
    kindergarten: '유치원생 (간단한 문장)',
    elementary: '초등학생 (기본 문장)',
    middle: '중학생 (일상 대화)',
    high: '고등학생 (논리적 대화)',
    expert: '전문가 (심층 토론)',
    interview: '면접 대비 (직무 관련)',
    native: '원어민 (자유 대화)',
  };

  const topics = {
    free_talking: '자유 주제 (Free Talking)',
    animals: '동물 (Animals)',
    holidays: '휴일 (Holidays)',
    movies: '영화 (Movies)',
    music: '음악 (Music)',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '500px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px', fontSize: '1.8rem' }}>
          DASI English - AI 영어 대화
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Level Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '600' }}>
              🚀 1. 학습 레벨 선택
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid #667eea', borderRadius: '8px', fontSize: '16px', background: 'white' }}
            >
              {Object.entries(levels).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          {/* Topic Selection */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '600' }}>
              📚 2. 대화 주제 선택
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '2px solid #764ba2', borderRadius: '8px', fontSize: '16px', background: 'white' }}
            >
              {Object.entries(topics).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            {onAudioTest && (
                <button type="button" onClick={onAudioTest} style={{ flex: 1, padding: '12px', background: '#4facfe', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    🎙️ 음성 테스트
                </button>
            )}
            {onShowHistory && (
                <button type="button" onClick={onShowHistory} style={{ flex: 1, padding: '12px', background: '#a8edea', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    📚 대화 기록
                </button>
            )}
          </div>
          
          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            대화 시작하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default PracticeSetup;