/**
 * 커리큘럼 생성 플러그인
 * @description 의존성 주입과 플러그인 아키텍처를 활용한 커리큘럼 생성 시스템
 */

import { PluginManifest } from '../../container/ServiceRegistry';

export const CurriculumPlugin: PluginManifest = {
  name: 'curriculum-generator',
  version: '2.2.0',
  
  services: {
    'sentence-generator': {
      factory: (registry) => registry?.get('ai-sentence-generator'),
      lifecycle: 'singleton',
      dependencies: ['config'],
      tags: ['generator', 'curriculum']
    },
    
    'grammar-validator': {
      factory: (registry) => registry?.get('sequential-grammar-validator'),
      lifecycle: 'singleton',
      dependencies: ['config'],
      tags: ['validator', 'curriculum']
    },
    
    'metadata-enhancer': {
      factory: (registry) => registry?.get('korean-metadata-enhancer'),
      lifecycle: 'singleton',
      dependencies: ['config'],
      tags: ['enhancer', 'curriculum']
    },
    
    'curriculum-orchestrator': {
      factory: (registry) => createCurriculumOrchestrator(registry),
      lifecycle: 'singleton',
      dependencies: [],
      tags: ['orchestrator', 'curriculum']
    }
  },
  
  dependencies: [],
  provides: ['curriculum-generation'],
  
  hooks: {
    'pre-generation': ['grammar-validator'],
    'post-generation': ['metadata-enhancer'],
    'quality-check': ['curriculum-orchestrator']
  }
};

/**
 * 커리큘럼 오케스트레이터 팩토리
 */
async function createCurriculumOrchestrator(registry: any) {
  const sentenceGenerator = await registry.get('ai-sentence-generator');
  const grammarValidator = await registry.get('sequential-grammar-validator');
  const metadataEnhancer = await registry.get('korean-metadata-enhancer');
  
  return new CurriculumOrchestrator(sentenceGenerator, grammarValidator, metadataEnhancer);
}

/**
 * 메인 커리큘럼 오케스트레이터
 * 모든 생성 단계를 조율하고 품질을 보장
 */
export class CurriculumOrchestrator {
  constructor(
    private sentenceGenerator: any,
    private grammarValidator: any,
    private metadataEnhancer: any
  ) {}
  
