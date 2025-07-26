import React, { useState } from 'react';
import styled from 'styled-components';
import InterviewSetup from './components/InterviewSetup';
import InterviewRoom from './components/InterviewRoom';
import { InterviewConfig } from './types/interview';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Header = styled.header`
  position: absolute;
  top: 0;
  width: 100%;
  text-align: center;
  padding: 20px;
  color: white;
  
  h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 300;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
`;

function App() {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);

  const handleStartInterview = (config: InterviewConfig) => {
    setInterviewConfig(config);
    setInterviewStarted(true);
  };

  const handleEndInterview = () => {
    setInterviewStarted(false);
    setInterviewConfig(null);
  };

  return (
    <AppContainer>
      <Header>
        <h1>🎤 AI 면접 시뮬레이터</h1>
      </Header>
      
      {!interviewStarted ? (
        <InterviewSetup onStartInterview={handleStartInterview} />
      ) : (
        <InterviewRoom 
          config={interviewConfig!} 
          onEndInterview={handleEndInterview} 
        />
      )}
    </AppContainer>
  );
}

export default App;