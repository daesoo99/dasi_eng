import React, { useState } from 'react';

interface InterviewConfig {
  position: string;
  experience: string;
  duration?: number;
}

interface Props {
  onStart: (config: InterviewConfig) => void;
}

const InterviewSetup: React.FC<Props> = ({ onStart }) => {
  const [position, setPosition] = useState('');
  const [experience, setExperience] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (position && experience) {
      onStart({ position, experience });
    }
  };

  return (
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
        maxWidth: '500px',
        width: '100%'
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '1.8rem'
        }}>
          AI 면접 설정
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500'
            }}>
              지원 직무
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="예: 프론트엔드 개발자, 백엔드 개발자"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500'
            }}>
              경력 수준
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'white',
                boxSizing: 'border-box'
              }}
              required
            >
              <option value="">경력 수준을 선택하세요</option>
              <option value="신입">신입 (0년)</option>
              <option value="주니어">주니어 (1-3년)</option>
              <option value="미드레벨">미드레벨 (4-7년)</option>
              <option value="시니어">시니어 (8년+)</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            disabled={!position || !experience}
            style={{
              width: '100%',
              padding: '15px',
              background: position && experience 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: position && experience ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => {
              if (position && experience) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            면접 시작하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default InterviewSetup;