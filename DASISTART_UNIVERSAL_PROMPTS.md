# DaSiStart Claude 범용 세션 관리 프롬프트 모음

## 🚀 기본 프로젝트 컨텍스트 프롬프트

```
안녕! 나는 DaSiStart(AI 면접 시뮬레이터)를 개발하고 있어.

📍 현재 위치: C:\Users\kimdaesoo\source\claude\DaSiStart
🌐 개발서버: 
- 백엔드: http://localhost:8081 (backend에서 $env:PORT=8081; npm start)
- 웹앱: http://localhost:3000 (web_app에서 npm start)
- 테스트: 브라우저에서 http://localhost:3000 접속

📋 프로젝트 핵심:
- 실시간 음성 AI 면접 시뮬레이터
- Web Speech API 기반 STT/TTS
- Google Gemini AI 면접관
- React TypeScript 웹앱 + Flutter 모바일앱
- Node.js Express 백엔드

🔧 기술스택:
- Frontend: React TypeScript + Web Speech API
- Backend: Node.js + Express + Socket.io
- AI/ML: Google Gemini + OpenAI (fallback)
- Database: Firebase Firestore
- Mobile: Flutter (예정)

✅ 완성된 기능:
- 면접 설정 화면 (직무/경력 입력)
- 실시간 음성 인식 (Web Speech API)
- AI 질문 생성 (Google Gemini + OpenAI fallback)
- 답변 평가 및 피드백 시스템
- TTS 질문 읽기 (Web Speech Synthesis)
- 5단계 면접 플로우 관리
- Socket.io 실시간 통신

📖 상세정보: CLAUDE.md, DASISTART_STRATEGIC_ANALYSIS.md 파일 참조

어떤 작업을 진행할까?
```

## 📝 문서 업데이트 프롬프트

```
새 기능을 개발했으니 프로젝트 문서를 업데이트해주자.

📋 업데이트 가이드라인:
1. CLAUDE.md의 진행 상황 체크표시 변경 ([ ] → [x])
2. 완성도 퍼센트 업데이트
3. "완성된 기능" 섹션에 새 항목 추가
4. Step별 진행 상황 실시간 반영
5. AI 면접 시뮬레이터의 핵심 가치와 일관성 유지

새로 완성한 기능: [여기에 기능 설명]

CLAUDE.md와 관련 문서를 읽고 적절히 업데이트해주라.
```

## 🔧 개발 환경 복구 프롬프트

```
DaSiStart 개발을 재개하자.

📍 체크리스트:
1. 현재 디렉토리 확인: C:\Users\kimdaesoo\source\claude\DaSiStart
2. 백엔드 서버 실행: 
   cd backend → $env:PORT=8081 → npm start
3. 웹앱 서버 실행: 
   cd web_app → npm start (보통 3011 포트)
4. 최신 코드 상태 확인 (git status)
5. 주요 파일들 상태 점검:
   - backend/src/server.js (Express 서버)
   - web_app/src/App.tsx (React 메인)
   - web_app/src/components/*.tsx (면접 컴포넌트들)
   - backend/src/services/llmService.js (Gemini AI)

6. 브라우저에서 http://localhost:3011 접속 테스트
7. 현재 진행 중인 Step 확인 (CLAUDE.md 참조)

모든 것이 정상 작동하는지 확인하고, 다음 개발할 기능에 대해 논의하자.
```

## 🐛 버그 수정 시작 프롬프트

```
DaSiStart에서 버그가 발생했어.

🔍 버그 상황: [여기에 버그 설명]

📋 수정 프로세스:
1. 문제 재현 및 원인 분석
   - 브라우저 개발자도구 콘솔 확인
   - 네트워크 탭에서 API 요청 실패 여부 (특히 /api/interview/* 엔드포인트)
   - Web Speech API 마이크 권한 문제 확인
   - 백엔드 로그에서 Gemini API 에러 확인
2. 관련 파일들 검토 및 수정
   - 프론트엔드: React 컴포넌트 (InterviewRoom, AudioRecorder), API 호출
   - 백엔드: Express 라우터, Gemini API 연동 (llmService.js)
   - 타입 정의: shared/types.ts 인터페이스 확인
3. 개발서버 재시작 테스트 (포트 충돌 주의)
4. 실제 음성 인식/면접 플로우 검증
5. TypeScript 컴파일 에러 및 import 경로 확인
6. 브라우저 호환성 테스트 (Chrome 우선, Edge 확인)
7. CLAUDE.md 문서에 해결 내용 반영

AI 면접 시뮬레이터의 핵심 기능이 정상 작동하도록 체계적으로 해결하자.
```

## 📊 성능 최적화 프롬프트

