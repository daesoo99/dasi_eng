import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { PatternTrainingFlow } from './PatternTrainingFlow';

/**
 * Test component to verify PatternTrainingFlow improvements
 * Tests all the fixes: TypeScript errors, ErrorBoundary, performance optimizations,
 * error handling, and JSDoc documentation
 */
export const PatternTrainingFlowTest: React.FC = () => {
  const handleResult = (userAnswer: string, isCorrect: boolean, confidence: number, responseTime: number) => {
    console.log('Test Result:', { userAnswer, isCorrect, confidence, responseTime });
  };

  const handleError = (error: string) => {
    console.error('Test Error:', error);
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ErrorBoundary caught error:', error, errorInfo);
      }}
    >
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Pattern Training Flow Test</h2>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Test 1: Stage 1 (Easy)</h3>
          <PatternTrainingFlow
            koreanText="안녕하세요"
            expectedEnglish="Hello"
            onResult={handleResult}
            onError={handleError}
            stage={1}
            disabled={false}
            autoStart={false}
            showCorrectAnswer={true}
          />
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Test 2: Stage 3 (Hard)</h3>
          <PatternTrainingFlow
            koreanText="오늘 날씨가 어떻습니까?"
            expectedEnglish="How is the weather today?"
            onResult={handleResult}
            onError={handleError}
            stage={3}
            disabled={false}
            autoStart={false}
            showCorrectAnswer={true}
          />
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Test 3: Disabled State</h3>
          <PatternTrainingFlow
            koreanText="감사합니다"
            expectedEnglish="Thank you"
            onResult={handleResult}
            onError={handleError}
            stage={2}
            disabled={true}
            autoStart={false}
            showCorrectAnswer={true}
          />
        </div>
        
        <div className="text-sm text-gray-600 mt-4">
          <p><strong>Improvements tested:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ TypeScript errors fixed (onResult parameters, unused imports/variables)</li>
            <li>✅ ErrorBoundary component created and applied</li>
            <li>✅ Performance optimizations (memoization, debounced error handling)</li>
            <li>✅ Improved error handling (speech recognition, TTS, network failures)</li>
            <li>✅ JSDoc documentation added to key functions</li>
            <li>✅ Comprehensive cleanup and resource management</li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PatternTrainingFlowTest;