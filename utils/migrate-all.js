#!/usr/bin/env node
/**
 * 체크포인트 + 재개 가능한 배치 마이그레이터
 * 사용법: node utils/migrate-all.js [--resume] [--force] [--dry-run]
 * 
 * 중단되어도 다음 실행 시 중단된 지점부터 재개
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// 설정
const FILE_INDEX = 'patterns/file-index.json';
const STATE_FILE = '.migrate_state.json';
const LOCK_FILE = '.batch_migrate.lock';
const LOG_FILE = '.batch_migrate.log';

// 명령행 인자
const RESUME = process.argv.includes('--resume');
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// 로그 함수
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(LOG_FILE, logEntry + '\n');
}

// 정리 함수
function cleanup() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
    log('🔓 Lock file removed');
  }
}

// 종료 시 정리
process.on('exit', cleanup);
process.on('SIGINT', () => {
  log('⛔ Interrupted by user');
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  log('⛔ Terminated');
  cleanup();
  process.exit(143);
});

// 에러 핸들링
process.on('uncaughtException', (error) => {
  log(`💥 Uncaught exception: ${error.message}`);
  cleanup();
  process.exit(1);
});

// 메인 실행
async function main() {
  log(`🚀 Batch Migrator v1.0 - ${DRY_RUN ? 'DRY-RUN' : 'LIVE'} mode`);
  
  // 락 파일 체크
  if (fs.existsSync(LOCK_FILE)) {
    const lockContent = fs.readFileSync(LOCK_FILE, 'utf8').trim();
    log(`❌ Another migration is running: ${lockContent}`);
    if (!FORCE) {
      log('Use --force to override (dangerous!)');
      process.exit(1);
    }
    log('⚠️  --force specified, removing lock');
    fs.unlinkSync(LOCK_FILE);
  }

  // 파일 목록 로드
  if (!fs.existsSync(FILE_INDEX)) {
    log(`❌ File index not found: ${FILE_INDEX}`);
    process.exit(1);
  }

  const files = JSON.parse(fs.readFileSync(FILE_INDEX, 'utf8'));
  log(`📊 Found ${files.length} files to migrate`);

  // 상태 로드
  let state = { 
    done: {}, 
    failed: {}, 
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString() 
  };
  
  if (fs.existsSync(STATE_FILE)) {
    const existingState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (RESUME) {
      state = existingState;
      state.resumedAt = new Date().toISOString();
      log(`🔄 Resuming from checkpoint: ${Object.keys(state.done).length} already done`);
    } else {
      log('🆕 Starting fresh (use --resume to continue previous session)');
    }
  }

  // 락 설정
  const lockInfo = `PID: ${process.pid}, Started: ${new Date().toISOString()}`;
  fs.writeFileSync(LOCK_FILE, lockInfo);
  log('🔒 Lock acquired');

  // 상태 저장 함수
  function saveState() {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      // 이미 완료된 파일 스킵
      if (state.done[file]) {
        log(`⏭️  Skip (done): ${file}`);
        skipped++;
        continue;
      }

      // 파일 존재 확인
      if (!fs.existsSync(file)) {
        log(`⚠️  File not found, skipping: ${file}`);
        continue;
      }

      log(`🔄 Processing: ${file}`);

      const tempFile = `.tmp.${path.basename(file)}`;
      
      // 1단계: 드라이런 변환
      log(`  1️⃣  Dry-run transformation...`);
      try {
        execFileSync('node', [
          'utils/safe-migrator.js',
          '--file', file,
          '--dry-run',
          '--out', tempFile
        ], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 60000 // 60초 타임아웃
        });
      } catch (error) {
        log(`  ❌ Transformation failed: ${error.message}`);
        state.failed[file] = {
          step: 'transformation',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        saveState();
        errors++;
        continue;
      }

      // 2단계: 임시 파일 검증
      log(`  2️⃣  Validating temp file...`);
      try {
        execFileSync('node', [
          'utils/validate-curriculum.js',
          '--file', tempFile,
          '--strict',
          '--quiet'
        ], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000
        });
      } catch (error) {
        log(`  ❌ Validation failed: ${error.message}`);
        // 임시 파일 정리
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        state.failed[file] = {
          step: 'validation',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        saveState();
        errors++;
        continue;
      }

      // 3단계: 실제 적용 (드라이런 모드가 아닐 때만)
      if (!DRY_RUN) {
        log(`  3️⃣  Applying migration...`);
        try {
          execFileSync('node', [
            'utils/safe-migrator.js',
            '--file', file
          ], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 60000
          });
        } catch (error) {
          log(`  ❌ Migration failed: ${error.message}`);
          state.failed[file] = {
            step: 'migration',
            error: error.message,
            timestamp: new Date().toISOString()
          };
          saveState();
          errors++;
          continue;
        }
      } else {
        log(`  3️⃣  DRY-RUN: Skipping actual migration`);
      }

      // 임시 파일 정리
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      // 성공 기록
      state.done[file] = {
        timestamp: new Date().toISOString(),
        mode: DRY_RUN ? 'dry-run' : 'live'
      };
      
      // 실패 기록에서 제거 (재시도 성공 시)
      if (state.failed[file]) {
        delete state.failed[file];
      }

      processed++;
      log(`  ✅ Success: ${file}`);

      // 상태 저장 (각 파일마다)
      saveState();

      // 진행률 표시
      const total = files.length;
      const done = Object.keys(state.done).length;
      const failed = Object.keys(state.failed).length;
      log(`📊 Progress: ${done}/${total} done, ${failed} failed`);

    } catch (error) {
      log(`💥 Unexpected error processing ${file}: ${error.message}`);
      errors++;
      continue;
    }
  }

  // 최종 정리
  cleanup();

  // 최종 리포트
  const totalDone = Object.keys(state.done).length;
  const totalFailed = Object.keys(state.failed).length;
  
  log('📋 Final Report:');
  log(`  📊 Total files: ${files.length}`);
  log(`  ✅ Successfully processed: ${processed}`);
  log(`  ⏭️  Skipped (already done): ${skipped}`);
  log(`  ❌ Failed: ${errors}`);
  log(`  🎯 Total completed: ${totalDone}`);
  log(`  💔 Total failed: ${totalFailed}`);

  if (totalFailed > 0) {
    log('📝 Failed files:');
    for (const [file, info] of Object.entries(state.failed)) {
      log(`  - ${file}: ${info.step} failed - ${info.error}`);
    }
  }

  // 최종 상태 저장
  state.completedAt = new Date().toISOString();
  saveState();

  const exitCode = totalFailed > 0 ? 1 : 0;
  log(`🏁 Batch migration ${exitCode === 0 ? 'completed successfully' : 'completed with errors'}`);
  process.exit(exitCode);
}

// 실행
main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  cleanup();
  process.exit(1);
});