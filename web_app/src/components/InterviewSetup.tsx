import React, { useState } from 'react';
import styled from 'styled-components';
import { InterviewConfig } from '../types/interview';

const SetupContainer = styled.div`
  background: white;
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  max-width: 500px;
  width: 90%;
`;

const Title = styled.h2`
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 1.8rem;
`;

const FormGroup = styled.div`
  margin-bottom: 25px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const StartButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

interface Props {
  onStartInterview: (config: InterviewConfig) => void;
}

const InterviewSetup: React.FC<Props> = ({ onStartInterview }) => {
  const [position, setPosition] = useState('');
  const [experience, setExperience] = useState('');
  const [duration, setDuration] = useState(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (position && experience) {
      onStartInterview({
        position,
        experience,
        duration
      });
    }
  };

  return (
    <SetupContainer>
      <Title>면접 설정</Title>
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="position">지원 직무</Label>
          <Input
            id="position"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="예: 프론트엔드 개발자, 백엔드 개발자"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="experience">경력</Label>
          <Select
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
          >
            <option value="">경력을 선택해주세요</option>
            <option value="신입">신입 (0년)</option>
            <option value="주니어">주니어 (1-3년)</option>
            <option value="미들">미들 (4-7년)</option>
            <option value="시니어">시니어 (8년 이상)</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="duration">면접 시간 (분)</Label>
          <Select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={10}>10분</option>
            <option value={15}>15분</option>
            <option value={20}>20분</option>
            <option value={30}>30분</option>
          </Select>
        </FormGroup>
        
        <StartButton type="submit" disabled={!position || !experience}>
          면접 시작하기
        </StartButton>
      </form>
    </SetupContainer>
  );
};

export default InterviewSetup;