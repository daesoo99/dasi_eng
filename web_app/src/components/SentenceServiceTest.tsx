import React, { useState, useCallback } from 'react';
import { getRandomSentence, getRandomSentences, type RandomSentenceResult } from '../services/sentenceService';

interface TestResult {
  level: number;
  stageId: string;
  result: RandomSentenceResult | null;
  error: string | null;
  timestamp: number;
}

export const SentenceServiceTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testSingleSentence = useCallback(async (level: number, stageId: string) => {
    const timestamp = Date.now();
    console.log(`[DEBUG] 🧪 테스트 시작: Level ${level}, Stage ${stageId}`);
    
    try {
      const result = await getRandomSentence(level, stageId);
      setResults(prev => [...prev, { level, stageId, result, error: null, timestamp }]);
      console.log(`[DEBUG] ✅ 테스트 성공:`, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setResults(prev => [...prev, { level, stageId, result: null, error: errorMsg, timestamp }]);
      console.error(`[DEBUG] ❌ 테스트 실패:`, error);
    }
  }, []);

  const runBatchTest = useCallback(async () => {
    setIsLoading(true);
    setResults([]);
    
    const testCases = [
      { level: 4, stageId: 'Lv4-A1-S01' }, // Should work - situational folder
      { level: 2, stageId: 'Lv2-P1-S01' }, // Should work - banks folder
      { level: 3, stageId: 'Lv3-P1-S01' }, // Should work - banks folder
      { level: 1, stageId: 'Lv1-P1-S01' }, // May not work - testing fallback
      { level: 5, stageId: 'Lv5-A1-S01' }, // May not work - testing fallback
      { level: 6, stageId: 'Lv6-D1-S01' }, // May not work - testing fallback
    ];

    for (const testCase of testCases) {
      await testSingleSentence(testCase.level, testCase.stageId);
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsLoading(false);
  }, [testSingleSentence]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🧪 Sentence Service Test</h2>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={runBatchTest}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded"
          >
            {isLoading ? '🔄 Testing...' : '🚀 Run Tests'}
          </button>
          <button
            onClick={clearResults}
            disabled={isLoading}
            className="bg-gray-500 hover:bg-gray-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded"
          >
            🗑️ Clear Results
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results ({results.length})</h3>
            <div className="space-y-2">
              {results.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${test.result ? '✅' : '❌'}`}>
                        {test.result ? '✅' : '❌'}
                      </span>
                      <span className="font-mono text-sm text-gray-600">
                        Level {test.level} - {test.stageId}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(test.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {test.result ? (
                    <div className="bg-green-50 p-3 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-green-800">Korean:</p>
                          <p className="text-green-900">{test.result.sentence.kr}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">English:</p>
                          <p className="text-green-900">{test.result.sentence.en}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-green-600">
                        <span>Source: {test.result.source}</span>
                        <span>Total: {test.result.total} sentences</span>
                        <span>ID: {test.result.sentence.id}</span>
                        <span>Form: {test.result.sentence.form}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-sm font-medium text-red-800">Error:</p>
                      <p className="text-red-900 text-sm">{test.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentenceServiceTest;