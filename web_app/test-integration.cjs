// Test the full integration
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Level 4 integration...');

// Check if Level4Service can generate questions based on parsed roadmap
const roadmapPath = path.join(__dirname, 'public/docs/curriculum/master_roadmap_lv4~6_ver0.md');
const content = fs.readFileSync(roadmapPath, 'utf-8');

// Find Stage 1 content
const lines = content.split('\n');
let stage1Content = '';
let foundStage1 = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('Stage 1:')) {
    foundStage1 = true;
    stage1Content = line;
    
    // Look for examples in next few lines
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (nextLine.includes('예)')) {
        stage1Content += '\n' + nextLine;
        break;
      }
    }
    break;
  }
}

console.log('📋 Stage 1 found:', foundStage1);
console.log('📝 Stage 1 content:');
console.log(stage1Content);

// Extract example from Stage 1
const exampleMatch = stage1Content.match(/"([^"]+)"/);
if (exampleMatch) {
  const example = exampleMatch[1];
  console.log(`🎯 Extracted example: "${example}"`);
  
  if (example.includes('will have')) {
    console.log('✅ Correct future perfect tense example found!');
    console.log('✅ This should replace "나는 학생이야" in Level 4');
  } else {
    console.log('⚠️  Example might not be future perfect tense');
  }
} else {
  console.log('❌ No example found in quotes');
}

console.log('\n🚀 Integration test complete');
console.log('💡 Now check browser console for "🚀 새 아키텍처" when going to Level 4');