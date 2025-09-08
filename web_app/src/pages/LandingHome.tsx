import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useStageSelection, useTheme } from '@/store/useAppStore';
import { StageSelectionModal } from '@/components/StageSelectionModal';
import { useThemedStyles, useThemedInlineStyles } from '@/hooks/useThemedStyles';

export const LandingHome: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { setSelectedLevel, setStageModalOpen } = useStageSelection();
  const { themeMode, setThemeMode } = useTheme();
  const themedStyles = useThemedStyles();
  const inlineStyles = useThemedInlineStyles();

  // 완성된 레벨들과 사용 가능한 스테이지 정보
  const availableLevels = [
    { 
      level: 1, 
      title: '기초 표현', 
      description: 'A1 영어 기초 패턴', 
      stages: 19, 
      completed: true,
      color: 'bg-emerald-500'
    },
    { 
      level: 2, 
      title: '기본 패턴', 
      description: 'A2-B1 기초 문법', 
      stages: 20, 
      completed: true,
      color: 'bg-green-500'
    },
    { 
      level: 3, 
      title: '고급 문법', 
      description: 'B1-B2 복문 구조', 
      stages: 28, 
      completed: true,
      color: 'bg-blue-500'
    },
    { 
      level: 4, 
      title: '고급 표현', 
      description: 'B2-C1 실무 영어', 
      stages: 29, 
      completed: true,
      color: 'bg-purple-500'
    },
    { 
      level: 5, 
      title: '고급 비즈니스', 
      description: 'C1-C2 비즈니스 영어', 
      stages: 29, 
      completed: true,
      color: 'bg-indigo-500'
    },
    { 
      level: 6, 
      title: '도메인 전문성', 
      description: 'C2 전문 분야 영어', 
      stages: 34, 
      completed: true,
      color: 'bg-orange-500'
    },
    { 
      level: 7, 
      title: '비즈니스 영어', 
      description: 'C2 고급 비즈니스', 
      stages: 42, 
      completed: true,
      color: 'bg-red-500'
    },
    { 
      level: 8, 
      title: '고급 담화', 
      description: 'C2+ 고급 표현', 
      stages: 46, 
      completed: true,
      color: 'bg-pink-500'
    },
    { 
      level: 9, 
      title: '전문가 담화', 
      description: 'Expert 전문가 수준', 
      stages: 52, 
      completed: true,
      color: 'bg-violet-500'
    },
    { 
      level: 10, 
      title: '원어민 수준', 
      description: 'Native 원어민 수준', 
      stages: 52, 
      completed: true,
      color: 'bg-slate-600'
    }
  ];

  const showComingSoon = (feature: string) => {
    alert(`🚧 ${feature} 기능은 현재 개발 중입니다.\n\n곧 만나보실 수 있습니다! 😊`);
  };

  const handlePatternLearning = () => {
    navigate('/dashboard');
  };

  const handleProgressManagement = () => {
    navigate('/progress'); // 진도관리 페이지로 이동
  };

  // 동적 통계 계산
  const calculateStats = () => {
    // 현재 레벨 진행률 계산
    const currentLevelProgress = user.stage === 'ALL' 
      ? 100 
      : Math.round((user.stage / 19) * 100);
    
    // 전체 완성된 스테이지 수 (Level 1-2 완성 기준)
    const completedStages = user.level === 1 
      ? Math.max(0, user.stage - 1)
      : (user.level - 1) * 19 + (user.stage === 'ALL' ? 19 : user.stage - 1);
    
    // 연속 학습일 (로컬스토리지에서 가져오거나 기본값)
    const getConsecutiveDays = () => {
      try {
        const lastStudyDate = localStorage.getItem('lastStudyDate');
        const consecutiveDays = localStorage.getItem('consecutiveDays');
        const today = new Date().toDateString();
        
        if (lastStudyDate === today) {
          return parseInt(consecutiveDays || '1');
        }
        return 1; // 기본값
      } catch {
        return 1;
      }
    };
    
    return {
      currentLevel: user.level,
      stageProgress: user.stage === 'ALL' ? 'ALL' : `${user.stage}/19`,
      completionRate: `${Math.min(100, Math.round((completedStages / 380) * 100))}%`, // Level 1-10 총 380개 스테이지 기준
      consecutiveDays: getConsecutiveDays()
    };
  };

  const stats = calculateStats();

  // 스테이지 모달 이벤트 리스너
  useEffect(() => {
    // 패턴 트레이닝에서 뒤로가기 시 스테이지 모달 열기
    const handleOpenStageModal = (event: CustomEvent) => {
      const { level } = event.detail;
      setSelectedLevel(level);
      setStageModalOpen(true);
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('openStageModal', handleOpenStageModal as EventListener);
    
    return () => {
      window.removeEventListener('openStageModal', handleOpenStageModal as EventListener);
    };
  }, [setSelectedLevel, setStageModalOpen]);

  return (
    <div className="min-h-screen p-5" style={{ background: inlineStyles.base }}>
      <div className="max-w-4xl mx-auto rounded-2xl shadow-lg overflow-hidden" style={{ 
        background: inlineStyles.secondary, 
        border: `1px solid ${inlineStyles.border}` 
      }}>
        {/* Header */}
        <div className="p-10 text-center relative" style={{ 
          background: inlineStyles.secondary, 
          borderBottom: `1px solid ${inlineStyles.border}`,
          color: inlineStyles.text 
        }}>
          {/* Theme Toggle Button */}
          <button
            onClick={() => setThemeMode(themeMode === 'default' ? 'personal' : 'default')}
            className="absolute top-4 right-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{ 
              background: themeMode === 'personal' ? inlineStyles.primary : '#e5e7eb',
              color: themeMode === 'personal' ? 'white' : '#374151'
            }}
          >
            {themeMode === 'personal' ? '❓ 미정 테마' : '⚪ 기본 테마'}
          </button>
          
          <h1 className="text-5xl font-bold mb-3">🎯 DASI English</h1>
          <p className="text-xl opacity-90">다시 영어 - 한국인 특화 AI 영어 학습</p>
        </div>
        
        <div className="p-10">
          {/* 메인 학습 */}
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-5 pl-4" style={{ 
              color: inlineStyles.text, 
              borderLeft: `4px solid ${inlineStyles.primary}` 
            }}>
              메인 학습
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={handlePatternLearning}
                className="group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl text-left overflow-hidden"
                style={{
                  background: inlineStyles.secondary,
                  border: `2px solid ${inlineStyles.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = inlineStyles.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = inlineStyles.border;
                }}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  style={{ background: inlineStyles.primary }}
                ></div>
                <div className="text-4xl mb-4">📚</div>
                <div className="text-xl font-bold mb-3" style={{ color: inlineStyles.text }}>패턴 학습 (Lv1~10)</div>
                <div className="leading-relaxed" style={{ color: inlineStyles.text, opacity: 0.7 }}>
                  한국인 특화 27개 문법 패턴을 3초→1초 속도로 완전 자동화하는 체계적 훈련
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('모방 학습')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-blue-400 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">🎭</div>
                <div className="text-xl font-bold mb-3 text-gray-800">모방 학습 (Lv1~10)</div>
                <div className="text-gray-600 leading-relaxed">
                  원어민 대화를 듣고 자신의 말로 재구성하는 자연스러운 회화 훈련
                </div>
              </button>
            </div>
          </div>
          
          {/* 학습 관리 */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-5 border-l-4 border-gray-500 pl-4">
              학습 관리
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={handleProgressManagement}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-gray-400 text-left overflow-hidden"
              >
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  SRS 활성
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📊</div>
                <div className="text-xl font-bold mb-3 text-gray-800">진도관리</div>
                <div className="text-gray-600 leading-relaxed">
                  망각곡선 기반 복습 알림, 학습 현황 및 다음 단계 추천
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('통계·성과')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-gray-400 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📈</div>
                <div className="text-xl font-bold mb-3 text-gray-800">통계·성과</div>
                <div className="text-gray-600 leading-relaxed">
                  정답률, 학습시간, 레벨별 성취도 및 주/월별 학습 패턴 분석
                </div>
              </button>
            </div>
          </div>
          
          {/* 보조 학습 */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-5 border-l-4 border-gray-600 pl-4">
              보조 학습
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={() => showComingSoon('단어장')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-gray-500 text-left overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📖</div>
                <div className="text-xl font-bold mb-3 text-gray-800">단어장</div>
                <div className="text-gray-600 leading-relaxed">
                  20,000개 어휘 검색, 레벨별 단어 목록, 개인 즐겨찾기 관리
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('설정')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-gray-500 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">⚙️</div>
                <div className="text-xl font-bold mb-3 text-gray-800">설정</div>
                <div className="text-gray-600 leading-relaxed">
                  음성 설정, 알림 설정, 학습 환경 개인화 및 계정 관리
                </div>
              </button>
            </div>
          </div>
          
          {/* 학습 현황 및 진행률 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Level {stats.currentLevel}</div>
              <div className="text-xs text-gray-600 mt-1">현재 레벨</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.stageProgress}</div>
              <div className="text-xs text-gray-600 mt-1">스테이지 진행률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completionRate}</div>
              <div className="text-xs text-gray-600 mt-1">전체 완성도</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.consecutiveDays}일</div>
              <div className="text-xs text-gray-600 mt-1">연속 학습</div>
            </div>
          </div>
        </div>

        {/* Stage Selection Modal */}
        <StageSelectionModal availableLevels={availableLevels} />
      </div>
    </div>
  );
};