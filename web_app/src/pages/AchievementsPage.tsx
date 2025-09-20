import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage, STORAGE_KEYS, type Achievement } from '@/hooks/useLocalStorage';
import { useUser } from '@/store/useAppStore';

// 기본 업적 정의
const AVAILABLE_ACHIEVEMENTS: Achievement[] = [
  // 학습 업적 (📚)
  {
    id: 'first_lesson',
    title: '첫 걸음',
    description: '첫 번째 레슨 완료',
    type: 'learning',
    icon: '🌱',
    badge: '📚',
    target: 1,
    current: 0
  },
  {
    id: 'complete_level_1',
    title: '기초 마스터',
    description: 'Level 1 완전 정복',
    type: 'learning',
    icon: '🎓',
    badge: '📚',
    target: 1,
    current: 0
  },
  {
    id: 'study_streak_7',
    title: '일주일 연속',
    description: '7일 연속 학습',
    type: 'learning',
    icon: '🔥',
    badge: '📚',
    target: 7,
    current: 0
  },
  {
    id: 'study_streak_30',
    title: '한 달 연속',
    description: '30일 연속 학습',
    type: 'learning',
    icon: '💯',
    badge: '📚',
    target: 30,
    current: 0
  },
  {
    id: 'complete_100_questions',
    title: '백문백답',
    description: '100문제 해결',
    type: 'learning',
    icon: '💯',
    badge: '📚',
    target: 100,
    current: 0
  },
  
  // 성과 업적 (🎯)
  {
    id: 'accuracy_90',
    title: '정확한 발음',
    description: '90% 이상 정확도 달성',
    type: 'performance',
    icon: '🎯',
    badge: '🎯',
    target: 90,
    current: 0
  },
  {
    id: 'speed_master',
    title: '스피드 마스터',
    description: '평균 응답시간 2초 이하',
    type: 'performance',
    icon: '⚡',
    badge: '🎯',
    target: 2,
    current: 0
  },
  {
    id: 'perfect_session',
    title: '완벽한 세션',
    description: '한 세션에서 100% 정답',
    type: 'performance',
    icon: '⭐',
    badge: '🎯',
    target: 1,
    current: 0
  },
  
  // 마일스톤 업적 (🏆)
  {
    id: 'reach_level_5',
    title: '중급자',
    description: 'Level 5 달성',
    type: 'milestone',
    icon: '🏅',
    badge: '🏆',
    target: 5,
    current: 0
  },
  {
    id: 'reach_level_10',
    title: '고급자',
    description: 'Level 10 달성',
    type: 'milestone',
    icon: '👑',
    badge: '🏆',
    target: 10,
    current: 0
  }
];

export const AchievementsPage: React.FC = () => {
  const navigate = useNavigate();
  const _user = useUser();
  const { value: achievementData, updateValue } = useLocalStorage(STORAGE_KEYS.ACHIEVEMENTS);

  // 업적 달성 상태 계산
  const getAchievementStatus = (achievement: Achievement) => {
    const isUnlocked = achievementData.unlockedAchievements.includes(achievement.id);
    const progress = achievementData.achievementProgress[achievement.id];
    const isNew = achievementData.newBadges.includes(achievement.id);
    
    return {
      isUnlocked,
      isNew,
      progress: progress ? Math.min(100, (progress.current / progress.target) * 100) : 0,
      current: progress?.current || 0,
      target: progress?.target || achievement.target || 0
    };
  };

  // 새 배지 확인 처리
  const markBadgeAsSeen = (achievementId: string) => {
    updateValue(prev => ({
      ...prev,
      newBadges: prev.newBadges.filter(id => id !== achievementId)
    }));
  };

  // 카테고리별 업적 분류
  const achievementsByType = {
    learning: AVAILABLE_ACHIEVEMENTS.filter(a => a.type === 'learning'),
    performance: AVAILABLE_ACHIEVEMENTS.filter(a => a.type === 'performance'),
    milestone: AVAILABLE_ACHIEVEMENTS.filter(a => a.type === 'milestone')
  };

  // 전체 통계 계산
  const totalAchievements = AVAILABLE_ACHIEVEMENTS.length;
  const unlockedCount = achievementData.unlockedAchievements.length;
  const completionRate = Math.round((unlockedCount / totalAchievements) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">🏆 업적·배지</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">학습 성취도와 업적 확인</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{unlockedCount}/{totalAchievements}</div>
              <div className="text-xs text-gray-500">달성률 {completionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">

          {/* 진행률 표시 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">전체 진행률</h2>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>달성한 업적: {unlockedCount}개</span>
              <span>{completionRate}% 완료</span>
            </div>
          </div>

          {/* 학습 업적 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
              <span className="text-2xl mr-3">📚</span>
              학습 업적
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {achievementsByType.learning.map(achievement => {
                const status = getAchievementStatus(achievement);
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 border-2 rounded-lg transition-all ${
                      status.isUnlocked
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => status.isNew && markBadgeAsSeen(achievement.id)}
                  >
                    {status.isNew && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        NEW!
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${status.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${status.isUnlocked ? 'text-green-800' : 'text-gray-600 dark:text-gray-300'}`}>
                          {achievement.title}
                        </div>
                        <div className="text-sm text-gray-500">{achievement.description}</div>
                        {!status.isUnlocked && status.progress > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${status.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {status.current}/{status.target}
                            </div>
                          </div>
                        )}
                      </div>
                      {status.isUnlocked && (
                        <div className="text-green-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 성과 업적 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
              <span className="text-2xl mr-3">🎯</span>
              성과 업적
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {achievementsByType.performance.map(achievement => {
                const status = getAchievementStatus(achievement);
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 border-2 rounded-lg transition-all ${
                      status.isUnlocked
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => status.isNew && markBadgeAsSeen(achievement.id)}
                  >
                    {status.isNew && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        NEW!
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${status.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${status.isUnlocked ? 'text-blue-800' : 'text-gray-600 dark:text-gray-300'}`}>
                          {achievement.title}
                        </div>
                        <div className="text-sm text-gray-500">{achievement.description}</div>
                        {!status.isUnlocked && status.progress > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${status.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {status.current}/{status.target}
                            </div>
                          </div>
                        )}
                      </div>
                      {status.isUnlocked && (
                        <div className="text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 마일스톤 업적 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
              <span className="text-2xl mr-3">🏆</span>
              마일스톤 업적
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {achievementsByType.milestone.map(achievement => {
                const status = getAchievementStatus(achievement);
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 border-2 rounded-lg transition-all ${
                      status.isUnlocked
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => status.isNew && markBadgeAsSeen(achievement.id)}
                  >
                    {status.isNew && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        NEW!
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${status.isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${status.isUnlocked ? 'text-yellow-800' : 'text-gray-600 dark:text-gray-300'}`}>
                          {achievement.title}
                        </div>
                        <div className="text-sm text-gray-500">{achievement.description}</div>
                        {!status.isUnlocked && status.progress > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${status.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Level {status.current}/{status.target}
                            </div>
                          </div>
                        )}
                      </div>
                      {status.isUnlocked && (
                        <div className="text-yellow-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 업적 달성 방법</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 꾸준히 학습하면 자동으로 업적이 달성됩니다</li>
              <li>• 새로운 배지는 빨간색 NEW! 표시로 알려드립니다</li>
              <li>• 진행 중인 업적은 진행률이 표시됩니다</li>
              <li>• 달성한 업적은 녹색/파란색/노란색으로 표시됩니다</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;