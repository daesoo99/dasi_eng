import React, { useState } from 'react';
import { useSpeech } from '@/hooks/useSpeech';

interface SpeechRecorderProps {
  onResult: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  phraseHints?: string[];
  disabled?: boolean;
  className?: string;
}

export const SpeechRecorder: React.FC<SpeechRecorderProps> = ({
  onResult,
  onError,
  phraseHints = [],
  disabled = false,
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const speech = useSpeech({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    preferCloudSTT: false, // Start with browser STT
    language: 'en-US',
  });

  const handleMouseDown = async () => {
    if (disabled || speech.isRecording) return;
    
    setIsPressed(true);
    try {
      await speech.startRecording(phraseHints);
    } catch (error) {
      setIsPressed(false);
      if (onError) {
        onError(error instanceof Error ? error.message : '녹음 시작 실패');
      }
    }
  };

  const handleMouseUp = async () => {
    if (!speech.isRecording) return;
    
    setIsPressed(false);
    try {
      const result = await speech.stopRecording(phraseHints);
      if (result && result.transcript) {
        onResult(result.transcript, result.confidence);
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : '음성 인식 실패');
      }
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  const getButtonState = () => {
    if (disabled) return 'disabled';
    if (speech.isProcessing) return 'processing';
    if (speech.isRecording || isPressed) return 'recording';
    return 'idle';
  };

  const getButtonText = () => {
    const state = getButtonState();
    switch (state) {
      case 'disabled':
        return '음성 인식 불가';
      case 'processing':
        return '처리중...';
      case 'recording':
        return '말하세요...';
      default:
        return '마이크 버튼을 길게 누르세요';
    }
  };

  const getButtonClasses = () => {
    const baseClasses = `
      relative flex flex-col items-center justify-center
      w-24 h-24 rounded-full border-2 
      font-medium text-sm transition-all duration-200
      select-none cursor-pointer
      ${className}
    `;

    const state = getButtonState();
    switch (state) {
      case 'disabled':
        return `${baseClasses} bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed`;
      case 'processing':
        return `${baseClasses} bg-yellow-100 border-yellow-300 text-yellow-700 animate-pulse`;
      case 'recording':
        return `${baseClasses} bg-red-100 border-red-500 text-red-700 shadow-lg scale-105`;
      default:
        return `${baseClasses} bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400`;
    }
  };

  if (!speech.isSTTAvailable) {
    return (
      <div className="flex flex-col items-center space-y-2 text-gray-500">
        <div className="w-24 h-24 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-center">음성인식<br/>불가</span>
        </div>
        <p className="text-xs">브라우저가 음성 인식을 지원하지 않습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        className={getButtonClasses()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop if mouse leaves
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled}
      >
        {/* Microphone Icon */}
        <div className="text-xl mb-1">
          {getButtonState() === 'recording' ? '🔴' : '🎤'}
        </div>
        
        {/* Recording indicator */}
        {speech.isRecording && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Status text */}
      <p className="text-sm text-center max-w-xs text-gray-600">
        {getButtonText()}
      </p>

      {/* Error display */}
      {speech.error && (
        <div className="text-xs text-red-600 text-center max-w-xs bg-red-50 p-2 rounded">
          {speech.error}
          <button 
            onClick={speech.clearError}
            className="ml-2 text-red-800 underline"
          >
            확인
          </button>
        </div>
      )}

      {/* Last result display */}
      {speech.lastResult && (
        <div className="text-xs text-green-600 text-center max-w-xs bg-green-50 p-2 rounded">
          인식됨: "{speech.lastResult.transcript}"
          {speech.lastResult.confidence && (
            <span className="block text-gray-500">
              신뢰도: {Math.round(speech.lastResult.confidence * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};