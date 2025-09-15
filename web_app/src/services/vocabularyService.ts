/**
 * vocabularyService - 패턴 데이터에서 단어 추출 및 관리 서비스
 * - 레벨별 패턴 파일에서 단어 자동 추출
 * - 사용자 학습 진도에 맞는 단어장 제공
 * - 단어 학습 상태 관리 및 복습 추천
 */

export interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  level: number;
  stage?: number;
  category: 'pronoun' | 'verb' | 'adjective' | 'noun' | 'adverb' | 'preposition' | 'other';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  frequency: number; // 패턴에서 등장 빈도
  examples: {
    sentence: string;
    translation: string;
    stageId: string;
  }[];
  firstAppeared: string; // 처음 등장한 스테이지 ID
}

export interface UserVocabularyProgress {
  wordId: string;
  status: 'unknown' | 'learning' | 'known' | 'review';
  lastStudied?: Date;
  correctCount: number;
  wrongCount: number;
  isFavorite: boolean;
  nextReviewDate?: Date; // SRS 기반 복습일
}

export interface VocabularyStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  reviewWords: number;
  newWords: number;
  completionRate: number;
}

class VocabularyService {
  private vocabularyCache = new Map<string, VocabularyWord[]>();
  private userProgressCache = new Map<string, UserVocabularyProgress>();

