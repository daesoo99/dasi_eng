# Level 5 설계 제안서 v1 (승인용 초안)

## 0) 개요

**목표**: L4(비즈니스 기초) → **L5(고급 비즈니스/학술 담화)**로 확장

**총합**: 6 Phases / 24 Stages (일관성 유지: Core 18 / Bridge 3 / Optional 3)

**ID 규칙**: Lv5-P[phase]-S[stage], 브릿지 Lv5-A[번호]-S[stage]

**연계**: L4 브릿지 → L5 고급 표현
- L4-A2-S08(건설적 피드백) → L5 평가·피드백 심화
- L4-A4-S16(복잡 문제해결) → L5 전략·트레이드오프
- L4-A6-S24(글로벌 컨텍스트) → L5 국제·문화 간 커뮤니케이션

## 1) Phase / Stage 설계 (각 Stage 코어 표현 샘플 5–8)

### Phase 1 — Executive Framing & Intent (4)

**Lv5-P1-S01 (Core): 의도/목표 선명화**
- Our intent is to… / The objective here is… / We're aiming to… / In essence, we want to… / By Q4, we plan to…

**Lv5-P1-S02 (Core): 범위·제약 정의**  
- Within scope / Out of scope / Given the constraints / Under tight timelines / With limited budget

**Lv5-P1-S03 (Core): 가설·가정 제시**
- We hypothesize that… / This assumes… / If our assumption holds… / Working hypothesis / Preliminary take

**Lv5-P1-S04 (Core): 신속한 얼라인(stand-up)**
- Quick alignment on… / Let's sync on… / To get everyone on the same page… / Action items / Owners, due dates

### Phase 2 — Analytical Reasoning & Evidence (4)

**Lv5-P2-S05 (Core): 근거 제시·근거 요청**
- Based on the data / The evidence suggests / What's the source? / Can we validate that? / Data point / Sample size

**Lv5-P2-S06 (Core): 비교·벤치마킹**
- Compared to last quarter / Relative to peers / Benchmark against… / Outperform / Lag behind

**Lv5-P2-S07 (Optional): 추세·시계열 설명**
- Year-over-year / Quarter-to-quarter / Trending upward / Seasonality / Volatility / Confidence interval

**Lv5-P2-S08 (Bridge: A2): 인사이트 요약**
- Key takeaway / The pattern here is… / Net-net… / In short… / What this means is…

### Phase 3 — Strategy, Trade-offs & Risk (4)

**Lv5-P3-S09 (Core): 전략 옵션 제시**
- Option A/B/C / Short-term vs long-term / Offensive vs defensive / Lean approach / Pilot first

**Lv5-P3-S10 (Core): 트레이드오프·우선순위**
- Trade-off is… / If we optimize for X, we lose Y / Must-have vs nice-to-have / Prioritize / De-scope

**Lv5-P3-S11 (Core): 리스크·완화책**
- Risks include… / Mitigation plan / Contingency / Worst-case / Dependency / Single point of failure

**Lv5-P3-S12 (Core): 결정·합의 문구**
- Let's converge on… / Decision point / Final call / Consensus / Objections? / Any blockers?

### Phase 4 — Collaboration, Negotiation & Alignment (4)

**Lv5-P4-S13 (Core): 설득·반론 처리**
- I see your point, but… / Consider that… / From another angle… / The trade-off is… / What if we…

**Lv5-P4-S14 (Core): 협상 표현**
- Could we meet halfway? / In return… / If we commit to X, can you…? / Non-starter / Walk-away point

**Lv5-P4-S15 (Optional): 이해관계자 관리**
- Stakeholder map / Align expectations / Escalate / Socialize the plan / Buy-in / Pushback

**Lv5-P4-S16 (Bridge: A4): 역할·소유권 명확화**
- Owner / DRI / Hand-off / Take over / Accountability / Who's on point?

### Phase 5 — Evaluation, Feedback & Quality (4)

**Lv5-P5-S17 (Core): 측정·지표·성공 기준**
- North-star metric / KPI / Define success / Baseline / Target / Leading vs lagging indicator

**Lv5-P5-S18 (Core): 리뷰·레트로**
- What worked / What didn't / Lessons learned / Next time we'll… / Actionable feedback

**Lv5-P5-S19 (Optional): 포멀 피드백·문서톤**
- I appreciate that… / It would be better if… / On balance… / For the record / Formal recommendation

**Lv5-P5-S20 (Core): 결정 기록(Decision log)**
- Decision log / Rationale / Alternatives considered / Timestamp / Owner

### Phase 6 — Global, Cross-cultural & Academic (4)

**Lv5-P6-S21 (Core): 국제·문화 간 배려**
- Let's avoid idioms / Time-zone friendly / Cultural nuance / Clarify acronyms / Plain English version

**Lv5-P6-S22 (Core): 전문가·학술 톤(스피킹용)**
- According to the study… / The literature suggests… / Methodologically speaking… / Limitations include…

**Lv5-P6-S23 (Core): 발표·Q&A 핸들링**
- To address your question… / That's outside today's scope / We'll follow up / Parking lot items

**Lv5-P6-S24 (Bridge: A6): 외부 이해관계자 커뮤니케이션**
- For external audiences… / Compliance-safe / Media-ready / Public statement / Official stance

## 분류 요약
- **Core**: 18개 (Bridge/Optional 제외한 모든 스테이지)
- **Bridge**: 3개 (A2-S08, A4-S16, A6-S24)
- **Optional**: 3개 (S07, S15, S19)

## 2) 검증 기준 (/curriculum-test 기대값)

- **Phases**: 6
- **Stages**: 24
- **Bridge**: Lv5-A2-S08, Lv5-A4-S16, Lv5-A6-S24
- **Classification**: core:18 / bridge:3 / optional:3
- **ID 형식**: Lv5-P[1..6]-S[01..] (제로 패딩 유지)

## 3) 적용 순서 (승인 후)

1. `patterns/level_5_advanced_expressions/lv5_stage_system_REVISED.json` 생성
2. `web_app/src/config/curriculum.ts`에 L5 REVISED 경로 추가
3. `/curriculum-test` 스모크: 6/24, 브릿지 3, 분류 집계 18/3/3 확인
4. 문서: `docs/ChangeLog_Lv5.md`, `docs/STAGE_MANAGEMENT.md`, `CoreOptionalMap.csv` 갱신
5. Firestore 업서트: `curricula/5/versions/revised` (메타+스펙)
6. 헤더 `X-Curriculum-Version: revised`로 조회 확인

## 4) Before→After 매핑 (샘플 포맷)

| Before (L4 Bridge) | After (L5 Stage) | 이동 사유 |
|-------------------|------------------|-----------|
| L4-A2-S08 | Lv5-P5-S18(리뷰·레트로) / Lv5-P5-S19(Optional) | 피드백/평가 흐름 고도화 |
| L4-A4-S16 | Lv5-P3-S09/S10/S11, Lv5-P4-S14 | 문제해결 → 전략/협상 확장 |
| L4-A6-S24 | Lv5-P6-S21~S24 | 글로벌/대외 커뮤니케이션 체계화 |

## 승인 전 확인 포인트

- ✅ Bridge 정확히 3개로 고정(A2/A4/A6) — 나머지는 Core로 흡수
- ✅ Optional=3(S07/S15/S19)  
- ✅ 각 Stage 문장 패턴은 스피킹 용도(문어체 과잉 금지)

---
*제안일: 2025-08-13*
*작성자: DaSi English Development Team*