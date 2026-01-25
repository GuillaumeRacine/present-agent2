#!/bin/bash
# Weekly archival routine for Present-Agent2
# Run with: ./scripts/utils/weekly-archive.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

DATE=$(date +%Y-%m-%d)
echo "📦 Running weekly archive ($DATE)..."

# 1. Archive old logs
echo "  Archiving logs older than 7 days..."
mkdir -p logs/archive
find logs -maxdepth 1 -name "*.log" -type f -mtime +7 2>/dev/null | while read logfile; do
  if [ -f "$logfile" ]; then
    gzip "$logfile"
    mv "${logfile}.gz" logs/archive/ 2>/dev/null || true
    echo "    Archived $(basename $logfile)"
  fi
done

# 2. Archive old rebuild logs
echo "  Archiving rebuild logs..."
mkdir -p data/archive/rebuild-logs
find data -maxdepth 1 -name "rebuild-*.log" -type f 2>/dev/null | while read logfile; do
  if [ -f "$logfile" ]; then
    mv "$logfile" data/archive/rebuild-logs/
    echo "    Archived $(basename $logfile)"
  fi
done

# 3. Keep only latest backup in data/export
echo "  Cleaning old export backups..."
cd data/export
if ls products.json.bak.* 1> /dev/null 2>&1; then
  ls -t products.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true
  echo "    Cleaned old product backups"
fi
if ls export-summary.json.bak.* 1> /dev/null 2>&1; then
  ls -t export-summary.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true
  echo "    Cleaned old summary backups"
fi
cd "$PROJECT_ROOT"

# 4. Clean archives older than 90 days
echo "  Removing archives older than 90 days..."
find logs/archive -name "*.log.gz" -mtime +90 -delete 2>/dev/null || true
find data/archive -type f -mtime +90 -delete 2>/dev/null || true

# 5. Report
echo ""
echo "📊 Archive summary:"
echo "  Archived logs: $(ls -1 logs/archive 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Data archives: $(du -sh data/archive 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "✅ Weekly archive complete!"
