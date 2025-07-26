# Installation and Setup Guide

## Prerequisites

- Node.js 18.0 or higher
- npm or yarn
- Flutter SDK (for mobile app development)
- Git

## Environment Variables Setup

### Backend (.env)
```bash
cp backend/.env.example backend/.env
```

Configure the following values:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/your/google-cloud-key.json
MONGODB_URI=mongodb://localhost:27017/ai-interview-simulator
```

### Web App (.env)
```bash
# web_app/.env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server will run on http://localhost:3000

## Web App Setup

```bash
cd web_app
npm install
npm start
```

Web app will run on http://localhost:3001

## Flutter App Setup

```bash
cd flutter_app
flutter pub get
flutter run
```

## API Key Setup Guide

### OpenAI API Key
1. Visit https://platform.openai.com/
2. Create a new key in the API Keys section
3. Set it in the `.env` file as `OPENAI_API_KEY`

### Google Cloud Speech API
1. Create a project in Google Cloud Console
2. Enable Speech-to-Text API and Text-to-Speech API
3. Download service account key
4. Set the key file path in `.env`

## Development Mode

### Backend Development Mode
```bash
npm run dev  # Auto-restart with nodemon
```

### Web App Development Mode
```bash
npm start  # Hot reload support
```

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Web App Testing
```bash
cd web_app
npm test
```

## Build and Deployment

### Web App Build
```bash
cd web_app
npm run build
```

### Flutter App Build
```bash
cd flutter_app
flutter build apk  # Android
flutter build ios  # iOS
```

## Troubleshooting

### Microphone Permission Error
- Run in HTTPS environment or test on localhost
- Check microphone permissions in browser settings

### API Connection Error
- Verify backend server is running
- Check CORS configuration
- Check network firewall settings

### Speech Recognition Error
- Verify Google Cloud API key
- Check internet connection
- Use a Web Speech API supported browser