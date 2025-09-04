/**
 * Vocabulary Service
 * 단어장 서비스: 틀린 문장에서 핵심 단어 추출 및 관리
 */

interface WordData {
  word: string;
  meaning: string;
  sentence: string;
  // TODO: 구체적인 타입 정의
}

interface WordBankEntry {
  id: string;
  userId: string;
  words: WordData[];
  // TODO: 구체적인 타입 정의
}

class VocabularyService {
  private name: string;

  constructor() {
    this.name = 'VocabularyService';
  }

  /**
   * 틀린 문장에서 핵심 단어 추출
   * @param sentence - 분석할 문장
   * @param userId - 사용자 ID
   * @returns 추출된 단어 목록
   */
  async extractWordsFromSentence(sentence: string, userId: string): Promise<string[]> {
    // TODO: 문장에서 핵심 단어 추출 로직 구현
    return [];
  }

  /**
   * 사용자별 단어장 조회
   * @param userId - 사용자 ID
   * @returns 단어장 데이터
   */
  async getUserWordBank(userId: string): Promise<WordBankEntry[]> {
    // TODO: 사용자별 단어장 조회 로직 구현
    return [];
  }

  /**
   * 단어장에 새 단어 추가
   * @param userId - 사용자 ID
   * @param wordData - 단어 데이터
   * @returns 추가된 단어 정보
   */
  async addWordToBank(userId: string, wordData: WordData): Promise<WordData> {
    // TODO: 단어장에 단어 추가 로직 구현
    return {} as WordData;
  }
}

export default new VocabularyService();
