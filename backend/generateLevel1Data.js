// Level 1 데이터를 백엔드 API 형식으로 변환하는 스크립트

const fs = require('fs');
const path = require('path');

// Level 1 REVISED 데이터 로드
const level1Data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../patterns/level_1_basic_patterns/lv1_phase_system_REVISED.json'), 
    'utf8'
  )
);

// 백엔드 API 형식으로 변환
function convertToBackendFormat() {
  const phases = level1Data.level_1_phase_system_revised;
  const allCards = [];

  // Debug: 모든 키 출력
  console.log('🔍 All keys in phases:', Object.keys(phases));
  
  // Phase 내부의 stage들을 찾기
  const allStages = [];
  
  for (let phaseNum = 1; phaseNum <= phases.total_phases; phaseNum++) {
    const phase = phases[`phase_${phaseNum}`];
    if (phase) {
      console.log(`📋 Phase ${phaseNum} keys:`, Object.keys(phase));
      
      // 각 phase 내에서 stage_ 키 찾기
      const phaseStageKeys = Object.keys(phase).filter(key => key.startsWith('stage_'));
      console.log(`  Found stages in phase ${phaseNum}:`, phaseStageKeys);
      
      phaseStageKeys.forEach(stageKey => {
        const stage = phase[stageKey];
        if (stage && stage.practice_sentences) {
          allStages.push({
            phaseNum,
            stageKey,
            stage,
            globalStageNum: parseInt(stageKey.split('_')[1])
          });
        }
      });
    }
  }

  console.log(`🔍 Found ${allStages.length} total stages`);

  allStages.forEach((stageInfo, index) => {
    const { stage, stageKey, globalStageNum, phaseNum } = stageInfo;
    
    console.log(`  ✅ ${stageKey}: ${stage.id} - ${stage.title} (${stage.practice_sentences.length} sentences)`);

    // practice_sentences를 카드로 변환
    stage.practice_sentences.forEach((sentence, sentenceIndex) => {
      const cardId = `lv1_s${globalStageNum.toString().padStart(2, '0')}_${sentenceIndex + 1}`;
      
      const card = {
        id: cardId,
        level: 1,
        stage: globalStageNum, // 원본 스테이지 번호 사용
        stage_id: stage.id,
        
        // 문장 내용
        front_ko: sentence.ko,
        target_en: sentence.en,
        
        // 메타데이터
        pattern: stage.pattern,
        title: stage.title,
        classification: stage.classification,
        key_structures: stage.key_structures,
        
        // 학습 설정
        drill: stage.drill || {
          delaySec: 3,
          randomize: false,
          minCorrectToAdvance: 4,
          reviewWeight: 1
        },
        
        // 태그
        tags: stage.tags || [],
        
        // 난이도
        difficulty: 'easy', // Level 1은 모두 easy
        
        // 추가 정보
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      allCards.push(card);
    });
  });

  return allCards;
}

// 스테이지별로 카드 그룹화
function groupCardsByStage(cards) {
  const stageGroups = {};
  
  cards.forEach(card => {
    const stageKey = card.stage;
    if (!stageGroups[stageKey]) {
      stageGroups[stageKey] = [];
    }
    stageGroups[stageKey].push(card);
  });
  
  return stageGroups;
}

// 각 스테이지를 50개 문장으로 확장
function expandToFiftyCards(stageCards) {
  const baseCards = stageCards;
  const expanded = [...baseCards];
  
  // 패턴을 활용해서 50개까지 확장
  while (expanded.length < 50) {
    // 기존 카드를 기반으로 유사한 문장 생성 (간단한 어휘 치환)
    const baseCard = baseCards[expanded.length % baseCards.length];
    
    // 어휘 치환을 위한 단어 사전
    const wordReplacements = {
      'student': ['teacher', 'doctor', 'nurse', 'engineer', 'artist'],
      'friend': ['brother', 'sister', 'colleague', 'neighbor', 'partner'],
      'beautiful': ['smart', 'kind', 'funny', 'talented', 'helpful'],
      'happy': ['excited', 'tired', 'busy', 'ready', 'careful'],
      'book': ['pen', 'computer', 'phone', 'table', 'chair'],
      'yesterday': ['today', 'last week', 'last month', 'last year', 'recently']
    };
    
    let newTargetEn = baseCard.target_en;
    let newFrontKo = baseCard.front_ko;
    
    // 단어 치환 시도
    for (const [original, replacements] of Object.entries(wordReplacements)) {
      if (newTargetEn.includes(original)) {
        const replacement = replacements[Math.floor(Math.random() * replacements.length)];
        newTargetEn = newTargetEn.replace(original, replacement);
        
        // 한국어도 간단하게 치환 (실제로는 더 정교한 번역 필요)
        const koReplacements = {
          'student': '학생', 'teacher': '선생님', 'doctor': '의사', 'nurse': '간호사',
          'friend': '친구', 'brother': '형/동생', 'sister': '누나/언니',
          'beautiful': '아름다운', 'smart': '똑똑한', 'kind': '친절한',
          'happy': '행복한', 'excited': '신나는', 'tired': '피곤한',
          'book': '책', 'pen': '펜', 'computer': '컴퓨터'
        };
        
        if (koReplacements[replacement]) {
          // 간단한 한국어 치환 (실제로는 더 정교해야 함)
          newFrontKo = newFrontKo.replace(/학생|친구|아름답|행복|책/, koReplacements[replacement]);
        }
        break;
      }
    }
    
    // 새 카드 생성
    const newCard = {
      ...baseCard,
      id: `${baseCard.id}_var${expanded.length - baseCards.length + 1}`,
      target_en: newTargetEn,
      front_ko: newFrontKo
    };
    
    expanded.push(newCard);
  }
  
  return expanded.slice(0, 50); // 정확히 50개로 제한
}

// 메인 실행
function generateLevel1Data() {
  console.log('🔄 Level 1 데이터 변환 시작...');
  
  // 1. 카드 변환
  const allCards = convertToBackendFormat();
  console.log(`✅ 기본 카드 생성 완료: ${allCards.length}개`);
  
  // 2. 스테이지별 그룹화
  const stageGroups = groupCardsByStage(allCards);
  const stageNumbers = Object.keys(stageGroups).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`✅ 스테이지 그룹화 완료: ${stageNumbers.length}개 스테이지`);
  
  // 3. 각 스테이지를 50개로 확장
  const finalData = {};
  
  stageNumbers.forEach(stageNum => {
    const stageCards = stageGroups[stageNum];
    const expandedCards = expandToFiftyCards(stageCards);
    
    finalData[stageNum] = {
      level: 1,
      stage: parseInt(stageNum),
      total_cards: expandedCards.length,
      cards: expandedCards,
      generated_at: new Date().toISOString()
    };
    
    console.log(`✅ Stage ${stageNum}: ${stageCards.length}개 → ${expandedCards.length}개로 확장`);
  });
  
  // 4. 파일 저장
  const outputPath = path.join(__dirname, 'level1_generated_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf8');
  
  console.log(`✅ Level 1 데이터 생성 완료: ${outputPath}`);
  console.log(`📊 총 ${stageNumbers.length}개 스테이지, ${Object.values(finalData).reduce((sum, stage) => sum + stage.total_cards, 0)}개 카드`);
  
  return finalData;
}

// 스크립트 직접 실행시
if (require.main === module) {
  try {
    generateLevel1Data();
  } catch (error) {
    console.error('❌ Level 1 데이터 생성 실패:', error);
    process.exit(1);
  }
}

module.exports = { generateLevel1Data };