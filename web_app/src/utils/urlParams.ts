import { LevelSystemData, ReviewModeData, QuestionItem } from '@/data/patternData';
import { StorageManager } from '@/hooks/useLocalStorage';

export interface URLParamsData {
  mode: 'normal' | 'review' | 'level';
  levelSystemData?: LevelSystemData;
  reviewModeData?: ReviewModeData;
  developerMode?: boolean;
}

export class URLParamsManager {
  /**
   * Parse URL parameters and determine the mode and data
   */
  static parseURLParams(): URLParamsData {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for review mode first
    if (urlParams.has('reviewMode')) {
      const reviewMode = urlParams.get('reviewMode') as 'single' | 'all' | 'pattern' | 'weak-patterns';
      const reviewIds = urlParams.get('reviewIds')?.split(',') || [];
      const reviewId = urlParams.get('reviewId');
      const patternName = urlParams.get('patternName');
      
      const reviewModeData: ReviewModeData = {
        mode: reviewMode || 'all',
        reviewIds: reviewIds,
        reviewId: reviewId || undefined,
        patternName: patternName || undefined
      };
      
      console.log('복습 모드 활성화:', reviewModeData);
      
      return {
        mode: 'review',
        reviewModeData
      };
    }
    
    // Check for level system mode
    if (urlParams.has('level')) {
      const levelSystemData: LevelSystemData = {
        level: parseInt(urlParams.get('level') || '1'),
        stage: parseInt(urlParams.get('stage') || '1'),
        patternName: urlParams.get('patternName') || undefined,
        currentVerb: urlParams.get('currentVerb') || undefined,
        developerMode: urlParams.get('developerMode') === 'true'
      };
      
      console.log('레벨 시스템에서 전달받은 데이터:', levelSystemData);
      
      return {
        mode: 'level',
        levelSystemData,
        developerMode: levelSystemData.developerMode
      };
    }
    
    // Normal mode (default)
    return {
      mode: 'normal',
      developerMode: urlParams.get('developerMode') === 'true'
    };
  }

  /**
   * Generate review questions based on review mode data
   */
  static loadReviewQuestions(reviewModeData: ReviewModeData): QuestionItem[] {
    const mistakes = StorageManager.getMistakes();
    const reviewQuestions: QuestionItem[] = [];
    
    if (reviewModeData.mode === 'single') {
      // Single question review
      const mistake = mistakes.find(m => m.id === reviewModeData.reviewId);
      if (mistake) {
        reviewQuestions.push({
          korean: mistake.korean,
          english: mistake.english,
          pattern: mistake.pattern,
          verb: mistake.verb,
          level: mistake.level,
          stage: mistake.stage,
          mistakeId: mistake.id
        } as QuestionItem & { mistakeId: string });
      }
    } else if (reviewModeData.mode === 'all') {
      // All due reviews
      const now = Date.now();
      const dueReviews = mistakes.filter(m => !m.mastered && m.nextReview <= now);
      
      dueReviews.forEach(mistake => {
        reviewQuestions.push({
          korean: mistake.korean,
          english: mistake.english,
          pattern: mistake.pattern,
          verb: mistake.verb,
          level: mistake.level,
          stage: mistake.stage,
          mistakeId: mistake.id
        } as QuestionItem & { mistakeId: string });
      });
    } else if (reviewModeData.mode === 'pattern' && reviewModeData.patternName) {
      // Pattern-specific reviews
      const now = Date.now();
      const patternReviews = mistakes.filter(m => 
        !m.mastered && 
        m.nextReview <= now && 
        m.pattern === reviewModeData.patternName
      );
      
      patternReviews.forEach(mistake => {
        reviewQuestions.push({
          korean: mistake.korean,
          english: mistake.english,
          pattern: mistake.pattern,
          verb: mistake.verb,
          level: mistake.level,
          stage: mistake.stage,
          mistakeId: mistake.id
        } as QuestionItem & { mistakeId: string });
      });
    } else if (reviewModeData.mode === 'weak-patterns') {
      // Weak patterns (low mastery rate)
      const now = Date.now();
      const patternStats = new Map<string, { total: number; mastered: number }>();
      
      mistakes.forEach(m => {
        const current = patternStats.get(m.pattern) || { total: 0, mastered: 0 };
        current.total += 1;
        if (m.mastered) current.mastered += 1;
        patternStats.set(m.pattern, current);
      });
      
      const weakPatterns = Array.from(patternStats.entries())
        .filter(([_, stats]) => stats.total >= 3 && (stats.mastered / stats.total) < 0.5)
        .map(([pattern]) => pattern);
      
      const weakPatternReviews = mistakes.filter(m => 
        !m.mastered && 
        m.nextReview <= now && 
        weakPatterns.includes(m.pattern)
      );
      
      weakPatternReviews.forEach(mistake => {
        reviewQuestions.push({
          korean: mistake.korean,
          english: mistake.english,
          pattern: mistake.pattern,
          verb: mistake.verb,
          level: mistake.level,
          stage: mistake.stage,
          mistakeId: mistake.id
        } as QuestionItem & { mistakeId: string });
      });
    }
    
    return reviewQuestions;
  }

  /**
   * Create URL for review mode
   */
  static createReviewURL(
    mode: 'single' | 'all' | 'pattern' | 'weak-patterns',
    options?: {
      reviewId?: string;
      reviewIds?: string[];
      patternName?: string;
    }
  ): string {
    const params = new URLSearchParams();
    params.set('reviewMode', mode);
    
    if (options?.reviewId) {
      params.set('reviewId', options.reviewId);
    }
    
    if (options?.reviewIds) {
      params.set('reviewIds', options.reviewIds.join(','));
    }
    
    if (options?.patternName) {
      params.set('patternName', options.patternName);
    }
    
    return `${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Create URL for level system mode
   */
  static createLevelSystemURL(
    level: number,
    stage: number,
    options?: {
      patternName?: string;
      currentVerb?: string;
      developerMode?: boolean;
    }
  ): string {
    const params = new URLSearchParams();
    params.set('level', level.toString());
    params.set('stage', stage.toString());
    
    if (options?.patternName) {
      params.set('patternName', options.patternName);
    }
    
    if (options?.currentVerb) {
      params.set('currentVerb', options.currentVerb);
    }
    
    if (options?.developerMode) {
      params.set('developerMode', 'true');
    }
    
    return `${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Navigate to specific mode
   */
  static navigateToReview(
    mode: 'single' | 'all' | 'pattern' | 'weak-patterns',
    options?: {
      reviewId?: string;
      reviewIds?: string[];
      patternName?: string;
    }
  ): void {
    const url = this.createReviewURL(mode, options);
    window.history.pushState({}, '', url);
    window.location.reload(); // Reload to apply new URL params
  }

  /**
   * Navigate to level system
   */
  static navigateToLevelSystem(
    level: number,
    stage: number,
    options?: {
      patternName?: string;
      currentVerb?: string;
      developerMode?: boolean;
    }
  ): void {
    const url = this.createLevelSystemURL(level, stage, options);
    window.history.pushState({}, '', url);
    window.location.reload(); // Reload to apply new URL params
  }

  /**
   * Clear URL parameters and go to normal mode
   */
  static clearURLParams(): void {
    window.history.pushState({}, '', window.location.pathname);
    window.location.reload();
  }
}