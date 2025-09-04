const fs = require('fs');

console.log('🧪 Final Unicode quote test...');

const content = fs.readFileSync('public/docs/curriculum/master_roadmap_lv4~6_ver0.md', 'utf-8');
const stage1Line = content.split('\n').find(line => line.includes('Stage 1:'));

function extractExamples(line) {
  const examples = [];
  
  // 일반 따옴표
  const regularQuotes = line.match(/"([^"]+)"/g);
  const unicodeQuotes = line.match(/[""]([^""]+)["]/g);
  
  if (regularQuotes) {
    examples.push(...regularQuotes.map(match => match.slice(1, -1)));
  }
  
  if (unicodeQuotes) {
    examples.push(...unicodeQuotes.map(match => match.slice(1, -1)));
  }
  
  return examples;
}

const examples = extractExamples(stage1Line);
console.log('📝 Extracted examples:', examples);

if (examples.length > 0 && examples[0].includes('will have')) {
  console.log('🎉 SUCCESS! Level 4 Stage 1 will show:');
  console.log('   OLD: "나는 학생이야"');  
  console.log(`   NEW: "${examples[0]}"`);
  console.log('✅ 강한 결합 문제 해결됨!');
} else {
  console.log('❌ Still not working...');
  console.log('Raw line:', stage1Line);
  
  // 수동으로 예문 찾기
  const manualMatch = stage1Line.match(/By next year[^.]+\./);
  if (manualMatch) {
    console.log('🔍 Manual extraction:', manualMatch[0]);
  }
}