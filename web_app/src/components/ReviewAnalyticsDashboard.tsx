import React, { useState, useEffect } from 'react';
import { reviewAlgorithmService } from '../services/reviewAlgorithm';

interface ReviewAnalyticsProps {
  userId: string;
}

interface ReviewMetrics {
  totalReviews: number;
  averageAccuracy: number;
  averageResponseTime: number;
  retentionRate: number;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastered';
}

interface WeeklyProgress {
  week: string;
  reviews: number;
  accuracy: number;
}

const ReviewAnalyticsDashboard: React.FC<ReviewAnalyticsProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [userId, selectedTimeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // 복습 메트릭 로드
      const reviewMetrics = await reviewAlgorithmService.analyzeReviewPattern(userId);
      setMetrics(reviewMetrics);

      // 개인 맞춤 스케줄 로드
      const personalSchedule = await reviewAlgorithmService.generatePersonalizedSchedule(userId);
      setSchedule(personalSchedule);

      // 주간 진행률 데이터 (임시 데이터)
      const mockWeeklyData: WeeklyProgress[] = [
        { week: '1주차', reviews: 45, accuracy: 0.82 },
        { week: '2주차', reviews: 52, accuracy: 0.85 },
        { week: '3주차', reviews: 38, accuracy: 0.79 },
        { week: '4주차', reviews: 61, accuracy: 0.88 }
      ];
      setWeeklyProgress(mockWeeklyData);

    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'mastered': return 'text-green-600 bg-green-100';
      case 'advanced': return 'text-blue-600 bg-blue-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'beginner': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMasteryDescription = (level: string) => {
    switch (level) {
      case 'mastered': return '완전 숙달 - 장기 기억 형성 완료';
      case 'advanced': return '고급 수준 - 안정적인 기억 형성';
      case 'intermediate': return '중급 수준 - 꾸준한 복습 필요';
      case 'beginner': return '초급 수준 - 기초 학습 집중';
      default: return '수준 분석 중';
    }
  };

  const formatTime = (ms: number) => {
    return `${Math.round(ms / 1000)}초`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">복습 분석 데이터를 로드하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">분석할 데이터가 부족합니다</h3>
        <p className="text-gray-600">복습을 시작하면 개인 맞춤 분석을 제공해드릴게요!</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 복습 분석 대시보드</h2>
        <p className="text-gray-600">개인 맞춤 학습 패턴과 성과 분석</p>
      </div>

      {/* 기간 선택 */}
      <div className="mb-6">
        <div className="flex gap-2">
          {[
            { key: 'week', label: '최근 1주' },
            { key: 'month', label: '최근 1개월' },
            { key: 'quarter', label: '최근 3개월' }
          ].map(option => (
            <button
              key={option.key}
              onClick={() => setSelectedTimeframe(option.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 주요 메트릭 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">총 복습 횟수</h3>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalReviews}</p>
          <p className="text-sm text-green-600 mt-1">↗ 지난주 대비 +12%</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">평균 정확도</h3>
          <p className="text-3xl font-bold text-gray-900">{formatPercentage(metrics.averageAccuracy)}</p>
          <p className="text-sm text-green-600 mt-1">↗ 지난주 대비 +5%</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">평균 응답 시간</h3>
          <p className="text-3xl font-bold text-gray-900">{formatTime(metrics.averageResponseTime)}</p>
          <p className="text-sm text-blue-600 mt-1">↘ 지난주 대비 -2초</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">기억 유지율</h3>
          <p className="text-3xl font-bold text-gray-900">{formatPercentage(metrics.retentionRate)}</p>
          <p className="text-sm text-green-600 mt-1">↗ 지난주 대비 +8%</p>
        </div>
      </div>

      {/* 숙련도 레벨 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 현재 숙련도</h3>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getMasteryColor(metrics.masteryLevel)}`}>
            {metrics.masteryLevel.toUpperCase()}
          </span>
          <span className="text-gray-600">{getMasteryDescription(metrics.masteryLevel)}</span>
        </div>

        {/* 숙련도 진행률 바 */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Advanced</span>
            <span>Mastered</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${
                  metrics.masteryLevel === 'beginner' ? 25 :
                  metrics.masteryLevel === 'intermediate' ? 50 :
                  metrics.masteryLevel === 'advanced' ? 75 : 100
                }%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* 주간 진행률 차트 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 주간 진행률</h3>
        <div className="space-y-4">
          {weeklyProgress.map((week, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 text-sm text-gray-600">{week.week}</div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>복습 {week.reviews}회</span>
                  <span>정확도 {formatPercentage(week.accuracy)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${week.accuracy * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 개인 맞춤 스케줄 */}
      {schedule && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ 개인 맞춤 복습 스케줄</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{schedule.daily}</div>
              <div className="text-sm text-gray-600">일일 목표</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{schedule.weekly}</div>
              <div className="text-sm text-gray-600">주간 목표</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{schedule.monthlyGoal}</div>
              <div className="text-sm text-gray-600">월간 목표</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 최적 학습 시간</h4>
            <div className="flex gap-2">
              {schedule.optimalTimes.map((time: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {time}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 학습 팁 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 맞춤 학습 팁</h3>
        <div className="space-y-3">
          {metrics.averageAccuracy < 0.7 && (
            <div className="flex items-start gap-3">
              <span className="text-orange-500">⚠️</span>
              <p className="text-sm text-gray-700">
                정확도가 낮습니다. 기초 문법 복습과 함께 천천히 학습하는 것을 권장합니다.
              </p>
            </div>
          )}
          {metrics.averageResponseTime > 10000 && (
            <div className="flex items-start gap-3">
              <span className="text-blue-500">⏱️</span>
              <p className="text-sm text-gray-700">
                응답 시간이 길어요. 문장 패턴 암기를 통해 반응 속도를 높여보세요.
              </p>
            </div>
          )}
          {metrics.retentionRate > 0.8 && (
            <div className="flex items-start gap-3">
              <span className="text-green-500">🎉</span>
              <p className="text-sm text-gray-700">
                기억 유지율이 우수합니다! 더 어려운 단계로 도전해보세요.
              </p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="text-purple-500">🚀</span>
            <p className="text-sm text-gray-700">
              일관된 복습이 학습 효과를 극대화합니다. 매일 조금씩이라도 꾸준히 학습하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAnalyticsDashboard;