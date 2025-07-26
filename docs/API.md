# API Documentation

## Basic Information
- Base URL: `http://localhost:3000/api`
- Content-Type: `application/json`

## Interview API

### 1. Start Interview
```
POST /interview/start
```

**Request Body:**
```json
{
  "position": "Frontend Developer",
  "experience": "Junior"
}
```

**Response:**
```json
{
  "interviewId": "interview_1234567890",
  "question": "Please briefly introduce yourself.",
  "status": "started"
}
```

### 2. Request Next Question
```
POST /interview/question
```

**Request Body:**
```json
{
  "interviewId": "interview_1234567890",
  "position": "Frontend Developer",
  "experience": "Junior",
  "previousQuestions": ["Please briefly introduce yourself."]
}
```

**Response:**
```json
{
  "question": "Please explain the differences between React and Vue.js.",
  "status": "continue"
}
```

### 3. Evaluate Answer
```
POST /interview/evaluate
```

**Request Body:**
```json
{
  "question": "Please briefly introduce yourself.",
  "answer": "Hello. I am a 3-year frontend developer...",
  "position": "Frontend Developer"
}
```

**Response:**
```json
{
  "evaluation": "Total Score: 85/100\nStrengths: Clear self-introduction\nAreas for Improvement: More specific project examples",
  "status": "evaluated"
}
```

### 4. End Interview
```
POST /interview/end
```

**Request Body:**
```json
{
  "interviewId": "interview_1234567890",
  "totalScore": 85,
  "feedback": "Overall, it was a good answer."
}
```

## Speech API

### 1. Speech to Text (STT)
```
POST /speech/stt
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: audio file (max 10MB)

**Response:**
```json
{
  "text": "Recognized text content",
  "status": "success"
}
```

### 2. Text to Speech (TTS)
```
POST /speech/tts
```

**Request Body:**
```json
{
  "text": "Hello. This is the first question.",
  "language": "ko-KR"
}
```

**Response:**
- Content-Type: `audio/mp3`
- Body: audio binary data

## WebSocket Events

### Client → Server
- `join-interview`: Join interview room
- `audio-data`: Send real-time audio data
- `interview-message`: Send interview message

### Server → Client
- `audio-data`: Receive real-time audio data
- `interview-message`: Receive interview message

## Error Codes

| Code | Description |
|------|------|
| 400 | Bad Request |
| 401 | Authentication Failed |
| 500 | Internal Server Error |