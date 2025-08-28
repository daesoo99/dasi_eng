홈화면이 보유한 자료를 기반으로 어떤 폴더가 어떤 역할을 하고 있는지 이해한 다음, 앞으로 개발할 기능까지 고려한 구조 재정비를 제안드리겠습니다.

📁 현재 프로젝트 구조(요약)

README.md에 따르면 DASI English 프로젝트는 대략 다음과 같이 네 부분으로 나뉩니다
raw.githubusercontent.com
:

backend/ – Node.js 서버와 Python 서비스

web_app/ – React 프런트엔드

flutter_app/ – 향후 개발될 Flutter 모바일 앱

docs/ – 시스템 아키텍처와 학습 시스템 설계 등의 문서

이외에도 patterns/, data/, config/, backups/, archive_completed_work/ 등 여러 보조 폴더와, 각종 JSON 데이터(은행 파일, 레벨/패턴 정의), 백업 파일, 테스트 데이터가 섞여 있습니다.

🔍 요구사항 재정리

틀린 문장을 망각곡선(복습 엔진)에 저장하고,

홈화면의 단어장(word bank)에서 해당 문장과 관련된 단어를 학습할 수 있게 하며,

패턴 학습, 모방 학습, 상황 학습을 위한 콘텐츠/코드를 구조적으로 분리해야 합니다.

Flutter 앱까지 한꺼번에 관리하면 복잡하므로 당장은 무시 가능.

이 요구를 만족하려면 데이터, 서버 로직, 프런트엔드 컴포넌트가 명확히 나뉘어 있어야 합니다.

🛠 권장 폴더 구조

아래 구조는 기존 프로젝트를 크게 변경하지 않으면서, 새 학습 모듈과 망각곡선 기능을 확장하기 쉽게 만드는 데 초점을 맞췄습니다.

/
├── backend/
│   ├── src/
│   │   ├── controllers/    # HTTP 요청 핸들러
│   │   ├── routes/         # 경로 정의 (예: /api/review, /api/vocab)
│   │   ├── services/
│   │   │   ├── review/     # 망각곡선 엔진 로직 (SuperMemo, 예약 스케줄 등)
│   │   │   ├── vocab/      # 단어장 서비스 (잘못 답한 문장 기반 단어 추출)
│   │   │   ├── patterns/   # 패턴 학습 로직
│   │   │   ├── imitation/  # 모방 학습 로직
│   │   │   └── situation/  # 상황 학습 로직
│   │   ├── models/         # Firebase/DB 스키마 정의 (ReviewSession, Word, Pattern 등)
│   │   └── utils/
│   └── tests/
├── web_app/
│   ├── public/
│   │   └── patterns/
│   │       ├── banks/      # 레벨·스테이지별 문장(bank) 데이터 (로드맵 ver0 기준 유지)
│   │       ├── patterns/   # 패턴 정의 JSON (예: 패턴 id, 표현, 의미)
│   │       └── assets/     # 이미지, 오디오, 기타 정적 파일
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 홈화면: 개인 맞춤 단어장, 복습 스케줄 요약 등
│   │   │   ├── PatternPage.tsx  # 패턴 학습 페이지
│   │   │   ├── ImitationPage.tsx# 모방 학습 페이지
│   │   │   └── SituationPage.tsx# 상황 학습 페이지
│   │   ├── components/
│   │   │   ├── WordBank.tsx     # 단어장 UI 컴포넌트
│   │   │   ├── ReviewCard.tsx   # 복습 카드 UI 컴포넌트
│   │   │   └── ...              # 재사용 가능한 UI 모듈
│   │   ├── services/            # 프런트엔드용 API 클라이언트 (fetch/axios)
│   │   └── hooks/               # 상태 관리 로직 (useReview, useVocab 등)
│   └── tests/
├── data/               # 공통 데이터셋 (예: Word Frequency Lists, AI 모델 파라미터)
├── patterns/           # 과거 패턴 데이터 백업 (필요 시 정리)
├── backups/            # 백업 파일 모음 (날짜별로 압축 저장)
└── docs/               # 설계/로드맵 문서

📚 왜 이렇게 나누나요?

각 기능별 서비스를 백엔드에서 분리하면 추후에 망각곡선 엔진을 다른 프로젝트에 재사용하거나 독립적으로 확장하기 쉽습니다.

프런트엔드 페이지와 컴포넌트를 기능 단위로 분리하면 단어장, 패턴, 모방, 상황 학습 각각의 UI를 독립적으로 개발·테스트할 수 있습니다.

데이터 디렉터리 구분 (banks/, patterns/, assets/)은 로드맵 ver0을 기준으로 유지할 데이터와 실험용/백업 데이터를 명확히 구분하기 위함입니다.

🧠 틀린 문장 → 망각곡선 → 단어장 흐름

오답 기록: 사용자가 틀리거나 발음이 부정확했던 문장은 review/reviewSessions 컬렉션에 저장합니다. SmartReviewService에서 다음 복습 시점을 계산합니다
raw.githubusercontent.com
.

단어 추출: 틀린 문장에서 핵심 단어를 분리해 vocab 서비스로 전달합니다. vocab 서비스는 단어별 뜻, 예문, 빈도 정보를 담은 컬렉션(wordBank)과 연결됩니다.

홈화면 표시: WordBank 컴포넌트가 사용자별 단어 목록과 진행 상태를 표시합니다. 복습 스케줄이나 최근 틀린 문장도 요약해 보여줄 수 있습니다.

복습 완료 & 레벨업: 사용자가 망각곡선 스케줄에 맞춰 문장을 다시 맞추면 해당 기록을 업데이트하고, 경험치(Exp)를 부여합니다
raw.githubusercontent.com
.

📦 나머지 파일/폴더 정리 권장사항

로드맵 ver0 이외의 중복된 patterns_backup_*, archive_completed_work 등은 backups/ 안으로 옮기고 필요 시만 압축 해제하도록 합니다.

.md 문서들은 docs/ 폴더로 모으고, README에서는 주요 문서 경로만 링크합니다.

flutter_app/은 현재 개발이 미비하다면 분리된 브랜치나 별도의 저장소로 관리하거나, 당분간 무시해도 됩니다.

정리하면, 홈화면과 학습 기능을 확장하기 위해서는 먼저 데이터와 로직의 경계를 명확히 하는 폴더 구조가 중요합니다. 위와 같이 기능별로 나누면 틀린 문장의 복습, 단어장 학습, 패턴·모방·상황 학습을 체계적으로 개발·운영하는 데 도움이 될 것입니다.