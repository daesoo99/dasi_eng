import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, useUser, useTheme, useSpeakingStage, useStageProgress } from '@/store/useAppStore';
import { useStatistics } from '@/hooks/useStatistics';
import { useThemedInlineStyles } from '@/hooks/useThemedStyles';

export const DashboardHome: React.FC = memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [currentViewLevel, setCurrentViewLevel] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | string | null>(null);
  const [currentView, setCurrentView] = useState<'levels' | 'stage' | 'review' | 'stats' | 'curve' | 'situational'>('levels');
  const [currentTab, setCurrentTab] = useState<'pattern' | 'situational'>('pattern');
  
  // Theme System
  const { themeMode, setThemeMode } = useTheme();
  const inlineStyles = useThemedInlineStyles();
  
  // Speaking Stage System (3단계 선택)
  const { stage: speakingStage, setSpeakingStage } = useSpeakingStage();
  
  // Stage Progress System (3단계 진행률 관리)
  const { getStageProgress } = useStageProgress();

  // 사용자 상태 및 통계 Hook
  const user = useUser();
  const { 
    metrics, 
    levelProgress, 
    formattedMetrics, 
    isLoading: statsLoading, 
    error: statsError,
    refresh: refreshStats 
  } = useStatistics({ 
    userId: user.id,
    enabled: !!user.id,
    refreshInterval: 5 * 60 * 1000 // 5분마다 자동 새로고침
  });

  // URL 파라미터 확인하여 바로 스테이지 뷰 열기
  useEffect(() => {
    const levelParam = searchParams.get('level');
    const viewParam = searchParams.get('view');
    
    if (levelParam && viewParam === 'stage') {
      const level = parseInt(levelParam);
      if (level >= 1 && level <= 10) {
        showStageView(level);
      }
    }
  }, [searchParams]);

  // Memoize level data to prevent recalculation
  const levelData = useMemo(() => [
    {
      level: 1,
      title: "구조 패턴 중심 (19 스테이지)",
      description: "영어 문장의 기본 뼈대를 단계별로 습득",
      verbs: ["Be동사", "일반동사", "부정문", "의문문", "기초확장"],
      targetAccuracy: 80,
      targetSpeed: 3.0,
      stages: 19,
      stageVerbs: {
        1: ["Be동사 현재"], 2: ["Be동사 과거"], 3: ["Be동사 미래"],
        4: ["일반동사 현재"], 5: ["일반동사 과거"], 6: ["일반동사 미래"],
        7: ["Be동사 부정"], 8: ["일반동사 부정"],
        9: ["Be동사 의문문"], 10: ["일반동사 의문문"], 11: ["Wh- 질문"],
        12: ["There is/are"], 13: ["I like"], 14: ["I have"], 15: ["I want to"],
        16: ["at/in/on 전치사"], 17: ["a/an/the 관사"], 18: ["This/That"], 19: ["Please/Can you"]
      }
    },
    {
      level: 2,
      title: "기본 문법 패턴",
      description: "be동사, 일반동사, 조동사의 기본 패턴 습득",
      verbs: ["be동사", "일반동사", "조동사", "현재진행형", "과거형", "미래형"],
      targetAccuracy: 80,
      targetSpeed: 2.5,
      stages: 20,
      stageVerbs: {
        1: ["be동사 현재형 (긍정문)"], 2: ["be동사 현재형 (부정문)"], 3: ["be동사 현재형 (의문문)"],
        4: ["일반동사 현재형 (긍정문)"], 5: ["일반동사 현재형 (부정문)"], 6: ["일반동사 현재형 (의문문)"],
        7: ["현재진행형 (긍정문)"], 8: ["현재진행형 (부정문)"], 9: ["현재진행형 (의문문)"],
        10: ["can 조동사 (긍정문)"], 11: ["can 조동사 (부정문)"], 12: ["can 조동사 (의문문)"],
        13: ["과거형 (긍정문)"], 14: ["과거형 (부정문)"], 15: ["과거형 (의문문)"],
        16: ["will 미래형 (긍정문)"], 17: ["will 미래형 (부정문)"], 18: ["will 미래형 (의문문)"],
        19: ["have to 의무형"], 20: ["종합 복습 및 비교급"]
      }
    },
    {
      level: 3,
      title: "시제·태·논리 확장 패턴",
      description: "복합 시제, 조동사, 관계절, 논리 연결의 고급 문법 패턴",
      verbs: ["미래형심화", "현재완료", "과거완료", "수동태", "조동사확장", "조건문", "가정법"],
      targetAccuracy: 85,
      targetSpeed: 2.0,
      stages: 30,
      stageVerbs: {
        1: ["미래형 심화 (will vs be going to)"], 2: ["현재완료 경험·완료 용법"],
        3: ["현재완료 결과·계속 + 시간표현"], 4: ["과거완료·과거완료진행형"],
        5: ["수동태 기본 (be + p.p.)"], 6: ["수동태 심화 (조동사 + 수동태)"],
        7: ["조동사 확장 1 (would, could, might)"], 8: ["조동사 확장 2 (should have, could have)"],
        9: ["조건문 기본 (1형식, 2형식)"], 10: ["가정법 과거 (If I were you)"],
        11: ["가정법 과거완료 (If I had known)"]
      }
    },
    {
      level: 4,
      title: "거래 동사",
      description: "진행형/부정/의문 혼합 + 1초 도전 일부",
      verbs: ["buy", "sell", "use", "try", "find"],
      targetAccuracy: 85,
      targetSpeed: 2.0,
      stages: 32,
      stageVerbs: {
        1: ["buy"], 2: ["sell"], 3: ["use"], 4: ["try"], 5: ["find"],
        6: ["buy", "sell"], 7: ["use", "try"], 8: ["find", "buy"], 9: ["sell", "use"], 10: ["buy", "sell", "use", "try", "find"]
      }
    },
    {
      level: 5,
      title: "소통 동사",
      description: "3인칭 단수/과거 혼합 패턴",
      verbs: ["give", "tell", "show", "meet", "help"],
      targetAccuracy: 88,
      targetSpeed: 1.5,
      stages: 30,
      stageVerbs: {
        1: ["give"], 2: ["tell"], 3: ["show"], 4: ["meet"], 5: ["help"],
        6: ["give", "tell"], 7: ["show", "meet"], 8: ["help", "give"], 9: ["tell", "show"], 10: ["give", "tell", "show", "meet", "help"]
      }
    },
    {
      level: 6,
      title: "행동 동사",
      description: "시제 전환 속도 증가",
      verbs: ["come", "leave", "start", "finish", "plan"],
      targetAccuracy: 88,
      targetSpeed: 1.5,
      stages: 44,
      stageVerbs: {
        1: ["come"], 2: ["leave"], 3: ["start"], 4: ["finish"], 5: ["plan"],
        6: ["come", "leave"], 7: ["start", "finish"], 8: ["plan", "come"], 9: ["leave", "start"], 10: ["come", "leave", "start", "finish", "plan"]
      }
    },
    {
      level: 7,
      title: "선택 동사",
      description: "이유/의견 연결 패턴",
      verbs: ["choose", "decide", "prefer", "expect", "suppose"],
      targetAccuracy: 90,
      targetSpeed: 1.2,
      stages: 42,
      stageVerbs: {
        1: ["choose"], 2: ["decide"], 3: ["prefer"], 4: ["expect"], 5: ["suppose"],
        6: ["choose", "decide"], 7: ["prefer", "expect"], 8: ["suppose", "choose"], 9: ["decide", "prefer"], 10: ["choose", "decide", "prefer", "expect", "suppose"]
      }
    },
    {
      level: 8,
      title: "허용 동사",
      description: "let/make, to부정사 패턴 확장",
      verbs: ["keep", "let", "allow", "suggest", "recommend"],
      targetAccuracy: 90,
      targetSpeed: 1.2,
      stages: 50,
      stageVerbs: {
        1: ["keep"], 2: ["let"], 3: ["allow"], 4: ["suggest"], 5: ["recommend"],
        6: ["keep", "let"], 7: ["allow", "suggest"], 8: ["recommend", "keep"], 9: ["let", "allow"], 10: ["keep", "let", "allow", "suggest", "recommend"]
      }
    },
    {
      level: 9,
      title: "전문 동사",
      description: "추상/업무형 단어 혼입",
      verbs: ["improve", "reduce", "compare", "analyze", "design"],
      targetAccuracy: 92,
      targetSpeed: 1.0,
      stages: 48,
      stageVerbs: {
        1: ["improve"], 2: ["reduce"], 3: ["compare"], 4: ["analyze"], 5: ["design"],
        6: ["improve", "reduce"], 7: ["compare", "analyze"], 8: ["design", "improve"], 9: ["reduce", "compare"], 10: ["improve", "reduce", "compare", "analyze", "design"]
      }
    },
    {
      level: 10,
      title: "고급 동사",
      description: "고난도 조합 패턴",
      verbs: ["coordinate", "negotiate", "prioritize", "implement", "evaluate"],
      targetAccuracy: 95,
      targetSpeed: 1.0,
      stages: 50,
      stageVerbs: {
        1: ["coordinate"], 2: ["negotiate"], 3: ["prioritize"], 4: ["implement"], 5: ["evaluate"],
        6: ["coordinate", "negotiate"], 7: ["prioritize", "implement"], 8: ["evaluate", "coordinate"], 9: ["negotiate", "prioritize"], 10: ["coordinate", "negotiate", "prioritize", "implement", "evaluate"]
      }
    }
  ], []);

  // 상황학습 6그룹 데이터
  const situationalData = [
    {
      group: 1,
      title: "Customer Excellence",
      subtitle: "고객 서비스 완성",
      stages: "A5-S17~S20",
      difficulty: 2,
      description: "고객과의 서비스 완료 및 관계 유지",
      scenarios: ["서비스 문의 응답", "문제 해결 제안", "서비스 품질 확인", "서비스 종료 및 관계 유지"],
      completed: false,
      progress: 0
    },
    {
      group: 2,
      title: "Professional Communication",
      subtitle: "전문 소통 능력",
      stages: "A4-S13~S16",
      difficulty: 3,
      description: "이메일, 보고서, 업무 커뮤니케이션",
      scenarios: ["이메일 감사 및 확인", "보고서 작성 및 검토", "보고서 권고사항 및 실행계획", "문서 승인 및 피드백"],
      completed: false,
      progress: 0
    },
    {
      group: 3,
      title: "Meeting Leadership",
      subtitle: "회의 진행 리더십",
      stages: "A1-S01~S04",
      difficulty: 3,
      description: "회의 주도 및 효과적 진행",
      scenarios: ["회의 시작 및 목적 설명", "안건 제시 및 논의 유도", "의견 조율 및 합의 도출", "회의 정리 및 후속 조치"],
      completed: false,
      progress: 0
    },
    {
      group: 4,
      title: "Presentation Mastery",
      subtitle: "발표 완성도",
      stages: "A2-S05~S08",
      difficulty: 3,
      description: "효과적인 프레젠테이션 및 설득",
      scenarios: ["발표 시작 및 개요 소개", "핵심 내용 전달", "질의응답 및 토론", "발표 마무리 및 감사"],
      completed: false,
      progress: 0
    },
    {
      group: 5,
      title: "Strategic Negotiation",
      subtitle: "전략적 협상",
      stages: "A3-S09~S12",
      difficulty: 4,
      description: "비즈니스 협상 및 거래 성사",
      scenarios: ["협상 시작 및 조건 제시", "상호 이익 탐색", "양보 및 대안 모색", "확정 및 거래 마무리"],
      completed: false,
      progress: 0
    },
    {
      group: 6,
      title: "Team Leadership",
      subtitle: "팀 리더십",
      stages: "A6-S21~S24",
      difficulty: 4,
      description: "팀 관리 및 프로젝트 리더십",
      scenarios: ["팀 동기부여 및 목표 설정", "성과 피드백 및 코칭", "갈등 해결 및 팀 조율", "프로젝트 완료 및 성과 공유"],
      completed: false,
      progress: 0
    }
  ];

  // Level 5 학술연구 6그룹 데이터
  const level5SituationalData = [
    {
      group: 1,
      title: "Research Foundation",
      subtitle: "연구 기초 설정",
      stages: "A1-S01~S04",
      difficulty: 3,
      description: "연구 목적, 가설, 이론적 근거 설정",
      scenarios: ["연구 목적 및 가설 제시", "이론적 근거 수립", "연구 디자인 설정", "선행연구 검토"],
      completed: false,
      progress: 0
    },
    {
      group: 2,
      title: "Academic Presentation",
      subtitle: "학술 발표 마스터리",
      stages: "A2-S05~S08",
      difficulty: 3,
      description: "학술 발표 및 논문 발표 기법",
      scenarios: ["학술 발표 도입 및 구조화", "연구 결과 제시", "논의 및 토론 진행", "발표 마무리 및 Q&A"],
      completed: false,
      progress: 0
    },
    {
      group: 3,
      title: "Research Methodology",
      subtitle: "연구방법론 전문성",
      stages: "A3-S09~S12",
      difficulty: 4,
      description: "연구방법, 데이터 분석 및 해석",
      scenarios: ["연구방법 선택 및 설명", "데이터 수집 및 분석", "결과 해석 및 논의", "연구의 한계 인정"],
      completed: false,
      progress: 0
    },
    {
      group: 4,
      title: "Interdisciplinary Research",
      subtitle: "학제간 연구 협력",
      stages: "A4-S13~S16",
      difficulty: 4,
      description: "다학제 연구 및 협력 프로젝트",
      scenarios: ["학제간 연구 협력", "통합 방법론 개발", "공동연구 프로젝트", "연구성과 공유"],
      completed: false,
      progress: 0
    },
    {
      group: 5,
      title: "Publication & Peer Review",
      subtitle: "논문 출판 및 심사",
      stages: "A5-S17~S20",
      difficulty: 4,
      description: "학술지 발표 및 동료심사 과정",
      scenarios: ["논문 작성 및 제출", "동료심사 대응", "수정 및 재제출", "학술적 기여도 평가"],
      completed: false,
      progress: 0
    },
    {
      group: 6,
      title: "Academic Leadership",
      subtitle: "학술 리더십",
      stages: "A6-S21~S24",
      difficulty: 5,
      description: "연구팀 리더십 및 학술계 기여",
      scenarios: ["연구팀 리더십", "학술 네트워킹", "연구비 획득 및 관리", "학계 기여 및 영향력"],
      completed: false,
      progress: 0
    }
  ];

  // Level 6 전문분야 4그룹 데이터
  const level6SituationalData = [
    {
      group: 1,
      title: "Legal Excellence",
      subtitle: "법률 전문성",
      stages: "D1-S01~S03",
      difficulty: 5,
      description: "법률 계약서 작성 및 법률 자문",
      scenarios: ["법률 계약서 작성 및 검토", "법률 자문 및 상담", "법적 분쟁 해결"],
      completed: false,
      progress: 0
    },
    {
      group: 2,
      title: "Medical Professional",
      subtitle: "의료 전문성",
      stages: "D2-S04~S06",
      difficulty: 5,
      description: "의료 진료 및 환자 커뮤니케이션",
      scenarios: ["환자 진료 및 상담", "의료진 소통", "진단 및 치료 계획"],
      completed: false,
      progress: 0
    },
    {
      group: 3,
      title: "Technical Engineering",
      subtitle: "기술 엔지니어링",
      stages: "D3-S07~S09",
      difficulty: 5,
      description: "기술 설계 및 엔지니어링 커뮤니케이션",
      scenarios: ["기술 설계 및 개발", "엔지니어링 커뮤니케이션", "품질 보증 및 최적화"],
      completed: false,
      progress: 0
    },
    {
      group: 4,
      title: "Financial Expertise",
      subtitle: "금융 전문성",
      stages: "D4-S10~S12",
      difficulty: 5,
      description: "금융 분석 및 투자 자문",
      scenarios: ["금융 상품 설계", "투자 자문 및 위험관리", "금융시장 분석"],
      completed: false,
      progress: 0
    }
  ];

  // 사용자 진행 상황 (임시 데이터)
  const [userProgress] = useState({
    currentLevel: 1,
    levels: [
      { 
        level: 1, 
        completed: false, 
        progress: 0, 
        bestAccuracy: 0, 
        attempts: 0,
        stages: Array.from({length: 19}, (_, i) => ({ 
          stage: i + 1, 
          completed: false, 
          accuracy: 0, 
          attempts: 0 
        }))
      },
      { 
        level: 2, 
        completed: false, 
        progress: 0,  // Level 1 완료 전까지 0%
        bestAccuracy: 0, 
        attempts: 0,
        stages: [
          { stage: 1, completed: false, accuracy: 0, attempts: 0 },
          { stage: 2, completed: false, accuracy: 0, attempts: 0 },
          { stage: 3, completed: false, accuracy: 0, attempts: 0 },
          { stage: 4, completed: false, accuracy: 0, attempts: 0 },
          ...Array.from({length: 16}, (_, i) => ({ 
            stage: i + 5, 
            completed: false, 
            accuracy: 0, 
            attempts: 0 
          }))
        ]
      },
      ...Array.from({length: 8}, (_, i) => ({
        level: i + 3,
        completed: false,
        progress: 0,
        bestAccuracy: 0,
        attempts: 0,
        stages: Array.from({length: levelData[i + 2]?.stages || 10}, (_, j) => ({
          stage: j + 1,
          completed: false,
          accuracy: 0,
          attempts: 0
        }))
      }))
    ]
  });

  // 모드 토글 기능
  const toggleDeveloperMode = useCallback(() => {
    setIsDeveloperMode(!isDeveloperMode);
    console.log(isDeveloperMode ? '👤 일반 모드 활성화' : '🔧 개발자 모드 활성화');
  }, [isDeveloperMode]);

  // 레벨 카드 생성 함수
  const createLevelCards = useCallback(() => {
    return levelData.map(level => {
      const userLevelData = userProgress.levels.find(l => l.level === level.level) || 
                          { level: level.level, completed: false, progress: 0, bestAccuracy: 0, attempts: 0 };
      
      const isUnlocked = isDeveloperMode || level.level === 1 || 
                       (userProgress.levels.find(l => l.level === level.level - 1)?.completed);
      const isCompleted = userLevelData.completed;
      
      let icon = '🔒';
      if (isCompleted) icon = '🏆';
      else if (isUnlocked) icon = '⭐';
      
      return (
        <div
          key={level.level}
          className={`level-card ${isCompleted ? 'completed' : (isUnlocked ? 'unlocked' : 'locked')}`}
          onClick={isUnlocked ? () => showStageView(level.level) : undefined}
          style={{
            background: '#ffffff',
            borderRadius: '15px',
            padding: '25px',
            cursor: isUnlocked ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            border: isCompleted ? '3px solid #f59e0b' : (isUnlocked ? '3px solid #10b981' : '3px solid transparent'),
            position: 'relative',
            opacity: isUnlocked ? 1 : 0.6
          }}
          onMouseEnter={(e) => {
            if (isUnlocked) {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (isUnlocked) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#1f2937' }}>Level {level.level}</div>
            <div style={{ fontSize: '2em' }}>{icon}</div>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '8px', marginBottom: '15px', overflow: 'hidden' }}>
            <div style={{ 
              background: 'linear-gradient(90deg, #10b981, #059669)', 
              height: '100%', 
              borderRadius: '10px', 
              transition: 'width 0.5s ease',
              width: `${userLevelData.progress}%`
            }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#64748b' }}>
            <span>진행률: {userLevelData.progress}%</span>
            <span>최고: {userLevelData.bestAccuracy}%</span>
          </div>
          <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937' }}>{level.title}</h3>
          <div style={{ fontSize: '0.9em', color: '#64748b', marginTop: '10px' }}>{level.description}</div>
          <div style={{ fontSize: '0.9em', color: '#64748b', marginTop: '10px' }}>
            <strong>동사:</strong> {level.verbs.join(', ')}
          </div>
          <div style={{ fontSize: '0.9em', color: '#64748b' }}>
            <strong>목표:</strong> 정확도 {level.targetAccuracy}%
          </div>
        </div>
      );
    });
  }, [userProgress.levels, isDeveloperMode, levelData]);

  // 스테이지 뷰 표시
  const showStageView = (levelNum: number) => {
    setCurrentViewLevel(levelNum);
    setCurrentView('stage');
  };

  // 스테이지 스텝 생성 (실제 진행률 데이터 사용)

  const createStageSteps = (level: any) => {
    const userLevelData = userProgress.levels.find(l => l.level === level.level);
    const userStages = userLevelData?.stages || [];
    
    const steps = [];
    
    for (let i = 1; i <= level.stages; i++) {
      const stageData = userStages.find(s => s.stage === i);
      const stageProgress = getStageProgress(level.level, i); // [1단계, 2단계, 3단계] 완료 여부 - 실제 데이터 사용
      const completedSteps = stageProgress.filter(Boolean).length; // 완료된 단계 수
      const progressPercentage = (completedSteps / 3) * 100; // 진행률
      
      let stepClass = 'step';
      let title = '';
      
      if (stageData?.completed) {
        stepClass += ' completed';
        title = `완료됨 - 정확도: ${stageData.accuracy}%, 시도: ${stageData.attempts}번`;
      } else if (isDeveloperMode || i === 1 || (userStages.find(s => s.stage === i - 1)?.completed)) {
        if (stageData && stageData.attempts > 0) {
          stepClass += ' current';
          title = `진행중 - 최고: ${stageData.accuracy}%, 시도: ${stageData.attempts}번`;
        } else {
          stepClass += ' current';
          title = '시작 가능';
        }
      } else {
        stepClass += ' locked';
        title = '잠금됨 - 이전 스테이지를 완료하세요';
      }
      
      steps.push(
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* 스테이지 원 */}
          <div
            className={stepClass}
            title={title}
            onClick={() => !stepClass.includes('locked') && selectStage(level.level, i)}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              cursor: stepClass.includes('locked') ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              fontSize: '14px',
              background: stepClass.includes('completed') ? '#10b981' : 
                         stepClass.includes('current') ? '#3b82f6' : '#e5e7eb',
              color: stepClass.includes('locked') ? '#9ca3af' : 'white',
              animation: stepClass.includes('current') ? 'pulse 2s infinite' : 'none',
              border: selectedStage === i ? '3px solid #f59e0b' : '2px solid transparent',
              boxShadow: selectedStage === i ? '0 0 0 2px rgba(245, 158, 11, 0.3)' : 'none'
            }}
          >
            {i}
          </div>
          
          {/* 3단계 진행률 표시 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            width: '60px'
          }}>
            {/* 진행률 바 */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: progressPercentage === 100 ? '#10b981' : progressPercentage > 0 ? '#3b82f6' : '#e5e7eb',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            
            {/* 3단계 점 표시 */}
            <div style={{
              display: 'flex',
              gap: '3px',
              alignItems: 'center'
            }}>
              {stageProgress.map((completed, stepIndex) => (
                <div
                  key={stepIndex}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: completed ? '#10b981' : '#d1d5db',
                    transition: 'background-color 0.3s ease'
                  }}
                  title={`${stepIndex + 1}단계 ${completed ? '완료' : '미완료'}`}
                />
              ))}
            </div>
            
            {/* 진행률 텍스트 */}
            <div style={{
              fontSize: '10px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              {completedSteps}/3
            </div>
          </div>
        </div>
      );
    }
    
    // ALL 버튼 추가
    const allStagesCompleted = userStages.length === level.stages && userStages.every(stage => stage.completed);
    const isAllUnlocked = isDeveloperMode || allStagesCompleted;
    
    steps.push(
      <div
        key="ALL"
        className={`step all-step ${!isAllUnlocked ? 'locked' : ''}`}
        title={isAllUnlocked ? '레벨 전체 동사 통합 훈련' : '잠금됨 - 모든 스테이지를 완료하세요'}
        onClick={isAllUnlocked ? () => selectAllStage(level.level) : undefined}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '12px',
          cursor: isAllUnlocked ? 'pointer' : 'not-allowed',
          background: isAllUnlocked ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
          color: isAllUnlocked ? 'white' : '#9ca3af',
          border: selectedStage === 'ALL' ? '3px solid #ef4444' : '2px solid transparent',
          boxShadow: selectedStage === 'ALL' ? '0 0 0 2px rgba(239, 68, 68, 0.3)' : 'none'
        }}
      >
        ALL
      </div>
    );
    
    return steps;
  };

  // 스테이지 선택
  const selectStage = (levelNum: number, stageNum: number) => {
    console.log(`Selected Level ${levelNum}, Stage ${stageNum}`);
    if (selectedStage === stageNum) {
      setSelectedStage(null); // 같은 스테이지 클릭시 선택 해제
    } else {
      setSelectedStage(stageNum);
    }
    
    const level = levelData.find(l => l.level === levelNum);
    const userLevelData = userProgress.levels.find(l => l.level === levelNum);
    const stageData = userLevelData?.stages?.find(s => s.stage === stageNum);
  };

  // ALL 스테이지 선택
  const selectAllStage = (levelNum: number) => {
    const level = levelData.find(l => l.level === levelNum);
    const userLevelData = userProgress.levels.find(l => l.level === levelNum);
    const userStages = userLevelData?.stages || [];
    
    const allStagesCompleted = userStages.length === level!.stages && userStages.every(stage => stage.completed);
    
    if (!isDeveloperMode && !allStagesCompleted) {
      alert('모든 스테이지를 완료해야 ALL 모드를 사용할 수 있습니다!');
      return;
    }
    
    console.log(`Selected Level ${levelNum}, ALL Stages`);
    if (selectedStage === 'ALL') {
      setSelectedStage(null); // 같은 ALL 클릭시 선택 해제
    } else {
      setSelectedStage('ALL');
    }
  };

  // 스테이지 시작
  const startStage = () => {
    if (currentViewLevel && selectedStage) {
      const level = levelData.find(l => l.level === currentViewLevel);
      
      let stageVerbs;
      if (selectedStage === 'ALL') {
        stageVerbs = level!.verbs;
      } else {
        stageVerbs = level?.stageVerbs?.[selectedStage as number] || level?.verbs || [];
      }
      
      // pattern-training으로 이동
      const params = new URLSearchParams({
        level: currentViewLevel.toString(),
        stage: selectedStage.toString(),
        verbs: stageVerbs.join(','),
        targetAccuracy: level!.targetAccuracy.toString(),
        developerMode: isDeveloperMode ? 'true' : 'false'
      });
      
      navigate(`/pattern-training?${params.toString()}`);
    } else {
      alert('먼저 스테이지를 선택해주세요!');
    }
  };

  const currentLevel = currentViewLevel ? levelData.find(l => l.level === currentViewLevel) : null;

  return (
    <div className="font-sans bg-gray-50 dark:bg-gray-900 min-h-screen p-5 transition-colors duration-300">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        {/* 헤더 */}
        <div style={{
          background: inlineStyles.secondary,
          color: inlineStyles.text,
          padding: '30px',
          textAlign: 'center',
          position: 'relative',
          borderBottom: `1px solid ${inlineStyles.border}`
        }}>
          {/* 홈 버튼 */}
          <button
            onClick={() => navigate('/')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 15px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            🏠 홈
          </button>
          {/* 모드 토글 */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '25px',
            padding: '8px 15px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: isDeveloperMode ? '500' : 'bold',
              opacity: isDeveloperMode ? 0.8 : 1
            }}>일반</span>
            <div
              onClick={toggleDeveloperMode}
              style={{
                position: 'relative',
                width: '50px',
                height: '24px',
                background: isDeveloperMode ? '#10b981' : 'rgba(255,255,255,0.3)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: isDeveloperMode ? '28px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}></div>
            </div>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: isDeveloperMode ? 'bold' : '500',
              opacity: isDeveloperMode ? 1 : 0.8
            }}>개발자</span>
            {isDeveloperMode && (
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>DEV</div>
            )}
          </div>

          <h1 style={{ fontSize: '2.5em', marginBottom: '10px' }}>🎯 DASI English</h1>
          <p style={{ fontSize: '1.2em', opacity: 0.9 }}>Do you vs Are you 완전 정복 - 10레벨 시스템</p>
          
          {/* 탭 버튼 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '25px'
          }}>
            <button
              onClick={() => {
                setCurrentTab('pattern');
                setCurrentView('levels');
              }}
              style={{
                background: currentTab === 'pattern' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s'
              }}
            >
              📖 패턴학습
            </button>
            <button
              onClick={() => {
                setCurrentTab('situational');
                setCurrentView('situational');
              }}
              style={{
                background: currentTab === 'situational' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s'
              }}
            >
              💼 상황학습
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            marginTop: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                {statsLoading ? '...' : (formattedMetrics?.currentLevelText || user.level || '1')}
              </div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>현재 레벨</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: statsError ? '#ef4444' : 'inherit' }}>
                {statsLoading ? '...' : (formattedMetrics?.overallProgressText || '0%')}
              </div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>전체 진행률</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: statsError ? '#ef4444' : 'inherit' }}>
                {statsLoading ? '...' : (formattedMetrics?.averageAccuracyText || '0%')}
              </div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>평균 정확도</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: statsError ? '#ef4444' : 'inherit' }}>
                {statsLoading ? '...' : (formattedMetrics?.incorrectCountText || '0')}
              </div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>틀린 문제</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold' }}>0</div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>복습 대기</div>
            </div>
          </div>
        </div>

        {/* 패턴학습 - 레벨 선택 화면 */}
        {currentView === 'levels' && currentTab === 'pattern' && (
          <div style={{ padding: '30px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {createLevelCards()}
            </div>
          </div>
        )}

        {/* 상황학습 화면 */}
        {currentView === 'situational' && (
          <div style={{ padding: '30px' }}>
            {/* Level 4 비즈니스 */}
            <div style={{ marginBottom: '50px' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.8em', marginBottom: '20px', textAlign: 'center' }}>
                💼 Level 4: Business Mastery
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {situationalData.map(group => {
                  const isCompleted = group.completed;
                  const difficultyStars = '⭐'.repeat(group.difficulty);
                  
                  return (
                    <div
                      key={group.group}
                      className={`situational-card ${isCompleted ? 'completed' : 'available'}`}
                      onClick={() => navigate(`/situational-training?level=4&group=${group.group}&title=${encodeURIComponent(group.title)}`)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '15px',
                        padding: '25px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: isCompleted ? '3px solid #f59e0b' : '3px solid #10b981',
                        position: 'relative',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#1f2937' }}>Group {group.group}</div>
                        <div style={{ fontSize: '1.5em' }}>{difficultyStars}</div>
                      </div>
                      <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: 'linear-gradient(90deg, #10b981, #059669)', 
                          height: '100%', 
                          borderRadius: '10px', 
                          transition: 'width 0.5s ease',
                          width: `${group.progress}%`
                        }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#64748b' }}>
                        <span>진행률: {group.progress}%</span>
                        <span>{group.stages}</span>
                      </div>
                      <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937' }}>{group.title}</h3>
                      <div style={{ fontSize: '1em', color: '#4338ca', fontWeight: '600', marginBottom: '8px' }}>{group.subtitle}</div>
                      <div style={{ fontSize: '0.9em', color: '#64748b', marginBottom: '15px' }}>{group.description}</div>
                      <div style={{ 
                        background: '#f1f5f9', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        fontSize: '0.8em', 
                        color: '#475569' 
                      }}>
                        <strong>주요 상황:</strong>
                        <ul style={{ margin: '5px 0 0 15px', lineHeight: '1.4' }}>
                          {group.scenarios.map((scenario, idx) => (
                            <li key={idx}>{scenario}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Level 5 학술연구 */}
            <div style={{ marginBottom: '50px' }}>
              <h2 style={{ color: '#1f2937', fontSize: '1.8em', marginBottom: '20px', textAlign: 'center' }}>
                🎓 Level 5: Academic Research Excellence
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {level5SituationalData.map(group => {
                  const isCompleted = group.completed;
                  const difficultyStars = '⭐'.repeat(group.difficulty);
                  
                  return (
                    <div
                      key={group.group}
                      className={`situational-card ${isCompleted ? 'completed' : 'available'}`}
                      onClick={() => navigate(`/situational-training?level=5&group=${group.group}&title=${encodeURIComponent(group.title)}`)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '15px',
                        padding: '25px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: isCompleted ? '3px solid #f59e0b' : '3px solid #0ea5e9',
                        position: 'relative',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#1f2937' }}>Group {group.group}</div>
                        <div style={{ fontSize: '1.5em' }}>{difficultyStars}</div>
                      </div>
                      <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: 'linear-gradient(90deg, #0ea5e9, #0284c7)', 
                          height: '100%', 
                          borderRadius: '10px', 
                          transition: 'width 0.5s ease',
                          width: `${group.progress}%`
                        }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#64748b' }}>
                        <span>진행률: {group.progress}%</span>
                        <span>{group.stages}</span>
                      </div>
                      <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937' }}>{group.title}</h3>
                      <div style={{ fontSize: '1em', color: '#0c4a6e', fontWeight: '600', marginBottom: '8px' }}>{group.subtitle}</div>
                      <div style={{ fontSize: '0.9em', color: '#64748b', marginBottom: '15px' }}>{group.description}</div>
                      <div style={{ 
                        background: '#f0f9ff', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        fontSize: '0.8em', 
                        color: '#0c4a6e' 
                      }}>
                        <strong>주요 상황:</strong>
                        <ul style={{ margin: '5px 0 0 15px', lineHeight: '1.4' }}>
                          {group.scenarios.map((scenario, idx) => (
                            <li key={idx}>{scenario}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Level 6 전문분야 */}
            <div>
              <h2 style={{ color: '#1f2937', fontSize: '1.8em', marginBottom: '20px', textAlign: 'center' }}>
                🎯 Level 6: Professional Domain Expertise
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {level6SituationalData.map(group => {
                  const isCompleted = group.completed;
                  const difficultyStars = '⭐'.repeat(group.difficulty);
                  
                  return (
                    <div
                      key={group.group}
                      className={`situational-card ${isCompleted ? 'completed' : 'available'}`}
                      onClick={() => navigate(`/situational-training?level=6&group=${group.group}&title=${encodeURIComponent(group.title)}`)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '15px',
                        padding: '25px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: isCompleted ? '3px solid #f59e0b' : '3px solid #c084fc',
                        position: 'relative',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#1f2937' }}>Group {group.group}</div>
                        <div style={{ fontSize: '1.5em' }}>{difficultyStars}</div>
                      </div>
                      <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: 'linear-gradient(90deg, #c084fc, #a855f7)', 
                          height: '100%', 
                          borderRadius: '10px', 
                          transition: 'width 0.5s ease',
                          width: `${group.progress}%`
                        }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#64748b' }}>
                        <span>진행률: {group.progress}%</span>
                        <span>{group.stages}</span>
                      </div>
                      <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937' }}>{group.title}</h3>
                      <div style={{ fontSize: '1em', color: '#7c2d92', fontWeight: '600', marginBottom: '8px' }}>{group.subtitle}</div>
                      <div style={{ fontSize: '0.9em', color: '#64748b', marginBottom: '15px' }}>{group.description}</div>
                      <div style={{ 
                        background: '#fdf4ff', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        fontSize: '0.8em', 
                        color: '#7c2d92' 
                      }}>
                        <strong>주요 상황:</strong>
                        <ul style={{ margin: '5px 0 0 15px', lineHeight: '1.4' }}>
                          {group.scenarios.map((scenario, idx) => (
                            <li key={idx}>{scenario}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 패턴학습 - 스테이지 상세 화면 */}
        {currentView === 'stage' && currentLevel && (
          <div style={{ padding: '30px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <button
                onClick={() => setCurrentView('levels')}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ← 레벨 선택으로
              </button>
              <div style={{ fontSize: '2em', color: '#1f2937' }}>
                Level {currentLevel.level} - {currentLevel.title}
              </div>
              <div></div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: currentLevel.level === 2 ? 'repeat(10, 1fr)' : 
                                 currentLevel.level === 3 ? 'repeat(10, 1fr)' : 'repeat(auto-fit, minmax(60px, 1fr))',
              justifyItems: 'center',
              alignItems: 'center',
              gap: '15px',
              margin: '30px 0',
              padding: '30px 20px',
              background: '#f8fafc',
              borderRadius: '15px',
              maxWidth: currentLevel.level === 2 ? '800px' : currentLevel.level === 3 ? '900px' : '100%',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {createStageSteps(currentLevel)}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              margin: '30px 0'
            }}>
              <div style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>🎯 학습 동사</h3>
                <p style={{ color: '#64748b' }}>{currentLevel.verbs.join(', ')}</p>
              </div>
              <div style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>📝 학습 패턴</h3>
                <p style={{ color: '#64748b' }}>I go, I don't go, Do you go?<br/>I'm going, I'm not going, Are you going?</p>
              </div>
              <div style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>🎯 목표</h3>
                <p style={{ color: '#64748b' }}>정확도 {currentLevel.targetAccuracy}% 이상</p>
              </div>
              <div style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>📊 현재 성과</h3>
                <p style={{ color: '#64748b' }}>정확도: 0%<br/>최고 기록: 0%<br/>시도 횟수: 0</p>
              </div>
            </div>

            {/* 3단계 선택 버튼 */}
            <div style={{
              marginTop: '30px',
              marginBottom: '20px'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '15px'
              }}>
                <h3 style={{ color: '#1f2937', marginBottom: '5px', fontSize: '18px' }}>학습 단계 선택</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>속도에 따라 단계를 선택하세요</p>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '15px',
                maxWidth: '400px',
                margin: '0 auto'
              }}>
                <button
                  onClick={() => setSpeakingStage(1)}
                  style={{
                    padding: '15px',
                    border: speakingStage === 1 ? '2px solid #10b981' : '2px solid #d1d5db',
                    borderRadius: '10px',
                    background: speakingStage === 1 ? '#f0fdf4' : '#ffffff',
                    color: speakingStage === 1 ? '#065f46' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (speakingStage !== 1) {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.background = '#f0fdf4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (speakingStage !== 1) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>1단계</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>3초 응답</div>
                </button>
                
                <button
                  onClick={() => setSpeakingStage(2)}
                  style={{
                    padding: '15px',
                    border: speakingStage === 2 ? '2px solid #3b82f6' : '2px solid #d1d5db',
                    borderRadius: '10px',
                    background: speakingStage === 2 ? '#eff6ff' : '#ffffff',
                    color: speakingStage === 2 ? '#1e40af' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (speakingStage !== 2) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (speakingStage !== 2) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>2단계</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>2초 응답</div>
                </button>
                
                <button
                  onClick={() => setSpeakingStage(3)}
                  style={{
                    padding: '15px',
                    border: speakingStage === 3 ? '2px solid #8b5cf6' : '2px solid #d1d5db',
                    borderRadius: '10px',
                    background: speakingStage === 3 ? '#f3f4f6' : '#ffffff',
                    color: speakingStage === 3 ? '#5b21b6' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (speakingStage !== 3) {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (speakingStage !== 3) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>3단계</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>1초 응답</div>
                </button>
              </div>
              
              <div style={{
                textAlign: 'center',
                marginTop: '10px'
              }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  현재 선택: <span style={{ fontWeight: '600', color: '#374151' }}>
                    {speakingStage}단계 ({speakingStage === 1 ? '3초' : speakingStage === 2 ? '2초' : '1초'} 응답)
                  </span>
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '20px'
            }}>
              <button
                onClick={startStage}
                style={{
                  padding: '15px 30px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  color: 'white',
                  background: 'linear-gradient(135deg, #10b981, #059669)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🚀 스테이지 시작
              </button>
              <button
                onClick={() => alert('상세 통계 화면을 표시합니다.')}
                style={{
                  padding: '15px 30px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  color: 'white',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📊 상세 통계
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS 애니메이션 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `
      }} />
    </div>
  );
});

export default DashboardHome;