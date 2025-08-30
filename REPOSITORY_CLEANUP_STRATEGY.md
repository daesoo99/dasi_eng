# Repository Cleanup Strategy - 대용량 파일 문제 해결

## 🚨 현재 문제 상황

### 1. PDF 파일 (3.8MB)
```
docs/10000Headwords.pdf (1.7MB)
docs/10000Headwords-압축됨.pdf (450KB)
docs/VOCABULARY LIST.pdf (625KB)
```

### 2. 대량 JSON 데이터 (466개 파일)
```
web_app/public/patterns/banks/ (3.1MB)
- Level 1-10별로 466개 JSON 파일
- 학습 패턴 데이터가 저장소에 직접 커밋됨
```

### 3. Archive 폴더 node_modules (수백 MB)
```
archive/firebase_functions/node_modules/
- 전체 의존성 패키지가 Git에 커밋됨
- TypeScript 언어팩 등 수백 개 파일
```

## 🎯 해결 전략

### Phase 1: 즉시 정리 (Git History 유지)
1. **PDF 파일 → External Storage**
   - Firebase Storage 또는 GitHub Releases로 이동
   - README에 다운로드 링크 명시
   ```bash
   git rm docs/*.pdf
   echo "docs/*.pdf" >> .gitignore
   ```

2. **Archive node_modules 제거**
   ```bash
   git rm -r archive/firebase_functions/node_modules/
   echo "archive/*/node_modules/" >> .gitignore
   ```

3. **중복 JSON 데이터 정리**
   - `banks_*_expanded.json` 같은 중복 파일 제거
   - 최신 버전만 유지

### Phase 2: 구조적 개선 (Git LFS 도입)
1. **Pattern Banks → Git LFS**
   ```bash
   git lfs install
   echo "web_app/public/patterns/banks/*.json filter=lfs diff=lfs merge=lfs -text" >> .gitattributes
   git lfs migrate import --include="*.json" --include-ref=refs/heads/main
   ```

2. **학습 데이터 → Database Migration**
   - JSON 파일을 Firebase Firestore로 이동
   - 런타임에서 API로 로딩하는 구조로 변경

### Phase 3: CI/CD 최적화
1. **Build-time Generation**
   - 핵심 패턴 데이터만 저장소에 유지
   - 확장된 데이터는 빌드 시점에 생성

2. **Storage Architecture**
   ```
   Repository (Git): 코드 + 핵심 설정
   Firebase Storage: 대용량 학습 데이터
   Firestore: 동적 패턴 데이터
   CDN: 정적 assets (PDF, 이미지)
   ```

## 🔧 실행 계획

### Step 1: 백업 생성
```bash
git branch backup-before-cleanup
git tag v2.2.0-before-cleanup
```

### Step 2: .gitignore 강화
```
# Large binary files
*.pdf
*.mp3
*.wav
*.mp4

# Generated data
**/node_modules/
**/dist/
**/build/
**/*_expanded.json
**/*_generated*.json

# Temporary files
.tmp.*
*.tmp
```

### Step 3: 점진적 제거
1. Archive 정리 (즉시)
2. PDF 파일 이동 (즉시) 
3. JSON 데이터 구조 개선 (계획적)

## 📊 예상 효과

**Before**: 저장소 크기 ~50-100MB
**After**: 저장소 크기 ~10-20MB (80% 감소)

**장점**:
- 클론 속도 향상
- CI/CD 성능 개선
- 저장소 관리 용이성
- Git 작업 속도 향상

## ⚠️ 주의사항

1. **데이터 무결성**: 이동 전 백업 필수
2. **참조 업데이트**: 코드 내 파일 경로 수정 필요
3. **팀 동기화**: 변경사항 공유 및 가이드 제공
4. **점진적 적용**: 한 번에 모든 것을 변경하지 말 것

---
**Generated**: 2025-08-30
**Priority**: High (저장소 성능에 직접적 영향)