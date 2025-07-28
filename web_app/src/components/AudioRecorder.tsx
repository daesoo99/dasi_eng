import React, { useState, useRef, useCallback } from 'react';

interface Props {
  onAnswerComplete: (transcription: string) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<Props> = ({ onAnswerComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Web Speech API 사용
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
      
      mediaRecorder.start();
      setIsRecording(true);
      setTranscription('');
    } catch (error) {
      console.error('Recording start error:', error);
      alert('마이크 접근 권한이 필요합니다.');
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
    if (disabled || isProcessing) return '처리 중...';
    if (isRecording) return '🎤 녹음 중... (클릭하여 중지)';
    if (transcription) return '답변이 인식되었습니다. 제출해주세요.';
    return '🎤 클릭하여 답변 시작';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      margin: '30px 0'
    }}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: 'none',
          cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          transition: 'all 0.3s',
          background: isRecording ? '#ff4757' : '#667eea',
          color: 'white',
          opacity: disabled || isProcessing ? 0.6 : 1,
          transform: isRecording ? 'scale(1.05)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isProcessing) {
            e.currentTarget.style.background = isRecording ? '#ff3742' : '#5a6fd8';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isProcessing) {
            e.currentTarget.style.background = isRecording ? '#ff4757' : '#667eea';
          }
        }}
      >
        {isRecording ? '⏹️' : '🎤'}
      </button>
      
      <div style={{
        fontSize: '1.1rem',
        color: '#666',
        textAlign: 'center'
      }}>
        {getStatusText()}
      </div>
      
      {transcription && (
        <div style={{
          background: '#f8f9fc',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #e0e0e0',
          minHeight: '100px',
          width: '100%',
          marginTop: '20px'
        }}>
          <strong>인식된 답변:</strong>
          <p style={{
            margin: '10px 0 0 0',
            color: '#333',
            lineHeight: '1.5',
            fontSize: '1rem'
          }}>
            {transcription}
          </p>
          <button 
            onClick={handleSubmitAnswer}
            disabled={!transcription.trim() || isProcessing}
            style={{
              background: '#2ed573',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: !transcription.trim() || isProcessing ? 'not-allowed' : 'pointer',
              marginTop: '15px',
              opacity: !transcription.trim() || isProcessing ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (transcription.trim() && !isProcessing) {
                e.currentTarget.style.background = '#26d468';
              }
            }}
            onMouseLeave={(e) => {
              if (transcription.trim() && !isProcessing) {
                e.currentTarget.style.background = '#2ed573';
              }
            }}
          >
            답변 제출
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;