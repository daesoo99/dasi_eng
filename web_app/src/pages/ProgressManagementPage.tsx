import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressDashboard from '../components/ProgressDashboard';
import { useSRSEngine } from '../hooks/useSRSEngine';

const ProgressManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'analytics'>('detailed'); // 기본값을 detailed로
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily'); // 차트 기간 선택
  const navigate = useNavigate();
  const userId = 'dev-user'; // 실제로는 auth context에서 가져옴

  // SRS 엔진 연결
  const srs = useSRSEngine({ userId });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProgressDashboard userId={userId} />;
      
      case 'detailed':
        return (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📋 상세 진도 분석</h2>

            {/* SRS 현황 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors duration-300">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">총 SRS 카드</div>
                <div className="text-2xl font-bold text-blue-600">{srs.stats.totalCards}</div>
                <div className="text-xs text-gray-500">현재 학습 중</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors duration-300">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">복습 예정</div>
                <div className="text-2xl font-bold text-red-600">{srs.stats.dueForReview}</div>
                <div className="text-xs text-gray-500">오늘 복습 필요</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors duration-300">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">마스터 완료</div>
                <div className="text-2xl font-bold text-green-600">{srs.stats.masteredCards}</div>
                <div className="text-xs text-gray-500">학습 완료</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors duration-300">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">평균 정확률</div>
                <div className="text-2xl font-bold text-purple-600">{Math.round(srs.stats.avgAccuracy * 100)}%</div>
                <div className="text-xs text-gray-500">전체 평균</div>
              </div>
            </div>

            {/* 스테이지별 상세 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 완료율 분포 */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">📊 완료율 분포</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">90% 이상 (마스터)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">12개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">70-89% (완료)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">18개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">50-69% (진행중)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                      <span className="text-sm font-medium text-yellow-600">8개</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">50% 미만 (시작)</span>
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
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⏰ 학습 패턴</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>가장 활발한 시간</span>
                      <span className="font-medium text-blue-600">오후 7-9시</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>평균 세션 시간</span>
                      <span className="font-medium text-green-600">25분</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>주간 학습 일수</span>
                      <span className="font-medium text-purple-600">5.2일</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>연속 학습 기록</span>
                      <span className="font-medium text-orange-600">12일</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SRS 망각곡선 그래프 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🧠 망각곡선 복습 현황</h3>

                {/* 기간 선택 탭 */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {[
                    { key: 'daily', label: '일', icon: '📅' },
                    { key: 'weekly', label: '주', icon: '📊' },
                    { key: 'monthly', label: '월', icon: '🧠' }
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setChartPeriod(key as 'daily' | 'weekly' | 'monthly')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        chartPeriod === key
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const today = new Date();

                if (chartPeriod === 'daily') {
                  // 일별 표시 - 최근 7일 SRS 데이터
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
                    const dayName = `${date.getMonth() + 1}/${date.getDate()}`;

                    // SRS 데이터 기반 계산
                    const dateStr = date.toISOString().split('T')[0];
                    const srsKey = `srs_daily_${dateStr}`;
                    const savedSRSData = localStorage.getItem(srsKey);

                    let addedMistakes = 0;
                    let reviewedCards = 0;

                    if (savedSRSData) {
                      const data = JSON.parse(savedSRSData);
                      addedMistakes = data.addedMistakes || 0;
                      reviewedCards = data.reviewedCards || 0;
                    } else {
                      // 시뮬레이션: 최근 날짜일수록 더 많은 활동
                      const activity = Math.max(0, (7 - i) - 3);
                      addedMistakes = Math.max(0, activity + Math.floor(Math.random() * 3));
                      reviewedCards = Math.max(0, Math.floor(addedMistakes * 1.5) + Math.floor(Math.random() * 2));
                    }

                    const height = Math.min(200, ((addedMistakes + reviewedCards) / 15) * 200 + 10);

                    days.push({ dayName, addedMistakes, reviewedCards, height, date });
                  }

                  return (
                    <>
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        📅 최근 7일간 SRS 활동 (빨강: 새 틀린 문장, 파랑: 복습 완료)
                      </div>
                      <div className="h-64 flex items-end justify-between gap-2">
                        {days.map(({ dayName, addedMistakes, reviewedCards, height, date }) => (
                          <div key={date.getTime()} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-t relative overflow-hidden" style={{ height: '200px' }}>
                              {/* 복습 완료 (파란색 하단) */}
                              <div
                                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500"
                                style={{
                                  height: `${(reviewedCards / 15) * 200}px`,
                                  position: 'absolute',
                                  bottom: 0,
                                  minHeight: reviewedCards > 0 ? '5px' : '0px'
                                }}
                              ></div>
                              {/* 새 틀린 문장 (빨간색 상단) */}
                              <div
                                className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all duration-500"
                                style={{
                                  height: `${(addedMistakes / 15) * 200}px`,
                                  position: 'absolute',
                                  bottom: `${(reviewedCards / 15) * 200}px`,
                                  minHeight: addedMistakes > 0 ? '5px' : '0px'
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">{dayName}</div>
                            <div className="text-xs space-y-1">
                              <div className="text-red-600 font-medium">+{addedMistakes}</div>
                              <div className="text-blue-600 font-medium">✓{reviewedCards}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                } else if (chartPeriod === 'weekly') {
                  // 주별 표시 - 최근 6주 SRS 데이터
                  const weeks = [];
                  for (let i = 5; i >= 0; i--) {
                    const weekStart = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
                    const weekName = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

                    // 주별 SRS 누적 데이터 계산
                    let weeklyMistakes = 0;
                    let weeklyReviews = 0;

                    // 해당 주의 7일간 데이터 합산
                    for (let d = 0; d < 7; d++) {
                      const dayDate = new Date(weekStart.getTime() + d * 24 * 60 * 60 * 1000);
                      const dateStr = dayDate.toISOString().split('T')[0];
                      const srsKey = `srs_daily_${dateStr}`;
                      const savedData = localStorage.getItem(srsKey);

                      if (savedData) {
                        const data = JSON.parse(savedData);
                        weeklyMistakes += data.addedMistakes || 0;
                        weeklyReviews += data.reviewedCards || 0;
                      } else {
                        // 시뮬레이션
                        const activity = Math.max(0, (6 - i) * 2);
                        weeklyMistakes += Math.max(0, activity + Math.floor(Math.random() * 2));
                        weeklyReviews += Math.max(0, Math.floor(weeklyMistakes * 1.2) + Math.floor(Math.random() * 3));
                      }
                    }

                    weeks.push({ weekName, weeklyMistakes, weeklyReviews });
                  }

                  return (
                    <>
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        📊 최근 6주간 SRS 활동 (빨강: 틀린 문장, 파랑: 복습 완료)
                      </div>
                      <div className="h-64 flex items-end justify-between gap-2">
                        {weeks.map(({ weekName, weeklyMistakes, weeklyReviews }, index) => (
                          <div key={`week-${index}`} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-t relative overflow-hidden" style={{ height: '200px' }}>
                              {/* 복습 완료 (파란색 하단) */}
                              <div
                                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500"
                                style={{
                                  height: `${Math.min(200, (weeklyReviews / 50) * 200)}px`,
                                  position: 'absolute',
                                  bottom: 0,
                                  minHeight: weeklyReviews > 0 ? '5px' : '0px'
                                }}
                              ></div>
                              {/* 새 틀린 문장 (빨간색 상단) */}
                              <div
                                className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all duration-500"
                                style={{
                                  height: `${Math.min(200, (weeklyMistakes / 50) * 200)}px`,
                                  position: 'absolute',
                                  bottom: `${Math.min(200, (weeklyReviews / 50) * 200)}px`,
                                  minHeight: weeklyMistakes > 0 ? '5px' : '0px'
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">{weekName}주</div>
                            <div className="text-xs space-y-1">
                              <div className="text-red-600 font-medium">+{weeklyMistakes}</div>
                              <div className="text-blue-600 font-medium">✓{weeklyReviews}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                } else {
                  // 월별 표시 - 최근 6개월 SRS 데이터
                  const months = [];
                  for (let i = 5; i >= 0; i--) {
                    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    const monthName = (date.getMonth() + 1) + '월';

                    // 월별 SRS 누적 데이터 계산
                    let monthlyMistakes = 0;
                    let monthlyReviews = 0;
                    let masteredCards = 0;

                    // 해당 월의 모든 일별 데이터 합산
                    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dayDate = new Date(date.getFullYear(), date.getMonth(), d);
                      if (dayDate > today) break; // 미래 날짜는 제외

                      const dateStr = dayDate.toISOString().split('T')[0];
                      const srsKey = `srs_daily_${dateStr}`;
                      const savedData = localStorage.getItem(srsKey);

                      if (savedData) {
                        const data = JSON.parse(savedData);
                        monthlyMistakes += data.addedMistakes || 0;
                        monthlyReviews += data.reviewedCards || 0;
                        masteredCards += data.masteredCards || 0;
                      } else {
                        // 시뮬레이션
                        const activity = Math.max(0, (6 - i) * 5);
                        monthlyMistakes += Math.max(0, activity + Math.floor(Math.random() * 3));
                        monthlyReviews += Math.max(0, Math.floor(monthlyMistakes * 1.3) + Math.floor(Math.random() * 5));
                        masteredCards += Math.max(0, Math.floor(monthlyReviews * 0.2) + Math.floor(Math.random() * 2));
                      }
                    }

                    months.push({ monthName, monthlyMistakes, monthlyReviews, masteredCards });
                  }

                  return (
                    <>
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        🧠 최근 6개월간 SRS 활동 (빨강: 틀린 문장, 파랑: 복습, 녹색: 마스터)
                      </div>
                      <div className="h-64 flex items-end justify-between gap-2">
                        {months.map(({ monthName, monthlyMistakes, monthlyReviews, masteredCards }, index) => (
                          <div key={`month-${index}`} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-t relative overflow-hidden" style={{ height: '200px' }}>
                              {/* 복습 완료 (파란색 하단) */}
                              <div
                                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500"
                                style={{
                                  height: `${Math.min(200, (monthlyReviews / 150) * 200)}px`,
                                  position: 'absolute',
                                  bottom: 0,
                                  minHeight: monthlyReviews > 0 ? '5px' : '0px'
                                }}
                              ></div>
                              {/* 마스터된 카드 (녹색 중간) */}
                              <div
                                className="w-full bg-gradient-to-t from-green-500 to-green-400 transition-all duration-500"
                                style={{
                                  height: `${Math.min(200, (masteredCards / 150) * 200)}px`,
                                  position: 'absolute',
                                  bottom: `${Math.min(200, (monthlyReviews / 150) * 200)}px`,
                                  minHeight: masteredCards > 0 ? '5px' : '0px'
                                }}
                              ></div>
                              {/* 새 틀린 문장 (빨간색 상단) */}
                              <div
                                className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all duration-500"
                                style={{
                                  height: `${Math.min(200, (monthlyMistakes / 150) * 200)}px`,
                                  position: 'absolute',
                                  bottom: `${Math.min(200, ((monthlyReviews + masteredCards) / 150) * 200)}px`,
                                  minHeight: monthlyMistakes > 0 ? '5px' : '0px'
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">{monthName}</div>
                            <div className="text-xs space-y-1">
                              <div className="text-red-600 font-medium">+{monthlyMistakes}</div>
                              <div className="text-blue-600 font-medium">✓{monthlyReviews}</div>
                              <div className="text-green-600 font-medium">★{masteredCards}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                }
              })()}
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                🧠 망각곡선 기반 SRS 복습 시스템 - 3단계에서 틀린 문장만 추가됩니다
              </div>
            </div>

            {/* 📅 복습 스케줄 섹션 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300 p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📅 복습 스케줄</h3>

              {(() => {
                // SRS 카드들을 날짜별로 그룹화
                const groupedByDate = new Map();
                const today = new Date();

                srs.cards.forEach(card => {
                  const reviewDate = new Date(card.memory.nextReview);
                  const dateKey = reviewDate.toISOString().split('T')[0];

                  if (!groupedByDate.has(dateKey)) {
                    groupedByDate.set(dateKey, []);
                  }
                  groupedByDate.get(dateKey).push(card);
                });

                // 향후 7일간의 복습 스케줄 표시
                const scheduleItems = [];
                for (let i = 0; i < 7; i++) {
                  const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
                  const dateKey = date.toISOString().split('T')[0];
                  const cardsForDate = groupedByDate.get(dateKey) || [];

                  const dayName = i === 0 ? '오늘' :
                                 i === 1 ? '내일' :
                                 `${date.getMonth() + 1}/${date.getDate()}`;

                  if (cardsForDate.length > 0 || i === 0) {
                    scheduleItems.push({
                      date: dayName,
                      cards: cardsForDate,
                      isToday: i === 0,
                      isTomorrow: i === 1
                    });
                  }
                }

                if (scheduleItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-lg">아직 복습할 문장이 없습니다</p>
                      <p className="text-sm mt-2">패턴 학습에서 3단계 문장을 틀리면 SRS 복습 시스템에 추가됩니다</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {scheduleItems.map((item, index) => (
                      <div key={index} className={`border rounded-lg p-4 ${
                        item.isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                        item.isTomorrow ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                        'border-gray-200 dark:border-gray-600'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-semibold ${
                            item.isToday ? 'text-blue-700 dark:text-blue-300' :
                            item.isTomorrow ? 'text-yellow-700 dark:text-yellow-300' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.isToday && '🔥 '}{item.isTomorrow && '⏰ '}{item.date}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.cards.length > 0 ?
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.cards.length}개 문장
                          </span>
                        </div>

                        {item.cards.length > 0 ? (
                          <div className="space-y-2">
                            {item.cards.slice(0, 3).map((card, cardIndex) => (
                              <div key={cardIndex} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {card.content.korean}
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                    {card.content.english}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 ml-4">
                                  <div>복습 {card.memory.reviewCount + 1}회차</div>
                                  <div className="mt-1">
                                    강도: {(card.memory.strength * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                            {item.cards.length > 3 && (
                              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                ... 그 외 {item.cards.length - 3}개 문장
                              </div>
                            )}
                          </div>
                        ) : item.isToday ? (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <div className="text-2xl mb-2">🎉</div>
                            <p>오늘 복습할 문장이 없습니다!</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔍 고급 분석</h2>
            
            {/* 실력 변화 추이 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 실력 변화 추이</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">정확도 변화</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">이번 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">85%</span>
                        <span className="text-xs text-green-600">↗ +3%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">지난 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">82%</span>
                        <span className="text-xs text-green-600">↗ +1%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">이번 달 평균</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">83%</span>
                        <span className="text-xs text-green-600">↗ +5%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">응답 속도 변화</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">이번 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">4.2초</span>
                        <span className="text-xs text-blue-600">↘ -0.3초</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">지난 주</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">4.5초</span>
                        <span className="text-xs text-blue-600">↘ -0.2초</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">이번 달 평균</span>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 개인 맞춤 학습 권장사항</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">🎯</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">집중 학습 영역</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Level 3의 관계대명사와 Level 4의 비즈니스 표현에서 정확도가 낮습니다. 
                      이 영역을 집중적으로 복습하는 것을 권장합니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">⏰</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">최적 학습 시간</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      오후 7-9시에 가장 좋은 성과를 보이고 있습니다. 
                      이 시간대에 어려운 내용을 학습하시면 더 효과적입니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-purple-500 text-xl">📚</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">학습량 조절</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              뒤로가기
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">📊 진도 관리</h1>
          </div>
          
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
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-100'
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