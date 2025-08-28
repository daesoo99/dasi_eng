#!/usr/bin/env node
/**
 * 멱등 + 검증 내장 + 원자적 쓰기 마이그레이터
 * 사용법: node utils/safe-migrator.js --file <path> [--dry-run] [--out <tmpPath>]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateStage, validatePhase, validateLevel, validateCoreExpression } = require('./schemas/ajv-validators');

// JSON 검증 오류 로깅 함수 (교정 포인트: JSON 포맷으로 원인 재현 가능)
function logValidationError(context, errors, data = null) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context: context,
    errors: errors,
    data: data ? JSON.stringify(data, null, 2) : null,
    source: args.file
  };
  
  const logDir = 'docs/logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}-validation-errors.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');
  
  console.error(`❌ ${context}: ${JSON.stringify(errors)}`);
  console.error(`📝 Error logged to: ${logFile}`);
}

// 명령행 인자 파싱 (간단한 방식)
const args = Object.fromEntries(process.argv.slice(2).map((v, i, arr) => {
  if (v.startsWith('--')) {
    const key = v.replace('--', '');
    const next = arr[i + 1];
    const value = (next && !next.startsWith('--')) ? next : true;
    return [key, value];
  }
  return [];
}).filter(Boolean));

const src = args.file;
if (!src) { 
  console.error('❌ missing --file parameter'); 
  process.exit(2); 
}

if (!fs.existsSync(src)) {
  console.error(`❌ file not found: ${src}`);
  process.exit(2);
}

const DRY = !!args['dry-run'];
const OUT = args.out || (DRY ? `.tmp.${path.basename(src)}` : src);
const FORCE = !!args.force;

console.log(`🔄 Safe Migrator v2.0 - ${DRY ? 'DRY-RUN' : 'LIVE'} mode`);
console.log(`📄 Source: ${src}`);
console.log(`📄 Target: ${OUT}`);

let json;
try {
  json = JSON.parse(fs.readFileSync(src, 'utf8'));
} catch (error) {
  console.error(`❌ JSON parse failed: ${error.message}`);
  process.exit(1);
}

// ---------- 변환 로직 (멱등) ----------

/**
 * 코어 표현을 스키마에 맞게 정리 (멱등)
 */
function sanitizeCoreExpression(expr) {
  if (!expr || typeof expr !== 'object') return null;
  
  const allowed = {
    english: expr.english || '',
    korean: expr.korean || '',
    phoneticKorean: expr.phoneticKorean || '',
    grammarPoint: expr.grammarPoint || '',
    version: expr.version || '1.0.0'
  };

  // 선택 필드들
  if (typeof expr.difficulty === 'number' && expr.difficulty >= 1 && expr.difficulty <= 5) {
    allowed.difficulty = expr.difficulty;
  } else {
    allowed.difficulty = 1;
  }

  if (typeof expr.ipa === 'string' && expr.ipa.length > 0) {
    allowed.ipa = expr.ipa;
  }

  // 필수 필드 검증
  if (!allowed.english || !allowed.korean || !allowed.phoneticKorean || !allowed.grammarPoint) {
    return null; // 불완전한 데이터는 제외
  }

  return allowed;
}

/**
 * 스테이지를 스키마에 맞게 정리 (멱등)
 * 교정: allowedStageFields 단일 객체 사용, 변수 혼용 금지
 */
function sanitizeStage(stage) {
  if (!stage || typeof stage !== 'object') return null;
  
  // 허용된 필드만 포함한 단일 객체 (교정 포인트)
  const allowedStageFields = {
    stageId: stage.stageId || '',
    stageTitle: stage.stageTitle || '',
    description: stage.description || '',
    grammarFocus: stage.grammarFocus || '',
    keyPatterns: Array.isArray(stage.keyPatterns) ? stage.keyPatterns : [],
    version: stage.version || '1.0.0'
  };

  // stageTitle 최소 길이 보장
  if (allowedStageFields.stageTitle.length < 5) {
    allowedStageFields.stageTitle = allowedStageFields.stageTitle + ' 학습';
  }

  // 선택 필드들
  allowedStageFields.estimatedMinutes = (typeof stage.estimatedMinutes === 'number') ? stage.estimatedMinutes : 30;
  
  if (typeof stage.targetAccuracy === 'number' && stage.targetAccuracy >= 0.5 && stage.targetAccuracy <= 1.0) {
    allowedStageFields.targetAccuracy = stage.targetAccuracy;
  }

  if (Array.isArray(stage.prerequisites)) {
    allowedStageFields.prerequisites = stage.prerequisites.filter(p => typeof p === 'string');
  }

  // 코어 표현 처리
  if (Array.isArray(stage.coreExpressions)) {
    const sanitized = stage.coreExpressions
      .map(sanitizeCoreExpression)
      .filter(Boolean);
    
    if (sanitized.length >= 3) { // 최소 3개 필요
      allowedStageFields.coreExpressions = sanitized;
    } else {
      console.warn(`⚠️  Stage ${stage.stageId}: insufficient core expressions (${sanitized.length})`);
      return null;
    }
  } else {
    console.warn(`⚠️  Stage ${stage.stageId}: missing coreExpressions`);
    return null;
  }

  // 항상 allowedStageFields 반환 (교정 포인트)
  return allowedStageFields;
}

