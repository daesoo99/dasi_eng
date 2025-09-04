/**
 * Level4Service 테스트
 * 프로토타입이 올바르게 작동하는지 검증
 */

import { Level4Service } from '../Level4Service';
import { LevelServiceFactory } from '../LevelServiceFactory';

// 수동 테스트용 함수들
export class Level4ServiceTest {
  
  /**
   * Level 4 Service 기본 기능 테스트
   */
  static async testBasicFunctionality(): Promise<boolean> {
    console.log('🧪 Level4Service 기본 기능 테스트 시작...');
    
    try {
      // 1. 커리큘럼 로딩 테스트
      const curriculum = await Level4Service.loadCurriculum();
      console.log('📚 커리큘럼 로딩:', curriculum ? '성공' : '실패');
      
      if (curriculum) {
        console.log(`- Level: ${curriculum.level}`);
        console.log(`- Title: ${curriculum.title}`);
        console.log(`- Total Stages: ${curriculum.totalStages}`);
        console.log(`- Phases: ${curriculum.phases.length}개`);
      }

      // 2. Stage 1 문제 생성 테스트
      const stage1Questions = await Level4Service.generateLegacyQuestions(1);
      console.log(`🎯 Stage 1 문제 생성: ${stage1Questions.length}개`);
      
      if (stage1Questions.length > 0) {
        console.log('- 첫 번째 문제:', stage1Questions[0]);
        console.log('- 마지막 문제:', stage1Questions[stage1Questions.length - 1]);
      }

      // 3. 다양한 스테이지 테스트
      for (let stage = 1; stage <= 5; stage++) {
        const questions = await Level4Service.generateLegacyQuestions(stage);
        console.log(`🎯 Stage ${stage}: ${questions.length}개 문제`);
      }

      console.log('✅ Level4Service 테스트 완료!');
      return true;
      
    } catch (error) {
      console.error('❌ Level4Service 테스트 실패:', error);
      return false;
    }
  }

  /**
   * LevelServiceFactory 테스트
   */
  static async testFactory(): Promise<boolean> {
    console.log('🏭 LevelServiceFactory 테스트 시작...');
    
    try {
      // 1. Level 4 서비스 생성 테스트
      const level4Service = LevelServiceFactory.getService(4);
      console.log('🔧 Level 4 서비스:', level4Service ? '생성됨' : '실패');

      // 2. Factory를 통한 문제 생성 테스트
      const questions = await LevelServiceFactory.generateQuestions(4, 1);
      console.log(`📝 Factory를 통한 문제 생성: ${questions.length}개`);

      if (questions.length > 0) {
        const firstQuestion = questions[0];
        console.log('- 첫 번째 문제:', firstQuestion);
        
        // "나는 학생이야" 문제가 해결되었는지 확인
        const hasOldProblem = questions.some(q => 
          q.korean.includes('나는 학생이야') || 
          q.korean.includes('나는 간다') || 
          q.korean.includes('나는 판다')
        );
        
        console.log('🩺 "나는 학생이야" 문제 해결됨:', !hasOldProblem);
      }

      // 3. 지원되지 않는 레벨 테스트
      const unsupportedQuestions = await LevelServiceFactory.generateQuestions(99, 1);
      console.log(`❓ 지원되지 않는 레벨: ${unsupportedQuestions.length}개 (0이어야 함)`);

      console.log('✅ LevelServiceFactory 테스트 완료!');
      return true;

    } catch (error) {
      console.error('❌ LevelServiceFactory 테스트 실패:', error);
      return false;
    }
  }

  /**
   * 전체 테스트 실행
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 새로운 커리큘럼 아키텍처 테스트 시작!');
    console.log('=' .repeat(50));
    
    const results = {
      basicFunctionality: await this.testBasicFunctionality(),
      factory: await this.testFactory()
    };
    
    console.log('=' .repeat(50));
    console.log('📊 테스트 결과:');
    console.log(`- Level4Service 기본 기능: ${results.basicFunctionality ? '✅' : '❌'}`);
    console.log(`- LevelServiceFactory: ${results.factory ? '✅' : '❌'}`);
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n🎉 전체 테스트: ${allPassed ? '성공!' : '일부 실패'}`);
    
    if (allPassed) {
      console.log('\n🎯 다음 단계: usePatternData.ts에서 새 아키텍처 사용');
    }
  }
}

// 브라우저 콘솔에서 직접 실행할 수 있도록 window에 추가
declare global {
  interface Window {
    testLevel4Service: typeof Level4ServiceTest;
  }
}

if (typeof window !== 'undefined') {
  window.testLevel4Service = Level4ServiceTest;
}