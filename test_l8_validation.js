/**
 * Level 8 Curriculum Validation Test
 * 테스트용 스크립트 - L8 REVISED 검증
 */

const fs = require('fs');
const path = require('path');

// Load the Level 8 REVISED curriculum
function loadCurriculum() {
  const filePath = path.join(__dirname, 'patterns/level_8_advanced_discourse/lv8_stage_system_REVISED.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

// Basic validation tests
function validateBasicStructure(data) {
  const issues = [];
  
  // Test 1: Basic structure
  if (!data.level || data.level !== 8) {
    issues.push('ERROR: Level field missing or incorrect');
  }
  
  if (!data.total_stages || data.total_stages !== 46) {
    issues.push(`ERROR: Expected 46 stages, got ${data.total_stages}`);
  }
  
  if (!data.total_phases || data.total_phases !== 6) {
    issues.push(`ERROR: Expected 6 phases, got ${data.total_phases}`);
  }
  
  if (!data.stages || !Array.isArray(data.stages)) {
    issues.push('ERROR: Stages array missing');
  } else if (data.stages.length !== 46) {
    issues.push(`ERROR: Stages array length mismatch: ${data.stages.length} vs 46`);
  }
  
  return issues;
}

// ID format validation
function validateStageIds(stages) {
  const issues = [];
  const expectedIds = [
    // Phase 1: 초고급 조건문과 도치 응용 (7 stages)
    'Lv8-P1-S01', 'Lv8-P1-S02', 'Lv8-P1-S03', 'Lv8-P1-S04', 'Lv8-P1-S05', 'Lv8-P1-S06', 'Lv8-P1-S07',
    // Phase 2: 병렬 구조·비교 강조 (6 stages)
    'Lv8-P2-S08', 'Lv8-P2-S09', 'Lv8-P2-S10', 'Lv8-P2-S11', 'Lv8-P2-S12', 'Lv8-P2-S13',
    // Phase 3: 전치사·관용구 심화 (7 stages)
    'Lv8-P3-S14', 'Lv8-P3-S15', 'Lv8-P3-S16', 'Lv8-P3-S17', 'Lv8-P3-S18', 'Lv8-P3-S19', 'Lv8-P3-S20',
    // Phase 4: 분사구문·삽입어구 (10 stages)
    'Lv8-P4-S21', 'Lv8-P4-S22', 'Lv8-P4-S23', 'Lv8-P4-S24', 'Lv8-P4-S25', 'Lv8-P4-S26', 'Lv8-P4-S27', 'Lv8-P4-S28', 'Lv8-P4-S29', 'Lv8-P4-S30',
    // Phase 5: 담화 표지·문체 전환 (9 stages)
    'Lv8-P5-S31', 'Lv8-P5-S32', 'Lv8-P5-S33', 'Lv8-P5-S34', 'Lv8-P5-S35', 'Lv8-P5-S36', 'Lv8-P5-S37', 'Lv8-P5-S38', 'Lv8-P5-S39',
    // Phase 6: 고급 담화 기술 (7 stages)
    'Lv8-P6-S40', 'Lv8-P6-S41', 'Lv8-P6-S42', 'Lv8-P6-S43', 'Lv8-P6-S44', 'Lv8-P6-S45', 'Lv8-P6-S46'
  ];
  
  // Check if all expected IDs are present
  const actualIds = stages.map(stage => stage.stage_id);
  const missingIds = expectedIds.filter(id => !actualIds.includes(id));
  const extraIds = actualIds.filter(id => !expectedIds.includes(id));
  
  if (missingIds.length > 0) {
    issues.push(`ERROR: Missing stage IDs: ${missingIds.join(', ')}`);
  }
  
  if (extraIds.length > 0) {
    issues.push(`ERROR: Unexpected stage IDs: ${extraIds.join(', ')}`);
  }
  
  return issues;
}

// Phase distribution validation
function validatePhaseDistribution(stages) {
  const issues = [];
  const phaseDistribution = {};
  
  stages.forEach(stage => {
    const phase = stage.phase;
    if (!phaseDistribution[phase]) {
      phaseDistribution[phase] = 0;
    }
    phaseDistribution[phase]++;
  });
  
  // Expected distribution for Level 8
  const expectedDistribution = {
    1: 7,  // Phase 1: 초고급 조건문과 도치 응용
    2: 6,  // Phase 2: 병렬 구조·비교 강조
    3: 7,  // Phase 3: 전치사·관용구 심화
    4: 10, // Phase 4: 분사구문·삽입어구
    5: 9,  // Phase 5: 담화 표지·문체 전환
    6: 7   // Phase 6: 고급 담화 기술
  };
  
  for (const [phase, expected] of Object.entries(expectedDistribution)) {
    const actual = phaseDistribution[phase] || 0;
    if (actual !== expected) {
      issues.push(`ERROR: Phase ${phase} should have ${expected} stages, got ${actual}`);
    }
  }
  
  return issues;
}

// Content validation
function validateContent(stages) {
  const issues = [];
  
  // Check for required fields
  stages.forEach((stage, index) => {
    const stageNum = index + 1;
    
    if (!stage.title || stage.title.trim() === '') {
      issues.push(`ERROR: Stage ${stageNum} missing title`);
    }
    
    if (!stage.pattern || stage.pattern.trim() === '') {
      issues.push(`ERROR: Stage ${stageNum} missing pattern`);
    }
    
    if (!stage.classification || stage.classification.trim() === '') {
      issues.push(`ERROR: Stage ${stageNum} missing classification`);
    }
    
    if (!stage.description || stage.description.trim() === '') {
      issues.push(`ERROR: Stage ${stageNum} missing description`);
    }
    
    if (!stage.korean_description || stage.korean_description.trim() === '') {
      issues.push(`ERROR: Stage ${stageNum} missing korean_description`);
    }
    
    if (!stage.examples || !Array.isArray(stage.examples) || stage.examples.length < 2) {
      issues.push(`ERROR: Stage ${stageNum} should have at least 2 examples`);
    }
  });
  
  return issues;
}

// Run all validations
function runValidation() {
  console.log('🔍 Level 8 (최고급 담화와 문체 조절) Validation Starting...\n');
  
  try {
    const data = loadCurriculum();
    const allIssues = [];
    
    // Basic structure validation
    console.log('📋 Basic Structure Validation');
    const basicIssues = validateBasicStructure(data);
    allIssues.push(...basicIssues);
    if (basicIssues.length === 0) {
      console.log('✅ Basic structure: PASS');
    } else {
      basicIssues.forEach(issue => console.log(`❌ ${issue}`));
    }
    
    // Stage ID validation
    console.log('\n🔢 Stage ID Validation');
    const idIssues = validateStageIds(data.stages);
    allIssues.push(...idIssues);
    if (idIssues.length === 0) {
      console.log('✅ Stage IDs: PASS');
    } else {
      idIssues.forEach(issue => console.log(`❌ ${issue}`));
    }
    
    // Phase distribution validation
    console.log('\n📊 Phase Distribution Validation');
    const phaseIssues = validatePhaseDistribution(data.stages);
    allIssues.push(...phaseIssues);
    if (phaseIssues.length === 0) {
      console.log('✅ Phase distribution: PASS');
    } else {
      phaseIssues.forEach(issue => console.log(`❌ ${issue}`));
    }
    
    // Content validation
    console.log('\n📝 Content Validation');
    const contentIssues = validateContent(data.stages);
    allIssues.push(...contentIssues);
    if (contentIssues.length === 0) {
      console.log('✅ Content validation: PASS');
    } else {
      contentIssues.forEach(issue => console.log(`❌ ${issue}`));
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (allIssues.length === 0) {
      console.log('🎉 Level 8 Curriculum: ALL TESTS PASSED');
      console.log('✨ Ready for production use!');
    } else {
      console.log(`❌ Level 8 Curriculum: ${allIssues.length} issues found`);
      console.log('⚠️  Please fix these issues before deployment');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('💥 Failed to load curriculum:', error.message);
  }
}

// Run the validation
runValidation();