/**
 * 단계(Phase)를 스키마에 맞게 정리 (멱등)
 */
function sanitizePhase(phase) {
  if (!phase || typeof phase !== 'object') return null;
  
  const allowed = {
    phaseId: phase.phaseId || '',
    phaseTitle: phase.phaseTitle || '',
    phaseDescription: phase.phaseDescription || '',
    learningObjectives: Array.isArray(phase.learningObjectives) ? 
      phase.learningObjectives : [`${phase.phaseTitle || 'Unknown'} 학습 목표`],
    version: phase.version || '1.0.0'
  };

  // 선택 필드들
  if (typeof phase.estimatedHours === 'number') {
    allowed.estimatedHours = phase.estimatedHours;
  }

  if (typeof phase.difficultyLevel === 'number' && phase.difficultyLevel >= 1 && phase.difficultyLevel <= 10) {
    allowed.difficultyLevel = phase.difficultyLevel;
  }

  if (phase.completionCriteria && typeof phase.completionCriteria === 'object') {
    allowed.completionCriteria = phase.completionCriteria;
  }

  // 스테이지 처리
  if (Array.isArray(phase.stages)) {
    const sanitized = phase.stages
      .map(sanitizeStage)
      .filter(Boolean);
    
    if (sanitized.length >= 2) { // 최소 2개 필요
      allowed.stages = sanitized;
      
      // estimatedHours 자동 계산 (없는 경우)
      if (!allowed.estimatedHours) {
        allowed.estimatedHours = Math.round(sanitized.length * 2.5 * 10) / 10;
      }
    } else {
      console.warn(`⚠️  Phase ${phase.phaseId}: insufficient stages (${sanitized.length})`);
      return null;
    }
  } else {
    console.warn(`⚠️  Phase ${phase.phaseId}: missing stages`);
    return null;
  }

  return allowed;
}

/**
 * 레벨 전체를 정리 (멱등)
 */
function sanitizeLevel(level) {
  if (!level || typeof level !== 'object') return null;
  
  // levelInfo 처리
  const levelInfo = level.levelInfo || {};
  const sanitizedLevelInfo = {
    level: levelInfo.level || 1,
    title: levelInfo.title || 'Untitled Level',
    description: levelInfo.description || 'Level description',
    totalPhases: 0, // 계산될 예정
    totalStages: 0, // 계산될 예정
    estimatedHours: levelInfo.estimatedHours || 0,
    version: levelInfo.version || '1.0.0'
  };

  // targetCEFR 자동 설정
  if (!levelInfo.targetCEFR) {
    const cefrMap = {
      1: 'A1', 2: 'A1', 3: 'A2', 4: 'A2', 5: 'B1',
      6: 'B1', 7: 'B2', 8: 'B2', 9: 'C1', 10: 'C2'
    };
    sanitizedLevelInfo.targetCEFR = cefrMap[sanitizedLevelInfo.level] || 'A1';
  } else {
    sanitizedLevelInfo.targetCEFR = levelInfo.targetCEFR;
  }

  // phases 처리
  let sanitizedPhases = [];
  if (Array.isArray(level.phases)) {
    sanitizedPhases = level.phases
      .map(sanitizePhase)
      .filter(Boolean);
  }

  if (sanitizedPhases.length < 3) {
    console.warn(`⚠️  Level ${sanitizedLevelInfo.level}: insufficient phases (${sanitizedPhases.length})`);
    if (!FORCE) {
      throw new Error('Insufficient phases - use --force to proceed');
    }
  }

  // 통계 업데이트
  sanitizedLevelInfo.totalPhases = sanitizedPhases.length;
  sanitizedLevelInfo.totalStages = sanitizedPhases.reduce((sum, p) => sum + p.stages.length, 0);

  const result = {
    levelInfo: sanitizedLevelInfo,
    phases: sanitizedPhases
  };

  // metadata 추가
  result.metadata = level.metadata || {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "DASI System",
    tags: ["beginner"],
    changeLog: [
      {
        version: "1.0.0",
        date: new Date().toISOString().split('T')[0],
        changes: ["Safe migration applied", "Schema compliance enforced"]
      }
    ]
  };

  // validation 필드 추가 (체크섬 제외한 데이터로 계산)
  const dataForChecksum = { levelInfo: result.levelInfo, phases: result.phases, metadata: result.metadata };
  result.validation = {
    schemaVersion: "1.0.0",
    validatedAt: new Date().toISOString(),
    checksum: crypto.createHash('sha256').update(JSON.stringify(dataForChecksum, null, 0)).digest('hex')
  };

  return result;
}

