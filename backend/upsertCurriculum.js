// upsertCurriculum.js
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const LEVEL = Number(process.argv[2] || 4);
const VERSION = process.argv[3] || 'revised';
const META_JSON = process.argv[4] || '../data/l4_meta.json'; // 메타 파일 경로
const SPEC_JSON = process.argv[5] || '../patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json'; // 커리큘럼 본문 JSON 경로

// Firebase 서비스 계정 확인
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // 파일 경로로 로드
  serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // 환경변수에서 직접 로드
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  console.error('❌ Firebase 서비스 계정 설정이 필요합니다.');
  console.error('   FIREBASE_SERVICE_ACCOUNT_PATH 또는 FIREBASE_SERVICE_ACCOUNT_KEY 환경변수를 설정하세요.');
  process.exit(1);
}

// Firebase 초기화
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

(async () => {
  try {
    console.log(`📋 업서트 시작: curricula/${LEVEL}/versions/${VERSION}`);
    
    // 1) 메타 데이터 로드 및 업서트
    const metaPath = path.resolve(META_JSON);
    const meta = fs.existsSync(metaPath) 
      ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      : {
          level: LEVEL,
          version: VERSION,
          totalPhases: 6,
          totalStages: 24,
          bridges: ['Lv4-A2-S08','Lv4-A4-S16','Lv4-A6-S24'],
          classificationTally: { core: 18, bridge: 3, optional: 3 }
        };

    meta.updatedAt = FieldValue.serverTimestamp();

    const docRef = db.doc(`curricula/${LEVEL}/versions/${VERSION}`);
    await docRef.set(meta, { merge: true });
    console.log(`✅ 메타 데이터 업서트 완료`);

    // 2) 커리큘럼 스펙 업서트 (선택)
    const specPath = path.resolve(SPEC_JSON);
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      
      // Firestore 1MB 제한 고려하여 스펙은 별도 서브컬렉션에 저장
      const specRef = db.doc(`curricula/${LEVEL}/versions/${VERSION}/specs/content`);
      await specRef.set({ 
        spec: spec,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`✅ 커리큘럼 스펙 업서트 완료`);
    }

    // 3) 업서트 결과 검증
    const snapshot = await docRef.get();
    const data = snapshot.data();
    
    console.log(`\n📊 업서트 결과:`);
    console.log(`   Level: ${data.level}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Phases: ${data.totalPhases}`);
    console.log(`   Stages: ${data.totalStages}`);
    console.log(`   Bridges: ${data.bridges?.join(', ')}`);
    console.log(`   분류: Core ${data.classificationTally?.core}, Bridge ${data.classificationTally?.bridge}, Optional ${data.classificationTally?.optional}`);
    
    console.log(`\n🎯 업서트 성공: curricula/${LEVEL}/versions/${VERSION}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 업서트 실패:', error);
    process.exit(1);
  }
})();