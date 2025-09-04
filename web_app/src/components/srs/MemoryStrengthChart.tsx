/**
 * Memory Strength Chart Component
 * 
 * 기능:
 * - 기억 강도 시각화
 * - 망각곡선 그래프
 * - 카드별 기억 상태 표시
 * - 예측 정보 제공
 */

import React, { useMemo } from 'react';
import { ReviewCard } from '@/services/srs/SRSEngine';
import { useSRSEngine } from '@/hooks/useSRSEngine';
import { useReviewSchedule } from '@/hooks/useReviewSchedule';

export interface MemoryStrengthChartProps {
  userId: string;
  selectedCards?: ReviewCard[];
  showPrediction?: boolean;
  className?: string;
}

export const MemoryStrengthChart: React.FC<MemoryStrengthChartProps> = ({
  userId,
  selectedCards,
  showPrediction = true,
  className = ''
}) => {
  const srsEngine = useSRSEngine({ userId });
  const reviewSchedule = useReviewSchedule({ userId });

  // 표시할 카드들 (선택된 카드가 있으면 우선, 없으면 전체)
  const displayCards = selectedCards || srsEngine.cards;

  // 기억 강도별로 카드 분류
  const categorizedCards = useMemo(() => {
    const categories = {
      critical: [] as ReviewCard[],    // 0.0 - 0.3
      weak: [] as ReviewCard[],        // 0.3 - 0.6
      good: [] as ReviewCard[],        // 0.6 - 0.8
      strong: [] as ReviewCard[]       // 0.8 - 1.0
    };

    displayCards.forEach(card => {
      const strength = card.memory.strength;
      if (strength < 0.3) categories.critical.push(card);
      else if (strength < 0.6) categories.weak.push(card);
      else if (strength < 0.8) categories.good.push(card);
      else categories.strong.push(card);
    });

    return categories;
  }, [displayCards]);

  // 망각곡선 데이터 생성 (시뮬레이션)
  const forgettingCurveData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => i);
    return days.map(day => {
      const averageStrength = displayCards.reduce((sum, card) => {
        // 간단한 지수 감쇠 모델
        const daysSinceReview = (Date.now() - card.memory.lastReviewed.getTime()) / (1000 * 60 * 60 * 24) + day;
        const decay = Math.exp(-daysSinceReview / (card.memory.easeFactor * 5));
        return sum + (card.memory.strength * decay);
      }, 0) / Math.max(1, displayCards.length);

      return {
        day,
        strength: Math.max(0, Math.min(1, averageStrength))
      };
    });
  }, [displayCards]);

  const getStrengthColor = (strength: number): string => {
    if (strength < 0.3) return 'bg-red-500';
    if (strength < 0.6) return 'bg-orange-500';
    if (strength < 0.8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (strength: number): string => {
    if (strength < 0.3) return '위험';
    if (strength < 0.6) return '약함';
    if (strength < 0.8) return '양호';
    return '강함';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">기억 강도 분석</h2>
        <p className="text-gray-600">카드별 기억 강도와 망각곡선을 확인하세요</p>
      </div>

      {/* 기억 강도 분포 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">기억 강도 분포</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-800">위험 (0-30%)</span>
            </div>
            <p className="text-2xl font-bold text-red-800">{categorizedCards.critical.length}</p>
            <p className="text-xs text-red-600">즉시 복습 필요</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-orange-800">약함 (30-60%)</span>
            </div>
            <p className="text-2xl font-bold text-orange-800">{categorizedCards.weak.length}</p>
            <p className="text-xs text-orange-600">곧 복습 권장</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-800">양호 (60-80%)</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800">{categorizedCards.good.length}</p>
            <p className="text-xs text-yellow-600">안정적 상태</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">강함 (80-100%)</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{categorizedCards.strong.length}</p>
            <p className="text-xs text-green-600">마스터에 근접</p>
          </div>
        </div>
      </div>

      {/* 망각곡선 그래프 */}
      {showPrediction && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">망각곡선 예측</h3>
          <div className="bg-gray-50 rounded-lg p-4 h-64 relative">
            <div className="absolute inset-4">
              {/* Y축 라벨 */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* 그래프 영역 */}
              <div className="ml-8 h-full relative">
                {/* 격자선 */}
                <div className="absolute inset-0">
                  {[0, 25, 50, 75, 100].map(percentage => (
                    <div
                      key={percentage}
                      className="absolute w-full border-t border-gray-200"
                      style={{ bottom: `${percentage}%` }}
                    ></div>
                  ))}
                </div>

                {/* 망각곡선 */}
                <svg className="absolute inset-0 w-full h-full">
                  <polyline
                    points={forgettingCurveData.map((point, index) => {
                      const x = (index / (forgettingCurveData.length - 1)) * 100;
                      const y = 100 - (point.strength * 100);
                      return `${x}%,${y}%`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  
                  {/* 데이터 포인트 */}
                  {forgettingCurveData.map((point, index) => (
                    <circle
                      key={index}
                      cx={`${(index / (forgettingCurveData.length - 1)) * 100}%`}
                      cy={`${100 - (point.strength * 100)}%`}
                      r="3"
                      fill="#3B82F6"
                      className="opacity-70 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </svg>

                {/* X축 라벨 */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-gray-500 transform translate-y-4">
                  <span>오늘</span>
                  <span>1주</span>
                  <span>2주</span>
                  <span>3주</span>
                  <span>한달</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            현재 카드들의 평균 기억 강도 변화를 예측한 그래프입니다.
          </p>
        </div>
      )}

      {/* 개별 카드 상세 정보 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">카드별 상세 정보</h3>
        <div className="max-h-80 overflow-y-auto">
          {displayCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>표시할 카드가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayCards
                .sort((a, b) => a.memory.strength - b.memory.strength) // 약한 카드부터 정렬
                .slice(0, 20) // 상위 20개만 표시
                .map((card) => {
                  const prediction = reviewSchedule.getPrediction(card.id);
                  const nextReviewHours = card.memory.nextReview ? 
                    Math.max(0, (card.memory.nextReview.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;

                  return (
                    <div key={card.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 truncate">{card.content.korean}</h4>
                          <p className="text-sm text-gray-600 truncate">{card.content.english}</p>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          {/* 기억 강도 바 */}
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getStrengthColor(card.memory.strength)}`}
                                style={{ width: `${card.memory.strength * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700 min-w-8">
                              {(card.memory.strength * 100).toFixed(0)}%
                            </span>
                          </div>
                          
                          {/* 상태 라벨 */}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            card.memory.strength < 0.3 ? 'bg-red-100 text-red-800' :
                            card.memory.strength < 0.6 ? 'bg-orange-100 text-orange-800' :
                            card.memory.strength < 0.8 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {getStrengthLabel(card.memory.strength)}
                          </span>
                        </div>
                      </div>

                      {/* 추가 정보 */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>복습 {card.memory.reviewCount}회</span>
                          <span>연속 성공 {card.performance.streak}회</span>
                          {card.content.pattern && <span>패턴: {card.content.pattern}</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          {nextReviewHours > 0 ? (
                            <span>
                              {nextReviewHours < 1 
                                ? `${Math.round(nextReviewHours * 60)}분 후` 
                                : nextReviewHours < 24 
                                ? `${Math.round(nextReviewHours)}시간 후`
                                : `${Math.round(nextReviewHours / 24)}일 후`
                              }
                            </span>
                          ) : (
                            <span className="text-red-600">복습 대기 중</span>
                          )}
                          {prediction && (
                            <span title={`24시간 후 예상 강도: ${(prediction.strengthIn24h * 100).toFixed(0)}%`}>
                              📊
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              
              {displayCards.length > 20 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  ... 그 외 {displayCards.length - 20}개 카드
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryStrengthChart;