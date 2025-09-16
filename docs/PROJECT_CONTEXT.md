# DASI English - Project Context & Development Guidelines

**📋 Purpose**: 이 문서는 AI와의 바이브코딩(Vibe-coding) 시 컨텍스트 유지를 위한 **단일한 진실의 원본(SSOT)**입니다.  
**🎯 Target**: Claude, GPT 등 모든 AI 에이전트가 새 세션 시작 시 반드시 참조해야 하는 프로젝트 가이드  
**📅 Last Updated**: 2025-09-16 (Plugin Architecture 완전 마이그레이션 완료)

---

## 🏗️ 1. 프로젝트 구조 개요

DASI English는 AI 기반 영어 학습 플랫폼으로 모노레포 구조를 채택합니다:

```
DaSi_eng/
├── web_app/          # React/TypeScript 프론트엔드 (포트: 3500)
├── backend/          # Node.js/Express API 서버 (포트: 8081)
├── mobile_app/       # Flutter 모바일 앱 (개발 예정)
├── docs/            # 프로젝트 문서화
└── data/            # 학습 데이터셋
```

### 📱 Frontend (web_app/) 핵심 모듈

| 모듈 카테고리 | 위치 | 책임 | 상태 |
|-------------|------|-----|------|
| **🧠 SRS 시스템** | `src/services/srs/` | 간격반복학습 엔진 | ✅ **메인 시스템** |
| **🔧 SRS 훅** | `src/hooks/useSRSEngine.ts` | React SRS 통합 | ✅ **메인 훅** |
| **🎯 패턴 훈련** | `src/pages/PatternTrainingPageV3.tsx` | 학습 UI 메인 페이지 | ✅ **최신 버전** |
| **📊 대시보드** | `src/components/srs/` | SRS UI 컴포넌트 | ✅ **완성** |

### 🔙 Backend (backend/) 핵심 모듈

| 모듈 | 파일 | 책임 | 상태 |
|-----|------|-----|------|
| **🔄 리뷰 서비스** | `src/services/review/smartReviewService.js` | 백엔드 SRS 처리 | 🔄 통합 예정 |
| **🗄️ 데이터베이스** | Firebase Firestore | 사용자 학습 데이터 | ✅ 운영 중 |

### 🤖 AI 모델 스택

| 기능 | 모델 | 역할 |
|------|------|------|
| **대화 생성** | GPT-4o, Claude 3.5 Sonnet | 레벨별 맞춤 대화, 피드백 제공 |
| **음성 인식** | Whisper Large v3 | 정확한 전사, 발음 분석 |
| **음성 합성** | ElevenLabs TTS | 자연스러운 음성 출력 |
| **복습 엔진** | Python + Firebase | 망각곡선 기반 개인화 복습 |

### 💻 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| **Frontend** | React (TypeScript) | 사용자 인터페이스 |
| **Backend** | Node.js (Express) | API 서버 |
| **Database** | Firebase Firestore | 학습 데이터 저장 |
| **AI Services** | OpenAI, Anthropic | 학습 피드백 생성 |

---

## ⚠️ 2. 절대 금지 규칙 (AI 필수 준수)

### 🚫 **파일/폴더 생성 금지 목록**

```
❌ useSpacedRepetitionV2.ts      # 기존 useSpacedRepetition.ts 수정 권장
❌ useSRSEngineV2.ts             # 현재 useSRSEngine.ts가 최신
❌ SRSEngineNew.ts               # services/srs/SRSEngine.ts 사용
❌ ReviewDashboardV2.tsx         # components/srs/ 기존 컴포넌트 사용
❌ PatternTrainingPageV4.tsx     # V3가 최신, 확장만 허용
❌ services/learning/            # services/srs/ 이미 존재
❌ services/memory/              # services/srs/ 이미 존재
❌ hooks/useMemory*              # useSRSEngine.ts 사용
❌ DECISION_LOG_새버전.md        # docs/DECISION_LOG.md 만 사용
❌ services/newReviewService.ts  # 기존 smartReviewService.ts 확장
❌ services/betterSRS.ts         # SRSEngine.ts가 SSOT
❌ algorithms/improvedSM2.ts     # SuperMemoSM2.ts 수정만
❌ hooks/useAdvancedSRS.ts       # useSRSEngine.ts 확장만
❌ components/NewReviewUI.tsx    # components/srs/ 사용
```

