// 자동 품질 검증 및 QA 샘플링 도구
const fs = require('fs');
const path = require('path');

// 품질 체크 규칙들
const qualityRules = {
  // 기본 문법 규칙
  grammar: [
    { pattern: /\b(am|is|are)\s+(not\s+)?going\s+to\b/gi, description: "미래 표현 going to" },
    { pattern: /\b(will|would|shall|should|can|could|may|might|must)\s+/gi, description: "조동사 사용" },
    { pattern: /\b(have|has|had)\s+(been\s+)?\w+ed\b/gi, description: "완료형 구조" },
    { pattern: /\b(was|were)\s+\w+ing\b/gi, description: "과거진행형" },
    { pattern: /\bif\s+.*,.*would\b/gi, description: "가정법 구조" }
  ],
  
  // 레벨별 특화 규칙
  levelSpecific: {
    2: [
      { pattern: /\b(often|usually|always|never|sometimes)\b/gi, description: "빈도부사" },
      { pattern: /\b(more|most|better|best|worse|worst)\b/gi, description: "비교급/최상급" }
    ],
    3: [
      { pattern: /\b(who|which|that)\s+/gi, description: "관계대명사" },
      { pattern: /\b(although|though|even though|whereas)\b/gi, description: "양보 접속사" }
    ],
    4: [
      { pattern: /\b(regarding|concerning|in terms of|with respect to)\b/gi, description: "비즈니스 표현" },
      { pattern: /\b(schedule|meeting|presentation|proposal)\b/gi, description: "비즈니스 어휘" }
    ],
    5: [
      { pattern: /\b(research|study|analysis|investigation)\b/gi, description: "학술 어휘" },
      { pattern: /\b(however|furthermore|moreover|nevertheless)\b/gi, description: "학술 연결어" }
    ],
    6: [
      { pattern: /\b(pursuant to|in accordance with|notwithstanding)\b/gi, description: "전문 법률 표현" },
      { pattern: /\b(efficacy|methodology|paradigm|taxonomy)\b/gi, description: "전문 어휘" }
    ]
  },

  // 금지 패턴들 (품질 저하 요소)
  prohibited: [
    { pattern: /\b(very very|really really)\b/gi, description: "중복 강조어" },
    { pattern: /\b(gonna|wanna|gotta)\b/gi, description: "구어체 축약" },
    { pattern: /\s{2,}/g, description: "과도한 공백" },
    { pattern: /[.]{2,}/g, description: "중복 마침표" }
  ]
};

// 품질 점수 계산 함수
function calculateQualityScore(sentence, level) {
  let score = 100;
  const issues = [];

  // 금지 패턴 체크 (심각한 감점)
  qualityRules.prohibited.forEach(rule => {
    const matches = sentence.match(rule.pattern);
    if (matches) {
      score -= matches.length * 20;
      issues.push(`금지 패턴: ${rule.description} (${matches.length}회)`);
    }
  });

  // 기본 길이 체크
  const words = sentence.split(' ').filter(w => w.length > 0);
  if (words.length < 3) {
    score -= 30;
    issues.push('문장이 너무 짧음');
  } else if (words.length > 20) {
    score -= 10;
    issues.push('문장이 너무 길 수 있음');
  }

  // 대소문자 체크
  if (!/^[A-Z]/.test(sentence)) {
    score -= 15;
    issues.push('첫 글자가 대문자가 아님');
  }

  // 마침표 체크
  if (!/[.!?]$/.test(sentence.trim())) {
    score -= 10;
    issues.push('마침표/느낌표/물음표로 끝나지 않음');
  }

  // 레벨별 복잡도 체크
  const levelComplexity = {
    2: { minWords: 4, maxWords: 12 },
    3: { minWords: 6, maxWords: 15 },
    4: { minWords: 8, maxWords: 18 },
    5: { minWords: 10, maxWords: 20 },
    6: { minWords: 12, maxWords: 22 }
  };

  const complexity = levelComplexity[level];
  if (complexity) {
    if (words.length < complexity.minWords) {
      score -= 15;
      issues.push(`레벨 ${level}에 비해 너무 단순함`);
    } else if (words.length > complexity.maxWords) {
      score -= 10;
      issues.push(`레벨 ${level}에 비해 너무 복잡함`);
    }
  }

  return {
    score: Math.max(0, score),
    issues: issues,
    wordCount: words.length
  };
}

