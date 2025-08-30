# External Resources - 대용량 파일 참조

## 📚 Vocabulary Resources

이전에 저장소에 포함되었던 대용량 PDF 파일들은 저장소 크기 최적화를 위해 외부 저장소로 이동되었습니다.

### 영어 단어장 자료
- **10000Headwords.pdf** (1.7MB) - 핵심 영어 단어 10,000개 리스트
- **10000Headwords-압축됨.pdf** (450KB) - 압축 버전
- **VOCABULARY LIST.pdf** (625KB) - 추가 단어장

### 다운로드 방법
1. **GitHub Releases**: 프로젝트 릴리즈 페이지에서 다운로드
2. **Firebase Storage**: 런타임에서 필요시 자동 다운로드  
3. **Local Setup**: 개발 환경에서 필요한 경우 별도 안내

### 개발자 참고사항
- 이 파일들은 `.gitignore`에 추가되어 더 이상 Git에 추적되지 않습니다
- 학습 데이터 처리 시 외부 저장소에서 로딩하는 구조로 변경되었습니다
- 로컬 개발 환경에서 필요한 경우 별도 다운로드 후 `docs/` 폴더에 배치하세요

## 🗃️ 학습 데이터 구조 변경

### 생성된 데이터 파일
- **level1_generated_data.json** - Level 1 학습 패턴 생성 데이터
- **banks_L3_completion_expanded.json** - Level 3 확장 완성 데이터

이러한 파일들은:
- 빌드 시점에 생성되거나 API에서 동적 로딩
- 더 이상 Git 저장소에서 관리하지 않음
- Firebase Firestore 또는 외부 Storage에서 관리

## 🔧 저장소 최적화 효과

**Before**: ~50-100MB 저장소 크기
**After**: ~10-20MB (80% 감소)

---
*Updated*: 2025-08-30
*Migration*: v2.2.0-restructure