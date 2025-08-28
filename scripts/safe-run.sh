#!/usr/bin/env bash
# 안전한 마이그레이션 실행기 - 완전한 로깅과 감사 추적
set -euo pipefail

# 설정
LOG_DIR="docs/logs"
DATE=$(date +%F)
TIME=$(date +%T)
MIGRATE_LOG="$LOG_DIR/$DATE-migrate.log"
VALIDATE_LOG="$LOG_DIR/$DATE-validate.log"

# 로그 디렉토리 확인
mkdir -p "$LOG_DIR"

# 함수: 타임스탬프와 함께 로그 출력
log_with_timestamp() {
    echo "[$DATE $TIME] $*" | tee -a "$MIGRATE_LOG"
}

# 함수: JSON 검증 오류를 구조화된 형태로 로깅
log_validation_error() {
    local file="$1"
    local error_json="$2"
    
    cat >> "$VALIDATE_LOG" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "file": "$file",
  "validation_error": $error_json
}
EOF
    echo "," >> "$VALIDATE_LOG"  # JSON array separator
}

# 메인 실행
main() {
    log_with_timestamp "🚀 Safe Migration Runner Started"
    log_with_timestamp "Arguments: $*"
    
    # 명령 실행 및 로깅
    case "${1:-help}" in
        "migrate:all")
            log_with_timestamp "📦 Starting batch migration (live mode)"
            npm run migrate:all 2>&1 | tee -a "$MIGRATE_LOG"
            ;;
        "migrate:all:dry")
            log_with_timestamp "🧪 Starting batch migration (dry-run mode)"
            npm run migrate:all:dry 2>&1 | tee -a "$MIGRATE_LOG"
            ;;
        "migrate:resume")
            log_with_timestamp "🔄 Resuming migration from checkpoint"
            npm run migrate:resume 2>&1 | tee -a "$MIGRATE_LOG"
            ;;
        "validate:all")
            log_with_timestamp "🔍 Starting comprehensive validation"
            # JSON 에러 로그 초기화
            echo "[" > "$VALIDATE_LOG"
            npm run validate:all 2>&1 | tee -a "$MIGRATE_LOG"
            # JSON 배열 닫기
            sed -i '$ s/,$//' "$VALIDATE_LOG" 2>/dev/null || true
            echo "]" >> "$VALIDATE_LOG"
            ;;
        "migrate:single")
            if [ -z "${2:-}" ]; then
                log_with_timestamp "❌ Error: File path required for single migration"
                exit 1
            fi
            log_with_timestamp "📄 Starting single file migration: $2"
            node utils/safe-migrator.js --file "$2" 2>&1 | tee -a "$MIGRATE_LOG"
            ;;
        "help"|*)
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  migrate:all         - Batch migration (live mode)"
            echo "  migrate:all:dry     - Batch migration (dry-run mode)"
            echo "  migrate:resume      - Resume from checkpoint"
            echo "  validate:all        - Comprehensive validation"
            echo "  migrate:single FILE - Single file migration"
            echo ""
            echo "Logs are saved to:"
            echo "  Migration: $MIGRATE_LOG"
            echo "  Validation: $VALIDATE_LOG"
            ;;
    esac
    
    # 실행 결과 로깅
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_with_timestamp "✅ Operation completed successfully"
    else
        log_with_timestamp "❌ Operation failed with exit code $exit_code"
    fi
    
    log_with_timestamp "📊 Operation summary logged to $MIGRATE_LOG"
    return $exit_code
}

# 스크립트 실행
main "$@"