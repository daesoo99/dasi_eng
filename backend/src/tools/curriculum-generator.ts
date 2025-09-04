#!/usr/bin/env ts-node

/**
 * 커리큘럼 생성 CLI 도구
 * @description 명령줄에서 커리큘럼 생성 시스템을 사용할 수 있는 도구
 */

import { curriculumApp } from '../app/CurriculumGenerationApp';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    // 환경 설정
    const environment = process.env.NODE_ENV || 'development';
    await curriculumApp.initialize(environment);
    
    switch (command) {
      case 'generate':
        await handleGenerate(args.slice(1));
        break;
        
      case 'validate':
        await handleValidate(args.slice(1));
        break;
        
      case 'batch':
        await handleBatch(args.slice(1));
        break;
        
      case 'status':
        await handleStatus();
        break;
        
      case 'test':
        await handleTest();
        break;
        
      default:
        printUsage();
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await curriculumApp.shutdown();
  }
}

async function handleGenerate(args: string[]) {
  const stageId = args[0];
  if (!stageId) {
    console.error('❌ Stage ID required. Example: Lv1-P1-S01');
    return;
  }
  
  console.log(`🎯 Generating stage: ${stageId}`);
  
  const result = await curriculumApp.generateStage(stageId);
  
  if (result.success) {
    console.log(`✅ Success! Generated ${stageId}`);
    console.log(`📁 File: ${result.filePath}`);
    console.log(`📊 Metadata:`, JSON.stringify(result.metadata, null, 2));
  } else {
    console.log(`❌ Failed to generate ${stageId}`);
    console.log(`🐛 Errors:`, result.errors);
  }
}

async function handleValidate(args: string[]) {
  const stageId = args[0];
  if (!stageId) {
    console.error('❌ Stage ID required. Example: Lv1-P1-S01');
    return;
  }
  
  console.log(`🔍 Validating metadata for: ${stageId}`);
  
  const result = await curriculumApp.validateAndImproveMetadata(stageId);
  
  console.log(`📊 Validation Score: ${result.score}%`);
  console.log(`✅ Valid: ${result.valid}`);
  
  if (result.improvements.errors?.length > 0) {
    console.log(`🚨 Errors:`, result.improvements.errors);
  }
  
  if (result.improvements.warnings?.length > 0) {
    console.log(`⚠️  Warnings:`, result.improvements.warnings);
  }
  
  if (result.improvements.suggestions?.length > 0) {
    console.log(`💡 Suggestions:`, result.improvements.suggestions);
  }
  
  if (result.enhanced) {
    console.log(`🔧 Enhanced Metadata:`, JSON.stringify(result.enhanced, null, 2));
  }
}

async function handleBatch(args: string[]) {
  const stagePattern = args[0] || 'Lv1-P1-S01,Lv1-P1-S02';
  const stageIds = stagePattern.split(',');
  
  console.log(`🎯 Batch generating ${stageIds.length} stages: ${stageIds.join(', ')}`);
  
  const result = await curriculumApp.generateBatch(stageIds);
  
  console.log(`✅ Completed: ${result.completed.length}/${stageIds.length}`);
  console.log(`❌ Failed: ${result.failed.length}`);
  
  if (result.failed.length > 0) {
    console.log(`🚨 Failed stages: ${result.failed.join(', ')}`);
  }
}

async function handleStatus() {
  console.log('🔍 System Status Check');
  
  const status = await curriculumApp.getSystemStatus();
  
  console.log(`📋 Initialized: ${status.initialized}`);
  console.log(`🏥 Services Health:`);
  
  for (const [name, healthy] of Object.entries(status.services)) {
    console.log(`  ${healthy ? '✅' : '❌'} ${name}`);
  }
  
  if (status.configuration) {
    console.log(`📊 Configuration:`, JSON.stringify(status.configuration, null, 2));
  }
  
  if (status.statistics) {
    console.log(`📈 Statistics:`, JSON.stringify(status.statistics, null, 2));
  }
}

async function handleTest() {
  console.log('🧪 Running system tests...');
  
  // 1. 시스템 상태 확인
  const status = await curriculumApp.getSystemStatus();
  
  if (!status.initialized) {
    console.log('❌ System not initialized');
    return;
  }
  
  // 2. 테스트 스테이지 생성
  console.log('🔬 Testing stage generation...');
  const testStageId = 'Lv1-P1-S01';
  const generateResult = await curriculumApp.generateStage(testStageId);
  
  if (generateResult.success) {
    console.log('✅ Stage generation test passed');
  } else {
    console.log('❌ Stage generation test failed:', generateResult.errors);
  }
  
  // 3. 메타데이터 검증 테스트
  console.log('🔬 Testing metadata validation...');
  const validateResult = await curriculumApp.validateAndImproveMetadata(testStageId);
  
  if (validateResult.score > 70) {
    console.log(`✅ Metadata validation test passed (${validateResult.score}%)`);
  } else {
    console.log(`❌ Metadata validation test failed (${validateResult.score}%)`);
  }
  
  console.log('🎉 System tests completed');
}

function printUsage() {
  console.log(`
📚 Curriculum Generation CLI Tool

Usage:
  npm run curriculum <command> [options]

Commands:
  generate <stageId>     Generate sentences for a specific stage
                         Example: generate Lv1-P1-S01
  
  validate <stageId>     Validate and improve metadata for a stage
                         Example: validate Lv1-P1-S01
  
  batch <stageIds>       Generate multiple stages (comma-separated)
                         Example: batch Lv1-P1-S01,Lv1-P1-S02,Lv1-P1-S03
  
  status                 Check system health and configuration
  
  test                   Run system integration tests

Environment:
  NODE_ENV               Set environment (development, production, test)
                         Default: development

Examples:
  NODE_ENV=development npm run curriculum generate Lv1-P1-S01
  NODE_ENV=test npm run curriculum test
  npm run curriculum batch Lv1-P1-S01,Lv1-P1-S02
  npm run curriculum validate Lv1-P1-S01
  npm run curriculum status
`);
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}