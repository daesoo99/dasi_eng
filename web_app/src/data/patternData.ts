export interface QuestionItem {
  korean: string;
  english: string;
  verb?: string;
  pattern?: string;
  level?: number;
  stage?: number;
}

export interface PatternData {
  [key: string]: QuestionItem[];
}

// Level 1 Patterns - Basic verb forms and structures
export const level1Patterns: PatternData = {
  "Be동사 현재": [
    { korean: "나는 학생이다", english: "I am a student", verb: "be", pattern: "Be동사 현재" },
    { korean: "그는 선생님이다", english: "He is a teacher", verb: "be", pattern: "Be동사 현재" },
    { korean: "그녀는 의사다", english: "She is a doctor", verb: "be", pattern: "Be동사 현재" },
    { korean: "우리는 친구다", english: "We are friends", verb: "be", pattern: "Be동사 현재" },
    { korean: "그들은 학생들이다", english: "They are students", verb: "be", pattern: "Be동사 현재" }
  ],
  "Be동사 과거": [
    { korean: "나는 어제 바빴다", english: "I was busy yesterday", verb: "be", pattern: "Be동사 과거" },
    { korean: "그는 집에 있었다", english: "He was at home", verb: "be", pattern: "Be동사 과거" },
    { korean: "그녀는 행복했다", english: "She was happy", verb: "be", pattern: "Be동사 과거" },
    { korean: "우리는 늦었다", english: "We were late", verb: "be", pattern: "Be동사 과거" },
    { korean: "그들은 친구였다", english: "They were friends", verb: "be", pattern: "Be동사 과거" }
  ],
  "Be동사 미래": [
    { korean: "나는 의사가 될 것이다", english: "I will be a doctor", verb: "be", pattern: "Be동사 미래" },
    { korean: "그는 여기에 있을 것이다", english: "He will be here", verb: "be", pattern: "Be동사 미래" },
    { korean: "그녀는 늦을 것이다", english: "She will be late", verb: "be", pattern: "Be동사 미래" },
    { korean: "우리는 준비될 것이다", english: "We will be ready", verb: "be", pattern: "Be동사 미래" },
    { korean: "그들은 학생이 될 것이다", english: "They will be students", verb: "be", pattern: "Be동사 미래" }
  ]
};

// Level 2 Patterns - Grammar patterns
export const level2Patterns: PatternData = {
  "be동사": [
    { korean: "나는 학생이다", english: "I am a student", pattern: "be동사", level: 2 },
    { korean: "그는 선생님이다", english: "He is a teacher", pattern: "be동사", level: 2 },
    { korean: "우리는 친구다", english: "We are friends", pattern: "be동사", level: 2 },
    { korean: "그녀는 의사다", english: "She is a doctor", pattern: "be동사", level: 2 },
    { korean: "그들은 학생들이다", english: "They are students", pattern: "be동사", level: 2 }
  ],
  "일반동사": [
    { korean: "나는 공부한다", english: "I study", pattern: "일반동사", level: 2 },
    { korean: "그는 일한다", english: "He works", pattern: "일반동사", level: 2 },
    { korean: "우리는 먹는다", english: "We eat", pattern: "일반동사", level: 2 },
    { korean: "그녀는 읽는다", english: "She reads", pattern: "일반동사", level: 2 },
    { korean: "그들은 논다", english: "They play", pattern: "일반동사", level: 2 }
  ],
  "조동사": [
    { korean: "나는 갈 수 있다", english: "I can go", pattern: "조동사", level: 2 },
    { korean: "그는 와야 한다", english: "He must come", pattern: "조동사", level: 2 },
    { korean: "우리는 할 것이다", english: "We will do", pattern: "조동사", level: 2 },
    { korean: "그녀는 할지도 모른다", english: "She might do", pattern: "조동사", level: 2 },
    { korean: "그들은 해야 한다", english: "They should do", pattern: "조동사", level: 2 }
  ]
};