  /**
   * 영어 문장에서 단어 추출 및 분류
   */
  private extractWordsFromSentence(sentence: string): Array<{ word: string; category: string }> {
    // 문장 정리: 구두점 제거, 소문자 변환
    const cleanSentence = sentence.toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanSentence.split(' ').filter(word => word.length > 0);
    
    return words.map(word => ({
      word: word.replace(/'/g, ''), // don't -> dont
      category: this.categorizeWord(word)
    }));
  }

  /**
   * 단어 카테고리 분류 (기본적인 규칙 기반)
   */
  private categorizeWord(word: string): VocabularyWord['category'] {
    const cleanWord = word.toLowerCase().replace(/'/g, '');
    
    // 대명사
    const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
    if (pronouns.includes(cleanWord)) return 'pronoun';
    
    // Be 동사 및 기본 동사
    const verbs = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might'];
    if (verbs.includes(cleanWord)) return 'verb';
    
    // 현재진행형 동사 (-ing)
    if (cleanWord.endsWith('ing')) return 'verb';
    
    // 과거형 동사 (-ed)
    if (cleanWord.endsWith('ed')) return 'verb';
    
    // 형용사 (일반적인 패턴)
    const adjectives = ['happy', 'sad', 'big', 'small', 'good', 'bad', 'new', 'old', 'young', 'tall', 'short', 'smart', 'kind', 'pretty', 'tired', 'strong', 'quiet', 'brave', 'funny', 'honest', 'nice', 'fast', 'safe', 'normal', 'special', 'important'];
    if (adjectives.includes(cleanWord)) return 'adjective';
    
    // 전치사
    const prepositions = ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'under', 'over'];
    if (prepositions.includes(cleanWord)) return 'preposition';
    
    // 부사 (일반적인 패턴)
    if (cleanWord.endsWith('ly')) return 'adverb';
    const adverbs = ['now', 'here', 'there', 'today', 'tomorrow', 'yesterday', 'always', 'never', 'sometimes', 'often', 'usually'];
    if (adverbs.includes(cleanWord)) return 'adverb';
    
    // 나머지는 명사로 분류
    return 'noun';
  }

  /**
   * 단어 난이도 결정
   */
  private determineDifficulty(word: string, level: number, frequency: number): VocabularyWord['difficulty'] {
    // 레벨과 빈도를 기반으로 난이도 결정
    if (level <= 2 && frequency >= 5) return 'basic';
    if (level <= 5 && frequency >= 3) return 'intermediate';
    return 'advanced';
  }

  /**
   * 특정 레벨의 패턴 파일에서 단어 추출
   */
  async extractVocabularyFromLevel(level: number): Promise<VocabularyWord[]> {
    const cacheKey = `level_${level}`;
    if (this.vocabularyCache.has(cacheKey)) {
      return this.vocabularyCache.get(cacheKey)!;
    }

    try {
      console.log(`🔍 Level ${level} 단어 추출 시작...`);
      
      // 레벨 내 모든 스테이지 파일 목록 가져오기
      const stageFiles = await this.getStageFilesForLevel(level);
      if (stageFiles.length === 0) {
        console.warn(`Level ${level} 스테이지 파일이 없습니다.`);
        return [];
      }

      const wordFrequency = new Map<string, number>();
      const wordExamples = new Map<string, VocabularyWord['examples']>();
      const wordFirstAppeared = new Map<string, string>();
      const wordCategories = new Map<string, VocabularyWord['category']>();

      // 각 스테이지 파일에서 단어 추출
      for (const stageFile of stageFiles) {
        try {
          // console.log(`📄 ${stageFile} 처리 중...`); // 로그 제거
          const stageResponse = await fetch(`/patterns/banks/level_${level}/${stageFile}`);
          if (!stageResponse.ok) {
            console.warn(`파일 ${stageFile} 로드 실패: ${stageResponse.status}`);
            continue;
          }

          const stageData = await stageResponse.json();
          
          // 안전 검사
          if (!stageData || !Array.isArray(stageData.sentences)) {
            console.warn(`파일 ${stageFile}의 데이터 구조가 올바르지 않습니다.`);
            continue;
          }
          
          // 문장들에서 단어 추출
          for (const sentence of stageData.sentences) {
            if (!sentence || !sentence.en || typeof sentence.en !== 'string') {
              continue;
            }

            const extractedWords = this.extractWordsFromSentence(sentence.en);
            
            for (const { word, category } of extractedWords) {
              if (!word || word.length < 2) continue; // 너무 짧은 단어 제외
              
              // 빈도수 증가
              wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
              
              // 카테고리 저장 (첫 번째로 발견된 카테고리를 사용)
              if (!wordCategories.has(word)) {
                wordCategories.set(word, category);
              }
              
              // 처음 등장 위치 기록
              if (!wordFirstAppeared.has(word)) {
                wordFirstAppeared.set(word, stageData.stage_id || `Lv${level}-Unknown`);
              }
              
              // 예문 추가 (최대 3개까지)
              if (!wordExamples.has(word)) {
                wordExamples.set(word, []);
              }
              
              const examples = wordExamples.get(word)!;
              if (examples.length < 3 && sentence.kr) {
                examples.push({
                  sentence: sentence.en,
                  translation: sentence.kr,
                  stageId: stageData.stage_id || `Lv${level}-Unknown`
                });
              }
            }
          }
        } catch (error) {
          console.warn(`스테이지 파일 ${stageFile} 처리 중 오류:`, error);
        }
      }

      // VocabularyWord 객체 생성
      const vocabularyWords: VocabularyWord[] = Array.from(wordFrequency.entries()).map(([word, frequency]) => ({
        id: `${level}_${word}`,
        word,
        translation: this.getKoreanTranslation(word), // 간단한 번역 (실제로는 번역 API 또는 사전 필요)
        level,
        category: wordCategories.get(word) || 'other',
        difficulty: this.determineDifficulty(word, level, frequency),
        frequency,
        examples: wordExamples.get(word) || [],
        firstAppeared: wordFirstAppeared.get(word) || `Lv${level}-Unknown`
      }));

      // 빈도순으로 정렬
      vocabularyWords.sort((a, b) => b.frequency - a.frequency);

      // 캐시에 저장
      this.vocabularyCache.set(cacheKey, vocabularyWords);
      
      console.log(`✅ Level ${level} 단어 ${vocabularyWords.length}개 추출 완료`);
      return vocabularyWords;
    } catch (error) {
      console.error(`Level ${level} 단어 추출 오류:`, error);
      return [];
    }
  }

  /**
   * 레벨별 스테이지 파일 목록 가져오기 (실제 존재하는 파일 기준)
   */
  private async getStageFilesForLevel(level: number): Promise<string[]> {
    const files: string[] = [];
    
    // 실제 존재하는 파일들을 기준으로 하드코딩
    if (level === 1) {
      files.push(
        'Lv1-P1-S01_bank.json',
        'Lv1-P1-S02_bank.json',
        'Lv1-P1-S03_bank.json',
        'Lv1-P1-S04_bank.json',
        'Lv1-P2-S05_bank.json',
        'Lv1-P2-S06_bank.json',
        'Lv1-P2-S07_bank.json',
        'Lv1-P2-S08_bank.json',
        'Lv1-P3-S09_bank.json',
        'Lv1-P3-S10_bank.json',
        'Lv1-P3-S11_bank.json',
        'Lv1-P3-S12_bank.json',
        'Lv1-P4-S13_bank.json',
        'Lv1-P4-S14_bank.json',
        'Lv1-P4-S15_bank.json',
        'Lv1-P4-S16_bank.json'
      );
    } else if (level === 2) {
      files.push(
        'Lv2-P1-S01_bank.json',
        'Lv2-P1-S02_bank.json',
        'Lv2-P1-S03_bank.json',
        'Lv2-P1-S04_bank.json',
        'Lv2-P2-S05_bank.json',
        'Lv2-P2-S06_bank.json',
        'Lv2-P2-S07_bank.json',
        'Lv2-P2-S08_bank.json',
        'Lv2-P3-S09_bank.json',
        'Lv2-P3-S10_bank.json',
        'Lv2-P3-S11_bank.json',
        'Lv2-P3-S12_bank.json',
        'Lv2-P4-S13_bank.json',
        'Lv2-P4-S14_bank.json',
        'Lv2-P4-S15_bank.json',
        'Lv2-P4-S16_bank.json',
        'Lv2-P5-S17_bank.json',
        'Lv2-P5-S18_bank.json',
        'Lv2-P5-S19_bank.json',
        'Lv2-P5-S20_bank.json'
      );
    }
    // Level 3 이상은 일부만 추가 (실제 파일 기준)
    else if (level === 3) {
      files.push(
        'Lv3-P1-S02_bank.json',
        'Lv3-P1-S03_bank.json',
        'Lv3-P2-S07_bank.json',
        'Lv3-P2-S08_bank.json',
        'Lv3-P2-S10_bank.json'
      );
    }
    
    return files;
  }

  /**
   * 간단한 영-한 번역 (실제로는 번역 사전이나 API 필요)
   */
  private getKoreanTranslation(word: string): string {
    const translations: Record<string, string> = {
      // 대명사
      'i': '나', 'you': '너/당신', 'he': '그', 'she': '그녀', 'it': '그것',
      'we': '우리', 'they': '그들',
      
      // Be 동사
      'am': '~이다', 'is': '~이다', 'are': '~이다',
      
      // 형용사
      'happy': '행복한', 'sad': '슬픈', 'big': '큰', 'small': '작은',
      'good': '좋은', 'bad': '나쁜', 'new': '새로운', 'old': '오래된',
      'young': '젊은', 'tall': '키 큰', 'short': '짧은', 'smart': '똑똑한',
      'kind': '친절한', 'pretty': '예쁜', 'tired': '피곤한', 'strong': '강한',
      'quiet': '조용한', 'brave': '용감한', 'funny': '재미있는',
      'honest': '정직한', 'nice': '좋은', 'fast': '빠른', 'safe': '안전한',
      'normal': '정상적인', 'special': '특별한', 'important': '중요한',
      
      // 직업
      'student': '학생', 'teacher': '선생님', 'doctor': '의사',
      'cook': '요리사', 'driver': '운전자', 'farmer': '농부',
      'writer': '작가', 'singer': '가수', 'painter': '화가',
      'actor': '배우', 'scientist': '과학자',
      
      // 명사
      'friend': '친구', 'book': '책', 'pencil': '연필', 'computer': '컴퓨터',
      'family': '가족', 'chair': '의자', 'team': '팀', 'ball': '공',
      
      // 동사
      'eating': '먹는', 'studying': '공부하는', 'playing': '놀고 있는',
      'working': '일하는', 'reading': '읽는', 'running': '뛰는',
      
      // 시간/장소
      'now': '지금', 'today': '오늘', 'park': '공원', 'lunch': '점심'
    };
    
    return translations[word.toLowerCase()] || word; // 번역이 없으면 원문 반환
  }

  /**
   * 사용자의 학습 진도에 맞는 단어장 가져오기
   */
  async getVocabularyForUser(userLevel: number, userStage: number | 'ALL'): Promise<VocabularyWord[]> {
    const allWords: VocabularyWord[] = [];
    
    // 사용자 레벨까지의 모든 단어 수집
    for (let level = 1; level <= userLevel; level++) {
      const levelWords = await this.extractVocabularyFromLevel(level);
      allWords.push(...levelWords);
    }
    
    // 중복 제거 (같은 단어가 여러 레벨에서 나올 수 있음)
    const uniqueWords = new Map<string, VocabularyWord>();
    for (const word of allWords) {
      if (!uniqueWords.has(word.word) || uniqueWords.get(word.word)!.level > word.level) {
        uniqueWords.set(word.word, word);
      }
    }
    
    return Array.from(uniqueWords.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 단어 학습 통계 계산
   */
  calculateVocabularyStats(vocabularyWords: VocabularyWord[], userProgress: UserVocabularyProgress[]): VocabularyStats {
    const progressMap = new Map<string, UserVocabularyProgress>();
    userProgress.forEach(p => progressMap.set(p.wordId, p));
    
    let knownWords = 0;
    let learningWords = 0;
    let reviewWords = 0;
    let newWords = 0;
    
    vocabularyWords.forEach(word => {
      const progress = progressMap.get(word.id);
      if (!progress) {
        newWords++;
      } else {
        switch (progress.status) {
          case 'known': knownWords++; break;
          case 'learning': learningWords++; break;
          case 'review': reviewWords++; break;
          case 'unknown': newWords++; break;
        }
      }
    });
    
    return {
      totalWords: vocabularyWords.length,
      knownWords,
      learningWords,
      reviewWords,
      newWords,
      completionRate: vocabularyWords.length > 0 ? Math.round((knownWords / vocabularyWords.length) * 100) : 0
    };
  }
}

export const vocabularyService = new VocabularyService();
export default vocabularyService;