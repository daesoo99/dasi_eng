import React, { useMemo } from 'react';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';

export interface StatisticsPanelProps {
  className?: string;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  currentScore?: number;
  sessionStartTime?: number;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  className = '',
  currentQuestionIndex = 0,
  totalQuestions = 0,
  currentScore = 0,
  sessionStartTime
}) => {
  const { stats, mistakeCount, reviewCount, masteredCount } = useSpacedRepetition();

  // Current session calculations
  const currentProgress = totalQuestions > 0 ? Math.round((currentQuestionIndex / totalQuestions) * 100) : 0;
  const currentAccuracy = currentQuestionIndex > 0 ? Math.round((currentScore / currentQuestionIndex) * 100) : 0;
  const sessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;
  
  // Format study time
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    } else {
      return `${seconds}초`;
    }
  };

  // Calculate streak and recent progress
  const streakInfo = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = stats.lastStudyDate;
    
    let streakStatus = 'none';
    if (lastStudyDate === today) {
      streakStatus = 'today';
    } else if (lastStudyDate) {
      const lastDate = new Date(lastStudyDate);
      const todayDate = new Date();
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streakStatus = 'continue';
      } else {
        streakStatus = 'broken';
      }
    }
    
    return { streakStatus, days: stats.streakDays };
  }, [stats.lastStudyDate, stats.streakDays]);

  return (
    <div className={`${className}`}>
      {/* Current Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-800">
            {currentQuestionIndex}/{totalQuestions}
          </div>
          <div className="text-sm text-blue-600">현재 진행</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-800">{currentAccuracy}%</div>
          <div className="text-sm text-green-600">현재 정확도</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-800">
            {formatTime(sessionDuration)}
          </div>
          <div className="text-sm text-purple-600">세션 시간</div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalQuestions > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">진행률</span>
            <span className="text-sm text-gray-600">{currentProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Overall Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 전체 통계</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">{stats.totalSessions}</div>
            <div className="text-sm text-gray-600">총 세션</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-800">{stats.totalQuestions}</div>
            <div className="text-sm text-gray-600">총 문제수</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xl font-bold text-green-800">{Math.round(stats.averageAccuracy)}%</div>
            <div className="text-sm text-green-600">평균 정확도</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xl font-bold text-blue-800">{formatTime(stats.totalStudyTime)}</div>
            <div className="text-sm text-blue-600">총 학습시간</div>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 학습 진도</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">틀린 문제</span>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-red-600">{mistakeCount}</span>
              <span className="text-sm text-gray-500">개</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700">복습 중</span>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-orange-600">{reviewCount}</span>
              <span className="text-sm text-gray-500">개</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700">마스터</span>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-green-600">{masteredCount}</span>
              <span className="text-sm text-gray-500">개</span>
            </div>
          </div>

          {/* Mastery Progress Bar */}
          {mistakeCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">마스터 진도</span>
                <span className="text-sm text-gray-600">
                  {Math.round((masteredCount / mistakeCount) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(masteredCount / mistakeCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streak Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔥 학습 연속</h3>
        
        <div className="text-center">
          <div className="text-3xl mb-2">
            {streakInfo.streakStatus === 'today' && '🔥'}
            {streakInfo.streakStatus === 'continue' && '⚡'}
            {streakInfo.streakStatus === 'broken' && '💔'}
            {streakInfo.streakStatus === 'none' && '🌱'}
          </div>
          
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {streakInfo.days}일 연속
          </div>
          
          <div className="text-sm text-gray-600">
            {streakInfo.streakStatus === 'today' && '오늘도 학습했어요!'}
            {streakInfo.streakStatus === 'continue' && '내일도 학습해보세요!'}
            {streakInfo.streakStatus === 'broken' && '다시 시작해보세요!'}
            {streakInfo.streakStatus === 'none' && '첫 학습을 시작하세요!'}
          </div>
        </div>
        
        {/* Last Study Date */}
        {stats.lastStudyDate && (
          <div className="text-center mt-3 text-xs text-gray-500">
            마지막 학습: {new Date(stats.lastStudyDate).toLocaleDateString('ko-KR')}
          </div>
        )}
      </div>

      {/* Achievement Badges */}
      {(stats.totalQuestions >= 100 || masteredCount >= 10 || stats.streakDays >= 7) && (
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 성과</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.totalQuestions >= 100 && (
              <div className="px-4 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎯</span>
                  <span>문제 해결사 (100문제+)</span>
                </div>
              </div>
            )}
            {masteredCount >= 10 && (
              <div className="px-4 py-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-lg text-sm font-medium border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌟</span>
                  <span>패턴 마스터 (10개+)</span>
                </div>
              </div>
            )}
            {stats.streakDays >= 7 && (
              <div className="px-4 py-3 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 rounded-lg text-sm font-medium border border-orange-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔥</span>
                  <span>꾸준한 학습자 (7일+)</span>
                </div>
              </div>
            )}
            {stats.averageAccuracy >= 90 && (
              <div className="px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-lg text-sm font-medium border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💎</span>
                  <span>완벽주의자 (90%+)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

StatisticsPanel.displayName = 'StatisticsPanel';