// 패턴 파일 분석을 통한 단어장 데이터 추출 스크립트
const fs = require('fs');
const path = require('path');

// 단어 정규화 함수 (복수형, 동사형태 등 처리)
function normalizeWord(word) {
  // 특수문자 제거, 소문자 변환
  word = word.toLowerCase().replace(/[^\w]/g, '');
  
  // 기본적인 동사형태 정규화
  const verbMapping = {
    'likes': 'like', 'reads': 'read', 'goes': 'go', 'does': 'do',
    'watches': 'watch', 'studies': 'study', 'plays': 'play', 
    'works': 'work', 'helps': 'help', 'loves': 'love',
    'drinks': 'drink', 'eats': 'eat', 'lives': 'live',
    'calls': 'call', 'comes': 'come', 'meets': 'meet',
    'listens': 'listen', 'sings': 'sing', 'dances': 'dance',
    'cooks': 'cook', 'grows': 'grow', 'rides': 'ride',
    'teaches': 'teach', 'writes': 'write', 'cleans': 'clean',
    'takes': 'take'
  };
  
  // 복수형 정규화
  const pluralMapping = {
    'books': 'book', 'movies': 'movie', 'games': 'game',
    'friends': 'friend', 'students': 'student', 'children': 'child',
    'cars': 'car', 'houses': 'house', 'flowers': 'flower',
    'pictures': 'picture', 'letters': 'letter', 'songs': 'song'
  };
  
  return verbMapping[word] || pluralMapping[word] || word;
}

// 불용어 리스트
const stopWords = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'among', 'against', 'within', 'without', 'toward', 'upon',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'not', 'no', 'yes', 'can', 'cant', 'cannot', 'my', 'your',
  'his', 'her', 'its', 'our', 'their'
]);

// 단어 카테고리 분류
function categorizeWord(word) {
  const categories = {
    verb: ['eat', 'drink', 'read', 'write', 'play', 'work', 'study', 'watch', 'listen', 
           'go', 'come', 'live', 'like', 'love', 'help', 'call', 'meet', 'see', 'take',
           'give', 'make', 'get', 'put', 'look', 'think', 'know', 'want', 'need',
           'walk', 'run', 'swim', 'drive', 'cook', 'clean', 'sleep', 'wake', 'open',
           'close', 'buy', 'sell', 'teach', 'learn', 'speak', 'talk', 'ask', 'answer',
           'sing', 'dance', 'grow', 'ride', 'fly'],
    noun: ['student', 'teacher', 'doctor', 'book', 'house', 'school', 'coffee', 'water',
           'friend', 'family', 'mother', 'father', 'child', 'person', 'food', 'movie',
           'music', 'game', 'phone', 'computer', 'car', 'bicycle', 'chair', 'table',
           'office', 'hospital', 'park', 'market', 'cinema', 'restaurant', 'home',
           'breakfast', 'lunch', 'dinner', 'tea', 'bread', 'letter', 'song', 'flower',
           'picture', 'news', 'radio', 'television', 'piano', 'soccer', 'tennis',
           'ball', 'pencil'],
    adjective: ['happy', 'sad', 'good', 'bad', 'big', 'small', 'tall', 'short', 'young',
                'old', 'new', 'nice', 'kind', 'smart', 'strong', 'tired', 'busy', 'safe',
                'special', 'important', 'quiet', 'brave', 'funny', 'honest', 'healthy',
                'normal', 'pretty', 'beautiful', 'fast', 'slow'],
    time: ['now', 'today', 'yesterday', 'tomorrow', 'morning', 'afternoon', 'evening',
           'night', 'weekend', 'always', 'usually', 'often', 'sometimes', 'never'],
    place: ['home', 'school', 'office', 'hospital', 'park', 'market', 'cinema', 'seoul',
            'busan', 'korea', 'america', 'here', 'there', 'everywhere'],
    color: ['red', 'blue', 'green', 'yellow', 'white', 'black', 'brown', 'purple', 'pink'],
    number: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
  };
  
  for (const [category, words] of Object.entries(categories)) {
    if (words.includes(word)) {
      return category;
    }
  }
  return 'other';
}

// 난이도 추정 함수
function estimateDifficulty(word, level, frequency) {
  const baseScore = level === 1 ? 1 : 2;
  const frequencyScore = Math.min(frequency / 10, 1); // 빈도수 기반 점수
  const lengthScore = Math.min(word.length / 8, 1); // 단어 길이 기반 점수
  
  // 기본 단어 리스트 (난이도 1)
  const basicWords = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are',
    'have', 'has', 'do', 'go', 'eat', 'drink', 'read', 'write', 'play', 'work', 'study',
    'like', 'love', 'good', 'bad', 'big', 'small', 'home', 'school', 'book', 'water',
    'food', 'friend', 'family', 'happy', 'sad', 'now', 'today', 'yes', 'no']);
  
  if (basicWords.has(word)) {
    return 1;
  }
  
  const difficulty = baseScore + lengthScore * 2 + (1 - frequencyScore);
  return Math.min(Math.max(Math.round(difficulty), 1), 5);
}

