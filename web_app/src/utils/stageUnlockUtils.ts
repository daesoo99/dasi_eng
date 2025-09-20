/**
 * 스테이지 잠금 해제 유틸리티
 *
 * 규칙:
 * - 1단계: 항상 잠금 해제됨 (연습)
 * - 2단계: 1단계를 완료해야 잠금 해제 (연습)
 * - 3단계: 2단계를 완료해야 잠금 해제 (실전 - SRS 추가)
 */

export interface StageUnlockStatus {
  stage1: {
    isUnlocked: boolean;
    isCompleted: boolean;
    description: string;
  };
  stage2: {
    isUnlocked: boolean;
    isCompleted: boolean;
    description: string;
  };
  stage3: {
    isUnlocked: boolean;
    isCompleted: boolean;
    description: string;
  };
}

/**
 * 주어진 레벨과 스테이지의 잠금 해제 상태를 확인
 */
export function getStageUnlockStatus(
  level: number,
  stage: number,
  stageProgress: boolean[]
): StageUnlockStatus {
  const [stage1Completed, stage2Completed, stage3Completed] = stageProgress;

  return {
    stage1: {
      isUnlocked: true, // 1단계는 항상 잠금 해제
      isCompleted: stage1Completed,
      description: '연습 모드 (3초 대기)'
    },
    stage2: {
      isUnlocked: stage1Completed, // 1단계 완료 시 잠금 해제
      isCompleted: stage2Completed,
      description: '연습 모드 (2초 대기)'
    },
    stage3: {
      isUnlocked: stage2Completed, // 2단계 완료 시 잠금 해제
      isCompleted: stage3Completed,
      description: '실전 모드 (1초 대기, 망각곡선 추가)'
    }
  };
}

/**
 * 특정 단계가 잠금 해제되었는지 확인
 */
export function isSpeakingStageUnlocked(
  speakingStage: 1 | 2 | 3,
  stageProgress: boolean[]
): boolean {
  const [stage1Completed, stage2Completed] = stageProgress;

  switch (speakingStage) {
    case 1:
      return true; // 1단계는 항상 잠금 해제
    case 2:
      return stage1Completed; // 1단계 완료 시 잠금 해제
    case 3:
      return stage2Completed; // 2단계 완료 시 잠금 해제
    default:
      return false;
  }
}

/**
 * 다음 단계를 추천
 */
export function getRecommendedNextStage(stageProgress: boolean[]): 1 | 2 | 3 | null {
  const [stage1Completed, stage2Completed, stage3Completed] = stageProgress;

  if (!stage1Completed) {
    return 1; // 1단계 먼저 완료
  } else if (!stage2Completed) {
    return 2; // 2단계 완료
  } else if (!stage3Completed) {
    return 3; // 3단계 완료
  } else {
    return null; // 모든 단계 완료
  }
}

/**
 * 진행률 계산 (1/3, 2/3, 3/3)
 */
export function calculateStageCompletionRatio(stageProgress: boolean[]): string {
  const completedCount = stageProgress.filter(Boolean).length;
  return `${completedCount}/3`;
}

/**
 * 스테이지 완료 여부 (모든 단계 완료)
 */
export function isStageFullyCompleted(stageProgress: boolean[]): boolean {
  return stageProgress.every(Boolean);
}

/**
 * 잠금 해제 메시지 생성
 */
export function getUnlockMessage(speakingStage: 1 | 2 | 3): string {
  switch (speakingStage) {
    case 1:
      return '';
    case 2:
      return '🎉 2단계 잠금 해제! 1단계를 완료했습니다.';
    case 3:
      return '🔥 3단계 잠금 해제! 2단계를 완료했습니다. 이제 실전 모드입니다!';
    default:
      return '';
  }
}

/**
 * 잠금 상태 메시지 생성
 */
export function getLockMessage(speakingStage: 1 | 2 | 3): string {
  switch (speakingStage) {
    case 1:
      return '';
    case 2:
      return '🔒 2단계는 1단계를 완료해야 잠금 해제됩니다.';
    case 3:
      return '🔒 3단계는 2단계를 완료해야 잠금 해제됩니다.';
    default:
      return '';
  }
}