/**
 * @fileoverview Curriculum Lint Component - 콘텐츠 린트 자동 검수 시스템
 * @description ID/카운트/분류/슬롯/중복 검사를 통한 커리큘럼 품질 관리
 * @author DaSiStart Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { curriculumLintService, LintReport, LintIssue } from '../services/curriculumLint';
import { logger, LogCategory } from '../utils/index';

interface LintState {
  isRunning: boolean;
  currentLevel?: number;
  reports: LintReport[];
  error?: string;
  selectedLevel?: number;
}

export const CurriculumLint: React.FC = () => {
  const [state, setState] = useState<LintState>({
    isRunning: false,
    reports: []
  });

  // L1~L6 전체 린트 실행
  const runComprehensiveLint = async () => {
    setState(prev => ({ ...prev, isRunning: true, error: undefined, reports: [] }));
    
    try {
      logger.info('Starting comprehensive curriculum lint...', LogCategory.API);
      const reports = await curriculumLintService.lintAllLevels();
      
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        reports,
        selectedLevel: reports.length > 0 ? reports[0].level : undefined
      }));
      
      logger.info(`Comprehensive lint completed: ${reports.length} levels processed`, LogCategory.API);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        error: errorMessage 
      }));
      logger.error(`Comprehensive lint failed: ${errorMessage}`, LogCategory.API);
    }
  };

  // 단일 레벨 린트 실행
  const runSingleLevelLint = async (level: number) => {
    setState(prev => ({ ...prev, isRunning: true, currentLevel: level, error: undefined }));
    
    try {
      const report = await curriculumLintService.lintLevel(level);
      
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        currentLevel: undefined,
        reports: [...prev.reports.filter(r => r.level !== level), report],
        selectedLevel: level
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        currentLevel: undefined,
        error: errorMessage 
      }));
    }
  };

  // 컴포넌트 마운트 시 자동 실행
  useEffect(() => {
    runComprehensiveLint();
  }, []);

  const getResultIcon = (result: 'PASS' | 'FAIL' | 'WARNING') => {
    switch (result) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'WARNING': return '⚠️';
    }
  };

  const getResultColor = (result: 'PASS' | 'FAIL' | 'WARNING') => {
    switch (result) {
      case 'PASS': return 'text-green-600 bg-green-50 border-green-200';
      case 'FAIL': return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getIssueIcon = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
    }
  };

  const selectedReport = state.reports.find(r => r.level === state.selectedLevel);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          📋 커리큘럼 콘텐츠 린트 검수
        </h2>
        <div className="flex gap-3">
          <button
            onClick={runComprehensiveLint}
            disabled={state.isRunning}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            {state.isRunning ? '🔄 검수 중...' : '🚀 L1~L6 전체 검수'}
          </button>
        </div>
      </div>

      {/* CLI 명령어 표시 */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">CLI 지시문:</div>
        <code className="text-sm font-mono bg-gray-200 px-3 py-1 rounded">
          RUN "curriculum-lint": L1~L6 JSON/Firestore 스냅샷을 대상으로 ID/카운트/분류/슬롯/중복 검사 → 실패 시 목록 출력, 성공 시 "OK(레벨별 통계)" 리포트 저장.
        </code>
      </div>

      {/* 에러 표시 */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          <strong>오류:</strong> {state.error}
        </div>
      )}

      {/* 레벨별 결과 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }, (_, i) => i + 1).map(level => {
          const report = state.reports.find(r => r.level === level);
          const isRunning = state.isRunning && state.currentLevel === level;
          const isSelected = state.selectedLevel === level;
          
          return (
            <div
              key={level}
              onClick={() => !isRunning && setState(prev => ({ ...prev, selectedLevel: level }))}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-blue-500 bg-blue-50' : 
                report ? getResultColor(report.overall_result) : 
                'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Level {level}</h3>
                {isRunning ? (
                  <div className="text-gray-500">🔄 검수 중...</div>
                ) : report ? (
                  <div>
                    <div className="text-2xl mb-1">
                      {getResultIcon(report.overall_result)}
                    </div>
                    <div className="text-sm font-medium">
                      {report.overall_result}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {report.statistics.total_stages}스테이지
                    </div>
                    {report.issues_summary.errors > 0 && (
                      <div className="text-xs text-red-600">
                        {report.issues_summary.errors}개 오류
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400">검수 대기</div>
                )}
              </div>
              
              {/* 단일 레벨 재검수 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runSingleLevelLint(level);
                }}
                disabled={state.isRunning}
                className="w-full mt-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                재검수
              </button>
            </div>
          );
        })}
      </div>

      {/* 전체 요약 통계 */}
      {state.reports.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📊 전체 요약 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {state.reports.filter(r => r.overall_result === 'PASS').length}
              </div>
              <div className="text-sm text-gray-600">통과</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {state.reports.filter(r => r.overall_result === 'FAIL').length}
              </div>
              <div className="text-sm text-gray-600">실패</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {state.reports.filter(r => r.overall_result === 'WARNING').length}
              </div>
              <div className="text-sm text-gray-600">경고</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {state.reports.reduce((sum, r) => sum + r.statistics.total_stages, 0)}
              </div>
              <div className="text-sm text-gray-600">총 스테이지</div>
            </div>
          </div>
        </div>
      )}

      {/* 선택된 레벨 상세 결과 */}
      {selectedReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold">
              Level {selectedReport.level} 상세 검수 결과
            </h3>
            <span className={`px-4 py-2 rounded-full font-semibold ${getResultColor(selectedReport.overall_result)}`}>
              {getResultIcon(selectedReport.overall_result)} {selectedReport.overall_result}
            </span>
          </div>

          {/* 통계 섹션 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-semibold text-gray-700">스테이지</div>
              <div className="text-2xl font-bold">{selectedReport.statistics.total_stages}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">페이즈</div>
              <div className="text-2xl font-bold">{selectedReport.statistics.total_phases}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">중복 발견</div>
              <div className="text-2xl font-bold text-red-600">{selectedReport.statistics.duplicates_found}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">크로스 레벨 경고</div>
              <div className="text-2xl font-bold text-yellow-600">{selectedReport.statistics.cross_level_warnings}</div>
            </div>
          </div>

          {/* 분류별 통계 */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-semibold mb-3">📂 분류별 통계</h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(selectedReport.statistics.classifications).map(([classification, count]) => (
                <div key={classification} className="text-center">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{classification}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 슬롯 통계 */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold mb-3">🎯 슬롯 통계</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{selectedReport.statistics.slot_stats.min}</div>
                <div className="text-sm text-gray-600">최소</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{selectedReport.statistics.slot_stats.max}</div>
                <div className="text-sm text-gray-600">최대</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{selectedReport.statistics.slot_stats.avg}</div>
                <div className="text-sm text-gray-600">평균</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{selectedReport.statistics.slot_stats.stages_with_slots}</div>
                <div className="text-sm text-gray-600">슬롯 보유 스테이지</div>
              </div>
            </div>
          </div>

          {/* 규칙별 결과 */}
          <div className="space-y-4">
            <h4 className="text-xl font-semibold">🔍 규칙별 검수 결과</h4>
            {Object.entries(selectedReport.rule_results).map(([ruleName, result]) => (
              <div
                key={ruleName}
                className={`p-4 border rounded-lg ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-lg">
                    {result.passed ? '✅' : '❌'} {ruleName}
                  </h5>
                  <span className={`px-3 py-1 rounded font-medium ${result.passed ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    {result.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {result.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-medium text-gray-700">이슈 목록:</div>
                    {result.issues.map((issue, index) => (
                      <div key={index} className="p-3 bg-white border rounded flex items-start gap-3">
                        <span className="text-lg">{getIssueIcon(issue.level)}</span>
                        <div className="flex-1">
                          <div className="font-medium">{issue.message}</div>
                          {issue.stage_id && (
                            <div className="text-sm text-gray-600 mt-1">
                              스테이지: <code className="bg-gray-200 px-2 py-1 rounded">{issue.stage_id}</code>
                            </div>
                          )}
                          {issue.details && (
                            <details className="mt-2">
                              <summary className="text-sm text-blue-600 cursor-pointer">상세 정보</summary>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(issue.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.issues.length === 0 && (
                  <div className="text-green-600 font-medium">✨ 이슈가 발견되지 않았습니다.</div>
                )}
              </div>
            ))}
          </div>

          {/* 텍스트 리포트 다운로드 */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold mb-3">📄 리포트 내보내기</h4>
            <button
              onClick={() => {
                const textReport = curriculumLintService.formatReportAsText(selectedReport);
                const blob = new Blob([textReport], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `curriculum-lint-L${selectedReport.level}-${new Date().getTime()}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📥 텍스트 리포트 다운로드
            </button>
          </div>
        </div>
      )}

      {/* 검수 기준 설명 */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold mb-3">📋 검수 기준 (필수)</h4>
        <ul className="text-sm space-y-2">
          <li><strong>ID 형식:</strong> LvX-P[1..6]-S[01..] / 브릿지 LvX-A[2|4|6]-S[08|16|24]</li>
          <li><strong>카운트:</strong> Phases=6, Stages=레벨값 일치(예: L6=24)</li>
          <li><strong>분류 집계:</strong> core:18 / bridge:3 / optional:3</li>
          <li><strong>슬롯 수:</strong> 스테이지당 코어 표현 5–8개</li>
          <li><strong>중복:</strong> 같은 레벨 내 표현 중복 금지(레마 기준), 상위 레벨과의 불필요 중복 경고</li>
        </ul>
      </div>
    </div>
  );
};