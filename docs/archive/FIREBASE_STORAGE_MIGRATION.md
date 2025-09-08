# Firebase Storage Data Migration Guide

## 📊 Overview

패턴 데이터를 로컬 파일 시스템에서 Firebase Storage로 이전하여 저장소 크기를 87% 감소시킵니다.

### Before vs After
```
Before: 3.1MB local files (466 JSON files)
After:  Firebase Storage + fallback (87% repo size reduction)
```

## 🚀 Migration Steps

### 1. Firebase Storage 업로드

```bash
# 업로드 스크립트 실행
cd DaSi_eng
node scripts/upload-patterns-to-storage.js
```

**예상 결과:**
- 466개 JSON 파일이 Firebase Storage에 업로드됨
- 공개 읽기 권한 자동 설정
- 업로드 성공/실패 로그 출력

### 2. 환경변수 설정

```bash
# web_app/.env.local 생성
cp web_app/.env.example web_app/.env.local

# 환경변수 수정
VITE_FIREBASE_STORAGE_URL=https://storage.googleapis.com/your-actual-bucket-name
```

### 3. 기능 검증

```bash
# 프론트엔드 실행
cd web_app
npm run dev

# 개발자 콘솔에서 확인:
# [PatternDataLoader] Storage URL: https://storage.googleapis.com/...
# [DEBUG] 🔍 Loading from Storage: ...
# [DEBUG] ✅ Storage load success: Lv1-P1-S01 (50 sentences)
```

### 4. 로컬 파일 제거

```bash
# ⚠️ 주의: 업로드와 검증이 완료된 후에만 실행
git rm -r web_app/public/patterns/banks/
echo "web_app/public/patterns/banks/" >> .gitignore
git add .
git commit -m "feat: migrate patterns data to Firebase Storage"
```

## 🔧 Technical Details

### 새로운 데이터 플로우
```typescript
1. patternDataLoader.loadBankData()
   ├─ 캐시 확인 (10분 TTL)
   ├─ Firebase Storage 로드 (주)
   └─ 로컬 파일 fallback (마이그레이션 기간)

2. SentenceService.loadBankData()
   └─ patternDataLoader 호출
```

### 캐싱 전략
- **로컬 캐시**: 10분 TTL (이전 5분에서 증가)
- **브라우저 캐시**: HTTP 캐시 헤더 활용
- **CDN 캐시**: Firebase Storage 자동 CDN

### 에러 핸들링
- Storage 실패 시 로컬 파일로 fallback
- 네트워크 오류 시 캐시 활용
- 로드 시간 로깅으로 성능 모니터링

## 📊 Expected Benefits

| 구분 | Before | After | 개선 |
|-----|--------|-------|------|
| 저장소 크기 | ~15MB | ~2MB | **87% ↓** |
| git clone | 30초 | 5초 | **83% ↓** |
| 첫 로딩 속도 | 즉시 | 100-300ms | 네트워크 지연 |
| 캐시 후 속도 | 즉시 | 즉시 | 동일 |
| 데이터 업데이트 | 코드 배포 | 파일 교체 | **배포 분리** |

## 🛡️ Rollback Plan

문제 발생 시 되돌리기:

```bash
# 1. 환경변수 무효화
VITE_USE_FIREBASE_STORAGE=false

# 2. Git에서 패턴 파일 복원
git checkout backup-before-cleanup -- web_app/public/patterns/banks/

# 3. 기존 로컬 로딩 방식으로 복원
```

## ✅ Verification Checklist

- [ ] 업로드 스크립트 성공 실행 (466개 파일)
- [ ] 환경변수 올바르게 설정
- [ ] 개발 서버에서 데이터 로딩 확인
- [ ] 콘솔에서 "Storage load success" 메시지 확인
- [ ] 기존 기능 정상 동작 확인
- [ ] 성능 저하 없는지 확인

## 🚨 Known Issues

1. **초기 로딩 지연**: 첫 요청 시 100-300ms 추가 지연
   - **해결**: 캐시 warming, 프리로딩 구현 예정

2. **네트워크 의존성**: 오프라인 시 작동 불가
   - **해결**: Service Worker 캐싱 구현 예정

3. **Firebase 요금**: Storage 및 대역폭 비용
   - **추정**: 월 $1-5 (무료 할당량 내)

---
**Migration Date**: 2025-08-30
**Status**: Ready for execution
**Contact**: Development Team