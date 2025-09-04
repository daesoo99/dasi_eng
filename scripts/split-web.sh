#!/bin/bash
# Web App Project Split Script

echo "🚀 Starting web app project split..."

# Create new directory for web app
mkdir -p ../dasi-web
cd ../dasi-web

# Initialize git
git init
echo "# DASI English Web Application" > README.md

# Copy web app files
cp -r ../DaSi_eng/web_app/* .
cp ../DaSi_eng/.gitignore .

# Update package.json for standalone web app
cat > package.json << 'EOF'
{
  "name": "dasi-web",
  "version": "2.2.0", 
  "description": "DASI English Learning Platform - Web Application",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0", 
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0"
  }
}
EOF

# Copy full dependencies
cp ../DaSi_eng/web_app/package.json ./package-full.json

echo "✅ Web app split completed: ../dasi-web/"
echo "📝 Next: cd ../dasi-web && npm install"