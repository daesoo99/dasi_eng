const fs = require('fs');

// 레벨별 기본값 정의
const LEVEL_DEFAULTS = {
  "1": {"delaySec": 3, "randomize": false, "minCAA": 4},
  "2": {"delaySec": 2, "randomize": false, "minCAA": 5},
  "3": {"delaySec": 1, "randomize": true,  "minCAA": 5},
  "4": {"delaySec": 1, "randomize": true,  "minCAA": 6},
  "5": {"delaySec": 1, "randomize": true,  "minCAA": 6},
  "6": {"delaySec": 1, "randomize": true,  "minCAA": 6}
};

// 공통 에러 태그 정의
const COMMON_ERROR_TAGS = [
  "BE-COP", "DO-AUX", "TENSE-PAST", "TENSE-PERF", "MODAL", 
  "PREP", "DET-ART", "QUANT", "COMP-SUP", "CLAUSE-IF", 
  "DISCOURSE", "PRON-PROS"
];

// 파일 경로 매핑
const FILE_PATHS = {
  1: './patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json',
  2: './patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json',
  3: './patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json',
  4: './patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json',
  5: './patterns/level_5_advanced_business/lv5_stage_system_REVISED.json',
  6: './patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json'
};

function generateTagsForStage(stageId, title, classification) {
  const tags = [];
  
  // 분류별 태그
  if (classification === 'bridge') tags.push('bridge-stage');
  if (classification === 'optional') tags.push('optional');
  
  // 제목 기반 태그 추론
  const titleLower = title.toLowerCase();
  if (titleLower.includes('의문') || titleLower.includes('질문') || titleLower.includes('q&a')) {
    tags.push('INTERROGATIVE');
  }
  if (titleLower.includes('부정') || titleLower.includes('거절')) {
    tags.push('NEGATION');
  }
  if (titleLower.includes('과거') || titleLower.includes('경험')) {
    tags.push('TENSE-PAST');
  }
  if (titleLower.includes('미래') || titleLower.includes('계획')) {
    tags.push('TENSE-FUT');
  }
  if (titleLower.includes('전치사')) {
    tags.push('PREP');
  }
  if (titleLower.includes('관사')) {
    tags.push('DET-ART');
  }
  if (titleLower.includes('모달') || titleLower.includes('can') || titleLower.includes('요청')) {
    tags.push('MODAL');
  }
  if (titleLower.includes('협상') || titleLower.includes('설득')) {
    tags.push('DISCOURSE');
  }
  
  // 기본 태그가 없으면 레벨별 기본 추가
  if (tags.length === 0) {
    tags.push('core-expression');
  }
  
  return tags;
}

async function patchLevel(level) {
  console.log(`\n🔧 Level ${level} 메타데이터 패치 시작...`);
  
  const filePath = FILE_PATHS[level];
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 파일 없음: ${filePath}`);
    return false;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const defaults = LEVEL_DEFAULTS[level.toString()];
    let patchCount = 0;
    
    // 각 스테이지에 메타데이터 추가
    if (data.stages) {
      data.stages.forEach(stage => {
        // drill 메타 추가
        if (!stage.drill) {
          stage.drill = {
            delaySec: defaults.delaySec,
            randomize: defaults.randomize,
            minCorrectToAdvance: defaults.minCAA,
            reviewWeight: 1.0
          };
          patchCount++;
        }
        
        // slots 메타 추가
        if (!stage.slots) {
          stage.slots = { min: 5, max: 8 };
          patchCount++;
        }
        
        // tags 메타 추가
        if (!stage.tags) {
          stage.tags = generateTagsForStage(
            stage.stage_id, 
            stage.title, 
            stage.classification
          );
          patchCount++;
        }
      });
    }
    
    // 레벨 메타 추가
    if (!data.levelMeta) {
      data.levelMeta = {
        defaultDrill: defaults,
        errorTaxonomy: COMMON_ERROR_TAGS,
        difficultyProgression: level <= 2 ? "guided" : "adaptive"
      };
      patchCount++;
    }
    
    // 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Level ${level}: ${patchCount}개 필드 패치 완료 (${data.stages?.length || 0} stages)`);
    return true;
    
  } catch (error) {
    console.error(`❌ Level ${level} 패치 실패:`, error.message);
    return false;
  }
}

async function patchAllLevels() {
  console.log('🚀 L1~L6 훈련 엔진 메타데이터 패치 시작\n');
  
  const results = [];
  for (let level = 1; level <= 6; level++) {
    const success = await patchLevel(level);
    results.push({ level, success });
  }
  
  console.log('\n📊 패치 결과 요약:');
  results.forEach(({level, success}) => {
    console.log(`   L${level}: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 총 ${successCount}/6 레벨 패치 완료!`);
  
  if (successCount === 6) {
    console.log('\n📋 추가된 필드:');
    console.log('   - drill: {delaySec, randomize, minCorrectToAdvance, reviewWeight}');
    console.log('   - slots: {min: 5, max: 8}');
    console.log('   - tags: [스테이지별 적응형 태그]');
    console.log('   - levelMeta: {defaultDrill, errorTaxonomy, difficultyProgression}');
  }
}

// 실행
patchAllLevels();