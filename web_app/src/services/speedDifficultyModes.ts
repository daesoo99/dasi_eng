// 속도/난이도 조절 모드 서비스

export type DifficultyMode = 'fast' | 'explanation' | 'mixed_levels';

export interface SpeedModeSettings {
  timeLimit: number; // 초
  showTimer: boolean;
  earlyFinishBonus: boolean;
  pressureLevel: 'low' | 'medium' | 'high';
}

export interface ExplanationModeSettings {
  showDetailedFeedback: boolean;
  includeGrammarNotes: boolean;
  includeExamples: boolean;
  audioExplanation: boolean;
  pauseAfterEachQuestion: boolean;
}

export interface MixedLevelSettings {
  includedLevels: number[];
  randomOrder: boolean;
  balanceByDifficulty: boolean;
  adaptiveSelection: boolean; // 실력에 맞춰 문제 선택
}

export interface SpeedSession {
  sessionId: string;
  userId: string;
  mode: DifficultyMode;
  settings: SpeedModeSettings | ExplanationModeSettings | MixedLevelSettings;
  questions: SpeedQuestion[];
  results: SpeedResult[];
  startTime: Date;
  endTime?: Date;
  totalScore: number;
  averageResponseTime: number;
}

export interface SpeedQuestion {
  questionId: string;
  content: string;
  level: number;
  stage: number;
  timeLimit?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface SpeedResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  timeExceeded: boolean;
  bonusPoints: number;
  explanation?: string;
}

class SpeedDifficultyService {
  
