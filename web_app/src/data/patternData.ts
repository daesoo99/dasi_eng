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

// Level 1 Patterns - Basic Be verb foundations (progressive difficulty)
export const level1Patterns: PatternData = {
  "Be동사 현재": [
    { korean: "나는 학생입니다", english: "I am a student", verb: "be", pattern: "Be동사 현재" },
    { korean: "그는 선생님입니다", english: "He is a teacher", verb: "be", pattern: "Be동사 현재" },
    { korean: "그녀는 의사입니다", english: "She is a doctor", verb: "be", pattern: "Be동사 현재" },
    { korean: "우리는 친구입니다", english: "We are friends", verb: "be", pattern: "Be동사 현재" },
    { korean: "그들은 학생들입니다", english: "They are students", verb: "be", pattern: "Be동사 현재" }
  ],
  "Be동사 과거": [
    { korean: "나는 어제 바빴습니다", english: "I was busy yesterday", verb: "be", pattern: "Be동사 과거" },
    { korean: "그는 집에 있었습니다", english: "He was at home", verb: "be", pattern: "Be동사 과거" },
    { korean: "그녀는 행복했습니다", english: "She was happy", verb: "be", pattern: "Be동사 과거" },
    { korean: "우리는 늦었습니다", english: "We were late", verb: "be", pattern: "Be동사 과거" },
    { korean: "그들은 친구였습니다", english: "They were friends", verb: "be", pattern: "Be동사 과거" }
  ],
  "Be동사 미래": [
    { korean: "나는 의사가 될 것입니다", english: "I will be a doctor", verb: "be", pattern: "Be동사 미래" },
    { korean: "그는 여기에 있을 것입니다", english: "He will be here", verb: "be", pattern: "Be동사 미래" },
    { korean: "그녀는 늦을 것입니다", english: "She will be late", verb: "be", pattern: "Be동사 미래" },
    { korean: "우리는 준비될 것입니다", english: "We will be ready", verb: "be", pattern: "Be동사 미래" },
    { korean: "그들은 학생이 될 것입니다", english: "They will be students", verb: "be", pattern: "Be동사 미래" }
  ]
};

// Level 2 Patterns - 현재진행형 (우리가 생성한 문장들)
export const level2Patterns: PatternData = {
  "현재진행형": [
    { korean: "나는 지금 점심을 먹고 있습니다", english: "I am eating lunch now", pattern: "현재진행형", level: 2 },
    { korean: "그들은 공원에서 놀고 있습니다", english: "They are playing in the park", pattern: "현재진행형", level: 2 },
    { korean: "그는 책을 읽고 있습니다", english: "He is reading a book", pattern: "현재진행형", level: 2 },
    { korean: "비가 오고 있습니다", english: "It is raining", pattern: "현재진행형", level: 2 },
    { korean: "아이들은 뛰어다니고 있습니다", english: "The children are running", pattern: "현재진행형", level: 2 }
  ],
  "현재진행형_부정": [
    { korean: "그녀는 공부하고 있지 않습니다", english: "She is not studying", pattern: "현재진행형_부정", level: 2 },
    { korean: "우리는 영화를 보고 있지 않습니다", english: "We are not watching a movie", pattern: "현재진행형_부정", level: 2 }
  ],
  "현재진행형_질문": [
    { korean: "너는 무엇을 하고 있니?", english: "What are you doing?", pattern: "현재진행형_질문", level: 2 },
    { korean: "당신은 듣고 있습니까?", english: "Are you listening?", pattern: "현재진행형_질문", level: 2 },
    { korean: "그녀는 어디에서 일하고 있습니까?", english: "Where is she working?", pattern: "현재진행형_질문", level: 2 }
  ]
};

