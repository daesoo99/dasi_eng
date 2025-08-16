# Level 6 설계 제안서 v1 (승인용 초안)

## 0) 개요

**목표**: L5(고급 비즈니스/학술 담화) → **L6(도메인별 전문 커뮤니케이션)**로 확장

**총합**: 6 Phases / 24 Stages (일관성 유지: Core 18 / Bridge 3 / Optional 3)

**ID 규칙**: Lv6-P[phase]-S[stage], 브릿지 Lv6-A[번호]-S[stage]

**연계**: L5 브릿지 → L6 도메인별 전문성
- L5-A2-S08(인사이트 요약) → L6 데이터 분석 전문 표현
- L5-A4-S16(역할·소유권) → L6 프로젝트·오퍼레이션 관리
- L5-A6-S24(외부 이해관계자) → L6 고객·파트너 관계 관리

## 1) Phase / Stage 설계 (각 Stage 코어 표현 샘플 5–8)

### Phase 1 — Product & Innovation Management (4)

**Lv6-P1-S01 (Core): 제품 로드맵·비전**
- Product vision / Roadmap priorities / Feature backlog / User story / MVP definition

**Lv6-P1-S02 (Core): 사용자 경험·피드백**  
- User journey / Pain point / UX research / A/B testing / Usability study

**Lv6-P1-S03 (Core): 기술 요구사항·스펙**
- Technical specs / API design / Performance requirements / Scalability / Integration

**Lv6-P1-S04 (Core): 출시·반복 계획**
- Release cycle / Sprint planning / Go-to-market / Launch metrics / Post-launch review

### Phase 2 — Data Analysis & Business Intelligence (4)

**Lv6-P2-S05 (Core): 데이터 수집·정제**
- Data pipeline / ETL process / Data quality / Clean dataset / Missing values

**Lv6-P2-S06 (Core): 분석 방법론·통계**
- Statistical significance / Correlation vs causation / Regression analysis / Confidence interval / Sample size

**Lv6-P2-S07 (Optional): 시각화·대시보드**
- Dashboard design / Chart selection / KPI visualization / Interactive reports / Data storytelling

**Lv6-P2-S08 (Bridge: A2): 예측 모델링·인사이트**
- Predictive analytics / Machine learning / Pattern recognition / Actionable insights / Data-driven decisions

### Phase 3 — Operations & Process Excellence (4)

**Lv6-P3-S09 (Core): 프로세스 최적화**
- Process mapping / Bottleneck analysis / Workflow automation / Efficiency gains / Standard operating procedures

**Lv6-P3-S10 (Core): 품질 관리·표준**
- Quality assurance / Six Sigma / ISO standards / Compliance check / Error reduction

**Lv6-P3-S11 (Core): 공급망·운영**
- Supply chain / Vendor management / Inventory optimization / Logistics / Cost reduction

**Lv6-P3-S12 (Core): 성과 모니터링·개선**
- Performance metrics / SLA monitoring / Continuous improvement / Root cause analysis / Best practices

### Phase 4 — Strategic Partnerships & Stakeholder Management (4)

**Lv6-P4-S13 (Core): 파트너십·제휴**
- Strategic alliance / Partnership agreement / Joint venture / Channel partnerships / Win-win scenarios

**Lv6-P4-S14 (Core): 계약·협상 전문**
- Contract negotiation / Terms and conditions / SLA definition / Penalty clauses / Renewal terms

**Lv6-P4-S15 (Optional): 법무·컴플라이언스**
- Legal compliance / Regulatory requirements / Risk assessment / Due diligence / Audit preparation

**Lv6-P4-S16 (Bridge: A4): 프로젝트 거버넌스**
- Project governance / Steering committee / RACI matrix / Change management / Milestone tracking

### Phase 5 — Customer Success & Market Development (4)

**Lv6-P5-S17 (Core): 고객 성공·유지**
- Customer success / Retention strategy / Churn analysis / Customer lifetime value / Satisfaction surveys

**Lv6-P5-S18 (Core): 마케팅·브랜딩**
- Brand positioning / Marketing funnel / Customer acquisition / Digital marketing / ROI measurement

**Lv6-P5-S19 (Optional): 영업·수익 최적화**
- Sales pipeline / Lead qualification / Revenue forecasting / Pricing strategy / Deal closing

