#!/usr/bin/env node
/**
 * 마이그레이션 상태 확인 및 관리 도구
 * 사용법: 
 *   node utils/migration-status.js status
 *   node utils/migration-status.js unlock
 *   node utils/migration-status.js reset
 */

const fs = require('fs');

const STATE_FILE = '.migrate_state.json';
const LOCK_FILE = '.batch_migrate.lock';
const LOG_FILE = '.batch_migrate.log';

const command = process.argv[2];

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

function showStatus() {
  console.log('🔍 Migration Status Report');
  console.log('=' .repeat(50));

  // 락 파일 상태
  if (fs.existsSync(LOCK_FILE)) {
    const lockContent = fs.readFileSync(LOCK_FILE, 'utf8').trim();
    console.log('🔒 LOCKED:', lockContent);
  } else {
    console.log('🔓 No active locks');
  }

  // 상태 파일 확인
  if (!fs.existsSync(STATE_FILE)) {
    console.log('📄 No state file found - no previous migrations');
    return;
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  
  console.log('📊 Migration State:');
  console.log(`   Started: ${formatDate(state.startedAt)}`);
  if (state.resumedAt) {
    console.log(`   Last resumed: ${formatDate(state.resumedAt)}`);
  }
  if (state.completedAt) {
    console.log(`   Completed: ${formatDate(state.completedAt)}`);
  }
  console.log(`   Last updated: ${formatDate(state.lastUpdated)}`);
  
  const doneCount = Object.keys(state.done).length;
  const failedCount = Object.keys(state.failed).length;
  
  console.log(`   ✅ Completed: ${doneCount} files`);
  console.log(`   ❌ Failed: ${failedCount} files`);

  if (doneCount > 0) {
    console.log('\n✅ Successfully migrated files:');
    for (const [file, info] of Object.entries(state.done)) {
      const mode = info.mode === 'dry-run' ? '(dry-run)' : '';
      console.log(`   - ${file} ${mode} - ${formatDate(info.timestamp)}`);
    }
  }

  if (failedCount > 0) {
    console.log('\n❌ Failed migrations:');
    for (const [file, info] of Object.entries(state.failed)) {
      console.log(`   - ${file}`);
      console.log(`     Step: ${info.step}`);
      console.log(`     Error: ${info.error}`);
      console.log(`     Time: ${formatDate(info.timestamp)}`);
    }
  }

  // 로그 파일 정보
  if (fs.existsSync(LOG_FILE)) {
    const stats = fs.statSync(LOG_FILE);
    console.log(`\n📝 Log file: ${LOG_FILE} (${Math.round(stats.size/1024)}KB)`);
    console.log('   Last 5 entries:');
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logContent.trim().split('\n').slice(-5);
    lines.forEach(line => console.log(`   ${line}`));
  }
}

function unlock() {
  if (!fs.existsSync(LOCK_FILE)) {
    console.log('🔓 No lock file found');
    return;
  }
  
  const lockContent = fs.readFileSync(LOCK_FILE, 'utf8').trim();
  console.log(`🔒 Current lock: ${lockContent}`);
  
  fs.unlinkSync(LOCK_FILE);
  console.log('✅ Lock file removed');
}

function reset() {
  console.log('⚠️  This will reset all migration progress!');
  
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    console.log('✅ State file removed');
  }
  
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
    console.log('✅ Lock file removed');
  }
  
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
    console.log('✅ Log file removed');
  }
  
  console.log('🆕 Migration state reset - next run will start fresh');
}

// 명령 실행
switch (command) {
  case 'status':
    showStatus();
    break;
  case 'unlock':
    unlock();
    break;
  case 'reset':
    reset();
    break;
  default:
    console.log('Usage:');
    console.log('  node utils/migration-status.js status  - Show current migration status');
    console.log('  node utils/migration-status.js unlock  - Remove lock file');
    console.log('  node utils/migration-status.js reset   - Reset all migration progress');
    process.exit(1);
}