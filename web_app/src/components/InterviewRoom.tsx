import React, { useState, useEffect, useRef } from 'react';
import AudioRecorder from './AudioRecorder.tsx';
import QuestionDisplay from './QuestionDisplay.tsx';

interface InterviewConfig {
  position: string;
  experience: string;
}

interface Props {
  config: InterviewConfig;
  onEnd: () => void;
}

const InterviewRoom: React.FC<Props> = ({ config, onEnd }) => {
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewId, setInterviewId] = useState<string>('');

  useEffect(() => {
    startInterview();
  }, []);

  const startInterview = async () => {
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: config.position,
          experience: config.experience
        })
      });
      
      const data = await response.json();
      setInterviewId(data.interviewId);
      setCurrentQuestion(data.question);
      setQuestionCount(1);
      setIsLoading(false);
    } catch (error) {
      console.error('Interview start error:', error);
      setCurrentQuestion('자기소개를 해주세요.');
      setQuestionCount(1);
      setIsLoading(false);
    }
  };

  const handleAnswerComplete = async (transcription: string) => {
    if (!currentQuestion) return;
    
    try {
      setIsLoading(true);
      
      // 답변 평가
      const evaluationResponse = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          answer: transcription,
          position: config.position
        })
      });
      
      const evaluation = await evaluationResponse.json();
      console.log('평가 결과:', evaluation);
      
      // 다음 질문 생성 (최대 5개)
      if (questionCount < 5) {
        const nextQuestionResponse = await fetch('/api/interview/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId,
            position: config.position,
            experience: config.experience,
            previousQuestions: [currentQuestion]
          })
        });
        
        const nextData = await nextQuestionResponse.json();
        setCurrentQuestion(nextData.question);
        setQuestionCount(prev => prev + 1);
      } else {
        // 면접 종료
        alert('면접이 완료되었습니다!');
        onEnd();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Answer processing error:', error);
      setIsLoading(false);
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
        maxWidth: '800px',
        width: '100%',
        minHeight: '500px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            질문 {questionCount}/5
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            {config.position} 면접
          </div>
        </div>
        
        {isLoading && !currentQuestion ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            fontSize: '1.2rem',
            color: '#666'
          }}>
            면접을 준비하고 있습니다...
          </div>
        ) : (
          <>
            <QuestionDisplay 
              question={currentQuestion}
              isLoading={isLoading}
            />
            
            <AudioRecorder 
              onAnswerComplete={handleAnswerComplete}
              disabled={isLoading}
            />
          </>
        )}
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '30px'
        }}>
          <button 
            onClick={onEnd}
            style={{
              padding: '12px 24px',
              background: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff3742';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ff4757';
            }}
          >
            면접 종료
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;