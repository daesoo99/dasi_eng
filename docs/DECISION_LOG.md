# DASI English - Architecture Decision Log (ADL)

**📋 Purpose**: 프로젝트의 중요한 아키텍처 결정사항을 시간순으로 기록하는 문서
**🎯 Target**: 미래의 개발자와 AI 에이전트가 결정 배경을 이해할 수 있도록 함
**📅 Created**: 2025-09-16

---

## 📋 Decision Record Template

```
## [DR-001] 제목 - YYYY-MM-DD

### Status
- ✅ Accepted / 🔄 Proposed / ❌ Deprecated

### Context
결정이 필요한 상황 설명

### Decision
최종 결정사항

### Rationale
결정의 근거와 고려사항

### Consequences
결정으로 인한 영향과 후속 작업

### Implementation
구현 방법과 담당자
```

---

## [DR-001] Plugin Architecture 완전 도입 - 2025-09-16

### Status
✅ **Accepted** - 구현 완료

### Context
프로젝트에서 24개의 Direct Web API 호출(`speechSynthesis.*`)이 여러 컴포넌트에 분산되어 있어 다음 문제들이 발생:

1. **테스트 어려움**: Direct API 호출로 인한 모킹 복잡성
2. **브라우저 의존성**: 서버사이드 렌더링(SSR) 환경에서 오류
3. **코드 결합도**: 비즈니스 로직과 Web API가 강결합
4. **CLAUDE.local 규칙 위반**: "Plugin Architecture First" 원칙 미준수

### Decision
**ServiceContainer 기반 Plugin Architecture 패턴 전면 도입**

- 모든 Direct Web API 호출을 플러그인 시스템으로 전환
- 비즈니스 로직 레이어에서 Direct API 사용 금지
- Implementation 레이어에서만 Direct API 허용

### Rationale

**1. 아키텍처 일관성**
- 의존성 주입(DI) 패턴으로 느슨한 결합 달성
- 환경별 구현체 교체 가능한 구조

**2. 테스트 용이성**
- Mock 객체를 통한 단위 테스트 개선
- ServiceContainer를 통한 테스트 격리

**3. 확장성**
- 새로운 TTS 엔진 추가 시 플러그인으로 확장
- 브라우저별 최적화 구현체 제공 가능

### Consequences

**✅ 긍정적 영향:**
- CLAUDE.local 규칙 100% 준수 달성
- 코드 유지보수성 향상
- 브라우저 호환성 개선
- 테스트 커버리지 증가 가능

**⚠️ 주의사항:**
- 초기 설정 복잡도 증가
- 개발자 학습 곡선 존재
- 번들 크기 약간 증가 (345KB → 추가 모듈)

### Implementation

**담당자**: Claude Code AI Assistant
**구현 기간**: 2025-09-16 (1일)
**구현 범위**:

| 컴포넌트 | 변경 전 | 변경 후 | 상태 |
|----------|---------|---------|------|
| PatternTrainingFlowSimple.tsx | `speechSynthesis.speak()` (12개) | `speechService.speakAnswer()` | ✅ |
| SettingsPage.tsx | `speechSynthesis.getVoices()` (5개) | `speechService.getAvailableVoices()` | ✅ |
| QuestionDisplay.tsx | `speechSynthesis.speak()` (1개) | `speechService.speakAnswer()` | ✅ |
| SpeakingFlowController.tsx | `speechSynthesis.cancel()` (2개) | `speechService.stopAllSpeech()` | ✅ |
| VoiceControls.tsx | `speechSynthesis.*` (4개) | ServiceContainer 패턴 | ✅ |

**커밋 기록**:
- Main Migration: `156c065` - Plugin Architecture 완전 마이그레이션
- Build Fix: `cf6717c` - async/await 빌드 오류 수정

---

## [DR-002] 프로젝트 문서화 표준화 - 2025-09-16

### Status
✅ **Accepted** - 문서 업데이트 완료

### Context
Plugin Architecture 마이그레이션 완료 후 프로젝트 문서들을 최신 상태로 유지해야 함

### Decision
- PROJECT_CONTEXT.md에 Plugin Architecture 섹션 추가
- DECISION_LOG.md 생성하여 아키텍처 결정사항 기록
- 향후 모든 중요 결정사항은 ADL 형식으로 기록

### Rationale
- AI 에이전트와의 바이브코딩 시 컨텍스트 유지
- 프로젝트 히스토리 추적
- 의사결정 배경 보존

### Consequences
- 문서 유지보수 비용 증가
- 결정 과정의 투명성 확보
- 새로운 팀원 온보딩 개선

### Implementation
**문서 업데이트 완료**: 2025-09-16
- PROJECT_CONTEXT.md: Plugin Architecture 섹션 추가
- DECISION_LOG.md: 초기 ADL 구조 생성

---

## 📝 Future Decisions

추후 기록될 결정사항들:
- [ ] 성능 최적화 전략
- [ ] 테스트 전략 개선
- [ ] CI/CD 파이프라인 구축
- [ ] 모바일 앱 아키텍처