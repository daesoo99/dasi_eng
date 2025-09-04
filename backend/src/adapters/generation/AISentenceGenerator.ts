/**
 * AI 문장 생성기 어댑터
 * @description OpenAI/Anthropic API를 활용한 문장 생성 구현체
 */

import { 
  SentenceGeneratorPort, 
  GenerationRequest, 
  GenerationResult, 
  GeneratedSentence 
} from '../../domain/ports/SentenceGeneratorPort';

export class AISentenceGenerator implements SentenceGeneratorPort {
  private readonly provider: 'openai' | 'anthropic';
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  
  constructor(config: {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
    baseUrl?: string;
  }) {
    this.provider = config.provider;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl();
  }
  
  async generateSentences(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      console.log(`🤖 Generating ${request.targetCount} sentences for ${request.stageId} using ${this.provider}`);
      
      const prompt = this.buildPrompt(request);
      const response = await this.callAIProvider(prompt);
      const sentences = await this.parseSentences(response, request);
      
      const generationTime = Date.now() - startTime;
      const qualityScore = this.calculateQualityScore(sentences);
      
      console.log(`✅ Generated ${sentences.length} sentences in ${generationTime}ms (quality: ${qualityScore}%)`);
      
      return {
        success: true,
        sentences,
        errors: [],
        metadata: {
          requestId,
          generatedAt: new Date().toISOString(),
          provider: this.provider,
          generationTime,
          qualityScore
        }
      };
      
    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error(`❌ Sentence generation failed:`, error);
      
      return {
        success: false,
        sentences: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          requestId,
          generatedAt: new Date().toISOString(),
          provider: this.provider,
          generationTime
        }
      };
    }
  }
  
  async validateSentences(sentences: GeneratedSentence[], stageId: string): Promise<{
    valid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // 기본 검증
    for (const sentence of sentences) {
      if (!sentence.english || sentence.english.trim().length === 0) {
        errors.push(`Empty English sentence: ${sentence.id}`);
      }
      
      if (!sentence.korean || sentence.korean.trim().length === 0) {
        errors.push(`Empty Korean translation: ${sentence.id}`);
      }
      
      if (!sentence.grammarPattern) {
        errors.push(`Missing grammar pattern: ${sentence.id}`);
      }
    }
    
    // 중복 검사
    const englishSentences = sentences.map(s => s.english);
    const duplicates = englishSentences.filter((s, i) => englishSentences.indexOf(s) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate sentences found: ${duplicates.join(', ')}`);
    }
    
    // 길이 분포 검사
    const lengths = sentences.map(s => s.english.split(' ').length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    if (avgLength > 15) {
      suggestions.push('Consider shorter sentences for better learning progression');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  getGeneratorInfo() {
    return {
      name: `AI Sentence Generator (${this.provider})`,
      version: '2.2.0',
      capabilities: [
        'Multi-stage sentence generation',
        'Korean translation',
        'Grammar pattern recognition',
        'Cultural context awareness',
        'Sequential learning compliance'
      ],
      limitations: [
        'API rate limits',
        'Context window constraints',
        'Cost per generation',
        'Network dependency'
      ]
    };
  }
  
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // 간단한 테스트 요청
      const testPrompt = "Generate a simple test sentence using 'be' verb.";
      await this.callAIProvider(testPrompt);
      
      return {
        healthy: true,
        responseTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // =============== Private Methods ===============
  
  private buildPrompt(request: GenerationRequest): string {
    const { stageId, targetCount, grammarFocus, vocabularyLevel, complexity, allowedGrammarStages } = request;
    
    return `You are an expert English curriculum designer for Korean learners. Generate exactly ${targetCount} English sentences for ${stageId}.

CRITICAL REQUIREMENTS:
1. SEQUENTIAL LEARNING: Only use grammar patterns from stages ${allowedGrammarStages.join(', ')}. NEVER use advanced grammar.
2. GRAMMAR FOCUS: Primary patterns are ${grammarFocus.join(', ')}
3. VOCABULARY LEVEL: ${vocabularyLevel} level words only
4. COMPLEXITY: ${complexity} sentence structures only
5. KOREAN LEARNERS: Consider Korean language structure and common mistakes

EACH SENTENCE MUST INCLUDE:
- English sentence (natural and practical)
- Korean translation (accurate and helpful)
- Phonetic transcription (IPA or simplified)
- Grammar pattern identification
- Difficulty level (basic/intermediate/advanced)
- Word count and complexity score
- Cultural notes (if relevant)

FORMAT AS JSON ARRAY:
[
  {
    "id": "unique_id",
    "english": "sentence text",
    "korean": "번역",
    "phonetic": "/pronunciation/",
    "structure": "Subject + Verb + Object",
    "grammarPattern": "be-verb-present",
    "difficulty": "basic",
    "tags": ["be-verb", "present"],
    "metadata": {
      "wordCount": 4,
      "complexityScore": 1.2,
      "grammarElements": ["be-verb", "adjective"],
      "culturalNotes": "Common greeting expression",
      "usageTips": "Use in casual conversations"
    }
  }
]

Generate ${targetCount} unique, practical sentences now:`;
  }
  
  private async callAIProvider(prompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt);
    } else if (this.provider === 'anthropic') {
      return this.callAnthropic(prompt);
    } else {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }
  
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }
  
  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.content?.[0]?.text || '';
  }
  
  private async parseSentences(response: string, request: GenerationRequest): Promise<GeneratedSentence[]> {
    try {
      // JSON 응답에서 배열 부분 추출
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      
      const sentences = JSON.parse(jsonMatch[0]) as any[];
      
      return sentences.map((s, index) => ({
        id: s.id || `${request.stageId}-${index + 1}`,
        english: s.english || '',
        korean: s.korean || '',
        phonetic: s.phonetic || '',
        structure: s.structure || 'Unknown',
        grammarPattern: s.grammarPattern || request.grammarFocus[0],
        difficulty: s.difficulty || 'basic',
        tags: s.tags || [],
        metadata: {
          wordCount: s.metadata?.wordCount || s.english?.split(' ').length || 0,
          complexityScore: s.metadata?.complexityScore || 1.0,
          grammarElements: s.metadata?.grammarElements || [],
          culturalNotes: s.metadata?.culturalNotes,
          usageTips: s.metadata?.usageTips
        }
      }));
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Failed to parse sentences from AI response: ${error}`);
    }
  }
  
  private calculateQualityScore(sentences: GeneratedSentence[]): number {
    if (sentences.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const sentence of sentences) {
      let score = 100;
      
      // 필수 필드 검사
      if (!sentence.english) score -= 30;
      if (!sentence.korean) score -= 30;
      if (!sentence.grammarPattern) score -= 20;
      
      // 길이 적절성
      const wordCount = sentence.english.split(' ').length;
      if (wordCount < 3 || wordCount > 15) score -= 10;
      
      totalScore += Math.max(0, score);
    }
    
    return Math.round(totalScore / sentences.length);
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getDefaultBaseUrl(): string {
    return this.provider === 'openai' 
      ? 'https://api.openai.com/v1'
      : 'https://api.anthropic.com/v1';
  }
}