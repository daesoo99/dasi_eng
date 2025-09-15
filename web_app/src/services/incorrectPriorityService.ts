// 오답 우선 알고리즘 - 최근 3일 틀린 문장 가중 재출제

interface IncorrectRecord {
  sentenceId: string;
  userId: string;
  level: number;
  stage: number;
  stageId: string;
  incorrectCount: number;
  lastIncorrectDate: Date;
  recentMistakes: Array<{
    timestamp: Date;
    mistakeType: 'grammar' | 'vocabulary' | 'spelling' | 'structure';
    userAnswer: string;
    correctAnswer: string;
  }>;
  weight: number; // 우선순위 가중치
}

interface PrioritySession {
  totalSentences: number;
  incorrectPrioritySentences: string[];
  regularSentences: string[];
  sessionType: 'incorrect_focus' | 'mixed' | 'regular';
}

class IncorrectPriorityService {
  
  /**
   * 오답 우선 복습 세션 생성
   */
  async createIncorrectPrioritySession(
    userId: string, 
    totalSentences: number = 30,
    incorrectRatio: number = 0.7 // 70%는 오답 문장, 30%는 일반 문장
  ): Promise<PrioritySession> {
    
    try {
      // 최근 3일 오답 문장들 조회
      const incorrectSentences = await this.getRecentIncorrectSentences(userId, 3);
      
      // 오답 문장 개수 계산
      const maxIncorrectCount = Math.floor(totalSentences * incorrectRatio);
      const actualIncorrectCount = Math.min(incorrectSentences.length, maxIncorrectCount);
      
      // 세션 타입 결정
      let sessionType: 'incorrect_focus' | 'mixed' | 'regular';
      if (incorrectSentences.length === 0) {
        sessionType = 'regular';
      } else if (actualIncorrectCount >= totalSentences * 0.5) {
        sessionType = 'incorrect_focus';
      } else {
        sessionType = 'mixed';
      }
      
      // 우선순위 기반 오답 문장 선택
      const prioritizedIncorrect = this.selectPriorityIncorrectSentences(
        incorrectSentences, 
        actualIncorrectCount
      );
      
      // 나머지는 일반 문장으로 채우기
      const remainingCount = totalSentences - prioritizedIncorrect.length;
      const regularSentences = await this.getRegularSentences(userId, remainingCount, prioritizedIncorrect);
      
      return {
        totalSentences,
        incorrectPrioritySentences: prioritizedIncorrect,
        regularSentences,
        sessionType
      };
      
    } catch (error) {
      console.error('오답 우선 세션 생성 실패:', error);
      throw error;
    }
  }
  
