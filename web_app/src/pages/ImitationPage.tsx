/**
 * Imitation Page - 모방 학습 페이지
 */

import React, { useState, useRef } from 'react';

interface ImitationPageProps {
  // TODO: Props 타입 정의 추가
}

const ImitationPage: React.FC<ImitationPageProps> = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [currentSentence, setCurrentSentence] = useState('Hello, how are you?');
  const [feedback, setFeedback] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const startRecording = async () => {
    setIsRecording(true);
    // TODO: 실제 녹음 로직 구현 (기존 AudioRecorder 컴포넌트 활용)
  };

  const stopRecording = async () => {
    setIsRecording(false);
    // TODO: 녹음 중단 및 분석 로직 구현
  };

  const playTargetAudio = () => {
    // TODO: TTS를 통한 목표 문장 재생
    console.log('Playing target sentence:', currentSentence);
  };

  return (
    <div className="imitation-page">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">모방 학습</h1>
        
        {/* 목표 문장 섹션 */}
        <div className="target-sentence-section bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">목표 문장</h2>
          <div className="sentence-display bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-lg text-blue-800 font-medium">{currentSentence}</p>
          </div>
          
          <div className="audio-controls mb-4">
            <button 
              onClick={playTargetAudio}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors mr-3"
            >
              🔊 목표 발음 듣기
            </button>
            <button className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
              느리게 재생
            </button>
          </div>
        </div>

        {/* 녹음 섹션 */}
        <div className="recording-section bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">발음 연습</h2>
          
          <div className="recording-controls mb-4">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors"
              >
                🎤 녹음 시작
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="bg-gray-500 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition-colors"
              >
                ⏹️ 녹음 중단
              </button>
            )}
          </div>

          {isRecording && (
            <div className="recording-indicator">
              <div className="flex items-center justify-center">
                <div className="animate-pulse bg-red-500 rounded-full h-4 w-4 mr-2"></div>
                <span className="text-red-500 font-medium">녹음 중...</span>
              </div>
            </div>
          )}

          {audioUrl && (
            <div className="recorded-audio mt-4">
              <h3 className="font-medium mb-2">녹음된 음성</h3>
              <audio ref={audioRef} controls className="w-full">
                <source src={audioUrl} type="audio/webm" />
              </audio>
            </div>
          )}
        </div>

        {/* 피드백 섹션 */}
        {feedback && (
          <div className="feedback-section bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">발음 피드백</h2>
            <div className="feedback-content bg-yellow-50 rounded-lg p-4">
              <p className="text-yellow-800">{feedback}</p>
            </div>
          </div>
        )}

        {/* 진행 상황 */}
        <div className="progress-section bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">학습 진행 상황</h2>
          <div className="progress-bar bg-gray-200 rounded-full h-2 mb-2">
            <div className="progress-fill bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
          </div>
          <p className="text-sm text-gray-600">전체 진행률: 35% (7/20 문장 완료)</p>
        </div>
      </div>
    </div>
  );
};

export default ImitationPage;