**Lv6-P5-S20 (Core): 시장 확장·진출**
- Market entry / Competitive analysis / Market segmentation / Go-to-market strategy / International expansion

### Phase 6 — Executive Leadership & Transformation (4)

**Lv6-P6-S21 (Core): 조직 변화·혁신**
- Digital transformation / Change leadership / Innovation culture / Agile transformation / Organizational restructuring

**Lv6-P6-S22 (Core): 인재·팀 빌딩**
- Talent acquisition / Team building / Leadership development / Succession planning / Performance management

**Lv6-P6-S23 (Core): 전략 실행·모니터링**
- Strategy execution / OKR implementation / Balanced scorecard / Strategic initiatives / Performance dashboard

**Lv6-P6-S24 (Bridge: A6): 이사회·투자자 소통**
- Board presentation / Investor relations / Financial reporting / Shareholder communication / IPO preparation

## 분류 요약
- **Core**: 18개 (Bridge/Optional 제외한 모든 스테이지)
- **Bridge**: 3개 (A2-S08, A4-S16, A6-S24)
- **Optional**: 3개 (S07, S15, S19)

## 2) 검증 기준 (/curriculum-test 기대값)

- **Phases**: 6
- **Stages**: 24
- **Bridge**: Lv6-A2-S08, Lv6-A4-S16, Lv6-A6-S24
- **Classification**: core:18 / bridge:3 / optional:3
- **ID 형식**: Lv6-P[1..6]-S[01..] (제로 패딩 유지)

## 3) 적용 순서 (승인 후)

1. `patterns/level_6_domain_expertise/lv6_stage_system_REVISED.json` 생성
2. `web_app/src/config/curriculum.ts`에 L6 REVISED 경로 추가
3. `/curriculum-test` 스모크: 6/24, 브릿지 3, 분류 집계 18/3/3 확인
4. 문서: `docs/ChangeLog_Lv6.md`, `docs/STAGE_MANAGEMENT.md`, `CoreOptionalMap.csv` 갱신
5. Firestore 업서트: `curricula/6/versions/revised` (메타+스펙)
6. 헤더 `X-Curriculum-Version: revised`로 조회 확인

## 4) Before→After 매핑 (L5 브릿지 연결)

| L5 Bridge | L6 Stage | 연결 효과 |
|-----------|----------|-----------|
| L5-A2-S08(인사이트 요약) | Lv6-P2-S08(예측 모델링) | 분석 → 예측 전문성 |
| L5-A4-S16(역할·소유권) | Lv6-P4-S16(프로젝트 거버넌스) | 관리 → 거버넌스 체계화 |
| L5-A6-S24(외부 이해관계자) | Lv6-P6-S24(이사회·투자자) | 소통 → Executive 레벨 |

## 5) 도메인별 전문성 확장 전략

### 🏗️ **구조적 특징**
- **Phase 1-2**: 제품·데이터 (기술 중심)
- **Phase 3-4**: 운영·파트너십 (프로세스 중심)  
- **Phase 5-6**: 고객·리더십 (전략 중심)

### 🎯 **스피킹 최적화**
- 각 도메인별 **회의 시나리오** 기반 표현
- **실무 상황** 중심 패턴 (보고서 작성 X)
- **의사결정 프로세스** 언어에 집중

### 🔗 **L7 연결 준비**
L6 브릿지 → L7 글로벌/다문화 전문 커뮤니케이션:
- A2: 예측 모델링 → 글로벌 시장 예측
- A4: 프로젝트 거버넌스 → 국제 프로젝트 관리
- A6: 이사회 소통 → 다국적 기업 커뮤니케이션

## 승인 전 확인 포인트

- ✅ Bridge 정확히 3개로 고정(A2/A4/A6) — L5 패턴과 일치
- ✅ Optional=3(S07/S15/S19) — 전문 영역별 선택 학습
- ✅ 각 Stage 표현은 스피킹 용도 — 회의/협상/의사결정 맥락
- ✅ 도메인별 균형 — 기술/프로세스/전략 영역 골고루 분산
- ✅ L5→L6→L7 브릿지 라인 연속성 유지

---
*제안일: 2025-08-14*
*작성자: DaSi English Development Team*