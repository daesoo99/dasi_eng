import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const QuestionContainer = styled.div`
  background: #f8f9fc;
  padding: 30px;
  border-radius: 12px;
  margin: 20px 0;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 5px solid #667eea;
  animation: ${fadeIn} 0.5s ease-out;
`;

const QuestionText = styled.p`
  font-size: 1.4rem;
  line-height: 1.6;
  color: #333;
  text-align: center;
  margin: 0;
  font-weight: 500;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: '';
    animation: loading 1.5s infinite;
  }
  
  @keyframes loading {
    0%, 20% { content: '●○○'; }
    40% { content: '○●○'; }
    60% { content: '○○●'; }
    80%, 100% { content: '●○○'; }
  }
`;

const SpeakerIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  color: #667eea;
  font-weight: 600;
  
  &::before {
    content: '🎤';
    font-size: 1.2rem;
  }
`;

interface Props {
  question: string;
  isLoading?: boolean;
}

const QuestionDisplay: React.FC<Props> = ({ question, isLoading }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [question]);

  useEffect(() => {
    if (currentIndex < question.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + question[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, question]);

  const playTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(question);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <QuestionContainer>
      <div style={{ width: '100%' }}>
        <SpeakerIcon>
          Interviewer Question
          {!isLoading && (
            <button
              onClick={playTextToSpeech}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginLeft: 'auto'
              }}
              title="Listen to Question"
            >
              🔊
            </button>
          )}
        </SpeakerIcon>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#666' }}>
            Preparing next question
            <LoadingDots />
          </div>
        ) : (
          <QuestionText>{displayedText}</QuestionText>
        )}
      </div>
    </QuestionContainer>
  );
};

export default QuestionDisplay;