### 🔒 **SSOT 정책 강화**

**핵심 원칙**: 동일 기능은 단일 파일에서만 구현
- **SRS 알고리즘**: `services/srs/SRSEngine.ts` (SSOT)
- **SRS React Hook**: `useSRSEngine.ts` (SSOT)  
- **백엔드 SRS**: `services/review/smartReviewService.ts` (SSOT)
- **의사결정 기록**: `docs/DECISION_LOG.md` (SSOT)
- **프로젝트 컨텍스트**: `docs/PROJECT_CONTEXT.md` (SSOT)

**레거시 파일 처리**:
- 🔄 `useSpacedRepetition.ts` → deprecated, `useSRSEngine.ts`로 점진적 이전
- 🔄 `reviewAlgorithm.ts` → deprecated, `SRSEngine.ts`로 통합
- 🔄 `srsService.ts` → deprecated, `SRSEngine.ts` 사용 권장

**AI 에이전트 강제 규칙**:
1. 새 파일 생성 전 반드시 기존 파일 검색
2. 유사 기능 발견 시 기존 파일 확장만 허용
3. SSOT 파일 수정 시 모든 의존성 확인 필수
4. 레거시 파일 수정 금지, 새 SSOT 시스템만 사용

### ✅ **허용되는 작업**

```
✅ 기존 파일 확장 및 개선
✅ 새로운 utility 함수 추가
✅ 테스트 파일 생성 (__tests__/)
✅ 문서 업데이트 (docs/)
✅ 설정 파일 수정 (.env, package.json)
```

---

## 🔌 3. Plugin Architecture 시스템 (SSOT)

### 🎯 **Plugin Architecture 완전 마이그레이션 완료 (2025-09-16)**

**핵심 성과**: Direct Web API 호출 24개를 ServiceContainer 기반 플러그인 시스템으로 100% 전환

```
Plugin Architecture Pattern
─────────────────────────────
비즈니스 로직 레이어          Implementation 레이어
─────────────────────         ──────────────────────
Components/Hooks        →     ServiceContainer
     ↓                             ↓
speechService.speakAnswer()   WebSpeechPlugin.ts
speechService.stopAllSpeech() SpeechSynthesisAdapter.ts
     ↓                             ↓
Plugin Interface (추상)       Direct Web API (구현)
ISpeechPlugin               speechSynthesis.speak()
```

### ✅ **마이그레이션 완료된 파일들**

| 파일명 | Direct API 호출 수 | 상태 | 전환 방식 |
|-------|-----------------|------|----------|
| `PatternTrainingFlowSimple.tsx` | 12개 | ✅ | ServiceContainer → speechService |
| `SettingsPage.tsx` | 5개 | ✅ | 음성 테스트 플러그인화 |
| `QuestionDisplay.tsx` | 1개 | ✅ | TTS 재생 플러그인화 |
| `SpeakingFlowController.tsx` | 2개 | ✅ | 말하기 플로우 플러그인화 |
| `VoiceControls.tsx` | 4개 | ✅ | 음성 설정 플러그인화 |
| **총합** | **24개** | **✅ 100%** | **플러그인 아키텍처** |

### 🏗️ **플러그인 아키텍처 구성요소**

**허용된 Direct API 사용 (Implementation Layer)**:
- `WebSpeechPlugin.ts` - 플러그인 구현체
- `webSpeechAPI.ts` - 레거시 래퍼 클래스
- `AdapterFactory.ts` - 어댑터 팩토리
- `WebSpeechPluginFactory.ts` - 플러그인 팩토리

**금지된 Direct API 사용 (Business Logic Layer)**:
- ❌ `speechSynthesis.speak()` 직접 호출
- ❌ `speechSynthesis.cancel()` 직접 호출
- ✅ `speechService.speakAnswer()` 플러그인 경유
- ✅ `speechService.stopAllSpeech()` 플러그인 경유

---

## 🎯 4. 현재 SRS 시스템 아키텍처 (SSOT)

### 📊 **통합 완료된 SRS 구조**

