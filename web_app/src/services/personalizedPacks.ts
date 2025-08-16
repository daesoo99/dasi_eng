// 개인 맞춤 학습팩 생성 서비스
import { api } from '../lib/api';

export interface WeakArea {
  category: 'grammar' | 'vocabulary' | 'pronunciation';
  type: string;
  description: string;
  frequency: number;
  lastEncountered: Date;
}

export interface PersonalizedPack {
  id: string;
  name: string;
  description: string;
  targetWeakAreas: WeakArea[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  sentences: PersonalizedSentence[];
  createdAt: Date;
  lastUsed?: Date;
  completionRate: number;
}

export interface PersonalizedSentence {
  id: string;
  kr: string;
  en: string;
  level: number;
  stage: string;
  targetPattern: string;
  difficulty: number;
  weakAreaTypes: string[];
  explanation?: string;
}

export interface UserWeakAreaData {
  userId: string;
  weakAreas: WeakArea[];
  learningHistory: {
    incorrectAnswers: Array<{
      sentence: any;
      timestamp: Date;
      errorType: string;
      attempted: string;
      correct: string;
    }>;
    struggledPatterns: Array<{
      pattern: string;
      frequency: number;
      lastSeen: Date;
    }>;
  };
  preferences: {
    focusAreas: string[];
    difficulty: string;
    sessionLength: number;
  };
}

class PersonalizedPackService {
  private readonly API_BASE = '/api/personalized';

  // 사용자의 약점 영역 분석
  async analyzeWeakAreas(userId: string): Promise<WeakArea[]> {
    try {
      const response = await api.get(`${this.API_BASE}/analyze/${userId}`);
      return response.data.weakAreas;
    } catch (error) {
      console.error('Failed to analyze weak areas:', error);
      return this.getMockWeakAreas(); // Fallback to mock data
    }
  }

