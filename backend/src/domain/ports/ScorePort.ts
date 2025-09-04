/**
 * ScorePort - 채점 기능만 담당
 * Score와 Feedback 분리 (다른 변경축)
 */

import { ScoreResult, ComparisonResult } from '../../shared/types/core';

export interface ScorePort {
  /**
   * 사용자 답안과 정답을 비교하여 점수 계산
   */
  calculateScore(userAnswer: string, targetAnswer: string): ScoreResult;
  
  /**
   * 텍스트 유사도 분석
   */
  compareAnswers(userAnswer: string, targetAnswer: string): ComparisonResult;
  
  /**
   * 발음 정확도 점수 (STT 결과 기반)
   */
  scorePronunciation(sttResult: string, targetText: string): number;
  
  /**
   * 문법 정확도 점수
   */
  scoreGrammar(userSentence: string, targetSentence: string): number;
}