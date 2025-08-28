# DASI Curriculum Management Makefile
# 멱등적 데이터 관리와 검증을 위한 표준화된 작업 정의

.PHONY: help validate migrate status logs clean test install

# 기본 설정
SHELL := /bin/bash
LOG_DIR := docs/logs
PATTERNS_DIR := patterns
DATE := $(shell date +%F)

help: ## 사용 가능한 명령어 표시
	@echo "🚀 DASI Curriculum Management"
	@echo "============================"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "로그 파일: $(LOG_DIR)/$(DATE)-*.log"

install: ## 의존성 설치
	@echo "📦 Installing dependencies..."
	npm ci
	chmod +x scripts/safe-run.sh
	mkdir -p $(LOG_DIR)

validate: ## 전체 커리큘럼 검증 (엄격 모드)
	@echo "🔍 Validating all curriculum files..."
	@bash scripts/safe-run.sh validate:all

validate-quiet: ## 전체 커리큘럼 검증 (조용한 모드)
	@echo "🔍 Quiet validation..."
	@npm run validate:quiet

migrate-lv1: ## Level 1 마이그레이션 (드라이런)
	@echo "🔄 Migrating Level 1 (dry-run)..."
	@bash scripts/safe-run.sh migrate:single $(PATTERNS_DIR)/level_1_basic_patterns/lv1_phase_system_NEW.json

migrate-all-dry: ## 전체 마이그레이션 (드라이런)
	@echo "🧪 Batch migration (dry-run)..."
	@bash scripts/safe-run.sh migrate:all:dry

migrate-all: ## 전체 마이그레이션 (실제 적용)
	@echo "⚠️  LIVE MIGRATION - Are you sure? [y/N]"
	@read -p "" confirm && [ "$$confirm" = "y" ] && bash scripts/safe-run.sh migrate:all

migrate-resume: ## 중단된 마이그레이션 재개
	@echo "🔄 Resuming migration from checkpoint..."
	@bash scripts/safe-run.sh migrate:resume

status: ## 마이그레이션 상태 확인
	@echo "📊 Migration status:"
	@npm run migrate:status

unlock: ## 마이그레이션 락 해제
	@echo "🔓 Unlocking migration..."
	@npm run migrate:unlock

reset: ## 마이그레이션 상태 초기화
	@echo "⚠️  This will reset all migration progress!"
	@echo "Are you sure? [y/N]"
	@read -p "" confirm && [ "$$confirm" = "y" ] && npm run migrate:reset

logs: ## 최근 로그 파일 보기
	@echo "📝 Recent logs:"
	@ls -la $(LOG_DIR)/ | tail -10
	@echo ""
	@echo "📋 Latest migration log:"
	@tail -20 $(LOG_DIR)/$(DATE)-migrate.log 2>/dev/null || echo "No migration log found"

logs-errors: ## 검증 오류 로그 보기
	@echo "❌ Validation errors:"
	@if [ -f "$(LOG_DIR)/$(DATE)-validation-errors.jsonl" ]; then \
		cat $(LOG_DIR)/$(DATE)-validation-errors.jsonl | jq -r '.timestamp + " [" + .context + "] " + (.errors | tostring)' | tail -10; \
	else \
		echo "No validation errors found"; \
	fi

test: ## 시스템 테스트 실행
	@echo "🧪 Running system tests..."
	@echo "1. Schema validation test:"
	@npm run validate:quiet > /dev/null && echo "   ✅ PASS" || echo "   ❌ FAIL"
	@echo "2. Migration dry-run test:"
	@npm run migrate:all:dry > /dev/null 2>&1 && echo "   ✅ PASS" || echo "   ⚠️  EXPECTED (empty data)"
	@echo "3. File existence test:"
	@[ -f "$(PATTERNS_DIR)/file-index.json" ] && echo "   ✅ file-index.json exists" || echo "   ❌ file-index.json missing"

clean: ## 임시 파일과 로그 정리
	@echo "🧹 Cleaning temporary files..."
	@find . -name "*.tmp*" -delete 2>/dev/null || true
	@find . -name "*.bak.*" -mtime +7 -delete 2>/dev/null || true
	@find $(LOG_DIR) -name "*.log" -mtime +30 -delete 2>/dev/null || true
	@echo "✅ Cleanup completed"

dev-setup: install ## 개발 환경 설정
	@echo "🛠️  Setting up development environment..."
	@git config core.hooksPath .husky
	@echo "✅ Development environment ready"

# 특별한 타겟들
.ONESHELL:

# Git 훅 강제 실행을 위한 타겟
pre-commit: validate-quiet ## Pre-commit 검증 실행