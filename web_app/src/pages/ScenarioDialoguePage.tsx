import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  scenarioDialogueService, 
  ScenarioCategory, 
  DialogueScenario, 
  DialogueSession, 
  DialogueTurn 
} from '../services/scenarioDialogue';

const ScenarioDialoguePage: React.FC = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [categories, setCategories] = useState<ScenarioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<DialogueScenario | null>(null);
  const [currentSession, setCurrentSession] = useState<DialogueSession | null>(null);
  const [currentTurn, setCurrentTurn] = useState<DialogueTurn | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    speaker: 'user' | 'ai';
    message: string;
    feedback?: string;
    score?: number;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesData = await scenarioDialogueService.getScenarioCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (category: ScenarioCategory) => {
    setSelectedCategory(category);
    setSelectedScenario(null);
  };

  const handleScenarioSelect = async (scenario: DialogueScenario) => {
    setSelectedScenario(scenario);
    try {
      const session = await scenarioDialogueService.startDialogueSession('current-user', scenario.id);
      setCurrentSession(session);
      
      // 첫 번째 AI 턴이 있으면 표시
      if (scenario.turns && scenario.turns.length > 0) {
        const firstTurn = scenario.turns[0];
        if (firstTurn.speaker === 'ai') {
          setChatHistory([{
            speaker: 'ai',
            message: firstTurn.text_en,
            timestamp: new Date()
          }]);
          setCurrentTurn(firstTurn);
        }
      }
    } catch (error) {
      console.error('Failed to start dialogue session:', error);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !currentSession || isLoading) return;

    setIsLoading(true);
    
    // 사용자 입력을 채팅 히스토리에 추가
    const userMessage = {
      speaker: 'user' as const,
      message: userInput,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      const response = await scenarioDialogueService.processUserTurn(currentSession.sessionId, userInput);
      
      // AI 응답을 채팅 히스토리에 추가
      const aiMessage = {
        speaker: 'ai' as const,
        message: response.aiResponse,
        feedback: response.feedback,
        score: response.score,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiMessage]);

      if (response.isCompleted) {
        setIsCompleted(true);
        const summary = await scenarioDialogueService.completeDialogueSession(currentSession.sessionId);
        setSessionSummary(summary);
      } else if (response.nextTurn) {
        setCurrentTurn(response.nextTurn);
      }
    } catch (error) {
      console.error('Failed to process user turn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setSelectedCategory(null);
    setSelectedScenario(null);
    setCurrentSession(null);
    setCurrentTurn(null);
    setChatHistory([]);
    setIsCompleted(false);
    setSessionSummary(null);
    setUserInput('');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '초급';
      case 'intermediate': return '중급';
      case 'advanced': return '고급';
      default: return difficulty;
    }
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">시나리오 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              🎭 시나리오 대화 모드
            </h1>
          </div>
          
          {currentSession && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Turn {chatHistory.filter(h => h.speaker === 'user').length}
              </span>
              <button
                onClick={handleRestart}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                다시 시작
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {!selectedCategory ? (
          /* Category Selection */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">대화 시나리오 선택</h2>
              <p className="text-gray-600">상황에 맞는 대화를 연습해보세요</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-200 border border-gray-100"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{category.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                    <div className="text-xs text-gray-500">
                      {category.scenarios.length}개 시나리오
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedScenario ? (
          /* Scenario Selection */
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-600 hover:text-gray-800 mr-3"
              >
                ← 뒤로
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  {selectedCategory.icon} {selectedCategory.name}
                </h2>
                <p className="text-gray-600">{selectedCategory.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedCategory.scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario)}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-200 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{scenario.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                      {getDifficultyText(scenario.difficulty)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{scenario.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>⏱️ {scenario.estimatedTime}분</span>
                      <span>💬 {scenario.totalTurns}턴</span>
                    </div>
                    <span className="text-blue-600 font-medium">시작하기 →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="bg-white rounded-2xl shadow-xl h-[70vh] flex flex-col">
            {/* Scenario Info Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-800">{selectedScenario.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedScenario.difficulty)}`}>
                  {getDifficultyText(selectedScenario.difficulty)}
                </span>
              </div>
              <p className="text-sm text-gray-600">{selectedScenario.context}</p>
              <p className="text-xs text-blue-600 mt-1">목표: {selectedScenario.objective}</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-2xl p-3 ${
                    chat.speaker === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p>{chat.message}</p>
                    {chat.feedback && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-800">💡 {chat.feedback}</p>
                        {chat.score && (
                          <p className="text-xs text-green-600 mt-1">점수: {chat.score}/100</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {!isCompleted && (
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleUserSubmit} className="flex space-x-3">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="영어로 답변해보세요..."
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!userInput.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    전송
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Session Summary Modal */}
        {isCompleted && sessionSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">🎉</div>
                <h3 className="text-2xl font-bold text-gray-800">대화 완료!</h3>
                <p className="text-lg text-blue-600 font-semibold mt-2">
                  최종 점수: {sessionSummary.finalScore}/100
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 요약</h4>
                  <p className="text-sm text-gray-600">{sessionSummary.summary}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🏆 성취</h4>
                  <div className="space-y-1">
                    {sessionSummary.achievements.map((achievement: string, index: number) => (
                      <div key={index} className="flex items-center text-sm text-green-700">
                        <span className="mr-2">✓</span>
                        {achievement}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">💡 개선 사항</h4>
                  <div className="space-y-1">
                    {sessionSummary.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="flex items-center text-sm text-blue-700">
                        <span className="mr-2">→</span>
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  다른 시나리오 시도
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  홈으로 가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioDialoguePage;