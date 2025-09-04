/**
 * Stage Focus 모드 기본값 설정 유틸리티
 * 레벨과 스테이지에 따른 동적 기본값 결정
 * 
 * @description 하드코딩 방지 원칙에 따라 별도 모듈로 분리
 * @architecture Plugin-style utility for flexible configuration
 */

import type { SpeedLevel, RepeatCount } from '@/services/stageFocusMode';

/**
 * 레벨과 스테이지에 따른 권장 속도 레벨 결정
 */
export function getRecommendedSpeedLevel(level: number, stage: number): SpeedLevel {
  // Level 1: 초보자를 위한 빠른 속도 (1초)로 시작
  if (level === 1) {
    return 'fast'; // 1초 - 초보자도 부담 없이 빠른 반복 학습
  }
  
  // Level 2-3: 중간 속도 (2초)
  if (level <= 3) {
    return 'medium'; // 2초 - 적당한 사고 시간
  }
  
  // Level 4+: 단계별 조정
  if (level >= 4) {
    // 각 레벨의 초기 스테이지는 조금 더 여유롭게
    if (stage <= 2) {
      return 'medium'; // 2초 - 새로운 레벨 적응 시간
    } else {
      return 'fast'; // 1초 - 숙련도 향상을 위한 빠른 속도
    }
  }
  
  return 'medium'; // 기본값
}

/**
 * 레벨과 스테이지에 따른 권장 반복 횟수 결정
 */
export function getRecommendedRepeatCount(level: number, _stage: number): RepeatCount {
  // Level 1: 충분한 반복으로 기초 다지기
  if (level === 1) {
    return 7; // 7개 문장으로 충분한 연습
  }
  
  // Level 2-3: 표준 반복
  if (level <= 3) {
    return 6; // 6개 문장
  }
  
  // Level 4+: 효율적 반복
  if (level >= 4) {
    return 5; // 5개 문장 - 고급자는 적은 반복으로도 충분
  }
  
  return 6; // 기본값
}

/**
 * 레벨에 따른 권장 즉시 교정 여부 결정
 */
export function getRecommendedImmediateCorrection(level: number): boolean {
  // Level 1-2: 즉시 피드백으로 빠른 학습
  if (level <= 2) {
    return true;
  }
  
  // Level 3+: 사용자 선택에 맡김 (기본 true 유지)
  return true;
}

/**
 * 레벨에 따른 권장 정답 자동 발화 여부 결정
 */
export function getRecommendedAutoPlayCorrectAnswer(level: number): boolean {
  // Level 1: 초보자를 위한 자동 발화
  if (level === 1) {
    return true;
  }
  
  // Level 2+: 선택적 (기본값 false)
  return false;
}

/**
 * 종합적인 권장 설정 반환
 */
export function getRecommendedSettings(level: number, stage: number) {
  return {
    speedLevel: getRecommendedSpeedLevel(level, stage),
    repeatCount: getRecommendedRepeatCount(level, stage),
    immediateCorrection: getRecommendedImmediateCorrection(level),
    autoPlayCorrectAnswer: getRecommendedAutoPlayCorrectAnswer(level),
    shuffleQuestions: false // 초기에는 순서대로 (사용자가 원하면 변경 가능)
  };
}

/**
 * 속도 레벨별 설명 텍스트
 */
export const SPEED_LEVEL_DESCRIPTIONS = {
  slow: { label: '🐌 느림', time: '3초', description: '충분한 생각 시간' },
  medium: { label: '🚀 보통', time: '2초', description: '적당한 속도' },
  fast: { label: '⚡ 빠름', time: '1초', description: '빠른 반응 연습' }
} as const;

/**
 * 반복 횟수별 설명 텍스트
 */
export const REPEAT_COUNT_DESCRIPTIONS = {
  5: '집중 연습 (5개)',
  6: '표준 연습 (6개)', 
  7: '충분한 연습 (7개)',
  8: '완전 숙달 (8개)'
} as const;