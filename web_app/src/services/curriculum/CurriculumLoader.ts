/**
 * 커리큘럼 로드맵 파일을 파싱하는 서비스
 * docs/curriculum/master_roadmap_*.md 파일을 읽어서 구조화
 */

import { CurriculumLevel, CurriculumPhase, CurriculumStage } from './types/CurriculumTypes';

export class CurriculumLoader {
  private static roadmapCache: Map<number, CurriculumLevel> = new Map();

  /**
   * Level 4-6 로드맵 파일을 파싱
   */
  static async loadLevel4to6(): Promise<CurriculumLevel[]> {
    try {
      const response = await fetch('/docs/curriculum/master_roadmap_lv4~6_ver0.md');
      const content = await response.text();
      return this.parseRoadmapContent(content, [4, 5, 6]);
    } catch (error) {
      console.error('Level 4-6 로드맵 로딩 실패:', error);
      return this.getFallbackData([4, 5, 6]);
    }
  }

  /**
   * Level 7-10 로드맵 파일을 파싱
   */
  static async loadLevel7to10(): Promise<CurriculumLevel[]> {
    try {
      const response = await fetch('/docs/curriculum/master_roadmap_lv7~10_ver0.md');
      const content = await response.text();
      return this.parseRoadmapContent(content, [7, 8, 9, 10]);
    } catch (error) {
      console.error('Level 7-10 로드맵 로딩 실패:', error);
      return this.getFallbackData([7, 8, 9, 10]);
    }
  }

  /**
   * 특정 레벨의 커리큘럼 로드 (캐시 사용)
   */
  static async loadLevel(level: number): Promise<CurriculumLevel | null> {
    if (this.roadmapCache.has(level)) {
      return this.roadmapCache.get(level)!;
    }

    let curriculum: CurriculumLevel | null = null;
    
    if (level >= 4 && level <= 6) {
      const levels = await this.loadLevel4to6();
      curriculum = levels.find(l => l.level === level) || null;
    } else if (level >= 7 && level <= 10) {
      const levels = await this.loadLevel7to10();
      curriculum = levels.find(l => l.level === level) || null;
    }

    if (curriculum) {
      this.roadmapCache.set(level, curriculum);
    }

    return curriculum;
  }

  /**
   * 마크다운 파일 내용을 파싱해서 구조화된 데이터로 변환
   */
  private static parseRoadmapContent(content: string, levels: number[]): CurriculumLevel[] {
    const results: CurriculumLevel[] = [];
    
    // 간단한 파싱 로직 (실제로는 더 정교해야 함)
    const lines = content.split('\n');
    let currentLevel: CurriculumLevel | null = null;
    let currentPhase: CurriculumPhase | null = null;
    let currentStage: CurriculumStage | null = null;

    for (const line of lines) {
      // Level 시작 감지
      if (line.startsWith('Level ')) {
        if (currentLevel && levels.includes(currentLevel.level)) {
          results.push(currentLevel);
        }
        
        const levelMatch = line.match(/Level (\d+):\s*(.+)/);
        if (levelMatch) {
          const levelNum = parseInt(levelMatch[1]);
          if (levels.includes(levelNum)) {
            currentLevel = {
              level: levelNum,
              title: levelMatch[2],
              description: '',
              phases: [],
              totalStages: 0
            };
          } else {
            currentLevel = null;
          }
        }
      }
      
      // Phase 시작 감지
      else if (line.startsWith('Phase ') && currentLevel) {
        if (currentPhase) {
          currentLevel.phases.push(currentPhase);
        }
        
        const phaseMatch = line.match(/Phase (\d+):\s*(.+)/);
        if (phaseMatch) {
          currentPhase = {
            phaseId: `Phase ${phaseMatch[1]}`,
            title: phaseMatch[2],
            description: '',
            stages: []
          };
        }
      }
      
      // Stage 시작 감지
      else if (line.startsWith('Stage ') && currentPhase) {
        if (currentStage) {
          currentPhase.stages.push(currentStage);
          currentLevel!.totalStages++;
        }
        
        const stageMatch = line.match(/Stage (\d+):\s*(.+?)\s*–\s*(.+)/);
        if (stageMatch) {
          currentStage = {
            stageId: `Stage ${stageMatch[1]}`,
            title: stageMatch[2],
            description: stageMatch[3] || '',
            examples: [],
            grammarPoints: [stageMatch[2]] // title을 문법 포인트로 사용
          };
        }
      }
      
      // 예문 수집 - "By next year, I will have graduated." 같은 예시 부분
      else if (currentStage && line.includes('예)')) {
        const examples = this.extractExamples(line);
        currentStage.examples.push(...examples);
      }
    }

    // 마지막 데이터 추가
    if (currentStage && currentPhase) {
      currentPhase.stages.push(currentStage);
      currentLevel!.totalStages++;
    }
    if (currentPhase && currentLevel) {
      currentLevel.phases.push(currentPhase);
    }
    if (currentLevel && levels.includes(currentLevel.level)) {
      results.push(currentLevel);
    }

    return results;
  }

  /**
   * 문장에서 예문 추출
   */
  private static extractExamples(line: string): string[] {
    const examples: string[] = [];
    
    // 여러 따옴표 패턴 시도
    const patterns = [
      /"([^"]+)"/g,     // 일반 따옴표
      /"([^"]+)"/g,     // 유니코드 좌측 따옴표
      /"([^"]+)"/g,     // 유니코드 우측 따옴표  
      /\"([^\"]+)\"/g,  // 백슬래시 이스케이프
      /By [^.]+\./g,    // By로 시작하는 문장 (임시)
      /I [^.]+\./g,     // I로 시작하는 문장 (임시)
      /He [^.]+\./g,    // He로 시작하는 문장 (임시)
      /She [^.]+\./g    // She로 시작하는 문장 (임시)
    ];
    
    for (const pattern of patterns) {
      const matches = line.match(pattern);
      if (matches) {
        // 따옴표가 포함된 경우 제거
        const cleaned = matches.map(match => 
          match.replace(/^["""\"]+|["""\"]+$/g, '').trim()
        );
        examples.push(...cleaned);
        break; // 첫 번째로 찾은 패턴 사용
      }
    }
    
    return examples;
  }

  /**
   * 로드맵 파일 로딩 실패 시 폴백 데이터
   */
  private static getFallbackData(levels: number[]): CurriculumLevel[] {
    return levels.map(level => ({
      level,
      title: `Level ${level} Fallback`,
      description: `Level ${level} 로드맵 로딩 실패 시 사용되는 기본 데이터`,
      phases: [{
        phaseId: 'Phase 1',
        title: 'Basic Phase',
        description: 'Fallback phase',
        stages: [{
          stageId: 'Stage 1',
          title: 'Basic Stage',
          description: 'Fallback stage',
          examples: [`This is a Level ${level} fallback sentence.`],
          grammarPoints: ['Basic Grammar']
        }]
      }],
      totalStages: 1
    }));
  }

  /**
   * 캐시 클리어
   */
  static clearCache(): void {
    this.roadmapCache.clear();
  }
}