  /**
   * 최근 3일 내 틀린 문장들 조회 (가중치 포함)
   */
  async getRecentIncorrectSentences(userId: string, days: number = 3): Promise<IncorrectRecord[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // 실제로는 Firestore에서 조회
      // 임시 데이터로 시뮬레이션
      const mockIncorrectRecords: IncorrectRecord[] = [
        {
          sentenceId: 'Lv3-P2-S09_15',
          userId,
          level: 3,
          stage: 9,
          stageId: 'Lv3-P2-S09',
          incorrectCount: 3,
          lastIncorrectDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
          recentMistakes: [
            {
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              mistakeType: 'grammar',
              userAnswer: 'If I would have time',
              correctAnswer: 'If I had time'
            }
          ],
          weight: 0
        },
        {
          sentenceId: 'Lv4-B1-S02_08',
          userId,
          level: 4,
          stage: 2,
          stageId: 'Lv4-B1-S02',
          incorrectCount: 2,
          lastIncorrectDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
          recentMistakes: [
            {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              mistakeType: 'vocabulary',
              userAnswer: 'We must optimize our strategy',
              correctAnswer: 'We need to leverage our strategy'
            }
          ],
          weight: 0
        }
      ];
      
      // 가중치 계산
      return mockIncorrectRecords.map(record => ({
        ...record,
        weight: this.calculatePriorityWeight(record, cutoffDate)
      }));
      
    } catch (error) {
      console.error('최근 오답 문장 조회 실패:', error);
      return [];
    }
  }
  
  /**
   * 우선순위 가중치 계산
   */
  private calculatePriorityWeight(record: IncorrectRecord, cutoffDate: Date): number {
    const now = new Date();
    const daysSinceLastMistake = Math.floor(
      (now.getTime() - record.lastIncorrectDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    // 기본 가중치 (틀린 횟수 기반)
    let weight = record.incorrectCount * 1.0;
    
    // 최근성 가중치 (최근일수록 높은 가중치)
    const recencyMultiplier = Math.max(0.1, 1.0 - (daysSinceLastMistake * 0.2));
    weight *= recencyMultiplier;
    
    // 최근 3일 내 실수 빈도 가중치
    const recentMistakeCount = record.recentMistakes.filter(
      mistake => mistake.timestamp >= cutoffDate
    ).length;
    weight += recentMistakeCount * 0.5;
    
    // 실수 유형별 가중치
    const grammarMistakes = record.recentMistakes.filter(m => m.mistakeType === 'grammar').length;
    const vocabularyMistakes = record.recentMistakes.filter(m => m.mistakeType === 'vocabulary').length;
    
    if (grammarMistakes > 0) weight += 0.3; // 문법 실수는 더 중요
    if (vocabularyMistakes > 0) weight += 0.2; // 어휘 실수
    
    return Math.min(10.0, weight); // 최대 가중치 제한
  }
  
  /**
   * 우선순위 기반 오답 문장 선택
   */
  private selectPriorityIncorrectSentences(
    incorrectRecords: IncorrectRecord[], 
    maxCount: number
  ): string[] {
    
    // 가중치 기준으로 정렬
    const sortedRecords = incorrectRecords
      .filter(record => record.weight > 0.5) // 최소 가중치 이상만
      .sort((a, b) => b.weight - a.weight) // 가중치 높은 순
      .slice(0, maxCount);
    
    return sortedRecords.map(record => record.sentenceId);
  }
  
  /**
   * 일반 문장 선택 (오답 문장 제외)
   */
  private async getRegularSentences(
    userId: string, 
    count: number, 
    excludeSentenceIds: string[]
  ): Promise<string[]> {
    
    try {
      // 사용자 레벨에 맞는 문장들 조회 (오답 문장 제외)
      // 실제로는 Firestore에서 조회하고 excludeSentenceIds를 제외
      
      // 임시 데이터
      const allSentences = [
        'Lv3-P1-S01_01', 'Lv3-P1-S01_02', 'Lv3-P1-S01_03',
        'Lv4-B1-S01_01', 'Lv4-B1-S01_02', 'Lv4-B1-S01_03',
        'Lv5-A1-S01_01', 'Lv5-A1-S01_02', 'Lv5-A1-S01_03'
      ];
      
      const availableSentences = allSentences.filter(
        id => !excludeSentenceIds.includes(id)
      );
      
      // 랜덤하게 선택
      const shuffled = availableSentences.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
      
    } catch (error) {
      console.error('일반 문장 선택 실패:', error);
      return [];
    }
  }
  
  /**
   * 오답 기록 업데이트
   */
  async recordIncorrectAnswer(
    userId: string,
    sentenceId: string,
    userAnswer: string,
    correctAnswer: string,
    mistakeType: 'grammar' | 'vocabulary' | 'spelling' | 'structure'
  ): Promise<void> {
    
    try {
      // 기존 오답 기록 조회
      const existingRecord = await this.getIncorrectRecord(userId, sentenceId);
      
      const newMistake = {
        timestamp: new Date(),
        mistakeType,
        userAnswer,
        correctAnswer
      };
      
      const updatedRecord: IncorrectRecord = {
        ...existingRecord,
        incorrectCount: existingRecord.incorrectCount + 1,
        lastIncorrectDate: new Date(),
        recentMistakes: [
          ...existingRecord.recentMistakes,
          newMistake
        ].slice(-10) // 최근 10개만 유지
      };
      
      // 가중치 재계산
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      updatedRecord.weight = this.calculatePriorityWeight(updatedRecord, threeDaysAgo);
      
      // Firestore에 저장
      await this.saveIncorrectRecord(updatedRecord);
      
    } catch (error) {
      console.error('오답 기록 업데이트 실패:', error);
      throw error;
    }
  }
  
  /**
   * 오답 통계 조회
   */
  async getIncorrectStatistics(userId: string): Promise<{
    totalIncorrectSentences: number;
    recentIncorrectCount: number;
    mostCommonMistakeType: string;
    improvementRate: number;
    weakLevels: number[];
  }> {
    
    try {
      const allIncorrectRecords = await this.getAllIncorrectRecords(userId);
      const recentRecords = await this.getRecentIncorrectSentences(userId, 7); // 최근 7일
      
      // 실수 유형 분석
      const mistakeTypes = allIncorrectRecords.flatMap(record => 
        record.recentMistakes.map(mistake => mistake.mistakeType)
      );
      
      const mistakeTypeCounts = mistakeTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonMistakeType = Object.entries(mistakeTypeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
      
      // 취약 레벨 분석
      const levelCounts = allIncorrectRecords.reduce((acc, record) => {
        acc[record.level] = (acc[record.level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const weakLevels = Object.entries(levelCounts)
        .filter(([, count]) => count >= 3) // 3개 이상 틀린 레벨
        .map(([level]) => parseInt(level))
        .sort((a, b) => levelCounts[b] - levelCounts[a]);
      
      // 개선율 계산 (최근 2주 대비 이전 2주)
      const improvementRate = await this.calculateImprovementRate(userId);
      
      return {
        totalIncorrectSentences: allIncorrectRecords.length,
        recentIncorrectCount: recentRecords.length,
        mostCommonMistakeType,
        improvementRate,
        weakLevels
      };
      
    } catch (error) {
      console.error('오답 통계 조회 실패:', error);
      return {
        totalIncorrectSentences: 0,
        recentIncorrectCount: 0,
        mostCommonMistakeType: 'none',
        improvementRate: 0,
        weakLevels: []
      };
    }
  }
  
  // Private helper methods
  private async getIncorrectRecord(userId: string, sentenceId: string): Promise<IncorrectRecord> {
    // 기본값 반환 (실제로는 Firestore에서 조회)
    return {
      sentenceId,
      userId,
      level: 1,
      stage: 1,
      stageId: '',
      incorrectCount: 0,
      lastIncorrectDate: new Date(),
      recentMistakes: [],
      weight: 0
    };
  }
  
  private async saveIncorrectRecord(record: IncorrectRecord): Promise<void> {
    // Firestore에 저장
  }
  
  private async getAllIncorrectRecords(_userId: string): Promise<IncorrectRecord[]> {
    // 모든 오답 기록 조회
    return [];
  }
  
  private async calculateImprovementRate(_userId: string): Promise<number> {
    // 개선율 계산 (임시값)
    return 0.15; // 15% 개선
  }
}

export const incorrectPriorityService = new IncorrectPriorityService();