// ---------- 변환 실행 ----------

let transformed;
try {
  console.log('🔍 Starting transformation...');
  transformed = sanitizeLevel(json);
  
  if (!transformed) {
    console.error('❌ Transformation failed - invalid input data');
    process.exit(1);
  }
  
  console.log(`✨ Transformation complete: ${transformed.levelInfo.totalPhases} phases, ${transformed.levelInfo.totalStages} stages`);
} catch (error) {
  console.error(`❌ Transformation failed: ${error.message}`);
  process.exit(1);
}

// ---------- 스키마 검증 ----------

try {
  console.log('🔍 Schema validation...');
  
  // 각 코어 표현 검증
  let totalExpressions = 0;
  for (const phase of transformed.phases) {
    for (const stage of phase.stages) {
      for (const expr of stage.coreExpressions) {
        if (!validateCoreExpression(expr)) {
          logValidationError('Core expression validation', validateCoreExpression.errors, expr);
          throw new Error(`Core expression validation failed: ${JSON.stringify(validateCoreExpression.errors)}`);
        }
        totalExpressions++;
      }
      if (!validateStage(stage)) {
        logValidationError('Stage validation', validateStage.errors, stage);
        throw new Error(`Stage validation failed: ${JSON.stringify(validateStage.errors)}`);
      }
    }
    if (!validatePhase(phase)) {
      logValidationError('Phase validation', validatePhase.errors, phase);
      throw new Error(`Phase validation failed: ${JSON.stringify(validatePhase.errors)}`);
    }
  }
  
  if (!validateLevel(transformed)) {
    logValidationError('Level validation', validateLevel.errors, transformed);
    throw new Error(`Level validation failed: ${JSON.stringify(validateLevel.errors)}`);
  }
  
  console.log(`✅ Schema validation passed: ${totalExpressions} expressions validated`);
} catch (error) {
  console.error(`❌ Schema validation failed: ${error.message}`);
  process.exit(1);
}

// ---------- 쓰기 ----------

if (DRY) {
  fs.writeFileSync(OUT, JSON.stringify(transformed, null, 2));
  console.log(`✅ DRY-RUN complete: wrote ${OUT}`);
  process.exit(0);
}

// 원자적 쓰기: 임시파일→검증→백업→교체
const tmp = `${OUT}.tmp.${Date.now()}`;
const bak = `${src}.bak.${Date.now()}`;

try {
  // 1. 임시파일에 쓰기
  fs.writeFileSync(tmp, JSON.stringify(transformed, null, 2));
  console.log(`📝 Wrote temp file: ${tmp}`);
  
  // 2. 임시파일 다시 한번 검증 (원자성 보장)
  const tempData = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  if (!validateLevel(tempData)) {
    throw new Error('Final validation of temp file failed');
  }
  
  // 3. 백업 생성 (원본 덮어쓸 때만) - Node.js fs.copyFileSync 표준화 (교정 포인트)
  if (OUT === src) {
    fs.copyFileSync(src, bak);
    console.log(`💾 Backup created: ${bak}`);
  }
  
  // 4. 원자적 교체
  fs.renameSync(tmp, OUT);
  console.log(`✅ SUCCESS: replaced ${OUT}${OUT === src ? ` (backup: ${bak})` : ''}`);
  
} catch (error) {
  // 실패 시 정리
  if (fs.existsSync(tmp)) {
    fs.unlinkSync(tmp);
  }
  console.error(`❌ Atomic write failed: ${error.message}`);
  process.exit(1);
}