// 메인 분석 함수
async function analyzeVocabulary() {
  const level1Path = 'C:/Users/kimdaesoo/source/claude/DaSi_eng/web_app/public/patterns/banks/level_1';
  const level2Path = 'C:/Users/kimdaesoo/source/claude/DaSi_eng/web_app/public/patterns/banks/level_2';
  
  const wordStats = {};
  const levelStats = { 1: {}, 2: {} };
  
  // Level 1 파일들 처리
  const level1Files = fs.readdirSync(level1Path).filter(f => f.endsWith('.json'));
  console.log(`Level 1 파일 수: ${level1Files.length}`);
  
  for (const file of level1Files) {
    try {
      const filePath = path.join(level1Path, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.sentences && Array.isArray(data.sentences)) {
        data.sentences.forEach(sentence => {
          if (sentence.en && typeof sentence.en === 'string') {
            const words = sentence.en.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 0 && !stopWords.has(w))
              .map(normalizeWord)
              .filter(w => w.length > 1); // 한 글자 단어 제외
            
            words.forEach(word => {
              if (!wordStats[word]) {
                wordStats[word] = {
                  word,
                  level1Count: 0,
                  level2Count: 0,
                  totalCount: 0,
                  firstAppearance: 1,
                  category: categorizeWord(word),
                  stages: new Set()
                };
              }
              wordStats[word].level1Count++;
              wordStats[word].totalCount++;
              wordStats[word].stages.add(data.stage_id);
              
              levelStats[1][word] = (levelStats[1][word] || 0) + 1;
            });
          }
        });
      }
    } catch (error) {
      console.warn(`Level 1 파일 처리 오류 (${file}):`, error.message);
    }
  }
  
  // Level 2 파일들 처리
  const level2Files = fs.readdirSync(level2Path).filter(f => f.endsWith('.json'));
  console.log(`Level 2 파일 수: ${level2Files.length}`);
  
  for (const file of level2Files) {
    try {
      const filePath = path.join(level2Path, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.sentences && Array.isArray(data.sentences)) {
        data.sentences.forEach(sentence => {
          if (sentence.en && typeof sentence.en === 'string') {
            const words = sentence.en.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 0 && !stopWords.has(w))
              .map(normalizeWord)
              .filter(w => w.length > 1);
            
            words.forEach(word => {
              if (!wordStats[word]) {
                wordStats[word] = {
                  word,
                  level1Count: 0,
                  level2Count: 0,
                  totalCount: 0,
                  firstAppearance: 2,
                  category: categorizeWord(word),
                  stages: new Set()
                };
              }
              wordStats[word].level2Count++;
              wordStats[word].totalCount++;
              wordStats[word].stages.add(data.stage_id);
              
              if (wordStats[word].firstAppearance > 2) {
                wordStats[word].firstAppearance = 2;
              }
              
              levelStats[2][word] = (levelStats[2][word] || 0) + 1;
            });
          }
        });
      }
    } catch (error) {
      console.warn(`Level 2 파일 처리 오류 (${file}):`, error.message);
    }
  }
  
  // 난이도 계산 및 최종 정리
  const vocabularyData = Object.values(wordStats).map(stat => ({
    ...stat,
    stages: Array.from(stat.stages),
    difficulty: estimateDifficulty(stat.word, stat.firstAppearance, stat.totalCount),
    prevalence: stat.totalCount > 5 ? 'high' : stat.totalCount > 2 ? 'medium' : 'low'
  })).sort((a, b) => b.totalCount - a.totalCount);
  
  // 통계 계산
  const statistics = {
    totalUniqueWords: vocabularyData.length,
    level1OnlyWords: vocabularyData.filter(w => w.level1Count > 0 && w.level2Count === 0).length,
    level2OnlyWords: vocabularyData.filter(w => w.level2Count > 0 && w.level1Count === 0).length,
    sharedWords: vocabularyData.filter(w => w.level1Count > 0 && w.level2Count > 0).length,
    categoryDistribution: {},
    difficultyDistribution: {},
    topWords: vocabularyData.slice(0, 50)
  };
  
  vocabularyData.forEach(word => {
    statistics.categoryDistribution[word.category] = 
      (statistics.categoryDistribution[word.category] || 0) + 1;
    statistics.difficultyDistribution[word.difficulty] = 
      (statistics.difficultyDistribution[word.difficulty] || 0) + 1;
  });
  
  // 결과 저장
  const result = {
    statistics,
    vocabularyData,
    levelStats,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'C:/Users/kimdaesoo/source/claude/DaSi_eng/vocabulary_analysis.json',
    JSON.stringify(result, null, 2),
    'utf8'
  );
  
  // 콘솔 출력
  console.log('\n=== 단어장 분석 결과 ===');
  console.log(`총 고유 단어 수: ${statistics.totalUniqueWords}`);
  console.log(`Level 1 전용 단어: ${statistics.level1OnlyWords}`);
  console.log(`Level 2 전용 단어: ${statistics.level2OnlyWords}`);
  console.log(`공통 단어: ${statistics.sharedWords}`);
  
  console.log('\n=== 카테고리별 분포 ===');
  Object.entries(statistics.categoryDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category}: ${count}개`);
    });
  
  console.log('\n=== 난이도별 분포 ===');
  Object.entries(statistics.difficultyDistribution)
    .sort((a, b) => a[0] - b[0])
    .forEach(([difficulty, count]) => {
      console.log(`난이도 ${difficulty}: ${count}개`);
    });
  
  console.log('\n=== 최다 빈출 단어 TOP 20 ===');
  statistics.topWords.slice(0, 20).forEach((word, index) => {
    console.log(`${index + 1}. ${word.word} (${word.totalCount}회, ${word.category}, 난이도${word.difficulty})`);
  });
  
  console.log('\n분석 완료! 결과는 vocabulary_analysis.json에 저장되었습니다.');
  return result;
}

// 스크립트 실행
if (require.main === module) {
  analyzeVocabulary().catch(console.error);
}

module.exports = { analyzeVocabulary, normalizeWord, categorizeWord, estimateDifficulty };