```
DaSiStart 성능을 최적화하자.

🎯 최적화 영역:
- 음성 인식 응답 속도 (Web Speech API continuous 설정)
- Gemini API 호출 최적화 (프롬프트 길이 단축, 스트리밍 고려)
- React 렌더링 최적화 (useMemo, useCallback 활용)
- Socket.io 실시간 통신 효율성
- MediaRecorder 메모리 관리 및 audio blob 처리
- 면접 중 UI 끊김 방지 (로딩 상태 최적화)

📋 체크리스트:
1. 음성 인식 지연 시간 측정 및 최적화
2. AI 응답 생성 속도 개선 (프롬프트 엔지니어링)
3. React useMemo/useCallback 적용
4. Bundle 크기 분석 및 코드 스플리팅
5. 실제 면접 환경에서 끊김 없는 경험 검증
6. 메모리 사용량 모니터링 (장시간 면접 시)

실제 면접 상황에서 자연스러운 대화가 가능하도록 최적화하자.
```

## 🎨 새 기능 개발 프롬프트

```
DaSiStart에 새로운 기능을 추가하자.

💡 개발할 기능: [여기에 기능 설명]

📋 개발 프로세스:
1. 기능 요구사항 정의 및 AI 면접 플로우와의 연동 설계
2. 필요한 데이터 모델/인터페이스 정의 (shared/types.ts 업데이트)
3. 아키텍처 설계:
   - Frontend: React 컴포넌트 설계
   - Backend: Express API 엔드포인트
   - AI: Gemini 프롬프트 최적화
4. 단위별 구현 (작은 단위부터)
5. 기존 면접 플로우와의 통합
6. 음성 인식/합성과의 연동 테스트
7. CLAUDE.md 문서 업데이트
8. 실제 면접 시나리오에서 검증

🎯 개발 원칙:
- 기존 면접 플로우를 방해하지 않는 자연스러운 통합
- Web Speech API와의 원활한 연동
- 한국 면접 문화에 맞는 UX 설계
- 실시간 응답성 유지

체계적으로 개발해보자.
```

## 💾 Git 저장 및 백업 프롬프트

```
현재 DaSiStart 작업을 Git에 저장하고 GitHub에 푸시하자.

📋 Git 작업 순서:
1. git status로 변경사항 확인
2. git add . 로 모든 변경사항 스테이징
3. 의미 있는 커밋 메시지 작성:
   - "feat: [기능명] 음성 면접 기능 추가" 
   - "fix: [버그내용] Web Speech API 오류 수정"
   - "perf: [최적화내용] Gemini API 응답 속도 개선"
   - "docs: CLAUDE.md Step 진행상황 업데이트"
   - "refactor: [리팩토링 내용] 면접 컴포넌트 구조 개선"
4. git commit -m "메시지"
5. git push origin master

🔒 백업 체크:
- 모든 중요 파일들이 커밋에 포함되었는지 확인
- .env 파일은 .gitignore로 제외 확인 (API 키 보안)
- backend, web_app, flutter_app 모든 폴더 포함
- CLAUDE.md 최신 상태 반영

작업 내용: [여기에 작업 설명]

AI 면접 시뮬레이터 개발 진행사항을 안전하게 저장하자.
```

## 🚀 배포 준비 프롬프트

```
DaSiStart를 배포 가능한 상태로 준비하자.

📋 배포 체크리스트:
1. 🏗️ 빌드 테스트: 
   - 백엔드: npm start 정상 실행
   - 웹앱: npm run build 성공 확인
2. 🔍 코드 품질: TypeScript 타입 체크, ESLint 통과
3. 🧪 기능 테스트: 
   - 음성 인식 정상 작동
   - AI 질문 생성 및 답변 평가
   - 면접 플로우 전체 검증
4. 📄 문서 정리: README, CLAUDE.md 최신 상태
5. 🔐 보안 체크: 
   - Gemini API 키 환경변수 처리
   - Firebase 설정 보안 확인
6. ⚙️ 환경 설정: 
   - Vercel/Netlify 배포 설정
   - 백엔드 서버 배포 준비 (Railway/Render)
7. 📊 성능 체크: 음성 인식 응답속도, AI 생성 속도

🌐 배포 환경 옵션:
- 프론트엔드: Vercel (React 최적화, 도메인 연결 쉬움)
- 백엔드: Railway (Node.js 지원, WebSocket 안정성)
- 데이터베이스: Firebase (이미 설정됨)

📈 배포 후 모니터링:
- 음성 인식 오류율 추적
- AI 응답 지연 시간 모니터링
- 사용자 면접 완료율 측정

취업 준비생들이 실제로 면접 연습할 수 있도록 안정적으로 배포하자.
```

## 🔄 정기 점검 프롬프트

