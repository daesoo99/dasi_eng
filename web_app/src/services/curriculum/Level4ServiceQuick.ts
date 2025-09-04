/**
 * Level 4 서비스 - 빠른 임시 해결책
 * 하드코딩된 예문으로 "나는 학생이야" 문제 즉시 해결
 */

import { LegacyQuestionItem } from './types/CurriculumTypes';

export class Level4ServiceQuick {
  /**
   * Level 4 Stage별 104개 문장 생성 (빠른 해결책)
   */
  static async generateLegacyQuestions(stageNumber: number): Promise<LegacyQuestionItem[]> {
    console.log(`🚀 Level4ServiceQuick: Stage ${stageNumber} 생성 시작`);
    
    const questions: LegacyQuestionItem[] = [];
    const examples = this.getLevel4Examples(stageNumber);
    
    // 각 예문을 기반으로 변형 생성
    examples.forEach((example, exampleIndex) => {
      // 원본 문장
      questions.push({
        pattern: `lv4-s${stageNumber}-base-${exampleIndex}`,
        korean: `Level 4 Stage ${stageNumber} 기본 문장 ${exampleIndex + 1}`,
        english: example,
        level: 4,
        stage: stageNumber
      });
      
      // 주어 변형
      const subjects = [
        { korean: '나는', english: 'I' },
        { korean: '그는', english: 'He' }, 
        { korean: '그녀는', english: 'She' },
        { korean: '우리는', english: 'We' },
        { korean: '그들은', english: 'They' }
      ];
      
      subjects.forEach((subject, subjectIndex) => {
        const modifiedExample = this.modifySubject(example, subject.english);
        questions.push({
          pattern: `lv4-s${stageNumber}-var-${exampleIndex}-${subjectIndex}`,
          korean: `${subject.korean} ${this.getGrammarPoint(stageNumber)}을(를) 사용합니다`,
          english: modifiedExample,
          level: 4,
          stage: stageNumber
        });
      });
    });
    
    // 104개에 맞추기 위해 추가 생성
    while (questions.length < 104) {
      const index = questions.length;
      questions.push({
        pattern: `lv4-s${stageNumber}-extra-${index}`,
        korean: `Level 4 Stage ${stageNumber} 연습 문장 ${index + 1}`,
        english: `Practice sentence ${index + 1} for Level 4 Stage ${stageNumber}`,
        level: 4,
        stage: stageNumber
      });
    }
    
    // 정확히 104개로 자르기
    const result = questions.slice(0, 104);
    console.log(`✅ Level4ServiceQuick: Stage ${stageNumber} - ${result.length}개 문장 생성 완료`);
    
    return result;
  }
  
  /**
   * Stage별 예문 하드코딩
   */
  private static getLevel4Examples(stageNumber: number): string[] {
    const stageExamples: { [key: number]: string[] } = {
      1: [ // 미래완료
        'By next year, I will have graduated.',
        'By the time you arrive, I will have finished dinner.',
        'She will have completed the project by Friday.',
        'We will have traveled to ten countries by 2025.',
        'They will have moved to a new house by December.'
      ],
      2: [ // 미래완료진행
        'Next month, I will have been working here for 5 years.',
        'By December, they will have been dating for two years.',
        'He will have been studying English for a decade by then.',
        'We will have been living in this city for 20 years.',
        'She will have been teaching for over 30 years by retirement.'
      ],
      3: [ // 현재완료 vs 과거완료
        'I have lost my key, so I cannot get in now.',
        'I had lost my key, so I could not get in then.',
        'She has finished her homework already.',
        'They had left before we arrived.',
        'We have been waiting here for an hour.'
      ]
    };
    
    return stageExamples[stageNumber] || [
      `This is Level 4 Stage ${stageNumber} sentence.`,
      `Advanced grammar for Stage ${stageNumber}.`,
      `Complex structure in Stage ${stageNumber}.`
    ];
  }
  
  /**
   * 주어 변경
   */
  private static modifySubject(sentence: string, newSubject: string): string {
    // 간단한 주어 교체 로직
    const originalSubjects = ['I', 'He', 'She', 'We', 'They'];
    
    for (const originalSubject of originalSubjects) {
      if (sentence.startsWith(originalSubject + ' ')) {
        return sentence.replace(originalSubject, newSubject);
      }
    }
    
    return `${newSubject} ${sentence.toLowerCase()}`;
  }
  
  /**
   * Stage별 문법 포인트
   */
  private static getGrammarPoint(stageNumber: number): string {
    const grammarPoints: { [key: number]: string } = {
      1: '미래완료 시제',
      2: '미래완료진행 시제', 
      3: '완료시제 비교',
      4: '혼합 가정법',
      5: '조건절 변형'
    };
    
    return grammarPoints[stageNumber] || `Stage ${stageNumber} 고급 문법`;
  }
}