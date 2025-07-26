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
   - ⚠️ Visual Studio (optional - Windows desktop apps only)
   - ✅ VS Code + Flutter extension (recommended)

#### Development Environment Status
✅ **Ready for Development:**
- Flutter SDK (v3.32.8)
- Android toolchain (Android SDK v36.0.0)
- Chrome (web development)
- Android Studio (v2025.1.1)
- VS Code with Flutter extension

🎯 **Supported Platforms:**
- ✅ Android mobile apps
- ✅ Web applications (Chrome/browsers)
- ⚠️ Windows desktop apps (requires Visual Studio C++ components)
- ❌ iOS apps (requires Mac)

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