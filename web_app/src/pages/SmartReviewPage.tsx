import React, { useState, useEffect } from 'react';
import SmartReviewSession from '../components/SmartReviewSession';
import ReviewAnalyticsDashboard from '../components/ReviewAnalyticsDashboard';

interface ReviewResults {
  totalSentences: number;
  correctAnswers: number;
  averageTime: number;
  improvementAreas: string[];
}

const SmartReviewPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'session' | 'results'>('dashboard');
  const [sessionResults, setSessionResults] = useState<ReviewResults | null>(null);
  const userId = 'dev-user'; // 실제로는 auth context에서 가져옴

  const handleStartReview = () => {
    setCurrentView('session');
    setSessionResults(null);
  };

  const handleSessionComplete = (results: ReviewResults) => {
    setSessionResults(results);
    setCurrentView('results');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSessionResults(null);
  };

  const renderSessionResults = () => {
    if (!sessionResults) return null;

    const accuracyPercentage = Math.round((sessionResults.correctAnswers / sessionResults.totalSentences) * 100);
    const averageTimeSeconds = Math.round(sessionResults.averageTime / 1000);

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 복습 완료!</h2>
          <p className="text-gray-600">오늘의 복습 세션이 완료되었습니다.</p>
        </div>

        {/* 주요 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{sessionResults.totalSentences}</div>
            <div className="text-gray-600">복습한 문장</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{accuracyPercentage}%</div>
            <div className="text-gray-600">정확도</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{averageTimeSeconds}초</div>
            <div className="text-gray-600">평균 응답 시간</div>
          </div>
        </div>

        {/* 성과 분석 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 성과 분석</h3>
          
          {accuracyPercentage >= 80 ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <span className="text-green-500 text-2xl">🌟</span>
              <div>
                <h4 className="font-medium text-green-900">훌륭한 성과!</h4>
                <p className="text-green-700 text-sm">높은 정확도를 보여주고 있습니다. 더 어려운 단계로 도전해보세요!</p>
              </div>
            </div>
          ) : accuracyPercentage >= 60 ? (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <span className="text-yellow-500 text-2xl">📚</span>
              <div>
                <h4 className="font-medium text-yellow-900">좋은 진전!</h4>
                <p className="text-yellow-700 text-sm">꾸준히 향상되고 있습니다. 조금 더 집중해서 학습해보세요.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <span className="text-blue-500 text-2xl">💪</span>
              <div>
                <h4 className="font-medium text-blue-900">추가 학습이 필요해요</h4>
                <p className="text-blue-700 text-sm">기초를 다시 한번 점검하고 꾸준히 복습하면 향상될 거예요!</p>
              </div>
            </div>
          )}

          {/* 개선 영역 */}
          {sessionResults.improvementAreas.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🎯 집중 개선 영역</h4>
              <div className="space-y-2">
                {sessionResults.improvementAreas.map((area, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    {area}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 다음 단계 추천 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 다음 단계</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleStartReview}
              className="p-4 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left"
            >
              <h4 className="font-medium text-blue-900 mb-1">추가 복습하기</h4>
              <p className="text-sm text-blue-700">더 많은 문장으로 복습을 이어가세요</p>
            </button>
            
            <button
              onClick={handleBackToDashboard}
              className="p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left"
            >
              <h4 className="font-medium text-purple-900 mb-1">분석 보기</h4>
              <p className="text-sm text-purple-700">상세한 학습 분석을 확인하세요</p>
            </button>
          </div>
        </div>

        {/* 돌아가기 버튼 */}
        <div className="text-center">
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'session':
        return (
          <SmartReviewSession
            userId={userId}
            onComplete={handleSessionComplete}
          />
        );
      
      case 'results':
        return renderSessionResults();
      
      case 'dashboard':
      default:
        return (
          <div>
            {/* 대시보드 헤더 */}
            <div className="max-w-6xl mx-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">🧠 스마트 복습</h1>
                  <p className="text-gray-600">AI 기반 개인 맞춤 복습 시스템</p>
                </div>
                
                <button
                  onClick={handleStartReview}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  복습 시작하기
                </button>
              </div>

              {/* 빠른 시작 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div 
                  onClick={handleStartReview}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  <h3 className="text-lg font-semibold mb-2">📚 오늘의 복습</h3>
                  <p className="text-blue-100 text-sm mb-3">개인 맞춤 복습 문장으로 학습</p>
                  <div className="text-2xl font-bold">30개 문장</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">🎯 취약점 집중</h3>
                  <p className="text-green-100 text-sm mb-3">어려웠던 문장 위주로 복습</p>
                  <div className="text-2xl font-bold">15개 문장</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">⚡ 빠른 복습</h3>
                  <p className="text-purple-100 text-sm mb-3">5분 안에 빠르게 복습</p>
                  <div className="text-2xl font-bold">10개 문장</div>
                </div>
              </div>
            </div>

            {/* 분석 대시보드 */}
            <ReviewAnalyticsDashboard userId={userId} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
};

export default SmartReviewPage;