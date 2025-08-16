const fs = require('fs');

async function upsertLevel(level) {
  const meta = JSON.parse(fs.readFileSync(`./data/l${level}_meta.json`, 'utf8'));
  
  let specPath;
  if (level === 1) {
    specPath = './patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json';
  } else if (level === 2) {
    specPath = './patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json';
  } else if (level === 3) {
    specPath = './patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json';
  }
  
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  const payload = {
    level: level,
    version: 'revised',
    meta: meta,
    spec: spec
  };

  try {
    const response = await fetch('http://localhost:8085/api/curriculum/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`✅ L${level} 업서트 결과:`, data.success ? 'SUCCESS' : 'FAILED');
    if (data.success && data.data) {
      console.log(`   📊 Level ${data.data.level}, Version ${data.data.version}`);
      console.log(`   📊 Phases: ${data.data.totalPhases}, Stages: ${data.data.totalStages}`);
      console.log(`   📊 Bridges: ${data.data.bridges?.join(', ') || 'none'}`);
      console.log(`   📊 분류: Core ${data.data.classificationTally?.core}, Bridge ${data.data.classificationTally?.bridge}, Optional ${data.data.classificationTally?.optional}`);
    }
    return data.success;
  } catch (error) {
    console.error(`❌ L${level} 업서트 실패:`, error.message);
    return false;
  }
}

// L1부터 L3까지 순차 업서트
(async () => {
  console.log('🚀 L1-L3 Firestore 업서트 시작\n');
  
  for (let level = 1; level <= 3; level++) {
    await upsertLevel(level);
    console.log(''); // 구분선
  }
  
  console.log('🎯 L1-L3 업서트 완료!');
})();