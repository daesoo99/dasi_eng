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
  lv7: 'patterns/level_7_business_english/lv7_stage_system_REVISED.json',
  lv8: 'patterns/level_8_advanced_discourse/lv8_stage_system_REVISED.json',
  lv9: 'patterns/level_9_expert_discourse/lv9_stage_system_REVISED.json',
  lv10: 'patterns/level_10_native_mastery/lv10_stage_system_REVISED.json'
};

export const CURRICULUM_CONFIG = {
  useRevised: true,
  version: 'revised_2025-08-13',
  baseUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8087' 
    : process.env.VITE_API_URL || 'http://localhost:8087'
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
    expectedStages: 20,
    expectedPhases: 6,
    keyStages: ['Lv2-P1-S01', 'Lv2-P3-S10', 'Lv2-P4-S14', 'Lv2-P6-S20']
  },
  lv3: {
    expectedStages: 28,
    expectedPhases: 6,
    keyStages: ['Lv3-P1-S02', 'Lv3-P2-S10', 'Lv3-P3-S16', 'Lv3-P6-S28']
  },
  lv4: {
    expectedStages: 29,
    expectedPhases: 6,
    keyStages: ['Lv4-P1-S02', 'Lv4-P3-S15', 'Lv4-P4-S20', 'Lv4-P6-S29']
  },
  lv5: {
    expectedStages: 29,
    expectedPhases: 6,
    keyStages: ['Lv5-P1-S03', 'Lv5-P3-S15', 'Lv5-P5-S24', 'Lv5-P6-S29']
  },
  lv6: {
    expectedStages: 34,
    expectedPhases: 6,
    keyStages: ['Lv6-P1-S06', 'Lv6-P3-S17', 'Lv6-P4-S23', 'Lv6-P6-S34']
  },
  lv7: {
    expectedStages: 42,
    expectedPhases: 6,
    keyStages: ['Lv7-P1-S06', 'Lv7-P2-S12', 'Lv7-P4-S24', 'Lv7-P6-S42']
  },
  lv8: {
    expectedStages: 46,
    expectedPhases: 6,
    keyStages: ['Lv8-P1-S07', 'Lv8-P2-S13', 'Lv8-P4-S30', 'Lv8-P6-S46']
  },
  lv9: {
    expectedStages: 52,
    expectedPhases: 10,
    keyStages: ['Lv9-P1-S07', 'Lv9-P3-S19', 'Lv9-P5-S28', 'Lv9-P7-S36', 'Lv9-P9-S45', 'Lv9-P10-S52']
  },
  lv10: {
    expectedStages: 52,
    expectedPhases: 10,
    keyStages: ['Lv10-P1-S05', 'Lv10-P3-S16', 'Lv10-P5-S27', 'Lv10-P7-S37', 'Lv10-P9-S47', 'Lv10-P10-S52']
  }
};