  // 개인 맞춤 학습팩 생성
  async generatePersonalizedPack(
    userId: string,
    options: {
      targetWeakAreas?: string[];
      difficulty?: string;
      sentenceCount?: number;
      focusType?: 'grammar' | 'vocabulary' | 'mixed';
    }
  ): Promise<PersonalizedPack> {
    const {
      targetWeakAreas = [],
      difficulty = 'intermediate',
      sentenceCount = 20,
      focusType = 'mixed'
    } = options;

    try {
      const response = await api.post(`${this.API_BASE}/generate`, {
        userId,
        targetWeakAreas,
        difficulty,
        sentenceCount,
        focusType
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate personalized pack:', error);
      return this.generateMockPack(options);
    }
  }

  // 약점 패턴별 문장 필터링
  async getSentencesByWeakPattern(pattern: string, count: number = 10): Promise<PersonalizedSentence[]> {
    try {
      const response = await api.get(`${this.API_BASE}/sentences/pattern/${pattern}?count=${count}`);
      return response.data.sentences;
    } catch (error) {
      console.error('Failed to get sentences by pattern:', error);
      return [];
    }
  }

  // 문법 카테고리별 약점 문장 생성
  async getGrammarFocusedPack(grammarTypes: string[], difficulty: string): Promise<PersonalizedPack> {
    const grammarPatterns = this.getGrammarPatterns(grammarTypes);
    const sentences: PersonalizedSentence[] = [];

    for (const pattern of grammarPatterns) {
      const patternSentences = await this.getSentencesByWeakPattern(pattern, 5);
      sentences.push(...patternSentences);
    }

    return {
      id: `grammar-pack-${Date.now()}`,
      name: `문법 집중 학습팩: ${grammarTypes.join(', ')}`,
      description: `약점 문법 패턴을 집중 연습하는 개인 맞춤 학습팩`,
      targetWeakAreas: grammarTypes.map(type => ({
        category: 'grammar' as const,
        type,
        description: this.getGrammarDescription(type),
        frequency: 3,
        lastEncountered: new Date()
      })),
      difficulty: difficulty as any,
      estimatedTime: sentences.length * 2,
      sentences,
      createdAt: new Date(),
      completionRate: 0
    };
  }

  // 어휘 집중 학습팩 생성
  async getVocabularyFocusedPack(vocabTypes: string[], difficulty: string): Promise<PersonalizedPack> {
    const sentences = await this.getVocabularyBasedSentences(vocabTypes, 20);

    return {
      id: `vocab-pack-${Date.now()}`,
      name: `어휘 집중 학습팩: ${vocabTypes.join(', ')}`,
      description: `약점 어휘 영역을 집중 연습하는 개인 맞춤 학습팩`,
      targetWeakAreas: vocabTypes.map(type => ({
        category: 'vocabulary' as const,
        type,
        description: this.getVocabDescription(type),
        frequency: 3,
        lastEncountered: new Date()
      })),
      difficulty: difficulty as any,
      estimatedTime: sentences.length * 2,
      sentences,
      createdAt: new Date(),
      completionRate: 0
    };
  }

  // 학습 진도 업데이트
  async updateProgress(packId: string, sentenceId: string, isCorrect: boolean): Promise<void> {
    try {
      await api.post(`${this.API_BASE}/progress`, {
        packId,
        sentenceId,
        isCorrect,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  // 학습팩 목록 조회
  async getUserPacks(userId: string): Promise<PersonalizedPack[]> {
    try {
      const response = await api.get(`${this.API_BASE}/packs/${userId}`);
      return response.data.packs;
    } catch (error) {
      console.error('Failed to get user packs:', error);
      return [];
    }
  }

  // Helper Methods
  private getGrammarPatterns(grammarTypes: string[]): string[] {
    const patternMap: Record<string, string[]> = {
      'present-perfect': ['HAVE-PERFECT', 'HAS-PERFECT', 'PRESENT-PERFECT'],
      'past-tense': ['PAST-REGULAR', 'PAST-IRREGULAR', 'PAST-SIMPLE'],
      'future': ['WILL-FUTURE', 'GOING-TO-FUTURE', 'FUTURE-PLANS'],
      'conditionals': ['IF-CONDITIONAL', 'WOULD-CONDITIONAL', 'CONDITIONAL-TYPE'],
      'passive': ['PASSIVE-VOICE', 'BE-PAST-PARTICIPLE', 'PASSIVE-CONSTRUCTION'],
      'modals': ['MODAL-VERBS', 'CAN-COULD', 'SHOULD-MUST'],
      'relative-clauses': ['WHO-WHICH-THAT', 'RELATIVE-PRONOUNS', 'COMPLEX-SENTENCES'],
      'gerunds-infinitives': ['GERUND-USAGE', 'INFINITIVE-USAGE', 'VERB-PATTERNS']
    };

    return grammarTypes.flatMap(type => patternMap[type] || [type.toUpperCase()]);
  }

  private getGrammarDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'present-perfect': '현재완료: 경험, 완료, 계속, 결과',
      'past-tense': '과거시제: 단순과거, 불규칙동사',
      'future': '미래시제: will, going to, 계획 표현',
      'conditionals': '가정법: if절, would, 조건문',
      'passive': '수동태: be + 과거분사',
      'modals': '조동사: can, should, must, might',
      'relative-clauses': '관계절: who, which, that',
      'gerunds-infinitives': '동명사와 부정사'
    };
    return descriptions[type] || type;
  }

  private getVocabDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'business': '비즈니스 어휘: 회의, 협상, 프레젠테이션',
      'academic': '학술 어휘: 연구, 분석, 논문',
      'daily-life': '일상 어휘: 생활, 취미, 관계',
      'technology': '기술 어휘: IT, 혁신, 디지털',
      'healthcare': '의료 어휘: 건강, 치료, 진료',
      'environment': '환경 어휘: 자연, 기후, 지속가능성'
    };
    return descriptions[type] || type;
  }

  private async getVocabularyBasedSentences(vocabTypes: string[], count: number): Promise<PersonalizedSentence[]> {
    // 실제 구현에서는 API를 통해 어휘별 문장을 가져옴
    return this.getMockVocabSentences(vocabTypes, count);
  }

  // Mock Data for Development
  private getMockWeakAreas(): WeakArea[] {
    return [
      {
        category: 'grammar',
        type: 'present-perfect',
        description: '현재완료 시제 사용 어려움',
        frequency: 5,
        lastEncountered: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        category: 'grammar',
        type: 'conditionals',
        description: '가정법 구조 혼동',
        frequency: 3,
        lastEncountered: new Date(Date.now() - 172800000) // 2 days ago
      },
      {
        category: 'vocabulary',
        type: 'business',
        description: '비즈니스 전문 용어 부족',
        frequency: 4,
        lastEncountered: new Date(Date.now() - 43200000) // 12 hours ago
      }
    ];
  }

  private generateMockPack(options: any): PersonalizedPack {
    return {
      id: `mock-pack-${Date.now()}`,
      name: '개인 맞춤 학습팩',
      description: '약점 분석 결과를 바탕으로 생성된 맞춤형 학습팩',
      targetWeakAreas: this.getMockWeakAreas(),
      difficulty: options.difficulty || 'intermediate',
      estimatedTime: 30,
      sentences: this.getMockPersonalizedSentences(),
      createdAt: new Date(),
      completionRate: 0
    };
  }

  private getMockPersonalizedSentences(): PersonalizedSentence[] {
    return [
      {
        id: 'ps1',
        kr: '나는 그 영화를 세 번 봤어요.',
        en: 'I have seen that movie three times.',
        level: 3,
        stage: 'Lv3-P2-S08',
        targetPattern: 'PRESENT-PERFECT',
        difficulty: 3,
        weakAreaTypes: ['present-perfect'],
        explanation: '현재완료: 경험을 나타내는 용법'
      },
      {
        id: 'ps2',
        kr: '만약 비가 온다면, 우리는 집에 있을 것입니다.',
        en: 'If it rains, we will stay at home.',
        level: 3,
        stage: 'Lv3-P3-S12',
        targetPattern: 'IF-CONDITIONAL',
        difficulty: 3,
        weakAreaTypes: ['conditionals'],
        explanation: '1종 조건문: 미래의 가능한 상황'
      }
    ];
  }

  private getMockVocabSentences(types: string[], count: number): PersonalizedSentence[] {
    const mockSentences: PersonalizedSentence[] = [
      {
        id: 'vs1',
        kr: '회의 일정을 조정해야 합니다.',
        en: 'We need to reschedule the meeting.',
        level: 4,
        stage: 'Lv4-P1-S03',
        targetPattern: 'BUSINESS-SCHEDULING',
        difficulty: 2,
        weakAreaTypes: ['business'],
        explanation: 'reschedule: 일정을 다시 잡다'
      },
      {
        id: 'vs2',
        kr: '이 연구는 획기적인 발견을 가져왔습니다.',
        en: 'This research led to a breakthrough discovery.',
        level: 5,
        stage: 'Lv5-P2-S15',
        targetPattern: 'ACADEMIC-RESEARCH',
        difficulty: 4,
        weakAreaTypes: ['academic'],
        explanation: 'breakthrough: 획기적인, 돌파구가 되는'
      }
    ];
    
    return mockSentences.slice(0, count);
  }
}

export const personalizedPackService = new PersonalizedPackService();