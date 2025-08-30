# DaSi 영어학습 플랫폼 - 커리큘럼 재구성 계획

## 📋 프로젝트 개요

**목표**: 순차적 학습 보장 원칙에 따른 체계적인 문장 분류 및 스테이지별 재배치
**배경**: 현재 스테이지 정의 파일과 예문 데이터가 서로 다른 위치에 분산되어 일관성 부족
**원칙**: "Stage N에서는 Stage 1~N까지 배운 내용만 사용" 철저 준수

### 현재 문제점
- **데이터 분산**: `web_app/public/patterns/banks/`에는 정의만, `data/banks/`에는 문장만 존재
- **일관성 부족**: 스테이지와 문장이 연결되지 않음
- **구조 혼재**: patterns_backup_*, archive_completed_work 등 중복 폴더 존재
- **순차성 미검증**: 문법 난이도 순서 위반 가능성

---

## 🎯 5단계 실행 계획

### 1️⃣ 스테이지와 문법 범위 정의

**목표**: 각 스테이지별 허용 문법 목록을 표로 정리

**작업 내용**:
```bash
# 기존 스테이지 정의 파일 분석
- banks/ 하위의 grammar_pattern, description, learning_points 추출
- patterns/README.md의 레벨별 문법 범위 확인
- Level 1: be동사, 현재시제
- Level 2: 의문문, 부정문  
- Level 3: 과거시제, 진행형
```

**산출물**:
- `docs/curriculum/GRAMMAR_MAPPING_BY_STAGE.md` - 스테이지별 문법 허용 목록
- `docs/curriculum/LEVEL_BOUNDARIES.json` - 레벨 간 경계 규칙

### 2️⃣ 문장 데이터 취합

**목표**: 흩어진 모든 영어 문장을 한 곳에 모으기

**대상 위치**:
```
- 루트 banks/ 폴더
- patterns_backup_* 백업 폴더들
- 기타 .md 문서들
- data/banks/ 하위 파일들
```

**작업 방법**:
```bash
# 모든 문장 데이터 추출 스크립트 작성
node scripts/extract-all-sentences.js
# → data/extracted_sentences.json 생성

# 미배치 문장 관리
data/unassigned_sentences.json 생성
```

**산출물**:
- `data/extracted_sentences.json` - 전체 문장 모음
- `data/unassigned_sentences.json` - 미배치 문장 임시 저장소

### 3️⃣ 문장 분류 기준 적용

**목표**: 순차적 학습 원칙에 따른 자동/수동 분류

**분류 기준**:

**A) 문법 수준 검사**
```javascript
// 예시: Stage 5 문장 검증
const allowedGrammar = getGrammarByStage(1, 5); // Stage 1~5까지
const sentence = "I have been working here for 3 years.";
const usedGrammar = analyzeSentence(sentence);
const isValid = usedGrammar.every(g => allowedGrammar.includes(g));
```

**B) Level 경계 준수**
- Level 2 문장에 Level 3+ 문법 사용 금지
- 점진적 난이도 증가 확인

**C) 학습 난이도 점검**
- 어휘 난이도 (초/중/고급 구분)
- 문장 길이 (단어 수 기준)  
- 구조 복잡도 (단문→복문→복합문)

**D) 형태 분배**
```json
{
  "forms_distribution": {
    "aff": 30,     // 긍정문 60%
    "neg": 10,     // 부정문 20%  
    "wh_q": 10     // 의문문 20%
  }
}
```

**작업 도구**:
```bash
# 자동 분류 스크립트 개발
node scripts/classify-sentences.js --stage Lv2-P1-S01
node scripts/validate-grammar-sequence.js --level 2
```

### 4️⃣ 문장 배치 및 파일 재구성

**목표**: Canonical 데이터셋 생성 및 구조 통합

**A) 진실 원본(Single Source of Truth) 설정**
```
✅ web_app/public/patterns/banks/level_x/ → 공식 데이터 위치
❌ 루트 banks/ → 백업으로 이동
❌ patterns_backup_* → archives/로 이동
```

**B) 파일 구조 표준화**
```json
{
  "stage_id": "Lv2-P1-S01",
  "title": "현재시제 기본 문장",
  "level": 2,
  "phase": 1,
  "stage": 1,
  "grammar_focus": ["present_simple", "be_verb"],
  "sentences": [/* 50개 문장 배열 */],
  "forms_distribution": {"aff": 30, "neg": 10, "wh_q": 10},
  "generated_count": 50,
  "status": "validated",
  "version": "2.0",
  "last_updated": "2025-08-28"
}
```

**C) 백업 및 버전 관리**
```bash
# 기존 파일 백업
backups/stage_archives/v1.0/
backups/unused_sentences/
data/unassigned/
```

### 5️⃣ 검증 및 품질 관리

**목표**: 순차적 학습 원칙 위반 방지

