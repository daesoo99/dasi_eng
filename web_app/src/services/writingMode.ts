// Writing 모드 - 키보드 입력, 문법/맞춤법 체크, 정확성 강화

export interface WritingFeedback {
  isCorrect: boolean;
  originalInput: string;
  correctedText: string;
  grammarErrors: GrammarError[];
  spellingErrors: SpellingError[];
  suggestions: WritingSuggestion[];
  score: number; // 0-100
  explanation: string;
}

export interface GrammarError {
  type: 'grammar' | 'punctuation' | 'structure' | 'tense' | 'article';
  position: { start: number; end: number };
  original: string;
  corrected: string;
  rule: string;
  explanation: string;
}

export interface SpellingError {
  position: { start: number; end: number };
  original: string;
  suggestions: string[];
  confidence: number;
}

export interface WritingSuggestion {
  type: 'alternative' | 'improvement' | 'style' | 'vocabulary';
  original: string;
  suggested: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface WritingSession {
  sessionId: string;
  userId: string;
  questions: WritingQuestion[];
  results: WritingResult[];
  startTime: Date;
  endTime?: Date;
  totalScore: number;
  accuracyRate: number;
  commonMistakes: string[];
}

export interface WritingQuestion {
  id: string;
  front_ko: string;
  target_en: string;
  level: number;
  stage: number;
  difficulty: 'easy' | 'medium' | 'hard';
  grammarFocus: string[];
  vocabularyFocus: string[];
}

export interface WritingResult {
  questionId: string;
  userInput: string;
  feedback: WritingFeedback;
  timeSpent: number;
  attemptsCount: number;
  finalScore: number;
}

class WritingModeService {
  
