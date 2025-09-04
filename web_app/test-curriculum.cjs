// Simple test for curriculum parsing
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CurriculumLoader parsing logic...');

// Read the roadmap file
const roadmapPath = path.join(__dirname, 'public/docs/curriculum/master_roadmap_lv4~6_ver0.md');
const content = fs.readFileSync(roadmapPath, 'utf-8');

// Basic parsing test - look for Level 4 stages
const lines = content.split('\n');
const level4Stages = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('## Level 4') && line.includes('Stage')) {
    level4Stages.push(line);
  }
}

console.log(`📊 Found ${level4Stages.length} Level 4 stages:`);
level4Stages.slice(0, 5).forEach((stage, i) => {
  console.log(`   ${i + 1}. ${stage}`);
});

// Look for grammar points
const grammarPoints = [];
for (let i = 0; i < lines.length && grammarPoints.length < 5; i++) {
  const line = lines[i].trim();
  if (line.includes('미래완료') || line.includes('현재완료') || line.includes('시제')) {
    grammarPoints.push(line);
  }
}

console.log('📝 Sample grammar points:');
grammarPoints.forEach((point, i) => {
  console.log(`   ${i + 1}. ${point}`);
});

console.log('✅ Roadmap parsing test complete');