// 간단한 FsContentAdapter 테스트
const fs = require('fs');
const path = require('path');

const baseDir = '../web_app/public/patterns/banks';
const level = 4;
const stage = 1;
const filename = `Lv${level}-P1-S${String(stage).padStart(2, '0')}_bank.json`;
const filePath = path.join(baseDir, `level_${level}`, filename);

console.log('파일 경로:', filePath);
console.log('파일 존재:', fs.existsSync(filePath));

if (fs.existsSync(filePath)) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);
  
  console.log('data.sentences 존재:', !!data.sentences);
  console.log('data.sentences 길이:', data.sentences ? data.sentences.length : 0);
  console.log('첫 번째 문장:', data.sentences && data.sentences[0] ? data.sentences[0].english : 'None');
  
  // DrillCard 변환 시뮬레이션
  const sourceArray = data.sentences || data.patterns || data.cards || [];
  console.log('sourceArray 길이:', sourceArray.length);
  
  if (sourceArray.length > 0) {
    const firstCard = {
      id: `L${level}-S${stage}-0`,
      front_ko: sourceArray[0].korean || sourceArray[0].front_ko || '',
      back_en: sourceArray[0].english || sourceArray[0].back_en || '',
      target_en: sourceArray[0].english || sourceArray[0].back_en || '',
      kr: sourceArray[0].korean || sourceArray[0].front_ko || '',
      level: level,
      stage: stage
    };
    console.log('변환된 첫 번째 카드:', JSON.stringify(firstCard, null, 2));
  }
}