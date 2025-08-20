/**
 * Level 2 Curriculum Validation Test
 * 테스트용 스크립트 - L2 REVISED 검증
 */

const fs = require('fs');
const path = require('path');

// Load the Level 2 REVISED curriculum
function loadCurriculum() {
  const filePath = path.join(__dirname, 'patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

// Basic validation tests
function validateBasicStructure(data) {
  const issues = [];
  
  // Test 1: Basic structure
  if (!data.level || data.level !== 2) {
    issues.push('ERROR: Level field missing or incorrect');
  }
  
  if (!data.total_stages || data.total_stages !== 20) {
    issues.push(`ERROR: Expected 20 stages, got ${data.total_stages}`);
  }
  
  if (!data.total_phases || data.total_phases !== 6) {
    issues.push(`ERROR: Expected 6 phases, got ${data.total_phases}`);
  }
  
  if (!data.stages || !Array.isArray(data.stages)) {
    issues.push('ERROR: Stages array missing');
  } else if (data.stages.length !== 20) {
    issues.push(`ERROR: Stages array length mismatch: ${data.stages.length} vs 20`);
  }
  
  return issues;
}

// ID format validation
function validateStageIds(stages) {
  const issues = [];
  const expectedIds = [
    'Lv2-P1-S01', 'Lv2-P1-S02', 'Lv2-P1-S03',
    'Lv2-P2-S04', 'Lv2-P2-S05', 'Lv2-P2-S06',
    'Lv2-P3-S07', 'Lv2-P3-S08', 'Lv2-P3-S09', 'Lv2-P3-S10',
    'Lv2-P4-S11', 'Lv2-P4-S12', 'Lv2-P4-S13', 'Lv2-P4-S14',
    'Lv2-P5-S15', 'Lv2-P5-S16', 'Lv2-P5-S17', 'Lv2-P5-S18',
    'Lv2-P6-S19', 'Lv2-P6-S20'
  ];
  
  const actualIds = stages.map(s => s.stage_id);
  
  expectedIds.forEach((expectedId, index) => {
    if (actualIds[index] !== expectedId) {
      issues.push(`ERROR: Stage ${index + 1} ID mismatch: expected ${expectedId}, got ${actualIds[index]}`);
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
      if (slotCount < 5 || slotCount > 8) {
        issues.push(`ERROR: Stage ${stage.stage_id} slot count: ${slotCount} (expected: 5-8)`);
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

// Drill settings validation
function validateDrillSettings(stages) {
  const issues = [];
  
  stages.forEach(stage => {
    if (!stage.drill) {
      issues.push(`ERROR: Stage ${stage.stage_id} missing drill settings`);
      return;
    }
    
    const { delaySec, randomize, minCorrectToAdvance, reviewWeight } = stage.drill;
    
    if (typeof delaySec !== 'number' || delaySec < 1 || delaySec > 3) {
      issues.push(`ERROR: Stage ${stage.stage_id} invalid delaySec: ${delaySec}`);
    }
    
    if (typeof randomize !== 'boolean') {
      issues.push(`ERROR: Stage ${stage.stage_id} invalid randomize: ${randomize}`);
    }
    
    if (typeof minCorrectToAdvance !== 'number' || minCorrectToAdvance < 4 || minCorrectToAdvance > 6) {
      issues.push(`ERROR: Stage ${stage.stage_id} invalid minCorrectToAdvance: ${minCorrectToAdvance}`);
    }
    
    if (typeof reviewWeight !== 'number' || reviewWeight !== 1) {
      issues.push(`ERROR: Stage ${stage.stage_id} invalid reviewWeight: ${reviewWeight}`);
    }
  });
  
  return issues;
}

// Tags validation
function validateTags(stages) {
  const issues = [];
  const validTags = [
    'BE-COP', 'DO-AUX', 'TENSE-PAST', 'TENSE-PERF', 
    'MODAL', 'PREP', 'DET-ART', 'QUANT', 'COMP-SUP', 
    'CLAUSE-IF', 'DISCOURSE', 'PRON-PROS', 'TENSE-PRES', 'TENSE-CONT'
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
  console.log('=== Level 2 REVISED Curriculum Validation ===\n');
  
  try {
    const data = loadCurriculum();
    let allIssues = [];
    
    // Run all validation tests
    allIssues = allIssues.concat(validateBasicStructure(data));
    allIssues = allIssues.concat(validateStageIds(data.stages || []));
    allIssues = allIssues.concat(validateSlots(data.stages || []));
    allIssues = allIssues.concat(validateDrillSettings(data.stages || []));
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
      console.log('✅ ALL TESTS PASSED! Level 2 REVISED is ready for deployment.');
    }
    
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  }
}

// Run the validation
runValidation();