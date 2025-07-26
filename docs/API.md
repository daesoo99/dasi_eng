# API 문서

## 기본 정보
- Base URL: `http://localhost:3000/api`
- Content-Type: `application/json`

## 면접 API

### 1. 면접 시작
```
POST /interview/start
```

**Request Body:**
```json
{
  "position": "프론트엔드 개발자",
  "experience": "주니어"
}
```

**Response:**
```json
{
  "interviewId": "interview_1234567890",
  "question": "자기소개를 간단히 해주세요.",
  "status": "started"
}
```

### 2. 다음 질문 요청
```
POST /interview/question
```

**Request Body:**
```json
{
  "interviewId": "interview_1234567890",
  "position": "프론트엔드 개발자",
  "experience": "주니어",
  "previousQuestions": ["자기소개를 간단히 해주세요."]
}
```

**Response:**
```json
{
  "question": "React와 Vue.js의 차이점에 대해 설명해주세요.",
  "status": "continue"
}
```

### 3. 답변 평가
```
POST /interview/evaluate
```

**Request Body:**
```json
{
  "question": "자기소개를 간단히 해주세요.",
  "answer": "안녕하세요. 저는 3년차 프론트엔드 개발자입니다...",
  "position": "프론트엔드 개발자"
}
```

**Response:**
```json
{
  "evaluation": "총점: 85/100\n강점: 명확한 자기소개\n개선점: 더 구체적인 프로젝트 예시",
  "status": "evaluated"
}
```

### 4. 면접 종료
```
POST /interview/end
```

**Request Body:**
```json
{
  "interviewId": "interview_1234567890",
  "totalScore": 85,
  "feedback": "전반적으로 좋은 답변이었습니다."
}
```

## 음성 API

### 1. 음성을 텍스트로 변환 (STT)
```
POST /speech/stt
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: audio file (10MB 이하)

**Response:**
```json
{
  "text": "인식된 텍스트 내용",
  "status": "success"
}
```

### 2. 텍스트를 음성으로 변환 (TTS)
```
POST /speech/tts
```

**Request Body:**
```json
{
  "text": "안녕하세요. 첫 번째 질문입니다.",
  "language": "ko-KR"
}
```

**Response:**
- Content-Type: `audio/mp3`
- Body: audio binary data

## WebSocket 이벤트

### 클라이언트 → 서버
- `join-interview`: 면접방 참가
- `audio-data`: 실시간 오디오 데이터 전송
- `interview-message`: 면접 메시지 전송

### 서버 → 클라이언트  
- `audio-data`: 실시간 오디오 데이터 수신
- `interview-message`: 면접 메시지 수신

## 오류 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 500 | 서버 내부 오류 |