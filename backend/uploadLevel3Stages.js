// uploadLevel3Stages.js - Level 3 스테이지들을 Firestore에 업로드
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
    console.log('📋 Level 3 스테이지 업로드 시작');
    
    // Level 3 JSON 로드
    const level3Path = path.resolve('../patterns/level_3_advanced_grammar/lv3_stage_system_REVISED.json');
    const level3Data = JSON.parse(fs.readFileSync(level3Path, 'utf8'));
    
    let uploadCount = 0;
    
    // 각 스테이지를 개별 문서로 업로드
    for (const stage of level3Data.stages) {
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
          form: slot.form || 'aff', // form이 있으면 사용, 없으면 aff
          grammar_tags: stage.tags || []
        }));
        
        const stageDoc = {
          id: stage.stage_id,
          title: stage.title,
          focus: [stage.pattern],
          grammar_meta: stage.tags || [],
          sentences: sentences,
          engine: {
            randomPick: [6, 10] // 6-10개 랜덤 선택
          },
          updatedAt: FieldValue.serverTimestamp()
        };
        
        // Firestore에 업로드
        const docRef = db.collection('curricula').doc('3')
                          .collection('versions').doc('revised')
                          .collection('stages').doc(stage.stage_id);
        
        await docRef.set(stageDoc);
        console.log(`✅ 업로드: ${stage.stage_id} (${sentences.length} 문장)`);
        uploadCount++;
        
      } catch (stageError) {
        console.error(`❌ 스테이지 업로드 실패: ${stage.stage_id}`, stageError.message);
      }
    }
    
    console.log(`\n🎯 Level 3 업로드 완료: ${uploadCount}개 스테이지`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
    process.exit(1);
  }
})();