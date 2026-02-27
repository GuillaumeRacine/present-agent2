# Cleanup Quick Start Guide

**5-Minute Quick Cleanup** - Start here for immediate impact

---

## Immediate Actions (Run Now)

### 1. Clean macOS Metadata (1 min)

```bash
cd "/Volumes/Crucial X8/Code/Present-Agent2"
find . -name "._*" -type f -delete
```

**Impact**: Clean up 16,000+ metadata files

### 2. Remove Unused Dependencies (2 min)

```bash
npm uninstall axios body-parser commander wrap-ansi
```

**Impact**: ~5-10MB savings in node_modules

### 3. Remove Root-Level Test Files (1 min)

```bash
rm -f test-neo4j-connection.js test-neo4j-e76e.js test-priority-1.js
rm -f test-dialogue-turn.mjs test-emotional-intelligence.ts
rm -f test-listener-improvements.ts test-meaning-improvements.ts
rm -f test-storyteller-enhancement.ts test-validator-improvements.ts
rm -f demo-listener-enhancements.ts validate-listener-types.ts
rm -f test-edge.json
```

**Impact**: Cleaner root directory

### 4. Archive Old Logs (1 min)

```bash
mkdir -p logs/archive/enrichment-2025-12
mv enrich-*.log logs/archive/enrichment-2025-12/ 2>/dev/null || true
mv enrichment-*.log logs/archive/enrichment-2025-12/ 2>/dev/null || true
rm -f .enrichment.pid .enrichment-robust.pid
```

**Impact**: ~50MB+ log cleanup

---

## Automation Setup (10 min)

### Install Automation Scripts

Already created! Just test them:

```bash
# Test daily cleanup
./scripts/utils/daily-cleanup.sh

# Test log rotation
./scripts/utils/rotate-logs.sh

# Test dependency audit
./scripts/utils/audit-dependencies.sh

# Test weekly archive
./scripts/utils/weekly-archive.sh
```

### Add to package.json

```bash
npm pkg set scripts.clean:daily="./scripts/utils/daily-cleanup.sh"
npm pkg set scripts.clean:weekly="./scripts/utils/weekly-archive.sh"
npm pkg set scripts.logs:rotate="./scripts/utils/rotate-logs.sh"
npm pkg set scripts.audit:deps="./scripts/utils/audit-dependencies.sh"
```

Then use:

```bash
npm run clean:daily
npm run clean:weekly
npm run logs:rotate
npm run audit:deps
```

---

## Git Cleanup (5 min)

### Update .gitignore

Add these lines to .gitignore:

```bash
cat >> .gitignore << 'EOF'

# PID files
*.pid
.*.pid

# macOS metadata
._*

# Enrichment outputs
enrich-*.log
enrichment-*.log

# Checkpoint files (all variants)
*.checkpoint.json
.*.checkpoint.json

# Test edge files
test-edge*.json

# Build output
dist/

EOF
```

### Clean Git Tracking

```bash
# Remove files that should be ignored
git rm --cached .enrichment.pid .enrichment-robust.pid 2>/dev/null || true
git rm --cached enrich-*.log enrichment-*.log 2>/dev/null || true
git rm --cached .gift-attributes-checkpoint.json 2>/dev/null || true
git rm --cached test-edge.json 2>/dev/null || true

# Commit cleanup
git add .gitignore
git commit -m "chore: cleanup repository and improve .gitignore"
```

---

## Data Cleanup (15 min)

### Remove Old Backups

```bash
cd data/export

# Keep only the latest backup
ls -t products.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true
ls -t export-summary.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true

cd ../..
```

**Impact**: ~61MB savings

### Archive Rebuild Logs

```bash
mkdir -p data/archive/rebuild-logs
mv data/rebuild-*.log data/archive/rebuild-logs/ 2>/dev/null || true
```

**Impact**: ~1MB+ cleanup

### Archive Historical Analysis

```bash
mkdir -p data/archive/analysis-2025-11
mv data/interest-rebuild-state.json data/archive/analysis-2025-11/ 2>/dev/null || true
mv data/interest-stats.json data/archive/analysis-2025-11/ 2>/dev/null || true
mv data/duplicate-analysis.json data/archive/analysis-2025-11/ 2>/dev/null || true
```

**Impact**: ~4MB savings

---

## Total Impact Summary

After running all quick actions:

- **Disk space saved**: ~70-120MB
- **Files removed**: 16,000+ metadata files + test files
- **Repository**: Cleaner root directory and git status
- **Automation**: Daily/weekly cleanup scripts ready

---

## Next Steps

1. ✅ **Read the full report**: `CLEANUP_REPORT.md`
2. **Schedule automation**: Add cleanup scripts to cron or run manually
3. **Review scripts**: Organize scripts/ directory (see Phase 3 in report)
4. **Update docs**: Move implementation docs to archive (see Phase 2 in report)

---

## Maintenance Commands

```bash
# Daily (1 min)
npm run clean:daily

# Weekly (2 min)
npm run clean:weekly

# Monthly (5 min)
npm run audit:deps
npm audit fix
npm update

# As needed
npm run logs:rotate
```

---

## Help & Troubleshooting

### Scripts not executable?

```bash
chmod +x scripts/utils/*.sh
```

### Can't find scripts?

Make sure you're in the project root:

```bash
cd "/Volumes/Crucial X8/Code/Present-Agent2"
```

### Need to restore something?

All cleanup is safe - archived files are in:
- `logs/archive/`
- `data/archive/`

### Want more details?

See `CLEANUP_REPORT.md` for comprehensive analysis and recommendations.

---

**Quick Start Version**: 1.0
**Last Updated**: December 8, 2025
**Full Report**: CLEANUP_REPORT.md
