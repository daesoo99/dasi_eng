/**
 * 커리큘럼 생성 애플리케이션
 * @description 전체 시스템을 통합하는 메인 애플리케이션 클래스
 */

import { serviceRegistry } from '../container/ServiceRegistry';
import { CurriculumPlugin } from '../plugins/curriculum/CurriculumPlugin';
import { curriculumConfig } from '../config/CurriculumConfig';
import { AISentenceGenerator } from '../adapters/generation/AISentenceGenerator';
import { MockSentenceGenerator } from '../adapters/generation/MockSentenceGenerator';
import { StageMetadataValidator } from '../services/validation/StageMetadataValidator';

export class CurriculumGenerationApp {
  private initialized = false;
  
  /**
   * 애플리케이션 초기화
   */
  async initialize(environment?: string): Promise<void> {
    if (this.initialized) {
      console.log('📚 Curriculum Generation App already initialized');
      return;
    }
    
    try {
      console.log('🚀 Initializing Curriculum Generation System...');
      
      // 1. 설정 로드
      const config = await curriculumConfig.load(environment);
      console.log(`📋 Configuration loaded for ${config.environment}`);
      
      // 2. 환경별 설정 적용
      serviceRegistry.applyEnvironmentConfig(config.environment as any);
      
      // 3. 코어 서비스 등록
      await this.registerCoreServices(config);
      
      // 4. 플러그인 등록
      serviceRegistry.registerPlugin(CurriculumPlugin);
      
      // 5. 시스템 헬스체크
      const healthCheck = await serviceRegistry.healthCheck();
      const unhealthyServices = Object.entries(healthCheck).filter(([_, healthy]) => !healthy);
      
      if (unhealthyServices.length > 0) {
        console.warn(`⚠️  Some services are unhealthy: ${unhealthyServices.map(([name]) => name).join(', ')}`);
      }
      
      this.initialized = true;
      console.log('✅ Curriculum Generation System initialized successfully');
      
      // 6. 시스템 정보 출력
      this.printSystemInfo();
      
    } catch (error) {
      console.error('❌ Failed to initialize Curriculum Generation System:', error);
      throw error;
    }
  }
  