  /**
   * 스테이지 문장 생성 파이프라인
   */
  async generateStage(stageId: string): Promise<{
    success: boolean;
    sentences: any[];
    metadata: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      console.log(`📚 Starting generation for ${stageId}`);
      
      // 1. 사전 검증
      const validationResult = await this.grammarValidator.validateStageConfig(stageId);
      if (!validationResult.valid) {
        return { success: false, sentences: [], metadata: {}, errors: validationResult.errors };
      }
      
      // 2. 문장 생성
      const generationRequest = {
        stageId,
        targetCount: 10,
        grammarFocus: ['be-verb-present'],
        vocabularyLevel: 'basic' as const,
        complexity: 'simple' as const,
        allowedGrammarStages: [1]
      };
      
      const generationResult = await this.sentenceGenerator.generateSentences(generationRequest);
      if (!generationResult.success || !generationResult.sentences || generationResult.sentences.length === 0) {
        return { success: false, sentences: [], metadata: {}, errors: generationResult.errors || ['No sentences generated'] };
      }
      
      // 3. 메타데이터 강화
      const enhancedSentences = await this.metadataEnhancer.enhance(generationResult.sentences, stageId);
      
      // 4. 최종 검증
      const finalValidation = await this.grammarValidator.validateSentences(enhancedSentences, stageId);
      if (!finalValidation.valid) {
        errors.push(...finalValidation.errors);
      }
      
      // 5. 메타데이터 생성
      const metadata = await this.generateStageMetadata(stageId, enhancedSentences);
      
      console.log(`✅ Generation completed for ${stageId}: ${enhancedSentences.length} sentences`);
      
      return {
        success: errors.length === 0,
        sentences: enhancedSentences,
        metadata,
        errors
      };
      
    } catch (error) {
      console.error(`❌ Generation failed for ${stageId}:`, error);
      return {
        success: false,
        sentences: [],
        metadata: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * 배치 생성 - 여러 스테이지를 순차적으로 처리
   */
  async generateBatch(stageIds: string[]): Promise<{
    completed: string[];
    failed: string[];
    results: Record<string, any>;
  }> {
    const completed: string[] = [];
    const failed: string[] = [];
    const results: Record<string, any> = {};
    
    for (const stageId of stageIds) {
      try {
        const result = await this.generateStage(stageId);
        
        if (result.success) {
          completed.push(stageId);
          results[stageId] = result;
        } else {
          failed.push(stageId);
          console.error(`❌ Failed to generate ${stageId}:`, result.errors);
        }
        
        // 배치 처리 간 짧은 대기 (API 레이트 리밋 고려)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed.push(stageId);
        console.error(`❌ Batch generation error for ${stageId}:`, error);
      }
    }
    
    console.log(`🎯 Batch completed: ${completed.length} success, ${failed.length} failed`);
    return { completed, failed, results };
  }
  
  /**
   * 스테이지 메타데이터 생성
   */
  private async generateStageMetadata(stageId: string, sentences: any[]): Promise<any> {
    const [level, phase, stage] = this.parseStageId(stageId);
    
    return {
      stageId,
      level,
      phase,
      stage,
      generatedAt: new Date().toISOString(),
      sentenceCount: sentences.length,
      generationVersion: '2.2.0',
      grammarFocus: this.extractGrammarFocus(sentences),
      difficultyDistribution: this.calculateDifficultyDistribution(sentences),
      qualityScore: this.calculateQualityScore(sentences)
    };
  }
  
  private parseStageId(stageId: string): [number, number, number] {
    const match = stageId.match(/Lv(\d+)-P(\d+)-S(\d+)/);
    if (!match) throw new Error(`Invalid stage ID format: ${stageId}`);
    
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3])
    ];
  }
  
  private extractGrammarFocus(sentences: any[]): string[] {
    // 문장들에서 주요 문법 패턴 추출
    const grammarPatterns = new Set<string>();
    
    sentences.forEach(sentence => {
      if (sentence.metadata?.grammarPattern) {
        grammarPatterns.add(sentence.metadata.grammarPattern);
      }
    });
    
    return Array.from(grammarPatterns);
  }
  
  private calculateDifficultyDistribution(sentences: any[]): Record<string, number> {
    const distribution = { basic: 0, intermediate: 0, advanced: 0 };
    
    sentences.forEach(sentence => {
      const difficulty = sentence.metadata?.difficulty || 'basic';
      if (difficulty in distribution) {
        distribution[difficulty as keyof typeof distribution]++;
      }
    });
    
    return distribution;
  }
  
  private calculateQualityScore(sentences: any[]): number {
    // 간단한 품질 점수 계산 (실제로는 더 복잡한 로직 필요)
    const factors = {
      variation: this.calculateVariation(sentences),
      naturalness: this.calculateNaturalness(sentences),
      appropriateness: this.calculateAppropriateness(sentences)
    };
    
    return Math.round(
      (factors.variation * 0.4 + factors.naturalness * 0.4 + factors.appropriateness * 0.2) * 100
    );
  }
  
  private calculateVariation(sentences: any[]): number {
    // 문장 구조의 다양성 측정
    const structures = sentences.map(s => s.structure || '').filter(Boolean);
    const uniqueStructures = new Set(structures).size;
    
    return structures.length > 0 ? uniqueStructures / structures.length : 0;
  }
  
  private calculateNaturalness(sentences: any[]): number {
    // 자연스러움 측정 (임시 구현)
    return 0.85; // 실제로는 AI 모델을 통한 평가 필요
  }
  
  private calculateAppropriateness(sentences: any[]): number {
    // 학습자 수준 적합성 측정 (임시 구현)
    return 0.90; // 실제로는 더 정교한 평가 필요
  }
}

export default CurriculumPlugin;