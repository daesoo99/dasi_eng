# Batch #3 후보 스테이지 (12개)

## 🎯 선정 기준
- **우선순위**: 스피킹 빈도 높은 패턴
- **균형**: L2/L3 비율 유지 (L2:8, L3:4)
- **연계성**: 기존 Batch #1,#2와 자연스러운 연결

## 📋 Batch #3 추천 스테이지

### **Level 2 (8개)**
1. **Lv2-P1-S03**: 빈도부사 + 과거시제
2. **Lv2-P2-S11**: 조동사 + 과거 (could/would)
3. **Lv2-P3-S06**: 지시어 + 위치 표현
4. **Lv2-P4-S13**: 간접의문문 기초
5. **Lv2-P5-S15**: 비교급/최상급 기초 ⭐
6. **Lv2-P5-S16**: 비교 표현 확장 ⭐
7. **Lv2-P6-S19**: 약속·예약 표현 ⭐
8. **Lv2-P6-S20**: 시간 약속 변경 ⭐

### **Level 3 (4개)**
1. **Lv3-P3-S10**: 수동태 기초 ⭐
2. **Lv3-P4-S14**: 조건문 0형 ⭐
3. **Lv3-P4-S15**: 조건문 1형 ⭐
4. **Lv3-P5-S18**: 이유·결과 (because/so) ⭐

## 🔧 골드 스펙 템플릿 준비

### **표준 구조**
```json
{
  "id": "Lv?-P?-S??",
  "title": "패턴명",
  "intent": "의도 설명",
  "focus": ["문법태그1", "문법태그2"],
  "lexset": ["어휘목록"],
  "traps": ["흔한오류1", "흔한오류2"],
  "bankMin": 50,
  "forms": {"aff": 0.6, "neg": 0.2, "wh_q": 0.2},
  "variants": ["변형축"],
  "engine": {"randomPick": [5,8], "retryWeighted": true},
  "seeds": [{"kr": "한국어", "en": "English"}] // 10-12개
}
```

### **Ready for 골드 스펙 작성** ✅
- forms 분포: aff60/neg20/wh_q20 기본
- seeds: 10-12 문장 쌍
- traps: 문법 함정 3-4개
- engine: randomPick, retryWeighted 설정