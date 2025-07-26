# AI Interview Simulator

실시간 음성 AI 면접 시뮬레이터

## 프로젝트 구조

- `backend/` - Node.js + Express 백엔드 서버
- `flutter_app/` - Flutter 모바일 애플리케이션
- `web_app/` - React 웹 애플리케이션
- `shared/` - 공통 타입 및 상수 정의
- `docs/` - 프로젝트 문서

## 기술 스택

### 백엔드
- Node.js + Express
- Socket.IO (실시간 통신)
- MongoDB/PostgreSQL

### AI 서비스
- STT: Google Speech-to-Text API
- LLM: OpenAI GPT API
- TTS: Google Text-to-Speech API

### 프론트엔드
- 모바일: Flutter
- 웹: React + TypeScript

## 시작하기

### 백엔드 실행
```bash
cd backend
npm install
npm start
```

### 웹앱 실행
```bash
cd web_app
npm install
npm start
```

### Flutter 앱 실행
```bash
cd flutter_app
flutter run
```