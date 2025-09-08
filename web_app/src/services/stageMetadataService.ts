/**
 * Stage Metadata Service - 모듈화된 메타데이터 로딩
 */

import { StageIdGenerator } from '@/config/stageConfig';

export interface StageMetadata {
  stage_id: string;
  title: string;
  description: string;
  grammar_pattern: string;
  examples: string[];
  learning_points: string;
  phase: number;
}

export class StageMetadataService {
  private static cache = new Map<string, StageMetadata>();

  /**
   * 스테이지 메타데이터 로드 (캐시 지원)
   */
  static async loadMetadata(level: number, stage: number): Promise<StageMetadata | null> {
    const cacheKey = `${level}-${stage}`;
    
    // 캐시에서 확인
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    try {
      const bankFilePath = StageIdGenerator.getBankFilePath(level, stage);
      const response = await fetch(bankFilePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load stage metadata: ${response.status}`);
      }
      
      const bankData = await response.json();
      const metadata: StageMetadata = {
        stage_id: bankData.stage_id,
        title: bankData.title,
        description: bankData.description,
        grammar_pattern: bankData.grammar_pattern,
        examples: bankData.examples || [],
        learning_points: bankData.learning_points,
        phase: bankData.phase
      };
      
      // 캐시에 저장
      this.cache.set(cacheKey, metadata);
      return metadata;
      
    } catch (error) {
      console.error('Failed to load stage metadata:', error);
      return null;
    }
  }

  /**
   * 캐시 클리어 (테스트 또는 새로고침 시 사용)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}