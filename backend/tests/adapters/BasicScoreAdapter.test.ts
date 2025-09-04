/**
 * BasicScoreAdapter 테스트 - 채점 로직 검증
 */

import { BasicScoreAdapter } from '../../src/adapters/score/BasicScoreAdapter';

describe('BasicScoreAdapter', () => {
  let adapter: BasicScoreAdapter;

  beforeEach(() => {
    adapter = new BasicScoreAdapter();
  });

  describe('calculateScore', () => {
    test('should return perfect score for exact matches', () => {
      const userAnswer = 'Hello world';
      const targetAnswer = 'Hello world';

      const result = adapter.calculateScore(userAnswer, targetAnswer);

      expect(result.correct).toBe(true);
      expect(result.score).toBe(100);
      expect(result.similarity).toBe(1);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should handle case insensitive matches', () => {
      const userAnswer = 'HELLO WORLD';
      const targetAnswer = 'hello world';

      const result = adapter.calculateScore(userAnswer, targetAnswer);

      expect(result.correct).toBe(true);
      expect(result.score).toBe(100);
      expect(result.similarity).toBe(1);
    });

    test('should score partial matches correctly', () => {
      const userAnswer = 'Hello beautiful world';
      const targetAnswer = 'Hello world';

      const result = adapter.calculateScore(userAnswer, targetAnswer);

      expect(result.correct).toBe(false); // Below 0.8 threshold
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(1);
    });

    test('should handle completely wrong answers', () => {
      const userAnswer = 'Completely different sentence';
      const targetAnswer = 'Hello world';

      const result = adapter.calculateScore(userAnswer, targetAnswer);

      expect(result.correct).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.similarity).toBeLessThan(0.5);
    });

    test('should handle empty inputs gracefully', () => {
      const result1 = adapter.calculateScore('', 'Hello world');
      const result2 = adapter.calculateScore('Hello world', '');
      const result3 = adapter.calculateScore('', '');

      expect(result1.score).toBe(0);
      expect(result2.score).toBeGreaterThan(0);
      expect(result3.score).toBe(0);
    });
  });

  describe('compareAnswers', () => {
    test('should compare word matches correctly', () => {
      const userAnswer = 'I like apples and oranges';
      const targetAnswer = 'I love apples and bananas';

      const result = adapter.compareAnswers(userAnswer, targetAnswer);

      expect(result.wordMatches).toBeGreaterThan(0);
      expect(result.totalWords).toBe(5);
      expect(result.exactMatch).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    test('should detect exact matches', () => {
      const sentence = 'This is a test sentence';
      
      const result = adapter.compareAnswers(sentence, sentence);

      expect(result.exactMatch).toBe(true);
      expect(result.wordMatches).toBe(5);
      expect(result.totalWords).toBe(5);
      expect(result.differences.length).toBe(0);
    });

    test('should handle punctuation correctly', () => {
      const userAnswer = 'Hello, world!';
      const targetAnswer = 'Hello world';

      const result = adapter.compareAnswers(userAnswer, targetAnswer);

      expect(result.exactMatch).toBe(true);
      expect(result.wordMatches).toBe(2);
    });

    test('should find similar words', () => {
      const userAnswer = 'I am runing fast'; // typo: runing
      const targetAnswer = 'I am running fast';

      const result = adapter.compareAnswers(userAnswer, targetAnswer);

      expect(result.wordMatches).toBeGreaterThan(3);
      expect(result.differences.some(d => d.includes('유사'))).toBe(true);
    });
  });

  describe('scorePronunciation', () => {
    test('should score pronunciation based on STT accuracy', () => {
      const sttResult = 'Hello world';
      const targetText = 'Hello world';

      const score = adapter.scorePronunciation(sttResult, targetText);

      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should handle STT recognition errors', () => {
      const sttResult = 'Helo wrld'; // STT recognition errors
      const targetText = 'Hello world';

      const score = adapter.scorePronunciation(sttResult, targetText);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    test('should apply pronunciation bonuses', () => {
      const sttResult = 'Hello there'; // Similar length, same start/end
      const targetText = 'Hello world';

      const score = adapter.scorePronunciation(sttResult, targetText);

      // Should get some pronunciation bonus points
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('scoreGrammar', () => {
    test('should score grammar based on sentence structure', () => {
      const userSentence = 'I am going to the store';
      const targetSentence = 'I am going to the market';

      const score = adapter.scoreGrammar(userSentence, targetSentence);

      expect(score).toBeGreaterThan(50); // Base score + structure bonus
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should check article usage', () => {
      const userSentence = 'I have a cat and the dog';
      const targetSentence = 'I have a cat and the dog';

      const score1 = adapter.scoreGrammar(userSentence, targetSentence);
      
      const userSentenceBad = 'I have cat and dog';
      const score2 = adapter.scoreGrammar(userSentenceBad, targetSentence);

      expect(score1).toBeGreaterThan(score2);
    });

    test('should check preposition usage', () => {
      const userSentence = 'I am going to the store with my friend';
      const targetSentence = 'I am going to the store with my friend';

      const score1 = adapter.scoreGrammar(userSentence, targetSentence);
      
      const userSentenceBad = 'I am going store my friend';
      const score2 = adapter.scoreGrammar(userSentenceBad, targetSentence);

      expect(score1).toBeGreaterThan(score2);
    });

    test('should handle different sentence lengths', () => {
      const userSentence = 'Hello';
      const targetSentence = 'Hello world how are you today';

      const score = adapter.scoreGrammar(userSentence, targetSentence);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(80); // Penalty for length mismatch
    });
  });

  describe('Word Similarity', () => {
    test('should calculate Levenshtein distance correctly', () => {
      // Access private method via type assertion for testing
      const adapter_any = adapter as any;

      const distance1 = adapter_any.levenshteinDistance('hello', 'hello');
      expect(distance1).toBe(0);

      const distance2 = adapter_any.levenshteinDistance('hello', 'hallo');
      expect(distance2).toBe(1);

      const distance3 = adapter_any.levenshteinDistance('running', 'runing');
      expect(distance3).toBe(1);

      const distance4 = adapter_any.levenshteinDistance('cat', 'dog');
      expect(distance4).toBe(3);
    });

    test('should find similar words within threshold', () => {
      const adapter_any = adapter as any;

      const similar1 = adapter_any.findSimilarWord('runing', ['running', 'walking']);
      expect(similar1).toBe('running');

      const similar2 = adapter_any.findSimilarWord('hello', ['help', 'world']);
      expect(similar2).toBe('help');

      const similar3 = adapter_any.findSimilarWord('xyz', ['abc', 'def']);
      expect(similar3).toBeNull();
    });
  });

  describe('Confidence Calculation', () => {
    test('should return appropriate confidence levels', () => {
      const adapter_any = adapter as any;

      expect(adapter_any.calculateConfidence(0.95)).toBe(0.95);
      expect(adapter_any.calculateConfidence(0.85)).toBe(0.85);
      expect(adapter_any.calculateConfidence(0.7)).toBe(0.7);
      expect(adapter_any.calculateConfidence(0.5)).toBe(0.5);
      expect(adapter_any.calculateConfidence(0.3)).toBe(0.3);
    });
  });
});