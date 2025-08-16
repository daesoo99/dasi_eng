import React, { useState, useRef, useCallback, useImperativeHandle } from 'react';

interface Props {
  onAnswerComplete: (transcription: string, audioBlob?: Blob) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
}

const AudioRecorder = React.forwardRef<{ startRecording: () => void; stopRecording: () => void; }, Props>(
  ({ onAnswerComplete, onRecordingStart, disabled }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const finalTranscriptRef = useRef<string>('');

    const stopRecordingAndProcess = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setIsProcessing(true);
    }, [isRecording]);

    const startRecording = useCallback(async () => {
      if (isRecording || disabled) return;

      finalTranscriptRef.current = '';
      audioChunksRef.current = [];
      setIsProcessing(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Speech Recognition
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'en-US'; // Changed to English

          recognitionRef.current.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
              }
            }
            finalTranscriptRef.current = transcript;
          };

          recognitionRef.current.start();
        }

        // Media Recorder
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onAnswerComplete(finalTranscriptRef.current, audioBlob);
          stream.getTracks().forEach(track => track.stop());
          setIsProcessing(false);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        onRecordingStart?.();

      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Microphone access is required to start the practice.');
      }
    }, [isRecording, disabled, onAnswerComplete, onRecordingStart]);

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording: stopRecordingAndProcess,
    }), [startRecording, stopRecordingAndProcess]);

    const getStatusText = () => {
      if (disabled || isProcessing) return 'Processing...';
      if (isRecording) return '🎙️ Recording... Speak now!';
      return '🎤 Click to start recording';
    };

    return (
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <div
          onClick={isRecording ? stopRecordingAndProcess : startRecording}
          style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: isRecording ? '#ff4757' : '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
            opacity: disabled || isProcessing ? 0.6 : 1,
            margin: '0 auto 20px auto',
            color: 'white',
            fontSize: '48px',
            transition: 'all 0.3s ease'
          }}
        >
          {isRecording ? '⏹️' : '🎤'}
        </div>
        <h3 style={{ color: '#333', fontSize: '18px' }}>
          {getStatusText()}
        </h3>
      </div>
    );
  }
);

AudioRecorder.displayName = 'AudioRecorder';

export default AudioRecorder;