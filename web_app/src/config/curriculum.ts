/**
 * 커리큘럼 소스 경로 설정
 * REVISED 버전을 우선 사용하도록 강제 설정
 */

export const CURRICULUM_SOURCES = {
  lv1: 'patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json',
  lv2: 'patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json',
  lv3: 'patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json',
  lv4: 'patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json',
  lv5: 'patterns/level_5_advanced_business/lv5_stage_system_REVISED.json',
  lv6: 'patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json',
  lv7: 'patterns/level_7_business_english/lv7_stage_system.json',
  lv8: 'patterns/level_8_academic_english/lv8_stage_system.json',
  lv9: 'patterns/level_9_native_expressions/lv9_stage_system.json',
  lv10: 'patterns/level_10_expert_communication/lv10_stage_system.json'
};

export const CURRICULUM_CONFIG = {
  useRevised: true,
  version: 'revised_2025-08-13',
  baseUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:4002' 
    : process.env.VITE_API_URL || 'http://localhost:4002'
};

/**
 * 레벨별 커리큘럼 경로 반환
 */
export function getCurriculumPath(level: number): string {
  const key = `lv${level}` as keyof typeof CURRICULUM_SOURCES;
  return CURRICULUM_SOURCES[key] || `patterns/level_${level}_*/lv${level}_stage_system.json`;
}

/**
 * REVISED 버전 존재 여부 확인
 */
export function hasRevisedVersion(level: number): boolean {
  const path = getCurriculumPath(level);
  return path.includes('_REVISED.json');
}

/**
 * 스모크 테스트를 위한 검증 설정
 */
export const VALIDATION_CONFIG = {
  lv1: {
    expectedStages: 19,
    expectedPhases: 5,
    keyStages: ['Lv1-P3-S09', 'Lv1-P4-S13', 'Lv1-P4-S14', 'Lv1-P4-S15']
  },
  lv2: {
    expectedStages: 22,
    expectedPhases: 6,
    bridgeStages: ['Lv2-A1-S10', 'Lv2-A2-S14']
  },
  lv3: {
    expectedStages: 26,
    expectedPhases: 6,
    bridgeStages: ['Lv3-B2-S06', 'Lv3-B3-S11', 'Lv3-B4-S17']
  },
  lv4: {
    expectedStages: 24,
    expectedPhases: 6,
    bridgeStages: ['Lv4-A2-S08', 'Lv4-A4-S16', 'Lv4-A6-S24'],
    coreStages: 18,
    optionalStages: 3
  },
  lv5: {
    expectedStages: 24,
    expectedPhases: 6,
    bridgeStages: ['Lv5-A2-S08', 'Lv5-A4-S16', 'Lv5-A6-S24'],
    coreStages: 18,
    optionalStages: 3
  },
  lv6: {
    expectedStages: 24,
    expectedPhases: 6,
    bridgeStages: ['Lv6-A2-S08', 'Lv6-A4-S16', 'Lv6-A6-S24'],
    coreStages: 18,
    optionalStages: 3
  }
};