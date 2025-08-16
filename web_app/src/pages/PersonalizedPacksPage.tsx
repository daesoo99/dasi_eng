import React, { useState, useEffect } from 'react';
import { personalizedPackService, PersonalizedPack, WeakArea } from '../services/personalizedPacks';
import { useNavigate } from 'react-router-dom';

const PersonalizedPacksPage: React.FC = () => {
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [userPacks, setUserPacks] = useState<PersonalizedPack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWeakAreas, setSelectedWeakAreas] = useState<string[]>([]);
  const [packOptions, setPackOptions] = useState({
    difficulty: 'intermediate',
    sentenceCount: 20,
    focusType: 'mixed' as 'grammar' | 'vocabulary' | 'mixed'
  });
  const [showPackCreator, setShowPackCreator] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [areas, packs] = await Promise.all([
        personalizedPackService.analyzeWeakAreas('current-user'),
        personalizedPackService.getUserPacks('current-user')
      ]);
      setWeakAreas(areas);
      setUserPacks(packs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePack = async () => {
    setIsLoading(true);
    try {
      const newPack = await personalizedPackService.generatePersonalizedPack('current-user', {
        targetWeakAreas: selectedWeakAreas,
        ...packOptions
      });
      setUserPacks([newPack, ...userPacks]);
      setShowPackCreator(false);
      setSelectedWeakAreas([]);
    } catch (error) {
      console.error('Failed to create pack:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeakAreaToggle = (areaType: string) => {
    setSelectedWeakAreas(prev =>
      prev.includes(areaType)
        ? prev.filter(type => type !== areaType)
        : [...prev, areaType]
    );
  };

  const handlePackSelect = (pack: PersonalizedPack) => {
    // Navigate to study page with personalized pack
    navigate('/study', { 
      state: { 
        mode: 'personalized',
        pack: pack
      }
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'grammar': return '📝';
      case 'vocabulary': return '📚';
      case 'pronunciation': return '🗣️';
      default: return '🎯';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && weakAreas.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">약점 분석 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 개인 맞춤 학습팩
          </h1>
          <p className="text-gray-600 text-lg">
            약점 분석 결과로 만든 나만의 학습 프로그램
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Weak Areas Analysis */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                📊 약점 분석 결과
              </h2>
              
              {weakAreas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>학습 데이터를 분석하여 약점을 파악합니다</p>
                  <p className="text-sm mt-2">더 많은 학습을 진행해보세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakAreas.map((area, index) => (
                    <div 
                      key={index} 
                      className="border-l-4 border-orange-500 bg-orange-50 p-3 rounded-r-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center text-sm font-medium">
                          {getCategoryIcon(area.category)}
                          <span className="ml-2 capitalize">{area.category}</span>
                        </span>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                          {area.frequency}회 오답
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{area.type}</p>
                      <p className="text-xs text-gray-600 mt-1">{area.description}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowPackCreator(true)}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
              >
                💡 새 학습팩 만들기
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🚀 빠른 실행</h3>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    const grammarPack = await personalizedPackService.getGrammarFocusedPack(
                      weakAreas.filter(a => a.category === 'grammar').map(a => a.type),
                      'intermediate'
                    );
                    handlePackSelect(grammarPack);
                  }}
                  className="w-full bg-purple-100 text-purple-800 py-2 px-4 rounded-lg hover:bg-purple-200 transition-colors"
                  disabled={!weakAreas.some(a => a.category === 'grammar')}
                >
                  📝 문법 집중 모드
                </button>
                <button
                  onClick={async () => {
                    const vocabPack = await personalizedPackService.getVocabularyFocusedPack(
                      weakAreas.filter(a => a.category === 'vocabulary').map(a => a.type),
                      'intermediate'
                    );
                    handlePackSelect(vocabPack);
                  }}
                  className="w-full bg-green-100 text-green-800 py-2 px-4 rounded-lg hover:bg-green-200 transition-colors"
                  disabled={!weakAreas.some(a => a.category === 'vocabulary')}
                >
                  📚 어휘 집중 모드
                </button>
              </div>
            </div>
          </div>

          {/* My Packs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📦 내 학습팩</h2>
                <span className="text-sm text-gray-500">{userPacks.length}개</span>
              </div>

              {userPacks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-xl font-medium text-gray-700 mb-2">아직 학습팩이 없습니다</p>
                  <p className="text-gray-500 mb-6">약점 분석 결과를 바탕으로 첫 번째 학습팩을 만들어보세요</p>
                  <button
                    onClick={() => setShowPackCreator(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
                  >
                    첫 번째 학습팩 만들기
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {userPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="border rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-white to-gray-50"
                      onClick={() => handlePackSelect(pack)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">
                          {pack.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(pack.difficulty)}`}>
                          {pack.difficulty}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{pack.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>📝 {pack.sentences.length}문장</span>
                        <span>⏱️ {pack.estimatedTime}분</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pack.completionRate}%` }}
                        ></div>
                      </div>

                      {/* Target Weak Areas */}
                      <div className="flex flex-wrap gap-1">
                        {pack.targetWeakAreas.slice(0, 3).map((area, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                          >
                            {getCategoryIcon(area.category)} {area.type}
                          </span>
                        ))}
                        {pack.targetWeakAreas.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            +{pack.targetWeakAreas.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pack Creator Modal */}
        {showPackCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">🎯 새 학습팩 만들기</h3>
                  <button
                    onClick={() => setShowPackCreator(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Target Weak Areas Selection */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-3">집중할 약점 영역</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {weakAreas.map((area, index) => (
                      <label 
                        key={index}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWeakAreas.includes(area.type)}
                          onChange={() => handleWeakAreaToggle(area.type)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {getCategoryIcon(area.category)} {area.type}
                            </span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              {area.frequency}회 오답
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
                    <select
                      value={packOptions.difficulty}
                      onChange={(e) => setPackOptions({...packOptions, difficulty: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="beginner">초급</option>
                      <option value="intermediate">중급</option>
                      <option value="advanced">고급</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">문장 수</label>
                    <select
                      value={packOptions.sentenceCount}
                      onChange={(e) => setPackOptions({...packOptions, sentenceCount: parseInt(e.target.value)})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value={10}>10문장</option>
                      <option value={20}>20문장</option>
                      <option value={30}>30문장</option>
                      <option value={50}>50문장</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">집중 타입</label>
                    <select
                      value={packOptions.focusType}
                      onChange={(e) => setPackOptions({...packOptions, focusType: e.target.value as any})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="mixed">종합</option>
                      <option value="grammar">문법</option>
                      <option value="vocabulary">어휘</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPackCreator(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreatePack}
                    disabled={selectedWeakAreas.length === 0 || isLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isLoading ? '생성 중...' : '학습팩 만들기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedPacksPage;