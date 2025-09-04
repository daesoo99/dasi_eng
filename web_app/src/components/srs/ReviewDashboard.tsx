/**
 * Review Dashboard Component
 * 
 * 기능:
 * - 복습 현황 대시보드
 * - 일일/주간/월간 통계 표시
 * - 복습 스케줄 관리
 * - 학습 진도 시각화
 */

import React from 'react';
import { useSRSEngine } from '@/hooks/useSRSEngine';
import { useReviewSchedule } from '@/hooks/useReviewSchedule';

export interface ReviewDashboardProps {
  userId: string;
  className?: string;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({
  userId,
  className = ''
}) => {
  const srsEngine = useSRSEngine({ userId });
  const reviewSchedule = useReviewSchedule({ userId });

  const {
    totalCards,
    dueForReview,
    averageMemoryStrength,
    masteredCards,
    learningCards,
    avgAccuracy,
    avgResponseTime
  } = srsEngine.stats;

  const completionRate = totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;
  const todayProgress = reviewSchedule.config.dailyTarget > 0 
    ? (reviewSchedule.stats.todayReviewed / reviewSchedule.config.dailyTarget) * 100 
    : 0;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">복습 대시보드</h2>
        <p className="text-gray-600">오늘의 학습 현황과 전체 진도를 확인하세요</p>
      </div>

      {/* 주요 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 오늘의 진도 */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-800">오늘의 진도</h3>
            <span className="text-xs text-blue-600">
              {reviewSchedule.stats.todayReviewed}/{reviewSchedule.config.dailyTarget}
            </span>
          </div>
          <div className="mb-2">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, todayProgress)}%` }}
              ></div>
            </div>
          </div>
          <p className="text-lg font-bold text-blue-800">{todayProgress.toFixed(1)}%</p>
        </div>

        {/* 복습 대기 */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-800">복습 대기</h3>
            <span className="text-xs text-orange-600">카드</span>
          </div>
          <p className="text-2xl font-bold text-orange-800 mb-1">{dueForReview}</p>
          <p className="text-xs text-orange-600">
            {dueForReview > 0 ? '지금 복습 가능' : '모든 복습 완료!'}
          </p>
        </div>

        {/* 마스터 완료 */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-800">마스터 완료</h3>
            <span className="text-xs text-green-600">{masteredCards}/{totalCards}</span>
          </div>
          <div className="mb-2">
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
          <p className="text-lg font-bold text-green-800">{completionRate.toFixed(1)}%</p>
        </div>

        {/* 평균 정답률 */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-800">평균 정답률</h3>
            <span className="text-xs text-purple-600">최근 복습</span>
          </div>
          <p className="text-2xl font-bold text-purple-800 mb-1">
            {(avgAccuracy * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-purple-600">
            {avgAccuracy > 0.8 ? '우수' : avgAccuracy > 0.6 ? '보통' : '개선 필요'}
          </p>
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 학습 상태 분포 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">학습 상태 분포</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">학습 중</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${totalCards > 0 ? (learningCards / totalCards) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800">{learningCards}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">복습 중</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${totalCards > 0 ? ((totalCards - learningCards - masteredCards) / totalCards) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800">{totalCards - learningCards - masteredCards}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">마스터됨</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800">{masteredCards}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 성능 지표 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">성능 지표</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">평균 기억 강도</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${averageMemoryStrength * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {(averageMemoryStrength * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">평균 응답시간</span>
              <span className="text-sm font-medium text-gray-800">
                {(avgResponseTime / 1000).toFixed(1)}초
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">연속 학습 일수</span>
              <span className="text-sm font-medium text-gray-800">
                {reviewSchedule.stats.streak}일
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">총 복습 시간</span>
              <span className="text-sm font-medium text-gray-800">
                {Math.floor(reviewSchedule.stats.totalReviewTime / 60)}시간 {reviewSchedule.stats.totalReviewTime % 60}분
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 오늘의 복습 세션 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">오늘의 복습 세션</h3>
          <button
            onClick={reviewSchedule.generateTodaysSchedule}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            스케줄 생성
          </button>
        </div>
        
        {reviewSchedule.todaysSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>오늘의 복습 세션이 없습니다.</p>
            <p className="text-sm mt-1">스케줄 생성 버튼을 클릭해 주세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewSchedule.todaysSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-800">
                      {session.scheduledTime.toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.priority === 'high' ? 'bg-red-100 text-red-800' :
                      session.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.priority === 'high' ? '높음' : 
                       session.priority === 'medium' ? '보통' : '낮음'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {session.cards.length}개 카드 • 약 {session.estimatedDuration}분
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>쉬움: {session.difficultyMix.easy}</span>
                  <span>보통: {session.difficultyMix.medium}</span>
                  <span>어려움: {session.difficultyMix.hard}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewDashboard;