import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { progressManagementService } from '../services/progressManagement';

interface ProgressDashboardProps {
  userId: string;
}

interface LevelProgress {
  level: number;
  totalStages: number;
  completedStages: number;
  averageCompletionRate: number;
  totalTimeSpent: number;
  overallAccuracy: number;
  weakStages: string[];
  strongStages: string[];
}

interface OverallProgress {
  totalLevels: number;
  completedLevels: number;
  currentLevel: number;
  totalTimeSpent: number;
  overallAccuracy: number;
  totalSentencesStudied: number;
  achievementBadges: string[];
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = memo(({ userId }) => {
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [levelProgresses, setLevelProgresses] = useState<LevelProgress[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [userId]);

  const loadProgressData = async () => {
    setIsLoading(true);
    try {
      // 전체 진도와 레벨별 진도를 병렬로 로드
      const [overall, ...levels] = await Promise.all([
        progressManagementService.getOverallProgress(userId),
        ...Array.from({length: 10}, (_, i) => 
          progressManagementService.getLevelProgress(userId, i + 1)
        )
      ]);
      
      setOverallProgress(overall);
      setLevelProgresses(levels);
      setSelectedLevel(overall.currentLevel);
      
    } catch (error) {
      console.error('진도 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}분`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}시간 ${remainingMinutes}분`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const getLevelStatusColor = (completionRate: number, accuracy: number): string => {
    if (completionRate >= 0.8 && accuracy >= 0.9) return 'bg-green-500';
    if (completionRate >= 0.6 && accuracy >= 0.7) return 'bg-blue-500';
    if (completionRate >= 0.3) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getLevelTitle = (level: number): string => {
    const titles = {
      1: '기초 표현',
      2: '기본 패턴',
      3: '고급 문법',
      4: '비즈니스',
      5: '학술 연구',
      6: '실용 영어',
      7: '비즈니스 영어',
      8: '고급 담화',
      9: '전문가 담화',
      10: '원어민 수준'
    };
    return titles[level as keyof typeof titles] || `Level ${level}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">진도 데이터를 로드하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!overallProgress) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">진도 데이터가 없습니다</h3>
        <p className="text-gray-600">학습을 시작하면 진도를 추적할 수 있습니다!</p>
      </div>
    );
  }

  const selectedLevelData = levelProgresses.find(lp => lp.level === selectedLevel);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 학습 진도 관리</h2>
        <p className="text-gray-600">전체 학습 현황과 레벨별 상세 진도를 확인하세요</p>
      </div>

      {/* 전체 진도 요약 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">🎯 전체 학습 현황</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{overallProgress.currentLevel}</div>
            <div className="text-sm opacity-90">현재 레벨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{overallProgress.completedLevels}/{overallProgress.totalLevels}</div>
            <div className="text-sm opacity-90">완료 레벨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatTime(overallProgress.totalTimeSpent)}</div>
            <div className="text-sm opacity-90">총 학습 시간</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatPercentage(overallProgress.overallAccuracy)}</div>
            <div className="text-sm opacity-90">전체 정확도</div>
          </div>
        </div>

        {/* 성취 배지 */}
        {overallProgress.achievementBadges.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">🏆 획득한 배지</h4>
            <div className="flex flex-wrap gap-2">
              {overallProgress.achievementBadges.map((badge, index) => (
                <span key={index} className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 레벨별 진도 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 레벨별 진도</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {levelProgresses.map((levelProgress) => (
            <div
              key={levelProgress.level}
              onClick={() => setSelectedLevel(levelProgress.level)}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                selectedLevel === levelProgress.level
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold ${
                  getLevelStatusColor(levelProgress.averageCompletionRate, levelProgress.overallAccuracy)
                }`}>
                  L{levelProgress.level}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {getLevelTitle(levelProgress.level)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {levelProgress.completedStages}/{levelProgress.totalStages} 완료
                </div>
                <div className="text-xs text-gray-600">
                  {formatPercentage(levelProgress.averageCompletionRate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 선택된 레벨 상세 정보 */}
      {selectedLevelData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📖 Level {selectedLevel} - {getLevelTitle(selectedLevel)} 상세 현황
          </h3>
          
          {/* 상세 메트릭 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {selectedLevelData.completedStages}/{selectedLevelData.totalStages}
              </div>
              <div className="text-sm text-gray-600">완료 스테이지</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(selectedLevelData.averageCompletionRate)}
              </div>
              <div className="text-sm text-gray-600">평균 완료율</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatPercentage(selectedLevelData.overallAccuracy)}
              </div>
              <div className="text-sm text-gray-600">전체 정확도</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(selectedLevelData.totalTimeSpent)}
              </div>
              <div className="text-sm text-gray-600">학습 시간</div>
            </div>
          </div>

          {/* 진도 바 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>레벨 진행도</span>
              <span>{formatPercentage(selectedLevelData.completedStages / selectedLevelData.totalStages)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(selectedLevelData.completedStages / selectedLevelData.totalStages) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 취약점 및 강점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 취약한 스테이지 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚠️ 집중 필요 스테이지</h4>
              {selectedLevelData.weakStages.length > 0 ? (
                <div className="space-y-2">
                  {selectedLevelData.weakStages.map((stageId, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-sm text-red-800">{stageId}</span>
                      <button className="ml-auto text-xs text-red-600 hover:text-red-800">
                        복습하기
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">취약한 스테이지가 없습니다! 🎉</p>
              )}
            </div>

            {/* 강점 스테이지 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">✨ 잘하는 스테이지</h4>
              {selectedLevelData.strongStages.length > 0 ? (
                <div className="space-y-2">
                  {selectedLevelData.strongStages.map((stageId, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-green-800">{stageId}</span>
                      <span className="ml-auto text-xs text-green-600">마스터!</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">아직 마스터한 스테이지가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProgressDashboard;