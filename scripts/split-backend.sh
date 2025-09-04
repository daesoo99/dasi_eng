#!/bin/bash
# Backend Project Split Script

echo "🚀 Starting backend project split..."

# Create new directory for backend
mkdir -p ../dasi-backend
cd ../dasi-backend

# Initialize git
git init
echo "# DASI English Backend API" > README.md

# Copy backend files
cp -r ../DaSi_eng/backend/* .
cp ../DaSi_eng/.gitignore .
cp ../DaSi_eng/FIREBASE_STORAGE_MIGRATION.md .

# Create backend-specific package.json
cat > package.json << 'EOF'
{
  "name": "dasi-backend",
  "version": "2.2.0",
  "description": "DASI English Learning Platform - Backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "npm run build && node dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["english-learning", "api", "nodejs", "typescript"],
  "author": "DASI Team",
  "license": "MIT"
}
EOF

# Copy dependencies from original
cp ../DaSi_eng/backend/package.json ./package-full.json

echo "✅ Backend split completed: ../dasi-backend/"
echo "📝 Next: cd ../dasi-backend && npm install"