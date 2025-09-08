/**
 * Navigation Service - 느슨한 결합을 위한 네비게이션 추상화
 */

import { STAGE_CONFIG } from '@/config/stageConfig';

export interface NavigationParams {
  level: number;
  stage: number | 'ALL';
  targetAccuracy?: number;
  developerMode?: boolean;
}

export interface LevelInfo {
  level: number;
  title: string;
  description: string;
  stages: number;
  completed: boolean;
  color: string;
}

export class NavigationService {
  /**
   * 패턴 트레이닝 페이지로 이동
   */
  static navigateToPatternTraining(params: NavigationParams, levelInfo: LevelInfo): void {
    const urlParams = new URLSearchParams();
    urlParams.set('level', params.level.toString());
    urlParams.set('stage', params.stage.toString());
    urlParams.set('verbs', STAGE_CONFIG.verbsByLevel[params.level] || levelInfo.title);
    urlParams.set('targetAccuracy', (params.targetAccuracy || 80).toString());
    urlParams.set('developerMode', (params.developerMode || false).toString());
    
    // 향후 React Router 사용으로 쉽게 변경 가능
    window.location.href = `/pattern-training?${urlParams.toString()}`;
  }

  /**
   * 홈페이지로 이동
   */
  static navigateToHome(): void {
    window.location.href = '/';
  }

  /**
   * 이전 페이지로 이동
   */
  static goBack(): void {
    window.history.back();
  }
}

/**
 * URL 파라미터 파서 - 재사용 가능한 유틸리티
 */
export class UrlParamParser {
  static getLevel(defaultLevel: number = 1): number {
    const params = new URLSearchParams(window.location.search);
    return Math.max(1, parseInt(params.get('level') || defaultLevel.toString(), 10));
  }

  static getStage(defaultStage: number = 1): number {
    const params = new URLSearchParams(window.location.search);
    return Math.max(1, parseInt(params.get('stage') || defaultStage.toString(), 10));
  }

  static getPhase(defaultPhase: number = 1): number {
    const params = new URLSearchParams(window.location.search);
    return Math.max(1, parseInt(params.get('phase') || defaultPhase.toString(), 10));
  }
}