# 📨 Team/CLI 요청사항

## ✅ Batch #1 확인 완료 → Batch #2 즉시 실행

### 🚀 **Batch #2 실행 파이프라인**
```bash
# 파일: batch_specs_L2_L3_batch2.json (루트 위치)
분할 → 확장(50) → 린트(top20%) → 업서트(revised) → /curriculum-test 카운트 확인
```

### 🔧 **자동수정 우선 적용**
```
1. 빈도부사 위치 규칙 (일반동사 앞/be동사 뒤)
2. 조동사+동사원형 구조 (can go, not can to go)  
3. 관사 휴리스틱 (가산단수 a/an, 특정 the, 불가산 무관사)
```
**목표**: 선적용 후 재린트 → ≤15건

---

## 📦 다음 준비 (속도↑, 품질 유지)

### 1) **L2/L3 Stage ID Manifest 덤프**
```bash
# 요청 경로: curricula/{2,3}/versions/revised
# 필드: level, phase, stageId, title, classification
# 산출: docs/L23_STAGE_MANIFEST.csv
```

### 2) **Batch #3 확대 (12 스테이지)**
- **대상**: manifest 기반 bank 미구축 스테이지 12개
- **프로필**: forms(aff60/neg20/wh_q20), seeds 10-12, bank 50
- **품질**: 자동수정 → 의심 20%만 QA

### 3) **진행 리포트 규격**
```
Banks 진행률: L2 ?/22, L3 ?/26
문장수 누계: ? / 2400  
린트 플래그: 자동수정 전/후 ?건
```

---

## 🎯 **속도 전략 (Go Fast, Don't Break Quality)**

✅ **병렬화**: 6→12 스테이지 배치 확대  
✅ **자동수정 선제**: 70-80% 규칙 제거  
✅ **QA 집중**: 상위 20%만 사람 확인  
✅ **가드레일**: forms 분포, bank=50, 통과율≥80% 강제