# DASI 커리큘럼 데이터 마이그레이션

## 빠른 시작

```bash
npm run migrate:status    # 상태 확인
npm run validate:all      # 데이터 검증
npm run migrate:all:dry   # 드라이런 마이그레이션
```

## 주요 명령어

```bash
npm run migrate:status    # 현재 상태
npm run migrate:resume    # 중단된 작업 재개
npm run migrate:unlock    # 락 해제
npm run logs             # 로그 확인
```

## 문제 해결

1. 상태 확인: `npm run migrate:status`
2. 락 해제: `npm run migrate:unlock`  
3. 로그 확인: `npm run logs`

## 🆘 긴급상황 대응

### 시스템이 응답하지 않을 때
1. `npm run migrate:status` - 현재 상태 확인
2. `npm run migrate:unlock` - 락 해제 시도
3. `npm run logs` - 최근 로그 확인
4. 그래도 안 되면 `npm run migrate:reset` (⚠️ 주의: 진행 상황 초기화)

### 검증 오류가 발생할 때
1. `docs/logs/YYYY-MM-DD-validation-errors.jsonl` 확인
2. JSON 오류 로그에서 정확한 원인 파악
3. 데이터 수정 후 `npm run validate:all` 재실행

### 마이그레이션이 중단되었을 때
1. `npm run migrate:status` - 어디까지 완료되었는지 확인
2. `npm run migrate:resume` - 중단된 지점부터 재개
3. 계속 실패하면 해당 파일만 `npm run migrate:single --file <path>`

---

**💡 Claude 세션이 중단되었다면**: 
새로운 세션에서 "이 프로젝트 마이그레이션 작업 중 끊어졌어. 상태 확인하고 이어서 해줘"라고 말하면 됩니다.