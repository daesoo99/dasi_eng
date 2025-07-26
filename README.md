# AI Interview Simulator

Real-time voice-powered AI interview practice platform

## Project Structure

- `backend/` - Node.js + Express backend server
- `flutter_app/` - Flutter mobile application
- `web_app/` - React web application
- `shared/` - Shared types and constants
- `docs/` - Project documentation

## Tech Stack

### Backend
- Node.js + Express
- Socket.IO (real-time communication)
- MongoDB/PostgreSQL

### AI Services
- STT: Google Speech-to-Text API
- LLM: OpenAI GPT API
- TTS: Google Text-to-Speech API

### Frontend
- Mobile: Flutter
- Web: React + TypeScript

## Getting Started

### Prerequisites

#### Flutter SDK Installation (Windows)
1. **Download and Install:**
   ```bash
   git clone https://github.com/flutter/flutter.git -b stable C:\flutter
   ```

2. **Add to PATH:**
   - Windows Search → "Environment Variables" → "Edit system environment variables"
   - Click "Environment Variables"
   - In System Variables, select "Path" → "Edit"
   - Click "New" → Add `C:\flutter\bin`
   - Restart terminal

3. **Verify Installation:**
   ```bash
   flutter doctor
   ```

4. **Install Dependencies:**
   - ✅ Android Studio (for Android development)
   - ✅ Visual Studio (for Windows development)
   - ✅ VS Code + Flutter extension (recommended)

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Web App Setup
```bash
cd web_app
npm install
npm start
```

### Flutter App Setup
```bash
cd flutter_app
flutter pub get
flutter run
```