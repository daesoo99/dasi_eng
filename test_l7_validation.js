/**
 * Level 7 Curriculum Validation Test
 * 테스트용 스크립트 - L7 REVISED 검증
 */

const fs = require('fs');
const path = require('path');

// Load the Level 7 REVISED curriculum
function loadCurriculum() {
  const filePath = path.join(__dirname, 'patterns/level_7_business_english/lv7_stage_system_REVISED.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

// Basic validation tests
function validateBasicStructure(data) {
  const issues = [];
  
  // Test 1: Basic structure
  if (!data.level || data.level !== 7) {
    issues.push('ERROR: Level field missing or incorrect');
  }
  
  if (!data.total_stages || data.total_stages !== 42) {
    issues.push(`ERROR: Expected 42 stages, got ${data.total_stages}`);
  }
  
  if (!data.total_phases || data.total_phases !== 6) {
    issues.push(`ERROR: Expected 6 phases, got ${data.total_phases}`);
  }
  
  if (!data.stages || !Array.isArray(data.stages)) {
    issues.push('ERROR: Stages array missing');
  } else if (data.stages.length !== 42) {
    issues.push(`ERROR: Stages array length mismatch: ${data.stages.length} vs 42`);
  }
  
  return issues;
}

// ID format validation
function validateStageIds(stages) {
  const issues = [];
  const expectedIds = [
    // Phase 1: 고급 시제·동사 활용 (6 stages)
    'Lv7-P1-S01', 'Lv7-P1-S02', 'Lv7-P1-S03', 'Lv7-P1-S04', 'Lv7-P1-S05', 'Lv7-P1-S06',
    // Phase 2: 심화 가정법 (6 stages)
    'Lv7-P2-S07', 'Lv7-P2-S08', 'Lv7-P2-S09', 'Lv7-P2-S10', 'Lv7-P2-S11', 'Lv7-P2-S12',
    // Phase 3: 수동태 확장 (6 stages)
    'Lv7-P3-S13', 'Lv7-P3-S14', 'Lv7-P3-S15', 'Lv7-P3-S16', 'Lv7-P3-S17', 'Lv7-P3-S18',
    // Phase 4: 복합절과 담화 (6 stages)
    'Lv7-P4-S19', 'Lv7-P4-S20', 'Lv7-P4-S21', 'Lv7-P4-S22', 'Lv7-P4-S23', 'Lv7-P4-S24',
    // Phase 5: 관계사 고급 (5 stages)
    'Lv7-P5-S25', 'Lv7-P5-S26', 'Lv7-P5-S27', 'Lv7-P5-S28', 'Lv7-P5-S29',
    // Phase 6: 도치와 강조 (마스터 단계) (13 stages)
    'Lv7-P6-S30', 'Lv7-P6-S31', 'Lv7-P6-S32', 'Lv7-P6-S33', 'Lv7-P6-S34', 'Lv7-P6-S35', 
    'Lv7-P6-S36', 'Lv7-P6-S37', 'Lv7-P6-S38', 'Lv7-P6-S39', 'Lv7-P6-S40', 'Lv7-P6-S41', 'Lv7-P6-S42'
  ];
  
  const actualIds = stages.map(s => s.stage_id);
  
  expectedIds.forEach((expectedId, index) => {
    if (actualIds[index] !== expectedId) {
      issues.push(`ERROR: Stage ${index + 1} ID mismatch: expected ${expectedId}, got ${actualIds[index]}`);
    }
  });
  
  return issues;
}

// Advanced grammar validation
function validateAdvancedGrammar(stages) {
  const issues = [];
  
  // Check specific advanced topics are covered
  const expectedTopics = [
    'present perfect continuous', 'past perfect continuous', 'future perfect', 'subjunctive', 'inversion',
    'passive voice', 'complex conditionals', 'relative clause', 'discourse markers', 'emphasis',
    'causative verbs', 'advanced tenses', 'cleft sentences'
  ];
  
  const titles = stages.map(s => s.title).join(' ');
  const descriptions = stages.map(s => s.description).join(' ');
  const patterns = stages.map(s => s.pattern).join(' ');
  const combinedText = (titles + ' ' + descriptions + ' ' + patterns).toLowerCase();
  
  expectedTopics.forEach(topic => {
    if (!combinedText.includes(topic.toLowerCase())) {
      issues.push(`WARNING: Advanced topic "${topic}" not clearly covered in stage content`);
    }
  });
  
  return issues;
}

// Phase structure validation
function validatePhases(data) {
  const issues = [];
  
  const expectedPhaseStructure = {
    1: { title: '고급 시제', expectedStages: 6 },
    2: { title: '가정법', expectedStages: 6 },
    3: { title: '수동태', expectedStages: 6 },
    4: { title: '복합절', expectedStages: 6 },
    5: { title: '관계사', expectedStages: 5 },
    6: { title: '도치', expectedStages: 13 }
  };
  
  data.phases.forEach(phase => {
    const expected = expectedPhaseStructure[phase.phase_id];
    if (expected) {
      if (phase.stages.length !== expected.expectedStages) {
        issues.push(`ERROR: Phase ${phase.phase_id} stage count: ${phase.stages.length} (expected: ${expected.expectedStages})`);
      }
    }
  });
  
  return issues;
}

// Slots validation (5 slots per core stage)
function validateSlots(stages) {
  const issues = [];
  
  stages.forEach(stage => {
    if (stage.classification === 'core') {
      const slotCount = stage.slots ? stage.slots.length : 0;
      if (slotCount !== 5) {
        issues.push(`ERROR: Stage ${stage.stage_id} slot count: ${slotCount} (expected: 5)`);
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
    'BE-COP', 'DO-AUX', 'TENSE-PAST', 'TENSE-PERF', 'TENSE-FUT', 'TENSE-CONT', 'TENSE-PRES',
    'MODAL', 'PREP', 'DET-ART', 'QUANT', 'COMP-SUP', 
    'CLAUSE-IF', 'CLAUSE-REL', 'DISCOURSE', 'PRON-PROS',
    'PASSIVE', 'REPORTED', 'INVERSION', 'CAUSATIVE', 'SUBJUNCTIVE'
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
  console.log('=== Level 7 REVISED Curriculum Validation ===\n');
  
  try {
    const data = loadCurriculum();
    let allIssues = [];
    
    // Run all validation tests
    allIssues = allIssues.concat(validateBasicStructure(data));
    allIssues = allIssues.concat(validateStageIds(data.stages || []));
    allIssues = allIssues.concat(validateAdvancedGrammar(data.stages || []));
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
      console.log('✅ ALL TESTS PASSED! Level 7 REVISED is ready for deployment.');
    } else if (errors.length === 0) {
      console.log('✅ VALIDATION PASSED with minor warnings. Level 7 REVISED is ready for deployment.');
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  }
}

// Run the validation
runValidation();