```
DaSiStart 프로젝트 정기 점검을 진행하자.

📊 점검 항목:
1. 🏥 건강 체크:
   - 백엔드/웹앱 빌드 성공 여부
   - Web Speech API 정상 작동 (Chrome 브라우저)
   - Gemini API 연동 상태 및 응답 품질
   - Firebase 연결 상태
   - 전체 면접 플로우 정상 작동

2. 📈 성능 체크:
   - 음성 인식 응답 속도 (2초 이내 목표)
   - AI 질문 생성 속도 (5초 이내 목표)
   - 웹앱 로딩 속도
   - 실시간 면접 중 끊김 현상 확인

3. 🔒 보안 체크:
   - API 키 환경변수 보안 상태
   - Firebase 보안 규칙 점검
   - 사용자 데이터 보호 상태

4. 📚 문서 체크:
   - CLAUDE.md Step 진행상황 정확성
   - README 실행 방법 최신성
   - 코드 주석 적절성 (특히 Web Speech API 부분)

5. 🎯 프로젝트 방향성:
   - Step별 목표 달성도 확인
   - AI 면접 시뮬레이터 핵심 가치 구현도
   - 사용자 피드백 반영 우선순위
   - 다음 개발 Step 계획

실제 취업 준비생들에게 도움이 되는 서비스인지 전체적으로 점검하자.
```

## 🧪 테스트 작성 프롬프트

```
DaSiStart의 테스트 커버리지를 개선하자.

🎯 테스트 전략:
- 단위 테스트: AI 면접 로직, 음성 처리 함수
- 통합 테스트: 면접 플로우 전체, API 연동
- E2E 테스트: 실제 사용자 면접 시나리오

📋 테스트 작성 순서:
1. 핵심 비즈니스 로직 우선:
   - Gemini API 질문 생성
   - 답변 평가 시스템
   - 면접 세션 관리
2. Web Speech API 연동 테스트:
   - 음성 인식 정확도
   - TTS 재생 확인
   - 브라우저 호환성
3. 사용자 시나리오 E2E:
   - 면접 설정 → 질문 → 답변 → 평가 전체 플로우
   - 다양한 직무/경력별 면접 시나리오
4. 에러 케이스:
   - 네트워크 끊김 상황
   - 마이크 권한 거부
   - AI API 응답 실패

🔧 테스트 도구:
- Jest (백엔드 단위 테스트)
- React Testing Library (컴포넌트 테스트)
- Cypress (E2E 테스트)

테스트할 기능: [여기에 기능 설명]

안정적인 AI 면접 시뮬레이터를 만들자.
```

## 🔍 코드 리뷰 프롬프트

```
DaSiStart 코드 리뷰를 진행하자.

📋 리뷰 체크리스트:
1. 🏗️ 아키텍처:
   - React 컴포넌트 구조의 적절성
   - Express API 설계 일관성
   - Web Speech API 활용 최적화
   - Gemini AI 연동 효율성

2. 💡 코드 품질:
   - TypeScript 타입 정의 완성도
   - React Hook 사용 패턴
   - 에러 핸들링 완성도
   - 면접 관련 비즈니스 로직 명확성

3. 🔒 보안:
   - API 키 환경변수 처리
   - 사용자 음성 데이터 보안
   - Firebase 보안 규칙 검토

4. 📊 성능:
   - 음성 처리 성능 최적화
   - React 렌더링 최적화
   - API 호출 효율성
   - 메모리 누수 방지

5. 🧪 테스트:
   - 면접 플로우 테스트 커버리지
   - Web Speech API 브라우저 호환성
   - AI 응답 품질 검증

리뷰할 파일/영역: [여기에 파일명이나 기능 영역]

실제 면접 상황에서 안정적으로 작동하는 코드로 개선하자.
```

---

## 📌 사용법

1. **기본 시작**: 항상 "기본 프로젝트 컨텍스트" 프롬프트부터 시작
2. **상황별 추가**: 필요에 따라 특정 작업 프롬프트 추가 사용
3. **커스터마이징**: [대괄호] 부분을 구체적인 내용으로 수정
4. **조합 사용**: 여러 프롬프트를 상황에 맞게 조합

**💡 DaSiStart 특화 Tip**: 
- 음성 관련 작업 시 Chrome 브라우저에서 우선 테스트 (Web Speech API 지원 최적)
- AI 프롬프트 수정 시 한국 기업 면접 문화 특성 반영 (겸손함, 팀워크 강조)
- 실시간 통신 이슈 시 Socket.io 연결 상태와 포트 충돌 확인
- 새로운 면접 시나리오나 AI 응답 패턴 발견 시 이 파일에 추가
- Google Gemini API 할당량 초과 시 OpenAI fallback 동작 확인

**🎯 목표**: Claude와의 모든 세션을 AI 면접 시뮬레이터 개발에 최적화하여 관리하기