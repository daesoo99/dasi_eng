# DaSi English 단어장 구현을 위한 데이터 분석 및 설계

## 📊 Level 1과 2 패턴 파일 분석 결과

### 🔍 데이터 분석 개요

**분석 범위**: 
- Level 1: 16개 패턴 파일
- Level 2: 20개 패턴 파일  
- 총 분석된 문장 수: 약 1,180개

### 📈 주요 통계

| 항목 | 수치 | 비율 |
|------|------|------|
| **총 고유 단어 수** | 326개 | 100% |
| **Level 1 전용 단어** | 130개 | 39.9% |
| **Level 2 전용 단어** | 125개 | 38.3% |
| **공통 단어** | 71개 | 21.8% |

### 🎯 카테고리별 단어 분포

```
동사 (verb): 41개 (12.6%)
명사 (noun): 44개 (13.5%) 
형용사 (adjective): 28개 (8.6%)
장소 (place): 6개 (1.8%)
시간 (time): 14개 (4.3%)
숫자 (number): 2개 (0.6%)
기타 (other): 191개 (58.6%)
```

### ⭐ 최다 빈출 단어 TOP 20

| 순위 | 단어 | 총 빈도 | 카테고리 | 난이도 | L1빈도 | L2빈도 |
|------|------|---------|----------|--------|--------|--------|
| 1 | there | 93 | place | 2 | 86 | 7 |
| 2 | home | 48 | noun | 1 | 43 | 5 |
| 3 | here | 47 | place | 2 | 42 | 5 |
| 4 | work | 45 | verb | 1 | 44 | 1 |
| 5 | go | 41 | verb | 1 | 32 | 9 |
| 6 | school | 41 | noun | 1 | 34 | 7 |
| 7 | friend | 36 | noun | 1 | 33 | 3 |
| 8 | book | 34 | noun | 1 | 26 | 8 |
| 9 | music | 34 | noun | 2 | 30 | 4 |
| 10 | movie | 34 | noun | 2 | 31 | 3 |

### 📊 난이도별 분포

| 난이도 | 단어 수 | 비율 | 특징 |
|--------|---------|------|------|
| 1 | 25개 | 7.7% | 기본 일상 단어 |
| 2 | 49개 | 15.0% | 초급 필수 단어 |
| 3 | 114개 | 35.0% | 중급 기초 단어 |
| 4 | 100개 | 30.7% | 중급 심화 단어 |
| 5 | 38개 | 11.6% | 고급 단어 |

## 🎯 단어장 서비스 구현 방향

### 1. 🏗️ 데이터 구조 설계

```typescript
// 기본 단어 인터페이스
interface VocabularyWord {
  id: string;                    // 고유 ID
  word: string;                  // 단어
  category: WordCategory;        // 카테고리
  difficulty: number;            // 난이도 (1-5)
  firstAppearance: number;       // 첫 등장 레벨
  
  // 빈도 정보
  frequency: {
    level1: number;              // Level 1 출현 빈도
    level2: number;              // Level 2 출현 빈도  
    total: number;               // 총 출현 빈도
  };
  
  // 학습 정보
  learning: {
    introduced: boolean;         // 학습자에게 소개됨
    mastery: MasteryLevel;       // 숙련도
    lastReviewed: Date;          // 마지막 복습일
    nextReview: Date;            // 다음 복습일
    reviewCount: number;         // 복습 횟수
  };
  
  // SRS 연동 정보
  srs: {
    cardId?: string;             // SRS 카드 ID
    interval: number;            // 복습 간격 (일)
    easeFactor: number;          // 용이도 인수
    strength: number;            // 기억 강도
  };
  
  // 맥락 정보
  context: {
    stages: string[];            // 등장한 스테이지들
    sentences: string[];         // 예문들 (최대 3개)
    relatedWords: string[];      // 관련 단어들
  };
}

// 카테고리 열거형
enum WordCategory {
  VERB = 'verb',
  NOUN = 'noun', 
  ADJECTIVE = 'adjective',
  PLACE = 'place',
  TIME = 'time',
  NUMBER = 'number',
  OTHER = 'other'
}

// 숙련도 레벨
enum MasteryLevel {
  UNKNOWN = 0,      // 미학습
  LEARNING = 1,     // 학습 중
  FAMILIAR = 2,     // 익숙함
  MASTERED = 3      // 완전 습득
}
```

### 2. 📚 단어장 서비스 아키텍처

```typescript
// 단어장 서비스 인터페이스
interface IVocabularyService {
  // 단어 관리
  getWordsByLevel(level: number): Promise<VocabularyWord[]>;
  getWordsByCategory(category: WordCategory): Promise<VocabularyWord[]>;
  getWordsByDifficulty(difficulty: number): Promise<VocabularyWord[]>;
  
  // 학습 진도 관리
  introduceWord(wordId: string, userId: string): Promise<void>;
  updateMastery(wordId: string, userId: string, mastery: MasteryLevel): Promise<void>;
  
  // SRS 연동
  createSRSCard(wordId: string, userId: string): Promise<string>;
  syncWithSRS(userId: string): Promise<void>;
  
  // 통계 및 분석
  getUserVocabularyStats(userId: string): Promise<VocabularyStats>;
  getRecommendedWords(userId: string, count: number): Promise<VocabularyWord[]>;
}

// 단어장 통계 인터페이스
interface VocabularyStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  masteredWords: number;
  categoryBreakdown: Record<WordCategory, number>;
  levelProgress: Record<number, number>;
}
```

