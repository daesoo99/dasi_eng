/**
 * Level 4 전용 서비스
 * 로드맵 기반으로 Stage별 104개 문장 생성
 */

import { CurriculumLoader } from './CurriculumLoader';
import { 
  CurriculumLevel, 
  CurriculumStage, 
  GeneratedSentence, 
  StageQuestions,
  LegacyQuestionItem 
} from './types/CurriculumTypes';

export class Level4Service {
  private static curriculum: CurriculumLevel | null = null;

  /**
   * Level 4 커리큘럼 로드
   */
  static async loadCurriculum(): Promise<CurriculumLevel | null> {
    if (!this.curriculum) {
      this.curriculum = await CurriculumLoader.loadLevel(4);
    }
    return this.curriculum;
  }

  /**
   * 특정 스테이지의 104개 문장 생성
   */
  static async generateStageQuestions(stageNumber: number): Promise<StageQuestions | null> {
    const curriculum = await this.loadCurriculum();
    if (!curriculum) return null;

    const stage = this.findStageByNumber(curriculum, stageNumber);
    if (!stage) {
      console.warn(`Level 4 Stage ${stageNumber}을 찾을 수 없습니다.`);
      return null;
    }

    const sentences = this.generateSentencesForStage(stage, 104);
    
    return {
      stageId: `Lv4-S${stageNumber.toString().padStart(2, '0')}`,
      sentences,
      totalCount: sentences.length
    };
  }

  /**
   * 기존 PatternData와 호환되는 형태로 변환
   */
  static async generateLegacyQuestions(stageNumber: number): Promise<LegacyQuestionItem[]> {
    const stageQuestions = await this.generateStageQuestions(stageNumber);
    if (!stageQuestions) return [];

    return stageQuestions.sentences.map(sentence => ({
      korean: sentence.korean,
      english: sentence.english,
      level: 4,
      stage: stageNumber,
      pattern: sentence.grammarPoint
    }));
  }

  /**
   * 스테이지 번호로 스테이지 찾기
   */
  private static findStageByNumber(curriculum: CurriculumLevel, stageNumber: number): CurriculumStage | null {
    let currentStageNum = 1;
    
    for (const phase of curriculum.phases) {
      for (const stage of phase.stages) {
        if (currentStageNum === stageNumber) {
          return stage;
        }
        currentStageNum++;
      }
    }
    
    return null;
  }

  /**
   * 스테이지별 문장 생성 (104개 목표)
   */
  private static generateSentencesForStage(stage: CurriculumStage, targetCount: number = 104): GeneratedSentence[] {
    const sentences: GeneratedSentence[] = [];
    const baseTemplates = this.createBaseTemplates(stage);
    
    // 문장 형태별 분배 (긍정 50%, 부정 25%, 의문 25%)
    const distribution = {
      aff: Math.floor(targetCount * 0.5),    // 52개
      neg: Math.floor(targetCount * 0.25),   // 26개  
      wh_q: Math.floor(targetCount * 0.125), // 13개
      yn_q: Math.floor(targetCount * 0.125)  // 13개
    };

    let sentenceId = 1;

    // 각 형태별로 문장 생성
    for (const [form, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        const template = baseTemplates[i % baseTemplates.length];
        const variations = this.createVariations(template, form as any, i);
        
        sentences.push({
          id: `${stage.stageId}-${sentenceId.toString().padStart(3, '0')}`,
          korean: variations.korean,
          english: variations.english,
          grammarPoint: stage.grammarPoints[0] || stage.title,
          difficulty: this.determineDifficulty(i, count),
          form: form as any
        });
        
        sentenceId++;
      }
    }

    console.log(`✅ ${stage.stageId}: ${sentences.length}개 문장 생성 완료`);
    return sentences;
  }

  /**
   * 스테이지 정보로부터 기본 템플릿 생성
   */
  private static createBaseTemplates(stage: CurriculumStage): Array<{korean: string, english: string}> {
    const templates: Array<{korean: string, english: string}> = [];
    
    // 로드맵의 예문들을 활용
    if (stage.examples.length > 0) {
      for (const example of stage.examples) {
        // 영어 예문에서 한국어 번역 생성 (실제로는 더 정교한 번역 로직 필요)
        const korean = this.generateKoreanTranslation(example, stage.title);
        templates.push({ korean, english: example });
      }
    }
    
    // 문법 포인트 기반으로 추가 템플릿 생성
    const additionalTemplates = this.generateAdditionalTemplates(stage);
    templates.push(...additionalTemplates);
    
    // 최소한 10개의 템플릿 보장
    while (templates.length < 10) {
      templates.push({
        korean: `${stage.title}을(를) 사용한 문장 ${templates.length + 1}`,
        english: `Sentence ${templates.length + 1} using ${stage.title}`
      });
    }
    
    return templates;
  }

