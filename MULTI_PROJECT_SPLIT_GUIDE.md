# Multi-Project Split Guide

## 🎯 Overview

DaSi English 프로젝트를 단일 모노레포에서 독립적인 멀티 프로젝트로 분리합니다.

### Before vs After
```
Before: DaSi_eng/ (단일 저장소)
├── backend/
├── web_app/  
├── flutter_app/
└── docs/

After: 독립 프로젝트들
├── dasi-backend/     (Node.js API)
├── dasi-web/         (React App)
├── dasi-mobile/      (Flutter App)
└── dasi-docs/        (Shared Docs)
```

## 🚀 Quick Start

### Automated Split (추천)
```bash
# 1. DaSi_eng 디렉토리에서 실행
cd DaSi_eng
bash scripts/split-all-projects.sh

# 2. 결과 확인
cd ../dasi-projects
ls -la
```

### Manual Split
각 프로젝트를 개별적으로 분리:
```bash
bash scripts/split-backend.sh
bash scripts/split-web.sh  
bash scripts/split-flutter.sh
```

## 📂 새로운 프로젝트 구조

### dasi-backend/ (Node.js API)
```
dasi-backend/
├── src/
│   ├── server.ts         (TypeScript 메인 서버)
│   ├── config/           (모듈화된 설정)
│   ├── routes/           (API 라우터)
│   └── services/         (비즈니스 로직)
├── package.json          (독립 의존성)
└── tsconfig.json         (TypeScript 설정)
```

**실행:**
```bash
cd dasi-backend
npm install
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
```

### dasi-web/ (React Web App)  
```
dasi-web/
├── src/
│   ├── components/       (React 컴포넌트)
│   ├── services/         (API 클라이언트)
│   └── utils/           (유틸리티)
├── public/              (정적 파일)
├── vite.config.ts       (Vite 설정)
└── package.json         (독립 의존성)
```

**실행:**
```bash
cd dasi-web
npm install  
npm run dev     # 개발 서버 (localhost:5173)
npm run build   # 프로덕션 빌드
```

### dasi-mobile/ (Flutter Mobile)
```
dasi-mobile/
├── lib/
│   ├── main.dart        (Flutter 앱 엔트리)
│   ├── screens/         (화면 위젯)
│   └── services/        (API 통신)
├── android/             (안드로이드 설정)
├── ios/                 (iOS 설정)
└── pubspec.yaml         (Flutter 의존성)
```

**실행:**
```bash
cd dasi-mobile
flutter pub get
flutter run     # 디바이스에서 실행
```

### dasi-docs/ (Shared Documentation)
```
dasi-docs/
├── API.md                    (API 문서)
├── ARCHITECTURE.md           (아키텍처 설계)
├── FIREBASE_STORAGE_MIGRATION.md
└── deployment/               (배포 가이드)
```

## 🔗 프로젝트 간 연결

### API 엔드포인트 설정
```typescript
// dasi-web/src/config/api.ts
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8081';

// dasi-mobile/lib/config/api.dart  
const String apiBaseUrl = 'http://localhost:8081';
```

### 공통 타입 정의 (선택사항)
```bash
# 공통 타입 패키지 생성
npm create @types/dasi-common
```

## 📊 분리 효과

| 구분 | Before (모노레포) | After (멀티 프로젝트) | 개선 효과 |
|-----|-----------------|---------------------|----------|
| **빌드 시간** | 전체 빌드 필요 | 개별 빌드 | ⬇️ 50-70% |
| **배포 독립성** | 전체 배포 | 개별 배포 | ✅ 완전 분리 |
| **팀 협업** | 충돌 위험 | 독립 작업 | ✅ 개선 |
| **CI/CD** | 단일 파이프라인 | 개별 파이프라인 | ⬇️ 복잡도 감소 |
| **의존성 관리** | 혼재 | 명확한 분리 | ✅ 개선 |

## 🛠️ 개발 워크플로우

### 로컬 개발
```bash
# 터미널 1: 백엔드
cd dasi-backend && npm run dev

# 터미널 2: 웹앱  
cd dasi-web && npm run dev

# 터미널 3: 모바일 (선택)
cd dasi-mobile && flutter run
```

### 배포 전략
```yaml
# 각 프로젝트별 독립 CI/CD
# .github/workflows/ in each repo:

dasi-backend:  deploy to Railway/Heroku
dasi-web:      deploy to Vercel/Netlify  
dasi-mobile:   deploy to App Store/Play Store
dasi-docs:     deploy to GitHub Pages
```

## ⚠️ 주의사항

### 1. 공유 코드 관리
- **문제**: 중복 코드 발생 가능
- **해결**: 공통 유틸리티는 npm 패키지로 분리

### 2. API 버전 관리
- **문제**: 백엔드/프론트엔드 버전 불일치
- **해결**: API 버전 네이밍 + 문서화

### 3. 개발 환경 설정
- **문제**: 각 프로젝트별 환경 설정 필요
- **해결**: Docker Compose로 통합 개발환경

## 🚨 롤백 계획

문제 발생 시 원래 모노레포로 복원:
```bash
# 백업에서 복원
git checkout main
# 또는 개별 프로젝트를 다시 통합
```

## ✅ 체크리스트

**분리 전:**
- [ ] 현재 프로젝트 백업 완료
- [ ] 의존성 목록 확인
- [ ] API 엔드포인트 정리

**분리 후:**
- [ ] 각 프로젝트 독립 실행 확인
- [ ] API 통신 정상 동작 확인  
- [ ] 빌드/배포 파이프라인 설정
- [ ] 문서 업데이트 완료

---
**Migration Date**: 2025-08-30
**Status**: Ready for execution  
**Estimated Time**: 2-3 hours