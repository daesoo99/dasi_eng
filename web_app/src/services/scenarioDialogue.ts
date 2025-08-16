// 시나리오 기반 대화 모드 서비스
import { api } from '../lib/api';

export interface DialogueTurn {
  id: string;
  turnNumber: number;
  speaker: 'user' | 'ai';
  text_kr: string;
  text_en: string;
  context?: string;
  options?: string[];
  expectedResponse?: string;
  grammarFocus?: string[];
  vocabularyFocus?: string[];
}

export interface DialogueScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  totalTurns: number;
  context: string;
  objective: string;
  turns: DialogueTurn[];
  completionCriteria: {
    minTurns: number;
    maxTurns: number;
    requiredTopics: string[];
  };
}

export interface DialogueSession {
  sessionId: string;
  scenarioId: string;
  userId: string;
  startedAt: Date;
  currentTurn: number;
  userTurns: Array<{
    turnNumber: number;
    userInput: string;
    aiResponse: string;
    feedback?: string;
    score?: number;
    timestamp: Date;
  }>;
  isCompleted: boolean;
  finalScore?: number;
  summary?: string;
}

export interface ScenarioCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  scenarios: DialogueScenario[];
}

class ScenarioDialogueService {
  private readonly API_BASE = '/api/scenario';

  // 시나리오 카테고리 목록 조회
  async getScenarioCategories(): Promise<ScenarioCategory[]> {
    try {
      const response = await api.get(`${this.API_BASE}/categories`);
      return response.data.categories;
    } catch (error) {
      console.error('Failed to get scenario categories:', error);
      return this.getMockCategories();
    }
  }

  // 특정 카테고리의 시나리오들 조회
  async getScenariosByCategory(categoryId: string): Promise<DialogueScenario[]> {
    try {
      const response = await api.get(`${this.API_BASE}/category/${categoryId}`);
      return response.data.scenarios;
    } catch (error) {
      console.error('Failed to get scenarios by category:', error);
      return this.getMockScenarios(categoryId);
    }
  }

