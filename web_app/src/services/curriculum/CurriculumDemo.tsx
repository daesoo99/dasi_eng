/**
 * 새로운 커리큘럼 아키텍처 데모 컴포넌트
 * 프로토타입이 잘 작동하는지 테스트용
 */

import React, { useState } from 'react';
import { LevelServiceFactory } from './LevelServiceFactory';
import { Level4ServiceTest } from './__tests__/Level4Service.test';
import { LegacyQuestionItem } from './types/CurriculumTypes';

export const CurriculumDemo: React.FC = () => {
  const [questions, setQuestions] = useState<LegacyQuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const handleGenerateQuestions = async (level: number, stage: number) => {
    setLoading(true);
    try {
      const generated = await LevelServiceFactory.generateQuestions(level, stage);
      setQuestions(generated);
      setTestResults([`✅ Level ${level} Stage ${stage}: ${generated.length}개 문제 생성 완료`]);
    } catch (error) {
      setTestResults([`❌ 오류 발생: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async () => {
    setLoading(true);
    setTestResults(['🧪 테스트 실행 중...']);
    
    try {
      // 콘솔 출력을 캡처하기 위한 임시 방법
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };

      await Level4ServiceTest.runAllTests();
      
      console.log = originalLog;
      setTestResults(logs);
    } catch (error) {
      setTestResults([`❌ 테스트 실행 오류: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-blue-600">
        🧪 새로운 커리큘럼 아키텍처 데모
      </h1>
      
      <div className="space-y-6">
        {/* 컨트롤 패널 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">테스트 컨트롤</h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleRunTests}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? '테스트 중...' : '🧪 전체 테스트 실행'}
            </button>
            
            <button
              onClick={() => handleGenerateQuestions(4, 1)}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              Level 4 Stage 1 생성
            </button>
            
            <button
              onClick={() => handleGenerateQuestions(4, 2)}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              Level 4 Stage 2 생성
            </button>
            
            <button
              onClick={() => handleGenerateQuestions(5, 1)}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300"
            >
              Level 5 Stage 1 (폴백)
            </button>
          </div>
        </div>

        {/* 테스트 결과 */}
        {testResults.length > 0 && (
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
            <h3 className="text-white mb-2">📊 테스트 결과:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))}
          </div>
        )}

        {/* 생성된 문제들 */}
        {questions.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              📝 생성된 문제들 ({questions.length}개)
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.slice(0, 10).map((question, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="font-semibold text-blue-600">
                    #{index + 1} {question.pattern}
                  </div>
                  <div className="text-gray-800">
                    🇰🇷 {question.korean}
                  </div>
                  <div className="text-gray-600">
                    🇺🇸 {question.english}
                  </div>
                  <div className="text-xs text-gray-500">
                    Level {question.level} | Stage {question.stage}
                  </div>
                </div>
              ))}
              
              {questions.length > 10 && (
                <div className="text-center text-gray-500">
                  ... 그리고 {questions.length - 10}개 더
                </div>
              )}
            </div>
          </div>
        )}

        {/* 아키텍처 정보 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🏗️ 새 아키텍처 특징</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>✅ <strong>강한 결합 해결:</strong> PatternDataManager 대신 LevelServiceFactory 사용</li>
            <li>✅ <strong>로드맵 활용:</strong> docs/curriculum의 실제 로드맵 파싱</li>
            <li>✅ <strong>104개 문장 생성:</strong> 스테이지별 충분한 문제 제공</li>
            <li>✅ <strong>확장성:</strong> Level별 독립적 서비스 관리</li>
            <li>✅ <strong>안전성:</strong> 기존 시스템과 분리된 프로토타입</li>
          </ul>
        </div>

        {/* 사용법 */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📖 테스트 방법</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>"전체 테스트 실행" 버튼으로 기본 기능 테스트</li>
            <li>"Level 4 Stage 1 생성" 으로 실제 문제 생성 확인</li>
            <li>생성된 문제가 "나는 학생이야" 대신 적절한 Level 4 문장인지 확인</li>
            <li>브라우저 콘솔에서 <code>window.testLevel4Service.runAllTests()</code> 실행 가능</li>
          </ol>
        </div>
      </div>
    </div>
  );
};