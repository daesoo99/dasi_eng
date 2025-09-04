/**
 * BasicScoreAdapter - 기본 채점 구현체
 * AI 없는 규칙 기반 채점 (현재 feedback.js 로직 이전)
 */

import { ScorePort } from '../../domain/ports/ScorePort';
import { ScoreResult, ComparisonResult } from '../../shared/types/core';

export class BasicScoreAdapter implements ScorePort {
  
  calculateScore(userAnswer: string, targetAnswer: string): ScoreResult {
    const comparison = this.compareAnswers(userAnswer, targetAnswer);
    const similarity = comparison.wordMatches / comparison.totalWords;
    const score = Math.round(similarity * 100);
    
    return {
      correct: similarity > 0.8,
      score: score,
      confidence: this.calculateConfidence(similarity),
      similarity: similarity
    };
  }

  compareAnswers(userAnswer: string, targetAnswer: string): ComparisonResult {
    const userWords = this.normalizeText(userAnswer).split(' ').filter(w => w.length > 0);
    const targetWords = this.normalizeText(targetAnswer).split(' ').filter(w => w.length > 0);
    
    let wordMatches = 0;
    const differences: string[] = [];
    
    // 단어별 매칭 (순서 무관)
    userWords.forEach(userWord => {
      if (targetWords.includes(userWord)) {
        wordMatches++;
      } else {
        // 유사 단어 찾기 (간단한 편집 거리)
        const similar = this.findSimilarWord(userWord, targetWords);
        if (similar) {
          wordMatches += 0.7; // 부분 점수
          differences.push(`"${userWord}" → "${similar}" (유사)`);
        } else {
          differences.push(`"${userWord}" (불필요한 단어)`);
        }
      }
    });

    // 누락된 단어들
    targetWords.forEach(targetWord => {
      if (!userWords.includes(targetWord)) {
        const similar = this.findSimilarWord(targetWord, userWords);
        if (!similar) {
          differences.push(`누락: "${targetWord}"`);
        }
      }
    });

    const exactMatch = userWords.length === targetWords.length && wordMatches === targetWords.length;
    
    return {
      wordMatches: Math.round(wordMatches),
      totalWords: Math.max(userWords.length, targetWords.length),
      exactMatch,
      differences
    };
  }

  scorePronunciation(sttResult: string, targetText: string): number {
    // STT 결과 기반 발음 점수 (간단 구현)
    const score = this.calculateScore(sttResult, targetText);
    
    // 발음 특화 보정
    const pronunciationBonus = this.calculatePronunciationBonus(sttResult, targetText);
    
    return Math.min(100, score.score + pronunciationBonus);
  }

  scoreGrammar(userSentence: string, targetSentence: string): number {
    // 기본 문법 점수 (단어 순서, 관사, 전치사 등)
    const userTokens = this.tokenize(userSentence);
    const targetTokens = this.tokenize(targetSentence);
    
    let grammarScore = 50; // 기본 점수
    
    // 문장 구조 유사성
    if (userTokens.length === targetTokens.length) {
      grammarScore += 20;
    } else if (Math.abs(userTokens.length - targetTokens.length) <= 2) {
      grammarScore += 10;
    }
    
    // 주요 문법 요소 검사
    grammarScore += this.checkGrammarElements(userTokens, targetTokens);
    
    return Math.min(100, grammarScore);
  }

  // ============ Private Methods ============

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // 구두점 제거
      .replace(/\s+/g, ' ')    // 공백 정규화
      .trim();
  }

  private findSimilarWord(word: string, candidates: string[]): string | null {
    const threshold = 0.7;
    
    for (const candidate of candidates) {
      const similarity = this.calculateWordSimilarity(word, candidate);
      if (similarity >= threshold) {
        return candidate;
      }
    }
    
    return null;
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    // 간단한 편집 거리 기반 유사도
    const maxLength = Math.max(word1.length, word2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(word1, word2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateConfidence(similarity: number): number {
    // 유사도에 따른 신뢰도 계산
    if (similarity > 0.9) return 0.95;
    if (similarity > 0.8) return 0.85;
    if (similarity > 0.6) return 0.7;
    if (similarity > 0.4) return 0.5;
    return 0.3;
  }

  private calculatePronunciationBonus(stt: string, target: string): number {
    // 발음 관련 보정 (간단 구현)
    let bonus = 0;
    
    // 길이가 비슷하면 발음이 제대로 인식됐을 가능성
    const lengthRatio = Math.min(stt.length, target.length) / Math.max(stt.length, target.length);
    if (lengthRatio > 0.8) bonus += 5;
    
    // 첫 글자와 마지막 글자가 같으면 발음 구조가 비슷
    if (stt[0]?.toLowerCase() === target[0]?.toLowerCase()) bonus += 3;
    if (stt[stt.length - 1]?.toLowerCase() === target[target.length - 1]?.toLowerCase()) bonus += 3;
    
    return bonus;
  }

  private tokenize(sentence: string): string[] {
    return sentence.toLowerCase().match(/\b\w+\b/g) || [];
  }

  private checkGrammarElements(userTokens: string[], targetTokens: string[]): number {
    let score = 0;
    
    // 관사 체크 (a, an, the)
    const articles = ['a', 'an', 'the'];
    const userArticles = userTokens.filter(t => articles.includes(t));
    const targetArticles = targetTokens.filter(t => articles.includes(t));
    if (userArticles.length === targetArticles.length) score += 10;
    
    // 전치사 체크 (in, on, at, by, for, etc.)
    const prepositions = ['in', 'on', 'at', 'by', 'for', 'with', 'to', 'from'];
    const userPreps = userTokens.filter(t => prepositions.includes(t));
    const targetPreps = targetTokens.filter(t => prepositions.includes(t));
    if (userPreps.length === targetPreps.length) score += 10;
    
    return score;
  }
}