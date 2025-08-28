# Assets Directory

이 폴더는 DaSi English 학습 시스템의 정적 자산들을 관리합니다.

## 폴더 구조

```
assets/
├── audio/          # TTS 음성 파일, 발음 가이드
├── images/         # 학습 콘텐츠 이미지, 아이콘
└── README.md       # 이 파일
```

## 사용 지침

### audio/ 폴더
- **TTS 파일**: `tts_[sentence_id].mp3` 형식으로 저장
- **발음 가이드**: `pronunciation_[word].mp3` 형식
- **예시**: 
  - `tts_lv1_p1_s01_001.mp3` (Level 1, Phase 1, Stage 1의 첫 번째 문장)
  - `pronunciation_happy.mp3` (단어 'happy'의 발음)

### images/ 폴더
- **레벨 아이콘**: `level_[number]_icon.png`
- **상황 이미지**: `situation_[context].jpg` (예: `situation_restaurant.jpg`)
- **UI 요소**: `ui_[element].svg` (예: `ui_microphone.svg`)

## 파일 명명 규칙

1. **레벨별 구분**: 파일명에 `lv[숫자]` 포함
2. **소문자 사용**: 모든 파일명은 소문자
3. **언더스코어**: 공백 대신 `_` 사용
4. **확장자**: 
   - 음성: `.mp3`, `.wav`
   - 이미지: `.jpg`, `.png`, `.svg`

## 최적화 가이드

### 음성 파일
- 품질: 44.1kHz, 16bit
- 포맷: MP3 (용량 효율성)
- 길이: 문장당 최대 10초

### 이미지 파일
- 해상도: 최대 1920px (가로)
- 압축: WebP 권장, PNG/JPG 허용
- 용량: 개별 파일 최대 500KB

## 업데이트 로그

- 2025-08-28: 초기 구조 생성 (v2.2.0-restructure)