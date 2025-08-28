// uploadLevels4to6.js - Level 4-6 스테이지들을 Firestore에 업로드
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Firebase 서비스 계정 확인
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  console.error('❌ Firebase 서비스 계정 설정이 필요합니다.');
  process.exit(1);
}

// Firebase 초기화
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const LEVELS_CONFIG = [
  {
    level: 4,
    path: '../patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json',
    name: 'Level 4 - Advanced Expressions'
  },
  {
    level: 5,
    path: '../patterns/level_5_advanced_business/lv5_stage_system_REVISED.json',
    name: 'Level 5 - Advanced Business'
  },
  {
    level: 6,
    path: '../patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json',
    name: 'Level 6 - Domain Expertise'
  }
];

async function uploadLevelStages(levelConfig) {
  try {
    console.log(`📋 ${levelConfig.name} 스테이지 업로드 시작`);
    
    const levelPath = path.resolve(levelConfig.path);
    if (!fs.existsSync(levelPath)) {
      console.log(`⚠️  파일 없음: ${levelPath}`);
      return 0;
    }
    
    const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
    let uploadCount = 0;
    
    // 각 스테이지를 개별 문서로 업로드
    for (const stage of levelData.stages) {
      try {
        // slots가 있는 경우 sentences로 변환, 없으면 스킵
        if (!stage.slots || stage.slots.length === 0) {
          console.log(`⚠️  스킵: ${stage.stage_id} (데이터 없음)`);
          continue;
        }
        
        const sentences = stage.slots.map((slot, index) => ({
          id: `${stage.stage_id}_${index + 1}`,
          kr: slot.kr,
          en: slot.en,
          form: slot.form || 'aff',
          grammar_tags: stage.tags || []
        }));
        
        const stageDoc = {
          id: stage.stage_id,
          title: stage.title,
          focus: [stage.pattern],
          grammar_meta: stage.tags || [],
          sentences: sentences,
          engine: {
            randomPick: [6, 12] // 6-12개 랜덤 선택
          },
          updatedAt: FieldValue.serverTimestamp()
        };
        
        // Firestore에 업로드
        const docRef = db.collection('curricula').doc(levelConfig.level.toString())
                          .collection('versions').doc('revised')
                          .collection('stages').doc(stage.stage_id);
        
        await docRef.set(stageDoc);
        console.log(`✅ 업로드: ${stage.stage_id} (${sentences.length} 문장)`);
        uploadCount++;
        
      } catch (stageError) {
        console.error(`❌ 스테이지 업로드 실패: ${stage.stage_id}`, stageError.message);
      }
    }
    
    console.log(`🎯 ${levelConfig.name} 업로드 완료: ${uploadCount}개 스테이지\n`);
    return uploadCount;
    
  } catch (error) {
    console.error(`❌ ${levelConfig.name} 업로드 실패:`, error);
    return 0;
  }
}

(async () => {
  try {
    let totalUploaded = 0;
    
    for (const levelConfig of LEVELS_CONFIG) {
      const uploaded = await uploadLevelStages(levelConfig);
      totalUploaded += uploaded;
    }
    
    console.log(`\n🏆 전체 업로드 완료: ${totalUploaded}개 스테이지`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 전체 업로드 실패:', error);
    process.exit(1);
  }
})();