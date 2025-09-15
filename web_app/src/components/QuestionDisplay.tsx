import React from 'react';

interface Props {
  question: string;
  isLoading?: boolean;
}

const QuestionDisplay: React.FC<Props> = ({ question, isLoading }) => {
  const playTextToSpeech = async () => {
    try {
      // 🔧 플러그인을 통한 TTS
      const ServiceContainer = (await import('@/container/ServiceContainer')).default;
      const container = ServiceContainer.getInstanceSync();
      const speechService = container.getSpeechProcessingService();

      await speechService.speakAnswer(question, {
        language: 'en-US',
        rate: 0.9,
        volume: 1.0,
        pitch: 1.0
      });
    } catch (error) {
      console.error('🔧 [QuestionDisplay] TTS failed:', error);
    }
  };

  return (
    <div style={{
      background: '#f8f9fc',
      padding: '30px',
      borderRadius: '12px',
      margin: '20px 0',
      minHeight: '150px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderLeft: '5px solid #667eea'
    }}>
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '15px',
          color: '#667eea',
          fontWeight: '600'
        }}>
          🤖 AI Question
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
              title="Listen to question"
            >
              🔊
            </button>
          )}
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>
            Preparing the next question...
          </div>
        ) : (
          <div style={{
            fontSize: '1.4rem',
            lineHeight: '1.6',
            color: '#333',
            textAlign: 'center',
            margin: '0',
            fontWeight: '500'
          }}>
            {question}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay;