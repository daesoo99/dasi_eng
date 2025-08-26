/**
 * 커리큘럼 소스 경로 설정
 * REVISED 버전을 우선 사용하도록 강제 설정
 */

export const CURRICULUM_SOURCES = {
  lv1: 'patterns/level_1_basic_patterns/lv1_phase_system_NEW.json',
  lv2: 'patterns/level_2_basic_grammar/lv2_phase_system_NEW.json',
  lv3: 'patterns/level_3_advanced_grammar/lv3_stage_system_NEW.json',
  lv4: 'patterns/level_4_advanced_expressions/lv4_stage_system_NEW.json',
  lv5: 'patterns/level_5_academic_mastery/lv5_stage_system_NEW.json',
  lv6: 'patterns/level_6_professional_mastery/lv6_stage_system_NEW.json',
  lv7: 'patterns/level_7_business_english/lv7_stage_system_NEW.json',
  lv8: 'patterns/level_8_advanced_discourse/lv8_stage_system_NEW.json',
  lv9: 'patterns/level_9_expert_discourse/lv9_stage_system_NEW.json',
  lv10: 'patterns/level_10_native_mastery/lv10_stage_system_NEW.json'
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
    expectedStages: 16,
    expectedPhases: 5,
    keyStages: ['Lv1-P1-S01', 'Lv1-P2-S05', 'Lv1-P3-S09', 'Lv1-P5-S16']
  },
  lv2: {
    expectedStages: 20,
    expectedPhases: 5,
    keyStages: ['Lv2-P1-S01', 'Lv2-P2-S05', 'Lv2-P3-S09', 'Lv2-P5-S20']
  },
  lv3: {
    expectedStages: 30,
    expectedPhases: 6,
    keyStages: ['Lv3-P1-S01', 'Lv3-P2-S07', 'Lv3-P3-S11', 'Lv3-P6-S30']
  },
  lv4: {
    expectedStages: 32,
    expectedPhases: 6,
    keyStages: ['Lv4-P1-S01', 'Lv4-P2-S06', 'Lv4-P3-S11', 'Lv4-P6-S32']
  },
  lv5: {
    expectedStages: 30,
    expectedPhases: 6,
    keyStages: ['Lv5-P1-S01', 'Lv5-P2-S06', 'Lv5-P3-S11', 'Lv5-P6-S30']
  },
  lv6: {
    expectedStages: 44,
    expectedPhases: 6,
    keyStages: ['Lv6-P1-S01', 'Lv6-P2-S08', 'Lv6-P3-S15', 'Lv6-P6-S44']
  },
  lv7: {
    expectedStages: 42,
    expectedPhases: 6,
    keyStages: ['Lv7-P1-S01', 'Lv7-P2-S08', 'Lv7-P3-S15', 'Lv7-P6-S42']
  },
  lv8: {
    expectedStages: 50,
    expectedPhases: 6,
    keyStages: ['Lv8-P1-S01', 'Lv8-P2-S09', 'Lv8-P3-S17', 'Lv8-P6-S50']
  },
  lv9: {
    expectedStages: 48,
    expectedPhases: 8,
    keyStages: ['Lv9-P1-S01', 'Lv9-P2-S09', 'Lv9-P4-S19', 'Lv9-P8-S48']
  },
  lv10: {
    expectedStages: 50,
    expectedPhases: 10,
    keyStages: ['Lv10-P1-S01', 'Lv10-P3-S11', 'Lv10-P6-S26', 'Lv10-P10-S50']
  }
};