  // 시나리오 상세 정보 조회
  async getScenarioDetails(scenarioId: string): Promise<DialogueScenario> {
    try {
      const response = await api.get(`${this.API_BASE}/scenario/${scenarioId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scenario details:', error);
      return this.getMockScenarioDetails(scenarioId);
    }
  }

  // 대화 세션 시작
  async startDialogueSession(userId: string, scenarioId: string): Promise<DialogueSession> {
    try {
      const response = await api.post(`${this.API_BASE}/session/start`, {
        userId,
        scenarioId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to start dialogue session:', error);
      return this.createMockSession(userId, scenarioId);
    }
  }

  // 사용자 응답 처리 및 AI 응답 생성
  async processUserTurn(sessionId: string, userInput: string): Promise<{
    aiResponse: string;
    feedback?: string;
    score: number;
    isCompleted: boolean;
    nextTurn?: DialogueTurn;
  }> {
    try {
      const response = await api.post(`${this.API_BASE}/session/${sessionId}/turn`, {
        userInput
      });
      return response.data;
    } catch (error) {
      console.error('Failed to process user turn:', error);
      return this.getMockTurnResponse(userInput);
    }
  }

  // 대화 세션 완료
  async completeDialogueSession(sessionId: string): Promise<{
    finalScore: number;
    summary: string;
    achievements: string[];
    recommendations: string[];
  }> {
    try {
      const response = await api.post(`${this.API_BASE}/session/${sessionId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Failed to complete dialogue session:', error);
      return this.getMockSessionSummary();
    }
  }

  // 사용자 대화 기록 조회
  async getUserDialogueHistory(userId: string): Promise<DialogueSession[]> {
    try {
      const response = await api.get(`${this.API_BASE}/user/${userId}/history`);
      return response.data.sessions;
    } catch (error) {
      console.error('Failed to get user dialogue history:', error);
      return [];
    }
  }

  // Mock Data Methods
  private getMockCategories(): ScenarioCategory[] {
    return [
      {
        id: 'daily-life',
        name: '일상 대화',
        description: '일상생활에서 자주 발생하는 대화 상황',
        icon: '🏠',
        scenarios: this.getMockScenarios('daily-life')
      },
      {
        id: 'business',
        name: '비즈니스',
        description: '업무 환경에서의 전문적인 대화',
        icon: '💼',
        scenarios: this.getMockScenarios('business')
      },
      {
        id: 'travel',
        name: '여행',
        description: '여행 중 마주치는 다양한 상황',
        icon: '✈️',
        scenarios: this.getMockScenarios('travel')
      },
      {
        id: 'social',
        name: '사교 모임',
        description: '파티, 모임에서의 사교적 대화',
        icon: '🎉',
        scenarios: this.getMockScenarios('social')
      },
      {
        id: 'academic',
        name: '학술/교육',
        description: '학교, 대학, 학회에서의 학술적 대화',
        icon: '🎓',
        scenarios: this.getMockScenarios('academic')
      },
      {
        id: 'emergency',
        name: '응급 상황',
        description: '응급 상황에서의 빠르고 정확한 의사소통',
        icon: '🚨',
        scenarios: this.getMockScenarios('emergency')
      }
    ];
  }

  private getMockScenarios(categoryId: string): DialogueScenario[] {
    const scenarios = {
      'daily-life': [
        {
          id: 'dl-restaurant',
          title: '레스토랑에서 주문하기',
          description: '웨이터와의 대화를 통해 음식을 주문하는 상황',
          category: 'daily-life',
          difficulty: 'beginner' as const,
          estimatedTime: 10,
          totalTurns: 8,
          context: '현지 레스토랑에서 저녁 식사를 위해 메뉴를 보고 주문하는 상황',
          objective: '원하는 음식을 성공적으로 주문하고 필요한 정보를 확인하기',
          turns: this.getMockRestaurantTurns(),
          completionCriteria: {
            minTurns: 6,
            maxTurns: 10,
            requiredTopics: ['greeting', 'menu-inquiry', 'ordering', 'payment']
          }
        },
        {
          id: 'dl-shopping',
          title: '쇼핑몰에서 옷 구매하기',
          description: '매장 직원과 대화하며 원하는 옷을 찾고 구매하는 상황',
          category: 'daily-life',
          difficulty: 'intermediate' as const,
          estimatedTime: 12,
          totalTurns: 10,
          context: '백화점에서 특별한 행사를 위한 옷을 찾는 상황',
          objective: '사이즈, 색상, 가격 등을 확인하고 만족스러운 구매하기',
          turns: [],
          completionCriteria: {
            minTurns: 8,
            maxTurns: 12,
            requiredTopics: ['size-inquiry', 'color-preference', 'price-check', 'trying-on']
          }
        }
      ],
      'business': [
        {
          id: 'biz-meeting',
          title: '팀 미팅 진행하기',
          description: '프로젝트 진행 상황을 논의하는 팀 미팅',
          category: 'business',
          difficulty: 'advanced' as const,
          estimatedTime: 15,
          totalTurns: 12,
          context: '새로운 프로젝트의 중간 점검을 위한 팀 미팅',
          objective: '프로젝트 현황 공유, 문제점 논의, 다음 단계 계획 수립',
          turns: [],
          completionCriteria: {
            minTurns: 10,
            maxTurns: 15,
            requiredTopics: ['status-report', 'problem-discussion', 'solution-proposal', 'next-steps']
          }
        }
      ],
      'travel': [
        {
          id: 'tr-airport',
          title: '공항에서 체크인하기',
          description: '국제선 항공편 체크인 및 수하물 처리',
          category: 'travel',
          difficulty: 'intermediate' as const,
          estimatedTime: 10,
          totalTurns: 8,
          context: '해외여행을 위해 공항 체크인 카운터에서 수속을 밟는 상황',
          objective: '체크인 완료, 좌석 선택, 수하물 처리, 탑승권 수령',
          turns: [],
          completionCriteria: {
            minTurns: 6,
            maxTurns: 10,
            requiredTopics: ['check-in', 'seat-selection', 'baggage', 'boarding-pass']
          }
        }
      ]
    };

    return scenarios[categoryId as keyof typeof scenarios] || [];
  }

  private getMockRestaurantTurns(): DialogueTurn[] {
    return [
      {
        id: 'turn-1',
        turnNumber: 1,
        speaker: 'ai',
        text_kr: '안녕하세요! 환영합니다. 메뉴 보실까요?',
        text_en: 'Hello! Welcome. Would you like to see the menu?',
        context: '웨이터가 친근하게 인사하며 메뉴를 권한다',
        options: [
          'Yes, please.',
          'What do you recommend?',
          'I need a few more minutes.'
        ]
      },
      {
        id: 'turn-2',
        turnNumber: 2,
        speaker: 'user',
        text_kr: '네, 메뉴를 보여주세요.',
        text_en: 'Yes, please show me the menu.',
        expectedResponse: 'Yes, please',
        grammarFocus: ['polite-requests'],
        vocabularyFocus: ['restaurant-vocabulary']
      },
      {
        id: 'turn-3',
        turnNumber: 3,
        speaker: 'ai',
        text_kr: '오늘의 특선 요리는 연어 스테이크입니다. 추천해드려요!',
        text_en: 'Today\'s special is salmon steak. I highly recommend it!',
        context: '웨이터가 오늘의 특선을 추천한다'
      },
      {
        id: 'turn-4',
        turnNumber: 4,
        speaker: 'user',
        text_kr: '연어 스테이크가 얼마나 매운가요?',
        text_en: 'How spicy is the salmon steak?',
        expectedResponse: 'How spicy is the salmon steak?',
        grammarFocus: ['question-formation', 'degree-adverbs'],
        vocabularyFocus: ['food-descriptions', 'taste-vocabulary']
      }
    ];
  }

  private getMockScenarioDetails(scenarioId: string): DialogueScenario {
    const scenarios = this.getMockCategories();
    for (const category of scenarios) {
      const scenario = category.scenarios.find(s => s.id === scenarioId);
      if (scenario) return scenario;
    }
    
    // Fallback
    return {
      id: scenarioId,
      title: 'Sample Scenario',
      description: 'A sample dialogue scenario',
      category: 'daily-life',
      difficulty: 'intermediate',
      estimatedTime: 10,
      totalTurns: 8,
      context: 'Sample context',
      objective: 'Complete the conversation',
      turns: [],
      completionCriteria: {
        minTurns: 5,
        maxTurns: 10,
        requiredTopics: ['greeting', 'conversation', 'closing']
      }
    };
  }

  private createMockSession(userId: string, scenarioId: string): DialogueSession {
    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scenarioId,
      userId,
      startedAt: new Date(),
      currentTurn: 0,
      userTurns: [],
      isCompleted: false
    };
  }

  private getMockTurnResponse(userInput: string): {
    aiResponse: string;
    feedback?: string;
    score: number;
    isCompleted: boolean;
    nextTurn?: DialogueTurn;
  } {
    return {
      aiResponse: 'Thank you for your response. Let me help you with the next part of our conversation.',
      feedback: 'Great job! Your grammar and vocabulary usage were very natural.',
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      isCompleted: false,
      nextTurn: {
        id: 'next-turn',
        turnNumber: 2,
        speaker: 'ai',
        text_kr: '다음 단계로 넘어가겠습니다.',
        text_en: 'Let\'s move on to the next step.',
        context: 'Continuing the conversation'
      }
    };
  }

  private getMockSessionSummary() {
    return {
      finalScore: 85,
      summary: '훌륭한 대화 실력을 보여주셨습니다! 자연스러운 표현과 적절한 문법 사용이 인상적이었습니다.',
      achievements: [
        '완벽한 인사말 구사',
        '자연스러운 질문 형성',
        '적절한 어휘 선택',
        '대화 흐름 유지'
      ],
      recommendations: [
        '좀 더 다양한 접속사 사용하기',
        '감정 표현 어휘 늘리기',
        '복문 구조 연습하기'
      ]
    };
  }
}

export const scenarioDialogueService = new ScenarioDialogueService();