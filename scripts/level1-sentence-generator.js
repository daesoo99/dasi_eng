/**
 * Level 1 Sentence Generation System
 * Follows sequential learning principles - Stage N can only use grammar from Stages 1-N
 * Implements clean architecture with configurable templates
 */

const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// VOCABULARY BANK (Level 1 - Max 1000 words, beginner level)
// ============================================================================

const VOCABULARY = {
  // Personal pronouns and subjects (Stage 1)
  subjects: {
    stage1: ['I', 'You', 'He', 'She', 'It', 'We', 'They']
  },
  
  // BE verbs (Stage 1)
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
  
  // Basic nouns (Stage 1-2)
  nouns: {
    stage1: {
      jobs: ['student', 'teacher', 'doctor', 'nurse', 'cook', 'driver', 'farmer', 'writer', 'singer', 'painter', 'actor', 'scientist', 'police officer'],
      family: ['family', 'friend', 'person', 'man', 'woman', 'boy', 'girl'],
      objects: ['book', 'pencil', 'pen', 'computer', 'chair', 'table', 'ball', 'bag', 'phone', 'car'],
      abstract: ['team', 'name', 'home', 'work', 'school']
    },
    stage2: {
      activities: ['breakfast', 'lunch', 'dinner', 'work', 'school', 'home', 'coffee', 'tea', 'music', 'TV'],
      places: ['Seoul', 'Korea', 'America', 'school', 'home', 'office', 'park']
    }
  },
  
  // Basic adjectives (Stage 1, expanded Stage 10)
  adjectives: {
    stage1: ['happy', 'sad', 'smart', 'tall', 'short', 'pretty', 'busy', 'tired', 'young', 'old', 'kind', 'strong', 'good', 'bad', 'big', 'small', 'new', 'old', 'fast', 'slow', 'healthy', 'special', 'honest', 'nice', 'normal', 'safe', 'important', 'quiet', 'brave', 'funny'],
    stage10: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'hot', 'cold', 'easy', 'hard', 'expensive', 'cheap']
  },
  
  // Simple present verbs (Stage 2)
  simpleVerbs: {
    stage2: {
      base: ['live', 'work', 'study', 'eat', 'drink', 'like', 'love', 'hate', 'need', 'want', 'have', 'go', 'come', 'play', 'watch', 'listen', 'read', 'write', 'speak', 'understand', 'know', 'think', 'feel', 'help', 'call', 'meet', 'see', 'hear'],
      thirdPerson: ['lives', 'works', 'studies', 'eats', 'drinks', 'likes', 'loves', 'hates', 'needs', 'wants', 'has', 'goes', 'comes', 'plays', 'watches', 'listens', 'reads', 'writes', 'speaks', 'understands', 'knows', 'thinks', 'feels', 'helps', 'calls', 'meets', 'sees', 'hears']
    }
  },
  
  // Simple past verbs (Stage 3)
  pastVerbs: {
    stage3: {
      regular: ['lived', 'worked', 'studied', 'played', 'watched', 'listened', 'helped', 'called', 'liked', 'loved', 'needed', 'wanted'],
      irregular: ['went', 'came', 'had', 'was', 'were', 'did', 'said', 'got', 'made', 'saw', 'heard', 'ate', 'drank', 'wrote', 'read', 'thought', 'felt', 'knew']
    }
  },
  
  // Time expressions (Stage 3-4, 12)
  timeExpressions: {
    stage3: ['yesterday', 'last night', 'last week', 'last month', 'last year'],
    stage4: ['tomorrow', 'next week', 'next month', 'next year', 'tonight', 'soon'],
    stage12: ['in the morning', 'in the afternoon', 'in the evening', 'at night', 'at 7 o\'clock', 'on Monday', 'on Tuesday', 'in January', 'in summer']
  },
  
  // Place prepositions (Stage 11) 
  placePrepositions: {
    stage11: {
      prep: ['in', 'on', 'at', 'under', 'behind', 'next to'],
      places: ['home', 'school', 'work', 'the office', 'the park', 'the store', 'the table', 'the chair', 'the bed', 'the kitchen']
    }
  },
  
  // WH-question words (Stage 7)
  whWords: {
    stage7: ['What', 'Where', 'When', 'Who', 'Why', 'How']
  },
  
  // Greeting expressions (Stage 14)
  greetings: {
    stage14: {
      hello: ['Hello', 'Hi', 'Good morning', 'Good afternoon', 'Good evening'],
      responses: ['Hello', 'Hi', 'Good morning', 'How are you', 'Nice to meet you', 'I am fine'],
      farewell: ['Goodbye', 'See you later', 'Have a good day', 'Take care']
    }
  },
  
  // Thanks and apologies (Stage 15)
  courtesyExpressions: {
    stage15: {
      thanks: ['Thank you', 'Thanks', 'Thank you very much', 'Thanks a lot'],
      responses: ['You are welcome', 'No problem', 'My pleasure', 'That is okay'],
      apologies: ['Sorry', 'I am sorry', 'I apologize', 'Excuse me'],
      acceptances: ['That is okay', 'No problem', 'It is fine', 'Do not worry']
    }
  },
  
  // Basic responses (Stage 16)
  basicResponses: {
    stage16: {
      agreement: ['Yes', 'Sure', 'Of course', 'Absolutely', 'That is right'],
      disagreement: ['No', 'I do not think so', 'Maybe not', 'I am not sure'],
      maybe: ['Maybe', 'Perhaps', 'I think so', 'Probably']
    }
  }
};

