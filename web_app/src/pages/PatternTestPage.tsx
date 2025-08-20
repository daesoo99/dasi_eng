import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatternTrainingFlowSimple } from '@/components/PatternTrainingFlowSimple';

export const PatternTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentQuestion] = useState({
    korean: "나는 학생이다",
    english: "I am a student"
  });

  const handleResult = (userAnswer: string, isCorrect: boolean, confidence: number, responseTime: number) => {
    console.log('Test Result:', { userAnswer, isCorrect, confidence, responseTime });
    alert(`Result: ${isCorrect ? 'Correct' : 'Incorrect'}\nYour answer: "${userAnswer}"\nExpected: "${currentQuestion.english}"\nConfidence: ${confidence}\nResponse time: ${responseTime}ms`);
  };

  const handleError = (error: string) => {
    console.error('Test Error:', error);
    alert(`Error: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← 홈으로 돌아가기
          </button>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🧪 Pattern Training Test
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            패턴 훈련 시스템 테스트 페이지
          </p>
        </div>

        {/* Test Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">📋 테스트 방법</h3>
          <ol className="text-yellow-700 space-y-2 list-decimal list-inside">
            <li>아래 "시작하기" 버튼을 클릭하세요</li>
            <li>한국어 문제가 음성으로 재생됩니다</li>
            <li>사고시간 카운트다운 후 음성 인식이 시작됩니다</li>
            <li>영어로 답변하세요: <strong>"I am a student"</strong></li>
            <li>결과가 표시됩니다</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800">
              <strong>중요:</strong> 마이크 권한을 허용해야 음성 인식이 작동합니다.
            </p>
          </div>
        </div>

        {/* Pattern Training Flow */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <PatternTrainingFlowSimple
            koreanText={currentQuestion.korean}
            expectedEnglish={currentQuestion.english}
            onResult={handleResult}
            onError={handleError}
            stage={2}
            autoStart={false}
            showCorrectAnswer={true}
            className="min-h-[400px]"
          />
        </div>

        {/* Test Results Area */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 테스트 결과</h3>
          <p className="text-gray-600">
            테스트 결과는 브라우저 콘솔과 알림창으로 확인할 수 있습니다.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>예상되는 테스트 시나리오:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>음성 인식 성공: "I am a student" → 정답 처리</li>
              <li>음성 인식 실패: 다른 답변 또는 무응답 → 오답 처리</li>
              <li>마이크 권한 거부 → 오류 메시지 표시</li>
              <li>브라우저 호환성 문제 → 오류 메시지 표시</li>
            </ul>
          </div>
        </div>

        {/* Browser Compatibility Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🌐 브라우저 호환성</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">지원 브라우저</h4>
              <ul className="text-blue-700 space-y-1">
                <li>✅ Chrome (권장)</li>
                <li>✅ Edge</li>
                <li>✅ Safari (iOS/macOS)</li>
                <li>✅ Samsung Internet</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">제한사항</h4>
              <ul className="text-blue-700 space-y-1">
                <li>❌ Firefox (Web Speech API 제한적)</li>
                <li>❌ Internet Explorer</li>
                <li>⚠️ HTTPS 연결 필요</li>
                <li>⚠️ 마이크 권한 필요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};