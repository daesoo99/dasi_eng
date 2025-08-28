# 🚀 DASI 커리큘럼 관리 시스템 빠른 시작

## 📦 설치 및 설정

```bash
# 1. 의존성 설치
npm ci

# 2. Git 훅 활성화 (선택사항)
npm run prepare

# 3. 시스템 테스트
npm run test:system
```

## ⚡ 5분 만에 시작하기

### 1️⃣ **현재 상태 확인**
```bash
npm run migrate:status
```

### 2️⃣ **전체 데이터 검증**
```bash
npm run validate:all
```

### 3️⃣ **안전한 드라이런 테스트**
```bash
npm run migrate:all:dry
```

### 4️⃣ **실제 마이그레이션 (필요시)**
```bash
npm run migrate:all
```

---

## 📋 자주 사용하는 명령어

| 명령어 | 설명 | 언제 사용? |
|-------|------|-----------|
| `npm run validate:all` | 전체 검증 | 데이터 품질 확인할 때 |
| `npm run migrate:all:dry` | 드라이런 마이그레이션 | 실제 적용 전 안전성 확인 |
| `npm run migrate:status` | 상태 확인 | 진행 상황 점검할 때 |
| `npm run migrate:resume` | 재개 | 중단된 작업 이어서 할 때 |
| `npm run migrate:unlock` | 락 해제 | 시스템이 멈춰있을 때 |

---

## 🆘 문제 상황별 해결책

### 🔒 "다른 작업이 진행 중"이라고 나올 때
```bash
npm run migrate:unlock
```

### ❌ 검증 오류가 발생할 때
```bash
# 1. 에러 로그 확인
npm run logs

# 2. 상세 오류 확인
cat docs/logs/$(date +%F)-validation-errors.jsonl | tail -5
```

### 🔄 중간에 작업이 중단되었을 때
```bash
npm run migrate:resume
```

---

## 💡 팁

- **안전제일**: 항상 `--dry-run`부터 시작
- **로그 확인**: 문제가 생기면 `npm run logs` 먼저 실행  
- **상태 파악**: `npm run migrate:status`로 현재 상황 파악
- **정리**: 작업 완료 후 `npm run clean`으로 임시 파일 정리

---

더 자세한 내용은 [시스템 개요](./SYSTEM_OVERVIEW.md)를 참고하세요.