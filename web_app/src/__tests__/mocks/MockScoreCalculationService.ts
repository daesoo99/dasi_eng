/**
 * MockScoreCalculationService - 테스트용 점수 계산 서비스 Mock
 * 목적: 실제 알고리즘 없이 점수 계산 로직 테스트
 */

import type { IScoreCalculationService } from '@/container/ServiceContainer';

interface MockQualityResult {
  score: number;
  level: 'excellent' | 'good' | 'average' | 'poor';
  feedback: string;
}

interface MockAnalysisResult {
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  fluency: number;
  overall: number;
  suggestions: string[];
}

export class MockScoreCalculationService implements IScoreCalculationService {
  // Mock 동작을 제어하기 위한 설정
  public mockConfig = {
    shouldFail: false,
    defaultScore: 85,
    defaultLevel: 'good' as const,
    customResults: null as MockQualityResult | null,
    customAnalysis: null as MockAnalysisResult | null,
  };

  // 호출 추적을 위한 스파이 기능
  public calls = {
    calculateQuality: 0,
    getDetailedAnalysis: 0,
    getQualityDescription: 0,
  };

  calculateQuality(input: any): MockQualityResult {
    this.calls.calculateQuality++;
    console.log('[MockScoreService] Calculating quality for:', input);
    
    if (this.mockConfig.shouldFail) {
      throw new Error('Mock: Score calculation failed');
    }

    // 커스텀 결과가 있으면 그것을 사용
    if (this.mockConfig.customResults) {
      return { ...this.mockConfig.customResults };
    }

    // 입력에 따른 기본 점수 계산 시뮬레이션
    const mockScore = this.calculateMockScore(input);
    const mockLevel = this.getMockLevel(mockScore);

    return {
      score: mockScore,
      level: mockLevel,
      feedback: `Mock feedback for score ${mockScore}. ${this.getMockFeedback(mockLevel)}`
    };
  }

  getDetailedAnalysis(input: any): MockAnalysisResult {
    this.calls.getDetailedAnalysis++;
    console.log('[MockScoreService] Getting detailed analysis for:', input);
    
    if (this.mockConfig.shouldFail) {
      throw new Error('Mock: Analysis failed');
    }

    // 커스텀 분석이 있으면 그것을 사용
    if (this.mockConfig.customAnalysis) {
      return { ...this.mockConfig.customAnalysis };
    }

    // 기본 분석 결과 생성
    const baseScore = this.calculateMockScore(input);
    const variation = Math.random() * 20 - 10; // -10 to +10 variation

    return {
      grammar: Math.max(0, Math.min(100, baseScore + variation)),
      vocabulary: Math.max(0, Math.min(100, baseScore + variation * 0.8)),
      pronunciation: Math.max(0, Math.min(100, baseScore + variation * 1.2)),
      fluency: Math.max(0, Math.min(100, baseScore + variation * 0.9)),
      overall: baseScore,
      suggestions: this.getMockSuggestions(baseScore),
    };
  }

  getQualityDescription(quality: any): string {
    this.calls.getQualityDescription++;
    console.log('[MockScoreService] Getting quality description for:', quality);
    
    if (typeof quality === 'object' && quality.level) {
      return this.getMockDescription(quality.level);
    }
    
    if (typeof quality === 'number') {
      const level = this.getMockLevel(quality);
      return this.getMockDescription(level);
    }

    return 'Mock: Unable to determine quality description';
  }

  // Mock 헬퍼 메서드들
  private calculateMockScore(input: any): number {
    // 입력이 없으면 기본값
    if (!input) {
      return this.mockConfig.defaultScore;
    }

    // 문자열 길이 기반 간단한 점수 계산
    if (typeof input === 'string') {
      const length = input.length;
      if (length < 5) return 30;
      if (length < 15) return 60;
      if (length < 30) return 80;
      return 90;
    }

    // 객체에서 점수 관련 필드 찾기
    if (typeof input === 'object') {
      if (input.expectedAnswer && input.userAnswer) {
        const similarity = this.calculateSimilarity(input.expectedAnswer, input.userAnswer);
        return Math.round(similarity * 100);
      }
      
      if (input.confidence && typeof input.confidence === 'number') {
        return Math.round(input.confidence * 100);
      }
    }

    return this.mockConfig.defaultScore;
  }

  private calculateSimilarity(expected: string, actual: string): number {
    // 매우 간단한 유사도 계산 (실제로는 더 복잡한 알고리즘 사용)
    const expectedWords = expected.toLowerCase().split(' ');
    const actualWords = actual.toLowerCase().split(' ');
    
    let matchCount = 0;
    expectedWords.forEach(word => {
      if (actualWords.includes(word)) {
        matchCount++;
      }
    });

    return expectedWords.length > 0 ? matchCount / expectedWords.length : 0;
  }

  private getMockLevel(score: number): MockQualityResult['level'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  }

  private getMockFeedback(level: MockQualityResult['level']): string {
    const feedbackMap = {
      excellent: 'Outstanding performance! Keep up the excellent work.',
      good: 'Good job! There are some areas for improvement.',
      average: 'Average performance. Focus on practicing more.',
      poor: 'Needs significant improvement. Consider reviewing the basics.',
    };

    return feedbackMap[level];
  }

  private getMockDescription(level: MockQualityResult['level']): string {
    const descriptionMap = {
      excellent: 'Excellent quality with outstanding accuracy and fluency',
      good: 'Good quality with minor areas for improvement',
      average: 'Average quality with room for enhancement',
      poor: 'Below average quality requiring significant improvement',
    };

    return descriptionMap[level];
  }

  private getMockSuggestions(score: number): string[] {
    if (score >= 90) {
      return [
        'Continue practicing to maintain your excellent level',
        'Consider helping others to reinforce your skills',
      ];
    }
    
    if (score >= 75) {
      return [
        'Focus on pronunciation for better clarity',
        'Expand your vocabulary with more advanced words',
        'Practice speaking at a natural pace',
      ];
    }
    
    if (score >= 60) {
      return [
        'Work on basic grammar structures',
        'Practice common vocabulary words',
        'Speak more slowly for better accuracy',
        'Listen to native speakers more often',
      ];
    }
    
    return [
      'Start with basic vocabulary and phrases',
      'Practice pronunciation of individual sounds',
      'Review fundamental grammar rules',
      'Use language learning apps for daily practice',
    ];
  }

  // 테스트 유틸리티 메서드들
  public reset(): void {
    console.log('[MockScoreService] Resetting mock state');
    
    this.calls = {
      calculateQuality: 0,
      getDetailedAnalysis: 0,
      getQualityDescription: 0,
    };

    this.mockConfig = {
      shouldFail: false,
      defaultScore: 85,
      defaultLevel: 'good',
      customResults: null,
      customAnalysis: null,
    };
  }

  public getCallCount(method: keyof typeof this.calls): number {
    return this.calls[method];
  }

  public expectCalled(method: keyof typeof this.calls, times: number = 1): boolean {
    return this.calls[method] === times;
  }

  public setCustomResult(result: MockQualityResult): void {
    this.mockConfig.customResults = result;
  }

  public setCustomAnalysis(analysis: MockAnalysisResult): void {
    this.mockConfig.customAnalysis = analysis;
  }

  public simulateFailure(): void {
    this.mockConfig.shouldFail = true;
  }

  public setDefaultScore(score: number): void {
    this.mockConfig.defaultScore = score;
  }
}