**A) 자동 검증 스크립트**
```bash
# 전체 커리큘럼 검증
node scripts/validate-curriculum.js --full-check

# 특정 레벨 검증  
node scripts/validate-curriculum.js --level 2

# 순차성 위반 감지
node scripts/detect-grammar-violations.js
```

**B) 수동 검토 체크리스트**
- [ ] 각 스테이지 50개 문장 완성
- [ ] 형태별 분배 비율 준수
- [ ] 문법 순차성 위반 없음
- [ ] 어휘 난이도 점진적 증가
- [ ] 중복 문장 없음

**C) 품질 지표**
```json
{
  "completion_rate": "100%",
  "grammar_violations": 0,
  "duplicate_sentences": 0,
  "difficulty_progression": "valid",
  "form_distribution_compliance": "100%"
}
```

---

## 📊 새 문장 제작 지침

### 원칙
1. **순차성 준수**: Stage N은 Stage 1~N 문법만 사용
2. **형태 균형**: 긍정/부정/의문 적절 분배
3. **실용성**: 일상 사용 빈도 높은 표현 우선
4. **오류 유도**: 학습자 흔한 실수 패턴 10~15% 포함

### 예시 (Level 2, Stage 1)
```json
{
  "allowed_grammar": ["be_verb", "present_simple", "basic_adjectives"],
  "forbidden_grammar": ["present_continuous", "past_tense", "modal_verbs"],
  "target_sentence": "She is a teacher.",  // ✅ 올바름
  "avoid_sentence": "She is teaching now."  // ❌ 현재진행형 사용
}
```

---

## 🛠 구현 도구 및 스크립트

### 필요한 스크립트들
```bash
scripts/
├── extract-all-sentences.js      # 전체 문장 추출
├── classify-sentences.js         # 자동 분류
├── validate-curriculum.js        # 순차성 검증
├── detect-grammar-violations.js  # 위반 탐지
├── reorganize-files.js           # 파일 구조 정리
├── generate-reports.js           # 진행상황 리포트
└── migrate-to-canonical.js       # 최종 데이터 이관
```

### 데이터 구조
```
data/
├── curriculum/
│   ├── grammar_mapping.json      # 스테이지별 문법 매핑
│   ├── level_boundaries.json     # 레벨 경계 규칙
│   └── difficulty_progression.json
├── extracted_sentences.json      # 추출된 전체 문장
├── classified_sentences.json     # 분류 완료 문장
├── unassigned_sentences.json     # 미배치 문장
└── validation_reports/           # 검증 결과
```

---

## 📈 성공 지표

### 완료 기준
- [ ] 전체 362개 스테이지 문장 배치 완료
- [ ] 각 스테이지 정확히 50개 문장 보유
- [ ] 문법 순차성 위반 0개
- [ ] 단일 데이터 소스 구조 완성
- [ ] 자동 검증 시스템 작동

### 품질 기준
- **일관성**: 모든 스테이지 파일 구조 통일
- **완전성**: 누락된 스테이지/문장 없음
- **정확성**: 순차적 학습 원칙 100% 준수
- **유지보수성**: 새 문장 추가/수정 용이성
- **확장성**: 향후 레벨 확장 지원

---

## 📅 실행 일정

### Phase 1: 분석 및 설계 (1-2주)
- 기존 데이터 구조 분석
- 문법 매핑 테이블 작성
- 스크립트 개발

### Phase 2: 데이터 추출 및 분류 (2-3주)  
- 전체 문장 추출
- 자동 분류 실행
- 수동 검토 및 보정

### Phase 3: 재구성 및 검증 (1-2주)
- 파일 구조 정리
- 최종 데이터 배치
- 품질 검증

### Phase 4: 도구 완성 및 문서화 (1주)
- 유지보수 도구 완성
- 사용자 가이드 작성
- 프로세스 문서화

---

## 🚀 권장 에이전트

**최적 선택: general-purpose 에이전트**

**이유**:
- ✅ 복잡한 다단계 작업 자율 처리 가능
- ✅ 모든 도구 (파일 시스템, 데이터 분석, 스크립팅) 접근 가능  
- ✅ 검색, 분류, 검증 등 다양한 작업 통합 수행
- ✅ 장기간 진행되는 프로젝트 맥락 유지

**대안: project-lifecycle-manager 에이전트** (프로젝트 관리 측면 강조 시)

**부적합한 에이전트들**:
- ❌ nextjs-code-reviewer: 코드 리뷰에 특화, 데이터 분류 업무 범위 외
- ❌ react-ui-performance-reviewer: UI 성능에 특화, 커리큘럼 작업과 무관  
- ❌ project-strategy-advisor: 전략 수립용, 실제 구현 도구 부족

---

**최초 작성**: 2025-08-28  
**담당자**: DaSi 플랫폼 개발팀  
**우선순위**: 높음 (사용자 학습 경험 직결)