```
Frontend SRS (React)              Backend SRS (Node.js)
─────────────────────             ──────────────────────
useSRSEngine.ts (메인)      ←→     smartReviewService.js
useReviewSchedule.ts              
     ↓                                   ↓
SRSEngine.ts (코어 엔진)          (동일 알고리즘 적용)
     ↓
SuperMemoSM2.ts + ForgettingCurve.ts
     ↓
LocalStorage ↔ Firebase Firestore
```

### 🚨 **SRS 중복 구현 현황 (전수조사 완료)**

**프론트엔드 SRS 파일들** (총 106개 파일):
- ✅ `useSRSEngine.ts` - **메인 통합 SRS 시스템**
- ✅ `services/srs/SRSEngine.ts` - **코어 엔진 (SSOT)**
- ✅ `services/srs/algorithms/SuperMemoSM2.ts` - SM-2 알고리즘
- ✅ `services/srs/algorithms/ForgettingCurve.ts` - 망각곡선
- 🔄 `useSpacedRepetition.ts` - **레거시 (통합 예정)**
- 🔄 `services/reviewAlgorithm.ts` - **레거시 (통합 예정)**
- 🔄 `services/srsService.ts` - **레거시 (통합 예정)**

**백엔드 SRS 파일들** (총 21개 파일):
- ✅ `services/review/smartReviewService.ts` - **메인 백엔드 SRS**
- 🔄 `services/review/reviewService.ts` - 레거시
- 🔄 `services/review/reviewEngineClient.ts` - 레거시

### 🎯 **SRS 통합 Action Plan**

| 단계 | 작업 내용 | 상태 | 담당 | 비고 |
|------|----------|------|------|------|
| 1 | SRS 관련 코드 전수 조사 | ✅ 완료 | AI | 106개 TS + 21개 JS 파일 확인 |
| 2 | 중앙 SRS 엔진 아키텍처 다이어그램 | 🔄 진행 중 | AI | ASCII 다이어그램 추가 |
| 3 | 레거시 SRS 파일 마이그레이션 계획 | 🔄 대기 | AI + 개발자 | useSpacedRepetition.ts 등 |
| 4 | 백엔드 SRS 통합 | 🔄 대기 | 개발자 | smartReviewService.ts 확장 |
| 5 | 테스트 및 검증 | 🔄 대기 | 개발자 | 기존 데이터 호환성 확인 |

### 📐 **중앙 SRS 엔진 아키텍처 다이어그램**

```
                     📚 Learning Content Sources
                    ┌─────────────────────────────┐
                    │ Pattern Banks (JSON Files)  │
                    │ • Level 1-10 Stages        │
                    │ • Korean ↔ English Pairs   │
                    └─────────────────────────────┘
                                 │
                                 ▼
        ┌──────────────────────────────────────────────────────────┐
        │                🧠 SRS Engine Core                        │
        │              (services/srs/SRSEngine.ts)                 │
        │                                                          │
        │  ┌─────────────────────┐    ┌─────────────────────────┐   │
        │  │   SuperMemo SM-2    │    │   Forgetting Curve     │   │
        │  │   Algorithm         │    │   Implementation       │   │
        │  │   • easeFactor      │    │   • Memory Strength    │   │
        │  │   • Interval Calc   │    │   • Decay Function     │   │
        │  └─────────────────────┘    └─────────────────────────┘   │
        └──────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  Frontend Hook  │ │ Backend Service │ │ Storage Layer   │
        │                 │ │                 │ │                 │
        │ useSRSEngine.ts │ │smartReviewSrv.ts│ │ • LocalStorage  │
        │ ✅ Main Hook     │ │ ✅ Main Service  │ │ • Firestore     │
        │                 │ │                 │ │ • Cache Layer   │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │            │            │
                    └────────────┼────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      User Interface      │
                    │                         │
                    │ • ReviewDashboard       │
                    │ • PatternTrainingPage   │
                    │ • Progress Tracking     │
                    └─────────────────────────┘

        🔄 Legacy Files (통합 예정):
        ❌ useSpacedRepetition.ts    → useSRSEngine.ts로 통합
        ❌ reviewAlgorithm.ts        → SRSEngine.ts로 통합  
        ❌ srsService.ts             → SRSEngine.ts로 통합
```

### 🔧 **핵심 인터페이스**

