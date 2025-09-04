/**
 * 목업 문장 생성기 어댑터
 * @description 테스트 환경용 문장 생성기 (API 호출 없음)
 */

import { 
  SentenceGeneratorPort, 
  GenerationRequest, 
  GenerationResult, 
  GeneratedSentence 
} from '../../domain/ports/SentenceGeneratorPort';

export class MockSentenceGenerator implements SentenceGeneratorPort {
  private readonly mockData: Record<string, GeneratedSentence[]>;
  
  constructor() {
    this.mockData = this.initializeMockData();
  }
  
  async generateSentences(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    console.log(`🧪 Mock generating ${request.targetCount} sentences for ${request.stageId}`);
    
    // 시뮬레이션 지연
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const baseSentences = this.getBaseSentences(request.stageId);
      const sentences = this.generateMockSentences(baseSentences, request);
      
      const generationTime = Date.now() - startTime;
      
      console.log(`✅ Mock generated ${sentences.length} sentences in ${generationTime}ms`);
      
      return {
        success: true,
        sentences: sentences.slice(0, request.targetCount),
        errors: [],
        metadata: {
          requestId,
          generatedAt: new Date().toISOString(),
          provider: 'mock',
          generationTime,
          qualityScore: 95 // Mock always high quality
        }
      };
      
    } catch (error) {
      return {
        success: false,
        sentences: [],
        errors: [error instanceof Error ? error.message : 'Mock error'],
        metadata: {
          requestId,
          generatedAt: new Date().toISOString(),
          provider: 'mock',
          generationTime: Date.now() - startTime
        }
      };
    }
  }
  
  async validateSentences(sentences: GeneratedSentence[], stageId: string): Promise<{
    valid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    // Mock validation - 항상 성공
    return {
      valid: true,
      errors: [],
      suggestions: ['Mock validation always passes']
    };
  }
  
  getGeneratorInfo() {
    return {
      name: 'Mock Sentence Generator',
      version: '2.2.0',
      capabilities: [
        'Fast generation (no API calls)',
        'Predictable output',
        'Test data simulation',
        'No external dependencies'
      ],
      limitations: [
        'Limited variation',
        'Predefined responses only',
        'Not suitable for production'
      ]
    };
  }
  
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    // Mock always healthy
    return {
      healthy: true,
      responseTime: Date.now() - startTime
    };
  }
  
  // =============== Private Methods ===============
  
  private initializeMockData(): Record<string, GeneratedSentence[]> {
    return {
      'Lv1-P1-S01': [
        {
          id: 'mock-lv1-s01-001',
          english: 'I am happy.',
          korean: '나는 행복합니다.',
          phonetic: '/aɪ æm ˈhæpi/',
          structure: 'Subject + be verb + Adjective',
          grammarPattern: 'be-verb-present',
          difficulty: 'basic',
          tags: ['be-verb', 'emotions', 'present'],
          metadata: {
            wordCount: 3,
            complexityScore: 1.0,
            grammarElements: ['be-verb', 'adjective'],
            culturalNotes: 'Common expression of emotion',
            usageTips: 'Use to express current feelings'
          }
        },
        {
          id: 'mock-lv1-s01-002',
          english: 'She is a teacher.',
          korean: '그녀는 선생님입니다.',
          phonetic: '/ʃi ɪz ə ˈtiʧər/',
          structure: 'Subject + be verb + Article + Noun',
          grammarPattern: 'be-verb-present',
          difficulty: 'basic',
          tags: ['be-verb', 'profession', 'present'],
          metadata: {
            wordCount: 4,
            complexityScore: 1.2,
            grammarElements: ['be-verb', 'article', 'noun'],
            culturalNotes: 'Professional identification',
            usageTips: 'Use to describe occupations'
          }
        },
        {
          id: 'mock-lv1-s01-003',
          english: 'We are friends.',
          korean: '우리는 친구입니다.',
          phonetic: '/wi ɑr frɛndz/',
          structure: 'Subject + be verb + Noun',
          grammarPattern: 'be-verb-present',
          difficulty: 'basic',
          tags: ['be-verb', 'relationships', 'present'],
          metadata: {
            wordCount: 3,
            complexityScore: 1.1,
            grammarElements: ['be-verb', 'plural-noun'],
            culturalNotes: 'Relationship description',
            usageTips: 'Use to describe relationships'
          }
        }
      ],
      
      'Lv1-P1-S02': [
        {
          id: 'mock-lv1-s02-001',
          english: 'The book is interesting.',
          korean: '그 책은 흥미롭습니다.',
          phonetic: '/ðə bʊk ɪz ˈɪntrəstɪŋ/',
          structure: 'Article + Subject + be verb + Adjective',
          grammarPattern: 'be-verb-present',
          difficulty: 'basic',
          tags: ['be-verb', 'adjectives', 'articles'],
          metadata: {
            wordCount: 4,
            complexityScore: 1.3,
            grammarElements: ['article', 'be-verb', 'adjective'],
            culturalNotes: 'Object description',
            usageTips: 'Use to describe qualities of objects'
          }
        }
      ]
    };
  }
  
  private getBaseSentences(stageId: string): GeneratedSentence[] {
    return this.mockData[stageId] || this.mockData['Lv1-P1-S01'];
  }
  
  private generateMockSentences(baseSentences: GeneratedSentence[], request: GenerationRequest): GeneratedSentence[] {
    const sentences: GeneratedSentence[] = [];
    
    for (let i = 0; i < request.targetCount; i++) {
      const baseIndex = i % baseSentences.length;
      const base = baseSentences[baseIndex];
      
      sentences.push({
        ...base,
        id: `mock-${request.stageId.toLowerCase()}-${(i + 1).toString().padStart(3, '0')}`,
        english: this.varyEnglishSentence(base.english, i),
        korean: this.varyKoreanSentence(base.korean, i)
      });
    }
    
    return sentences;
  }
  
  private varyEnglishSentence(original: string, index: number): string {
    const variations = [
      original,
      original.replace('I am', 'You are').replace('나는', '당신은'),
      original.replace('She is', 'He is').replace('그녀는', '그는'),
      original.replace('We are', 'They are').replace('우리는', '그들은')
    ];
    
    return variations[index % variations.length] || original;
  }
  
  private varyKoreanSentence(original: string, index: number): string {
    const variations = [
      original,
      original.replace('입니다', '이에요'),
      original.replace('입니다', '예요'),
      original
    ];
    
    return variations[index % variations.length] || original;
  }
  
  private generateRequestId(): string {
    return `mock_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}