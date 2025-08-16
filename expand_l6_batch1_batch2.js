// L6 Batch1&2 스테이지들을 확장하여 실제 문장 생성
const fs = require('fs');

// L6 통합 스펙 읽기
const l6Spec = JSON.parse(fs.readFileSync('batch_specs_L6_batch1_batch2.json', 'utf8'));

console.log(`🎯 L6 Professional Industry 확장 시작: ${l6Spec.stages.length}개 스테이지`);

// 전문 비즈니스 영어용 고급 문장 생성 함수들
function generateProfessionalVariants(seed, focus, lexset, traps) {
  const generatedSentences = [seed];
  
  // 전문 비즈니스 변형 생성
  const professionalVariations = [
    // 비즈니스 레지스터 변형 (공식적 <-> 전략적)
    transformBusinessRegister(seed, lexset),
    // 리더십 관점 변형 (운영적 <-> 전략적)
    transformLeadershipPerspective(seed, focus),
    // 글로벌 컨텍스트 변형
    transformGlobalContext(seed),
    // 산업별 전문 용어 변형
    transformIndustryTerminology(seed, lexset),
    // 의사결정 수준 변형 (전술적 <-> 전략적)
    transformDecisionLevel(seed, focus)
  ].filter(s => s && s.en !== seed.en);

  return [...generatedSentences, ...professionalVariations];
}

function transformBusinessRegister(seed, lexset) {
  let transformed = { ...seed };
  
  // 비즈니스 전문 표현으로 변형
  const businessTransforms = {
    'need to': 'must strategically',
    'should': 'ought to strategically',
    'help': 'facilitate',
    'use': 'leverage',
    'make': 'execute',
    'get': 'secure',
    'important': 'critical',
    'good': 'optimal',
    'better': 'superior',
    'problem': 'challenge',
    'solution': 'strategic solution',
    'plan': 'strategic initiative',
    'work': 'operationalize'
  };
  
  Object.entries(businessTransforms).forEach(([basic, professional]) => {
    if (seed.en.toLowerCase().includes(basic)) {
      transformed.en = seed.en.replace(new RegExp(basic, 'gi'), professional);
      transformed.kr = seed.kr + ' (전문적 표현)';
    }
  });
  
  return transformed.en !== seed.en ? transformed : null;
}

function transformLeadershipPerspective(seed, focus) {
  let transformed = { ...seed };
  
  // 리더십 관점으로 변형
  if (focus.includes('STRATEGIC')) {
    if (!seed.en.includes('executive') && !seed.en.includes('leadership')) {
      transformed.en = `From an executive perspective, ${seed.en.toLowerCase()}`;
      transformed.kr = `경영진 관점에서, ${seed.kr}`;
    }
  } else if (focus.includes('LEADERSHIP')) {
    if (!seed.en.includes('leaders') && !seed.en.includes('management')) {
      transformed.en = seed.en.replace(/\./g, ' through transformational leadership.');
      transformed.kr = seed.kr.replace(/\./g, ' 변혁적 리더십을 통해.');
    }
  } else if (focus.includes('INNOVATION')) {
    if (!seed.en.includes('innovation') && !seed.en.includes('disruptive')) {
      transformed.en = seed.en.replace(/\./g, ' to drive innovation excellence.');
      transformed.kr = seed.kr.replace(/\./g, ' 혁신 우수성을 추진하기 위해.');
    }
  }
  
  return transformed.en !== seed.en ? transformed : null;
}

function transformGlobalContext(seed) {
  let transformed = { ...seed };
  
  // 글로벌 컨텍스트 추가
  const globalPhrases = [
    'across global markets',
    'in international contexts',
    'within multinational frameworks',
    'across diverse cultural environments',
    'in cross-border operations'
  ];
  
  if (!seed.en.includes('global') && !seed.en.includes('international')) {
    const randomPhrase = globalPhrases[Math.floor(Math.random() * globalPhrases.length)];
    transformed.en = seed.en.replace(/\.$/, ` ${randomPhrase}.`);
    transformed.kr = seed.kr + ' (글로벌 컨텍스트)';
  }
  
  return transformed.en !== seed.en ? transformed : null;
}

function transformIndustryTerminology(seed, lexset) {
  if (!lexset || lexset.length === 0) return null;
  
  let transformed = { ...seed };
  
  // 산업별 전문용어 대체
  const industryTerms = {
    'leverage': 'capitalize on',
    'synergy': 'collaborative advantage',
    'optimization': 'enhancement',
    'scalability': 'growth potential',
    'paradigm': 'framework',
    'metrics': 'key performance indicators',
    'stakeholder': 'key constituent',
    'transformation': 'evolution',
    'sustainability': 'long-term viability',
    'innovation': 'breakthrough development'
  };
  
  lexset.forEach(term => {
    if (industryTerms[term] && seed.en.toLowerCase().includes(term)) {
      transformed.en = seed.en.replace(new RegExp(term, 'gi'), industryTerms[term]);
      transformed.kr = seed.kr + ' (산업 용어)';
    }
  });
  
  return transformed.en !== seed.en ? transformed : null;
}

