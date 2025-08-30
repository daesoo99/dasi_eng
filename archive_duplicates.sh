#!/bin/bash
ARCHIVE_DIR="archive_duplicates/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

echo "=== 완전 중복 파일 아카이브 시작 ==="

# backups/ 폴더의 중복 파일들 (docs/에 동일한 파일 존재하는 것들)
echo "1. backups/ 중복 파일들을 아카이브로 이동:"
find . -name "*.md" -not -path "*/node_modules/*" -not -path "./md_cleanup_backup/*" -not -path "./archive_duplicates/*" -exec md5sum {} \; | sort | uniq -D -w32 | grep "backups/" | while read hash file; do
  echo "  이동: $file"
  mkdir -p "$ARCHIVE_DIR/$(dirname "$file")"
  mv "$file" "$ARCHIVE_DIR/$file"
done

# web_app/dist/patterns/ 중복 파일들 (public/에 동일한 파일 존재)
echo "2. web_app/dist/patterns/ 중복 파일들을 아카이브로 이동:"
find . -name "*.md" -not -path "*/node_modules/*" -not -path "./md_cleanup_backup/*" -not -path "./archive_duplicates/*" -exec md5sum {} \; | sort | uniq -D -w32 | grep "web_app/dist/patterns/" | while read hash file; do
  echo "  이동: $file"
  mkdir -p "$ARCHIVE_DIR/$(dirname "$file")"
  mv "$file" "$ARCHIVE_DIR/$file"
done

echo "=== 아카이브 완료 ==="
echo "아카이브 위치: $ARCHIVE_DIR"
