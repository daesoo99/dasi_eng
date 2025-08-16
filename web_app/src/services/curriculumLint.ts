/**
 * @fileoverview Curriculum Lint Service - 콘텐츠 자동 검수 시스템
 * @description L1~L6 커리큘럼 JSON/Firestore 스냅샷 대상 ID/카운트/분류/슬롯/중복 검사
 * @author DaSiStart Team
 * @version 1.0.0
 */

import { curriculumAPI } from './api';
import { logger, LogCategory } from '../utils/index';

// ====== 타입 정의 ======

export interface StageData {
  stage_id: string;
  classification?: 'core' | 'bridge' | 'optional';
  slots?: Array<{
    kr: string;
    en: string;
    lemma?: string;
  }>;
  phase?: number;
  drill?: {
    delaySec: number;
    randomize: boolean;
    minCorrectToAdvance: number;
    reviewWeight: number;
  };
  tags?: string[];
}

export interface CurriculumData {
  level: number;
  title: string;
  total_stages: number;
  total_phases: number;
  stages: StageData[];
  phases?: Array<{
    phase_id: number;
    title: string;
    stages: string[];
  }>;
}

export interface LintRule {
  name: string;
  description: string;
  validate: (data: CurriculumData, allLevelsData?: CurriculumData[]) => LintResult;
}

export interface LintResult {
  passed: boolean;
  issues: LintIssue[];
  statistics?: Record<string, any>;
}

export interface LintIssue {
  level: 'error' | 'warning' | 'info';
  category: 'id_format' | 'count' | 'classification' | 'slots' | 'duplicates';
  stage_id?: string;
  message: string;
  details?: any;
}

export interface LintReport {
  level: number;
  timestamp: number;
  overall_result: 'PASS' | 'FAIL' | 'WARNING';
  rule_results: Record<string, LintResult>;
  statistics: {
    total_stages: number;
    total_phases: number;
    classifications: Record<string, number>;
    slot_stats: {
      min: number;
      max: number;
      avg: number;
      stages_with_slots: number;
    };
    duplicates_found: number;
    cross_level_warnings: number;
  };
  issues_summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// ====== Lint Rules ======

class CurriculumLintRules {
  
  // 규칙 1: ID 형식 검증
  static idFormatRule: LintRule = {
    name: 'ID Format Validation',
    description: 'ID 형식: LvX-P[1..6]-S[01..] / 브릿지 LvX-A[2|4|6]-S[08|16|24]',
    validate: (data: CurriculumData): LintResult => {
      const issues: LintIssue[] = [];
      const { level, stages } = data;
      
      // 정규식 패턴
      const corePattern = new RegExp(`^Lv${level}-P[1-6]-S\\d{2}$`);
      const bridgePattern = new RegExp(`^Lv${level}-A[246]-S(08|16|24)$`);
      
      stages.forEach(stage => {
        const isCore = stage.classification === 'core';
        const isBridge = stage.classification === 'bridge';
        const isOptional = stage.classification === 'optional';
        
        if (isBridge) {
          if (!bridgePattern.test(stage.stage_id)) {
            issues.push({
              level: 'error',
              category: 'id_format',
              stage_id: stage.stage_id,
              message: `브릿지 스테이지 ID 형식 오류: ${stage.stage_id} (expected: LvX-A[2|4|6]-S[08|16|24])`,
              details: { expected_pattern: 'LvX-A[2|4|6]-S[08|16|24]' }
            });
          }
        } else if (isCore || isOptional) {
          if (!corePattern.test(stage.stage_id)) {
            issues.push({
              level: 'error',
              category: 'id_format',
              stage_id: stage.stage_id,
              message: `코어/옵션 스테이지 ID 형식 오류: ${stage.stage_id} (expected: LvX-P[1..6]-S[01..])`,
              details: { expected_pattern: 'LvX-P[1..6]-S[01..]' }
            });
          }
        }
      });
      
      return {
        passed: issues.length === 0,
        issues
      };
    }
  };