// Level 3+ Verb Patterns - Advanced verb conjugations with appropriate progression
export const verbPatterns: Record<string, { korean: string[]; english: string[] }> = {
  go: {
    korean: ['나는 학교에 간다', '나는 학교에 안 간다', '너는 학교에 가니?', '나는 학교에 가고 있다', '나는 학교에 가고 있지 않다', '너는 학교에 가고 있니?'],
    english: ['I go to school', 'I don\'t go to school', 'Do you go to school?', 'I\'m going to school', 'I\'m not going to school', 'Are you going to school?']
  },
  sell: {
    korean: ['그는 과일을 판다', '그는 과일을 팔지 않는다', '그가 과일을 파니?', '그는 과일을 팔고 있다', '그는 과일을 팔고 있지 않다', '그가 과일을 팔고 있니?'],
    english: ['He sells fruit', 'He doesn\'t sell fruit', 'Does he sell fruit?', 'He\'s selling fruit', 'He\'s not selling fruit', 'Is he selling fruit?']
  },
  study: {
    korean: ['나는 영어를 공부한다', '나는 영어를 공부하지 않는다', '너는 영어를 공부하니?', '나는 영어를 공부하고 있다', '나는 영어를 공부하고 있지 않다', '너는 영어를 공부하고 있니?'],
    english: ['I study English', 'I don\'t study English', 'Do you study English?', 'I\'m studying English', 'I\'m not studying English', 'Are you studying English?']
  },
  write: {
    korean: ['그녀는 편지를 쓴다', '그녀는 편지를 쓰지 않는다', '그녀가 편지를 쓰니?', '그녀는 편지를 쓰고 있다', '그녀는 편지를 쓰고 있지 않다', '그녀가 편지를 쓰고 있니?'],
    english: ['She writes letters', 'She doesn\'t write letters', 'Does she write letters?', 'She\'s writing letters', 'She\'s not writing letters', 'Is she writing letters?']
  },
  call: {
    korean: ['나는 친구에게 전화한다', '나는 친구에게 전화하지 않는다', '너는 친구에게 전화하니?', '나는 친구에게 전화하고 있다', '나는 친구에게 전화하고 있지 않다', '너는 친구에게 전화하고 있니?'],
    english: ['I call my friend', 'I don\'t call my friend', 'Do you call your friend?', 'I\'m calling my friend', 'I\'m not calling my friend', 'Are you calling your friend?']
  },
  eat: {
    korean: ['우리는 저녁을 먹는다', '우리는 저녁을 먹지 않는다', '당신들은 저녁을 먹나요?', '우리는 저녁을 먹고 있다', '우리는 저녁을 먹고 있지 않다', '당신들은 저녁을 먹고 있나요?'],
    english: ['We eat dinner', 'We don\'t eat dinner', 'Do you eat dinner?', 'We\'re eating dinner', 'We\'re not eating dinner', 'Are you eating dinner?']
  },
  work: {
    korean: ['그들은 회사에서 일한다', '그들은 회사에서 일하지 않는다', '그들이 회사에서 일하니?', '그들은 회사에서 일하고 있다', '그들은 회사에서 일하고 있지 않다', '그들이 회사에서 일하고 있니?'],
    english: ['They work at the company', 'They don\'t work at the company', 'Do they work at the company?', 'They\'re working at the company', 'They\'re not working at the company', 'Are they working at the company?']
  },
  read: {
    korean: ['나는 신문을 읽는다', '나는 신문을 읽지 않는다', '너는 신문을 읽니?', '나는 신문을 읽고 있다', '나는 신문을 읽고 있지 않다', '너는 신문을 읽고 있니?'],
    english: ['I read the newspaper', 'I don\'t read the newspaper', 'Do you read the newspaper?', 'I\'m reading the newspaper', 'I\'m not reading the newspaper', 'Are you reading the newspaper?']
  },
  play: {
    korean: ['아이들은 축구를 한다', '아이들은 축구를 하지 않는다', '아이들이 축구를 하니?', '아이들은 축구를 하고 있다', '아이들은 축구를 하고 있지 않다', '아이들이 축구를 하고 있니?'],
    english: ['Children play soccer', 'Children don\'t play soccer', 'Do children play soccer?', 'Children are playing soccer', 'Children aren\'t playing soccer', 'Are children playing soccer?']
  },
  watch: {
    korean: ['그는 텔레비전을 본다', '그는 텔레비전을 보지 않는다', '그가 텔레비전을 보니?', '그는 텔레비전을 보고 있다', '그는 텔레비전을 보고 있지 않다', '그가 텔레비전을 보고 있니?'],
    english: ['He watches television', 'He doesn\'t watch television', 'Does he watch television?', 'He\'s watching television', 'He\'s not watching television', 'Is he watching television?']
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
    // Level 1: Always use Be verb patterns in sequence
    const patternKeys = ["Be동사 현재", "Be동사 과거", "Be동사 미래"];
    const patterns = level1Patterns[currentVerb] || level1Patterns[patternKeys[0]];
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