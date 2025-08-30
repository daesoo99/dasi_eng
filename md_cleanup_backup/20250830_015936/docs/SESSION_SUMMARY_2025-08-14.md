# SESSION SUMMARY — 2025-08-14

## 1) 목표

200+ 스테이지를 스피킹 중심으로, 레벨별 순차 학습이 가능하게 재설계.

필요 시 스테이지 추가/분해가 안전한 구조(Core/Bridge/Optional, ID 규칙) 확립.

승인→적용 가드레일 하에서 자동화(스모크/문서/업서트) 루틴 구축.

## 2) 오늘까지 한 일 (L1–L6)

### 커리큘럼 상태

L1: 19/5 (전치사·관사·지시어 조기 배치), Firestore curricula/1/versions/revised

L2: 22/6 (상황별 + 브릿지 2), Firestore …/2/…/revised

L3: 26/6 (상황별 + 브릿지 3), Firestore …/3/…/revised

L4: 24/6 (비즈니스 기초 + 브릿지 3), Firestore …/4/…/revised

L5: 24/6 (고급 비즈니스/학술 + 브릿지 3), Firestore …/5/…/revised

L6: 24/6 (도메인별 전문 커뮤니케이션 + 브릿지 3), Firestore …/6/…/revised

### 공통 규칙

ID: LvX-P[1..6]-S[01..] / Bridge: LvX-A2-S08, LvX-A4-S16, LvX-A6-S24

분류 집계: core:18 / bridge:3 / optional:3 (레벨당)

검증 루틴: /curriculum-test → Phases/Stages/Bridges/분류 카운트 일치 확인

### 인프라

React 앱(3018), 백엔드(8085), 정적(4002)

API: GET /api/curriculum/:level + 헤더 X-Curriculum-Version: revised

SoT: Firestore curricula/{level}/versions/revised (메타+스펙)

## 3) 운영 가드레일 (필수)

임의 수정 금지: 항상 제안서 → 승인 → 적용.

적용 단계(고정): JSON 생성 → curriculum.ts 경로 → 스모크 → 문서(3종) → Firestore 업서트.

소배치 원칙: 최대 24–30 스테이지 단위.

## 4) 다음에 할 일

L7 제안서 v1 (글로벌/문화 간 커뮤니케이션) 작성→승인→적용.

훈련 엔진 메타(delay/random/minCAA/tags) 모든 Stage에 주입 + /curriculum-test 메타 검사 추가.

콘텐츠 린트 자동화(ID/카운트/분류/슬롯·중복)로 품질 보증.

## 5) "원클릭" 승인/적용 스탬프 (CLI가 자동 해석)

### A) 제안서 승인 스탬프
```
APPROVE L{LEVEL} v1
Spec: 6/24 · Bridges=A2/A4/A6 · Class=18/3/3
IDs: Lv{LEVEL}-Px-Syy, Bridges at S08/S16/S24
AC: Stage당 코어표현 5–8 · /curriculum-test 일치 · 문서 3종 업데이트
Next: JSON → curriculum.ts → Smoke → Docs → Firestore upsert
```

### B) 적용 지시 (단계 지정)
```
RUN L{LEVEL} APPLY — steps 3→5 only
Smoke(6/24, Bridges=A2/A4/A6, Class=18/3/3) → Docs(3종) → Firestore upsert(curricula/{level}/versions/revised)
```

### C) 엔진 메타 패치
```
RUN engine-metadata patch — levels=1..6
Add fields: drill.delaySec, drill.randomize, drill.minCorrectToAdvance, slots(5..8), tags[]
Add levelMeta defaults: L1=3s/NR, L2=2s/NR, L3+=1s/R
Extend /curriculum-test to validate metadata presence
```

### D) 커리큘럼 린트
```
RUN curriculum-lint — levels=1..6
Checks: ID format · Phases/Stages count · Class tally · Slots 5–8 · Duplicate phrases
Output: report at docs/QA_LINT_REPORT.md
```

## 6) 앞으로 "내가 말하기 전에 스스로" 움직이려면 (Auto-continue 정책)

### ops/policy.yaml (CLI가 읽도록)
```yaml
mode: guarded-auto   # confirm, guarded-auto, full-auto
batch_limit: 30      # max stages per batch
allowed_tasks:
  - smoke_test
  - docs_update
  - firestore_upsert
  - curriculum_lint
preconditions:
  - "APPROVE stamp exists for level"
  - "spec matches AC (6/24, bridges=A2/A4/A6, class=18/3/3)"
rollback:
  snapshot: true
  label: "rev-2025-08-14"
notifications:
  on_success: "post summary to docs/SESSION_LOG.md"
  on_failure: "open PR with diff + lint report"
```

## 7) 커밋 메시지(권장)
```
feat(curriculum): ship L1–L6 REVISED to Firestore; lock "approve→apply" guardrails; prep L7 proposal
- L1–L6: SoT = curricula/{level}/versions/revised
- Fixed counts: L1 19/5, L2 22/6, L3 26/6, L4 24/6, L5 24/6, L6 24/6
- Added one-click stamps (APPROVE / RUN APPLY / engine-metadata / curriculum-lint)
```

## 마지막 한 줄 요약

**지금까지**: L1–L6 완성 + Firestore 배포 + 가드레일 확립.

**바로 다음**: L7 제안서 v1 + 엔진 메타 패치 + 린트 자동화.

**자동화**: 위 스탬프/정책으로 CLI가 네가 말하기 전에 안전 범위 내에서 먼저 굴러간다.