// uploadLevel2Stages.js - Level 2 스테이지들을 Firestore에 업로드
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

(async () => {
  try {
    console.log('📋 Level 2 스테이지 업로드 시작');
    
    // Level 2 JSON 로드
    const level2Path = path.resolve('../patterns/level_2_basic_grammar/lv2_stage_system_REVISED.json');
    const level2Data = JSON.parse(fs.readFileSync(level2Path, 'utf8'));
    
    let uploadCount = 0;
    
    // 각 스테이지를 개별 문서로 업로드
    for (const stage of level2Data.stages) {
      try {
        // slots를 sentences로 변환
        const sentences = stage.slots.map((slot, index) => ({
          id: `${stage.stage_id}_${index + 1}`,
          kr: slot.kr,
          en: slot.en,
          form: 'aff', // Level 2는 대부분 긍정문
          grammar_tags: stage.tags || []
        }));
        
        const stageDoc = {
          id: stage.stage_id,
          title: stage.title,
          focus: [stage.pattern],
          grammar_meta: stage.tags || [],
          sentences: sentences,
          engine: {
            randomPick: [5, 8] // 5-8개 랜덤 선택
          },
          updatedAt: FieldValue.serverTimestamp()
        };
        
        // Firestore에 업로드
        const docRef = db.collection('curricula').doc('2')
                          .collection('versions').doc('revised')
                          .collection('stages').doc(stage.stage_id);
        
        await docRef.set(stageDoc);
        console.log(`✅ 업로드: ${stage.stage_id} (${sentences.length} 문장)`);
        uploadCount++;
        
      } catch (stageError) {
        console.error(`❌ 스테이지 업로드 실패: ${stage.stage_id}`, stageError.message);
      }
    }
    
    console.log(`\n🎯 Level 2 업로드 완료: ${uploadCount}개 스테이지`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
    process.exit(1);
  }
})();