  /**
   * 사용자 입력에 대한 상세 피드백 생성
   */
  async generateWritingFeedback(
    userInput: string,
    targetAnswer: string,
    question: WritingQuestion
  ): Promise<WritingFeedback> {
    
    try {
      // 1. 기본 정확성 체크
      const isCorrect = this.checkBasicCorrectness(userInput, targetAnswer);
      
      // 2. 문법 오류 검출
      const grammarErrors = await this.detectGrammarErrors(userInput, targetAnswer);
      
      // 3. 맞춤법 오류 검출
      const spellingErrors = await this.detectSpellingErrors(userInput);
      
      // 4. 개선 제안 생성
      const suggestions = await this.generateSuggestions(userInput, targetAnswer, question);
      
      // 5. 점수 계산
      const score = this.calculateWritingScore(userInput, targetAnswer, grammarErrors, spellingErrors);
      
      // 6. 상세 설명 생성
      const explanation = this.generateExplanation(userInput, targetAnswer, grammarErrors, suggestions);
      
      return {
        isCorrect,
        originalInput: userInput,
        correctedText: this.generateCorrectedText(userInput, grammarErrors, spellingErrors),
        grammarErrors,
        spellingErrors,
        suggestions,
        score,
        explanation
      };
      
    } catch (error) {
      console.error('Writing 피드백 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 문법 오류 검출 (룰 기반 + AI 보조)
   */
  private async detectGrammarErrors(userInput: string, _targetAnswer: string): Promise<GrammarError[]> {
    const errors: GrammarError[] = [];
    
    // 기본적인 문법 룰 체크
    const rules = [
      // be동사 오류
      {
        pattern: /\b(I|You|We|They)\s+(is)\b/gi,
        type: 'grammar' as const,
        rule: 'Subject-Verb Agreement',
        fix: (match: string) => match.replace(/is/gi, 'are')
      },
      // 단수/복수 오류
      {
        pattern: /\b(a|an)\s+(\w+s)\b/gi,
        type: 'grammar' as const,
        rule: 'Article-Noun Agreement',
        fix: (match: string) => match.replace(/s$/, '')
      },
      // 시제 오류 (간단한 예시)
      {
        pattern: /\byesterday\s+.*\b(will|going\s+to)\b/gi,
        type: 'tense' as const,
        rule: 'Past Time + Future Tense Mismatch',
        fix: (match: string) => match.replace(/(will|going\s+to)/gi, 'went')
      },
      // 관사 오류
      {
        pattern: /\b(a)\s+([aeiou])/gi,
        type: 'article' as const,
        rule: 'Article Before Vowel',
        fix: (match: string) => match.replace(/^a\s+/, 'an ')
      }
    ];
    
    rules.forEach(rule => {
      let match;
      while ((match = rule.pattern.exec(userInput)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        errors.push({
          type: rule.type,
          position: { start, end },
          original: match[0],
          corrected: rule.fix(match[0]),
          rule: rule.rule,
          explanation: this.getGrammarExplanation(rule.rule)
        });
      }
    });
    
    return errors;
  }
  
  /**
   * 맞춤법 오류 검출
   */
  private async detectSpellingErrors(userInput: string): Promise<SpellingError[]> {
    const errors: SpellingError[] = [];
    
    // 간단한 맞춤법 사전 (실제로는 더 큰 사전 사용)
    const commonMisspellings: Record<string, string[]> = {
      'recieve': ['receive'],
      'seperate': ['separate'],
      'occurence': ['occurrence'],
      'neccessary': ['necessary'],
      'beleive': ['believe'],
      'achive': ['achieve'],
      'begining': ['beginning'],
      'definately': ['definitely'],
      'intresting': ['interesting'],
      'exersise': ['exercise']
    };
    
    const words = userInput.toLowerCase().match(/\b\w+\b/g) || [];
    
    words.forEach((word, _index) => {
      if (commonMisspellings[word]) {
        const start = userInput.toLowerCase().indexOf(word);
        const end = start + word.length;
        
        errors.push({
          position: { start, end },
          original: word,
          suggestions: commonMisspellings[word],
          confidence: 0.8
        });
      }
    });
    
    return errors;
  }
  
  /**
   * 개선 제안 생성
   */
  private async generateSuggestions(
    userInput: string,
    targetAnswer: string,
    question: WritingQuestion
  ): Promise<WritingSuggestion[]> {
    
    const suggestions: WritingSuggestion[] = [];
    
    // 대안 표현 제안
    if (userInput.toLowerCase() !== targetAnswer.toLowerCase()) {
      suggestions.push({
        type: 'alternative',
        original: userInput,
        suggested: targetAnswer,
        reason: '더 자연스러운 영어 표현입니다',
        priority: 'high'
      });
    }
    
    // 어휘 개선 제안
    const basicToAdvanced: Record<string, string> = {
      'good': 'excellent, outstanding, remarkable',
      'bad': 'terrible, awful, disappointing',
      'big': 'huge, enormous, massive',
      'small': 'tiny, miniature, compact',
      'very': 'extremely, incredibly, remarkably',
      'get': 'obtain, acquire, receive',
      'make': 'create, produce, generate',
      'do': 'perform, execute, accomplish'
    };
    
    Object.entries(basicToAdvanced).forEach(([basic, advanced]) => {
      if (userInput.toLowerCase().includes(basic.toLowerCase())) {
        suggestions.push({
          type: 'vocabulary',
          original: basic,
          suggested: advanced,
          reason: '더 고급 어휘를 사용해보세요',
          priority: 'medium'
        });
      }
    });
    
    return suggestions;
  }
  
  /**
   * Writing 점수 계산
   */
  private calculateWritingScore(
    userInput: string,
    targetAnswer: string,
    grammarErrors: GrammarError[],
    spellingErrors: SpellingError[]
  ): number {
    
    let score = 100;
    
    // 문법 오류 감점
    score -= grammarErrors.length * 15;
    
    // 맞춤법 오류 감점
    score -= spellingErrors.length * 10;
    
    // 정확도 보너스/감점
    const similarity = this.calculateSimilarity(userInput, targetAnswer);
    if (similarity >= 0.9) score += 10;
    else if (similarity < 0.5) score -= 20;
    
    // 길이 차이 감점
    const lengthDiff = Math.abs(userInput.length - targetAnswer.length) / targetAnswer.length;
    if (lengthDiff > 0.5) score -= 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * 교정된 텍스트 생성
   */
  private generateCorrectedText(
    userInput: string,
    grammarErrors: GrammarError[],
    spellingErrors: SpellingError[]
  ): string {
    
    let corrected = userInput;
    
    // 문법 오류부터 수정 (뒤에서부터 수정하여 인덱스 변화 방지)
    [...grammarErrors]
      .sort((a, b) => b.position.start - a.position.start)
      .forEach(error => {
        corrected = corrected.substring(0, error.position.start) +
                   error.corrected +
                   corrected.substring(error.position.end);
      });
    
    // 맞춤법 오류 수정
    [...spellingErrors]
      .sort((a, b) => b.position.start - a.position.start)
      .forEach(error => {
        if (error.suggestions.length > 0) {
          corrected = corrected.substring(0, error.position.start) +
                     error.suggestions[0] +
                     corrected.substring(error.position.end);
        }
      });
    
    return corrected;
  }
  
  /**
   * 상세 설명 생성
   */
  private generateExplanation(
    userInput: string,
    targetAnswer: string,
    grammarErrors: GrammarError[],
    suggestions: WritingSuggestion[]
  ): string {
    
    let explanation = '';
    
    if (grammarErrors.length > 0) {
      explanation += '📝 **문법 개선점:**\n';
      grammarErrors.forEach((error, index) => {
        explanation += `${index + 1}. ${error.rule}: "${error.original}" → "${error.corrected}"\n   ${error.explanation}\n\n`;
      });
    }
    
    if (suggestions.length > 0) {
      explanation += '💡 **개선 제안:**\n';
      suggestions.slice(0, 3).forEach((suggestion, index) => {
        explanation += `${index + 1}. ${suggestion.reason}\n   "${suggestion.original}" → "${suggestion.suggested}"\n\n`;
      });
    }
    
    if (userInput.trim().toLowerCase() === targetAnswer.trim().toLowerCase()) {
      explanation += '✅ **완벽합니다!** 문법과 맞춤법이 모두 정확합니다.';
    }
    
    return explanation || '좋은 시도입니다! 계속 연습하세요.';
  }
  
  /**
   * 헬퍼 메서드들
   */
  private checkBasicCorrectness(userInput: string, targetAnswer: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[.,!?]/g, '');
    return normalize(userInput) === normalize(targetAnswer);
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private getGrammarExplanation(rule: string): string {
    const explanations: Record<string, string> = {
      'Subject-Verb Agreement': '주어와 동사의 수가 일치해야 합니다. I/You/We/They는 are을 사용합니다.',
      'Article-Noun Agreement': '부정관사 a/an 뒤에는 단수명사가 와야 합니다.',
      'Past Time + Future Tense Mismatch': '과거 시간 표현과 함께 미래 시제를 사용할 수 없습니다.',
      'Article Before Vowel': '모음으로 시작하는 단어 앞에는 "an"을 사용합니다.'
    };
    
    return explanations[rule] || '문법 규칙을 확인해보세요.';
  }
  
  /**
   * 레벨별 맞춤 피드백 생성
   */
  async generateLevelSpecificFeedback(
    feedback: WritingFeedback,
    level: number
  ): Promise<string> {
    
    if (level <= 2) {
      return '기초 단계입니다. 맞춤법과 기본 문법에 집중하세요.';
    } else if (level <= 4) {
      return '중급 단계입니다. 문법 정확성과 자연스러운 표현을 연습하세요.';
    } else {
      return '고급 단계입니다. 다양한 표현과 고급 어휘 사용에 도전하세요.';
    }
  }
}

export const writingModeService = new WritingModeService();