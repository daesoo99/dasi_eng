# CLI/팀 답장

## ✅ Batch #1 적용 확인

**완료 상태**: 분할 6/6, 확장 300문장, 린트 플래그 58개, 업서트 OK, /curriculum-test 수치 일치

## 📋 다음 진행사항

### 1) 자동수정 우선 처리
- **린트 플래그 58건** → 규칙 기반 자동수정
  - 빈도부사 위치 (18건)
  - 관사 누락/과다 (15건)  
  - 조동사 구조 (12건)
- **재린트** → 플래그 감소 확인

### 2) Batch #2 골드 스펙 적용
- **파일**: `batch_specs_L2_L3_batch2.json` (루트에 위치)
- **포함**: 6스테이지 (L2×4, L3×2)
- **파이프라인**: expand 50문장 → lint top 20% → upsert(revised) → 검증

### 3) 품질 기준 (AC)
- **지연**: L2=2초, L3=1초 (랜덤 on)
- **Forms 비율** 준수 (aff/neg/wh_q per spec)
- **Bank 크기**: 50문장/스테이지
- **QA 범위**: 의심문장 20%만 리포트

---

## 📦 Batch #2 스테이지 목록

| ID | Title | Focus |
|---|---|---|
| Lv2-P1-S02 | 빈도부사+현재진행 | 습관/불만 강조 |
| Lv2-P2-S10 | 정중 요청·제안 | Could/Would/Let's |
| Lv2-P3-S05 | 수량·가산/불가산 | much/many, some/any |
| Lv2-P4-S12 | Wh-의문 혼합 | 과거/빈도/수량 |
| Lv3-P1-S03 | 의견·동의·부분동의 | I see your point, but… |
| Lv3-P2-S07 | 현재완료 진행 | for/since, recently |

**실행**: 기존 파이프라인 동일 적용 → /curriculum-test 수치 확인