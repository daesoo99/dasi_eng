/**
 * SentenceGeneratorPort - 문장 생성기 포트
 * @description 다양한 문장 생성 구현체를 위한 추상 인터페이스
 */

export interface GenerationRequest {
  stageId: string;
  targetCount: number;
  grammarFocus: string[];
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced';
  complexity: 'simple' | 'compound' | 'complex';
  allowedGrammarStages: number[];
  culturalContext?: 'korean-learner' | 'general' | 'academic';
  existingSentences?: string[]; // 중복 방지용
}

export interface GeneratedSentence {
  id: string;
  english: string;
  korean: string;
  phonetic?: string;
  structure: string;
  grammarPattern: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  metadata: {
    wordCount: number;
    complexityScore: number;
    grammarElements: string[];
    culturalNotes?: string;
    usageTips?: string;
  };
}

export interface GenerationResult {
  success: boolean;
  sentences: GeneratedSentence[];
  errors: string[];
  metadata: {
    requestId: string;
    generatedAt: string;
    provider: string;
    generationTime: number;
    qualityScore?: number;
  };
}

export interface SentenceGeneratorPort {
  /**
   * 문장 생성
   */
  generateSentences(request: GenerationRequest): Promise<GenerationResult>;
  
  /**
   * 문장 품질 검증
   */
  validateSentences(sentences: GeneratedSentence[], stageId: string): Promise<{
    valid: boolean;
    errors: string[];
    suggestions: string[];
  }>;
  
  /**
   * 생성기 정보 조회
   */
  getGeneratorInfo(): {
    name: string;
    version: string;
    capabilities: string[];
    limitations: string[];
  };
  
  /**
   * 헬스체크
   */
  healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    lastError?: string;
  }>;
}