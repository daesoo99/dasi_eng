/**
 * QuestionCard - 문제 카드 컴포넌트
 */

import React from 'react';

type Phase = 'idle' | 'tts' | 'countdown' | 'recognition' | 'waiting';
type EvaluationType = 'correct' | 'incorrect';

interface Question {
  ko: string;
  en: string;
}

interface QuestionCardProps {
  currentQuestion: Question;
  currentPhase: Phase;
  countdownText: string;
  recognitionTimeText: string;
  showAnswer: boolean;
  answerEvaluation: string;
  evaluationType: EvaluationType;
  recognitionResult: string;
  interimResult: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  currentQuestion,
  currentPhase,
  countdownText,
  recognitionTimeText,
  showAnswer,
  answerEvaluation,
  evaluationType,
  recognitionResult,
  interimResult
}) => {
  const getPhaseDisplay = () => {
    switch (currentPhase) {
      case 'tts':
        return (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="animate-pulse w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-blue-700 font-medium">한국어 음성 재생 중...</span>
            </div>
          </div>
        );
        
      case 'countdown':
        return (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-700 mb-2">{countdownText}</div>
              <span className="text-yellow-600">영어로 답하세요</span>
            </div>
          </div>
        );
        
      case 'recognition':
        return (
          <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-2">
              <div className="animate-pulse w-4 h-4 bg-red-500 rounded-full mr-3"></div>
              <span className="text-red-700 font-medium">음성 인식 중... 말씀하세요</span>
            </div>
            {recognitionTimeText && (
              <div className="text-center mb-2">
                <span className="text-2xl font-bold text-red-600">{recognitionTimeText}초</span>
                <span className="text-sm text-red-500 ml-2">남음</span>
              </div>
            )}
            {/* 실시간 중간 결과 표시 */}
            {interimResult && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <span className="text-sm text-gray-500">실시간 인식: </span>
                <span className="font-medium text-gray-700 italic">{interimResult}...</span>
              </div>
            )}
            {/* 최종 결과 표시 */}
            {recognitionResult && (
              <div className="mt-2 p-2 bg-white rounded border">
                <span className="text-sm text-gray-600 dark:text-gray-300">인식된 내용: </span>
                <span className="font-medium">{recognitionResult}</span>
              </div>
            )}
          </div>
        );
        
      case 'waiting':
        return (
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-green-700 font-medium">답변 처리 중...</div>
              {answerEvaluation && (
                <div className={`mt-2 p-3 rounded-lg ${
                  evaluationType === 'correct' 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-red-200 text-red-800'
                }`}>
                  {answerEvaluation}
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-colors duration-300">
      <div className="text-center mb-8">
        {/* Phase 상태 표시 */}
        {getPhaseDisplay()}
        
        {/* 한국어 문제 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {currentQuestion.ko || '문제를 불러오는 중...'}
          </h2>
        </div>
        
        {/* 영어 답안 (필요시 표시) */}
        {showAnswer && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-lg text-blue-700 dark:text-blue-300 font-medium">
              정답: {currentQuestion.en}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};