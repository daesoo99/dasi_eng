import React, { useState } from 'react';
import InterviewSetup from './components/InterviewSetup.tsx';
import InterviewRoom from './components/InterviewRoom.tsx';

type AppState = 'setup' | 'interview';

interface InterviewConfig {
  position: string;
  experience: string;
}

function App() {
  const [currentState, setCurrentState] = useState<AppState>('setup');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);

  const startInterview = (config: InterviewConfig) => {
    setInterviewConfig(config);
    setCurrentState('interview');
  };

  const endInterview = () => {
    setCurrentState('setup');
    setInterviewConfig(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {currentState === 'setup' && (
        <InterviewSetup onStart={startInterview} />
      )}
      
      {currentState === 'interview' && interviewConfig && (
        <InterviewRoom 
          config={interviewConfig} 
          onEnd={endInterview}
        />
      )}
    </div>
  );
}

export default App;