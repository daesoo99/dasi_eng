# DaSi 영어학습 플랫폼 - 긴급 보안 및 UX 개선 사항

## 📋 프로젝트 개요

**프로젝트**: DaSi 영어학습 플랫폼 (React + Node.js + Firebase)
**현재 브랜치**: `feature/v2.2.0-restructure`
**발견 경위**: 2025-08-28 보안 및 UX 분석을 통해 다음 사항들이 확인됨

### 프로젝트 구조
```
DaSi_eng/
├── web_app/           # React 프론트엔드 (Vite, Tailwind CSS)
├── backend/           # Node.js Express 서버
├── config/            # Firebase 설정
└── docs/             # 문서
```

### 실행 방법
```bash
# 프론트엔드 (포트 3500)
cd web_app && npm run dev

# 백엔드 (포트 8081)  
cd backend && npm start
```

---

## 🔴 CRITICAL 보안 이슈 (즉시 수정 필요)

> ⚠️ **중요**: 이러한 보안 이슈들로 인해 현재 프로덕션 배포는 금지됨

### 1. Firestore 보안 규칙
**문제**: 데이터베이스가 완전히 열려있어 누구나 모든 데이터를 읽고 쓸 수 있음
**영향**: 사용자 개인정보 유출, 데이터 조작, 서비스 악용 가능  
**현재 상태**: 모든 사용자에게 전체 데이터베이스 읽기/쓰기 허용
**파일 위치**: `config/firestore.rules`
**우선순위**: 🔴 긴급 (프로덕션 배포 금지)

```javascript
// CRITICAL: 현재 규칙
match /{document=**} {
  allow read, write: if true;  // ⚠️ 완전 오픈
}

// 필수 수정 규칙
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /curriculum/{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /progress/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2. Firebase 서비스 계정 키 하드코딩  
**문제**: Firebase 관리자 권한 키가 코드에 직접 포함되어 Git 저장소에 노출됨
**영향**: 전체 Firebase 프로젝트 관리자 권한 탈취 가능, 데이터베이스 완전 제어권 상실
**현재 상태**: 서비스 계정 키가 코드에 하드코딩됨
**파일 위치**: `backend/src/config/firebase.js`  
**우선순위**: 🔴 긴급

```javascript
// CRITICAL: 하드코딩된 키
serviceAccount = require('./firebaseServiceAccountKey.json');

// 필수 수정: 환경변수 사용
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
```

### 3. 보안 미들웨어 누락
**문제**: Express 서버에 기본적인 보안 헤더, 요청 제한, CORS 설정이 없음
**영향**: XSS, CSRF 공격 취약, DoS 공격 가능, 크로스 오리진 요청 악용  
**현재 상태**: helmet, rate-limit, CORS 보안 설정 누락
**파일 위치**: `backend/src/server.js`
**우선순위**: 🔴 긴급

**수정 방법**: 다음 명령어로 패키지 설치 후 코드 적용

**필수 설치 패키지**:
```bash
npm install helmet express-rate-limit express-validator
```

**필수 구현**:
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

app.use(helmet());
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ["http://localhost:3500"],
  credentials: true 
}));

const limiter = rateLimit({ 
  windowMs: 60_000, 
  limit: 120,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);
```

---

## 🟡 HIGH PRIORITY UX 개선 사항

> 📝 **배경**: 2025-08-28 React UI 성능 및 접근성 분석을 통해 다음 개선점들이 확인됨

### 4. ErrorBoundary 개선 필요
**문제**: React 에러 발생 시 사용자에게 복구 방법을 제공하지 않음  
**영향**: 에러 발생 후 페이지 새로고침 외에는 복구 불가능, 사용자 경험 저하
**현재 상태**: 기본적인 에러 캐치만 구현
**파일 위치**: `web_app/src/components/ErrorBoundary.tsx`
**우선순위**: 🟡 높음

```typescript
// 추가 필요: resetKeys 기반 복구 메커니즘
componentDidUpdate(prevProps: ErrorBoundaryProps) {
  const { resetKeys } = this.props;
  if (this.state.hasError && resetKeys !== prevProps.resetKeys) {
    this.setState({ hasError: false, error: undefined });
  }
}
```

### 5. 포커스 인디케이터 누락
**문제**: 키보드로 탭 이동 시 현재 위치를 시각적으로 표시하지 않음
**영향**: 시각장애인 및 키보드 사용자의 접근성 저해, WCAG AA 기준 미달
**현재 상태**: 키보드 네비게이션 시각적 표시 없음
**파일 위치**: `web_app/src/index.css`
**우선순위**: 🟡 높음 (접근성 필수 요소)

