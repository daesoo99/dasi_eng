import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const RecorderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin: 30px 0;
`;

const RecordButton = styled.button<{ isRecording: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  transition: all 0.3s;
  
  ${props => props.isRecording ? `
    background: #ff4757;
    color: white;
    animation: ${pulse} 1s infinite;
    
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
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    animation: none;
  }
`;

const StatusText = styled.div`
  font-size: 1.1rem;
  color: #666;
  text-align: center;
`;

const TranscriptionBox = styled.div`
  background: #f8f9fc;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  min-height: 100px;
  width: 100%;
  margin-top: 20px;
`;

const TranscriptionText = styled.p`
  margin: 0;
  color: #333;
  line-height: 1.5;
  font-size: 1rem;
`;

const SubmitButton = styled.button`
  background: #2ed573;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  
  &:hover {
    background: #26d468;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface Props {
  onAnswerComplete: (transcription: string) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<Props> = ({ onAnswerComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'ko-KR';
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscription(finalTranscript + interimTranscript);
        };
        
        recognitionRef.current.start();
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setTranscription('');
    } catch (error) {
      console.error('Recording start error:', error);
      alert('Microphone access permission is required.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  const handleSubmitAnswer = () => {
    if (transcription.trim()) {
      setIsProcessing(true);
      onAnswerComplete(transcription.trim());
      setTranscription('');
      setIsProcessing(false);
    }
  };

  const getStatusText = () => {
    if (disabled || isProcessing) return 'Processing...';
    if (isRecording) return '🎤 Recording... (Click to stop)';
    if (transcription) return 'Answer recognized. Please submit.';
    return '🎤 Click to start answering';
  };

  return (
    <RecorderContainer>
      <RecordButton
        isRecording={isRecording}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
      >
        {isRecording ? '⏹️' : '🎤'}
      </RecordButton>
      
      <StatusText>{getStatusText()}</StatusText>
      
      {transcription && (
        <TranscriptionBox>
          <strong>Recognized Answer:</strong>
          <TranscriptionText>{transcription}</TranscriptionText>
          <SubmitButton 
            onClick={handleSubmitAnswer}
            disabled={!transcription.trim() || isProcessing}
          >
            Submit Answer
          </SubmitButton>
        </TranscriptionBox>
      )}
    </RecorderContainer>
  );
};

export default AudioRecorder;