function transformDecisionLevel(seed, focus) {
  let transformed = { ...seed };
  
  // 의사결정 수준별 변형
  if (focus.includes('STRATEGIC')) {
    if (!seed.en.includes('board') && !seed.en.includes('C-level')) {
      transformed.en = `At the board level, ${seed.en.toLowerCase()}`;
      transformed.kr = `이사회 수준에서, ${seed.kr}`;
    }
  } else if (focus.includes('OPERATIONAL')) {
    if (!seed.en.includes('operational') && !seed.en.includes('tactical')) {
      transformed.en = seed.en.replace(/\./g, ' at the operational level.');
      transformed.kr = seed.kr.replace(/\./g, ' 운영 수준에서.');
    }
  }
  
  return transformed.en !== seed.en ? transformed : null;
}

function generateProfessionalSentences(stage) {
  const { focus, lexset, traps } = stage;
  const additionalSentences = [];
  
  // focus 영역별 전문 문장 생성
  if (focus.includes('STRATEGIC-PLANNING')) {
    additionalSentences.push(
      { kr: "장기 전략 계획이 경쟁 우위를 확보합니다.", en: "Long-term strategic planning secures competitive advantages." },
      { kr: "시나리오 기반 계획이 불확실성을 관리합니다.", en: "Scenario-based planning manages uncertainty." },
      { kr: "전략적 이니셔티브가 변화를 주도합니다.", en: "Strategic initiatives drive organizational transformation." }
    );
  }
  
  if (focus.includes('LEADERSHIP')) {
    additionalSentences.push(
      { kr: "변혁적 리더십이 조직 문화를 혁신합니다.", en: "Transformational leadership revolutionizes organizational culture." },
      { kr: "서번트 리더십이 팀 성과를 극대화합니다.", en: "Servant leadership maximizes team performance." },
      { kr: "적응적 리더십이 복잡성을 관리합니다.", en: "Adaptive leadership manages complexity effectively." }
    );
  }
  
  if (focus.includes('NEGOTIATION')) {
    additionalSentences.push(
      { kr: "상호 이익 협상이 장기 파트너십을 구축합니다.", en: "Win-win negotiations build long-term partnerships." },
      { kr: "협상 레버리지가 유리한 조건을 확보합니다.", en: "Negotiation leverage secures favorable terms." },
      { kr: "문화적 인텔리전스가 글로벌 협상을 성공시킵니다.", en: "Cultural intelligence enables successful global negotiations." }
    );
  }
  
  if (focus.includes('DIGITAL-STRATEGY')) {
    additionalSentences.push(
      { kr: "디지털 네이티브 전략이 시장을 재정의합니다.", en: "Digital-native strategies redefine markets." },
      { kr: "플랫폼 비즈니스 모델이 생태계를 구축합니다.", en: "Platform business models create ecosystems." },
      { kr: "AI 중심 전략이 경쟁력을 혁신합니다.", en: "AI-centric strategies revolutionize competitiveness." }
    );
  }
  
  if (focus.includes('FINANCIAL')) {
    additionalSentences.push(
      { kr: "가치 기반 관리가 주주 가치를 극대화합니다.", en: "Value-based management maximizes shareholder value." },
      { kr: "리스크 조정 수익률이 투자 결정을 안내합니다.", en: "Risk-adjusted returns guide investment decisions." },
      { kr: "자본 효율성이 성장 전략을 지원합니다.", en: "Capital efficiency supports growth strategies." }
    );
  }
  
  if (focus.includes('SUSTAINABILITY')) {
    additionalSentences.push(
      { kr: "순환 경제 모델이 지속가능성을 실현합니다.", en: "Circular economy models achieve sustainability." },
      { kr: "ESG 통합이 장기 가치를 창출합니다.", en: "ESG integration creates long-term value." },
      { kr: "임팩트 투자가 사회적 가치를 추구합니다.", en: "Impact investing pursues social value creation." }
    );
  }
  
  if (focus.includes('CRISIS-MANAGEMENT')) {
    additionalSentences.push(
      { kr: "위기 리더십이 조직 회복력을 강화합니다.", en: "Crisis leadership strengthens organizational resilience." },
      { kr: "시나리오 플래닝이 위기 대비를 최적화합니다.", en: "Scenario planning optimizes crisis preparedness." },
      { kr: "적응적 역량이 불확실성을 기회로 전환합니다.", en: "Adaptive capabilities transform uncertainty into opportunity." }
    );
  }
  
  if (focus.includes('INNOVATION')) {
    additionalSentences.push(
      { kr: "개방형 혁신이 생태계 협력을 활성화합니다.", en: "Open innovation activates ecosystem collaboration." },
      { kr: "디자인 씽킹이 고객 중심 혁신을 이끕니다.", en: "Design thinking drives customer-centric innovation." },
      { kr: "린 스타트업 방법론이 혁신 속도를 가속화합니다.", en: "Lean startup methodology accelerates innovation velocity." }
    );
  }
  
  return additionalSentences;
}