  // 규칙 2: 카운트 검증
  static countValidationRule: LintRule = {
    name: 'Count Validation',
    description: 'Phases=6, Stages=레벨값 일치(예: L6=24)',
    validate: (data: CurriculumData): LintResult => {
      const issues: LintIssue[] = [];
      const { level, total_phases, total_stages, stages } = data;
      
      // 페이즈 검증 (항상 6이어야 함)
      if (total_phases !== 6) {
        issues.push({
          level: 'error',
          category: 'count',
          message: `페이즈 개수 오류: ${total_phases} (expected: 6)`,
          details: { actual: total_phases, expected: 6 }
        });
      }
      
      // 스테이지 검증 (레벨 * 4 = 기본 공식, 하지만 실제 데이터 기준으로 검증)
      const expectedStagesByLevel: Record<number, number> = {
        1: 19, 2: 22, 3: 26, 4: 24, 5: 24, 6: 24
      };
      
      const expectedStages = expectedStagesByLevel[level];
      if (expectedStages && total_stages !== expectedStages) {
        issues.push({
          level: 'error',
          category: 'count',
          message: `스테이지 개수 오류: ${total_stages} (expected: ${expectedStages})`,
          details: { actual: total_stages, expected: expectedStages }
        });
      }
      
      // 실제 stages 배열 길이와 total_stages 일치 확인
      if (stages.length !== total_stages) {
        issues.push({
          level: 'error',
          category: 'count',
          message: `stages 배열 길이 불일치: ${stages.length} vs total_stages: ${total_stages}`,
          details: { stages_array_length: stages.length, total_stages }
        });
      }
      
      return {
        passed: issues.length === 0,
        issues,
        statistics: {
          total_phases,
          total_stages,
          stages_array_length: stages.length,
          expected_stages: expectedStages
        }
      };
    }
  };

