#!/bin/bash
# Multi-Project Split Master Script

echo "🚀 DASI English Multi-Project Split"
echo "=================================="

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "web_app" ] || [ ! -d "flutter_app" ]; then
    echo "❌ Error: Must run from DaSi_eng root directory"
    exit 1
fi

echo "📊 Current structure:"
echo "- backend/ ($(find backend -type f | wc -l) files)"
echo "- web_app/ ($(find web_app -type f | wc -l) files)"  
echo "- flutter_app/ ($(find flutter_app -type f | wc -l) files)"
echo ""

# Create parent directory for all projects
mkdir -p ../dasi-projects
cd ../dasi-projects

echo "🔄 Step 1: Backend split..."
bash ../DaSi_eng/scripts/split-backend.sh

echo "🔄 Step 2: Web app split..."
bash ../DaSi_eng/scripts/split-web.sh

echo "🔄 Step 3: Flutter app split..."
bash ../DaSi_eng/scripts/split-flutter.sh

echo "🔄 Step 4: Documentation repository..."
mkdir -p dasi-docs
cd dasi-docs
git init
echo "# DASI English Documentation" > README.md

# Copy shared documentation
cp -r ../DaSi_eng/docs/* . 2>/dev/null || true
cp ../DaSi_eng/FIREBASE_STORAGE_MIGRATION.md .
cp ../DaSi_eng/REPOSITORY_CLEANUP_STRATEGY.md .
cp ../DaSi_eng/PROJECT_STRUCTURE.md .

git add .
git commit -m "docs: initial documentation repository

- Shared documentation across all DASI projects
- Migration guides and architecture docs
- Project structure documentation"

cd ..

echo "🎉 Multi-project split completed!"
echo ""
echo "📂 New structure:"
echo "dasi-projects/"
echo "├── dasi-backend/     (Node.js TypeScript API)"
echo "├── dasi-web/         (React/Vite Web App)"
echo "├── dasi-mobile/      (Flutter Mobile App)"
echo "└── dasi-docs/        (Shared Documentation)"
echo ""
echo "📝 Next steps:"
echo "1. cd dasi-backend && npm install && npm run dev"
echo "2. cd dasi-web && npm install && npm run dev"
echo "3. cd dasi-mobile && flutter pub get && flutter run"
echo ""
echo "🔗 Create GitHub repositories:"
echo "- github.com/your-org/dasi-backend"
echo "- github.com/your-org/dasi-web"
echo "- github.com/your-org/dasi-mobile"
echo "- github.com/your-org/dasi-docs"