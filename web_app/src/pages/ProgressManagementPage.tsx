import React, { useState } from 'react';
import ProgressDashboard from '../components/ProgressDashboard';

const ProgressManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'analytics'>('overview');
  const userId = 'dev-user'; // 실제로는 auth context에서 가져옴

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProgressDashboard userId={userId} />;
      
      case 'detailed':
        return (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 상세 진도 분석</h2>
            
            {/* 스테이지별 상세 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 완료율 분포 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 완료율 분포</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">90% 이상 (마스터)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">12개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">70-89% (완료)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">18개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">50-69% (진행중)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-yellow-600">8개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">50% 미만 (시작)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-red-600">6개</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 학습 패턴 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ 학습 패턴</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>가장 활발한 시간</span>
                      <span className="font-medium text-blue-600">오후 7-9시</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>평균 세션 시간</span>
                      <span className="font-medium text-green-600">25분</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>주간 학습 일수</span>
                      <span className="font-medium text-purple-600">5.2일</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>연속 학습 기록</span>
                      <span className="font-medium text-orange-600">12일</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 월별 진도 그래프 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 월별 진도 변화</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {['1월', '2월', '3월', '4월', '5월', '6월'].map((month, index) => {
                  const height = Math.random() * 200 + 20;
                  const completedStages = Math.floor(Math.random() * 15) + 5;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-200 rounded-t" style={{ height: '200px' }}>
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all duration-500"
                          style={{ height: `${(height / 200) * 100}%`, marginTop: 'auto' }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600 mt-2">{month}</div>
                      <div className="text-xs font-medium text-blue-600">{completedStages}개</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 고급 분석</h2>
            
            {/* 실력 변화 추이 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 실력 변화 추이</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">정확도 변화</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">이번 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">85%</span>
                        <span className="text-xs text-green-600">↗ +3%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">지난 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">82%</span>
                        <span className="text-xs text-green-600">↗ +1%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">이번 달 평균</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">83%</span>
                        <span className="text-xs text-green-600">↗ +5%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">응답 속도 변화</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">이번 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">4.2초</span>
                        <span className="text-xs text-blue-600">↘ -0.3초</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">지난 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">4.5초</span>
                        <span className="text-xs text-blue-600">↘ -0.2초</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">이번 달 평균</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">4.7초</span>
                        <span className="text-xs text-blue-600">↘ -0.8초</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 학습 권장사항 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 개인 맞춤 학습 권장사항</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">🎯</span>
                  <div>
                    <h4 className="font-medium text-gray-900">집중 학습 영역</h4>
                    <p className="text-sm text-gray-600">
                      Level 3의 관계대명사와 Level 4의 비즈니스 표현에서 정확도가 낮습니다. 
                      이 영역을 집중적으로 복습하는 것을 권장합니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">⏰</span>
                  <div>
                    <h4 className="font-medium text-gray-900">최적 학습 시간</h4>
                    <p className="text-sm text-gray-600">
                      오후 7-9시에 가장 좋은 성과를 보이고 있습니다. 
                      이 시간대에 어려운 내용을 학습하시면 더 효과적입니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-purple-500 text-xl">📚</span>
                  <div>
                    <h4 className="font-medium text-gray-900">학습량 조절</h4>
                    <p className="text-sm text-gray-600">
                      현재 일일 25분씩 학습하고 있습니다. 
                      조금 더 늘려서 30-35분으로 하면 더 빠른 진전을 볼 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 진도 관리</h1>
          
          {/* 탭 네비게이션 */}
          <div className="flex gap-1">
            {[
              { key: 'overview', label: '전체 현황', icon: '📋' },
              { key: 'detailed', label: '상세 분석', icon: '📊' },
              { key: 'analytics', label: '고급 분석', icon: '🔍' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      {renderTabContent()}
    </div>
  );
};

export default ProgressManagementPage;