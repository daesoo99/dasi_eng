/**
 * 커리큘럼 서비스를 위한 타입 정의
 * 기존 patternData.ts와 분리된 새로운 아키텍처
 */

export interface CurriculumStage {
  stageId: string;          // e.g., "Stage 1"
  title: string;            // e.g., "미래완료 시제"
  description: string;      // 학습 내용 설명
  examples: string[];       // 예문들
  grammarPoints: string[];  // 문법 포인트들
}

export interface CurriculumPhase {
  phaseId: string;         // e.g., "Phase 1"
  title: string;           // e.g., "시제 심화와 조건 표현"
  description: string;     // 페이즈 설명
  stages: CurriculumStage[];
}

export interface CurriculumLevel {
  level: number;           // 4, 5, 6, etc.
  title: string;           // e.g., "고급 문법 심화와 격식 있는 표현"
  description: string;     // 레벨 목표
  phases: CurriculumPhase[];
  totalStages: number;     // 전체 스테이지 수
}

export interface GeneratedSentence {
  id: string;
  korean: string;
  english: string;
  grammarPoint: string;    // 해당 문법 포인트
  difficulty: 'basic' | 'intermediate' | 'advanced';
  form: 'aff' | 'neg' | 'wh_q' | 'yn_q';  // 긍정/부정/의문문 등
}

export interface StageQuestions {
  stageId: string;
  sentences: GeneratedSentence[];
  totalCount: number;      // 104개 목표
}

// 기존 PatternData와의 호환성을 위한 어댑터 타입
export interface LegacyQuestionItem {
  korean: string;
  english: string;
  verb?: string;
  pattern?: string;
  level?: number;
  stage?: number;
}