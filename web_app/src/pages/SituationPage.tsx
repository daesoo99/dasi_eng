/**
 * Situation Page - 상황 학습 페이지
 */

import React, { useState } from 'react';

interface SituationPageProps {
  // TODO: Props 타입 정의 추가
}

interface Situation {
  id: string;
  title: string;
  description: string;
  level: string;
  scenarios: Array<{
    id: string;
    situation: string;
    dialogue: Array<{
      speaker: string;
      text: string;
    }>;
  }>;
}

const SituationPage: React.FC<SituationPageProps> = () => {
  const [selectedSituation, setSelectedSituation] = useState<string>('restaurant');
  const [currentScenario, setCurrentScenario] = useState(0);
  const [userResponse, setUserResponse] = useState<string>('');

  const situations = [
    { id: 'restaurant', title: '레스토랑에서', description: '음식 주문하기' },
    { id: 'airport', title: '공항에서', description: '체크인 및 탑승' },
    { id: 'hotel', title: '호텔에서', description: '체크인 및 문의' },
    { id: 'shopping', title: '쇼핑할 때', description: '제품 문의 및 구매' },
    { id: 'business', title: '비즈니스 미팅', description: '회의 및 프레젠테이션' },
  ];

  const mockDialogue = [
    { speaker: 'Waiter', text: 'Good evening! Welcome to our restaurant. How many people are in your party?' },
    { speaker: 'You', text: '[Your response here]' },
    { speaker: 'Waiter', text: 'Right this way, please. Here are your menus.' },
    { speaker: 'You', text: '[Your response here]' }
  ];

  const handleSituationChange = (situationId: string) => {
    setSelectedSituation(situationId);
    setCurrentScenario(0);
    setUserResponse('');
  };

  const handleResponseSubmit = () => {
    // TODO: 사용자 응답 분석 및 피드백 제공
    console.log('User response:', userResponse);
  };

  return (
    <div className="situation-page">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">상황 학습</h1>
        
        {/* 상황 선택 섹션 */}
        <div className="situation-selector bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">학습할 상황 선택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {situations.map((situation) => (
              <div
                key={situation.id}
                onClick={() => handleSituationChange(situation.id)}
                className={`situation-card p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedSituation === situation.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <h3 className="font-medium text-gray-800 mb-1">{situation.title}</h3>
                <p className="text-sm text-gray-600">{situation.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 대화 시나리오 섹션 */}
        <div className="scenario-section bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            대화 시나리오: {situations.find(s => s.id === selectedSituation)?.title}
          </h2>
          
          <div className="dialogue-container mb-6">
            {mockDialogue.map((line, index) => (
              <div key={index} className={`dialogue-line mb-3 ${line.speaker === 'You' ? 'user-line' : 'other-line'}`}>
                <div className={`p-3 rounded-lg ${
                  line.speaker === 'You' 
                    ? 'bg-blue-50 ml-8' 
                    : 'bg-gray-50 mr-8'
                }`}>
                  <div className="speaker-name font-medium text-sm mb-1">
                    {line.speaker}
                  </div>
                  {line.speaker === 'You' && line.text.includes('[Your response here]') ? (
                    <textarea
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="여기에 응답을 입력하세요..."
                      className="w-full p-2 border border-gray-300 rounded resize-none"
                      rows={2}
                    />
                  ) : (
                    <div className="dialogue-text">{line.text}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 응답 제출 버튼 */}
          <div className="response-actions">
            <button 
              onClick={handleResponseSubmit}
              disabled={!userResponse.trim()}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 mr-3"
            >
              응답 제출
            </button>
            <button className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors">
              🔊 음성으로 응답
            </button>
          </div>
        </div>

        {/* 상황별 핵심 표현 섹션 */}
        <div className="key-expressions bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">핵심 표현</h2>
          <div className="expressions-grid grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="expression-card bg-green-50 rounded-lg p-3">
              <div className="expression font-medium text-green-800 mb-1">
                Table for two, please.
              </div>
              <div className="translation text-sm text-green-600">
                두 명 자리 부탁합니다.
              </div>
            </div>
            <div className="expression-card bg-green-50 rounded-lg p-3">
              <div className="expression font-medium text-green-800 mb-1">
                Could I see the menu?
              </div>
              <div className="translation text-sm text-green-600">
                메뉴 좀 볼 수 있을까요?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SituationPage;