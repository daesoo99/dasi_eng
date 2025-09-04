/**
 * Level별 서비스를 관리하는 팩토리 클래스
 * 느슨한 결합을 위해 팩토리 패턴 적용
 */

import { Level4Service } from './Level4Service';
import { Level4ServiceQuick } from './Level4ServiceQuick';
import { LegacyQuestionItem } from './types/CurriculumTypes';

interface LevelService {
  generateLegacyQuestions(stageNumber: number): Promise<LegacyQuestionItem[]>;
}

export class LevelServiceFactory {
  private static services: Map<number, LevelService> = new Map();

  /**
   * 레벨에 해당하는 서비스 인스턴스 반환
   */
  static getService(level: number): LevelService | null {
    // 캐시된 서비스가 있으면 반환
    if (this.services.has(level)) {
      return this.services.get(level)!;
    }

    // 레벨별 서비스 생성
    let service: LevelService | null = null;
    
    switch (level) {
      case 4:
        // 빠른 해결책: 하드코딩된 예문 사용
        service = {
          generateLegacyQuestions: Level4ServiceQuick.generateLegacyQuestions.bind(Level4ServiceQuick)
        };
        break;
      case 5:
        // Level5Service 구현되면 추가
        service = this.createFallbackService(5);
        break;
      case 6:
        // Level6Service 구현되면 추가  
        service = this.createFallbackService(6);
        break;
      case 7:
        service = this.createFallbackService(7);
        break;
      case 8:
        service = this.createFallbackService(8);
        break;
      case 9:
        service = this.createFallbackService(9);
        break;
      case 10:
        service = this.createFallbackService(10);
        break;
      default:
        console.warn(`Level ${level} 서비스가 구현되지 않았습니다.`);
        return null;
    }

    if (service) {
      this.services.set(level, service);
    }

    return service;
  }

  /**
   * 아직 구현되지 않은 레벨을 위한 폴백 서비스
   */
  private static createFallbackService(level: number): LevelService {
    return {
      async generateLegacyQuestions(stageNumber: number): Promise<LegacyQuestionItem[]> {
        console.warn(`Level ${level} 서비스 미구현. 폴백 데이터 사용.`);
        
        // 기본 폴백 문장들 (104개까지 생성)
        const sentences: LegacyQuestionItem[] = [];
        const baseTemplates = [
          { korean: `Level ${level} 기본 문장입니다`, english: `This is a Level ${level} basic sentence` },
          { korean: `Level ${level} 고급 표현을 연습합니다`, english: `Practicing Level ${level} advanced expressions` },
          { korean: `Level ${level}에서 배우는 문법입니다`, english: `Grammar learned in Level ${level}` }
        ];

        for (let i = 0; i < 104; i++) {
          const template = baseTemplates[i % baseTemplates.length];
          sentences.push({
            korean: `${template.korean} (${i + 1})`,
            english: `${template.english} (${i + 1})`,
            level: level,
            stage: stageNumber,
            pattern: `Level ${level} Pattern`
          });
        }

        return sentences;
      }
    };
  }

  /**
   * 특정 레벨과 스테이지의 문제 생성
   * 기존 PatternDataManager.generateQuestions 대체용
   */
  static async generateQuestions(level: number, stageNumber: number): Promise<LegacyQuestionItem[]> {
    const service = this.getService(level);
    if (!service) {
      console.error(`Level ${level} 서비스를 찾을 수 없습니다.`);
      return [];
    }

    try {
      const questions = await service.generateLegacyQuestions(stageNumber);
      console.log(`✅ Level ${level} Stage ${stageNumber}: ${questions.length}개 문제 생성`);
      return questions;
    } catch (error) {
      console.error(`Level ${level} Stage ${stageNumber} 문제 생성 실패:`, error);
      return [];
    }
  }

  /**
   * 모든 서비스 캐시 클리어
   */
  static clearCache(): void {
    this.services.clear();
  }

  /**
   * 사용 가능한 레벨 목록 반환
   */
  static getAvailableLevels(): number[] {
    return [4, 5, 6, 7, 8, 9, 10];
  }

  /**
   * 특정 레벨이 지원되는지 확인
   */
  static isLevelSupported(level: number): boolean {
    return this.getAvailableLevels().includes(level);
  }
}