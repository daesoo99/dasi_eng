import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { InterviewConfig, InterviewQuestion } from '../types/interview';
import AudioRecorder from './AudioRecorder';
import QuestionDisplay from './QuestionDisplay';
import { interviewAPI } from '../services/api';

const RoomContainer = styled.div`
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  max-width: 800px;
  width: 90%;
  min-height: 500px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
`;

const Timer = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
`;

const QuestionCounter = styled.div`
  font-size: 1.2rem;
  color: #666;
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
`;

const ControlButton = styled.button<{ variant?: 'danger' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  
  ${props => props.variant === 'danger' ? `
    background: #ff4757;
    color: white;
    
    &:hover {
      background: #ff3742;
    }
  ` : `
    background: #667eea;
    color: white;
    
    &:hover {
      background: #5a6fd8;
    }
  `}
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #666;
`;

interface Props {
  config: InterviewConfig;
  onEndInterview: () => void;
}

const InterviewRoom: React.FC<Props> = ({ config, onEndInterview }) => {
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewId, setInterviewId] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    startInterview();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleEndInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startInterview = async () => {
    try {
      const response = await interviewAPI.start({
        position: config.position,
        experience: config.experience
      });
      
      setInterviewId(response.interviewId);
      setCurrentQuestion({
        id: Date.now().toString(),
        text: response.question,
        timestamp: Date.now()
      });
      setQuestionCount(1);
      setIsLoading(false);
    } catch (error) {
      console.error('Interview start error:', error);
      setIsLoading(false);
    }
  };

  const handleAnswerComplete = async (transcription: string) => {
    if (!currentQuestion) return;
    
    try {
      setIsLoading(true);
      
      const evaluation = await interviewAPI.evaluate({
        question: currentQuestion.text,
        answer: transcription,
        position: config.position
      });
      
      console.log('Answer evaluation:', evaluation);
      
      if (questionCount < 5) {
        const nextQuestion = await interviewAPI.getNextQuestion({
          interviewId,
          position: config.position,
          experience: config.experience,
          previousQuestions: [currentQuestion.text]
        });
        
        setCurrentQuestion({
          id: Date.now().toString(),
          text: nextQuestion.question,
          timestamp: Date.now()
        });
        setQuestionCount(prev => prev + 1);
      } else {
        handleEndInterview();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Answer processing error:', error);
      setIsLoading(false);
    }
  };

  const handleEndInterview = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onEndInterview();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && !currentQuestion) {
    return (
      <RoomContainer>
        <LoadingSpinner>
          Preparing interview...
        </LoadingSpinner>
      </RoomContainer>
    );
  }

  return (
    <RoomContainer>
      <Header>
        <QuestionCounter>Question {questionCount}/5</QuestionCounter>
        <Timer>{formatTime(timeLeft)}</Timer>
      </Header>
      
      {currentQuestion && (
        <QuestionDisplay 
          question={currentQuestion.text}
          isLoading={isLoading}
        />
      )}
      
      <AudioRecorder 
        onAnswerComplete={handleAnswerComplete}
        disabled={isLoading}
      />
      
      <ControlButtons>
        <ControlButton variant="danger" onClick={handleEndInterview}>
          End Interview
        </ControlButton>
      </ControlButtons>
    </RoomContainer>
  );
};

export default InterviewRoom;