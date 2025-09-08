/**
 * 스피킹 단계별 설정 유틸리티
 * 
 * 영어 학습 교육학적 설계 원칙에 따른 단계별 응답 시간:
 * - 1단계 (초보): 3초 - 충분한 사고 시간 제공
 * - 2단계 (중급): 2초 - 중간 수준의 사고 시간
 * - 3단계 (고급): 1초 - 빠른 반응 훈련
 */

export type SpeakingStage = 1 | 2 | 3;

/**
 * 스피킹 단계별 카운트다운 시간을 반환
 * @param stage - 스피킹 단계 (1: 초보, 2: 중급, 3: 고급)
 * @returns 해당 단계의 카운트다운 시간 (초)
 */
export const getCountdownDuration = (stage: SpeakingStage): number => {
  switch (stage) {
    case 1: return 3; // 초보: 3초
    case 2: return 2; // 중급: 2초  
    case 3: return 1; // 고급: 1초
    default: return 3; // 기본값: 3초
  }
};

/**
 * 스피킹 단계별 설명 텍스트 반환
 * @param stage - 스피킹 단계
 * @returns 단계별 설명 문자열
 */
export const getStageName = (stage: SpeakingStage): string => {
  switch (stage) {
    case 1: return '초보 (3초 응답)';
    case 2: return '중급 (2초 응답)';
    case 3: return '고급 (1초 응답)';
    default: return '초보 (3초 응답)';
  }
};

/**
 * 스피킹 단계별 색상 코드 반환
 * @param stage - 스피킹 단계
 * @returns CSS 색상 코드
 */
export const getStageColor = (stage: SpeakingStage): string => {
  switch (stage) {
    case 1: return '#10b981'; // 초보: 녹색
    case 2: return '#3b82f6'; // 중급: 파란색
    case 3: return '#8b5cf6'; // 고급: 보라색
    default: return '#10b981'; // 기본값: 녹색
  }
};