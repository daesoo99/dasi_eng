/**
 * Level 3 Curriculum Validation Test
 * 테스트용 스크립트 - L3 REVISED 검증
 */

const fs = require('fs');
const path = require('path');

// Load the Level 3 REVISED curriculum
function loadCurriculum() {
  const filePath = path.join(__dirname, 'patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

// Basic validation tests
function validateBasicStructure(data) {
  const issues = [];
  
  // Test 1: Basic structure
  if (!data.level || data.level !== 3) {
    issues.push('ERROR: Level field missing or incorrect');
  }
  
  if (!data.total_stages || data.total_stages !== 28) {
    issues.push(`ERROR: Expected 28 stages, got ${data.total_stages}`);
  }
  
  if (!data.total_phases || data.total_phases !== 6) {
    issues.push(`ERROR: Expected 6 phases, got ${data.total_phases}`);
  }
  
  if (!data.stages || !Array.isArray(data.stages)) {
    issues.push('ERROR: Stages array missing');
  } else if (data.stages.length !== 28) {
    issues.push(`ERROR: Stages array length mismatch: ${data.stages.length} vs 28`);
  }
  
  return issues;
}

// ID format validation
function validateStageIds(stages) {
  const issues = [];
  const expectedIds = [
    // Phase 1: Extended Tenses & Passive Voice
    'Lv3-P1-S01', 'Lv3-P1-S02', 'Lv3-P1-S03', 'Lv3-P1-S04', 'Lv3-P1-S05', 'Lv3-P1-S06',
    // Phase 2: Modal Verbs & Conditionals
    'Lv3-P2-S07', 'Lv3-P2-S08', 'Lv3-P2-S09', 'Lv3-P2-S10',
    // Phase 3: Relative Clauses & Reported Speech
    'Lv3-P3-S11', 'Lv3-P3-S12', 'Lv3-P3-S13', 'Lv3-P3-S14', 'Lv3-P3-S15', 'Lv3-P3-S16',
    // Phase 4: Logical Connections & Opinion Expression
    'Lv3-P4-S17', 'Lv3-P4-S18', 'Lv3-P4-S19', 'Lv3-P4-S20',
    // Phase 5: Advanced Grammar Patterns
    'Lv3-P5-S21', 'Lv3-P5-S22', 'Lv3-P5-S23', 'Lv3-P5-S24',
    // Phase 6: Emphasis and Nuanced Expression
    'Lv3-P6-S25', 'Lv3-P6-S26', 'Lv3-P6-S27', 'Lv3-P6-S28'
  ];
  
  const actualIds = stages.map(s => s.stage_id);
  
  expectedIds.forEach((expectedId, index) => {
    if (actualIds[index] !== expectedId) {
      issues.push(`ERROR: Stage ${index + 1} ID mismatch: expected ${expectedId}, got ${actualIds[index]}`);
    }
  });
  
  return issues;
}

// Grammar progression validation
function validateGrammarProgression(stages) {
  const issues = [];
  
  // Check specific grammar topics are covered
  const expectedTopics = [
    'will vs be going to', '현재완료', '현재완료진행형', '과거완료', '수동태',
    'would, could, might', 'should have p.p.', '조건문', '관계대명사', '간접화법',
    '추측', '양보', '가정법', '분열문', '도치문', '비교급'
  ];
  
  const titles = stages.map(s => s.title).join(' ');
  
  expectedTopics.forEach(topic => {
    if (!titles.includes(topic)) {
      issues.push(`WARNING: Grammar topic "${topic}" not clearly covered in stage titles`);
    }
  });
  
  return issues;
}

// Phase structure validation
function validatePhases(data) {
  const issues = [];
  
  const expectedPhaseStructure = {
    1: { title: '확장된 시제와 수동태', expectedStages: 6 },
    2: { title: '다양한 조동사와 조건문', expectedStages: 4 },
    3: { title: '관계절과 간접화법', expectedStages: 6 },
    4: { title: '논리 연결 및 의견 표현', expectedStages: 4 },
    5: { title: '고급 문법 패턴', expectedStages: 4 },
    6: { title: '강조와 뉘앙스 표현', expectedStages: 4 }
  };
  
  data.phases.forEach(phase => {
    const expected = expectedPhaseStructure[phase.phase_id];
    if (expected) {
      if (!phase.title.includes(expected.title.split(' ')[0])) {
        issues.push(`WARNING: Phase ${phase.phase_id} title mismatch: ${phase.title}`);
      }
      if (phase.stages.length !== expected.expectedStages) {
        issues.push(`ERROR: Phase ${phase.phase_id} stage count: ${phase.stages.length} (expected: ${expected.expectedStages})`);
      }
    }
  });
  
  return issues;
}

// Slots validation (5-8 slots per core stage)
function validateSlots(stages) {
  const issues = [];
  
  stages.forEach(stage => {
    if (stage.classification === 'core') {
      const slotCount = stage.slots ? stage.slots.length : 0;
      if (slotCount < 5 || slotCount > 6) {
        issues.push(`ERROR: Stage ${stage.stage_id} slot count: ${slotCount} (expected: 5-6)`);
      }
      
      // Check slot structure
      if (stage.slots) {
        stage.slots.forEach((slot, idx) => {
          if (!slot.kr || !slot.en || !slot.lemma) {
            issues.push(`ERROR: Stage ${stage.stage_id} slot ${idx + 1} missing kr/en/lemma`);
          }
        });
      }
    }
  });
  
  return issues;
}

// Tags validation
function validateTags(stages) {
  const issues = [];
  const validTags = [
    'BE-COP', 'DO-AUX', 'TENSE-PAST', 'TENSE-PERF', 'TENSE-FUT', 'TENSE-CONT',
    'MODAL', 'PREP', 'DET-ART', 'QUANT', 'COMP-SUP', 
    'CLAUSE-IF', 'CLAUSE-REL', 'DISCOURSE', 'PRON-PROS', 'TENSE-PRES',
    'PASSIVE', 'REPORTED'
  ];
  
  stages.forEach(stage => {
    if (!stage.tags || !Array.isArray(stage.tags)) {
      issues.push(`ERROR: Stage ${stage.stage_id} missing or invalid tags`);
      return;
    }
    
    stage.tags.forEach(tag => {
      if (!validTags.includes(tag)) {
        issues.push(`WARNING: Stage ${stage.stage_id} unknown tag: ${tag}`);
      }
    });
  });
  
  return issues;
}

// Main validation function
function runValidation() {
  console.log('=== Level 3 REVISED Curriculum Validation ===\n');
  
  try {
    const data = loadCurriculum();
    let allIssues = [];
    
    // Run all validation tests
    allIssues = allIssues.concat(validateBasicStructure(data));
    allIssues = allIssues.concat(validateStageIds(data.stages || []));
    allIssues = allIssues.concat(validateGrammarProgression(data.stages || []));
    allIssues = allIssues.concat(validatePhases(data));
    allIssues = allIssues.concat(validateSlots(data.stages || []));
    allIssues = allIssues.concat(validateTags(data.stages || []));
    
    // Report results
    const errors = allIssues.filter(issue => issue.startsWith('ERROR'));
    const warnings = allIssues.filter(issue => issue.startsWith('WARNING'));
    
    console.log(`VALIDATION RESULTS:`);
    console.log(`- Total Stages: ${data.total_stages}`);
    console.log(`- Total Phases: ${data.total_phases}`);
    console.log(`- Errors: ${errors.length}`);
    console.log(`- Warnings: ${warnings.length}`);
    console.log(`- Overall Result: ${errors.length === 0 ? 'PASS' : 'FAIL'}\n`);
    
    if (errors.length > 0) {
      console.log('ERRORS:');
      errors.forEach(error => console.log(`  ${error}`));
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log('WARNINGS:');
      warnings.forEach(warning => console.log(`  ${warning}`));
      console.log();
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ ALL TESTS PASSED! Level 3 REVISED is ready for deployment.');
    } else if (errors.length === 0) {
      console.log('✅ VALIDATION PASSED with minor warnings. Level 3 REVISED is ready for deployment.');
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  }
}

// Run the validation
runValidation();