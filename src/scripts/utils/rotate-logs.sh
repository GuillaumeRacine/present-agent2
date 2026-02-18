#!/bin/bash
# Log rotation script for Present-Agent2
# Rotates logs when they exceed size limits

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

DATE=$(date +%Y-%m-%d-%H%M%S)
ARCHIVE_DIR="logs/archive"

mkdir -p "$ARCHIVE_DIR"

echo "📋 Rotating logs..."

# Rotate combined.log if over 10MB
if [ -f "logs/combined.log" ]; then
  if [ -f "/usr/bin/stat" ]; then
    # Linux
    SIZE=$(stat -c%s "logs/combined.log" 2>/dev/null || echo 0)
  else
    # macOS
    SIZE=$(stat -f%z "logs/combined.log" 2>/dev/null || echo 0)
  fi

  if [ "$SIZE" -gt 10485760 ]; then
    echo "  Rotating combined.log ($(($SIZE / 1048576))MB)..."
    gzip -c logs/combined.log > "$ARCHIVE_DIR/combined-$DATE.log.gz"
    > logs/combined.log  # Truncate
    echo "  ✅ Archived to $ARCHIVE_DIR/combined-$DATE.log.gz"
  else
    echo "  ℹ️  combined.log is under 10MB, skipping"
  fi
fi

# Rotate error.log if over 5MB
if [ -f "logs/error.log" ]; then
  if [ -f "/usr/bin/stat" ]; then
    SIZE=$(stat -c%s "logs/error.log" 2>/dev/null || echo 0)
  else
    SIZE=$(stat -f%z "logs/error.log" 2>/dev/null || echo 0)
  fi

  if [ "$SIZE" -gt 5242880 ]; then
    echo "  Rotating error.log ($(($SIZE / 1048576))MB)..."
    gzip -c logs/error.log > "$ARCHIVE_DIR/error-$DATE.log.gz"
    > logs/error.log  # Truncate
    echo "  ✅ Archived to $ARCHIVE_DIR/error-$DATE.log.gz"
  else
    echo "  ℹ️  error.log is under 5MB, skipping"
  fi
fi

# Delete archives older than 90 days
echo "  Cleaning archives older than 90 days..."
find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +90 -delete 2>/dev/null || true

echo ""
echo "✅ Log rotation complete!"
