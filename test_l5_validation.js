/**
 * Level 5 Curriculum Validation Test
 * 테스트용 스크립트 - L5 REVISED 검증
 */

const fs = require('fs');
const path = require('path');

// Load the Level 5 REVISED curriculum
function loadCurriculum() {
  const filePath = path.join(__dirname, 'patterns/level_5_advanced_business/lv5_stage_system_REVISED.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

// Basic validation tests
function validateBasicStructure(data) {
  const issues = [];
  
  // Test 1: Basic structure
  if (!data.level || data.level !== 5) {
    issues.push('ERROR: Level field missing or incorrect');
  }
  
  if (!data.total_stages || data.total_stages !== 29) {
    issues.push(`ERROR: Expected 29 stages, got ${data.total_stages}`);
  }
  
  if (!data.total_phases || data.total_phases !== 6) {
    issues.push(`ERROR: Expected 6 phases, got ${data.total_phases}`);
  }
  
  if (!data.stages || !Array.isArray(data.stages)) {
    issues.push('ERROR: Stages array missing');
  } else if (data.stages.length !== 29) {
    issues.push(`ERROR: Stages array length mismatch: ${data.stages.length} vs 29`);
  }
  
  return issues;
}

// ID format validation
function validateStageIds(stages) {
  const issues = [];
  const expectedIds = [
    // Phase 1: Advanced Tenses & Inversions (5 stages)
    'Lv5-P1-S01', 'Lv5-P1-S02', 'Lv5-P1-S03', 'Lv5-P1-S04', 'Lv5-P1-S05',
    // Phase 2: Complex Relative Structures (5 stages)
    'Lv5-P2-S06', 'Lv5-P2-S07', 'Lv5-P2-S08', 'Lv5-P2-S09', 'Lv5-P2-S10',
    // Phase 3: Adverbial Usage & Linking (5 stages)
    'Lv5-P3-S11', 'Lv5-P3-S12', 'Lv5-P3-S13', 'Lv5-P3-S14', 'Lv5-P3-S15',
    // Phase 4: Tone & Register Control (5 stages)
    'Lv5-P4-S16', 'Lv5-P4-S17', 'Lv5-P4-S18', 'Lv5-P4-S19', 'Lv5-P4-S20',
    // Phase 5: Advanced Discourse Techniques (4 stages)
    'Lv5-P5-S21', 'Lv5-P5-S22', 'Lv5-P5-S23', 'Lv5-P5-S24',
    // Phase 6: Native-level Idiomatic Expressions (5 stages)
    'Lv5-P6-S25', 'Lv5-P6-S26', 'Lv5-P6-S27', 'Lv5-P6-S28', 'Lv5-P6-S29'
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
    'future perfect passive', 'past perfect continuous', 'inversion', 'conditional compression',
    'relative clause', 'participle', 'phrasal verbs', 'idioms', 'discourse markers',
    'register control', 'presentation', 'argumentation'
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
    1: { title: '고급 시제', expectedStages: 5 },
    2: { title: '관계사', expectedStages: 5 },
    3: { title: '부사 활용', expectedStages: 5 },
    4: { title: '말투', expectedStages: 5 },
    5: { title: '담화 기술', expectedStages: 4 },
    6: { title: '관용 표현', expectedStages: 5 }
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

// Slots validation (5-6 slots per core stage)
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
  console.log('=== Level 5 REVISED Curriculum Validation ===\n');
  
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
      console.log('✅ ALL TESTS PASSED! Level 5 REVISED is ready for deployment.');
    } else if (errors.length === 0) {
      console.log('✅ VALIDATION PASSED with minor warnings. Level 5 REVISED is ready for deployment.');
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  }
}

// Run the validation
runValidation();