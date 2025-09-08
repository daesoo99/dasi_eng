/**
 * Stage Configuration - 하드코딩 제거 및 중앙 관리
 */

export interface StageConfig {
  stagesPerPhase: number;
  modalSize: {
    maxWidth: string;
    maxHeight: string;
  };
  gridLayout: {
    columns: number;
    gap: string;
  };
  buttonSizes: {
    stage: {
      width: string;
      height: string;
    };
    allButton: {
      width: string;
      height: string;
    };
  };
  verbsByLevel: Record<number, string>;
}

export const STAGE_CONFIG: StageConfig = {
  stagesPerPhase: 4,
  
  modalSize: {
    maxWidth: 'max-w-4xl',
    maxHeight: 'max-h-[85vh]'
  },
  
  gridLayout: {
    columns: 8,
    gap: 'gap-4'
  },
  
  buttonSizes: {
    stage: {
      width: 'w-16',
      height: 'h-16'
    },
    allButton: {
      width: 'w-20',
      height: 'h-20'
    }
  },
  
  verbsByLevel: {
    1: 'Be동사, 일반동사, 부정문, 의문문, 기초확장',
    2: 'be동사, 일반동사, 조동사, 현재진행형, 과거형, 미래형',
    3: '미래형심화, 현재완료, 과거완료, 수동태, 조동사확장, 조건문, 가정법',
    4: 'buy, sell, use, try, find',
    5: 'give, tell, show, meet, help',
    6: 'come, leave, start, finish, plan',
    7: 'choose, decide, prefer, expect, suppose',
    8: 'keep, let, allow, suggest, recommend',
    9: 'improve, reduce, compare, analyze, design',
    10: 'coordinate, negotiate, prioritize, implement, evaluate'
  }
};

/**
 * Stage ID 생성 유틸리티 - 하드코딩 제거
 */
export class StageIdGenerator {
  static generate(level: number, stage: number): string {
    const phaseNumber = Math.ceil(stage / STAGE_CONFIG.stagesPerPhase);
    return `Lv${level}-P${phaseNumber}-S${stage.toString().padStart(2, '0')}`;
  }
  
  static getBankFilePath(level: number, stage: number): string {
    const stageId = this.generate(level, stage);
    return `/patterns/banks/level_${level}/${stageId}_bank.json`;
  }
}