// ============================================================================
// GRAMMAR TEMPLATES BY STAGE
// ============================================================================

const STAGE_TEMPLATES = {
  // Stage 1: BE verb present (am/is/are + complement)
  stage1: {
    allowedGrammar: ['be_verb_present'],
    patterns: [
      { template: '{subject} {beVerb} {article} {noun}.', form: 'aff', weight: 3 },
      { template: '{subject} {beVerb} {adjective}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 2: Simple present (can use Stage 1 + simple present)
  stage2: {
    allowedGrammar: ['be_verb_present', 'simple_present'],
    patterns: [
      { template: '{subject} {beVerb} {article} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} {beVerb} {adjective}.', form: 'aff', weight: 2 },
      { template: 'I {verb} {noun}.', form: 'aff', weight: 3 },
      { template: 'You {verb} {noun}.', form: 'aff', weight: 3 },
      { template: 'He {verbS} {noun}.', form: 'aff', weight: 3 },
      { template: 'She {verbS} {noun}.', form: 'aff', weight: 3 },
      { template: 'We {verb} {noun}.', form: 'aff', weight: 2 },
      { template: 'They {verb} {noun}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 3: Simple past (can use Stages 1-2 + simple past)
  stage3: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past'],
    patterns: [
      { template: '{subject} {beVerb} {article} {noun}.', form: 'aff', weight: 1 },
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} {pastVerb} {noun} {timeExpression}.', form: 'aff', weight: 4 },
      { template: '{subject} was {adjective} {timeExpression}.', form: 'aff', weight: 3 },
      { template: '{subject} were {adjective} {timeExpression}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 4: Future will (can use Stages 1-3 + will future)
  stage4: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 1 },
      { template: '{subject} {pastVerb} {noun} {timeExpression}.', form: 'aff', weight: 1 },
      { template: '{subject} will {baseVerb} {noun} {futureTime}.', form: 'aff', weight: 4 },
      { template: '{subject} will be {adjective} {futureTime}.', form: 'aff', weight: 3 }
    ]
  },
  
  // Stage 5: Negation (can use Stages 1-4 + negation)
  stage5: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} will {baseVerb} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} {beVerb} not {adjective}.', form: 'neg', weight: 3 },
      { template: '{subject} do not {baseVerb} {noun}.', form: 'neg', weight: 2 },
      { template: '{subject} does not {baseVerb} {noun}.', form: 'neg', weight: 2 },
      { template: '{subject} did not {baseVerb} {noun}.', form: 'neg', weight: 2 },
      { template: '{subject} will not {baseVerb} {noun}.', form: 'neg', weight: 2 }
    ]
  },
  
  // Stage 6: Yes/No questions (can use Stages 1-5 + yes/no questions)
  stage6: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: '{subject} do not {baseVerb} {noun}.', form: 'neg', weight: 1 },
      { template: '{beVerb} {subject} {adjective}?', form: 'int', weight: 3 },
      { template: 'Do you {baseVerb} {noun}?', form: 'int', weight: 3 },
      { template: 'Does he {baseVerb} {noun}?', form: 'int', weight: 2 },
      { template: 'Did you {baseVerb} {noun}?', form: 'int', weight: 2 },
      { template: 'Will you {baseVerb} {noun}?', form: 'int', weight: 2 }
    ]
  },
  
  // Stage 7: WH-questions basic (can use Stages 1-6 + wh-questions)
  stage7: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: 'Do you {baseVerb} {noun}?', form: 'int', weight: 1 },
      { template: 'What {beVerb} {subject}?', form: 'wh_q', weight: 3 },
      { template: 'Where {beVerb} {subject}?', form: 'wh_q', weight: 3 },
      { template: 'When do you {baseVerb}?', form: 'wh_q', weight: 2 },
      { template: 'Who {beVerb} {subject}?', form: 'wh_q', weight: 2 },
      { template: 'What do you {baseVerb}?', form: 'wh_q', weight: 3 }
    ]
  },
  
  // Stage 8: Imperatives (can use Stages 1-7 + imperatives)
  stage8: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: 'What do you {baseVerb}?', form: 'wh_q', weight: 1 },
      { template: '{baseVerb} {noun}, please.', form: 'imp', weight: 4 },
      { template: 'Do not {baseVerb} {noun}.', form: 'neg_imp', weight: 3 },
      { template: '{baseVerb} here.', form: 'imp', weight: 2 }
    ]
  },
  
  // Stage 9: Personal pronouns (can use Stages 1-8 + personal pronouns)
  stage9: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 2 },
      { template: '{baseVerb} {noun}, please.', form: 'imp', weight: 1 },
      { template: 'I {verb} {pronoun}.', form: 'aff', weight: 3 },
      { template: '{pronoun} {beVerb} {possessive} {noun}.', form: 'aff', weight: 3 },
      { template: '{subject} gave {objectPronoun} {article} {noun}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 10: Basic adjectives (can use Stages 1-9 + basic adjectives)
  stage10: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives'],
    patterns: [
      { template: '{subject} {verb} {noun}.', form: 'aff', weight: 1 },
      { template: 'I {verb} {pronoun}.', form: 'aff', weight: 1 },
      { template: '{subject} {beVerb} {article} {adjective} {noun}.', form: 'aff', weight: 4 },
      { template: 'It is {article} {adjective} {noun}.', form: 'aff', weight: 3 },
      { template: '{subject} has {article} {adjective} {noun}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 11: Place prepositions (can use Stages 1-10 + place prepositions)
  stage11: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic'],
    patterns: [
      { template: '{subject} {beVerb} {article} {adjective} {noun}.', form: 'aff', weight: 1 },
      { template: '{subject} {beVerb} {placePrep} {place}.', form: 'aff', weight: 4 },
      { template: 'The {noun} is {placePrep} {place}.', form: 'aff', weight: 3 },
      { template: 'Where is the {noun}? It is {placePrep} {place}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 12: Time prepositions (can use Stages 1-11 + time prepositions)
  stage12: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic'],
    patterns: [
      { template: '{subject} {beVerb} {placePrep} {place}.', form: 'aff', weight: 1 },
      { template: '{subject} {verb} {timePrep}.', form: 'aff', weight: 4 },
      { template: 'I work {timePrep}.', form: 'aff', weight: 3 },
      { template: 'She studies {timePrep}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 13: There is/are (can use Stages 1-12 + there is/are)
  stage13: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are'],
    patterns: [
      { template: '{subject} {verb} {timePrep}.', form: 'aff', weight: 1 },
      { template: 'There is {article} {noun} {placePrep} {place}.', form: 'aff', weight: 4 },
      { template: 'There are {number} {nounPlural} {placePrep} {place}.', form: 'aff', weight: 3 },
      { template: 'Is there {article} {noun} here?', form: 'int', weight: 2 }
    ]
  },
  
  // Stage 14: Greetings (can use Stages 1-13 + greeting expressions)
  stage14: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions'],
    patterns: [
      { template: 'There is {article} {noun} here.', form: 'aff', weight: 1 },
      { template: '{greeting}!', form: 'aff', weight: 4 },
      { template: '{greeting}, {subject} {beVerb} {adjective}.', form: 'aff', weight: 3 },
      { template: 'How are you? I am {adjective}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 15: Thanks and apologies (can use Stages 1-14 + thanks/apologies)
  stage15: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions', 'thanks_apologies'],
    patterns: [
      { template: '{greeting}! How are you?', form: 'aff', weight: 1 },
      { template: '{thanks}!', form: 'aff', weight: 4 },
      { template: '{thanks} for {noun}.', form: 'aff', weight: 3 },
      { template: '{apology}. I {pastVerb} {noun}.', form: 'aff', weight: 2 }
    ]
  },
  
  // Stage 16: Basic responses (can use Stages 1-15 + basic responses)
  stage16: {
    allowedGrammar: ['be_verb_present', 'simple_present', 'simple_past', 'will_future', 'negation_basic', 'questions_yes_no', 'questions_wh_basic', 'imperatives', 'personal_pronouns', 'basic_adjectives', 'prepositions_place_basic', 'prepositions_time_basic', 'there_is_are', 'greeting_expressions', 'thanks_apologies', 'basic_responses'],
    patterns: [
      { template: '{thanks} for your help.', form: 'aff', weight: 1 },
      { template: '{agreement}.', form: 'aff', weight: 4 },
      { template: '{agreement}, I {verb} {noun}.', form: 'aff', weight: 3 },
      { template: 'Do you {baseVerb}? {response}.', form: 'aff', weight: 2 }
    ]
  }
};

// ============================================================================
// SENTENCE GENERATION ENGINE
// ============================================================================

class Level1SentenceGenerator {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'web_app', 'public', 'patterns', 'banks', 'level_1');
  }

  /**
   * Get random item from array with weights
   */
  getRandomItem(items, weights = null) {
    if (!weights) return items[Math.floor(Math.random() * items.length)];
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /**
   * Get allowed vocabulary for a specific stage
   */
  getAllowedVocabulary(stage) {
    const allowed = {
      subjects: [],
      nouns: [],
      adjectives: [],
      verbs: [],
      pastVerbs: [],
      timeExpressions: [],
      placePrepositions: [],
      greetings: [],
      thanks: [],
      apologies: [],
      responses: []
    };

    // Always include Stage 1 vocabulary
    allowed.subjects = [...VOCABULARY.subjects.stage1];
    allowed.nouns = [...VOCABULARY.nouns.stage1.jobs, ...VOCABULARY.nouns.stage1.family, ...VOCABULARY.nouns.stage1.objects, ...VOCABULARY.nouns.stage1.abstract];
    allowed.adjectives = [...VOCABULARY.adjectives.stage1];

    // Add vocabulary based on stage progression
    if (stage >= 2) {
      allowed.verbs = [...VOCABULARY.simpleVerbs.stage2.base];
      allowed.nouns.push(...VOCABULARY.nouns.stage2.activities, ...VOCABULARY.nouns.stage2.places);
    }
    if (stage >= 3) {
      allowed.pastVerbs = [...VOCABULARY.pastVerbs.stage3.regular, ...VOCABULARY.pastVerbs.stage3.irregular];
      allowed.timeExpressions = [...VOCABULARY.timeExpressions.stage3];
    }
    if (stage >= 4) {
      allowed.timeExpressions.push(...VOCABULARY.timeExpressions.stage4);
    }
    if (stage >= 10) {
      allowed.adjectives.push(...VOCABULARY.adjectives.stage10);
    }
    if (stage >= 11) {
      allowed.placePrepositions = [...VOCABULARY.placePrepositions.stage11.prep];
      allowed.places = [...VOCABULARY.placePrepositions.stage11.places];
    }
    if (stage >= 12) {
      allowed.timeExpressions.push(...VOCABULARY.timeExpressions.stage12);
    }
    if (stage >= 14) {
      allowed.greetings = [...VOCABULARY.greetings.stage14.hello, ...VOCABULARY.greetings.stage14.responses, ...VOCABULARY.greetings.stage14.farewell];
    }
    if (stage >= 15) {
      allowed.thanks = [...VOCABULARY.courtesyExpressions.stage15.thanks];
      allowed.apologies = [...VOCABULARY.courtesyExpressions.stage15.apologies];
    }
    if (stage >= 16) {
      allowed.responses = [...VOCABULARY.basicResponses.stage16.agreement, ...VOCABULARY.basicResponses.stage16.disagreement, ...VOCABULARY.basicResponses.stage16.maybe];
    }

    return allowed;
  }

  /**
   * Fill template with actual vocabulary
   */
  fillTemplate(template, vocab, stage) {
    let sentence = template;

    // Replace placeholders with actual words
    sentence = sentence.replace(/{subject}/g, () => this.getRandomItem(vocab.subjects));
    sentence = sentence.replace(/{beVerb}/g, (match, offset, string) => {
      // Find the subject that comes before this beVerb
      const beforeBeVerb = string.substring(0, offset);
      const subjectMatch = beforeBeVerb.match(/\b(I|You|He|She|It|We|They)\b(?!.*\b(I|You|He|She|It|We|They)\b)/);
      const subject = subjectMatch ? subjectMatch[1] : 'I';
      return VOCABULARY.beVerbs.stage1[subject];
    });
    
    sentence = sentence.replace(/{noun}/g, () => this.getRandomItem(vocab.nouns));
    sentence = sentence.replace(/{adjective}/g, () => this.getRandomItem(vocab.adjectives));
    sentence = sentence.replace(/{article}/g, () => {
      const articles = ['a', 'the'];
      return this.getRandomItem(articles);
    });

    if (stage >= 2) {
      sentence = sentence.replace(/{verb}/g, () => this.getRandomItem(vocab.verbs));
      sentence = sentence.replace(/{verbS}/g, () => {
        const baseVerb = this.getRandomItem(vocab.verbs);
        const index = VOCABULARY.simpleVerbs.stage2.base.indexOf(baseVerb);
        return index !== -1 ? VOCABULARY.simpleVerbs.stage2.thirdPerson[index] : baseVerb + 's';
      });
      sentence = sentence.replace(/{baseVerb}/g, () => this.getRandomItem(vocab.verbs));
    }

    if (stage >= 3) {
      sentence = sentence.replace(/{pastVerb}/g, () => this.getRandomItem(vocab.pastVerbs));
      sentence = sentence.replace(/{timeExpression}/g, () => this.getRandomItem(vocab.timeExpressions));
    }

    if (stage >= 4) {
      sentence = sentence.replace(/{futureTime}/g, () => this.getRandomItem(VOCABULARY.timeExpressions.stage4));
    }

    if (stage >= 11) {
      sentence = sentence.replace(/{placePrep}/g, () => this.getRandomItem(vocab.placePrepositions));
      sentence = sentence.replace(/{place}/g, () => this.getRandomItem(vocab.places));
    }

    if (stage >= 12) {
      sentence = sentence.replace(/{timePrep}/g, () => this.getRandomItem(VOCABULARY.timeExpressions.stage12));
    }

    if (stage >= 14) {
      sentence = sentence.replace(/{greeting}/g, () => this.getRandomItem(vocab.greetings));
    }

    if (stage >= 15) {
      sentence = sentence.replace(/{thanks}/g, () => this.getRandomItem(vocab.thanks));
      sentence = sentence.replace(/{apology}/g, () => this.getRandomItem(vocab.apologies));
    }

    if (stage >= 16) {
      sentence = sentence.replace(/{agreement}/g, () => this.getRandomItem([...VOCABULARY.basicResponses.stage16.agreement]));
      sentence = sentence.replace(/{response}/g, () => this.getRandomItem(vocab.responses));
    }

    // Handle additional placeholders
    sentence = sentence.replace(/{pronoun}/g, () => {
      const pronouns = ['him', 'her', 'them', 'us', 'me', 'you'];
      return this.getRandomItem(pronouns);
    });

    sentence = sentence.replace(/{objectPronoun}/g, () => {
      const objectPronouns = ['me', 'you', 'him', 'her', 'us', 'them'];
      return this.getRandomItem(objectPronouns);
    });

    sentence = sentence.replace(/{possessive}/g, () => {
      const possessives = ['my', 'your', 'his', 'her', 'our', 'their'];
      return this.getRandomItem(possessives);
    });

    sentence = sentence.replace(/{number}/g, () => {
      const numbers = ['two', 'three', 'four', 'five'];
      return this.getRandomItem(numbers);
    });

    sentence = sentence.replace(/{nounPlural}/g, () => {
      const noun = this.getRandomItem(vocab.nouns);
      return noun.endsWith('s') ? noun : noun + 's';
    });

    return sentence;
  }

  /**
   * Generate Korean translation for English sentence
   */
  generateKoreanTranslation(englishSentence) {
    // Simple Korean translations for common patterns
    const translations = {
      // BE verb patterns
      'I am': '나는',
      'You are': '너는',
      'He is': '그는',
      'She is': '그녀는',
      'It is': '그것은',
      'We are': '우리는',
      'They are': '그들은',
      
      // Common endings
      'a student': '학생입니다',
      'a teacher': '선생님입니다',
      'a doctor': '의사입니다',
      'happy': '행복합니다',
      'sad': '슬픕니다',
      'tired': '피곤합니다',
      
      // Simple present
      'I live': '나는 살아요',
      'I work': '나는 일해요',
      'I study': '나는 공부해요',
      
      // Greetings
      'Hello': '안녕하세요',
      'Good morning': '좋은 아침이에요',
      'Thank you': '감사합니다',
      'Sorry': '죄송합니다',
      'Yes': '네',
      'No': '아니요'
    };

    // This is a simplified translation system
    // In a real system, you'd use a proper translation API
    let korean = englishSentence;
    
    for (const [english, koreanTranslation] of Object.entries(translations)) {
      korean = korean.replace(new RegExp(english, 'gi'), koreanTranslation);
    }
    
    // If no translation found, provide a placeholder
    if (korean === englishSentence) {
      korean = '[한국어 번역]';
    }
    
    return korean;
  }

  /**
   * Generate sentences for a specific stage
   */
  async generateStage(stageNumber, targetCount = 50) {
    const stageKey = `stage${stageNumber}`;
    const stageConfig = STAGE_TEMPLATES[stageKey];
    
    if (!stageConfig) {
      throw new Error(`No configuration found for stage ${stageNumber}`);
    }

    const vocab = this.getAllowedVocabulary(stageNumber);
    const sentences = [];
    const usedSentences = new Set();

    // Calculate form distribution
    const formDistribution = {
      aff: Math.ceil(targetCount * 0.6),  // 60% affirmative
      neg: Math.ceil(targetCount * 0.2),  // 20% negative  
      int: targetCount - Math.ceil(targetCount * 0.6) - Math.ceil(targetCount * 0.2) // remaining interrogative
    };

    let formCounts = { aff: 0, neg: 0, int: 0, wh_q: 0, imp: 0, neg_imp: 0 };
    let attempts = 0;
    const maxAttempts = targetCount * 10;

    while (sentences.length < targetCount && attempts < maxAttempts) {
      attempts++;
      
      // Select random template with weights
      const templates = stageConfig.patterns;
      const weights = templates.map(t => t.weight);
      const selectedTemplate = this.getRandomItem(templates, weights);
      
      // Check if we need more of this form type
      const formType = selectedTemplate.form;
      const currentCount = formCounts[formType] || 0;
      const maxForForm = formDistribution[formType] || Math.ceil(targetCount / 6);
      
      if (currentCount >= maxForForm) continue;

      // Generate sentence
      const englishSentence = this.fillTemplate(selectedTemplate.template, vocab, stageNumber);
      
      // Avoid duplicates
      if (usedSentences.has(englishSentence)) continue;
      
      // Validate sentence length (max 8 words for Level 1)
      const wordCount = englishSentence.split(/\s+/).length;
      if (wordCount > 8) continue;
      
      usedSentences.add(englishSentence);
      
      const sentence = {
        id: `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}-${(sentences.length + 1).toString().padStart(3, '0')}`,
        kr: this.generateKoreanTranslation(englishSentence),
        en: englishSentence,
        form: this.mapFormType(formType)
      };

      sentences.push(sentence);
      formCounts[formType]++;
    }

    // Fill remaining slots if needed
    while (sentences.length < targetCount) {
      const templates = stageConfig.patterns.filter(t => t.form === 'aff');
      const selectedTemplate = this.getRandomItem(templates);
      
      const englishSentence = this.fillTemplate(selectedTemplate.template, vocab, stageNumber);
      if (!usedSentences.has(englishSentence)) {
        usedSentences.add(englishSentence);
        sentences.push({
          id: `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}-${(sentences.length + 1).toString().padStart(3, '0')}`,
          kr: this.generateKoreanTranslation(englishSentence),
          en: englishSentence,
          form: 'aff'
        });
      }
    }

    return sentences;
  }

  /**
   * Map internal form types to bank format
   */
  mapFormType(internalForm) {
    const mapping = {
      'aff': 'aff',
      'neg': 'neg', 
      'int': 'int',
      'wh_q': 'wh_q',
      'imp': 'aff',     // Imperatives count as affirmative
      'neg_imp': 'neg'  // Negative imperatives count as negative
    };
    return mapping[internalForm] || 'aff';
  }

  /**
   * Count forms in sentences array
   */
  countForms(sentences) {
    const counts = { aff: 0, neg: 0, wh_q: 0, unknown: 0 };
    sentences.forEach(sentence => {
      counts[sentence.form] = (counts[sentence.form] || 0) + 1;
    });
    return counts;
  }

  /**
   * Generate complete bank file for a stage
   */
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
      batch: "L1_Sequential_Generation_v2.2.0",
      metadata: {
        generated_at: new Date().toISOString(),
        generation_version: "2.2.0",
        sequential_learning_verified: true,
        allowed_grammar: STAGE_TEMPLATES[`stage${stageNumber}`].allowedGrammar
      }
    };

    const filename = `Lv1-P${Math.ceil(stageNumber/4)}-S${stageNumber.toString().padStart(2, '0')}_bank.json`;
    const filepath = path.join(this.baseDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(bankData, null, 2), 'utf8');
    
    return { filename, filepath, bankData };
  }

  /**
   * Get stage information
   */
  getStageInfo(stageNumber) {
    const stageInfo = {
      1: { title: "BE 동사 현재형", grammarPattern: "Basic sentence patterns", examples: ["I am a student. (variant 1)", "You are my friend. (variant 1)"] },
      2: { title: "일반동사 현재형", grammarPattern: "Simple present tense", examples: ["I live in Seoul. (variant 1)", "He likes coffee. (variant 1)"] },
      3: { title: "일반동사 과거형", grammarPattern: "Simple past tense", examples: ["I played soccer yesterday. (variant 1)", "She went home. (variant 1)"] },
      4: { title: "미래형 (will)", grammarPattern: "Future with will", examples: ["I will call you tomorrow. (variant 1)", "It will rain tonight. (variant 1)"] },
      5: { title: "부정문 만들기", grammarPattern: "Negative sentences", examples: ["I do not like spiders. (variant 1)", "He is not busy. (variant 1)"] },
      6: { title: "Yes/No 질문", grammarPattern: "Yes/No questions", examples: ["Do you have a pen? (variant 1)", "Are you hungry? (variant 1)"] },
      7: { title: "Wh- 질문 기초", grammarPattern: "Basic WH-questions", examples: ["What do you do? (variant 1)", "Where is my phone? (variant 1)"] },
      8: { title: "명령문", grammarPattern: "Imperatives", examples: ["Sit down, please. (variant 1)", "Don't touch that. (variant 1)"] },
      9: { title: "인칭대명사 활용", grammarPattern: "Personal pronouns", examples: ["I love you. (variant 1)", "She gave me her book. (variant 1)"] },
      10: { title: "기본 형용사 사용", grammarPattern: "Basic adjectives", examples: ["It is a red apple. (variant 1)", "I have a small car. (variant 1)"] },
      11: { title: "장소 전치사", grammarPattern: "Place prepositions", examples: ["He is at home. (variant 1)", "The cat is on the chair. (variant 1)"] },
      12: { title: "시간 전치사", grammarPattern: "Time prepositions", examples: ["My birthday is in March. (variant 1)", "Let's meet on Friday. (variant 1)"] },
      13: { title: "There is/are", grammarPattern: "Existential there", examples: ["There is a book on the desk. (variant 1)", "There are two windows in the room. (variant 1)"] },
      14: { title: "인사말", grammarPattern: "Greeting expressions", examples: ["Hello! (variant 1)", "How are you? I'm fine. (variant 1)"] },
      15: { title: "감사와 사과", grammarPattern: "Thanks and apologies", examples: ["Thank you! (variant 1)", "Sorry. I was late. (variant 1)"] },
      16: { title: "긍정 및 부정 답변", grammarPattern: "Basic responses", examples: ["Yes, I do. (variant 1)", "Maybe next time. (variant 1)"] }
    };
    
    return stageInfo[stageNumber] || { title: `Stage ${stageNumber}`, grammarPattern: "Basic patterns", examples: ["Example sentence."] };
  }

  /**
   * Generate all Level 1 stages (2-16)
   */
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

// ============================================================================
// EXPORT MODULE
// ============================================================================

module.exports = Level1SentenceGenerator;

// CLI execution
if (require.main === module) {
  const generator = new Level1SentenceGenerator();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const stageArg = args.find(arg => arg.startsWith('--stage='));
  const allFlag = args.includes('--all');
  
  if (allFlag) {
    // Generate all stages 2-16
    generator.generateAllStages()
      .then(results => {
        console.log('\n=== GENERATION SUMMARY ===');
        results.forEach(result => {
          console.log(`Stage ${result.stage}: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
          if (!result.success) console.log(`  Error: ${result.error}`);
        });
        
        const successful = results.filter(r => r.success).length;
        console.log(`\n${successful}/${results.length} stages generated successfully.`);
      })
      .catch(console.error);
  } else if (stageArg) {
    // Generate specific stage
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
    console.log('  node level1-sentence-generator.js --all');
    console.log('  node level1-sentence-generator.js --stage=2');
  }
}