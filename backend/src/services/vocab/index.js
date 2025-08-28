/**
 * Vocabulary Service
 * 단어장 서비스: 틀린 문장에서 핵심 단어 추출 및 관리
 */

class VocabularyService {
  constructor() {
    this.name = 'VocabularyService';
  }

  /**
   * 틀린 문장에서 핵심 단어 추출
   * @param {string} sentence - 분석할 문장
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Array>} 추출된 단어 목록
   */
  async extractWordsFromSentence(sentence, userId) {
    // TODO: 문장에서 핵심 단어 추출 로직 구현
    return [];
  }

  /**
   * 사용자별 단어장 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Array>} 단어장 데이터
   */
  async getUserWordBank(userId) {
    // TODO: 사용자별 단어장 조회 로직 구현
    return [];
  }

  /**
   * 단어장에 새 단어 추가
   * @param {string} userId - 사용자 ID
   * @param {Object} wordData - 단어 데이터
   * @returns {Promise<Object>} 추가된 단어 정보
   */
  async addWordToBank(userId, wordData) {
    // TODO: 단어장에 단어 추가 로직 구현
    return {};
  }
}

module.exports = new VocabularyService();