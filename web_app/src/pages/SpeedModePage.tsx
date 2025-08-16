import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeedModeSession } from '@/components/SpeedModeSession';
import { ExplanationModeSession } from '@/components/ExplanationModeSession';
import { MixedLevelSession } from '@/components/MixedLevelSession';
import type { SpeedModeSettings, ExplanationModeSettings, MixedLevelSettings } from '@/services/speedDifficultyModes';

type SessionMode = 'setup' | 'fast' | 'explanation' | 'mixed' | 'results';

const SpeedModePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState<SessionMode>('setup');
  const [selectedModeType, setSelectedModeType] = useState<'fast' | 'explanation' | 'mixed'>('fast');
  
  // 설정 상태들
  const [fastSettings, setFastSettings] = useState<SpeedModeSettings>({
    timeLimit: 3,
    showTimer: true,
    earlyFinishBonus: true,
    pressureLevel: 'medium'
  });
  
  const [explanationSettings, setExplanationSettings] = useState<ExplanationModeSettings>({
    showDetailedFeedback: true,
    includeGrammarNotes: true,
    includeExamples: true,
    audioExplanation: false,
    pauseAfterEachQuestion: true
  });
  
  const [mixedSettings, setMixedSettings] = useState<MixedLevelSettings>({
    includedLevels: [1, 2, 3],
    randomOrder: true,
    balanceByDifficulty: true,
    adaptiveSelection: false
  });
  
  const [questionCount, setQuestionCount] = useState(20);
  const [sessionResults, setSessionResults] = useState<any>(null);

  const userId = 'demo-user-123'; // 실제로는 auth context에서

  const handleStartSession = () => {
    setCurrentMode(selectedModeType);
  };

  const handleSessionComplete = (results: any) => {
    setSessionResults(results);
    setCurrentMode('results');
  };

  const handleExit = () => {
    setCurrentMode('setup');
    setSessionResults(null);
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚡ 속도/난이도 조절 모드</h1>
          <p className="text-gray-600">학습 목적에 맞는 모드를 선택하고 설정하세요</p>
        </div>

        {/* 모드 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 빠른 모드 */}
          <div 
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedModeType === 'fast' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedModeType('fast')}
          >
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">빠른 모드</h3>
              <p className="text-sm text-gray-600 mb-4">
                제한 시간 내 빠른 답변 연습<br/>
                반응속도와 직관력 향상
              </p>
              <div className="text-xs text-blue-600 font-medium">
                2-3초 제한, 보너스 점수
              </div>
            </div>
          </div>

          {/* 해설 모드 */}
          <div 
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedModeType === 'explanation' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedModeType('explanation')}
          >
            <div className="text-center">
              <div className="text-3xl mb-3">📚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">해설 모드</h3>
              <p className="text-sm text-gray-600 mb-4">
                상세한 문법 설명과 예문<br/>
                깊이 있는 이해와 학습
              </p>
              <div className="text-xs text-purple-600 font-medium">
                문법 노트, 예문, 해설
              </div>
            </div>
          </div>

          {/* 레벨 혼합 모드 */}
          <div 
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedModeType === 'mixed' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedModeType('mixed')}
          >
            <div className="text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">레벨 혼합</h3>
              <p className="text-sm text-gray-600 mb-4">
                L1~L6 다양한 레벨 문제<br/>
                종합적인 실력 테스트
              </p>
              <div className="text-xs text-green-600 font-medium">
                랜덤 출제, 난이도 균형
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 모드별 상세 설정 */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedModeType === 'fast' && '⚡ 빠른 모드 설정'}
            {selectedModeType === 'explanation' && '📚 해설 모드 설정'}
            {selectedModeType === 'mixed' && '🎯 레벨 혼합 설정'}
          </h3>

          {selectedModeType === 'fast' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제한 시간: {fastSettings.timeLimit}초
                </label>
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={fastSettings.timeLimit}
                  onChange={(e) => setFastSettings(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2초 (매우 빠름)</span>
                  <span>5초 (보통)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">압박 수준</label>
                <select
                  value={fastSettings.pressureLevel}
                  onChange={(e) => setFastSettings(prev => ({ ...prev, pressureLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">낮음 - 여유있게</option>
                  <option value="medium">보통 - 적당한 긴장감</option>
                  <option value="high">높음 - 최대 압박</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fastSettings.showTimer}
                    onChange={(e) => setFastSettings(prev => ({ ...prev, showTimer: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">타이머 표시</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fastSettings.earlyFinishBonus}
                    onChange={(e) => setFastSettings(prev => ({ ...prev, earlyFinishBonus: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">빠른 정답 보너스</span>
                </label>
              </div>
            </div>
          )}

          {selectedModeType === 'explanation' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={explanationSettings.showDetailedFeedback}
                    onChange={(e) => setExplanationSettings(prev => ({ ...prev, showDetailedFeedback: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">상세 피드백 표시</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={explanationSettings.includeGrammarNotes}
                    onChange={(e) => setExplanationSettings(prev => ({ ...prev, includeGrammarNotes: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">문법 노트 포함</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={explanationSettings.includeExamples}
                    onChange={(e) => setExplanationSettings(prev => ({ ...prev, includeExamples: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">예문 포함</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={explanationSettings.pauseAfterEachQuestion}
                    onChange={(e) => setExplanationSettings(prev => ({ ...prev, pauseAfterEachQuestion: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">문제마다 일시정지</span>
                </label>
              </div>
            </div>
          )}

          {selectedModeType === 'mixed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">포함할 레벨</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(level => (
                    <label key={level} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={mixedSettings.includedLevels.includes(level)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMixedSettings(prev => ({
                              ...prev,
                              includedLevels: [...prev.includedLevels, level]
                            }));
                          } else {
                            setMixedSettings(prev => ({
                              ...prev,
                              includedLevels: prev.includedLevels.filter(l => l !== level)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">L{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mixedSettings.randomOrder}
                    onChange={(e) => setMixedSettings(prev => ({ ...prev, randomOrder: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">랜덤 순서</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mixedSettings.balanceByDifficulty}
                    onChange={(e) => setMixedSettings(prev => ({ ...prev, balanceByDifficulty: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">난이도 균형</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={mixedSettings.adaptiveSelection}
                    onChange={(e) => setMixedSettings(prev => ({ ...prev, adaptiveSelection: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">실력 맞춤 선택</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 문제 수 설정 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            문제 수: {questionCount}개
          </label>
          <input
            type="range"
            min="10"
            max="50"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10개 (빠른 테스트)</span>
            <span>50개 (완전한 세션)</span>
          </div>
        </div>

        {/* 시작 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
          
          <button
            onClick={handleStartSession}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {selectedModeType === 'fast' && '⚡ 빠른 모드 시작'}
            {selectedModeType === 'explanation' && '📚 해설 모드 시작'}
            {selectedModeType === 'mixed' && '🎯 레벨 혼합 시작'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 세션 완료!</h2>
          <p className="text-gray-600">훌륭한 결과입니다!</p>
        </div>

        {sessionResults && (
          <div className="space-y-6">
            {/* 기본 결과 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{sessionResults.totalScore}</div>
                <div className="text-sm text-gray-600">총 점수</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{sessionResults.accuracy.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">정확도</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(sessionResults.averageResponseTime / 1000).toFixed(1)}초
                </div>
                <div className="text-sm text-gray-600">평균 응답시간</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">+{sessionResults.bonusPoints}</div>
                <div className="text-sm text-gray-600">보너스 점수</div>
              </div>
            </div>

            {/* 개선 영역 */}
            {sessionResults.improvementAreas?.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2">🎯 집중 학습 영역</h3>
                <div className="flex flex-wrap gap-2">
                  {sessionResults.improvementAreas.map((area: string, index: number) => (
                    <span key={index} className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 추천사항 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">💡 다음 단계</h3>
              <p className="text-blue-700 text-sm">{sessionResults.nextRecommendation}</p>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleExit}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            새 세션 시작
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  // 메인 렌더링
  if (currentMode === 'setup') {
    return renderSetup();
  } else if (currentMode === 'results') {
    return renderResults();
  } else if (currentMode === 'fast') {
    return (
      <SpeedModeSession
        userId={userId}
        settings={fastSettings}
        questionCount={questionCount}
        onComplete={handleSessionComplete}
        onExit={handleExit}
      />
    );
  } else if (currentMode === 'explanation') {
    return (
      <ExplanationModeSession
        userId={userId}
        settings={explanationSettings}
        questionCount={questionCount}
        onComplete={handleSessionComplete}
        onExit={handleExit}
      />
    );
  } else if (currentMode === 'mixed') {
    return (
      <MixedLevelSession
        userId={userId}
        settings={mixedSettings}
        questionCount={questionCount}
        onComplete={handleSessionComplete}
        onExit={handleExit}
      />
    );
  } else {
    return null;
  }
};

export default SpeedModePage;