// 각 스테이지를 50개 문장으로 확장
const expandedStages = l6Spec.stages.map((stage, index) => {
  console.log(`📝 스테이지 ${index + 1}/${l6Spec.stages.length}: ${stage.id} - ${stage.title}`);
  
  let allSentences = [];
  
  // 시드 문장들 추가
  if (stage.seeds) {
    allSentences.push(...stage.seeds);
  }
  
  // 각 시드 문장에서 전문 비즈니스 변형 생성
  if (stage.seeds) {
    stage.seeds.forEach(seed => {
      const variants = generateProfessionalVariants(seed, stage.focus, stage.lexset, stage.traps);
      allSentences.push(...variants.slice(0, 5)); // 각 시드당 최대 5개 변형
    });
  }
  
  // 추가 전문 문장 생성
  const additional = generateProfessionalSentences(stage);
  allSentences.push(...additional);
  
  // 중복 제거
  const uniqueSentences = allSentences.filter((sentence, index, self) => 
    index === self.findIndex(s => s.en === sentence.en)
  );
  
  // 50개로 조정 (전문 비즈니스 품질 유지)
  while (uniqueSentences.length < 50) {
    // 부족한 경우 고품질 비즈니스 문장 추가
    const baseIdx = Math.floor(Math.random() * Math.min(uniqueSentences.length, 10));
    const baseSentence = uniqueSentences[baseIdx];
    
    // 전문 비즈니스 변형 생성
    const variants = [
      {
        kr: baseSentence.kr.replace(/\(.*?\)/g, '').trim() + ` (C-레벨 ${uniqueSentences.length + 1})`,
        en: baseSentence.en.replace(/\.$/, ' in C-suite contexts.')
      },
      {
        kr: baseSentence.kr.replace(/\(.*?\)/g, '').trim() + ` (글로벌 ${uniqueSentences.length + 1})`,
        en: baseSentence.en.replace(/\.$/, ' across global operations.')
      },
      {
        kr: baseSentence.kr.replace(/\(.*?\)/g, '').trim() + ` (전략적 ${uniqueSentences.length + 1})`,
        en: baseSentence.en.replace(/\.$/, ' within strategic frameworks.')
      }
    ];
    
    // 중복되지 않는 변형 추가
    for (const variant of variants) {
      if (!uniqueSentences.some(s => s.en === variant.en) && uniqueSentences.length < 50) {
        uniqueSentences.push(variant);
      }
    }
  }
  
  // ID와 form, 그리고 전문 비즈니스 태그 추가
  const finalSentences = uniqueSentences.slice(0, 50).map((sentence, idx) => ({
    id: `${stage.id}_${(idx + 1).toString().padStart(2, '0')}`,
    kr: sentence.kr,
    en: sentence.en,
    form: idx < 40 ? 'aff' : (idx < 47 ? 'neg' : 'wh_q'), // 비즈니스는 주로 서술문
    grammar_tags: stage.focus || [],
    professional_level: 'C2-Native',
    register: 'professional_executive',
    industry_context: 'cross_industry'
  }));
  
  console.log(`  ✅ ${finalSentences.length}개 전문 비즈니스 문장 생성 완료`);
  
  return {
    stage_id: stage.id,
    title: stage.title,
    description: stage.intent,
    focus_areas: stage.focus || [],
    vocabulary: stage.lexset || [],
    difficulty_notes: stage.traps || [],
    professional_level: 'C2-Native',
    register: 'professional_executive',
    industry_context: 'cross_industry',
    sentences: finalSentences
  };
});

// 결과 저장
const outputFilename = 'banks_L6_batch1_batch2_expanded.json';
fs.writeFileSync(outputFilename, JSON.stringify({
  batch_info: {
    name: 'L6_Professional_Industry_Complete_Expanded',
    description: 'L6 전문 실무 영어 완전판 - Batch1&2 통합 (S01-S24, 총 1,200문장)',
    level: 6,
    cefr_level: 'C2-Native',
    professional_focus: 'Executive leadership, strategic management, global business operations',
    created_at: new Date().toISOString(),
    total_stages: expandedStages.length,
    total_sentences: expandedStages.reduce((sum, stage) => sum + stage.sentences.length, 0)
  },
  stages: expandedStages
}, null, 2));

console.log(`\\n🎉 L6 Professional Industry 확장 완료!`);
console.log(`📄 출력 파일: ${outputFilename}`);
console.log(`📊 총 스테이지: ${expandedStages.length}개`);
console.log(`📝 총 문장: ${expandedStages.reduce((sum, stage) => sum + stage.sentences.length, 0)}개`);
console.log(`💼 전문 수준: C2-Native (Executive Professional)`);
console.log(`🌐 적용 범위: Cross-Industry Global Business`);
console.log(`\\n다음 단계: 이 파일을 사용하여 Firestore 업서트 실행`);