// Level 3+ Verb Patterns - Advanced verb conjugations
export const verbPatterns: Record<string, { korean: string[]; english: string[] }> = {
  go: {
    korean: ['나는 간다', '나는 안 간다', '너 가니?', '나는 가는 중이다', '나는 가는 중이 아니다', '너 가는 중이니?'],
    english: ['I go', 'I don\'t go', 'Do you go?', 'I\'m going', 'I\'m not going', 'Are you going?']
  },
  sell: {
    korean: ['나는 판다', '나는 안 판다', '너 파니?', '나는 파는 중이다', '나는 파는 중이 아니다', '너 파는 중이니?'],
    english: ['I sell', 'I don\'t sell', 'Do you sell?', 'I\'m selling', 'I\'m not selling', 'Are you selling?']
  },
  study: {
    korean: ['나는 공부한다', '나는 공부 안한다', '너 공부하니?', '나는 공부하는 중이다', '나는 공부하는 중이 아니다', '너 공부하는 중이니?'],
    english: ['I study', 'I don\'t study', 'Do you study?', 'I\'m studying', 'I\'m not studying', 'Are you studying?']
  },
  write: {
    korean: ['나는 쓴다', '나는 안 쓴다', '너 쓰니?', '나는 쓰는 중이다', '나는 쓰는 중이 아니다', '너 쓰는 중이니?'],
    english: ['I write', 'I don\'t write', 'Do you write?', 'I\'m writing', 'I\'m not writing', 'Are you writing?']
  },
  call: {
    korean: ['나는 전화한다', '나는 전화 안한다', '너 전화하니?', '나는 전화하는 중이다', '나는 전화하는 중이 아니다', '너 전화하는 중이니?'],
    english: ['I call', 'I don\'t call', 'Do you call?', 'I\'m calling', 'I\'m not calling', 'Are you calling?']
  },
  eat: {
    korean: ['나는 먹는다', '나는 안 먹는다', '너 먹니?', '나는 먹는 중이다', '나는 먹는 중이 아니다', '너 먹는 중이니?'],
    english: ['I eat', 'I don\'t eat', 'Do you eat?', 'I\'m eating', 'I\'m not eating', 'Are you eating?']
  },
  work: {
    korean: ['나는 일한다', '나는 일 안한다', '너 일하니?', '나는 일하는 중이다', '나는 일하는 중이 아니다', '너 일하는 중이니?'],
    english: ['I work', 'I don\'t work', 'Do you work?', 'I\'m working', 'I\'m not working', 'Are you working?']
  },
  read: {
    korean: ['나는 읽는다', '나는 안 읽는다', '너 읽니?', '나는 읽는 중이다', '나는 읽는 중이 아니다', '너 읽는 중이니?'],
    english: ['I read', 'I don\'t read', 'Do you read?', 'I\'m reading', 'I\'m not reading', 'Are you reading?']
  },
  play: {
    korean: ['나는 논다', '나는 안 논다', '너 노니?', '나는 노는 중이다', '나는 노는 중이 아니다', '너 노는 중이니?'],
    english: ['I play', 'I don\'t play', 'Do you play?', 'I\'m playing', 'I\'m not playing', 'Are you playing?']
  },
  watch: {
    korean: ['나는 본다', '나는 안 본다', '너 보니?', '나는 보는 중이다', '나는 보는 중이 아니다', '너 보는 중이니?'],
    english: ['I watch', 'I don\'t watch', 'Do you watch?', 'I\'m watching', 'I\'m not watching', 'Are you watching?']
  }
};

// Level System Data Interface
export interface LevelSystemData {
  level: number;
  stage: number;
  patternName?: string;
  currentVerb?: string;
  developerMode?: boolean;
}

// Review Mode Data Interface
export interface ReviewModeData {
  mode: 'single' | 'all' | 'pattern' | 'weak-patterns';
  reviewIds: string[];
  reviewId?: string;
  patternName?: string;
}

