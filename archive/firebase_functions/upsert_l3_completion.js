// L3 Completion 스테이지들을 Firestore에 업서트
const admin = require('firebase-admin');
const fs = require('fs');

// Firebase 초기화
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function upsertL3CompletionStages() {
  try {
    console.log('🔥 L3 Completion Firestore 업서트 시작...');
    
    // 확장된 L3 completion 데이터 읽기
    const l3Data = JSON.parse(fs.readFileSync('banks_L3_completion_expanded.json', 'utf8'));
    
    console.log(`📊 업서트할 데이터:`);
    console.log(`   총 스테이지: ${l3Data.stages.length}개`);
    console.log(`   총 문장: ${l3Data.batch_info.total_sentences}개`);
    
    const batch = db.batch();
    let operationCount = 0;
    
    // 각 스테이지를 Firestore에 업서트
    for (const stage of l3Data.stages) {
      const stageRef = db.collection('curricula')
                        .doc('3')
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
        sentences: stage.sentences,
        metadata: {
          total_sentences: stage.sentences.length,
          forms_distribution: {
            aff: stage.sentences.filter(s => s.form === 'aff').length,
            neg: stage.sentences.filter(s => s.form === 'neg').length,
            wh_q: stage.sentences.filter(s => s.form === 'wh_q').length
          },
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          batch: 'L3_Completion_Final'
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
    
    // Level 3 메타데이터 업데이트
    const level3MetaRef = db.collection('curricula').doc('3').collection('versions').doc('revised');
    await level3MetaRef.set({
      level: 3,
      title: 'Advanced Grammar',
      description: 'L3 고급 문법 - 완전 마스터리 달성',
      total_stages: 30, // 기존 + 신규
      completed_stages: 30,
      completion_percentage: 100,
      total_sentences: 1500, // 기존 750 + 신규 750
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed',
      batches: [
        'L2_L3_Initial_6stages',
        'L2_L3_Batch2',
        'L2_L3_Batch3', 
        'L2_L3_Batch4_FINAL',
        'L3_Completion_Final'
      ]
    }, { merge: true });
    
    console.log('\n🎉 L3 Completion 업서트 완료!');
    console.log('📊 결과 요약:');
    console.log(`   ✅ 업서트된 스테이지: ${l3Data.stages.length}개`);
    console.log(`   ✅ 업서트된 문장: ${l3Data.batch_info.total_sentences}개`);
    console.log(`   ✅ L3 상태: 100% 완성`);
    console.log(`   ✅ L3 총 스테이지: 30개 (15개 기존 + 15개 신규)`);
    console.log(`   ✅ L3 총 문장: 1,500개 (750개 기존 + 750개 신규)`);
    
    // 성공 로그 파일 생성
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'L3_Completion_Upsert',
      status: 'SUCCESS',
      stages_count: l3Data.stages.length,
      sentences_count: l3Data.batch_info.total_sentences,
      level_status: 'L3 100% Complete'
    };
    
    fs.writeFileSync('logs/l3_completion_upsert.log', JSON.stringify(logEntry, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ L3 Completion 업서트 실패:', error);
    
    // 실패 로그
    const errorLog = {
      timestamp: new Date().toISOString(),
      action: 'L3_Completion_Upsert',
      status: 'ERROR',
      error_message: error.message,
      error_stack: error.stack
    };
    
    fs.writeFileSync('logs/l3_completion_error.log', JSON.stringify(errorLog, null, 2));
    process.exit(1);
  }
}

// 실행
upsertL3CompletionStages();