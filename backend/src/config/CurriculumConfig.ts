/**
 * 커리큘럼 생성 설정 시스템
 * @description 하드코딩 방지, 환경별 설정 분리, 플러그인 기반 구성
 */

export interface StageConfig {
  level: number;
  phase: number;
  stage: number;
  grammarFocus: string[];
  vocabularyDifficulty: 'basic' | 'intermediate' | 'advanced';
  sentenceComplexity: 'simple' | 'compound' | 'complex';
  targetSentenceCount: number;
  allowedGrammarFromStages: number[];
  culturalContext?: 'korean-learner' | 'general' | 'academic';
}

export interface GenerationRules {
  sequentialLearning: {
    strictMode: boolean;
    allowableExceptions: string[];
    grammarProgressionValidation: boolean;
  };
  qualityAssurance: {
    minVariation: number;
    maxRepetition: number;
    naturalLanguageScore: number;
    koreanLearnerOptimization: boolean;
  };
  metadata: {
    includePhonetics: boolean;
    includeCulturalNotes: boolean;
    generateUsageTips: boolean;
  };
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackProviders: string[];
}

export interface CurriculumConfig {
  version: string;
  environment: 'development' | 'production' | 'test';
  
  // 스테이지 설정
  stages: Record<string, StageConfig>;
  
  // 생성 규칙
  generationRules: GenerationRules;
  
  // AI 제공자 설정
  aiProvider: AIProviderConfig;
  
  // 출력 설정
  output: {
    fileNamingPattern: string;
    backupLocation: string;
    validationLocation: string;
  };
  
  // 플러그인 설정
  plugins: {
    sentenceGenerator: string;
    grammarValidator: string;
    metadataEnhancer: string;
    qualityAssurance: string;
  };
}

/**
 * 설정 로더 - 환경별 설정 파일 로딩
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: CurriculumConfig | null = null;
  
  static getInstance(): ConfigLoader {
    if (!this.instance) {
      this.instance = new ConfigLoader();
    }
    return this.instance;
  }
  
  async loadConfig(environment?: string): Promise<CurriculumConfig> {
    if (this.config) {
      return this.config;
    }
    
    const env = environment || process.env.NODE_ENV || 'development';
    
    try {
      // 환경별 설정 파일 로딩
      const configPath = `../config/curriculum-${env}.json`;
      const configModule = await import(configPath);
      
      this.config = this.validateConfig(configModule.default);
      console.log(`📋 Curriculum config loaded for ${env} environment`);
      
      return this.config;
      
    } catch (error) {
      console.warn(`⚠️  Failed to load config for ${env}, using defaults`);
      return this.getDefaultConfig(env as any);
    }
  }
  
  private validateConfig(config: any): CurriculumConfig {
    // 필수 필드 검증
    const required = ['version', 'environment', 'stages', 'generationRules', 'aiProvider'];
    for (const field of required) {
      if (!(field in config)) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
    
    // 스테이지 설정 검증
    if (typeof config.stages !== 'object') {
      throw new Error('stages must be an object');
    }
    
    return config as CurriculumConfig;
  }
  
  private getDefaultConfig(environment: 'development' | 'production' | 'test'): CurriculumConfig {
    return {
      version: '2.2.0',
      environment,
      
      stages: this.getDefaultStageConfigs(),
      
      generationRules: {
        sequentialLearning: {
          strictMode: true,
          allowableExceptions: [],
          grammarProgressionValidation: true
        },
        qualityAssurance: {
          minVariation: 80,
          maxRepetition: 10,
          naturalLanguageScore: 85,
          koreanLearnerOptimization: true
        },
        metadata: {
          includePhonetics: true,
          includeCulturalNotes: true,
          generateUsageTips: true
        }
      },
      
      aiProvider: this.getAIProviderConfig(environment),
      
      output: {
        fileNamingPattern: 'Lv{level}-P{phase}-S{stage:02d}_bank.json',
        backupLocation: '../backups/curriculum/',
        validationLocation: '../docs/validation/'
      },
      
      plugins: {
        sentenceGenerator: environment === 'test' ? 'mock-sentence-generator' : 'ai-sentence-generator',
        grammarValidator: 'sequential-grammar-validator',
        metadataEnhancer: 'korean-metadata-enhancer',
        qualityAssurance: 'curriculum-qa-validator'
      }
    };
  }
  
  private getDefaultStageConfigs(): Record<string, StageConfig> {
    const configs: Record<string, StageConfig> = {};
    
    // Level 1 예시 설정 (기본 패턴)
    for (let stage = 1; stage <= 16; stage++) {
      const stageId = `Lv1-P${Math.ceil(stage / 4)}-S${stage.toString().padStart(2, '0')}`;
      
      configs[stageId] = {
        level: 1,
        phase: Math.ceil(stage / 4),
        stage,
        grammarFocus: this.getLevel1GrammarFocus(stage),
        vocabularyDifficulty: 'basic',
        sentenceComplexity: 'simple',
        targetSentenceCount: 50,
        allowedGrammarFromStages: Array.from({ length: stage }, (_, i) => i + 1),
        culturalContext: 'korean-learner'
      };
    }
    
    return configs;
  }
  
  private getLevel1GrammarFocus(stage: number): string[] {
    const grammarMap: Record<number, string[]> = {
      1: ['be-verb-present'],
      2: ['be-verb-present', 'basic-adjectives'],
      3: ['be-verb-present', 'basic-nouns', 'articles'],
      4: ['be-verb-present', 'possessive-pronouns'],
      // ... 추가 스테이지 정의
    };
    
    return grammarMap[stage] || ['basic-grammar'];
  }
  
  private getAIProviderConfig(environment: string): AIProviderConfig {
    const configs = {
      development: {
        provider: 'anthropic' as const,
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are an expert English curriculum designer for Korean learners.',
        fallbackProviders: ['openai']
      },
      production: {
        provider: 'openai' as const,
        model: 'gpt-4-turbo',
        temperature: 0.6,
        maxTokens: 1500,
        systemPrompt: 'Generate high-quality English sentences following strict curriculum guidelines.',
        fallbackProviders: ['anthropic']
      },
      test: {
        provider: 'local' as const,
        model: 'mock',
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: 'Mock AI for testing',
        fallbackProviders: []
      }
    };
    
    return configs[environment as keyof typeof configs] || configs.development;
  }
  
  /**
   * 런타임 설정 오버라이드
   */
  overrideConfig(overrides: Partial<CurriculumConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...overrides };
      console.log('📝 Config overridden:', Object.keys(overrides));
    }
  }
  
  /**
   * 설정 검증 및 헬스체크
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config) {
      errors.push('Configuration not loaded');
      return { valid: false, errors };
    }
    
    // AI 제공자 설정 검증
    if (!this.config.aiProvider.provider) {
      errors.push('AI provider not specified');
    }
    
    // 스테이지 설정 검증
    const stageCount = Object.keys(this.config.stages).length;
    if (stageCount === 0) {
      errors.push('No stages configured');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 설정 유틸리티 함수
 */
export const curriculumConfig = {
  async load(environment?: string): Promise<CurriculumConfig> {
    return ConfigLoader.getInstance().loadConfig(environment);
  },
  
  override(overrides: Partial<CurriculumConfig>): void {
    ConfigLoader.getInstance().overrideConfig(overrides);
  },
  
  validate(): { valid: boolean; errors: string[] } {
    return ConfigLoader.getInstance().validateConfiguration();
  }
};