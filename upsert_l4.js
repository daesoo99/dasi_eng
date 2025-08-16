const fs = require('fs');

// 데이터 로드
const meta = JSON.parse(fs.readFileSync('./data/l4_meta.json', 'utf8'));
const spec = JSON.parse(fs.readFileSync('./patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json', 'utf8'));

const payload = {
  level: 4,
  version: 'revised',
  meta: meta,
  spec: spec
};

// API 호출
fetch('http://localhost:8084/api/curriculum/upsert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => {
  console.log('✅ 업서트 결과:', data);
  if (data.success) {
    console.log(`📊 Level ${data.data.level}, Version ${data.data.version}`);
    console.log(`📊 Phases: ${data.data.totalPhases}, Stages: ${data.data.totalStages}`);
    console.log(`📊 Bridges: ${data.data.bridges?.join(', ')}`);
    console.log(`📊 분류: Core ${data.data.classificationTally?.core}, Bridge ${data.data.classificationTally?.bridge}, Optional ${data.data.classificationTally?.optional}`);
  }
})
.catch(error => {
  console.error('❌ 업서트 실패:', error);
});