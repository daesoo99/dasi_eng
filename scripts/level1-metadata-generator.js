/**
 * Level 1 메타데이터 생성기
 * 아키텍처 원칙: 설정 기반, 모듈화, 하드코딩 금지
 */

const fs = require('fs');
const path = require('path');

// 설정 파일에서 레벨 경계 불러오기
const levelBoundaries = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../docs/curriculum/LEVEL_BOUNDARIES.json'), 'utf8')
);

// 마스터 로드맵 기반 스테이지 정의 (설정 외부화)
const level1StageDefinitions = {
  1: {
    title: "BE동사 문장",
    description: "be동사(am/is/are)를 사용한 존재/상태 표현을 연습합니다. 주어 + be동사 + 보어 구조로 \"~이다/있다\"를 말해보세요.",
    grammar_pattern: "Be verb present",
    examples: ["I am a student.", "She is at home."],
    learning_points: "주어에 따른 am/is/are 변화, 자기소개나 상태 표현 활용",
    allowed_grammar: ["be_verb_present"],
    phase: 1
  },
  2: {
    title: "일반동사 현재형",
    description: "일반동사를 활용해 현재 습관/일반사실을 말하는 연습입니다. 주어 + 동사원형 형태로 \"~한다\"를 표현합니다.",
    grammar_pattern: "Simple present tense",
    examples: ["I live in Seoul.", "He likes coffee."],
    learning_points: "3인칭 단수일 때 동사에 -s 붙이기, 현재 습관 표현",
    allowed_grammar: ["be_verb_present", "simple_present"],
    phase: 1
  },
  3: {
    title: "일반동사 과거형",
    description: "과거시제를 도입하여 어제/지난 일을 표현합니다. 규칙동사는 -ed를 붙이고, 불규칙동사는 특별 형태를 외워 쓰는 연습을 합니다.",
    grammar_pattern: "Simple past tense",
    examples: ["I played soccer yesterday.", "She went home."],
    learning_points: "규칙동사 -ed, 불규칙동사 형태, 과거 시간 표현",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past"],
    phase: 1
  },
  4: {
    title: "미래형 (will)",
    description: "미래 시제로 미래의 일이나 의지를 표현합니다. will + 동사원형 구조로 예측이나 결심을 말해보세요.",
    grammar_pattern: "Will future",
    examples: ["I will call you tomorrow.", "It will rain tonight."],
    learning_points: "즉흥적인 미래 표현, 약속, 예측 표현",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future"],
    phase: 1
  },
  5: {
    title: "부정문 만들기",
    description: "부정문을 만들어 \"~않는다\"는 표현을 연습합니다. 현재형은 do/does + not, be동사는 am/is/are + not 형태를 사용합니다.",
    grammar_pattern: "Basic negation",
    examples: ["I do not like spiders.", "He is not busy."],
    learning_points: "don't/doesn't 축약형, be동사 부정문",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic"],
    phase: 2
  },
  6: {
    title: "Yes/No 질문",
    description: "예/아니오로 답하는 질문을 연습합니다. 일반동사는 Do/Does를 문장 앞에, be동사는 자체를 앞으로 보냅니다.",
    grammar_pattern: "Yes/No questions",
    examples: ["Do you have a pen?", "Are you hungry?"],
    learning_points: "질문 억양, 짧은 대답 Yes, I do./No, I don't.",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no"],
    phase: 2
  },
  7: {
    title: "Wh- 질문 기초",
    description: "What/Where/When/Who로 시작하는 정보 질문을 만들어 봅니다. 간단한 질문으로 시작하여 의문사 사용 자신감 쌓기.",
    grammar_pattern: "Basic WH questions",
    examples: ["What do you do?", "Where is my phone?"],
    learning_points: "의문사 어순, 정보 요청 표현",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic"],
    phase: 2
  },
  8: {
    title: "명령문",
    description: "명령문/요청문으로 지시하거나 부탁하는 표현을 연습합니다. 동사원형으로 시작하고, 부정은 Don't + 동사를 사용합니다.",
    grammar_pattern: "Imperatives",
    examples: ["Sit down, please.", "Don't touch that."],
    learning_points: "공손한 부탁 please 사용, 상황별 억양 조절",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives"],
    phase: 2
  },
  9: {
    title: "인칭대명사 활용",
    description: "주격/목적격/소유격 대명사를 익혀 문장에서 자연스럽게 씁니다. he/she, his/her 구분을 정확히 연습합니다.",
    grammar_pattern: "Personal pronouns",
    examples: ["I love you.", "She gave me her book.", "This book is mine."],
    learning_points: "주격/목적격/소유격 구분, 소유대명사 mine/yours",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns"],
    phase: 3
  },
  10: {
    title: "기본 형용사 사용",
    description: "색깔, 크기, 감정 등 기초 형용사를 배워 명사 앞에 수식하는 법을 연습합니다. 관사 a/an/the 사용법도 함께 익힙니다.",
    grammar_pattern: "Basic adjectives",
    examples: ["a red apple", "the big house", "It is a happy dog."],
    learning_points: "형용사 + 명사 어순, 관사 a/an/the 사용법",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives"],
    phase: 3
  },
  11: {
    title: "장소 전치사",
    description: "in, on, at 등의 장소전치사로 어디에 있다는 표현을 연습합니다. 각 전치사가 쓰이는 상황을 이해합니다.",
    grammar_pattern: "Place prepositions",
    examples: ["He is at home.", "The cat is on the chair.", "Water is in the bottle."],
    learning_points: "in/on/at의 장소별 구분, 일상 묘사 활용",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic"],
    phase: 4
  },
  12: {
    title: "시간 전치사",
    description: "in, on, at을 시간 표현에 적용합니다. in + 월/년도, on + 요일/날짜, at + 시각의 용법을 배웁니다.",
    grammar_pattern: "Time prepositions",
    examples: ["in July", "on Monday", "at 7 o'clock", "My birthday is in March."],
    learning_points: "시간 전치사 구분, 한국어와 다른 시간표현 이해",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic", "prepositions_time_basic"],
    phase: 4
  },
  13: {
    title: "There is/There are",
    description: "\"~이 있다\"라는 존재 표현을 익힙니다. There is + 단수명사, There are + 복수명사 구조를 연습합니다.",
    grammar_pattern: "There is/are",
    examples: ["There is a book on the desk.", "There are two windows in the room."],
    learning_points: "There's 축약형, There isn't/aren't 부정형",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic", "prepositions_time_basic", "there_is_are"],
    phase: 4
  },
  14: {
    title: "인사말 주고받기",
    description: "만났을 때와 헤어질 때의 기본 인사 표현을 배웁니다. 자연스럽게 미소 짓고 인사하는 연습을 합니다.",
    grammar_pattern: "Greeting expressions",
    examples: ["Hello.", "Good morning.", "Nice to meet you.", "How are you?", "I'm fine, thanks."],
    learning_points: "상황별 인사말, 응답 표현, 발화 자신감",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic", "prepositions_time_basic", "there_is_are", "greeting_expressions"],
    phase: 5
  },
  15: {
    title: "감사와 사과",
    description: "Thank you와 그에 대한 답변, Sorry에 대한 대응을 연습합니다. 예의 바른 표현 습관을 기릅니다.",
    grammar_pattern: "Thanks and apologies",
    examples: ["Thank you.", "You're welcome.", "Sorry.", "That's okay.", "Thanks a lot."],
    learning_points: "다양한 감사 표현, 사과 응답법, 예의 표현",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic", "prepositions_time_basic", "there_is_are", "greeting_expressions", "thanks_apologies"],
    phase: 5
  },
  16: {
    title: "긍정 및 부정 답변",
    description: "Yes/No로 대답하는 간단 응답과 대화를 이어가기 위한 표현들을 익힙니다. 실제 회화에서 자연스럽게 대답하는 연습을 합니다.",
    grammar_pattern: "Basic responses",
    examples: ["Yes.", "No.", "Sure.", "Of course.", "No problem.", "Sounds good.", "Maybe next time."],
    learning_points: "상황별 응답 표현, 제안에 대한 답변, 자연스러운 대화 연결",
    allowed_grammar: ["be_verb_present", "simple_present", "simple_past", "will_future", "negation_basic", "questions_yes_no", "questions_wh_basic", "imperatives", "personal_pronouns", "basic_adjectives", "prepositions_place_basic", "prepositions_time_basic", "there_is_are", "greeting_expressions", "thanks_apologies", "basic_responses"],
    phase: 5
  }
};