// Question generation utilities
export class PatternDataManager {
  static shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  static generateQuestionsForLevel1(
    currentVerb: string,
    currentStage: number
  ): QuestionItem[] {
    const patterns = level1Patterns[currentVerb] || level1Patterns["Be동사 현재"];
    console.log(`Level 1 패턴: ${currentVerb}, 문제 개수: ${patterns.length}`);
    
    let questions: QuestionItem[] = [];
    
    if (currentStage === 1) {
      questions = [...patterns];
    } else if (currentStage === 2) {
      questions = [...patterns];
      for (let i = questions.length - 1; i > 0; i -= 2) {
        const j = Math.max(0, i - 1);
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    } else if (currentStage === 4) {
      // ALL mode: 모든 패턴 포함
      questions = [];
      Object.values(level1Patterns).forEach(patternGroup => {
        questions = questions.concat([...patternGroup]);
      });
      questions = this.shuffle(questions);
    } else {
      // Stage 3: 완전 섞기
      questions = this.shuffle([...patterns]);
    }
    
    console.log(`Level 1 문제 수: ${questions.length}`);
    return questions;
  }

  static generateQuestionsForLevel2(
    patternKey: string,
    currentStage: number
  ): QuestionItem[] {
    const patterns = level2Patterns[patternKey] || level2Patterns["일반동사"];
    console.log(`매핑된 패턴: ${patternKey}, 문제 개수: ${patterns.length}`);
    
    let questions: QuestionItem[] = [];
    
    if (currentStage === 1) {
      questions = [...patterns];
    } else if (currentStage === 2) {
      questions = [...patterns];
      for (let i = questions.length - 1; i > 0; i -= 2) {
        const j = Math.max(0, i - 1);
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    } else if (currentStage === 4) {
      // ALL mode: 모든 패턴 포함
      questions = [];
      Object.values(level2Patterns).forEach(patternGroup => {
        questions = questions.concat([...patternGroup]);
      });
      questions = this.shuffle(questions);
    } else {
      // Stage 3: 완전 섞기
      questions = this.shuffle([...patterns]);
    }
    
    console.log(`Level 2 문제 수: ${questions.length}`);
    return questions;
  }

  static generateQuestionsForAdvanced(
    currentVerb: string,
    currentStage: number
  ): QuestionItem[] {
    let questions: QuestionItem[] = [];
    
    if (currentStage === 1) {
      // Stage 1: 순서대로 (현재 동사만)
      const patterns = verbPatterns[currentVerb];
      if (!patterns) {
        console.error(`동사 패턴을 찾을 수 없습니다: ${currentVerb}`);
        return [];
      }
      for (let i = 0; i < patterns.korean.length; i++) {
        questions.push({
          korean: patterns.korean[i],
          english: patterns.english[i],
          verb: currentVerb
        });
      }
    } else if (currentStage === 2) {
      // Stage 2: 조금 섞기 (현재 동사만)
      const patterns = verbPatterns[currentVerb];
      if (!patterns) {
        console.error(`동사 패턴을 찾을 수 없습니다: ${currentVerb}`);
        return [];
      }
      const group1 = [0, 1, 2]; // 일반 형태
      const group2 = [3, 4, 5]; // 진행 형태
      
      questions = questions.concat(this.shuffle(group1).map(i => ({
        korean: patterns.korean[i],
        english: patterns.english[i],
        verb: currentVerb
      })));
      questions = questions.concat(this.shuffle(group2).map(i => ({
        korean: patterns.korean[i],
        english: patterns.english[i],
        verb: currentVerb
      })));
    } else if (currentStage === 3) {
      // Stage 3: 완전히 섞기 (현재 동사만)
      const patterns = verbPatterns[currentVerb];
      const indices = [0, 1, 2, 3, 4, 5];
      questions = this.shuffle(indices).map(i => ({
        korean: patterns.korean[i],
        english: patterns.english[i],
        verb: currentVerb
      }));
    } else if (currentStage === 4) {
      // Stage 4 (ALL): 모든 동사의 모든 패턴 포함
      Object.keys(verbPatterns).forEach(verb => {
        const patterns = verbPatterns[verb];
        for (let i = 0; i < patterns.korean.length; i++) {
          questions.push({
            korean: patterns.korean[i],
            english: patterns.english[i],
            verb: verb
          });
        }
      });
      questions = this.shuffle(questions);
    }
    
    console.log(`=== ${currentStage}단계 문제 생성 완료: 총 ${questions.length}개 ===`);
    return questions;
  }

  static generateQuestions(
    levelSystemData: LevelSystemData | null,
    currentStage: number
  ): QuestionItem[] {
    console.log(`=== ${currentStage}단계 문제 생성 시작 ===`);
    
    if (levelSystemData && levelSystemData.level === 1) {
      return this.generateQuestionsForLevel1(
        levelSystemData.currentVerb || "Be동사 현재",
        currentStage
      );
    } else if (levelSystemData && levelSystemData.level === 2) {
      return this.generateQuestionsForLevel2(
        levelSystemData.patternName || "일반동사",
        currentStage
      );
    } else {
      // Level 3 이상 또는 기본 모드
      return this.generateQuestionsForAdvanced(
        levelSystemData?.currentVerb || "go",
        currentStage
      );
    }
  }
}