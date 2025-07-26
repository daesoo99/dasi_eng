# 설치 및 실행 가이드

## 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Flutter SDK (모바일 앱 개발 시)
- Git

## 환경 변수 설정

### 백엔드 (.env)
```bash
cp backend/.env.example backend/.env
```

다음 값들을 설정하세요:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/your/google-cloud-key.json
MONGODB_URI=mongodb://localhost:27017/ai-interview-simulator
```

### 웹앱 (.env)
```bash
# web_app/.env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

## 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 웹앱 실행

```bash
cd web_app
npm install
npm start
```

웹앱이 http://localhost:3001 에서 실행됩니다.

## Flutter 앱 실행

```bash
cd flutter_app
flutter pub get
flutter run
```

## API 키 설정 가이드

### OpenAI API Key
1. https://platform.openai.com/ 접속
2. API Keys 섹션에서 새 키 생성
3. `.env` 파일의 `OPENAI_API_KEY`에 설정

### Google Cloud Speech API
1. Google Cloud Console에서 프로젝트 생성
2. Speech-to-Text API 및 Text-to-Speech API 활성화
3. 서비스 계정 키 다운로드
4. 키 파일 경로를 `.env`에 설정

## 개발 모드

### 백엔드 개발 모드
```bash
npm run dev  # nodemon으로 자동 재시작
```

### 웹앱 개발 모드
```bash
npm start  # Hot reload 지원
```

## 테스트

### 백엔드 테스트
```bash
cd backend
npm test
```

### 웹앱 테스트
```bash
cd web_app
npm test
```

## 빌드 및 배포

### 웹앱 빌드
```bash
cd web_app
npm run build
```

### Flutter 앱 빌드
```bash
cd flutter_app
flutter build apk  # Android
flutter build ios  # iOS
```

## 문제 해결

### 마이크 권한 오류
- HTTPS 환경에서 실행하거나 localhost에서 테스트
- 브라우저 설정에서 마이크 권한 확인

### API 연결 오류
- 백엔드 서버가 실행 중인지 확인
- CORS 설정 확인
- 네트워크 방화벽 설정 확인

### 음성 인식 오류
- Google Cloud API 키 확인
- 인터넷 연결 상태 확인
- Web Speech API 지원 브라우저 사용