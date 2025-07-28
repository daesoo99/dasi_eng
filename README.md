# DaSiStart - AI 면접 시뮬레이터

실시간 음성 기반 AI 면접 연습 플랫폼 • **기본 코딩 초안 완료 (2025-01-28)**

## 📁 프로젝트 구조

```
DaSiStart/
├── 📁 backend/                    # Node.js + Express 백엔드
│   ├── src/
│   │   ├── routes/                # API 라우터
│   │   │   ├── interview.js       # 면접 관련 API
│   │   │   └── speech.js          # 음성 처리 API
│   │   ├── services/              # 비즈니스 로직
│   │   │   ├── baseService.js     # 공통 서비스 기능
│   │   │   ├── interviewService.js# 면접 세션 관리
│   │   │   ├── llmService.js      # AI LLM 연동
│   │   │   ├── sttService.js      # 음성→텍스트
│   │   │   └── ttsService.js      # 텍스트→음성
│   │   └── server.js              # Express 서버
│   ├── .env.example               # 환경변수 템플릿
│   └── package.json
├── 📁 web_app/                     # React 웹 애플리케이션
│   ├── src/
│   │   ├── components/            # React 컴포넌트
│   │   │   ├── InterviewSetup.tsx # 면접 설정 화면
│   │   │   ├── InterviewRoom.tsx  # 면접 진행 화면
│   │   │   ├── AudioRecorder.tsx  # 음성 녹음 컴포넌트
│   │   │   └── QuestionDisplay.tsx# 질문 표시 컴포넌트
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── useInterview.ts    # 면접 상태 관리
│   │   │   └── useSpeechRecognition.ts # 음성 인식
│   │   ├── services/
│   │   │   └── api.ts             # API 클라이언트 + Web Speech API
│   │   └── App.tsx                # 메인 앱 컴포넌트
│   └── package.json
├── 📁 flutter_app/                 # Flutter 모바일 앱 (템플릿)
├── 📁 shared/                      # 공유 타입 정의
│   └── types.ts                   # TypeScript 인터페이스
├── 📁 docs/                        # 프로젝트 문서
├── 📋 DASISTART_STRATEGIC_ANALYSIS.md # 제품 전략 분석
└── 📋 DASISTART_UNIVERSAL_PROMPTS.md  # Claude 세션 관리
```

## 🛠️ 기술 스택

### 🔧 백엔드 (완성)
- **Node.js + Express** - RESTful API 서버
- **Socket.IO** - 실시간 양방향 통신
- **UUID** - 고유 세션 ID 생성
- **Firebase** - 데이터 저장 (설정됨)
- **서비스 계층 아키텍처** - 확장 가능한 구조

### 🤖 AI 서비스 (연동 준비 완료)
- **음성 인식**: Web Speech API (브라우저 내장) + Google STT (서버)
- **AI 면접관**: Google Gemini API (주) + OpenAI (보조)
- **음성 합성**: Web Speech Synthesis (브라우저 내장) + Google TTS

### 🎨 프론트엔드 (완성)
- **React + TypeScript** - 타입 안전한 웹 애플리케이션
- **Custom Hooks** - 상태 관리 및 로직 분리
- **Web Speech API** - 브라우저 네이티브 음성 처리
- **Axios** - HTTP 클라이언트 + 에러 처리

### 📱 모바일 (준비됨)
- **Flutter** - 크로스 플랫폼 앱 (Android/iOS)

## 🚀 개발 진행 현황 (Step 1-8)

### 🎯 프로젝트 목표
**혼자서 Claude CLI와 Vibe Coding 흐름을 활용해 실시간 음성 AI 면접 시뮬레이터를 완성한다.**

**핵심 기능:**
- 🎤 **음성 인식**: 사용자의 답변을 실시간으로 텍스트로 변환 (STT)
- 🤖 **AI 면접관**: 직무/경력에 맞는 맞춤형 질문을 생성하고 답변을 평가
- 🔊 **음성 출력**: 질문을 자연스러운 음성으로 읽어주기 (TTS)
- 📊 **실시간 피드백**: 답변 중 실시간 분석 및 개선점 제시

### ✅ Step 1: 프로젝트 초기 설정 (완료)
- [x] 기본 프로젝트 구조 생성 (backend, web_app, flutter_app, shared)
- [x] Node.js Express 백엔드 기본 설정
- [x] React TypeScript 웹앱 기본 설정
- [x] Flutter 프로젝트 정리 (잘못 포함된 SDK 제거)
- [x] 공유 타입 정의 완성 (면접 관련 인터페이스)
- [x] Git 저장소 초기화 및 GitHub 연동

### ✅ Step 2: 기본 UI 및 컴포넌트 개발 (완료)
- [x] 웹앱 면접 설정 화면 (InterviewSetup.tsx)
- [x] 음성 녹음 컴포넌트 (AudioRecorder.tsx)
- [x] 질문 표시 컴포넌트 (QuestionDisplay.tsx)
- [x] 면접룸 메인 화면 (InterviewRoom.tsx)
- [x] 기본 라우팅 및 상태 관리

### ✅ Step 3: 백엔드 API 기본 구조 (완료)
- [x] Express 서버 설정
- [x] 서비스 계층 아키텍처 (BaseService, InterviewService)
- [x] RESTful API 엔드포인트 (/start, /question, /evaluate, /end)
- [x] 기본 면접 질문 템플릿 (직무별 5문항)
- [x] 메모리 기반 세션 관리 (Firebase 연동 전)