### 3. 🎮 사용자 경험 (UX) 설계

#### 3.1 단어장 메인 화면
```
📖 My Vocabulary (326 words)

[진행률 바] ████████░░ 80% (261/326)

📊 Quick Stats
- 알고 있는 단어: 210개
- 학습 중인 단어: 51개  
- 복습 필요: 12개

🎯 Today's Goal
[ ] 새 단어 5개 학습하기
[ ] 복습 단어 10개 완료하기

🔍 Browse Words
[Level 1] [Level 2] [All Levels]
[Verbs] [Nouns] [Adjectives] [Other]
```

#### 3.2 단어 학습 카드
```
📝 Word Card #142/326

🔤 RESTAURANT
📱 /ˈrestərənt/
📖 noun • difficulty: 3

💬 Context Examples:
"We go to a restaurant for dinner."
"The restaurant is very popular."

🎯 Mastery: ██░░ Learning (2/4)
📅 Next Review: Tomorrow
🔄 Reviewed: 3 times

[Know It] [Learning] [Don't Know]
```

### 4. 🔧 기술 구현 전략

#### 4.1 데이터 저장
```typescript
// Firestore 컬렉션 구조
users/{userId}/vocabulary/{wordId} {
  mastery: MasteryLevel,
  introduced: boolean,
  lastReviewed: Timestamp,
  nextReview: Timestamp,
  reviewHistory: ReviewRecord[]
}

// 마스터 단어 데이터
vocabulary_master/{wordId} {
  // VocabularyWord 인터페이스 데이터
}
```

#### 4.2 SRS 시스템 연동
```typescript
class VocabularyService {
  async createSRSCardFromWord(word: VocabularyWord, userId: string): Promise<string> {
    const card: ReviewCard = {
      id: generateId(),
      content: {
        korean: `"${word.word}" 뜻 알기`,
        english: word.context.sentences[0],
        level: word.firstAppearance
      },
      memory: {
        strength: 0.3,
        easeFactor: 2.5,
        interval: 1
      },
      performance: {
        accuracy: [],
        responseTime: []
      }
    };
    
    return this.srsEngine.addCard(card, userId);
  }
}
```

#### 4.3 지능형 단어 추천
```typescript
class WordRecommendationEngine {
  getRecommendedWords(user: UserProfile): VocabularyWord[] {
    // 1. 사용자 현재 레벨 파악
    // 2. 아직 소개되지 않은 단어 중 적절한 난이도 필터링
    // 3. 빈도수 높은 단어 우선순위
    // 4. 카테고리 균형 고려
    // 5. SRS 복습 스케줄과 충돌 방지
  }
}
```

### 5. 📈 학습 효과 극대화 전략

#### 5.1 점진적 도입 (Progressive Introduction)
- **Level 1 기준**: 빈도 10회 이상 단어부터 우선 소개
- **Level 2 진입**: Level 1 핵심 단어 80% 숙지 후  
- **카테고리 균형**: 동사/명사/형용사를 3:4:2 비율로 균형 있게

#### 5.2 맥락 기반 학습 (Context-Based Learning)
- 단어가 실제 등장한 문장들을 예문으로 제공
- 같은 스테이지에서 등장한 연관 단어들 함께 학습
- 문법 패턴과 연계한 단어 학습

#### 5.3 SRS 연동 최적화
- 단어 숙련도에 따른 차별화된 복습 간격
- 문법 학습과 단어 복습의 시너지 효과
- 망각곡선을 고려한 개인화된 복습 스케줄

## 🚀 구현 우선순위

### Phase 1: 기본 단어장 (2주)
- [ ] VocabularyWord 데이터 모델 구현
- [ ] 기본 CRUD 서비스 개발
- [ ] 단어장 메인 화면 UI 개발

### Phase 2: SRS 연동 (1주)  
- [ ] 기존 SRS 시스템과 연동
- [ ] 단어 카드 자동 생성
- [ ] 학습 진도 동기화

### Phase 3: 지능형 기능 (2주)
- [ ] 단어 추천 엔진 개발
- [ ] 학습 통계 및 분석
- [ ] 개인화 학습 경로

### Phase 4: UX 고도화 (1주)
- [ ] 애니메이션 및 피드백 추가
- [ ] 음성 발음 기능
- [ ] 학습 게임화 요소

## 📋 기대 효과

1. **학습 효율성**: 빈도 기반 우선순위로 실용적 어휘 우선 학습
2. **기억 정착**: SRS 시스템 연동으로 장기 기억 강화  
3. **맥락 이해**: 실제 문장 속 맥락으로 단어 의미 자연스럽게 습득
4. **진도 관리**: 레벨별 체계적인 어휘 확장
5. **동기 부여**: 시각적 진도와 통계로 학습 성취감 제공

이 설계를 기반으로 DaSi English의 기존 SRS 시스템과 완벽히 통합된 강력한 단어장 기능을 구현할 수 있습니다.