#!/bin/bash
# Flutter App Project Split Script

echo "🚀 Starting Flutter app project split..."

# Create new directory for Flutter app
mkdir -p ../dasi-mobile
cd ../dasi-mobile

# Initialize git
git init
echo "# DASI English Mobile Application" > README.md

# Copy Flutter files
cp -r ../DaSi_eng/flutter_app/* .
cp ../DaSi_eng/.gitignore .

# Create Flutter-specific gitignore
cat >> .gitignore << 'EOF'

# Flutter specific
**/ios/Flutter/flutter_assets/
**/ios/Flutter/App.framework
**/ios/Flutter/Flutter.framework
**/ios/Flutter/Generated.xcconfig
**/ios/Runner/GeneratedPluginRegistrant.*

# Android specific  
**/android/app/debug
**/android/app/profile
**/android/app/release
**/android/.gradle/

# Flutter build
**/build/
.dart_tool/
.packages
.pub-cache/
.pub/
EOF

# Update pubspec.yaml
cat > pubspec.yaml << 'EOF'
name: dasi_mobile
description: DASI English Learning Mobile App
version: 2.2.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"
  flutter: ">=3.10.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
EOF

echo "✅ Flutter app split completed: ../dasi-mobile/"
echo "📝 Next: cd ../dasi-mobile && flutter pub get"