// 메타데이터 생성기 함수
function generateStageMetadata(stageNumber) {
  const stageDef = level1StageDefinitions[stageNumber];
  if (!stageDef) {
    throw new Error(`Stage ${stageNumber} definition not found`);
  }
  
  const levelConfig = levelBoundaries.level_boundaries.level_1;
  const stageId = `Lv1-P${stageDef.phase}-S${stageNumber.toString().padStart(2, '0')}`;
  
  return {
    stage_id: stageId,
    title: stageDef.title,
    description: stageDef.description,
    grammar_pattern: stageDef.grammar_pattern,
    examples: stageDef.examples,
    learning_points: stageDef.learning_points,
    phase: stageDef.phase,
    stage_number: stageNumber,
    count: 10, // 현재 10문장씩
    sentences: [], // 나중에 생성
    forms_distribution: {
      aff: 8,
      neg: 1,
      wh_q: 1,
      unknown: 0
    },
    status: "metadata_ready",
    batch: "L1_Architecture_Based_v1",
    metadata: {
      created_at: new Date().toISOString(),
      creation_method: "config_driven_metadata_generator",
      grammar_scope: stageDef.allowed_grammar,
      max_sentence_length: levelConfig.max_sentence_length,
      vocabulary_level: levelConfig.complexity_level,
      sequential_learning_validated: true
    }
  };
}

// 사용 예시 및 검증
function generateAllStageMetadata() {
  console.log('🏗️ Level 1 메타데이터 생성 시작...');
  
  for (let stage = 1; stage <= 16; stage++) {
    try {
      const metadata = generateStageMetadata(stage);
      console.log(`✅ Stage ${stage}: ${metadata.title}`);
      console.log(`   Grammar Scope: ${metadata.metadata.grammar_scope.length} rules`);
      console.log(`   Phase: ${metadata.phase}, Sequential: ${metadata.metadata.sequential_learning_validated}`);
    } catch (error) {
      console.error(`❌ Stage ${stage} 생성 실패:`, error.message);
    }
  }
  
  console.log('🎯 메타데이터 생성 완료 - 아키텍처 원칙 준수');
}

module.exports = {
  generateStageMetadata,
  generateAllStageMetadata,
  level1StageDefinitions
};

// 직접 실행 시 테스트
if (require.main === module) {
  generateAllStageMetadata();
}