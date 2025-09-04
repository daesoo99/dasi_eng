const fs = require('fs');
const content = fs.readFileSync('public/docs/curriculum/master_roadmap_lv4~6_ver0.md', 'utf-8');
const stage1Line = content.split('\n').find(line => line.includes('Stage 1:'));

console.log('Testing Unicode quotes...');

// Use Unicode quote characters (U+201C and U+201D)
const quotes = stage1Line.match(/[""][^""]+["]/g);
console.log('Found Unicode quotes:', quotes);

if (quotes && quotes[0]) {
  const example = quotes[0].replace(/[""]/g, '');
  console.log('✅ Extracted example:', example);
  
  if (example.includes('will have')) {
    console.log('🎉 SUCCESS: Level 4 will show proper future perfect tense!');
    console.log('🔄 This replaces "나는 학생이야"');
  }
} else {
  console.log('❌ Still no quotes found');
  console.log('Raw line:', stage1Line);
}