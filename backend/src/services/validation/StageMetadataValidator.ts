/**
 * 스테이지 메타데이터 검증 서비스
 * @description 스테이지별 메타데이터 품질 검증 및 개선 제안
 */

export interface StageMetadata {
  stageId: string;
  description: string;
  level: number;
  phase: number;
  stage: number;
  grammar_pattern: string | string[];
  learning_points: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  target_grammar: string[];
  prerequisites?: string[];
  learning_objectives?: string[];
  cultural_context?: string;
  usage_scenarios?: string[];
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  improvements: ImprovementSuggestion[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface ImprovementSuggestion {
  field: string;
  current: any;
  suggested: any;
  reason: string;
  confidence: number; // 0-1
}

export class StageMetadataValidator {
  private readonly grammarProgressionRules: Record<string, string[]>;
  private readonly levelBoundaries: Record<number, { minStage: number; maxStage: number }>;
  
  constructor() {
    this.grammarProgressionRules = this.initializeGrammarRules();
    this.levelBoundaries = this.initializeLevelBoundaries();
  }
  
  /**
   * 스테이지 메타데이터 종합 검증
   */
  validateStageMetadata(metadata: StageMetadata): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const improvements: ImprovementSuggestion[] = [];
    
    // 1. 필수 필드 검증
    this.validateRequiredFields(metadata, errors);
    
    // 2. 문법 진행 순서 검증
    this.validateGrammarProgression(metadata, errors, warnings);
    
    // 3. 학습 목표 적절성 검증
    this.validateLearningObjectives(metadata, warnings, improvements);
    
    // 4. 메타데이터 품질 검증
    this.validateMetadataQuality(metadata, warnings, improvements);
    
    // 5. 순차적 학습 원칙 검증
    this.validateSequentialLearning(metadata, errors, warnings);
    
    const score = this.calculateValidationScore(errors, warnings, improvements);
    
    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      improvements
    };
  }
  
  /**
   * 개선된 메타데이터 생성
   */
  generateImprovedMetadata(originalMetadata: StageMetadata): StageMetadata {
    const validation = this.validateStageMetadata(originalMetadata);
    const improved = { ...originalMetadata };
    
    // 개선 제안 적용
    for (const suggestion of validation.improvements) {
      if (suggestion.confidence > 0.7) {
        (improved as any)[suggestion.field] = suggestion.suggested;
      }
    }
    
    // 누락된 필드 보완
    if (!improved.learning_objectives) {
      improved.learning_objectives = this.generateLearningObjectives(improved);
    }
    
    if (!improved.prerequisites) {
      improved.prerequisites = this.generatePrerequisites(improved);
    }
    
    if (!improved.usage_scenarios) {
      improved.usage_scenarios = this.generateUsageScenarios(improved);
    }
    
    return improved;
  }
  
  // =============== Private Validation Methods ===============
  
