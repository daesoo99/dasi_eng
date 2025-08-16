// L5 Batch2 스테이지들을 Firestore에 업서트
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');

// Firebase 서비스 계정 확인 (backend/upsertCurriculum.js 패턴 사용)
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
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function upsertL5Batch2Stages() {
  try {
    console.log('🔥 L5 Batch2 Firestore 업서트 시작...');
    
    // 확장된 L5 batch2 데이터 읽기
    const l5Data = JSON.parse(fs.readFileSync('../banks_L5_batch2_expanded.json', 'utf8'));
    
    console.log(`📊 업서트할 데이터:`);
    console.log(`   총 스테이지: ${l5Data.stages.length}개`);
    console.log(`   총 문장: ${l5Data.batch_info.total_sentences}개`);
    console.log(`   학술 수준: ${l5Data.batch_info.cefr_level}`);
    
    const batch = db.batch();
    let operationCount = 0;
    
    // 각 스테이지를 Firestore에 업서트
    for (const stage of l5Data.stages) {
      const stageRef = db.collection('curricula')
                        .doc('5')
                        .collection('versions')
                        .doc('revised')
                        .collection('stages')
                        .doc(stage.stage_id);
      
      const stageData = {
        stage_id: stage.stage_id,
        title: stage.title,
        description: stage.description,
        focus_areas: stage.focus_areas,
        vocabulary: stage.vocabulary,
        difficulty_notes: stage.difficulty_notes,
        academic_level: stage.academic_level,
        register: stage.register,
        sentences: stage.sentences,
        metadata: {
          total_sentences: stage.sentences.length,
          forms_distribution: {
            aff: stage.sentences.filter(s => s.form === 'aff').length,
            neg: stage.sentences.filter(s => s.form === 'neg').length,
            wh_q: stage.sentences.filter(s => s.form === 'wh_q').length
          },
          academic_tags_distribution: stage.sentences.reduce((acc, s) => {
            s.grammar_tags.forEach(tag => {
              acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
          }, {}),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          batch: 'L5_Academic_Batch2'
        }
      };
      
      batch.set(stageRef, stageData, { merge: true });
      operationCount++;
      
      console.log(`  📝 ${stage.stage_id}: ${stage.title} (${stage.sentences.length}문장)`);
      
      // Firestore batch 제한 (500 operations)
      if (operationCount >= 450) {
        console.log('   💾 중간 배치 실행 중...');
        await batch.commit();
        operationCount = 0;
      }
    }
    
    // 남은 operations 커밋
    if (operationCount > 0) {
      console.log('   💾 최종 배치 실행 중...');
      await batch.commit();
    }
    
    // Level 5 메타데이터 업데이트
    const level5MetaRef = db.collection('curricula').doc('5').collection('versions').doc('revised');
    await level5MetaRef.set({
      level: 5,
      title: 'Academic Mastery',
      description: 'L5 학술 영어 완전 마스터리 달성',
      total_stages: 24, // 기존 12 + 신규 12
      completed_stages: 24,
      completion_percentage: 100,
      total_sentences: 1200, // 기존 600 + 신규 600
      cefr_level: 'C1-C2',
      academic_specialized: true,
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed',
      batches: [
        'L5_Academic_Batch1',
        'L5_Academic_Batch2'
      ],
      academic_focus: [
        'Advanced research methodology',
        'Academic discourse and argumentation', 
        'Policy implications and recommendations',
        'International collaboration',
        'Knowledge transfer and dissemination'
      ]
    }, { merge: true });
    
    console.log('\\n🎉 L5 Batch2 업서트 완료!');
    console.log('📊 결과 요약:');
    console.log(`   ✅ 업서트된 스테이지: ${l5Data.stages.length}개`);
    console.log(`   ✅ 업서트된 문장: ${l5Data.batch_info.total_sentences}개`);
    console.log(`   ✅ L5 상태: 100% 완성`);
    console.log(`   ✅ L5 총 스테이지: 24개 (12개 기존 + 12개 신규)`);
    console.log(`   ✅ L5 총 문장: 1,200개 (600개 기존 + 600개 신규)`);
    console.log(`   🎓 학술 수준: C1-C2 (Advanced Academic)`);
    
    // 성공 로그 파일 생성
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'L5_Batch2_Upsert',
      status: 'SUCCESS',
      stages_count: l5Data.stages.length,
      sentences_count: l5Data.batch_info.total_sentences,
      level_status: 'L5 100% Complete',
      academic_level: 'C1-C2',
      specialization: 'Academic Research & Methodology'
    };
    
    if (!fs.existsSync('../logs')) {
      fs.mkdirSync('../logs', { recursive: true });
    }
    fs.writeFileSync('../logs/l5_batch2_upsert.log', JSON.stringify(logEntry, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ L5 Batch2 업서트 실패:', error);
    
    // 실패 로그
    const errorLog = {
      timestamp: new Date().toISOString(),
      action: 'L5_Batch2_Upsert',
      status: 'ERROR',
      error_message: error.message,
      error_stack: error.stack
    };
    
    if (!fs.existsSync('../logs')) {
      fs.mkdirSync('../logs', { recursive: true });
    }
    fs.writeFileSync('../logs/l5_batch2_error.log', JSON.stringify(errorLog, null, 2));
    process.exit(1);
  }
}

// 실행
upsertL5Batch2Stages();