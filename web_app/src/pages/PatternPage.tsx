/**
 * Pattern Page - 패턴 학습 페이지
 */

import React, { useState, useEffect } from 'react';

interface PatternPageProps {
  // TODO: Props 타입 정의 추가
}

interface PatternData {
  id: string;
  title: string;
  level: string;
  patterns: Array<{
    id: string;
    pattern: string;
    meaning: string;
    examples: string[];
  }>;
}

const PatternPage: React.FC<PatternPageProps> = () => {
  const [currentPattern, setCurrentPattern] = useState<PatternData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('1');

  useEffect(() => {
    // TODO: 패턴 데이터 로드
    setIsLoading(false);
  }, [selectedLevel]);

  return (
    <div className="pattern-page">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">패턴 학습</h1>
        
        {/* 레벨 선택 */}
        <div className="level-selector mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            학습 레벨 선택
          </label>
          <select 
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            <option value="1">Level 1 - 기본 패턴</option>
            <option value="2">Level 2 - 기본 문법</option>
            <option value="3">Level 3 - 고급 문법</option>
            <option value="4">Level 4 - 비즈니스</option>
            <option value="5">Level 5 - 학술</option>
            <option value="6">Level 6 - 전문</option>
          </select>
        </div>

        {/* 패턴 학습 영역 */}
        <div className="pattern-learning-area bg-white rounded-lg shadow-md p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">패턴 데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="pattern-content">
              <h2 className="text-xl font-semibold mb-4">
                Level {selectedLevel} 패턴 학습
              </h2>
              
              {/* TODO: PatternTrainingFlow 컴포넌트 통합 */}
              <div className="pattern-display mb-6">
                <div className="pattern-card bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-blue-800 mb-2">현재 패턴</h3>
                  <p className="text-blue-600 text-lg mb-2">I want to + 동사원형</p>
                  <p className="text-sm text-gray-600">의미: ~하고 싶다</p>
                </div>
                
                <div className="examples mb-4">
                  <h4 className="font-medium mb-2">예문</h4>
                  <ul className="space-y-2">
                    <li className="bg-gray-50 rounded px-3 py-2">
                      I want to learn English.
                    </li>
                    <li className="bg-gray-50 rounded px-3 py-2">
                      I want to go home.
                    </li>
                  </ul>
                </div>
                
                <div className="practice-section">
                  <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
                    패턴 연습 시작
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatternPage;