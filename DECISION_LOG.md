# DASI English - Decision Log

**📋 Purpose**: AI와 인간 개발자의 중요한 아키텍처 및 설계 결정 기록  
**🎯 Target**: 바이브코딩 세션 간 결정 맥락 유지  
**📅 Last Updated**: 2025-01-12

---

## 🧠 2025-01-12: SRS 시스템 통합 완료

### 기존 분산 SRS → 통합 SRS 아키텍처 결정
**결정**: `services/srs/SRSEngine.ts`를 단일 진실 원본으로 확정
**맥락**: 49개 파일에서 분산된 SRS 구현으로 인한 중복 및 일관성 문제
**대안 검토**: 
- 기존 `useSpacedRepetition.ts` 확장 vs 새 시스템 구축
- 점진적 통합 vs 일괄 교체
**선택 이유**: 
- SuperMemo SM-2+ 알고리즘 표준화
- Ebbinghaus 망각곡선 정확한 구현
- React hooks 패턴 일관성 유지
**결과**: `useSRSEngine.ts` 메인 훅, 레거시 시스템과 병존

### PatternTrainingPageV2 → V3 대규모 리팩토링
**결정**: 1,042줄 → 268줄 (74% 감소) 모듈화
**맥락**: 단일 파일에 UI/로직/상태 혼재로 유지보수 어려움
**구현**:
- `usePatternData.ts` - 데이터 로직 분리
- `useQuestionProgress.ts` - 진행 상태 관리
- `useCountdownTimer.ts` - 타이머 로직
- `components/srs/` - UI 컴포넌트 모듈화
**결과**: 코드 재사용성 향상, 테스트 가능성 증가

---

## 📝 2025-01-12: 바이브코딩 문제 해결 - 4.1 문서화 전략

### PROJECT_CONTEXT.md 생성 결정
**결정**: AI 에이전트용 SSOT 문서 생성
**맥락**: 새 AI 세션마다 기존 코드만 보고 중복 파일 생성하는 문제
**금지 규칙 명시**:
- `useSpacedRepetitionV2.ts` 생성 금지
- `useSRSEngineV2.ts` 생성 금지
- `PatternTrainingPageV4.tsx` 생성 금지
**결과**: AI 컨텍스트 손실 방지, 코드 중복 차단

### 하이브리드 기록 전략 확정
**결정**: 
1. `claude.local` - 불변 고정값 (포트, 환경설정)
2. `DECISION_LOG.md` - 중요 의사결정 맥락
3. `Git commit` - 액션 요약
4. `archive/README.md` - 특정 보존 맥락

---

## 🏗️ 2025-08-30: 프로젝트 구조 정리

### 레거시 코드 아카이브 결정
**결정**: 기업 표준에 따른 `archive/` 이동
**대상**:
- `functions/` → `archive/firebase_functions/` (Docker 백엔드로 대체)
- `.firebaserc` → `archive/.firebaserc` (`firebase init`으로 재생성 가능)
- `test_html_files/` → `archive/prototypes/` (React 앱으로 대체)

**맥락**: Firebase Functions 미배포, Docker 시스템이 모든 컨테이너화 처리
**대안 검토**: 완전 삭제 vs 아카이브
**선택 이유**: 히스토리 참조용 보관, 필요시 추후 삭제 가능
**결과**: 루트 디렉토리 정리, 활성 vs 비활성 코드 명확한 분리

### 잘못된 루트 .env 파일 삭제
**결정**: 루트 `.env` 파일 완전 삭제
**맥락**: 환경변수 + JavaScript 코드 혼재로 잘못된 형식
**올바른 위치**: `backend/.env`, `web_app/.env`에 적절히 분리
**결과**: 보안 위험 제거, 혼동 방지

---

## 🎯 미래 결정 가이드라인

### 새 기능 추가 시
1. **중복 확인**: `grep`으로 유사 기능 검색 필수
2. **기존 확장 우선**: 새 파일보다 기존 파일 확장 권장
3. **인터페이스 먼저**: 구현 전 타입 정의 확정
4. **플러그인 패턴**: 교체 가능한 구조로 설계

### 아키텍처 변경 시
1. **점진적 마이그레이션**: 레거시 호환성 유지
2. **Feature Flag**: 환경별 다른 구현체 사용
3. **Adapter 패턴**: 기존 인터페이스 보존
4. **버전 관리**: deprecated 경고 → 점진적 제거

### AI 세션 연속성
1. **이 문서 우선 참조**: 모든 중요 결정 기록됨
2. **PROJECT_CONTEXT.md 준수**: 금지 규칙 엄격 적용
3. **Git 히스토리 검토**: 최근 변경사항 파악
4. **기존 패턴 따르기**: 일관성 유지 최우선

---

## 🔄 2025-01-12: 4.2 레거시 SRS 파일 마이그레이션 완료

