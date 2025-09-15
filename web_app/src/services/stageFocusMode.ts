// Stage 집중 모드 - 정밀 연습 서비스

export type SpeedLevel = 'slow' | 'medium' | 'fast';
export type RepeatCount = 5 | 6 | 7 | 8;

export interface StageFocusSettings {
  level: number;
  stage: number;
  speedLevel: SpeedLevel; // 3초/2초/1초
  repeatCount: RepeatCount; // 5-8문장
  immediateCorrection: boolean; // 오답 시 즉시 정답 표시
  autoPlayCorrectAnswer: boolean; // 정답 자동 발화
  shuffleQuestions: boolean; // 문장 순서 섞기
}

export interface StageFocusQuestion {
  id: string;
  front_ko: string;
  target_en: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  repeatIndex: number; // 몇 번째 반복인지 (1-8)
}

export interface StageFocusResult {
  questionId: string;
  repeatIndex: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  needsReview: boolean; // 추가 연습 필요 여부
}

export interface StageFocusSession {
  sessionId: string;
  userId: string;
  settings: StageFocusSettings;
  questions: StageFocusQuestion[];
  results: StageFocusResult[];
  startTime: Date;
  endTime?: Date;
  totalAttempts: number;
  correctAttempts: number;
  averageResponseTime: number;
  masteredQuestions: string[]; // 마스터한 문장들
  needsReviewQuestions: string[]; // 추가 연습이 필요한 문장들
}

class StageFocusService {
  
