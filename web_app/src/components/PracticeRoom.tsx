import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioRecorder from './AudioRecorder.tsx';
import QuestionDisplay from './QuestionDisplay.tsx';
import { webSpeechAPI } from '../services/webSpeechAPI.ts';
import { PracticeConfig } from '../App';

interface Props {
  config: PracticeConfig;
  onEnd: () => void;
}

const PracticeRoom: React.FC<Props> = ({ config, onEnd }) => {
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ question: string; answer: string; feedback: string; }>>([]);
  const audioRecorderRef = useRef<{ startRecording: () => void; stopRecording: () => void; }>(null);

  const startPractice = useCallback(async () => {
    setIsLoading(true);
    // TODO: API 호출로 변경
    const firstQuestion = `Let's talk about ${config.topic}. What's your favorite thing about it?`;
    setCurrentQuestion(firstQuestion);
    setIsLoading(false);
    await speak(firstQuestion);
    audioRecorderRef.current?.startRecording();
  }, [config.topic]);

  useEffect(() => {
    startPractice();
    return () => {
      webSpeechAPI.stopSpeaking();
    };
  }, [startPractice]);

  const handleAnswerComplete = async (transcription: string) => {
    if (!currentQuestion) return;

    setIsLoading(true);
    setShowFeedback(false);
    audioRecorderRef.current?.stopRecording();

    // TODO: API 호출로 변경
    const generatedFeedback = `That's an interesting point about "${transcription.substring(0, 20)}...". Your pronunciation is quite clear.`;
    setFeedback(generatedFeedback);
    
    const newHistory = [...conversationHistory, { question: currentQuestion, answer: transcription, feedback: generatedFeedback }];
    setConversationHistory(newHistory);

    setShowFeedback(true);
    await speak(generatedFeedback);

    // TODO: API 호출로 변경
    const nextQuestion = `Interesting. Tell me more about ${config.topic}.`;
    setCurrentQuestion(nextQuestion);
    setIsLoading(false);
    setShowFeedback(false);

    await speak(nextQuestion);
    audioRecorderRef.current?.startRecording();
  };

  const speak = async (text: string) => {
    try {
      await webSpeechAPI.speak(text, 'en-US');
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '800px', width: '100%', minHeight: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#333' }}>{config.level} Level: {config.topic}</h2>
          <button onClick={onEnd} style={{ padding: '10px 20px', background: '#ff4757', color: 'white', border: 'none', borderRadius: '8px' }}>End Practice</button>
        </div>

        {isLoading && !currentQuestion ? (
          <div>Loading...</div>
        ) : (
          <>
            <QuestionDisplay question={currentQuestion} isLoading={isLoading || showFeedback} />
            
            {showFeedback && (
              <div style={{ margin: '20px 0', padding: '20px', background: '#e8f5e9', borderRadius: '10px' }}>
                <h3 style={{ color: '#2e7d32' }}>Feedback</h3>
                <p style={{ color: '#333' }}>{feedback}</p>
              </div>
            )}

            <AudioRecorder
              ref={audioRecorderRef}
              onAnswerComplete={handleAnswerComplete}
              disabled={isLoading || showFeedback}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PracticeRoom;
