#!/bin/bash
# Daily cleanup routine for Present-Agent2
# Run with: ./scripts/utils/daily-cleanup.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧹 Running daily cleanup..."

# 1. Clean macOS metadata files
echo "  Removing macOS metadata files..."
find . -name "._*" -type f -delete 2>/dev/null || true

# 2. Check log sizes and rotate if needed
echo "  Checking log sizes..."
if [ -f "logs/combined.log" ]; then
  if [ -f "/usr/bin/stat" ]; then
    # Linux
    SIZE=$(stat -c%s "logs/combined.log" 2>/dev/null || echo 0)
  else
    # macOS
    SIZE=$(stat -f%z "logs/combined.log" 2>/dev/null || echo 0)
  fi

  if [ "$SIZE" -gt 10485760 ]; then  # 10MB
    echo "  ⚠️  combined.log is >10MB, rotating..."
    if [ -x "./scripts/utils/rotate-logs.sh" ]; then
      ./scripts/utils/rotate-logs.sh
    else
      echo "  ⚠️  rotate-logs.sh not found or not executable"
    fi
  fi
fi

# 3. Clean old checkpoints (keep last 3)
echo "  Cleaning old checkpoints..."
cd data
ls -t .*.checkpoint.json 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
cd ..

# 4. Remove stale PID files
echo "  Removing stale PID files..."
find . -maxdepth 1 -name "*.pid" -type f -mtime +1 -delete 2>/dev/null || true

# 5. Clean temp logs in root
echo "  Cleaning temporary logs..."
find . -maxdepth 1 -name "enrich-*.log" -type f -mtime +7 -delete 2>/dev/null || true
find . -maxdepth 1 -name "enrichment-*.log" -type f -mtime +7 -delete 2>/dev/null || true

# 6. Report disk usage
echo ""
echo "📊 Disk usage summary:"
echo "  node_modules:  $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
echo "  data:          $(du -sh data 2>/dev/null | cut -f1 || echo 'N/A')"
echo "  logs:          $(du -sh logs 2>/dev/null | cut -f1 || echo 'N/A')"
echo "  dist:          $(du -sh dist 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "✅ Cleanup complete!"
