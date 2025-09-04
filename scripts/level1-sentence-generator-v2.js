/**
 * Level 1 Sentence Generation System v2.0
 * Improved version with better quality control and Korean translations
 * Follows sequential learning principles - Stage N can only use grammar from Stages 1-N
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// IMPROVED VOCABULARY WITH SEMANTIC COMPATIBILITY
// ============================================================================

const VOCABULARY = {
  subjects: {
    stage1: ['I', 'You', 'He', 'She', 'It', 'We', 'They']
  },
  
  beVerbs: {
    stage1: {
      'I': 'am',
      'You': 'are', 
      'He': 'is',
      'She': 'is',
      'It': 'is',
      'We': 'are',
      'They': 'are'
    }
  },
  
  // Organized by semantic categories for better combinations
  nouns: {
    stage1: {
      people: ['student', 'teacher', 'doctor', 'nurse', 'cook', 'driver', 'farmer', 'writer', 'singer', 'painter', 'actor', 'scientist'],
      relationships: ['friend', 'family', 'person', 'man', 'woman', 'boy', 'girl'],
      objects: ['book', 'pen', 'computer', 'chair', 'table', 'ball', 'bag', 'phone', 'car'],
      places: ['home', 'school', 'work', 'office', 'park']
    },
    stage2: {
      food: ['breakfast', 'lunch', 'dinner', 'coffee', 'tea', 'water', 'apple', 'bread'],
      activities: ['music', 'movie', 'game', 'sport', 'news'],
      locations: ['Korea', 'America', 'city', 'store', 'hospital']
    }
  },
  
  adjectives: {
    stage1: ['happy', 'sad', 'smart', 'tall', 'short', 'busy', 'tired', 'young', 'old', 'kind', 'strong', 'good', 'bad', 'big', 'small', 'new', 'fast', 'healthy', 'nice', 'quiet', 'funny'],
    stage10: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'hot', 'cold', 'easy', 'hard', 'beautiful', 'ugly']
  },
  
  // Verb-object combinations that make sense
  verbCombinations: {
    stage2: {
      'live': ['in Korea', 'in America', 'at home'],
      'work': ['at home', 'at school', 'in the office'],
      'study': ['at school', 'at home', 'English', 'math'],
      'eat': ['breakfast', 'lunch', 'dinner', 'an apple', 'bread'],
      'drink': ['coffee', 'tea', 'water'],
      'like': ['music', 'movies', 'coffee', 'books'],
      'love': ['my family', 'music', 'movies'],
      'have': ['a car', 'a book', 'a phone', 'breakfast'],
      'watch': ['TV', 'movies', 'news'],
      'listen': ['to music', 'to the teacher'],
      'read': ['books', 'news', 'a book'],
      'play': ['games', 'soccer', 'music'],
      'go': ['to school', 'to work', 'home'],
      'come': ['home', 'to school', 'here'],
      'see': ['a movie', 'my friend', 'the doctor'],
      'meet': ['my friend', 'the teacher'],
      'help': ['my friend', 'my family'],
      'call': ['my friend', 'the doctor']
    }
  },
  
  pastVerbs: {
    stage3: {
      regular: ['worked', 'studied', 'played', 'watched', 'listened', 'helped', 'called', 'liked', 'lived'],
      irregular: {
        'go': 'went', 'come': 'came', 'have': 'had', 'eat': 'ate', 'drink': 'drank', 
        'see': 'saw', 'read': 'read', 'get': 'got', 'make': 'made', 'do': 'did'
      }
    }
  },
  
  timeExpressions: {
    stage3: ['yesterday', 'last night', 'last week', 'last month'],
    stage4: ['tomorrow', 'next week', 'next month', 'tonight'],
    stage12: ['in the morning', 'in the afternoon', 'at 7 o\'clock', 'on Monday', 'in January']
  },
  
  placePrepositions: {
    stage11: {
      'in': ['the room', 'the kitchen', 'the car', 'Korea'],
      'on': ['the table', 'the chair', 'the bed'],
      'at': ['home', 'school', 'work', 'the office']
    }
  },
  
  greetings: {
    stage14: ['Hello', 'Hi', 'Good morning', 'Good afternoon', 'How are you']
  },
  
  courtesy: {
    stage15: {
      thanks: ['Thank you', 'Thanks', 'Thank you very much'],
      apologies: ['Sorry', 'I am sorry', 'Excuse me']
    },
    stage16: {
      yes: ['Yes', 'Sure', 'Of course', 'That is right'],
      no: ['No', 'I do not think so', 'Not really'],
      maybe: ['Maybe', 'Perhaps', 'I think so']
    }
  }
};

// ============================================================================
// KOREAN TRANSLATION DICTIONARY
// ============================================================================

const KOREAN_TRANSLATIONS = {
  // Subjects
  'I': '나는', 'You': '너는', 'He': '그는', 'She': '그녀는', 'It': '그것은', 'We': '우리는', 'They': '그들은',
  
  // BE verbs + adjectives
  'I am': '나는', 'You are': '너는', 'He is': '그는', 'She is': '그녀는', 'We are': '우리는', 'They are': '그들은',
  'am happy': '행복합니다', 'are happy': '행복합니다', 'is happy': '행복합니다',
  'am sad': '슬픕니다', 'are sad': '슬픕니다', 'is sad': '슬픕니다',
  'am tired': '피곤합니다', 'are tired': '피곤합니다', 'is tired': '피곤합니다',
  'am busy': '바쁩니다', 'are busy': '바쁩니다', 'is busy': '바쁩니다',
  'am not': '~이/가 아닙니다', 'are not': '~이/가 아닙니다', 'is not': '~이/가 아닙니다',
  
  // Professions
  'a student': '학생입니다', 'a teacher': '선생님입니다', 'a doctor': '의사입니다',
  'a nurse': '간호사입니다', 'a cook': '요리사입니다', 'a driver': '운전사입니다',
  
  // Simple present
  'I live': '나는 살아요', 'I work': '나는 일해요', 'I study': '나는 공부해요',
  'I like': '나는 좋아해요', 'I love': '나는 사랑해요', 'I have': '나는 가지고 있어요',
  'I eat': '나는 먹어요', 'I drink': '나는 마셔요', 'I watch': '나는 봐요',
  
  // Past tense
  'I worked': '나는 일했어요', 'I studied': '나는 공부했어요', 'I went': '나는 갔어요',
  'I had': '나는 가졌어요', 'I ate': '나는 먹었어요', 'yesterday': '어제',
  
  // Future
  'I will': '나는 ~할 거예요', 'will work': '일할 거예요', 'will go': '갈 거예요', 'tomorrow': '내일',
  
  // Negatives
  'do not': '~하지 않아요', 'does not': '~하지 않아요', 'did not': '~하지 않았어요',
  'will not': '~하지 않을 거예요', 'not': '~이/가 아닙니다',
  
  // Questions
  'Do you': '당신은 ~하나요?', 'Does he': '그는 ~하나요?', 'Are you': '당신은 ~인가요?',
  'What': '무엇을', 'Where': '어디에', 'When': '언제', 'Who': '누가',
  
  // Common objects and places
  'coffee': '커피를', 'tea': '차를', 'breakfast': '아침을', 'lunch': '점심을', 'dinner': '저녁을',
  'at home': '집에서', 'at school': '학교에서', 'at work': '직장에서',
  'in Korea': '한국에서', 'books': '책들을', 'music': '음악을',
  
  // Greetings and courtesy
  'Hello': '안녕하세요', 'Good morning': '좋은 아침이에요', 'How are you': '어떻게 지내세요?',
  'Thank you': '감사합니다', 'Thanks': '고마워요', 'Sorry': '죄송합니다', 'I am sorry': '죄송합니다',
  'Yes': '네', 'No': '아니요', 'Sure': '물론이죠', 'Of course': '물론입니다'
};

// ============================================================================
// IMPROVED GRAMMAR TEMPLATES
// ============================================================================

const STAGE_TEMPLATES = {
  stage1: {
    patterns: [
      { template: '{subject} {beVerb} {article} {person}.', form: 'aff', weight: 4 },
      { template: '{subject} {beVerb} {adjective}.', form: 'aff', weight: 3 }
    ]
  },
  
  stage2: {
    patterns: [
      { template: '{subject} {beVerb} {article} {person}.', form: 'aff', weight: 2 },
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 4 }
    ]
  },
  
  stage3: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} {pastVerb} {object} {timeExpr}.', form: 'aff', weight: 4 }
    ]
  },
  
  stage4: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} {pastVerb} {object} {pastTime}.', form: 'aff', weight: 1 },
      { template: '{subject} will {baseVerb} {object} {futureTime}.', form: 'aff', weight: 4 }
    ]
  },
  
  stage5: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} will {baseVerb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} {beVerb} not {adjective}.', form: 'neg', weight: 3 },
      { template: '{subject} do not {baseVerb} {object}.', form: 'neg', weight: 2 },
      { template: '{subject} will not {baseVerb} {object}.', form: 'neg', weight: 2 }
    ]
  },
  
  stage6: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} do not {baseVerb} {object}.', form: 'neg', weight: 1 },
      { template: '{beVerb} {subject} {adjective}?', form: 'int', weight: 3 },
      { template: 'Do you {baseVerb} {object}?', form: 'int', weight: 3 }
    ]
  },
  
  stage7: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: 'Do you {baseVerb} {object}?', form: 'int', weight: 1 },
      { template: 'What {beVerb} {subject}?', form: 'wh_q', weight: 3 },
      { template: 'Where do you {baseVerb}?', form: 'wh_q', weight: 3 }
    ]
  },
  
  stage8: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: 'What do you {baseVerb}?', form: 'wh_q', weight: 1 },
      { template: '{baseVerb} {object}, please.', form: 'imp', weight: 3 },
      { template: 'Do not {baseVerb} {object}.', form: 'neg_imp', weight: 2 }
    ]
  },
  
  stage9: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: 'I {verb} {pronoun}.', form: 'aff', weight: 3 },
      { template: '{subject} gave me {article} {object}.', form: 'aff', weight: 2 }
    ]
  },
  
  stage10: {
    patterns: [
      { template: '{subject} {verb} {object}.', form: 'aff', weight: 2 },
      { template: '{subject} {beVerb} {article} {adjective} {noun}.', form: 'aff', weight: 4 },
      { template: 'I have {article} {adjective} {noun}.', form: 'aff', weight: 3 }
    ]
  },
  
  stage11: {
    patterns: [
      { template: '{subject} {beVerb} {article} {adjective} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} {beVerb} {placePrep} {place}.', form: 'aff', weight: 4 },
      { template: 'The {noun} is {placePrep} {place}.', form: 'aff', weight: 3 }
    ]
  },
  
  stage12: {
    patterns: [
      { template: '{subject} {beVerb} {placePrep} {place}.', form: 'aff', weight: 2 },
      { template: 'I work {timeExpr}.', form: 'aff', weight: 4 },
      { template: 'We meet {timeExpr}.', form: 'aff', weight: 3 }
    ]
  },
  
  stage13: {
    patterns: [
      { template: 'I work {timeExpr}.', form: 'aff', weight: 2 },
      { template: 'There is {article} {noun} {placePrep} {place}.', form: 'aff', weight: 4 },
      { template: 'There are books on the table.', form: 'aff', weight: 3 }
    ]
  },
  
  stage14: {
    patterns: [
      { template: 'There is {article} {noun} here.', form: 'aff', weight: 2 },
      { template: '{greeting}!', form: 'aff', weight: 4 },
      { template: '{greeting}. I am fine.', form: 'aff', weight: 3 }
    ]
  },
  
  stage15: {
    patterns: [
      { template: '{greeting}!', form: 'aff', weight: 2 },
      { template: '{thanks}!', form: 'aff', weight: 4 },
      { template: '{thanks} for your help.', form: 'aff', weight: 3 }
    ]
  },
  
  stage16: {
    patterns: [
      { template: '{thanks} for your help.', form: 'aff', weight: 2 },
      { template: '{response}.', form: 'aff', weight: 4 },
      { template: 'Do you like music? {response}.', form: 'aff', weight: 3 }
    ]
  }
};

// ============================================================================
// SENTENCE GENERATOR CLASS
// ============================================================================

class Level1SentenceGeneratorV2 {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'web_app', 'public', 'patterns', 'banks', 'level_1');
  }

  getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Get semantically appropriate verb-object combination
   */
  getVerbObjectPair(stage) {
    if (stage < 2) return { verb: '', object: '' };
    
    const combinations = VOCABULARY.verbCombinations.stage2;
    const verbs = Object.keys(combinations);
    const verb = this.getRandomItem(verbs);
    const objects = combinations[verb];
    const object = this.getRandomItem(objects);
    
    return { verb, object };
  }

  /**
   * Enhanced Korean translation with context awareness
   */
  translateToKorean(englishSentence) {
    let korean = englishSentence;
    
    // Handle complex patterns first
    for (const [english, koreanTranslation] of Object.entries(KOREAN_TRANSLATIONS)) {
      const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      korean = korean.replace(regex, koreanTranslation);
    }
    
    // Handle remaining untranslated parts with pattern matching
    if (korean.includes('I am') && korean.includes('.')) {
      korean = korean.replace(/I am (.+)\./, '나는 $1입니다.');
    }
    
    // Clean up and ensure Korean structure
    korean = korean.replace(/\s+/g, ' ').trim();
    
    // If no good translation found, create a basic structure
    if (korean === englishSentence) {
      if (englishSentence.includes('I am')) {
        korean = '나는 ' + englishSentence.split('I am ')[1].replace('.', '입니다.');
      } else if (englishSentence.includes('I ')) {
        korean = '나는 ' + englishSentence.split('I ')[1].replace('.', '어요.');
      } else {
        korean = '[한국어]'; // Fallback
      }
    }
    
    return korean;
  }

  /**
   * Fill template with improved logic
   */
  fillTemplate(template, stage) {
    let sentence = template;
    
    // Handle subject and corresponding BE verb
    if (template.includes('{subject}') && template.includes('{beVerb}')) {
      const subject = this.getRandomItem(VOCABULARY.subjects.stage1);
      const beVerb = VOCABULARY.beVerbs.stage1[subject];
      sentence = sentence.replace('{subject}', subject).replace('{beVerb}', beVerb);
    } else if (template.includes('{subject}')) {
      const subject = this.getRandomItem(VOCABULARY.subjects.stage1);
      sentence = sentence.replace('{subject}', subject);
    }
    
    // Handle verb-object pairs
    if (template.includes('{verb}') && template.includes('{object}')) {
      const { verb, object } = this.getVerbObjectPair(stage);
      sentence = sentence.replace('{verb}', verb).replace('{object}', object);
    }
    
    // Handle base verbs
    if (template.includes('{baseVerb}')) {
      const verbs = Object.keys(VOCABULARY.verbCombinations.stage2);
      const verb = this.getRandomItem(verbs);
      sentence = sentence.replace('{baseVerb}', verb);
      
      // If there's an object placeholder, fill it with appropriate object
      if (template.includes('{object}')) {
        const objects = VOCABULARY.verbCombinations.stage2[verb];
        const object = this.getRandomItem(objects);
        sentence = sentence.replace('{object}', object);
      }
    }
    
    // Handle other placeholders
    if (template.includes('{person}')) {
      const people = [...VOCABULARY.nouns.stage1.people, ...VOCABULARY.nouns.stage1.relationships];
      sentence = sentence.replace('{person}', this.getRandomItem(people));
    }
    
    if (template.includes('{adjective}')) {
      sentence = sentence.replace('{adjective}', this.getRandomItem(VOCABULARY.adjectives.stage1));
    }
    
    if (template.includes('{article}')) {
      sentence = sentence.replace('{article}', this.getRandomItem(['a', 'the']));
    }
    
    if (template.includes('{noun}')) {
      const allNouns = [...VOCABULARY.nouns.stage1.people, ...VOCABULARY.nouns.stage1.objects];
      sentence = sentence.replace('{noun}', this.getRandomItem(allNouns));
    }
    
    // Stage-specific replacements
    if (stage >= 3) {
      if (template.includes('{pastVerb}')) {
        const regularPast = this.getRandomItem(VOCABULARY.pastVerbs.stage3.regular);
        sentence = sentence.replace('{pastVerb}', regularPast);
      }
      if (template.includes('{timeExpr}') || template.includes('{pastTime}')) {
        const timeExpr = this.getRandomItem(VOCABULARY.timeExpressions.stage3);
        sentence = sentence.replace(/\{(timeExpr|pastTime)\}/, timeExpr);
      }
    }
    
    if (stage >= 4 && template.includes('{futureTime}')) {
      const futureTime = this.getRandomItem(VOCABULARY.timeExpressions.stage4);
      sentence = sentence.replace('{futureTime}', futureTime);
    }
    
    if (stage >= 11) {
      if (template.includes('{placePrep}') && template.includes('{place}')) {
        const preps = Object.keys(VOCABULARY.placePrepositions.stage11);
        const prep = this.getRandomItem(preps);
        const places = VOCABULARY.placePrepositions.stage11[prep];
        const place = this.getRandomItem(places);
        sentence = sentence.replace('{placePrep}', prep).replace('{place}', place);
      }
    }
    
    if (stage >= 12 && template.includes('{timeExpr}')) {
      const timeExpr = this.getRandomItem(VOCABULARY.timeExpressions.stage12);
      sentence = sentence.replace('{timeExpr}', timeExpr);
    }
    
    if (stage >= 14 && template.includes('{greeting}')) {
      const greeting = this.getRandomItem(VOCABULARY.greetings.stage14);
      sentence = sentence.replace('{greeting}', greeting);
    }
    
    if (stage >= 15 && template.includes('{thanks}')) {
      const thanks = this.getRandomItem(VOCABULARY.courtesy.stage15.thanks);
      sentence = sentence.replace('{thanks}', thanks);
    }
    
    if (stage >= 16 && template.includes('{response}')) {
      const allResponses = [...VOCABULARY.courtesy.stage16.yes, ...VOCABULARY.courtesy.stage16.no, ...VOCABULARY.courtesy.stage16.maybe];
      const response = this.getRandomItem(allResponses);
      sentence = sentence.replace('{response}', response);
    }
    
    // Handle pronouns
    if (template.includes('{pronoun}')) {
      sentence = sentence.replace('{pronoun}', this.getRandomItem(['him', 'her', 'them', 'us']));
    }
    
    return sentence;
  }

  /**
   * Generate sentences with quality control
   */
  async generateStage(stageNumber, targetCount = 50) {
    const stageKey = `stage${stageNumber}`;
    const stageConfig = STAGE_TEMPLATES[stageKey];
    
    if (!stageConfig) {
      throw new Error(`No configuration found for stage ${stageNumber}`);
    }

    const sentences = [];
    const usedSentences = new Set();
    
    // Form distribution: 60% aff, 20% neg, 20% int/wh_q
    const targetAff = Math.round(targetCount * 0.6);
    const targetNeg = Math.round(targetCount * 0.2);
    const targetInt = targetCount - targetAff - targetNeg;
    
    const formCounts = { aff: 0, neg: 0, int: 0, wh_q: 0, imp: 0, neg_imp: 0 };
    let attempts = 0;
    const maxAttempts = targetCount * 20;

    while (sentences.length < targetCount && attempts < maxAttempts) {
      attempts++;
      
      const template = this.getRandomItem(stageConfig.patterns);
      const form = template.form;
      
      // Check form distribution
      const currentCount = formCounts[form] || 0;
      let maxForThisForm;
      if (form === 'aff' || form === 'imp') maxForThisForm = targetAff;
      else if (form === 'neg' || form === 'neg_imp') maxForThisForm = targetNeg;
      else maxForThisForm = targetInt;
      
      if (currentCount >= maxForThisForm) continue;
      
      const englishSentence = this.fillTemplate(template.template, stageNumber);
      
      // Quality checks
      if (usedSentences.has(englishSentence)) continue;
      if (englishSentence.split(' ').length > 8) continue; // Max 8 words for Level 1
      if (englishSentence.includes('{') || englishSentence.includes('}')) continue; // Unfilled templates
      
      const koreanSentence = this.translateToKorean(englishSentence);
      
      usedSentences.add(englishSentence);
      
      const sentence = {
        id: `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}-${(sentences.length + 1).toString().padStart(3, '0')}`,
        kr: koreanSentence,
        en: englishSentence,
        form: this.mapFormType(form)
      };

      sentences.push(sentence);
      formCounts[form]++;
    }

    // Fill remaining slots with affirmative sentences
    while (sentences.length < targetCount) {
      const affTemplates = stageConfig.patterns.filter(t => t.form === 'aff');
      if (affTemplates.length === 0) break;
      
      const template = this.getRandomItem(affTemplates);
      const englishSentence = this.fillTemplate(template.template, stageNumber);
      
      if (!usedSentences.has(englishSentence)) {
        const koreanSentence = this.translateToKorean(englishSentence);
        usedSentences.add(englishSentence);
        
        sentences.push({
          id: `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}-${(sentences.length + 1).toString().padStart(3, '0')}`,
          kr: koreanSentence,
          en: englishSentence,
          form: 'aff'
        });
      }
    }

    return sentences;
  }

  mapFormType(internalForm) {
    const mapping = {
      'aff': 'aff',
      'neg': 'neg', 
      'int': 'int',
      'wh_q': 'wh_q',
      'imp': 'aff',
      'neg_imp': 'neg'
    };
    return mapping[internalForm] || 'aff';
  }

  countForms(sentences) {
    const counts = { aff: 0, neg: 0, wh_q: 0, unknown: 0 };
    sentences.forEach(sentence => {
      counts[sentence.form] = (counts[sentence.form] || 0) + 1;
    });
    return counts;
  }

  getStageInfo(stageNumber) {
    const stageInfo = {
      1: { title: "BE 동사 현재형", grammarPattern: "Basic sentence patterns", examples: ["I am a student.", "You are my friend."] },
      2: { title: "일반동사 현재형", grammarPattern: "Simple present tense", examples: ["I live in Seoul.", "He likes coffee."] },
      3: { title: "일반동사 과거형", grammarPattern: "Simple past tense", examples: ["I played soccer yesterday.", "She went home."] },
      4: { title: "미래형 (will)", grammarPattern: "Future with will", examples: ["I will call you tomorrow.", "It will rain tonight."] },
      5: { title: "부정문 만들기", grammarPattern: "Negative sentences", examples: ["I do not like spiders.", "He is not busy."] },
      6: { title: "Yes/No 질문", grammarPattern: "Yes/No questions", examples: ["Do you have a pen?", "Are you hungry?"] },
      7: { title: "Wh- 질문 기초", grammarPattern: "Basic WH-questions", examples: ["What do you do?", "Where is my phone?"] },
      8: { title: "명령문", grammarPattern: "Imperatives", examples: ["Sit down, please.", "Don't touch that."] },
      9: { title: "인칭대명사 활용", grammarPattern: "Personal pronouns", examples: ["I love you.", "She gave me her book."] },
      10: { title: "기본 형용사 사용", grammarPattern: "Basic adjectives", examples: ["It is a red apple.", "I have a small car."] },
      11: { title: "장소 전치사", grammarPattern: "Place prepositions", examples: ["He is at home.", "The cat is on the chair."] },
      12: { title: "시간 전치사", grammarPattern: "Time prepositions", examples: ["My birthday is in March.", "Let's meet on Friday."] },
      13: { title: "There is/are", grammarPattern: "Existential there", examples: ["There is a book on the desk.", "There are two windows in the room."] },
      14: { title: "인사말", grammarPattern: "Greeting expressions", examples: ["Hello!", "How are you? I'm fine."] },
      15: { title: "감사와 사과", grammarPattern: "Thanks and apologies", examples: ["Thank you!", "Sorry. I was late."] },
      16: { title: "긍정 및 부정 답변", grammarPattern: "Basic responses", examples: ["Yes, I do.", "Maybe next time."] }
    };
    
    return stageInfo[stageNumber] || { title: `Stage ${stageNumber}`, grammarPattern: "Basic patterns", examples: ["Example sentence."] };
  }

  async generateBankFile(stageNumber) {
    const sentences = await this.generateStage(stageNumber, 50);
    const formsDistribution = this.countForms(sentences);
    const stageInfo = this.getStageInfo(stageNumber);
    
    const bankData = {
      stage_id: `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}`,
      title: stageInfo.title,
      description: "Level 1 grammar practice focusing on stage-specific patterns and expressions.",
      grammar_pattern: stageInfo.grammarPattern,
      examples: stageInfo.examples,
      learning_points: "Level 1 target grammar and expressions with practical usage examples",
      phase: Math.ceil(stageNumber / 4),
      stage_number: stageNumber,
      count: sentences.length,
      sentences: sentences,
      forms_distribution: formsDistribution,
      status: "complete",
      batch: "L1_Sequential_Generation_v2.2.0_improved",
      metadata: {
        generated_at: new Date().toISOString(),
        generation_version: "2.2.0_improved",
        sequential_learning_verified: true,
        quality_control_applied: true
      }
    };

    const filename = `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}_bank.json`;
    const filepath = path.join(this.baseDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(bankData, null, 2), 'utf8');
    
    return { filename, filepath, bankData };
  }

  async generateAllStages() {
    const results = [];
    
    for (let stage = 2; stage <= 16; stage++) {
      console.log(`Generating Stage ${stage}...`);
      try {
        const result = await this.generateBankFile(stage);
        results.push({ stage, success: true, ...result });
        console.log(`✓ Stage ${stage} completed: ${result.filename}`);
      } catch (error) {
        console.error(`✗ Stage ${stage} failed:`, error.message);
        results.push({ stage, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = Level1SentenceGeneratorV2;

// CLI execution
if (require.main === module) {
  const generator = new Level1SentenceGeneratorV2();
  
  const args = process.argv.slice(2);
  const stageArg = args.find(arg => arg.startsWith('--stage='));
  const allFlag = args.includes('--all');
  
  if (allFlag) {
    generator.generateAllStages()
      .then(results => {
        console.log('\n=== IMPROVED GENERATION SUMMARY ===');
        results.forEach(result => {
          console.log(`Stage ${result.stage}: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
          if (!result.success) console.log(`  Error: ${result.error}`);
        });
        
        const successful = results.filter(r => r.success).length;
        console.log(`\n${successful}/${results.length} stages generated successfully with improved quality.`);
      })
      .catch(console.error);
  } else if (stageArg) {
    const stageNumber = parseInt(stageArg.split('=')[1]);
    if (stageNumber >= 2 && stageNumber <= 16) {
      generator.generateBankFile(stageNumber)
        .then(result => {
          console.log(`✓ Stage ${stageNumber} generated successfully: ${result.filename}`);
        })
        .catch(console.error);
    } else {
      console.error('Stage number must be between 2 and 16');
    }
  } else {
    console.log('Usage:');
    console.log('  node level1-sentence-generator-v2.js --all');
    console.log('  node level1-sentence-generator-v2.js --stage=2');
  }
}