const fs = require('fs');

// 파일 경로와 메타 매핑
const LEVEL_CONFIGS = {
  1: { metaPath: './data/l1_meta.json', specPath: './patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json' },
  2: { metaPath: './data/l2_meta.json', specPath: './patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json' },
  3: { metaPath: './data/l3_meta.json', specPath: './patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json' },
  4: { metaPath: './data/l4_meta.json', specPath: './patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json' },
  5: { metaPath: './data/l5_meta.json', specPath: './patterns/level_5_advanced_business/lv5_stage_system_REVISED.json' },
  6: { metaPath: './data/l6_meta.json', specPath: './patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json' }
};

async function upsertEngineMetadata(level) {
  console.log(`\n🔧 L${level} 엔진 메타데이터 업서트 시작...`);
  
  const config = LEVEL_CONFIGS[level];
  if (!config) {
    console.log(`❌ Level ${level} 설정이 없습니다`);
    return false;
  }
  
  try {
    // 메타 파일 확인/생성
    let meta;
    if (fs.existsSync(config.metaPath)) {
      meta = JSON.parse(fs.readFileSync(config.metaPath, 'utf8'));
    } else {
      meta = {
        level: level,
        version: 'revised',
        totalPhases: 6,
        totalStages: level === 1 ? 19 : level === 2 ? 22 : level === 3 ? 26 : 24,
        bridges: level === 1 ? [] : 
                level === 2 ? [`Lv${level}-A1-S10`, `Lv${level}-A2-S14`] : 
                [`Lv${level}-A2-S08`, `Lv${level}-A4-S16`, `Lv${level}-A6-S24`],
        classificationTally: level === 1 ? {core:19, bridge:0, optional:0} :
                            level === 2 ? {core:20, bridge:2, optional:0} :
                            {core:18, bridge:3, optional:3}
      };
      fs.writeFileSync(config.metaPath, JSON.stringify(meta, null, 2));
      console.log(`   📄 L${level} 메타 파일 생성됨`);
    }
    
    // 업데이트된 스펙 파일 읽기
    const spec = JSON.parse(fs.readFileSync(config.specPath, 'utf8'));
    
    // 엔진 메타데이터가 추가되었는지 확인
    const hasEngineMetadata = spec.levelMeta && spec.levelMeta.defaultDrill;
    console.log(`   🔍 엔진 메타데이터 포함: ${hasEngineMetadata ? '✅' : '❌'}`);
    
    if (hasEngineMetadata) {
      meta.engineMeta = {
        defaultDrill: spec.levelMeta.defaultDrill,
        errorTaxonomy: spec.levelMeta.errorTaxonomy,
        difficultyProgression: spec.levelMeta.difficultyProgression
      };
    }
    
    const payload = {
      level: level,
      version: 'revised', 
      meta: meta,
      spec: spec
    };
    
    // Firestore 업서트
    const response = await fetch('http://localhost:8085/api/curriculum/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log(`✅ L${level} 엔진 메타 업서트: ${data.success ? 'SUCCESS' : 'FAILED'}`);
    if (data.success && data.data) {
      console.log(`   📊 Level ${data.data.level}, Version ${data.data.version}`);
      console.log(`   🎯 Stages: ${data.data.totalStages}, Phases: ${data.data.totalPhases}`);
      if (hasEngineMetadata) {
        console.log(`   🔧 엔진 메타: drill/slots/tags 포함`);
      }
    }
    return data.success;
    
  } catch (error) {
    console.error(`❌ L${level} 업서트 실패:`, error.message);
    return false;
  }
}

async function updateAllEngineMetadata() {
  console.log('🚀 L1~L6 엔진 메타데이터 Firestore 업데이트 시작\n');
  
  const results = [];
  for (let level = 1; level <= 6; level++) {
    const success = await upsertEngineMetadata(level);
    results.push({ level, success });
  }
  
  console.log('\n📊 업데이트 결과 요약:');
  results.forEach(({level, success}) => {
    console.log(`   L${level}: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 총 ${successCount}/6 레벨 엔진 메타 업데이트 완료!`);
  
  if (successCount === 6) {
    console.log('\n📋 추가된 엔진 메타데이터:');
    console.log('   - defaultDrill: {delaySec, randomize, minCAA}'); 
    console.log('   - errorTaxonomy: [BE-COP, DO-AUX, TENSE-*, MODAL, ...]');
    console.log('   - difficultyProgression: guided(L1-2) / adaptive(L3+)');
    console.log('   - 각 Stage: drill{}, slots{}, tags[]');
  }
}

// 실행
updateAllEngineMetadata();