  private validateRequiredFields(metadata: StageMetadata, errors: ValidationError[]): void {
    const required = ['stageId', 'description', 'level', 'phase', 'stage', 'grammar_pattern'];
    
    for (const field of required) {
      const value = (metadata as any)[field];
      
      if (value === undefined || value === null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'critical'
        });
      } else if (typeof value === 'string' && value.trim() === '') {
        errors.push({
          field,
          message: `Required field '${field}' is empty`,
          severity: 'critical'
        });
      }
    }
  }
  
  private validateGrammarProgression(
    metadata: StageMetadata, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const { level, stage } = metadata;
    const grammarPatterns = Array.isArray(metadata.grammar_pattern) 
      ? metadata.grammar_pattern 
      : [metadata.grammar_pattern];
    
    // 레벨/스테이지에 허용된 문법 패턴 검증
    const allowedPatterns = this.getAllowedGrammarPatterns(level, stage);
    
    for (const pattern of grammarPatterns) {
      if (!allowedPatterns.includes(pattern)) {
        errors.push({
          field: 'grammar_pattern',
          message: `Grammar pattern '${pattern}' not allowed at Level ${level} Stage ${stage}`,
          severity: 'major'
        });
      }
    }
    
    // 선행 문법 패턴 검증
    const prerequisites = this.getGrammarPrerequisites(grammarPatterns);
    const previousStagePatterns = this.getPreviousStagePatterns(level, stage);
    
    for (const prereq of prerequisites) {
      if (!previousStagePatterns.includes(prereq)) {
        warnings.push({
          field: 'grammar_pattern',
          message: `Prerequisite grammar '${prereq}' may not have been introduced yet`,
          recommendation: `Ensure '${prereq}' is covered in earlier stages`
        });
      }
    }
  }
  
  private validateLearningObjectives(
    metadata: StageMetadata, 
    warnings: ValidationWarning[], 
    improvements: ImprovementSuggestion[]
  ): void {
    const { learning_points, grammar_pattern } = metadata;
    
    // 학습 포인트가 너무 일반적인지 검사
    if (learning_points && learning_points.length > 0) {
      const genericPoints = learning_points.filter(point => 
        point.includes('basic') || point.includes('simple') || point.includes('general')
      );
      
      if (genericPoints.length > learning_points.length * 0.5) {
        improvements.push({
          field: 'learning_points',
          current: learning_points,
          suggested: this.generateSpecificLearningPoints(metadata),
          reason: 'Learning points are too generic and need to be more specific',
          confidence: 0.8
        });
      }
    }
    
    // 문법 패턴과 학습 포인트 일치성 검증
    if (learning_points && grammar_pattern) {
      const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
      const hasMatchingPoints = patterns.some(pattern => 
        learning_points.some(point => point.toLowerCase().includes(pattern.replace('-', ' ')))
      );
      
      if (!hasMatchingPoints) {
        warnings.push({
          field: 'learning_points',
          message: 'Learning points do not align with grammar patterns',
          recommendation: 'Include specific learning points for each grammar pattern'
        });
      }
    }
  }
  
  private validateMetadataQuality(
    metadata: StageMetadata, 
    warnings: ValidationWarning[], 
    improvements: ImprovementSuggestion[]
  ): void {
    // 설명 품질 검증
    if (metadata.description) {
      if (metadata.description.length < 20) {
        improvements.push({
          field: 'description',
          current: metadata.description,
          suggested: this.generateDetailedDescription(metadata),
          reason: 'Description is too short and lacks detail',
          confidence: 0.75
        });
      }
      
      if (!metadata.description.includes('Korean')) {
        improvements.push({
          field: 'description',
          current: metadata.description,
          suggested: `${metadata.description} Optimized for Korean learners.`,
          reason: 'Should explicitly mention Korean learner context',
          confidence: 0.6
        });
      }
    }
    
    // 난이도 일관성 검증
    if (metadata.difficulty) {
      const expectedDifficulty = this.calculateExpectedDifficulty(metadata.level, metadata.stage);
      if (metadata.difficulty !== expectedDifficulty) {
        warnings.push({
          field: 'difficulty',
          message: `Difficulty '${metadata.difficulty}' may not match Level ${metadata.level} Stage ${metadata.stage}`,
          recommendation: `Consider '${expectedDifficulty}' based on stage progression`
        });
      }
    }
  }
  
  private validateSequentialLearning(
    metadata: StageMetadata, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const { level, stage, grammar_pattern } = metadata;
    const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
    
    // 현재 스테이지에서 허용되지 않은 고급 문법 검사
    const futureGrammar = this.getFutureGrammarPatterns(level, stage);
    const violatingPatterns = patterns.filter(pattern => futureGrammar.includes(pattern));
    
    if (violatingPatterns.length > 0) {
      errors.push({
        field: 'grammar_pattern',
        message: `Advanced grammar patterns used prematurely: ${violatingPatterns.join(', ')}`,
        severity: 'major'
      });
    }
    
    // 너무 많은 새 개념 도입 검사
    if (patterns.length > 2) {
      warnings.push({
        field: 'grammar_pattern',
        message: 'Too many new grammar patterns introduced in single stage',
        recommendation: 'Consider spreading concepts across multiple stages for better learning'
      });
    }
  }
  
  // =============== Helper Methods ===============
  
  private calculateValidationScore(
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    improvements: ImprovementSuggestion[]
  ): number {
    let score = 100;
    
    // 에러 감점
    for (const error of errors) {
      switch (error.severity) {
        case 'critical': score -= 30; break;
        case 'major': score -= 20; break;
        case 'minor': score -= 10; break;
      }
    }
    
    // 경고 감점
    score -= warnings.length * 5;
    
    // 개선 필요 감점 (신뢰도 높은 것만)
    const highConfidenceImprovements = improvements.filter(imp => imp.confidence > 0.7);
    score -= highConfidenceImprovements.length * 3;
    
    return Math.max(0, Math.round(score));
  }
  
  private generateSpecificLearningPoints(metadata: StageMetadata): string[] {
    const { grammar_pattern, level, stage } = metadata;
    const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
    
    const points: string[] = [];
    
    for (const pattern of patterns) {
      switch (pattern) {
        case 'be-verb-present':
          points.push('Use am/is/are correctly with different subjects');
          points.push('Form positive statements with be verbs');
          points.push('Understand subject-verb agreement with be verbs');
          break;
        case 'basic-adjectives':
          points.push('Place adjectives before nouns in English');
          points.push('Use common descriptive adjectives (big, small, good, bad)');
          points.push('Combine be verbs with adjectives for descriptions');
          break;
        default:
          points.push(`Master ${pattern.replace('-', ' ')} usage`);
          points.push(`Practice ${pattern.replace('-', ' ')} in context`);
      }
    }
    
    return points;
  }
  
  private generateDetailedDescription(metadata: StageMetadata): string {
    const { grammar_pattern, level, stage } = metadata;
    const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
    const patternText = patterns.join(' and ');
    
    return `Level ${level} Stage ${stage} focuses on ${patternText}. ` +
           `Students will learn fundamental sentence structures and practice ` +
           `natural English expressions. Designed specifically for Korean learners ` +
           `with consideration for common learning challenges.`;
  }
  
  private generateLearningObjectives(metadata: StageMetadata): string[] {
    const objectives: string[] = [];
    const { grammar_pattern } = metadata;
    const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
    
    for (const pattern of patterns) {
      objectives.push(`Master ${pattern.replace('-', ' ')} in practical contexts`);
      objectives.push(`Build confidence using ${pattern.replace('-', ' ')} structures`);
    }
    
    objectives.push('Apply learned patterns in speaking practice');
    objectives.push('Recognize patterns in authentic English contexts');
    
    return objectives;
  }
  
  private generatePrerequisites(metadata: StageMetadata): string[] {
    if (metadata.stage <= 1) return [];
    
    const prevStage = metadata.stage - 1;
    return [`Lv${metadata.level}-P${metadata.phase}-S${prevStage.toString().padStart(2, '0')}`];
  }
  
  private generateUsageScenarios(metadata: StageMetadata): string[] {
    const { grammar_pattern } = metadata;
    const patterns = Array.isArray(grammar_pattern) ? grammar_pattern : [grammar_pattern];
    
    const scenarios: string[] = [];
    
    if (patterns.includes('be-verb-present')) {
      scenarios.push('Self-introduction conversations');
      scenarios.push('Describing current situations');
      scenarios.push('Talking about feelings and states');
    }
    
    if (patterns.includes('basic-adjectives')) {
      scenarios.push('Describing objects and people');
      scenarios.push('Shopping and product descriptions');
      scenarios.push('Expressing opinions about things');
    }
    
    return scenarios.length > 0 ? scenarios : ['General conversation practice'];
  }
  
  // Grammar progression data methods
  private initializeGrammarRules(): Record<string, string[]> {
    return {
      'be-verb-present': [],
      'basic-adjectives': ['be-verb-present'],
      'articles': ['be-verb-present'],
      'possessive-pronouns': ['be-verb-present', 'basic-adjectives'],
      'present-simple': ['be-verb-present'],
      // ... more rules
    };
  }
  
  private initializeLevelBoundaries(): Record<number, { minStage: number; maxStage: number }> {
    return {
      1: { minStage: 1, maxStage: 16 },
      2: { minStage: 17, maxStage: 32 },
      // ... more boundaries
    };
  }
  
  private getAllowedGrammarPatterns(level: number, stage: number): string[] {
    // Implementation would return allowed patterns for given level/stage
    return ['be-verb-present', 'basic-adjectives']; // Simplified
  }
  
  private getGrammarPrerequisites(patterns: string[]): string[] {
    const prerequisites: string[] = [];
    
    for (const pattern of patterns) {
      const prereqs = this.grammarProgressionRules[pattern] || [];
      prerequisites.push(...prereqs);
    }
    
    return [...new Set(prerequisites)];
  }
  
  private getPreviousStagePatterns(level: number, stage: number): string[] {
    // Implementation would return all patterns introduced in previous stages
    return ['be-verb-present']; // Simplified
  }
  
  private getFutureGrammarPatterns(level: number, stage: number): string[] {
    // Implementation would return patterns from future stages
    return ['present-perfect', 'conditionals']; // Simplified
  }
  
  private calculateExpectedDifficulty(level: number, stage: number): 'basic' | 'intermediate' | 'advanced' {
    if (level <= 2) return 'basic';
    if (level <= 5) return 'intermediate';
    return 'advanced';
  }
}