```css
/* 필수 추가 */
.focus-visible:focus-visible,
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-contrast: high) {
  .focus-visible:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

### 6. 모바일 반응형 브레이크포인트 최적화  
**문제**: Tailwind CSS 브레이크포인트가 일관성 없이 설정되어 모바일 UX 불일치
**영향**: 다양한 화면 크기에서 레이아웃 깨짐, 터치 조작 어려움
**현재 상태**: 일관성 없는 브레이크포인트
**파일 위치**: `web_app/tailwind.config.js`  
**우선순위**: 🟡 높음

```javascript
// 권장 브레이크포인트
theme: {
  screens: {
    'xs': '480px',
    'sm': '640px',
    'md': '768px', 
    'lg': '1024px',
    'xl': '1280px'
  }
}
```

---

## 📋 구현 로드맵

> 💡 **실행 전 필수 확인사항**
> - 현재 브랜치: `feature/v2.2.0-restructure`  
> - 프로젝트 루트: `C:\Users\kimdaesoo\source\claude\DaSi_eng`
> - 백업 권장: `git checkout -b backup-before-security-fixes`

### Phase 1: 긴급 보안 패치 (1-2일) 🔴
**즉시 실행 필요 - 프로덕션 배포 전 필수**

1. **Firestore 규칙 수정 및 배포**
   ```bash
   # 파일 수정: config/firestore.rules  
   firebase deploy --only firestore:rules
   ```

2. **환경변수로 Firebase 키 이전**
   ```bash
   # .env 파일 생성 후 backend/src/config/firebase.js 수정
   cp .env.example .env  # 환경변수 템플릿 복사 후 실제 값 입력
   ```

3. **기본 보안 미들웨어 설치**
   ```bash
   cd backend
   npm install helmet express-rate-limit express-validator
   # backend/src/server.js에 미들웨어 추가
   ```

### Phase 2: 핵심 UX 개선 (1주) 🟡  
**사용자 경험 향상을 위한 접근성 및 반응형 개선**

1. **ErrorBoundary 복구 메커니즘 추가**
   - 파일 수정: `web_app/src/components/ErrorBoundary.tsx`
   - resetKeys prop 기반 자동 복구 기능 구현

2. **포커스 관리 시스템 구현**  
   - 파일 수정: `web_app/src/index.css`
   - 키보드 네비게이션 시각적 표시 추가

3. **터치 타겟 크기 표준화**
   - 모든 버튼 최소 44px 보장 (완료됨)
   - 파일 확인: `web_app/src/components/SpeechRecorder.tsx`

### Phase 3: 고도화 (2-3주) 🔵
**장기적 품질 개선 및 모니터링**

1. **종합적인 접근성 테스트 및 개선**
   - Lighthouse, axe-core 도구 활용
   - WCAG AA 기준 100% 준수

2. **성능 최적화 (코드 분할, 지연 로딩)**  
   - React.lazy() 활용한 라우트 분할
   - 번들 크기 최적화

3. **보안 모니터링 및 로깅 시스템**
   - pino 로거 PII 마스킹 구현
   - 보안 이벤트 로깅

---

## 🧪 테스트 전략

> 🔧 **테스트 실행 위치**: 프로젝트 루트 디렉터리에서 실행

### 자동화된 보안 테스트
```bash
# 현재 위치 확인
pwd  # C:\Users\kimdaesoo\source\claude\DaSi_eng 여야 함

# Firestore 규칙 테스트 (Firebase CLI 필요)
firebase emulators:exec --only firestore "npm run test:firestore-rules"

# 접근성 테스트 (프론트엔드 실행 중이어야 함)
cd web_app
npm run dev  # localhost:3500에서 실행
# 새 터미널에서:
npx lighthouse http://localhost:3500 --only=accessibility --chrome-flags="--headless"
npm run test:axe  # 사전에 스크립트 추가 필요
```

### 수동 테스트 체크리스트
- [ ] 키보드만으로 전체 앱 네비게이션 가능
- [ ] 스크린 리더로 핵심 기능 사용 가능
- [ ] 모바일에서 터치 타겟 44px 이상 확보
- [ ] 색상 대비 4.5:1 이상 유지

## 📊 성공 지표

### 보안
- Firestore 규칙: 최소 권한 원칙 적용 ✅
- 환경변수: 모든 민감 정보 환경변수 처리 ✅
- 보안 헤더: helmet 적용, rate limiting 활성화 ✅

### 접근성
- Lighthouse 접근성 점수: ≥ 90점
- axe 위반 사항: 0개 (critical)
- 키보드 네비게이션: 100% 지원

### 모바일 UX
- 터치 실패율: 체감상 감소
- 주요 화면 2개: 레이아웃 깨짐 없음
- 반응형 테스트: 320px~1920px 범위 정상 동작

---

---

## 📝 담당자 및 일정

### 리소스 예상 공수
- **보안 패치** (Phase 1): 백엔드 개발자 16시간 (이번 주 완료 필수)
- **UX 개선** (Phase 2): 프론트엔드 개발자 40시간 (2-3주)  
- **테스트 및 검증**: QA 팀 16시간 (단계별 진행)

### 마일스톤
- **2025-08-28**: 보안 이슈 발견 및 문서화 완료
- **2025-08-30**: Phase 1 보안 패치 완료 목표 
- **2025-09-04**: 다음 리뷰 일정 (Phase 2 진행상황 점검)
- **2025-09-18**: 전체 개선사항 완료 목표

### 연락처 및 이슈 리포팅
- **긴급 보안 이슈**: 즉시 팀 리더에게 보고
- **진행상황 업데이트**: 이 문서의 체크박스 업데이트
- **문서 위치**: `docs/migration/CRITICAL_SECURITY_UX_ISSUES.md`

---

**최초 작성**: 2025-08-28  
**마지막 업데이트**: 2025-08-28  
**다음 리뷰**: 2025-09-04