  /**
   * 단일 스테이지 생성
   */
  async generateStage(stageId: string): Promise<{
    success: boolean;
    filePath?: string;
    metadata?: any;
    errors: string[];
  }> {
    if (!this.initialized) {
      throw new Error('App not initialized. Call initialize() first.');
    }
    
    try {
      console.log(`📝 Generating stage: ${stageId}`);
      
      const orchestrator = await serviceRegistry.get('curriculum-generator:curriculum-orchestrator') as any;
      const result = await orchestrator.generateStage(stageId);
      
      if (result.success) {
        // 결과 저장
        const filePath = await this.saveStageResult(stageId, result);
        
        console.log(`✅ Stage ${stageId} generated successfully: ${filePath}`);
        return {
          success: true,
          filePath,
          metadata: result.metadata,
          errors: []
        };
      } else {
        console.error(`❌ Failed to generate stage ${stageId}:`, result.errors);
        return {
          success: false,
          errors: result.errors
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Stage generation error:`, error);
      
      return {
        success: false,
        errors: [errorMessage]
      };
    }
  }
  
  /**
   * 배치 생성
   */
  async generateBatch(stageIds: string[]): Promise<{
    completed: string[];
    failed: string[];
    results: Record<string, any>;
  }> {
    if (!this.initialized) {
      throw new Error('App not initialized. Call initialize() first.');
    }
    
    console.log(`🎯 Starting batch generation for ${stageIds.length} stages`);
    
    const orchestrator = await serviceRegistry.get('curriculum-generator:curriculum-orchestrator') as any;
    const batchResult = await orchestrator.generateBatch(stageIds);
    
    // 성공한 스테이지들의 결과 저장
    for (const stageId of batchResult.completed) {
      const result = batchResult.results[stageId];
      if (result && result.success) {
        await this.saveStageResult(stageId, result);
      }
    }
    
    console.log(`🎯 Batch generation completed: ${batchResult.completed.length}/${stageIds.length} successful`);
    
    return batchResult;
  }
  
  /**
   * 메타데이터 검증 및 개선
   */
  async validateAndImproveMetadata(stageId: string): Promise<{
    valid: boolean;
    score: number;
    improvements: any;
    enhanced?: any;
  }> {
    if (!this.initialized) {
      throw new Error('App not initialized. Call initialize() first.');
    }
    
    try {
      const validator = new StageMetadataValidator();
      const currentMetadata = await this.loadCurrentMetadata(stageId);
      
      if (!currentMetadata) {
        return {
          valid: false,
          score: 0,
          improvements: { error: 'No metadata found for stage' }
        };
      }
      
      const validation = validator.validateStageMetadata(currentMetadata);
      const enhanced = validator.generateImprovedMetadata(currentMetadata);
      
      console.log(`📊 Metadata validation for ${stageId}: ${validation.score}% (${validation.valid ? 'VALID' : 'INVALID'})`);
      
      return {
        valid: validation.valid,
        score: validation.score,
        improvements: {
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.improvements
        },
        enhanced
      };
      
    } catch (error) {
      console.error(`❌ Metadata validation error for ${stageId}:`, error);
      return {
        valid: false,
        score: 0,
        improvements: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  /**
   * 시스템 상태 조회
   */
  async getSystemStatus(): Promise<{
    initialized: boolean;
    services: Record<string, boolean>;
    configuration: any;
    statistics?: any;
  }> {
    const healthCheck = this.initialized ? await serviceRegistry.healthCheck() : {};
    const serviceInfo = this.initialized ? serviceRegistry.getServiceInfo() : null;
    
    return {
      initialized: this.initialized,
      services: healthCheck,
      configuration: serviceInfo,
      statistics: this.initialized ? await this.getGenerationStatistics() : null
    };
  }
  
  /**
   * 우아한 종료
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;
    
    console.log('🔄 Shutting down Curriculum Generation System...');
    
    try {
      await serviceRegistry.shutdown();
      this.initialized = false;
      console.log('✅ System shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
  
  // =============== Private Methods ===============
  
  private async registerCoreServices(config: any): Promise<void> {
    // AI 제공자별 문장 생성기 등록
    if (config.environment === 'test') {
      serviceRegistry.register('ai-sentence-generator', {
        factory: () => new MockSentenceGenerator(),
        lifecycle: 'singleton',
        tags: ['generator', 'mock']
      });
    } else {
      serviceRegistry.register('ai-sentence-generator', {
        factory: () => new AISentenceGenerator({
          provider: config.aiProvider.provider,
          model: config.aiProvider.model,
          apiKey: process.env.AI_API_KEY || 'test-key',
          baseUrl: config.aiProvider.baseUrl
        }),
        lifecycle: 'singleton',
        tags: ['generator', 'ai']
      });
    }
    
    // 설정 서비스 등록
    serviceRegistry.register('config', {
      factory: () => config,
      lifecycle: 'singleton'
    });
    
    // 검증 서비스 등록
    serviceRegistry.register('sequential-grammar-validator', {
      factory: () => ({
        validateStageConfig: async (stageId: string) => ({ valid: true, errors: [] }),
        validateSentences: async (sentences: any[], stageId: string) => ({ valid: true, errors: [] })
      }),
      lifecycle: 'singleton',
      tags: ['validator']
    });
    
    serviceRegistry.register('korean-metadata-enhancer', {
      factory: () => ({
        enhance: async (sentences: any[], stageId: string) => {
          // 간단한 메타데이터 강화 (실제 구현에서는 더 복잡)
          return sentences.map(s => ({
            ...s,
            metadata: {
              ...s.metadata,
              koreanLearnerOptimized: true,
              enhancedAt: new Date().toISOString()
            }
          }));
        }
      }),
      lifecycle: 'singleton',
      tags: ['enhancer']
    });
  }
  
  private async saveStageResult(stageId: string, result: any): Promise<string> {
    const config = await curriculumConfig.load();
    const fileName = config.output.fileNamingPattern
      .replace('{level}', result.metadata.level.toString())
      .replace('{phase}', result.metadata.phase.toString())
      .replace('{stage:02d}', result.metadata.stage.toString().padStart(2, '0'));
    
    const filePath = `web_app/public/patterns/banks/level_${result.metadata.level}/${fileName}`;
    
    const outputData = {
      metadata: result.metadata,
      sentences: result.sentences,
      generated_at: new Date().toISOString(),
      version: '2.2.0'
    };
    
    // 실제로는 파일 시스템에 저장
    console.log(`💾 Would save to: ${filePath}`);
    // fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));
    
    return filePath;
  }
  
  private async loadCurrentMetadata(stageId: string): Promise<any | null> {
    // 실제로는 기존 JSON 파일에서 메타데이터 로드
    // 여기서는 임시 데이터 반환
    return {
      stageId,
      description: "Basic be verb usage",
      level: 1,
      phase: 1,
      stage: 1,
      grammar_pattern: "be-verb-present",
      learning_points: ["Basic grammar", "Simple sentences"],
      difficulty: 'basic',
      target_grammar: ['be-verb-present']
    };
  }
  
  private async getGenerationStatistics(): Promise<any> {
    return {
      totalStagesGenerated: 0,
      lastGeneratedAt: null,
      averageGenerationTime: 0,
      successRate: 0
    };
  }
  
  private printSystemInfo(): void {
    const info = serviceRegistry.getServiceInfo();
    
    console.log('\n📋 System Information:');
    console.log(`Services: ${info.services.length} registered`);
    console.log(`Plugins: ${info.plugins.length} loaded`);
    console.log(`Hooks: ${info.hooks.length} configured`);
    console.log(`Services: ${info.services.join(', ')}`);
    console.log('');
  }
}

// 전역 앱 인스턴스
export const curriculumApp = new CurriculumGenerationApp();