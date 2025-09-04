import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useStageSelection } from '@/store/useAppStore';
import { StageSelectionModal } from '@/components/StageSelectionModal';

export const LandingHome: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { setSelectedLevel, setStageModalOpen } = useStageSelection();

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

  // 통계 애니메이션 및 스테이지 모달 이벤트 리스너
  useEffect(() => {
    const animateStats = () => {
      const statElements = document.querySelectorAll('.stat-number');
      const targets = [1, 376, 27];
      
      statElements.forEach((element, index) => {
        if (index < 3) {
          let current = 0;
          const target = targets[index];
          const increment = target / 50;
          
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            element.textContent = Math.floor(current).toString();
          }, 30);
        }
      });
    };

    // 패턴 트레이닝에서 뒤로가기 시 스테이지 모달 열기
    const handleOpenStageModal = (event: CustomEvent) => {
      const { level } = event.detail;
      setSelectedLevel(level);
      setStageModalOpen(true);
    };

    const timer = setTimeout(animateStats, 500);
    
    // 커스텀 이벤트 리스너 등록
    window.addEventListener('openStageModal', handleOpenStageModal as EventListener);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('openStageModal', handleOpenStageModal as EventListener);
    };
  }, [setSelectedLevel, setStageModalOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600 p-5">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-10 text-center">
          <h1 className="text-5xl font-bold mb-3">🎯 DASI English</h1>
          <p className="text-xl opacity-90">다시 영어 - 한국인 특화 AI 영어 학습</p>
        </div>
        
        <div className="p-10">
          {/* 메인 학습 */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-700 mb-5 border-l-4 border-green-500 pl-4">
              메인 학습
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={handlePatternLearning}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-green-500 text-left overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📚</div>
                <div className="text-xl font-bold mb-3 text-gray-800">패턴 학습 (Lv1~10)</div>
                <div className="text-gray-600 leading-relaxed">
                  한국인 특화 27개 문법 패턴을 3초→1초 속도로 완전 자동화하는 체계적 훈련
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('모방 학습')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-green-500 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
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
            <h2 className="text-xl font-bold text-gray-700 mb-5 border-l-4 border-amber-500 pl-4">
              학습 관리
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={handleProgressManagement}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-amber-500 text-left overflow-hidden"
              >
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  SRS 활성
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📊</div>
                <div className="text-xl font-bold mb-3 text-gray-800">진도관리</div>
                <div className="text-gray-600 leading-relaxed">
                  망각곡선 기반 복습 알림, 학습 현황 및 다음 단계 추천
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('통계·성과')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-amber-500 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
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
            <h2 className="text-xl font-bold text-gray-700 mb-5 border-l-4 border-purple-500 pl-4">
              보조 학습
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={() => showComingSoon('단어장')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-purple-500 text-left overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">📖</div>
                <div className="text-xl font-bold mb-3 text-gray-800">단어장</div>
                <div className="text-gray-600 leading-relaxed">
                  20,000개 어휘 검색, 레벨별 단어 목록, 개인 즐겨찾기 관리
                </div>
              </button>
              
              <button
                onClick={() => showComingSoon('설정')}
                className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:border-purple-500 text-left overflow-hidden opacity-70"
              >
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold">
                  준비중
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                <div className="text-4xl mb-4">⚙️</div>
                <div className="text-xl font-bold mb-3 text-gray-800">설정</div>
                <div className="text-gray-600 leading-relaxed">
                  음성 설정, 알림 설정, 학습 환경 개인화 및 계정 관리
                </div>
              </button>
            </div>
          </div>
          
          {/* 학습 현황 미리보기 */}
          <div className="flex justify-around p-5 bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="stat-number text-3xl font-bold text-indigo-600">1</div>
              <div className="text-sm text-gray-600 mt-1">현재 레벨</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-3xl font-bold text-indigo-600">376</div>
              <div className="text-sm text-gray-600 mt-1">패턴 데이터베이스</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-3xl font-bold text-indigo-600">27</div>
              <div className="text-sm text-gray-600 mt-1">한국인 특화 패턴</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">20K</div>
              <div className="text-sm text-gray-600 mt-1">어휘 데이터베이스</div>
            </div>
          </div>
        </div>

        {/* Stage Selection Modal */}
        <StageSelectionModal availableLevels={availableLevels} />
      </div>
    </div>
  );
};