  /**
   * 문장 변형 생성 (긍정/부정/의문 등)
   */
  private static createVariations(
    template: {korean: string, english: string}, 
    form: 'aff' | 'neg' | 'wh_q' | 'yn_q',
    index: number
  ): {korean: string, english: string} {
    
    const subjects = ['나는', '그는', '그녀는', '우리는', '그들은'];
    const englishSubjects = ['I', 'He', 'She', 'We', 'They'];
    
    const subjectIndex = index % subjects.length;
    const koreanSubject = subjects[subjectIndex];
    const englishSubject = englishSubjects[subjectIndex];
    
    let korean = template.korean;
    let english = template.english;
    
    // 주어 교체
    korean = korean.replace(/^[^는은이가]*[는은이가]/, koreanSubject);
    english = english.replace(/^[IHeShWThey]+/, englishSubject);
    
    // 문장 형태 변형
    switch (form) {
      case 'neg':
        korean = this.makeNegative(korean);
        english = this.makeNegativeEnglish(english);
        break;
      case 'wh_q':
        korean = this.makeWhQuestion(korean);
        english = this.makeWhQuestionEnglish(english);
        break;
      case 'yn_q':
        korean = this.makeYesNoQuestion(korean);
        english = this.makeYesNoQuestionEnglish(english);
        break;
      // 'aff'는 그대로 사용
    }
    
    return { korean, english };
  }

  /**
   * 한국어 번역 생성 (간단한 매핑)
   */
  private static generateKoreanTranslation(englishSentence: string, grammarPoint: string): string {
    // 실제로는 더 정교한 번역 로직이 필요
    // 여기서는 문법 포인트에 따른 기본 패턴 매핑
    if (grammarPoint.includes('미래완료')) {
      return englishSentence.replace(/By (.+), I will have (.+)\./, '($1까지) 나는 $2을(를) 완료했을 것입니다.');
    }
    
    // 기본 번역 (단순화됨)
    return `${grammarPoint}을(를) 사용한 문장입니다.`;
  }

  /**
   * 추가 템플릿 생성
   */
  private static generateAdditionalTemplates(stage: CurriculumStage): Array<{korean: string, english: string}> {
    const templates = [];
    const grammarPoint = stage.title;
    
    // 문법 포인트별 기본 패턴들
    if (grammarPoint.includes('미래완료')) {
      templates.push(
        { korean: '다음 달까지 나는 프로젝트를 완료했을 것입니다', english: 'By next month, I will have completed the project' },
        { korean: '내년에는 그가 졸업을 했을 것입니다', english: 'By next year, he will have graduated' },
        { korean: '5시까지 우리는 회의를 끝냈을 것입니다', english: 'By 5 PM, we will have finished the meeting' }
      );
    } else if (grammarPoint.includes('혼합 가정법')) {
      templates.push(
        { korean: '더 열심히 공부했다면 지금 의사가 되었을 텐데', english: 'If I had studied harder, I would be a doctor now' },
        { korean: '그때 투자했다면 지금 부자였을 것이다', english: 'If I had invested then, I would be rich now' }
      );
    }
    
    return templates;
  }

  // 문장 변형 메소드들 (간단한 구현)
  private static makeNegative(korean: string): string {
    return korean.replace(/습니다$/, '지 않습니다').replace(/다$/, '지 않는다');
  }

  private static makeNegativeEnglish(english: string): string {
    if (english.includes(' will ')) {
      return english.replace(' will ', ' will not ');
    }
    return `I don't think ${english.toLowerCase()}`;
  }

  private static makeWhQuestion(korean: string): string {
    return `언제 ${korean.replace(/^[^는은이가]*[는은이가]/, '')}?`;
  }

  private static makeWhQuestionEnglish(english: string): string {
    return `When ${english.toLowerCase().replace(/^[IHeShWThey]+ /, 'do you ')}?`;
  }

  private static makeYesNoQuestion(korean: string): string {
    return `${korean.replace(/다$/, '나요?').replace(/습니다$/, '습니까?')}`;
  }

  private static makeYesNoQuestionEnglish(english: string): string {
    if (english.includes(' will ')) {
      return english.replace(/^([IHeShWThey]+) will/, 'Will $1') + '?';
    }
    return `Do you think ${english.toLowerCase()}?`;
  }

  private static determineDifficulty(index: number, total: number): 'basic' | 'intermediate' | 'advanced' {
    const ratio = index / total;
    if (ratio < 0.3) return 'basic';
    if (ratio < 0.7) return 'intermediate';
    return 'advanced';
  }
}