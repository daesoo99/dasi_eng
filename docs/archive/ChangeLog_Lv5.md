# Level 5 변경 이력 (ChangeLog)

## 개요
Level 5 커리큘럼을 기존 중급 회화에서 **고급 비즈니스 및 학술 담화**로 전면 재구성하여 Executive-level 커뮤니케이션 역량 구축

## 변경 요약
| 구분 | 기존 | 변경 후 | 변경 사유 |
|------|------|---------| ---------|
| 주제 | 중급 회화 | **Executive-level 비즈니스** | L4→L5 자연스러운 연계 |
| Phase 수 | 6개 | 6개 | 유지 |
| 스테이지 수 | 30개 | 24개 | 집중도 향상, 일관성 유지 |
| 핵심 변화 | 일반 회화 표현 | **전략적 비즈니스 소통** | 실무 활용도 극대화 |

## 상세 변경 내용

### 기존 Level 5 (중급 회화)
```
P1~P6: 일반적인 회화 표현, 여행, 취미, 일상 상황 위주
```

### 신규 Level 5 (고급 비즈니스)
```
P1: Executive Framing & Intent (4 스테이지)
P2: Analytical Reasoning & Evidence (4 스테이지) 
P3: Strategy, Trade-offs & Risk (4 스테이지)
P4: Collaboration, Negotiation & Alignment (4 스테이지)
P5: Evaluation, Feedback & Quality (4 스테이지)
P6: Global, Cross-cultural & Academic (4 스테이지)
```

### Phase별 변경사항

#### Phase 1: Executive Framing & Intent
- **Lv5-P1-S01**: 의도/목표 선명화 (Core)
- **Lv5-P1-S02**: 범위·제약 정의 (Core)
- **Lv5-P1-S03**: 가설·가정 제시 (Core)
- **Lv5-P1-S04**: 신속한 얼라인(stand-up) (Core)

#### Phase 2: Analytical Reasoning & Evidence
- **Lv5-P2-S05**: 근거 제시·근거 요청 (Core)
- **Lv5-P2-S06**: 비교·벤치마킹 (Core)
- **Lv5-P2-S07**: 추세·시계열 설명 (Optional)
- **Lv5-P2-S08**: 인사이트 요약 (Bridge: A2)

#### Phase 3: Strategy, Trade-offs & Risk
- **Lv5-P3-S09**: 전략 옵션 제시 (Core)
- **Lv5-P3-S10**: 트레이드오프·우선순위 (Core)
- **Lv5-P3-S11**: 리스크·완화책 (Core)
- **Lv5-P3-S12**: 결정·합의 문구 (Core)

#### Phase 4: Collaboration, Negotiation & Alignment
- **Lv5-P4-S13**: 설득·반론 처리 (Core)
- **Lv5-P4-S14**: 협상 표현 (Core)
- **Lv5-P4-S15**: 이해관계자 관리 (Optional)
- **Lv5-P4-S16**: 역할·소유권 명확화 (Bridge: A4)

#### Phase 5: Evaluation, Feedback & Quality
- **Lv5-P5-S17**: 측정·지표·성공 기준 (Core)
- **Lv5-P5-S18**: 리뷰·레트로 (Core)
- **Lv5-P5-S19**: 포멀 피드백·문서톤 (Optional)
- **Lv5-P5-S20**: 결정 기록(Decision log) (Core)

#### Phase 6: Global, Cross-cultural & Academic
- **Lv5-P6-S21**: 국제·문화 간 배려 (Core)
- **Lv5-P6-S22**: 전문가·학술 톤(스피킹용) (Core)
- **Lv5-P6-S23**: 발표·Q&A 핸들링 (Core)
- **Lv5-P6-S24**: 외부 이해관계자 커뮤니케이션 (Bridge: A6)

## L4→L5 연계 체계

### 브릿지 스테이지 연결
| L4 브릿지 | L5 연결점 | 연계 효과 |
|----------|----------|-----------|
| L4-A2-S08 (건설적 피드백) | Lv5-P5-S18/S19 | 피드백 → 평가 시스템화 |
| L4-A4-S16 (복잡 문제해결) | Lv5-P3-S09~S12 | 문제해결 → 전략적 사고 |
| L4-A6-S24 (글로벌 컨텍스트) | Lv5-P6-S21~S24 | 글로벌 → 다문화 전문성 |

## 분류 체계
| 분류 | 개수 | 특징 |
|------|------|------|
| **Core** | 18개 | Executive 필수 표현 |
| **Bridge** | 3개 | L6 고급 전문 표현 조기 도입 |
| **Optional** | 3개 | 전문 영역별 선택 학습 |

## 핵심 표현 샘플

### Executive Intent (P1)
- "Our intent is to capture 25% market share"
- "Within scope / Out of scope"
- "We hypothesize that..."

### Strategic Communication (P3)
- "Option A vs Option B"
- "Trade-off is speed vs quality"
- "Risks include... Mitigation plan..."

### Global Context (P6)  
- "Let's avoid idioms for our global team"
- "According to the study..."
- "For external audiences..."

## 기대 효과

### 1. Executive 수준 소통 역량
- 전략적 의사결정 표현
- 데이터 기반 논증 능력
- 글로벌 맥락 이해

### 2. L4→L6 연결성 강화
- 비즈니스 기초 → Executive → 전문 분야별 심화
- 체계적 단계별 학습 경로

### 3. 실무 적용성 극대화
- 실제 회의, 프레젠테이션 즉시 활용 가능
- 국제 비즈니스 환경 대응력

## 구현 상태
- [x] L5 제안서 v1 작성 및 승인
- [x] JSON 파일 생성 완료 (`lv5_stage_system_REVISED.json`)
- [x] curriculum.ts 연동 완료
- [x] 스모크 테스트 통과 (24 stages / 6 phases / 3 bridges)
- [x] 문서화 완료 (ChangeLog_Lv5.md)
- [ ] Firestore 업서트 예정

## 검증 결과
✅ **L5 REVISED 검증 완료**
- Phases: 6, Stages: 24
- Bridge IDs: Lv5-A2-S08, Lv5-A4-S16, Lv5-A6-S24
- 분류: Core 18, Bridge 3, Optional 3

---
*최종 업데이트: 2025-08-14*
*작성자: DaSi English Development Team*