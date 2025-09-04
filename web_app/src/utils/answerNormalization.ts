/**
 * Answer Normalization Utility
 * 모든 레벨, 모든 훈련 모드에서 사용 가능한 답변 정규화 및 비교 유틸리티
 */

export interface AnswerComparisonResult {
  isCorrect: boolean;
  similarity: number;
  normalizedUser: string;
  normalizedCorrect: string;
  feedback: string;
}

/**
 * 답변 정규화 함수 - 모든 축약형을 원형으로 변환
 */
export function normalizeAnswer(text: string): string {
  let normalized = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  
  // 포괄적 축약형 사전
  const contractions: Record<string, string> = {
    // Be 동사
    "i'm": "i am",
    "you're": "you are", 
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "we're": "we are",
    "they're": "they are",
    
    // Be 동사 부정형
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    
    // Do 동사
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    
    // Have 동사 (완료형)
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    
    // 조동사 (will, would)
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "it'll": "it will",
    "we'll": "we will",
    "they'll": "they will",
    "won't": "will not",
    "wouldn't": "would not",
    
    // 조동사 (can, could)
    "can't": "cannot",
    "couldn't": "could not",
    
    // 조동사 (should, must)
    "shouldn't": "should not",
    "mustn't": "must not",
    
    // 기타 일반적 축약형
    "let's": "let us",
    "that's": "that is",
    "what's": "what is",
    "where's": "where is",
    "when's": "when is",
    "who's": "who is",
    "how's": "how is",
    "there's": "there is",
    "here's": "here is",
    
    // 추가 고급 축약형 (Level 2+ 대비)
    "would've": "would have",
    "could've": "could have", 
    "should've": "should have",
    "might've": "might have",
    "must've": "must have",
    "needn't": "need not",
    "shan't": "shall not", // 영국식
    "mayn't": "may not"    // 드물지만 존재
  };
  
  // 축약형을 원형으로 변환
  for (const [contraction, expanded] of Object.entries(contractions)) {
    normalized = normalized.replace(new RegExp(`\\b${contraction}\\b`, 'g'), expanded);
  }
  
  // 추가 정규화 (공백 정리)
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * 답변 비교 및 평가 함수
 */
export function compareAnswers(
  userAnswer: string, 
  correctAnswer: string,
  strictMode: boolean = false
): AnswerComparisonResult {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  // 완전 일치 체크
  const isExactMatch = normalizedUser === normalizedCorrect;
  
  // 유사도 계산 (추후 확장 가능)
  let similarity = 0;
  if (isExactMatch) {
    similarity = 1.0;
  } else if (normalizedUser.length === 0) {
    similarity = 0;
  } else {
    // 단순 포함 관계 체크 (추후 Levenshtein distance 등으로 확장 가능)
    const words = normalizedCorrect.split(' ');
    const userWords = normalizedUser.split(' ');
    const matchedWords = userWords.filter(word => words.includes(word));
    similarity = matchedWords.length / words.length;
  }
  
  // 정답 여부 판정
  const threshold = strictMode ? 0.95 : 0.8;
  const isCorrect = similarity >= threshold;
  
  // 피드백 메시지 생성
  let feedback = '';
  if (isCorrect) {
    feedback = similarity === 1.0 
      ? '🎉 완벽합니다!' 
      : '✅ 거의 맞습니다!';
  } else if (similarity > 0.5) {
    feedback = '🔶 거의 다 맞았어요! 다시 한번 시도해보세요.';
  } else {
    feedback = `❌ 정답: "${correctAnswer}"`;
  }
  
  return {
    isCorrect,
    similarity,
    normalizedUser,
    normalizedCorrect,
    feedback
  };
}

/**
 * 레벨별 정답 기준 설정
 */
export function getAnswerThresholdForLevel(level: number): number {
  if (level <= 2) return 0.8;  // 초급: 관대한 기준
  if (level <= 5) return 0.85; // 중급: 보통 기준  
  if (level <= 8) return 0.9;  // 고급: 엄격한 기준
  return 0.95; // 최고급: 매우 엄격한 기준
}

/**
 * 훈련 모드별 정답 기준 설정
 */
export function getAnswerThresholdForMode(mode: 'pattern' | 'situational' | 'speed' | 'review'): number {
  switch (mode) {
    case 'speed': return 0.95;      // 스피드 모드: 매우 엄격
    case 'review': return 0.8;      // 복습 모드: 관대
    case 'situational': return 0.85; // 상황별: 보통
    case 'pattern': 
    default: return 0.8;            // 패턴 학습: 관대 (기본)
  }
}

/**
 * 통합 답변 평가 함수 (레벨 + 모드 고려)
 */
export function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string, 
  level: number = 1,
  mode: 'pattern' | 'situational' | 'speed' | 'review' = 'pattern'
): AnswerComparisonResult {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  // 레벨과 모드에 따른 임계값 결정
  const levelThreshold = getAnswerThresholdForLevel(level);
  const modeThreshold = getAnswerThresholdForMode(mode);
  const finalThreshold = Math.max(levelThreshold, modeThreshold);
  
  // 기본 비교 수행
  const result = compareAnswers(userAnswer, correctAnswer);
  
  // 최종 정답 여부 재평가
  const isCorrect = result.similarity >= finalThreshold;
  
  // 레벨/모드별 맞춤 피드백
  let feedback = '';
  if (isCorrect) {
    if (result.similarity === 1.0) {
      feedback = level >= 7 ? '🏆 완벽한 발음입니다!' : '🎉 완벽합니다!';
    } else {
      feedback = mode === 'speed' ? '⚡ 빠르고 정확해요!' : '✅ 잘했습니다!';
    }
  } else if (result.similarity > finalThreshold - 0.1) {
    feedback = `🔶 아쉬워요! (${Math.round(result.similarity * 100)}%) 다시 도전해보세요.`;
  } else {
    feedback = `❌ 정답: "${correctAnswer}"`;
  }
  
  return {
    ...result,
    isCorrect,
    feedback
  };
}