```typescript
// 메인 SRS 엔진 인터페이스
interface ReviewCard {
  id: string;
  content: { korean: string; english: string; level: number; };
  memory: { strength: number; easeFactor: number; interval: number; };
  performance: { accuracy: number[]; responseTime: number[]; };
}

// 메인 SRS 훅
const { cards, addCard, processReviewSession, stats } = useSRSEngine({ userId });
```

### ⚖️ **기존 시스템과의 관계**

| 기존 파일 | 상태 | 새 시스템과 관계 | 다음 단계 |
|----------|------|--------------|-----------|
| `useSpacedRepetition.ts` | 🟡 병존 | 레거시 시스템 | 🔄 통합 예정 |
| `reviewAlgorithm.ts` | 🟡 병존 | 중복 로직 | 🔄 통합 예정 |
| `services/srs/` | ✅ 메인 | **단일 진실 원본** | 🎯 **우선 사용** |

---

## 🔄 4. 개발 워크플로우

### 📝 **새 기능 개발 시 절차**

1. **📋 이 문서 확인** - 중복 방지 및 기존 구조 파악
2. **🔍 기존 코드 검색** - `grep`으로 유사 기능 확인  
3. **🎯 기존 파일 확장 우선** - 새 파일 생성 대신
4. **📖 DECISION_LOG.md 기록** - 모든 중요 결정 기록
5. **✅ 테스트 및 문서화** - 코드 완성 후

### 🚦 **AI 에이전트 지시사항**

**새 세션 시작 시 필수 수행:**
```bash
1. docs/PROJECT_CONTEXT.md 읽기 ✅
2. docs/DECISION_LOG.md 확인 ✅  
3. 기존 유사 기능 grep 검색 ✅
4. 금지 규칙 준수 확인 ✅
```

**코드 생성/수정 전 확인사항:**
- [ ] 이미 비슷한 파일/함수가 있는가?
- [ ] 새 파일 생성이 정말 필요한가?
- [ ] 기존 파일을 확장할 수 있는가?
- [ ] 금지 목록에 해당하지 않는가?

---

## 📚 5. 주요 컴포넌트 가이드

### 🧠 **SRS 시스템 사용법**

```tsx
// ✅ 권장: 새 SRS 시스템 사용
import { useSRSEngine } from '@/hooks/useSRSEngine';
import { ReviewDashboard } from '@/components/srs/ReviewDashboard';

const MyComponent = () => {
  const srs = useSRSEngine({ userId: 'user123' });
  return <ReviewDashboard userId="user123" />;
};

// ❌ 비권장: 기존 시스템 (통합 예정)
// import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
```

### 🎯 **패턴 훈련 페이지**

```tsx
// ✅ 최신: 모듈화된 V3 사용
import PatternTrainingPageV3 from '@/pages/PatternTrainingPageV3';

// ❌ 구버전: V2는 레거시
// import PatternTrainingPageV2 from '@/pages/PatternTrainingPageV2';
```

---

## 📋 6. 데이터베이스 스키마

### 🗄️ **Firebase Firestore 구조**

```javascript
// 사용자 SRS 데이터
users/{userId}/srs_cards/{cardId} {
  content: { korean: string, english: string, level: number },
  memory: { strength: number, easeFactor: number, interval: number },
  performance: { accuracy: number[], responseTime: number[] },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🚀 7. 배포 및 환경

### 🌐 **개발 환경**
- **Frontend**: `http://localhost:3500` (Vite)
- **Backend**: `http://localhost:8081` (Node.js)
- **Firebase**: 프로덕션 DB

### 📦 **주요 명령어**
```bash
# 프론트엔드 실행
cd web_app && npm run dev

# 백엔드 실행  
cd backend && npm start

# 통합 테스트
npm run test
```

---

## 📝 8. 문서 업데이트 가이드

### 🔄 **이 문서 수정 시기**
- 새 핵심 모듈 추가 시
- 아키텍처 변경 시  
- 금지 규칙 추가 시
- AI 컨텍스트 문제 발생 시

### ✍️ **수정 방법**
1. 해당 섹션 직접 수정
2. `Last Updated` 날짜 갱신
3. `DECISION_LOG.md`에 변경 이유 기록

---

**🤖 AI 에이전트 참고사항**: 이 문서는 프로젝트의 **현재 상태**를 반영합니다. 코드 생성 전 반드시 이 가이드를 준수하여 중복 생성을 방지하고 일관성을 유지해 주세요.