  // 규칙 3: 분류 집계 검증
  static classificationRule: LintRule = {
    name: 'Classification Aggregation',
    description: '분류 집계: core:18 / bridge:3 / optional:3',
    validate: (data: CurriculumData): LintResult => {
      const issues: LintIssue[] = [];
      const { level, stages } = data;
      
      // 분류별 카운트
      const classifications = stages.reduce((acc, stage) => {
        const classification = stage.classification || 'unknown';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 레벨별 예상 분류 (기본 공식: core:18, bridge:3, optional:3)
      const expectedByLevel: Record<number, Record<string, number>> = {
        1: { core: 16, bridge: 0, optional: 3 }, // L1은 브릿지 없음
        2: { core: 19, bridge: 0, optional: 3 }, // L2는 브릿지 별도 처리
        3: { core: 23, bridge: 0, optional: 3 }, // L3은 브릿지 별도 처리
        4: { core: 18, bridge: 3, optional: 3 },
        5: { core: 18, bridge: 3, optional: 3 },
        6: { core: 18, bridge: 3, optional: 3 }
      };
      
      const expected = expectedByLevel[level];
      if (expected) {
        Object.entries(expected).forEach(([classification, expectedCount]) => {
          const actualCount = classifications[classification] || 0;
          if (actualCount !== expectedCount) {
            const severity = Math.abs(actualCount - expectedCount) > 2 ? 'error' : 'warning';
            issues.push({
              level: severity,
              category: 'classification',
              message: `${classification} 분류 개수 오류: ${actualCount} (expected: ${expectedCount})`,
              details: { 
                classification, 
                actual: actualCount, 
                expected: expectedCount,
                difference: actualCount - expectedCount
              }
            });
          }
        });
      }
      
      // 미분류 스테이지 검사
      const unknownCount = classifications['unknown'] || 0;
      if (unknownCount > 0) {
        issues.push({
          level: 'warning',
          category: 'classification',
          message: `미분류 스테이지 ${unknownCount}개 발견`,
          details: { unknown_stages: unknownCount }
        });
      }
      
      return {
        passed: issues.filter(i => i.level === 'error').length === 0,
        issues,
        statistics: {
          classifications,
          expected: expected || {}
        }
      };
    }
  };

  // 규칙 4: 슬롯 수 검증
  static slotsValidationRule: LintRule = {
    name: 'Slots Count Validation',
    description: '슬롯 수: 스테이지당 코어 표현 5-8개',
    validate: (data: CurriculumData): LintResult => {
      const issues: LintIssue[] = [];
      const { stages } = data;
      
      let slotStats = {
        min: Infinity,
        max: 0,
        total: 0,
        count: 0
      };
      
      stages.forEach(stage => {
        if (stage.classification === 'core') {
          const slotCount = stage.slots?.length || 0;
          
          if (slotCount < 5 || slotCount > 8) {
            issues.push({
              level: 'error',
              category: 'slots',
              stage_id: stage.stage_id,
              message: `코어 스테이지 슬롯 개수 오류: ${slotCount} (expected: 5-8)`,
              details: { actual: slotCount, min: 5, max: 8 }
            });
          }
          
          // 통계 업데이트
          if (slotCount > 0) {
            slotStats.min = Math.min(slotStats.min, slotCount);
            slotStats.max = Math.max(slotStats.max, slotCount);
            slotStats.total += slotCount;
            slotStats.count += 1;
          }
        }
      });
      
      return {
        passed: issues.length === 0,
        issues,
        statistics: {
          slot_stats: {
            min: slotStats.min === Infinity ? 0 : slotStats.min,
            max: slotStats.max,
            avg: slotStats.count > 0 ? Math.round(slotStats.total / slotStats.count * 100) / 100 : 0,
            stages_with_slots: slotStats.count
          }
        }
      };
    }
  };

  // 규칙 5: 중복 검사
  static duplicatesRule: LintRule = {
    name: 'Duplicates Detection',
    description: '중복: 같은 레벨 내 표현 중복 금지(레마 기준), 상위 레벨과의 불필요 중복 경고',
    validate: (data: CurriculumData, allLevelsData?: CurriculumData[]): LintResult => {
      const issues: LintIssue[] = [];
      const { level, stages } = data;
      
      // 같은 레벨 내 중복 검사 (레마 기준)
      const lemmaMap = new Map<string, string[]>(); // lemma -> stage_ids[]
      
      stages.forEach(stage => {
        stage.slots?.forEach(slot => {
          const lemma = slot.lemma || slot.en.toLowerCase();
          if (!lemmaMap.has(lemma)) {
            lemmaMap.set(lemma, []);
          }
          lemmaMap.get(lemma)!.push(stage.stage_id);
        });
      });
      
      // 중복 발견된 레마들
      let duplicatesFound = 0;
      lemmaMap.forEach((stageIds, lemma) => {
        if (stageIds.length > 1) {
          duplicatesFound++;
          issues.push({
            level: 'error',
            category: 'duplicates',
            message: `레벨 ${level} 내 레마 중복: "${lemma}" in stages: ${stageIds.join(', ')}`,
            details: { lemma, stages: stageIds, count: stageIds.length }
          });
        }
      });
      
      // 상위 레벨과의 중복 검사 (경고)
      let crossLevelWarnings = 0;
      if (allLevelsData && level > 1) {
        const lowerLevelLemmas = new Set<string>();
        
        allLevelsData
          .filter(levelData => levelData.level < level)
          .forEach(levelData => {
            levelData.stages.forEach(stage => {
              stage.slots?.forEach(slot => {
                const lemma = slot.lemma || slot.en.toLowerCase();
                lowerLevelLemmas.add(lemma);
              });
            });
          });
        
        // 현재 레벨과 하위 레벨 간 중복 체크
        stages.forEach(stage => {
          stage.slots?.forEach(slot => {
            const lemma = slot.lemma || slot.en.toLowerCase();
            if (lowerLevelLemmas.has(lemma)) {
              crossLevelWarnings++;
              issues.push({
                level: 'warning',
                category: 'duplicates',
                stage_id: stage.stage_id,
                message: `상위 레벨과 중복: "${lemma}" (이미 하위 레벨에서 학습됨)`,
                details: { lemma, stage_id: stage.stage_id }
              });
            }
          });
        });
      }
      
      return {
        passed: issues.filter(i => i.level === 'error').length === 0,
        issues,
        statistics: {
          duplicates_found: duplicatesFound,
          cross_level_warnings: crossLevelWarnings,
          unique_lemmas: lemmaMap.size,
          total_expressions: Array.from(lemmaMap.values()).reduce((sum, arr) => sum + arr.length, 0)
        }
      };
    }
  };
  
  static getAllRules(): LintRule[] {
    return [
      this.idFormatRule,
      this.countValidationRule,
      this.classificationRule,
      this.slotsValidationRule,
      this.duplicatesRule
    ];
  }
}

// ====== Curriculum Lint Service ======

export class CurriculumLintService {
  
  private static instance: CurriculumLintService | null = null;
  private readonly rules: LintRule[];
  
  private constructor() {
    this.rules = CurriculumLintRules.getAllRules();
  }
  
  static getInstance(): CurriculumLintService {
    if (!CurriculumLintService.instance) {
      CurriculumLintService.instance = new CurriculumLintService();
    }
    return CurriculumLintService.instance;
  }
  
  /**
   * 단일 레벨 커리큘럼 린트 검사
   */
  async lintLevel(level: number, allLevelsData?: CurriculumData[]): Promise<LintReport> {
    logger.info(`Starting curriculum lint for Level ${level}`, LogCategory.API);
    
    try {
      // 커리큘럼 데이터 로드
      const response = await curriculumAPI.getCurriculum(level);
      if (!response.success || !response.data) {
        throw new Error(`Failed to load curriculum for level ${level}: ${response.error}`);
      }
      
      const curriculumData: CurriculumData = {
        level,
        title: response.data.title || `Level ${level}`,
        total_stages: response.data.total_stages || response.data.stages?.length || 0,
        total_phases: response.data.total_phases || response.data.phases?.length || 0,
        stages: response.data.stages || [],
        phases: response.data.phases || []
      };
      
      // 규칙별 검증 실행
      const ruleResults: Record<string, LintResult> = {};
      let allIssues: LintIssue[] = [];
      
      for (const rule of this.rules) {
        const result = rule.validate(curriculumData, allLevelsData);
        ruleResults[rule.name] = result;
        allIssues = allIssues.concat(result.issues);
      }
      
      // 통계 계산
      const classifications = curriculumData.stages.reduce((acc, stage) => {
        const classification = stage.classification || 'unknown';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const slotsStats = this.calculateSlotStats(curriculumData.stages);
      
      // 이슈 요약
      const issuesSummary = allIssues.reduce(
        (acc, issue) => {
          acc[issue.level === 'error' ? 'errors' : issue.level === 'warning' ? 'warnings' : 'info']++;
          return acc;
        },
        { errors: 0, warnings: 0, info: 0 }
      );
      
      // 전체 결과 결정
      const overallResult = issuesSummary.errors > 0 ? 'FAIL' : 
                          issuesSummary.warnings > 0 ? 'WARNING' : 'PASS';
      
      const report: LintReport = {
        level,
        timestamp: Date.now(),
        overall_result: overallResult,
        rule_results: ruleResults,
        statistics: {
          total_stages: curriculumData.total_stages,
          total_phases: curriculumData.total_phases,
          classifications,
          slot_stats: slotsStats,
          duplicates_found: ruleResults['Duplicates Detection']?.statistics?.duplicates_found || 0,
          cross_level_warnings: ruleResults['Duplicates Detection']?.statistics?.cross_level_warnings || 0
        },
        issues_summary: issuesSummary
      };
      
      logger.info(`Curriculum lint completed for Level ${level}: ${overallResult}`, LogCategory.API);
      return report;
      
    } catch (error) {
      logger.error(`Curriculum lint failed for Level ${level}: ${error}`, LogCategory.API);
      throw error;
    }
  }
  
  /**
   * L1~L6 전체 커리큘럼 린트 검사
   */
  async lintAllLevels(): Promise<LintReport[]> {
    logger.info('Starting comprehensive curriculum lint for L1~L6', LogCategory.API);
    
    // 먼저 모든 레벨의 데이터를 로드
    const allLevelsData: CurriculumData[] = [];
    
    for (let level = 1; level <= 6; level++) {
      try {
        const response = await curriculumAPI.getCurriculum(level);
        if (response.success && response.data) {
          allLevelsData.push({
            level,
            title: response.data.title || `Level ${level}`,
            total_stages: response.data.total_stages || response.data.stages?.length || 0,
            total_phases: response.data.total_phases || response.data.phases?.length || 0,
            stages: response.data.stages || [],
            phases: response.data.phases || []
          });
        }
      } catch (error) {
        logger.warn(`Failed to load Level ${level} for comprehensive lint: ${error}`, LogCategory.API);
      }
    }
    
    // 각 레벨에 대해 린트 실행 (크로스 레벨 검사 포함)
    const reports: LintReport[] = [];
    
    for (const levelData of allLevelsData) {
      try {
        const report = await this.lintLevel(levelData.level, allLevelsData);
        reports.push(report);
      } catch (error) {
        logger.error(`Failed to lint Level ${levelData.level}: ${error}`, LogCategory.API);
      }
    }
    
    logger.info(`Comprehensive curriculum lint completed: ${reports.length} levels processed`, LogCategory.API);
    return reports;
  }
  
  /**
   * 슬롯 통계 계산
   */
  private calculateSlotStats(stages: StageData[]) {
    const slotCounts = stages
      .filter(stage => stage.classification === 'core')
      .map(stage => stage.slots?.length || 0)
      .filter(count => count > 0);
    
    if (slotCounts.length === 0) {
      return { min: 0, max: 0, avg: 0, stages_with_slots: 0 };
    }
    
    return {
      min: Math.min(...slotCounts),
      max: Math.max(...slotCounts),
      avg: Math.round(slotCounts.reduce((sum, count) => sum + count, 0) / slotCounts.length * 100) / 100,
      stages_with_slots: slotCounts.length
    };
  }
  
  /**
   * 린트 보고서를 텍스트 형태로 포맷팅
   */
  formatReportAsText(report: LintReport): string {
    const lines: string[] = [];
    
    lines.push(`=== CURRICULUM LINT REPORT - Level ${report.level} ===`);
    lines.push(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    lines.push(`Overall Result: ${report.overall_result}`);
    lines.push('');
    
    // 통계
    lines.push('=== STATISTICS ===');
    lines.push(`Total Stages: ${report.statistics.total_stages}`);
    lines.push(`Total Phases: ${report.statistics.total_phases}`);
    lines.push(`Classifications: ${JSON.stringify(report.statistics.classifications)}`);
    lines.push(`Slot Stats: min=${report.statistics.slot_stats.min}, max=${report.statistics.slot_stats.max}, avg=${report.statistics.slot_stats.avg}`);
    lines.push(`Duplicates Found: ${report.statistics.duplicates_found}`);
    lines.push(`Cross-Level Warnings: ${report.statistics.cross_level_warnings}`);
    lines.push('');
    
    // 이슈 요약
    lines.push('=== ISSUES SUMMARY ===');
    lines.push(`Errors: ${report.issues_summary.errors}`);
    lines.push(`Warnings: ${report.issues_summary.warnings}`);
    lines.push(`Info: ${report.issues_summary.info}`);
    lines.push('');
    
    // 규칙별 결과
    Object.entries(report.rule_results).forEach(([ruleName, result]) => {
      lines.push(`=== ${ruleName.toUpperCase()} ===`);
      lines.push(`Status: ${result.passed ? 'PASS' : 'FAIL'}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          lines.push(`[${issue.level.toUpperCase()}] ${issue.message}`);
          if (issue.details) {
            lines.push(`  Details: ${JSON.stringify(issue.details)}`);
          }
        });
      } else {
        lines.push('No issues found.');
      }
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

// 싱글턴 인스턴스 익스포트
export const curriculumLintService = CurriculumLintService.getInstance();