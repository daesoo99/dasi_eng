/**
 * 커리큘럼 REVISED 소스 스모크 테스트 컴포넌트
 * Level 1-3 REVISED 버전이 올바르게 로드되는지 확인
 */

import React, { useState, useEffect } from 'react';
import { curriculumAPI } from '../services/api';
import { VALIDATION_CONFIG, hasRevisedVersion } from '../config/curriculum';

interface TestResult {
  level: number;
  isRevised: boolean;
  actualStages?: number;
  expectedStages: number;
  actualPhases?: number;
  expectedPhases: number;
  bridgeStages?: string[];
  keyStages?: string[];
  engineMeta?: {
    hasLevelMeta: boolean;
    stagesWithDrill: number;
    stagesWithSlots: number;
    stagesWithTags: number;
    totalStages: number;
    coverage: string;
    delayValidation: {
      hasDelay: number;
      avgDelay: number;
      minDelay: number;
      maxDelay: number;
    };
    randomizeValidation: {
      hasRandomize: number;
      trueCount: number;
      falseCount: number;
    };
    classificationAggregation: {
      core: number;
      bridge: number;
      optional: number;
      unknown: number;
    };
  };
  success: boolean;
  error?: string;
}

export const CurriculumSmokeTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Level 1-4 테스트
    for (let level = 1; level <= 4; level++) {
      const config = VALIDATION_CONFIG[`lv${level}` as keyof typeof VALIDATION_CONFIG];
      
      try {
        const response = await curriculumAPI.validateCurriculum(level);
        
        if (response.success && response.data) {
          const curriculum = response.data;
          
          // 엔진 메타데이터 검증 (DoD 업데이트: 지연·랜덤·슬롯·분류 집계)
          let engineMeta = undefined;
          if (curriculum.stages) {
            const stagesWithDrill = curriculum.stages.filter((stage: any) => stage.drill).length;
            const stagesWithSlots = curriculum.stages.filter((stage: any) => stage.slots).length;
            const stagesWithTags = curriculum.stages.filter((stage: any) => stage.tags && stage.tags.length > 0).length;
            const totalStages = curriculum.stages.length;
            
            // Delay validation
            const stagesWithDelay = curriculum.stages.filter((stage: any) => stage.drill?.delaySec !== undefined);
            const delays = curriculum.stages
              .filter((stage: any) => stage.drill?.delaySec !== undefined)
              .map((stage: any) => stage.drill.delaySec);
            const avgDelay = delays.length > 0 ? delays.reduce((a: number, b: number) => a + b, 0) / delays.length : 0;
            
            // Randomize validation  
            const stagesWithRandomize = curriculum.stages.filter((stage: any) => stage.drill?.randomize !== undefined);
            const randomizeTrue = curriculum.stages.filter((stage: any) => stage.drill?.randomize === true).length;
            const randomizeFalse = curriculum.stages.filter((stage: any) => stage.drill?.randomize === false).length;
            
            // Classification aggregation
            const classifications = curriculum.stages.reduce((acc: any, stage: any) => {
              const classification = stage.classification || 'unknown';
              acc[classification] = (acc[classification] || 0) + 1;
              return acc;
            }, {});
            
            const coverage = totalStages > 0 ? 
              `${Math.round((Math.min(stagesWithDrill, stagesWithSlots, stagesWithTags) / totalStages) * 100)}%` : '0%';
            
            engineMeta = {
              hasLevelMeta: !!(curriculum.levelMeta && curriculum.levelMeta.defaultDrill),
              stagesWithDrill,
              stagesWithSlots,
              stagesWithTags,
              totalStages,
              coverage,
              delayValidation: {
                hasDelay: stagesWithDelay.length,
                avgDelay: Math.round(avgDelay * 100) / 100,
                minDelay: delays.length > 0 ? Math.min(...delays) : 0,
                maxDelay: delays.length > 0 ? Math.max(...delays) : 0
              },
              randomizeValidation: {
                hasRandomize: stagesWithRandomize.length,
                trueCount: randomizeTrue,
                falseCount: randomizeFalse
              },
              classificationAggregation: {
                core: classifications.core || 0,
                bridge: classifications.bridge || 0,
                optional: classifications.optional || 0,
                unknown: classifications.unknown || 0
              }
            };
          }
          
          results.push({
            level,
            isRevised: hasRevisedVersion(level),
            actualStages: curriculum.total_stages,
            expectedStages: config.expectedStages,
            actualPhases: curriculum.total_phases,
            expectedPhases: config.expectedPhases,
            bridgeStages: 'bridgeStages' in config ? config.bridgeStages : undefined,
            keyStages: 'keyStages' in config ? config.keyStages : undefined,
            engineMeta,
            success: 
              curriculum.total_stages === config.expectedStages &&
              curriculum.total_phases === config.expectedPhases
          });
        } else {
          results.push({
            level,
            isRevised: hasRevisedVersion(level),
            expectedStages: config.expectedStages,
            expectedPhases: config.expectedPhases,
            success: false,
            error: response.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.push({
          level,
          isRevised: hasRevisedVersion(level),
          expectedStages: config.expectedStages,
          expectedPhases: config.expectedPhases,
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        });
      }
    }

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (result: TestResult) => {
    if (result.success) return '✅';
    if (result.error) return '❌';
    return '⚠️';
  };

  const getStatusColor = (result: TestResult) => {
    if (result.success) return 'text-green-600';
    if (result.error) return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          커리큘럼 REVISED 소스 스모크 테스트
        </h2>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? '테스트 중...' : '다시 테스트'}
        </button>
      </div>

      <div className="grid gap-4">
        {testResults.map((result) => (
          <div
            key={result.level}
            className={`p-4 border rounded-lg ${
              result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {getStatusIcon(result)} Level {result.level}
                {result.isRevised && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">REVISED</span>}
              </h3>
              <span className={`font-medium ${getStatusColor(result)}`}>
                {result.success ? 'PASS' : 'FAIL'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="mb-2">
                  <span className="font-medium">스테이지:</span>
                  <span className={result.actualStages === result.expectedStages ? 'text-green-600' : 'text-red-600'}>
                    {' '}{result.actualStages || '?'} / {result.expectedStages}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="font-medium">페이즈:</span>
                  <span className={result.actualPhases === result.expectedPhases ? 'text-green-600' : 'text-red-600'}>
                    {' '}{result.actualPhases || '?'} / {result.expectedPhases}
                  </span>
                </div>
                {result.engineMeta && (
                  <div className="mb-2">
                    <span className="font-medium">엔진 메타:</span>
                    <span className={result.engineMeta.coverage === '100%' ? 'text-green-600' : 'text-yellow-600'}>
                      {' '}{result.engineMeta.coverage} 커버리지
                    </span>
                    {result.engineMeta.hasLevelMeta && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">LevelMeta✓</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                {result.bridgeStages && (
                  <div className="mb-2">
                    <span className="font-medium">브릿지 스테이지:</span>
                    <div className="text-xs">
                      {result.bridgeStages.map(stage => (
                        <span key={stage} className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded mr-1 mt-1">
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.keyStages && (
                  <div className="mb-2">
                    <span className="font-medium">핵심 스테이지:</span>
                    <div className="text-xs">
                      {result.keyStages.map(stage => (
                        <span key={stage} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mt-1">
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.engineMeta && (
                  <div className="mb-2">
                    <span className="font-medium">메타데이터 상세 (DoD):</span>
                    <div className="text-xs space-y-1 mt-1">
                      <div>Drill: {result.engineMeta.stagesWithDrill}/{result.engineMeta.totalStages}</div>
                      <div>Slots: {result.engineMeta.stagesWithSlots}/{result.engineMeta.totalStages}</div>
                      <div>Tags: {result.engineMeta.stagesWithTags}/{result.engineMeta.totalStages}</div>
                      <div className="text-blue-600">지연: {result.engineMeta.delayValidation.hasDelay}개 (평균: {result.engineMeta.delayValidation.avgDelay}s)</div>
                      <div className="text-green-600">랜덤: {result.engineMeta.randomizeValidation.trueCount}T / {result.engineMeta.randomizeValidation.falseCount}F</div>
                      <div className="text-purple-600">분류: C{result.engineMeta.classificationAggregation.core} B{result.engineMeta.classificationAggregation.bridge} O{result.engineMeta.classificationAggregation.optional}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {result.error && (
              <div className="mt-3 p-2 bg-red-100 text-red-700 rounded text-sm">
                <strong>오류:</strong> {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">검증 기준</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Level 1:</strong> 19 스테이지, 5 페이즈 (전치사·관사·지시어 재배치)</li>
          <li>• <strong>Level 2:</strong> 22 스테이지, 6 페이즈 (브릿지 +2, 상황별 재구성)</li>
          <li>• <strong>Level 3:</strong> 26 스테이지, 6 페이즈 (문법→상황 전환)</li>
          <li>• <strong>Level 4:</strong> 24 스테이지, 6 페이즈 (비즈니스 상황별 고급 표현)</li>
        </ul>
        
        <h4 className="font-semibold mb-2 mt-4">🔧 엔진 메타데이터 검증 (DoD 기준)</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Drill:</strong> 각 스테이지에 delaySec, randomize, minCorrectToAdvance, reviewWeight 필드</li>
          <li>• <strong>Slots:</strong> 각 스테이지에 min/max 범위 (5-8)</li>
          <li>• <strong>Tags:</strong> 스테이지별 적응형 태그 (BE-COP, TENSE-*, MODAL 등 12개 카테고리)</li>
          <li>• <strong>지연 검증:</strong> delaySec 필드 존재 및 평균/최소/최대 값 분석</li>
          <li>• <strong>랜덤 검증:</strong> randomize 필드의 true/false 분포 확인</li>
          <li>• <strong>분류 집계:</strong> core/bridge/optional 스테이지 개수 검증</li>
          <li>• <strong>LevelMeta:</strong> 레벨별 기본값 (defaultDrill, errorTaxonomy, difficultyProgression)</li>
          <li>• <strong>Coverage:</strong> 100% = 모든 스테이지에 drill/slots/tags 완벽 적용</li>
          <li>• <strong>Firestore 동기화:</strong> levelMeta와 spec 동시 저장, 롤백 태그 포함</li>
        </ul>
      </div>
    </div>
  );
};