// 은행 파일들 품질 검증
function verifyBankQuality(bankPath) {
  if (!fs.existsSync(bankPath)) {
    return { error: `Bank file not found: ${bankPath}` };
  }

  const bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const results = {
    bankPath: bankPath,
    stageId: bankData.stage_id,
    title: bankData.title,
    totalSentences: bankData.sentences?.length || 0,
    qualityScores: [],
    issues: [],
    averageScore: 0,
    sampledSentences: []
  };

  if (!bankData.sentences || bankData.sentences.length === 0) {
    results.issues.push('문장이 없음');
    return results;
  }

  // 레벨 추출 (Lv3-P1-S06 -> 3)
  const levelMatch = bankData.stage_id.match(/Lv(\d+)/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 2;

  // 모든 문장 품질 검증
  bankData.sentences.forEach((sentence, idx) => {
    const quality = calculateQualityScore(sentence.en, level);
    results.qualityScores.push(quality.score);
    
    if (quality.issues.length > 0) {
      results.issues.push({
        sentenceId: sentence.id,
        sentence: sentence.en,
        issues: quality.issues,
        score: quality.score
      });
    }
  });

  // 20% 샘플링 (QA용)
  const sampleSize = Math.max(1, Math.floor(bankData.sentences.length * 0.2));
  const sampleIndices = [];
  for (let i = 0; i < sampleSize; i++) {
    const randomIdx = Math.floor(Math.random() * bankData.sentences.length);
    if (!sampleIndices.includes(randomIdx)) {
      sampleIndices.push(randomIdx);
    }
  }

  results.sampledSentences = sampleIndices.map(idx => ({
    index: idx,
    id: bankData.sentences[idx].id,
    kr: bankData.sentences[idx].kr,
    en: bankData.sentences[idx].en,
    form: bankData.sentences[idx].form,
    qualityScore: results.qualityScores[idx]
  }));

  // 평균 점수 계산
  results.averageScore = results.qualityScores.length > 0 
    ? Math.round(results.qualityScores.reduce((a, b) => a + b, 0) / results.qualityScores.length)
    : 0;

  return results;
}

// 전체 레벨 품질 검증
function verifyAllLevels() {
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalBanks: 0,
      totalSentences: 0,
      averageQuality: 0,
      highQualityBanks: 0,
      issuesFound: 0
    },
    levels: {}
  };

  const levelsToCheck = [2, 3, 4, 5, 6];
  
  levelsToCheck.forEach(level => {
    const levelDir = `banks/level_${level}`;
    if (!fs.existsSync(levelDir)) {
      console.warn(`⚠️ Level ${level} 디렉토리가 없습니다: ${levelDir}`);
      return;
    }

    const bankFiles = fs.readdirSync(levelDir).filter(f => f.endsWith('_bank.json'));
    results.levels[level] = {
      totalBanks: bankFiles.length,
      banks: [],
      averageScore: 0,
      totalSentences: 0
    };

    bankFiles.forEach(bankFile => {
      const bankPath = path.join(levelDir, bankFile);
      const bankResult = verifyBankQuality(bankPath);
      
      if (!bankResult.error) {
        results.levels[level].banks.push(bankResult);
        results.levels[level].totalSentences += bankResult.totalSentences;
        results.summary.totalBanks++;
        results.summary.totalSentences += bankResult.totalSentences;
        
        if (bankResult.averageScore >= 85) {
          results.summary.highQualityBanks++;
        }
        
        results.summary.issuesFound += bankResult.issues.length;
      }
    });

    // 레벨 평균 점수 계산
    if (results.levels[level].banks.length > 0) {
      const levelScores = results.levels[level].banks.map(b => b.averageScore);
      results.levels[level].averageScore = Math.round(
        levelScores.reduce((a, b) => a + b, 0) / levelScores.length
      );
    }
  });

  // 전체 평균 품질 계산
  const allScores = [];
  Object.values(results.levels).forEach(level => {
    level.banks.forEach(bank => {
      allScores.push(bank.averageScore);
    });
  });

  if (allScores.length > 0) {
    results.summary.averageQuality = Math.round(
      allScores.reduce((a, b) => a + b, 0) / allScores.length
    );
  }

  return results;
}

// 실행 부분
if (require.main === module) {
  console.log('🔍 DaSi 영어 커리큘럼 품질 검증 시작...\n');

  const qualityReport = verifyAllLevels();
  
  // 결과 출력
  console.log('📊 품질 검증 결과 요약:');
  console.log(`   총 은행 파일: ${qualityReport.summary.totalBanks}개`);
  console.log(`   총 문장 수: ${qualityReport.summary.totalSentences}개`);
  console.log(`   평균 품질 점수: ${qualityReport.summary.averageQuality}점`);
  console.log(`   고품질 은행 (85점+): ${qualityReport.summary.highQualityBanks}개`);
  console.log(`   발견된 이슈: ${qualityReport.summary.issuesFound}개\n`);

  // 레벨별 상세 결과
  Object.entries(qualityReport.levels).forEach(([level, data]) => {
    console.log(`📋 Level ${level}:`);
    console.log(`   은행 파일: ${data.totalBanks}개`);
    console.log(`   문장 수: ${data.totalSentences}개`);
    console.log(`   평균 점수: ${data.averageScore}점`);
    
    // 상위 3개 은행 표시
    const topBanks = data.banks
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    
    console.log(`   상위 스테이지:`);
    topBanks.forEach((bank, idx) => {
      console.log(`     ${idx + 1}. ${bank.stageId} (${bank.averageScore}점)`);
    });
    console.log('');
  });

  // 상세 보고서 저장
  fs.writeFileSync('quality_report.json', JSON.stringify(qualityReport, null, 2));
  console.log('💾 상세 보고서 저장: quality_report.json');

  // 20% 샘플 추출 (QA용)
  const qaSamples = [];
  Object.values(qualityReport.levels).forEach(level => {
    level.banks.forEach(bank => {
      qaSamples.push(...bank.sampledSentences);
    });
  });

  fs.writeFileSync('qa_samples.json', JSON.stringify({
    timestamp: qualityReport.timestamp,
    totalSamples: qaSamples.length,
    samples: qaSamples
  }, null, 2));

  console.log(`🎯 QA 샘플 추출 완료: ${qaSamples.length}개 문장`);
  console.log('💾 QA 샘플 저장: qa_samples.json');
  console.log('\n✅ 품질 검증 완료!');
}

module.exports = { verifyBankQuality, verifyAllLevels, calculateQualityScore };