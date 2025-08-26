# 영어 학습 시스템 설계 문서

## 1. 프로젝트 개요
- **목표**: 한국인을 위한 체계적인 영어 학습 시스템 구축
- **특징**: 한국인이 헷갈리는 영어 표현에 특화된 맞춤형 훈련
- **구조**: 레벨별 단계적 학습 + 스테이지별 세분화

## 2. 어휘 데이터베이스
### 2.1 단어 리스트
- **총 단어 수**: 20,000개 (GitHub Gist에서 확보)
- **파일**: `vocabulary_20000.json`
- **형태**: JSON 배열 형태로 저장
- **특징**: 중복 제거, 알파벳 순서 정렬

### 2.2 기존 작업물
- `vocabulary_clean.json`: 2,364개 단어 (빈도순 정렬)
- `vocabulary_10000.json`: 3,000개 단어 (기본 작업용)

## 3. 학습 시스템 구조

### 3.1 레벨 시스템 (1-10 레벨)
#### 레벨 1-5: 패턴 반복 훈련
- **학습 방식**: 한국어 듣고 → 영어로 즉석 변환
- **시간 제한**: 3초 → 2초 → 1초 (단계적 단축)
- **목표**: 기본 문법 패턴 완전 자동화

#### 레벨 6-8: 모방 학습 (Imitation Learning)
- **학습 방식**: 원어민 대화를 듣고 자신의 말로 재구성
- **3단계 접근**: Easy → Medium → Hard
- **목표**: 자연스러운 회화 실력 향상

#### 레벨 9-10: 고급 담화 (별도 학습법 필요)
- **목표**: 학술적 프레젠테이션, 복잡한 논리 전개
- **기준**: 스티브 잡스 연설 수준 (14분 유창한 발표)

### 3.2 스테이지 시스템
#### 초반 집중형 구조 (추천)
- **레벨 1-3**: 각 10개 스테이지 (30개) - 기초 다지기
- **레벨 4-7**: 각 8개 스테이지 (32개) - 중급 학습  
- **레벨 8-10**: 각 6개 스테이지 (18개) - 고급 마스터
- **총계**: 80개 스테이지

## 4. 한국인 헷갈림 패턴 목록

### 4.1 기본 패턴 (레벨 1-2)
```
1. 기본 시제: I go / I don't go / Do you go?
2. 진행형: I'm going / I'm not going / Are you going?
3. 과거형: I went / I didn't go / Did you go?
4. 미래형: I will go / I won't go / Will you go?
5. 소유형: I have / I don't have / Do you have?
```

### 4.2 의사표현 패턴 (레벨 3-4)
```
6. 의무형: I have to / I don't have to / Do you have to?
7. 필요형: I need to / I don't need to / Do you need to?
8. 희망형: I want to / I don't want to / Do you want to?
9. 능력형: I can / I can't / Can you?
10. 미래형2: I'm gonna / I'm not gonna / Are you gonna?
11. 시도형: I'm trying to / I'm not trying to / Are you trying to?
```

### 4.3 복합표현 패턴 (레벨 5-6)
```
12. 동사 구분: I like vs I like to vs I like -ing
13. 지식 표현: I know vs I know how to vs I know about
14. 사고 표현: I think vs I think about vs I think of
15. 시각 표현: I look vs I look at vs I look for vs I look like
16. 3인칭 단수: he goes/does/has (s 규칙)
```

### 4.4 전치사/관사 패턴 (레벨 7-8)
```
17. 전치사: arrive in/at, listen to, wait for, depend on
18. 관사 구분: go to school vs go to the school
19. 관사 구분: play piano vs play the piano
20. 위치 표현: There is vs It is vs This is
21. 차이 표현: different from (not different than)
```

### 4.5 고급 시제 패턴 (레벨 9-10)
```
22. 시간 표현: since vs for (I've been here since/for)
23. 시간 부사: already vs yet vs still
24. 습관 표현: used to vs be used to vs get used to
25. 의문문: What vs How (What time vs How long)
26. 한정사: Some vs Any (긍정문/부정문/의문문)
27. 단수/복수: advice/information (불가산명사 규칙)
```

## 5. 레벨별 실력 기준점

### 5.1 텍스트 이해도 기준
- **레벨 6**: 애니메이션 대화 수준 (일상적, 감정적 회화)
- **레벨 7**: 교육적 프레젠테이션 (체계적 설명, 학습법 소개)
- **레벨 8**: 문학적 스토리텔링 (철학적 성찰, 은유적 표현)
- **레벨 10**: 학술적 연설 (스티브 잡스 연설 수준)

### 5.2 학습 방식별 적용 범위
- **패턴 반복 훈련**: 레벨 1-5 (문법 자동화)
- **모방 학습**: 레벨 6-8 (자연스러운 회화)
- **고급 담화**: 레벨 9-10 (별도 학습법 필요)

## 6. 스테이지별 학습 구조

### 6.1 각 스테이지 구성요소
```
📚 스테이지 기본 구조
├── 새 단어 학습 (10-20개)
├── 패턴 훈련 (3단계: 3초→2초→1초)
├── 혼합 연습 (이전 패턴들과 조합)
└── 종합 테스트
```

### 6.2 패턴 훈련 방식
1. **1단계 (3초)**: 기본 패턴 익히기
   - 긍정문 → 부정문 → 의문문 순환
   
2. **2단계 (2초)**: 응용 연습
   - 구체적 상황 적용 (학교, 친구, 가족 등)
   
3. **3단계 (1초)**: 즉석 반응
   - 랜덤 조합으로 완전 자동화

## 7. 모방 학습법 (레벨 6-8)

### 7.1 Easy-to-Hard Imitation
1. **Easy**: 짧은 구문/문장 모방
2. **Medium**: 긴 문장/문단 모방
3. **Hard**: 전체 연설을 자신의 말로 재구성

### 7.2 학습 효과
- 올바른 문장 구조 학습
- 자연스러운 표현 패턴 습득
- 암시적 문법 학습 (무의식적 체화)
- 실제 의사소통 능력 향상

## 8. 향후 개발 방향

### 8.1 패턴 데이터베이스 확장
- 추가 헷갈림 패턴 수집 및 분류
- 레벨별 세분화 작업
- 스테이지별 패턴 배치

### 8.2 학습 시스템 구현
- 음성 인식 및 발음 평가
- 실시간 피드백 시스템
- 진도 관리 및 통계 기능

### 8.3 콘텐츠 개발
- 레벨별 예시 문장 작성
- 상황별 대화 시나리오 구성
- 모방 학습용 오디오 콘텐츠 제작

## 9. 파일 목록
- `vocabulary_20000.json`: 2만개 영단어 데이터베이스
- `vocabulary_clean.json`: 정리된 2,364개 단어
- `vocabulary_10000.json`: 작업용 3,000개 단어
- `english_learning_system_design.md`: 이 설계 문서

---

**작성일**: 2025-08-12  
**버전**: 1.0  
**상태**: 초기 설계 완료, 구현 준비 단계