  /**
   * Stage 집중 모드 세션 생성
   */
  async createStageFocusSession(
    userId: string,
    settings: StageFocusSettings
  ): Promise<StageFocusSession> {
    
    try {
      // 해당 스테이지의 문장들 조회
      const originalQuestions = await this.getStageQuestions(settings.level, settings.stage);
      
      // repeatCount만큼 문장 선택 (랜덤 또는 순서대로)
      const selectedQuestions = this.selectQuestionsForPractice(originalQuestions, settings.repeatCount);
      
      // 반복 학습을 위한 질문 생성 (각 문장을 여러 번 반복)
      const practiceQuestions = this.generatePracticeQuestions(selectedQuestions, settings);
      
      const session: StageFocusSession = {
        sessionId: `stage-focus-${Date.now()}-${userId}`,
        userId,
        settings,
        questions: practiceQuestions,
        results: [],
        startTime: new Date(),
        totalAttempts: 0,
        correctAttempts: 0,
        averageResponseTime: 0,
        masteredQuestions: [],
        needsReviewQuestions: []
      };
      
      return session;
      
    } catch (error) {
      console.error('Stage 집중 모드 세션 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 특정 스테이지의 문장들 조회
   */
  private async getStageQuestions(level: number, stage: number): Promise<any[]> {
    // 실제로는 Firestore나 API에서 조회
    // 임시 데이터
    const mockQuestions = [
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_01`,
        front_ko: '내일 비가 올 것 같습니다.',
        target_en: "It's going to rain tomorrow.",
        difficulty: 'medium',
        tags: ['future', 'weather']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_02`,
        front_ko: '다음 주에 여행을 갈 예정입니다.',
        target_en: "I'm going to travel next week.",
        difficulty: 'medium',
        tags: ['future', 'travel']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_03`,
        front_ko: '언젠가는 성공할 것입니다.',
        target_en: 'I will succeed someday.',
        difficulty: 'hard',
        tags: ['future', 'motivation']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_04`,
        front_ko: '오늘 저녁에 친구를 만날 거예요.',
        target_en: "I'm meeting a friend tonight.",
        difficulty: 'easy',
        tags: ['future', 'social']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_05`,
        front_ko: '그 일은 쉽지 않을 것입니다.',
        target_en: "It won't be easy.",
        difficulty: 'medium',
        tags: ['future', 'difficulty']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_06`,
        front_ko: '계획을 바꿀 생각입니다.',
        target_en: "I'm going to change the plan.",
        difficulty: 'medium',
        tags: ['future', 'planning']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_07`,
        front_ko: '회의는 언제 시작할 예정인가요?',
        target_en: 'When is the meeting going to start?',
        difficulty: 'hard',
        tags: ['future', 'question', 'business']
      },
      {
        id: `Lv${level}-P1-S${stage.toString().padStart(2, '0')}_08`,
        front_ko: '그들은 곧 도착할 것입니다.',
        target_en: 'They will arrive soon.',
        difficulty: 'easy',
        tags: ['future', 'arrival']
      }
    ];
    
    return mockQuestions;
  }
  
  /**
   * 연습할 문장들 선택
   */
  private selectQuestionsForPractice(questions: any[], count: RepeatCount): any[] {
    if (questions.length <= count) {
      return questions;
    }
    
    // 난이도별 균형 선택 (쉬움:보통:어려움 = 2:3:3 비율)
    const easy = questions.filter(q => q.difficulty === 'easy');
    const medium = questions.filter(q => q.difficulty === 'medium');
    const hard = questions.filter(q => q.difficulty === 'hard');
    
    const selected = [];
    const targetEasy = Math.min(Math.floor(count * 0.25), easy.length);
    const targetMedium = Math.min(Math.floor(count * 0.4), medium.length);
    const targetHard = Math.min(count - targetEasy - targetMedium, hard.length);
    
    // 랜덤 선택
    selected.push(...this.shuffleArray(easy).slice(0, targetEasy));
    selected.push(...this.shuffleArray(medium).slice(0, targetMedium));
    selected.push(...this.shuffleArray(hard).slice(0, targetHard));
    
    // 부족한 만큼 나머지에서 채우기
    const remaining = count - selected.length;
    if (remaining > 0) {
      const allRemaining = questions.filter(q => !selected.includes(q));
      selected.push(...this.shuffleArray(allRemaining).slice(0, remaining));
    }
    
    return selected.slice(0, count);
  }
  
  /**
   * 반복 학습용 질문 생성
   */
  private generatePracticeQuestions(
    selectedQuestions: any[], 
    settings: StageFocusSettings
  ): StageFocusQuestion[] {
    
    const practiceQuestions: StageFocusQuestion[] = [];
    
    // 각 문장을 2-3번 반복하여 총 연습량 확보
    const repetitionsPerQuestion = Math.ceil(15 / selectedQuestions.length); // 총 15번 정도 연습
    
    for (let repeat = 1; repeat <= repetitionsPerQuestion; repeat++) {
      for (const question of selectedQuestions) {
        practiceQuestions.push({
          id: question.id,
          front_ko: question.front_ko,
          target_en: question.target_en,
          difficulty: question.difficulty,
          tags: question.tags,
          repeatIndex: repeat
        });
      }
    }
    
    // 설정에 따라 섞기
    if (settings.shuffleQuestions) {
      return this.shuffleArray(practiceQuestions);
    }
    
    return practiceQuestions;
  }
  
  /**
   * 답변 처리 및 즉시 피드백
   */
  async processAnswer(
    sessionId: string,
    question: StageFocusQuestion,
    userAnswer: string,
    responseTime: number
  ): Promise<{
    result: StageFocusResult;
    feedback: {
      isCorrect: boolean;
      correctAnswer: string;
      shouldPlayAudio: boolean;
      encouragement: string;
      needsRetry: boolean;
    };
  }> {
    
    try {
      const isCorrect = this.validateAnswer(userAnswer, question.target_en);
      
      const result: StageFocusResult = {
        questionId: question.id,
        repeatIndex: question.repeatIndex,
        userAnswer,
        correctAnswer: question.target_en,
        isCorrect,
        responseTime,
        needsReview: !isCorrect || responseTime > this.getTargetTime(question.difficulty)
      };
      
      // 즉시 피드백 생성
      const feedback = {
        isCorrect,
        correctAnswer: question.target_en,
        shouldPlayAudio: !isCorrect, // 틀렸을 때만 정답 발화
        encouragement: this.generateEncouragement(isCorrect, question.repeatIndex),
        needsRetry: !isCorrect && question.repeatIndex <= 2 // 초기 반복에서 틀리면 재시도
      };
      
      return { result, feedback };
      
    } catch (error) {
      console.error('답변 처리 실패:', error);
      throw error;
    }
  }
  
  /**
   * 세션 완료 및 마스터 분석
   */
  async completeSession(sessionId: string): Promise<{
    totalAccuracy: number;
    averageResponseTime: number;
    masteredQuestions: string[];
    needsReviewQuestions: string[];
    improvementAreas: string[];
    nextStageRecommendation: string;
    practiceEffectiveness: 'excellent' | 'good' | 'needs_work';
  }> {
    
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new Error('세션을 찾을 수 없습니다');
      }
      
      const totalAttempts = session.results.length;
      const correctAttempts = session.results.filter(r => r.isCorrect).length;
      const totalAccuracy = (correctAttempts / totalAttempts) * 100;
      
      const averageResponseTime = session.results.reduce((sum, r) => sum + r.responseTime, 0) / totalAttempts;
      
      // 문장별 마스터 여부 분석
      const questionResults = this.groupResultsByQuestion(session.results);
      const masteredQuestions: string[] = [];
      const needsReviewQuestions: string[] = [];
      
      Object.entries(questionResults).forEach(([questionId, results]) => {
        const accuracy = results.filter(r => r.isCorrect).length / results.length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        if (accuracy >= 0.8 && avgResponseTime <= this.getTargetTime('medium')) {
          masteredQuestions.push(questionId);
        } else {
          needsReviewQuestions.push(questionId);
        }
      });
      
      // 개선 영역 분석
      const incorrectResults = session.results.filter(r => !r.isCorrect);
      const improvementTags = this.analyzeIncorrectPatterns(incorrectResults);
      
      // 연습 효과성 평가
      let practiceEffectiveness: 'excellent' | 'good' | 'needs_work';
      if (totalAccuracy >= 85 && averageResponseTime <= 4000) {
        practiceEffectiveness = 'excellent';
      } else if (totalAccuracy >= 70 && averageResponseTime <= 6000) {
        practiceEffectiveness = 'good';
      } else {
        practiceEffectiveness = 'needs_work';
      }
      
      // 다음 추천
      const nextStageRecommendation = this.generateNextRecommendation(
        session.settings,
        practiceEffectiveness,
        masteredQuestions.length
      );
      
      return {
        totalAccuracy,
        averageResponseTime,
        masteredQuestions,
        needsReviewQuestions,
        improvementAreas: improvementTags,
        nextStageRecommendation,
        practiceEffectiveness
      };
      
    } catch (error) {
      console.error('세션 완료 처리 실패:', error);
      throw error;
    }
  }
  
  /**
   * 사용 가능한 스테이지 목록 조회
   */
  async getAvailableStages(level: number): Promise<{
    stages: Array<{
      stage: number;
      title: string;
      difficulty: string;
      questionCount: number;
      completed: boolean;
      lastPracticed?: Date;
    }>;
    totalStages: number;
  }> {
    
    try {
      // 실제로는 Firestore에서 조회
      // Level 3 기준 임시 데이터
      const stages = Array.from({ length: 30 }, (_, i) => ({
        stage: i + 1,
        title: `Stage ${i + 1} - ${this.getStageTitle(level, i + 1)}`,
        difficulty: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard',
        questionCount: Math.floor(Math.random() * 20) + 30, // 30-50개
        completed: Math.random() > 0.3, // 70% 완료
        lastPracticed: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
      }));
      
      return {
        stages,
        totalStages: stages.length
      };
      
    } catch (error) {
      console.error('스테이지 목록 조회 실패:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[.,!?]/g, '');
    return normalize(userAnswer) === normalize(correctAnswer);
  }
  
  private getTargetTime(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy': return 3000;
      case 'medium': return 4000;
      case 'hard': return 6000;
      default: return 4000;
    }
  }
  
  private generateEncouragement(isCorrect: boolean, _repeatIndex: number): string {
    if (isCorrect) {
      const positive = [
        '정확합니다! 👏',
        '완벽해요! ✨',
        '훌륭합니다! 🎉',
        '잘하고 있어요! 💪',
        '좋습니다! 👍'
      ];
      return positive[Math.floor(Math.random() * positive.length)];
    } else {
      const encouraging = [
        '다시 한번 시도해보세요! 💪',
        '거의 다 왔어요! 🎯',
        '조금 더 연습하면 됩니다! 📚',
        '포기하지 마세요! 🌟',
        '다음번엔 더 잘할 거예요! 🚀'
      ];
      return encouraging[Math.floor(Math.random() * encouraging.length)];
    }
  }
  
  private groupResultsByQuestion(results: StageFocusResult[]): Record<string, StageFocusResult[]> {
    return results.reduce((groups, result) => {
      if (!groups[result.questionId]) {
        groups[result.questionId] = [];
      }
      groups[result.questionId].push(result);
      return groups;
    }, {} as Record<string, StageFocusResult[]>);
  }
  
  private analyzeIncorrectPatterns(_incorrectResults: StageFocusResult[]): string[] {
    // 간단한 패턴 분석 (실제로는 더 정교한 AI 분석)
    const patterns = ['future', 'grammar', 'vocabulary', 'structure'];
    return patterns.slice(0, 2); // 임시로 2개 반환
  }
  
  private generateNextRecommendation(
    settings: StageFocusSettings,
    effectiveness: string,
    masteredCount: number
  ): string {
    
    if (effectiveness === 'excellent') {
      return `완벽한 성과입니다! 다음 스테이지(Stage ${settings.stage + 1})로 진행하거나 속도를 높여보세요.`;
    } else if (effectiveness === 'good') {
      return `좋은 결과입니다! 같은 스테이지를 한 번 더 연습하거나 다음 스테이지로 진행하세요.`;
    } else {
      return `더 연습이 필요합니다. 속도를 낮추고 같은 스테이지를 반복 연습해보세요.`;
    }
  }
  
  private getStageTitle(level: number, stage: number): string {
    const titles = [
      'Basic Patterns', 'Future Forms', 'Past Tense', 'Present Perfect',
      'Conditionals', 'Passive Voice', 'Reported Speech', 'Modal Verbs',
      'Relative Clauses', 'Advanced Grammar'
    ];
    return titles[(stage - 1) % titles.length];
  }
  
  private async getSession(sessionId: string): Promise<StageFocusSession | null> {
    // 실제로는 저장된 세션 조회
    return null; // 임시
  }
}

export const stageFocusService = new StageFocusService();