  /**
   * 빠른 모드 세션 생성 (2-3초 제한)
   */
  async createFastSession(
    userId: string,
    settings: SpeedModeSettings,
    questionCount: number = 20
  ): Promise<SpeedSession> {
    
    try {
      const questions = await this.generateFastModeQuestions(userId, questionCount, settings);
      
      const session: SpeedSession = {
        sessionId: `fast-${Date.now()}-${userId}`,
        userId,
        mode: 'fast',
        settings,
        questions,
        results: [],
        startTime: new Date(),
        totalScore: 0,
        averageResponseTime: 0
      };
      
      return session;
      
    } catch (error) {
      console.error('빠른 모드 세션 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 해설 모드 세션 생성
   */
  async createExplanationSession(
    userId: string,
    settings: ExplanationModeSettings,
    questionCount: number = 15
  ): Promise<SpeedSession> {
    
    try {
      const questions = await this.generateExplanationModeQuestions(userId, questionCount, settings);
      
      const session: SpeedSession = {
        sessionId: `explanation-${Date.now()}-${userId}`,
        userId,
        mode: 'explanation',
        settings,
        questions,
        results: [],
        startTime: new Date(),
        totalScore: 0,
        averageResponseTime: 0
      };
      
      return session;
      
    } catch (error) {
      console.error('해설 모드 세션 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 레벨 혼합 모드 세션 생성
   */
  async createMixedLevelSession(
    userId: string,
    settings: MixedLevelSettings,
    questionCount: number = 25
  ): Promise<SpeedSession> {
    
    try {
      const questions = await this.generateMixedLevelQuestions(userId, questionCount, settings);
      
      const session: SpeedSession = {
        sessionId: `mixed-${Date.now()}-${userId}`,
        userId,
        mode: 'mixed_levels',
        settings,
        questions,
        results: [],
        startTime: new Date(),
        totalScore: 0,
        averageResponseTime: 0
      };
      
      return session;
      
    } catch (error) {
      console.error('레벨 혼합 모드 세션 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 빠른 모드 문제 생성
   */
  private async generateFastModeQuestions(
    userId: string,
    count: number,
    settings: SpeedModeSettings
  ): Promise<SpeedQuestion[]> {
    
    // 사용자 현재 레벨 기준으로 적절한 난이도 문제 선택
    const userLevel = await this.getUserLevel(userId);
    
    const mockQuestions: SpeedQuestion[] = [
      {
        questionId: 'fast-L3-001',
        content: 'If I _____ time, I would go to the movies.',
        level: 3,
        stage: 1,
        timeLimit: settings.timeLimit,
        difficulty: 'medium',
        tags: ['conditional', 'grammar']
      },
      {
        questionId: 'fast-L3-002',
        content: 'She _____ working when I called her.',
        level: 3,
        stage: 2,
        timeLimit: settings.timeLimit,
        difficulty: 'easy',
        tags: ['past-continuous', 'grammar']
      },
      {
        questionId: 'fast-L4-001',
        content: 'We need to _____ our marketing strategy.',
        level: 4,
        stage: 1,
        timeLimit: settings.timeLimit,
        difficulty: 'hard',
        tags: ['business', 'vocabulary']
      }
    ];
    
    // 압박 수준에 따라 시간 제한 조정
    const adjustedQuestions = mockQuestions.map(q => ({
      ...q,
      timeLimit: this.adjustTimeLimitByPressure(settings.timeLimit, settings.pressureLevel)
    }));
    
    return adjustedQuestions.slice(0, count);
  }
  
  /**
   * 해설 모드 문제 생성
   */
  private async generateExplanationModeQuestions(
    userId: string,
    count: number,
    settings: ExplanationModeSettings
  ): Promise<SpeedQuestion[]> {
    
    const mockQuestions: SpeedQuestion[] = [
      {
        questionId: 'exp-L3-001',
        content: 'If I had known, I _____ differently.',
        level: 3,
        stage: 9,
        difficulty: 'hard',
        tags: ['third-conditional', 'grammar', 'complex']
      },
      {
        questionId: 'exp-L4-001',
        content: 'The proposal _____ be reviewed by the committee.',
        level: 4,
        stage: 5,
        difficulty: 'medium',
        tags: ['passive-voice', 'business', 'formal']
      }
    ];
    
    return mockQuestions.slice(0, count);
  }
  
  /**
   * 레벨 혼합 모드 문제 생성
   */
  private async generateMixedLevelQuestions(
    userId: string,
    count: number,
    settings: MixedLevelSettings
  ): Promise<SpeedQuestion[]> {
    
    const allQuestions: SpeedQuestion[] = [];
    
    // 각 레벨에서 문제 선택
    for (const level of settings.includedLevels) {
      const levelQuestions = await this.getQuestionsForLevel(level);
      allQuestions.push(...levelQuestions);
    }
    
    // 랜덤 순서 또는 난이도 균형
    let selectedQuestions = allQuestions;
    
    if (settings.randomOrder) {
      selectedQuestions = this.shuffleArray(allQuestions);
    } else if (settings.balanceByDifficulty) {
      selectedQuestions = this.balanceByDifficulty(allQuestions);
    }
    
    return selectedQuestions.slice(0, count);
  }
  
  /**
   * 답변 처리 및 점수 계산
   */
  async processAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: string,
    responseTime: number
  ): Promise<SpeedResult> {
    
    try {
      const question = await this.getQuestionById(questionId);
      const correctAnswer = await this.getCorrectAnswer(questionId);
      
      const isCorrect = this.validateAnswer(userAnswer, correctAnswer);
      const timeExceeded = question.timeLimit ? responseTime > (question.timeLimit * 1000) : false;
      
      // 보너스 점수 계산 (빠른 정답)
      let bonusPoints = 0;
      if (isCorrect && question.timeLimit) {
        const timeRatio = responseTime / (question.timeLimit * 1000);
        if (timeRatio < 0.5) bonusPoints = 50; // 절반 시간 내 정답
        else if (timeRatio < 0.7) bonusPoints = 30;
        else if (timeRatio < 0.9) bonusPoints = 10;
      }
      
      const result: SpeedResult = {
        questionId,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTime,
        timeExceeded,
        bonusPoints
      };
      
      // 해설 모드인 경우 설명 추가
      const session = await this.getSession(sessionId);
      if (session.mode === 'explanation') {
        result.explanation = await this.generateExplanation(question, isCorrect);
      }
      
      return result;
      
    } catch (error) {
      console.error('답변 처리 실패:', error);
      throw error;
    }
  }
  
  /**
   * 상세 설명 생성
   */
  private async generateExplanation(question: SpeedQuestion, isCorrect: boolean): Promise<string> {
    
    const explanations: Record<string, string> = {
      'exp-L3-001': `
        🎯 **Third Conditional (3차 조건문)**
        
        **구조**: If + had + past participle, would have + past participle
        **의미**: 과거의 가정적 상황과 그 결과
        
        ${isCorrect ? '✅ 정답입니다!' : '❌ 다시 생각해보세요.'}
        
        **정답**: would have acted
        **이유**: 과거에 일어나지 않은 가정과 그 결과를 표현할 때 사용합니다.
        
        **비슷한 예문**:
        - If I had studied harder, I would have passed the exam.
        - If she had left earlier, she wouldn't have been late.
      `,
      'exp-L4-001': `
        🎯 **Passive Voice in Business Context**
        
        **구조**: will + be + past participle
        **의미**: 미래의 수동태 표현
        
        ${isCorrect ? '✅ 정답입니다!' : '❌ 다시 생각해보세요.'}
        
        **정답**: will
        **이유**: 공식적인 비즈니스 문서에서 미래 계획을 수동태로 표현할 때 사용합니다.
        
        **비슷한 예문**:
        - The contract will be signed next week.
        - New policies will be implemented in January.
      `
    };
    
    return explanations[question.questionId] || '해설 정보를 불러올 수 없습니다.';
  }
  
  /**
   * 세션 완료 및 통계 계산
   */
  async completeSession(sessionId: string): Promise<{
    totalScore: number;
    accuracy: number;
    averageResponseTime: number;
    bonusPoints: number;
    improvementAreas: string[];
    nextRecommendation: string;
  }> {
    
    try {
      const session = await this.getSession(sessionId);
      session.endTime = new Date();
      
      const results = session.results;
      const correctAnswers = results.filter(r => r.isCorrect).length;
      const totalQuestions = results.length;
      
      const accuracy = (correctAnswers / totalQuestions) * 100;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalQuestions;
      const bonusPoints = results.reduce((sum, r) => sum + r.bonusPoints, 0);
      const totalScore = (correctAnswers * 100) + bonusPoints;
      
      // 개선 영역 분석
      const incorrectTags = results
        .filter(r => !r.isCorrect)
        .map(r => this.getQuestionTags(r.questionId))
        .flat()
        .reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      const improvementAreas = Object.entries(incorrectTags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([tag]) => tag);
      
      // 다음 추천 모드
      let nextRecommendation = '';
      if (session.mode === 'fast') {
        if (accuracy >= 80) {
          nextRecommendation = '높은 정확도를 보이고 있습니다! 해설 모드로 더 깊이 학습해보세요.';
        } else {
          nextRecommendation = '기본 학습을 더 진행한 후 다시 도전해보세요.';
        }
      } else if (session.mode === 'explanation') {
        nextRecommendation = '충분히 학습하셨습니다. 빠른 모드로 반응속도를 테스트해보세요.';
      } else {
        nextRecommendation = '다양한 레벨의 문제를 잘 풀고 있습니다. 계속 도전하세요!';
      }
      
      return {
        totalScore,
        accuracy,
        averageResponseTime,
        bonusPoints,
        improvementAreas,
        nextRecommendation
      };
      
    } catch (error) {
      console.error('세션 완료 처리 실패:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private adjustTimeLimitByPressure(baseTime: number, pressure: 'low' | 'medium' | 'high'): number {
    switch (pressure) {
      case 'low': return baseTime * 1.5;
      case 'medium': return baseTime;
      case 'high': return baseTime * 0.7;
      default: return baseTime;
    }
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private balanceByDifficulty(questions: SpeedQuestion[]): SpeedQuestion[] {
    const easy = questions.filter(q => q.difficulty === 'easy');
    const medium = questions.filter(q => q.difficulty === 'medium');
    const hard = questions.filter(q => q.difficulty === 'hard');
    
    const balanced: SpeedQuestion[] = [];
    const maxLength = Math.max(easy.length, medium.length, hard.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (easy[i]) balanced.push(easy[i]);
      if (medium[i]) balanced.push(medium[i]);
      if (hard[i]) balanced.push(hard[i]);
    }
    
    return balanced;
  }
  
  private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[.,!?]/g, '');
    return normalize(userAnswer) === normalize(correctAnswer);
  }
  
  // Mock data methods (실제로는 DB에서 조회)
  
  private async getUserLevel(_userId: string): Promise<number> {
    return 3; // Mock
  }
  
  private async getQuestionsForLevel(level: number): Promise<SpeedQuestion[]> {
    return []; // Mock
  }
  
  private async getQuestionById(questionId: string): Promise<SpeedQuestion> {
    return {
      questionId,
      content: '',
      level: 1,
      stage: 1,
      difficulty: 'medium',
      tags: []
    }; // Mock
  }
  
  private async getCorrectAnswer(questionId: string): Promise<string> {
    const answers: Record<string, string> = {
      'fast-L3-001': 'had',
      'fast-L3-002': 'was',
      'fast-L4-001': 'leverage',
      'exp-L3-001': 'would have acted',
      'exp-L4-001': 'will'
    };
    return answers[questionId] || 'answer';
  }
  
  private async getSession(sessionId: string): Promise<SpeedSession> {
    // Mock session 반환
    return {
      sessionId,
      userId: 'user-1',
      mode: 'fast',
      settings: { timeLimit: 3, showTimer: true, earlyFinishBonus: true, pressureLevel: 'medium' },
      questions: [],
      results: [],
      startTime: new Date(),
      totalScore: 0,
      averageResponseTime: 0
    };
  }
  
  private getQuestionTags(questionId: string): string[] {
    const tags: Record<string, string[]> = {
      'fast-L3-001': ['conditional', 'grammar'],
      'fast-L3-002': ['past-continuous', 'grammar'],
      'fast-L4-001': ['business', 'vocabulary']
    };
    return tags[questionId] || [];
  }
}

export const speedDifficultyService = new SpeedDifficultyService();