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
      <Title>Interview Setup</Title>
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="position">Position Applied</Label>
          <Input
            id="position"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Frontend Developer, Backend Developer"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="experience">Experience Level</Label>
          <Select
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
          >
            <option value="">Please select your experience level</option>
            <option value="Entry-level">Entry-level (0 years)</option>
            <option value="Junior">Junior (1-3 years)</option>
            <option value="Mid-level">Mid-level (4-7 years)</option>
            <option value="Senior">Senior (8+ years)</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="duration">Interview Duration (minutes)</Label>
          <Select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
          </Select>
        </FormGroup>
        
        <StartButton type="submit" disabled={!position || !experience}>
          Start Interview
        </StartButton>
      </form>
    </SetupContainer>
  );
};

export default InterviewSetup;