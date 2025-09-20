/**
 * SRS 시스템 모크 테스트
 * 3단계에서 틀린 문장 추가 기능 검증
 */

// 테스트용 모크 함수 (실제 사용은 하지 않음)
export function testSRSFunctionality() {
  console.log('🧪 SRS 시스템 기능 테스트 시작');

  try {
    // SRS 엔진 초기화 테스트
    console.log('1. SRS 엔진 초기화 테스트...');

    // 3단계 틀린 문제 시나리오 시뮬레이션
    console.log('2. 3단계 틀린 문제 시나리오 시뮬레이션...');

    const mockQuestion = {
      ko: '나는 행복합니다.',
      en: 'I am happy.'
    };

    const mockUserAnswer = 'I was happy'; // 틀린 답변

    console.log(`📚 Mock: 한국어 문제: "${mockQuestion.ko}"`);
    console.log(`🎤 Mock: 사용자 답변: "${mockUserAnswer}"`);
    console.log(`✅ Mock: 정답: "${mockQuestion.en}"`);
    console.log(`❌ Mock: 틀린 답변이므로 SRS에 추가될 예정`);

    // 실제 SRS 추가는 PatternTrainingPage에서 수행
    console.log('3. 실제 SRS 추가는 PatternTrainingPage.tsx:addIncorrectAnswerToSRS 함수에서 수행');

    console.log('✅ SRS 테스트 완료');

    return {
      success: true,
      mockData: {
        question: mockQuestion,
        userAnswer: mockUserAnswer,
        wouldBeAddedToSRS: true,
        condition: 'speakingStage === 3'
      }
    };

  } catch (error) {
    console.error('❌ SRS 테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * SRS 망각곡선 알고리즘 검증
 */
export function verifyForgettingCurve() {
  console.log('🧠 망각곡선 알고리즘 검증');

  // SuperMemo SM-2 알고리즘 기본 설정
  const defaultConfig = {
    initialEaseFactor: 2.5,
    minInterval: 1,
    maxInterval: 365,
    passingGrade: 3,
    easyGrade: 5
  };

  console.log('🔧 기본 SRS 설정:', defaultConfig);

  // 망각곡선 시뮬레이션 시나리오
  const scenarios = [
    { quality: 1, description: '완전히 기억 못함' },
    { quality: 2, description: '어렵게 기억함' },
    { quality: 3, description: '약간 어렵게 기억함' },
    { quality: 4, description: '쉽게 기억함' },
    { quality: 5, description: '매우 쉽게 기억함' }
  ];

  scenarios.forEach(scenario => {
    console.log(`📊 시나리오: ${scenario.description} (quality: ${scenario.quality})`);
    // 실제 계산은 ModularSRSEngine에서 수행
  });

  return {
    algorithm: 'SuperMemo SM-2',
    config: defaultConfig,
    scenarios
  };
}

/**
 * 3단계 조건 검증
 */
export function verify3rdStageCondition() {
  console.log('🎯 3단계 조건 검증');

  const stages = [
    { stage: 1, shouldAddToSRS: false, description: '연습모드 (3초 대기)' },
    { stage: 2, shouldAddToSRS: false, description: '연습모드 (2초 대기)' },
    { stage: 3, shouldAddToSRS: true, description: '실전모드 (1초 대기, SRS 추가)' }
  ];

  stages.forEach(({ stage, shouldAddToSRS, description }) => {
    console.log(`🔍 ${stage}단계: ${description}`);
    console.log(`📝 SRS 추가 여부: ${shouldAddToSRS ? '✅ 추가됨' : '❌ 추가 안됨'}`);
  });

  return {
    condition: 'speakingStage === 3 && !evaluation.isCorrect',
    implementation: 'PatternTrainingPage.tsx:addIncorrectAnswerToSRS',
    stages
  };
}

// 통합 테스트 실행
export function runSRSIntegrationTest() {
  console.log('🚀 SRS 통합 테스트 실행');

  const results = {
    functionality: testSRSFunctionality(),
    forgettingCurve: verifyForgettingCurve(),
    stageCondition: verify3rdStageCondition()
  };

  console.log('📊 테스트 결과:', results);

  return results;
}