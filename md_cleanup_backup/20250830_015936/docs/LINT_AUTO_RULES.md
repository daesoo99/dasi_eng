# 린트 자동수정 규칙

## 🔧 우선순위 규칙 (Batch #1 기준)

### 1) 빈도부사 위치 (18건)
```
✅ 일반동사 앞: I often go, She usually works
✅ be동사 뒤: I am often late, He is always busy  
✅ 조동사 뒤: I can often help, We will usually finish

❌ 잘못된 위치: I go often, She late is usually
```

### 2) 조동사 구조 (12건)
```
✅ 조동사 + 동사원형: can go, could help, will finish
❌ 조동사 + to: can to go, could to help, will to finish
❌ 조동사 + 과거형: can went, could helped
```

### 3) 관사 휴리스틱 (15건)
```
✅ 가산명사 단수: a book, an apple, a car
✅ 특정/최상급: the book, the best, the first
✅ 불가산명사: water, coffee, advice (무관사)
✅ 복수 일반: books, apples, cars (무관사)

❌ 누락: I need book → I need a book
❌ 과다: I drink a coffee → I drink coffee
```

## 🚀 자동수정 적용 순서

1. **패턴 매칭** → 규칙 위반 문장 식별
2. **구조 분석** → 문법 요소 파싱  
3. **자동 교정** → 규칙 적용하여 수정
4. **재린트** → 플래그 수 감소 확인

**목표**: 58개 → 15개 이하로 감소 (자동수정으로 75% 해결)