### 점진적 어댑터 패턴 적용 결정
**결정**: 레거시 SRS 파일들을 즉시 삭제하지 않고 SSOT 어댑터로 변환
**맥락**: 기존 코드 의존성과 호환성 유지 필요
**적용된 파일들**:
- `useSpacedRepetition.ts` → SSOT 어댑터 (NEW 우선, LEGACY 폴백)
- `reviewAlgorithm.ts` → deprecated 마킹 + 마이그레이션 가이드
- `srsService.ts` → deprecated 마킹 + 마이그레이션 가이드

### 어댑터 패턴 구조 확정
**구현**:
```typescript
// NEW: SSOT 시스템 우선 사용
const srsEngine = useSRSEngine({ userId: 'legacy-user' });

// FALLBACK: 기존 시스템 (실패 시만 사용)  
try {
  // SSOT 시스템으로 처리
} catch (error) {
  // 레거시 시스템으로 폴백
}
```

**결과**: 
- 기존 코드 중단 없이 SSOT 시스템 점진적 도입
- 개발자 경고를 통한 자연스러운 마이그레이션 유도
- 양방향 호환성 보장

---

## ⚙️ 2025-01-12: 4.3 백엔드 SRS 통합 완료

### 백엔드 SSOT 확정 결정
**결정**: `smartReviewService.ts`를 백엔드 SRS의 단일 진실 원본으로 확정
**맥락**: 3개의 분산된 백엔드 SRS 서비스 → 1개 SSOT로 통합
**처리된 파일들**:
- ✅ `smartReviewService.ts` → **SSOT 백엔드 서비스** (메인)
- 🔄 `reviewService.ts` → deprecated (기본 CRUD만)
- 🔄 `reviewEngineClient.ts` → deprecated (마이크로서비스 클라이언트)

### 프론트엔드-백엔드 인터페이스 표준화
**결정**: 공통 `SRSInterface.ts` 생성으로 데이터 포맷 통일
**구현 위치**: `backend/src/shared/interfaces/SRSInterface.ts`
**핵심 기능**:
```typescript
// 표준 데이터 구조
SRSReviewCard, SRSReviewSession, SRSStats

// 양방향 변환 어댑터
SRSDataAdapter.frontendToBackend()
SRSDataAdapter.backendToFrontend()
```

### 백엔드 SRS 아키텍처 확정
**최종 구조**:
```
Frontend (React)              Backend (Node.js)
─────────────────            ─────────────────
useSRSEngine.ts       ←→     smartReviewService.ts (SSOT)
     ↓                               ↓
SRSEngine.ts                 SRSInterface.ts (공통 인터페이스)
     ↓                               ↓
LocalStorage          ←→     Firebase Firestore
```

**결과**:
- 프론트엔드-백엔드 SRS 데이터 완전 동기화
- 단일 진실 원본으로 일관성 보장
- 레거시 서비스들의 점진적 마이그레이션 경로 제공

---

## 🎯 2025-09-04: UI/UX 개선 및 망각곡선 기능 완전 활성화

### SRS 망각곡선 기능 UI 활성화
**결정**: 홈화면의 "📊 진도관리" 기능을 비활성 상태에서 완전 활성화
**맥락**: SRS 시스템이 이미 완전히 구현되어 있음에도 불구하고 UI에서 "준비중" 상태로 표시
**구현**:
- `LandingHome.tsx`에서 `showComingSoon('진도관리')` → `handleProgressManagement()` 변경
- "준비중" 태그 → "SRS 활성" 녹색 태그로 변경
- `/progress` 페이지로 정상 연결

### 네비게이션 UX 개선
**결정**: 사용자 편의성 개선을 위한 네비게이션 기능 추가
**구현된 기능들**:
1. **홈 로고 링크화**: App.tsx 헤더의 "DaSi English" → 클릭 시 홈(`/`) 이동
2. **뒤로가기 버튼**: ProgressManagementPage에 명확한 뒤로가기 버튼 추가

**결과**: 
- 사용자가 어디서든 홈으로 쉽게 돌아갈 수 있음
- 진도관리 페이지에서 직관적인 뒤로가기 가능
- SRS 망각곡선 시스템에 대한 사용자 접근성 대폭 향상

### 세션 컨텍스트 유지 시스템 검증
**확인사항**: 4.3 세션 컨텍스트 유지 기능이 완전히 작동함을 확인
- ✅ `CLAUDE.local.md`의 자동 초기화 시스템
- ✅ `PROJECT_CONTEXT.md`의 SSOT 금지 규칙 준수
- ✅ `DECISION_LOG.md` 자동 업데이트 (본 기록 포함)
- ✅ TodoWrite 도구를 통한 작업 추적

---

**🤖 AI 에이전트 참고**: 이 문서의 결정사항들은 프로젝트 전체 아키텍처에 영향을 미치는 중요한 선택들입니다. 새로운 기능 구현 시 반드시 이 맥락을 고려하여 일관성을 유지해 주세요.