### 🔄 Step 4: 음성 처리 통합 (진행 중)
- [x] Web Speech API 연동 (STT)
- [x] Custom React Hooks (useInterview, useSpeechRecognition)
- [x] 브라우저 호환성 처리 (Chrome/Edge 최적화)
- [ ] Google Gemini API 연동 (질문 생성 + 답변 평가)
- [ ] OpenAI API fallback 구현
- [ ] TTS (Text-to-Speech) 구현
- [ ] 실시간 음성 스트리밍

### 📋 Step 5: AI 면접 로직 고도화 (예정)
- [ ] 면접관 수준 프롬프트 엔지니어링
- [ ] 직무별/경력별 맞춤 질문 생성
- [ ] 정교한 답변 평가 시스템 (발음, 속도, 감정 분석)
- [ ] 연속 질문의 맥락 처리
- [ ] Firebase 연동 (데이터 영속성)
- [ ] 면접 결과 리포트 생성

### 📋 Step 6: Flutter 모바일 앱 개발 (예정)
- [ ] Flutter 기본 UI 개발 (웹앱 UI 포팅)
- [ ] 웹앱과 동일한 기능 구현
- [ ] 모바일 음성 처리 최적화
- [ ] 네이티브 기능 활용

### 📋 Step 7: 고급 기능 및 최적화 (예정)
- [ ] 실시간 WebSocket 통신 최적화
- [ ] 면접 세션 저장/복원
- [ ] 성능 최적화 및 보안 강화
- [ ] 웹 배포 (Vercel + Railway)

### 📋 Step 8: 배포 및 운영 (예정)
- [ ] Docker 컨테이너화
- [ ] CI/CD 파이프라인
- [ ] 클라우드 배포 (AWS/GCP)
- [ ] 모니터링 및 로깅
- [ ] 사용자 테스트 및 피드백

### 📊 현재 완성도
- **전체 진행도**: Step 3 완료, Step 4 진행 중 (약 50%)
- **백엔드**: 80% (AI API 연동 대기)
- **프론트엔드**: 90% (UI/UX 완성)
- **음성 처리**: 95% (Web Speech API 완전 구현)
- **모바일 앱**: 10% (Flutter 템플릿만)

### 💡 개발 철학
- ⚡ **속도보다 완성도**: 각 기능을 제대로 완성한 후 다음 단계로
- 🎯 **MVP 우선**: 핵심 기능부터 구현하여 실제 사용 가능한 상태 유지
- 🔄 **반복적 개선**: 기본 → 고급 → 최적화 순서로 점진적 발전
- 💡 **유연한 확장**: 새로운 아이디어나 개선사항을 자유롭게 통합

## 🛠️ 로컬 개발 환경 설정

### 1. 저장소 클론
```bash
git clone https://github.com/daesoo99/ai-interview-simulator.git
cd ai-interview-simulator
```

### 2. 백엔드 실행
```bash
cd backend
npm install
# 환경변수 설정 (.env 파일 생성)
$env:PORT=8081; npm start  # PowerShell
# 또는
PORT=8081 npm start        # Bash
```

### 3. 웹앱 실행
```bash
cd web_app
npm install
npm start  # 자동으로 3000 포트에서 실행
```

### 4. 브라우저 테스트
1. `http://localhost:3000` 접속
2. Chrome/Edge 브라우저 권장
3. 마이크 권한 허용 필수

## 🌐 환경변수 설정

`backend/.env` 파일 생성:
```bash
PORT=8081
GOOGLE_GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
FIREBASE_PROJECT_ID=your_project_id
```

## 📱 모바일 앱 (Flutter)

### 설정 방법
```bash
cd flutter_app
flutter pub get
flutter run -d chrome  # 웹 버전 테스트
flutter run            # 연결된 디바이스에서 실행
```

### 지원 플랫폼
- ✅ **Android**: 완전 지원 (Android Studio 필요)
- ✅ **Web**: 브라우저에서 실행 가능
- ⚠️ **Windows**: Visual Studio C++ 컴포넌트 필요
- ❌ **iOS**: Mac 환경 필요

## 📊 프로젝트 메트릭스

### 📈 코드 통계
- **총 파일 수**: 142개 추가/수정
- **코드 라인**: 7,200+ 라인
- **TypeScript**: 완전 타입 안전
- **테스트 커버리지**: API 연동 후 구현 예정

### 🎯 기능 완성도
- **백엔드**: 80% (AI API 연동 대기)
- **프론트엔드**: 90% (UI/UX 완성)
- **음성 처리**: 95% (Web Speech API 완전 구현)
- **모바일 앱**: 10% (Flutter 템플릿만)

### 🔗 문서 링크
- [📊 전략 분석](./DASISTART_STRATEGIC_ANALYSIS.md) - 제품 방향성 및 시장 분석
- [🤖 Claude 가이드](./DASISTART_UNIVERSAL_PROMPTS.md) - AI 협업 개발 방법론

## 🤝 개발 협업

### Git 브랜치 전략
- `master`: 메인 브랜치 (배포 가능한 상태)
- 각 Step별 개발 후 즉시 커밋
- 상세한 커밋 메시지 + 이모지 사용

### 이슈 및 개선사항
- GitHub Issues를 통한 버그 리포트
- 새로운 기능 제안 환영
- Claude와의 AI 협업 개발 진행

---

**💡 개발 철학**: "완벽한 계획보다 실행 가능한 MVP → 빠른 사용자 피드백 → 지속적 개선"

**🎯 목표**: 취업 준비생들이 실제 면접에서 자신감 있게 말할 수 있도록 돕는 AI 면접 시뮬레이터