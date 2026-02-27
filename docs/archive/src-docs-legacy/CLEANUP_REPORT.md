# Present-Agent2 Codebase Cleanup Report

**Generated**: December 8, 2025
**Analysis Scope**: Complete repository structure, dependencies, logs, and code quality
**Total TypeScript Files**: 226
**Total Node Modules Size**: 600M (200M backend + 400M frontend)
**Total Data Directory Size**: 696M

---

## Executive Summary

This comprehensive analysis identified several opportunities for cleanup and optimization:

- **35.2M** in log files that can be archived or deleted
- **234M** in duplicate/backup data files
- **504** git-tracked changes (large uncommitted state)
- **16,000+** macOS metadata files (._*) that should be cleaned
- **4** unused npm dependencies
- **13** root-level test/debug files that should be moved
- **12** root-level markdown docs that need organization
- **47+** old rebuild log files in data directory
- **21** test scripts and **10** check scripts that need review

---

## 1. File Organization

### 1.1 Root Directory Cleanup

**CRITICAL: Root directory has too many files (13 test/debug scripts + 12 markdown docs)**

#### Files to Move/Archive

```bash
# Test files in root (should be in scripts/ or deleted)
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-neo4j-connection.js
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-neo4j-e76e.js
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-priority-1.js
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-dialogue-turn.mjs
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-emotional-intelligence.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-listener-improvements.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-meaning-improvements.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-storyteller-enhancement.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-validator-improvements.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/demo-listener-enhancements.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/validate-listener-types.ts
rm -f /Volumes/Crucial\ X8/Code/Present-Agent2/test-edge.json

# Shell scripts in root (consolidate or move)
# Keep: run-enrichment-robust.sh, check-progress.sh, setup-frontend.sh
# Archive others to scripts/legacy/
mkdir -p scripts/legacy
mv /Volumes/Crucial\ X8/Code/Present-Agent2/run-enrich-loop.sh scripts/legacy/
mv /Volumes/Crucial\ X8/Code/Present-Agent2/test-api.sh scripts/legacy/
mv /Volumes/Crucial\ X8/Code/Present-Agent2/test-edge-cases.sh scripts/legacy/
```

#### Markdown Documentation to Consolidate

Move to `docs/archive/enrichment/` or delete if superseded:

```bash
mkdir -p docs/archive/enrichment

# These are implementation summaries - archive them
mv ENRICHMENT_AUTOMATION_GUIDE.md docs/archive/enrichment/
mv ENRICHMENT_FIX_SUMMARY.md docs/archive/enrichment/
mv HYBRID_ENRICHMENT_SUMMARY.md docs/archive/enrichment/
mv MULTI_LLM_ARCHITECTURE.md docs/archive/enrichment/
mv MULTI_LLM_IMPLEMENTATION_SUMMARY.md docs/archive/enrichment/
mv MULTI_LLM_QUICK_START.md docs/archive/enrichment/
mv FIX_SUMMARY.md docs/archive/enrichment/
mv LLM_API_FIX_REPORT.md docs/archive/enrichment/
mv IMPLEMENTATION_COMPLETE.md docs/archive/enrichment/
mv RECOMMENDATION_QUALITY_TEST_RESULTS.md docs/archive/enrichment/

# Keep these in root (active references):
# - README.md
# - ENRICHMENT_STATUS.md (actively monitored)
# - ENRICHMENT_QUICK_REFERENCE.md (quick reference)
```

### 1.2 Scripts Directory Organization

**Current State**: 67+ TypeScript scripts with overlapping purposes

#### Recommended Organization

```
scripts/
├── core/                    # Core operational scripts
│   ├── setup-schema.ts
│   ├── ingest-products.ts
│   ├── chat.ts
│   └── start-dev.ts
├── enrichment/              # All enrichment scripts
│   ├── enrich-products-robust.ts
│   ├── enrich-attributes-multi-llm.ts
│   ├── enrich-attributes-only.ts
│   ├── enrich-attributes-focused.ts
│   └── enrich-products-hybrid.ts
├── testing/                 # Test scripts
│   ├── test-personas.ts
│   ├── test-real-user-scenarios.ts
│   ├── test-recommendations.ts
│   └── ... (21 test scripts)
├── validation/              # Check/verify scripts
│   ├── check-env.ts
│   ├── check-attribute-status.ts
│   ├── verify-enrichment.ts
│   └── ... (10 check scripts)
├── analysis/                # Data analysis
│   ├── analyze-product-stats.ts
│   ├── graph-audit.ts
│   ├── inspect-data.ts
│   └── analyze-duplicates.ts
├── maintenance/             # Data maintenance
│   ├── normalize-interests.ts
│   ├── fix-orphaned-products.ts
│   ├── cleanup-orphaned-interests.ts
│   └── tag-occasions.ts
├── legacy/                  # Deprecated scripts
│   └── ... (old scripts)
└── examples/
    └── run-hybrid-enrichment-example.sh
```

**Action Items**:
```bash
# Create new structure
mkdir -p scripts/{core,enrichment,testing,validation,analysis,maintenance,legacy}

# Core scripts (already in good location)
# Enrichment scripts (group together)
# Testing scripts (move test-*)
# Validation scripts (move check-*, verify-*)
# Analysis scripts (move analyze-*, inspect-*, investigate-*)
# Maintenance scripts (move normalize-*, fix-*, cleanup-*, tag-*)
```

---

## 2. Dead Code Elimination

### 2.1 Unused Dependencies

**Found 4 unused dependencies** (via depcheck):

```bash
npm uninstall axios body-parser commander wrap-ansi
```

**Reasoning**:
- `axios`: Not found in imports scan (project may use native fetch)
- `body-parser`: Built into Express 5.x, redundant
- `commander`: Not found in active scripts
- `wrap-ansi`: Not found in active code

**Estimated savings**: ~5-10MB in node_modules

### 2.2 Duplicate/Overlapping Scripts

**Scripts with similar functionality (candidates for consolidation)**:

```typescript
// Enrichment scripts (5 variants)
scripts/enrich-products-robust.ts
scripts/enrich-products-hybrid.ts
scripts/enrich-attributes-multi-llm.ts
scripts/enrich-attributes-only.ts
scripts/enrich-attributes-focused.ts

// Recommendation: Keep enrich-attributes-multi-llm.ts and enrich-products-robust.ts
// Archive or delete the others after confirming they're superseded

// Check scripts (10 variants)
scripts/check-attribute-status.ts
scripts/check-unenriched.ts
scripts/check-zero-enrichment.ts
scripts/check-needs-enrichment.ts
scripts/verify-enrichment.ts
scripts/verify-attribute-mapping.ts
// Recommendation: Consolidate into a single validation suite

// Test enrichment logic (multiple iterations)
scripts/test-enrichment-logic.ts
scripts/test-enrichment-100.ts
scripts/test-enrichment-batch.ts
scripts/test-multi-llm-fallback.ts
// Recommendation: Keep test-multi-llm-fallback.ts, archive others
```

### 2.3 Console.log Usage

**Found 489 console.log statements** across TypeScript files

**Recommendation**: Replace with structured logging

```bash
# Priority files to refactor (highest console.log count):
# - scripts/query-conversation.ts: 12
# - scripts/populate-gift-attributes.ts: 20
# - scripts/find-wine-products.ts: 17
# - scripts/check-neo4j.ts: 24
# - scripts/tag-occasions.ts: 5
# - scripts/setup-schema.ts: 41
# - scripts/verify-attribute-mapping.ts: 17
# - scripts/chat.ts: 22

# Good: src/server.ts and src/services/ mostly use logger
# Only 15 console.log in src/ directory (acceptable for debugging)
```

### 2.4 TODO/FIXME Comments

**Found 7 files with TODO/FIXME/HACK comments**:

```bash
# Review and address:
src/server.ts
src/services/agents/validator.ts
src/services/agents/constraints.ts
src/services/orchestrator.ts
frontend/app/api/products/stats/route.ts
frontend/app/api/products/route.ts
src/services/agents/learning.ts
```

---

## 3. Log & Debug File Management

### 3.1 Current Log Situation

**Total log size: ~35.2M**

```
Main Logs:
- logs/combined.log        : 23M  (ACTIVE - contains all logs)
- logs/error.log           : 12M  (ACTIVE - errors only)
- logs/multi-llm-enrichment-full.log : 164K
- logs/attribute-enrichment-full.log : 296K

Root Level Logs (should be moved):
- enrichment-final.log     : 48K
- enrich-20251203-052644.log : (size varies)
- enrich-20251203-052814.log : (size varies)
- enrich-20251203-055845.log : (size varies)
- enrichment-robust-20251203-073855.log : (size varies)
- enrichment-live.log      : (size varies)

Data Directory Logs (47+ rebuild logs):
- data/rebuild-batch-*.log : 8K each × 47+ files = ~376K+
- data/rebuild-*.log       : Various sizes
```

### 3.2 Cleanup Actions

```bash
# 1. Archive old enrichment logs
mkdir -p logs/archive/enrichment-2025-12
mv /Volumes/Crucial\ X8/Code/Present-Agent2/enrich-*.log logs/archive/enrichment-2025-12/
mv /Volumes/Crucial\ X8/Code/Present-Agent2/enrichment-*.log logs/archive/enrichment-2025-12/

# 2. Archive rebuild logs
mkdir -p data/archive/rebuild-logs
mv /Volumes/Crucial\ X8/Code/Present-Agent2/data/rebuild-*.log data/archive/rebuild-logs/

# 3. Rotate main logs (they're 23M + 12M = 35M)
cd logs
gzip combined.log && mv combined.log.gz archive/combined-2025-12-08.log.gz
gzip error.log && mv error.log.gz archive/error-2025-12-08.log.gz

# 4. Clean up attribute enrichment logs (keep latest only)
mkdir -p logs/archive/attribute-enrichment
mv logs/attribute-debug.log logs/archive/attribute-enrichment/
mv logs/attribute-test-*.log logs/archive/attribute-enrichment/
mv logs/enrichment-retry*.log logs/archive/attribute-enrichment/
```

### 3.3 Log Rotation Strategy

**Implement automated log rotation**:

```javascript
// Add to package.json scripts
{
  "logs:rotate": "node scripts/rotate-logs.js",
  "logs:clean": "find logs -name '*.log' -mtime +30 -delete"
}
```

**Create rotation script**:
```bash
# scripts/rotate-logs.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d)
ARCHIVE_DIR="logs/archive"

mkdir -p "$ARCHIVE_DIR"

# Rotate if over 10MB
if [ -f "logs/combined.log" ] && [ $(stat -f%z "logs/combined.log") -gt 10485760 ]; then
  gzip -c logs/combined.log > "$ARCHIVE_DIR/combined-$DATE.log.gz"
  > logs/combined.log  # Truncate
fi

if [ -f "logs/error.log" ] && [ $(stat -f%z "logs/error.log") -gt 5242880 ]; then
  gzip -c logs/error.log > "$ARCHIVE_DIR/error-$DATE.log.gz"
  > logs/error.log  # Truncate
fi

# Delete archives older than 90 days
find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +90 -delete
```

### 3.4 Sensitive Data Check

**Logs checked for sensitive data patterns**:
- ✅ No API keys found (using logger.ts with proper redaction)
- ✅ No credentials found
- ⚠️ May contain user emails/queries (by design for debugging)

**Recommendation**: Ensure logs/ is in .gitignore (already is ✅)

---

## 4. Test & Debug Infrastructure

### 4.1 Test Files Organization

**Current State**:
- 21 `test-*.ts` scripts in scripts/
- 10 `check-*.ts` validation scripts
- Test directories: `src/test/`, `src/lib/__tests__/`, `src/services/agents/__tests__/`
- vitest configured (190/190 tests passing ✅)

**Recommendations**:

```bash
# Consolidate test scripts
mkdir -p scripts/testing
mv scripts/test-*.ts scripts/testing/

# Keep critical tests:
# - scripts/testing/test-personas.ts (production testing)
# - scripts/testing/test-real-user-scenarios.ts (production testing)

# Archive exploratory tests:
mkdir -p scripts/testing/exploratory
mv scripts/testing/test-connection.ts scripts/testing/exploratory/
mv scripts/testing/test-workflow.ts scripts/testing/exploratory/
mv scripts/testing/test-edge-cases.ts scripts/testing/exploratory/
mv scripts/testing/test-cache.ts scripts/testing/exploratory/
mv scripts/testing/test-actual-query.ts scripts/testing/exploratory/
mv scripts/testing/test-phase-*.ts scripts/testing/exploratory/

# Archive LLM test iterations (keep latest only):
mv scripts/testing/test-llm-direct.ts scripts/testing/exploratory/
mv scripts/testing/test-llm-fixed.ts scripts/testing/exploratory/
mv scripts/testing/test-enrichment-*.ts scripts/testing/exploratory/
```

### 4.2 Debug Infrastructure

**Current State**: Good ✅
- Winston logger properly configured
- Structured logging in place
- LOG_LEVEL environment variable supported

**Recommendations**:
- ✅ Error tracking is comprehensive
- ✅ Critical paths have logging
- 🔧 Add debug logging to enrichment pipeline (already has checkpointing)

---

## 5. Dependencies & Security

### 5.1 Dependency Analysis

**Installed**: 28 production dependencies + 4 dev dependencies

**Unused (to remove)**:
```bash
npm uninstall axios body-parser commander wrap-ansi
```

**Update Recommendations**:
```bash
# Check for updates
npm outdated

# Major packages to review:
# - @anthropic-ai/sdk: ^0.71.0 (check for updates)
# - @google/generative-ai: ^0.24.1 (check for updates)
# - openai: ^4.20.0 (check for updates)
# - neo4j-driver: ^5.15.0 (check for updates)
# - express: ^5.1.0 (recently upgraded, good ✅)

# Run security audit
npm audit
npm audit fix
```

### 5.2 Security Vulnerabilities

```bash
# Run comprehensive security check
npm audit --production

# Expected output: Review and fix any HIGH or CRITICAL issues
```

### 5.3 TypeScript Types

**Current State**: Good ✅
- All major dependencies have @types packages
- Project compiles without errors
- 226 TypeScript files with proper typing

---

## 6. Data Directory Cleanup

### 6.1 Current State

**Total Size**: 696M

```
Breakdown:
- data/raw/                 : ~150M (product JSON files)
- data/export/products.json : 173M (current export)
- data/export/products.json.bak.* : 234M (2 backups @ 61M + 173M)
- data/export/facets.json   : 32M
- data/*.log                : ~1M (47+ rebuild logs)
- data/*.json               : Various checkpoints and stats
```

### 6.2 Cleanup Actions

```bash
# 1. Remove old backup files (keep latest backup only)
cd data/export
rm products.json.bak.2025-11-26T20-23-58-201Z
rm export-summary.json.bak.2025-11-26T20-23-58-201Z
# Keep: products.json.bak.2025-11-27T00-40-01-055Z (latest backup)

# Savings: ~61M

# 2. Archive rebuild logs
mkdir -p data/archive/rebuild-logs
mv data/rebuild-*.log data/archive/rebuild-logs/

# Savings: ~1M + cleanup

# 3. Review large analysis files
# - data/interest-rebuild-state.json : 1.6M (historical, can archive)
# - data/interest-stats.json         : 1.6M (historical, can archive)
# - data/duplicate-analysis.json     : 771K (historical, can archive)

mkdir -p data/archive/analysis-2025-11
mv data/interest-rebuild-state.json data/archive/analysis-2025-11/
mv data/interest-stats.json data/archive/analysis-2025-11/
mv data/duplicate-analysis.json data/archive/analysis-2025-11/

# Savings: ~4M

# 4. Clean old checkpoints (keep active ones only)
# Keep:
# - .enrichment-checkpoint.json (580K - may be active)
# - .enrich-attributes-multi-llm-checkpoint.json (1K - active)
# - .ingestion-checkpoint.json (136B - active)

# Archive:
mv data/.enrichment-robust-checkpoint.json data/archive/ 2>/dev/null || true

# 5. Review raw data (150M)
# - Multiple category JSON files (Arts, Apparel, etc.) - likely duplicated in DB
# - "products 23_11_2025.json" (101M) - newest import file
# Recommendation: Keep latest (products 23_11_2025.json), archive older category files

mkdir -p data/archive/raw-imports-2025-10
mv data/raw/Antiques*.json data/archive/raw-imports-2025-10/
mv data/raw/Apparel*.json data/archive/raw-imports-2025-10/
mv data/raw/Arts*.json data/archive/raw-imports-2025-10/
mv data/raw/Autos*.json data/archive/raw-imports-2025-10/
mv data/raw/Beauty*.json data/archive/raw-imports-2025-10/
mv data/raw/Gift*.json data/archive/raw-imports-2025-10/
mv data/raw/Product.json data/archive/raw-imports-2025-10/
mv data/raw/Produits*.json data/archive/raw-imports-2025-10/
# Keep: data/raw/products\ 23_11_2025.json (latest comprehensive import)

# Savings: ~50M
```

**Total potential savings: 61M + 4M + 50M = ~115M (16% reduction)**

### 6.3 Data Retention Policy

```markdown
## Data Retention Policy

### Keep Forever
- `data/canonical_taxonomy.json` - Core taxonomy
- `data/export/products.json` - Current product export
- `data/export/facets.json` - Current facets
- `data/raw/products 23_11_2025.json` - Latest import file

### Keep 1 Backup
- `data/export/products.json.bak.*` - Keep latest backup only

### Archive After 30 Days
- Checkpoint files (*.checkpoint.json)
- Analysis files (duplicate-analysis, interest-stats, etc.)
- Log files (rebuild-*.log)

### Archive After Import to DB
- Raw category files (Antiques*.json, Apparel*.json, etc.)
- After confirming data is in Neo4j, move to data/archive/

### Delete After 90 Days
- Archived log files
- Old checkpoint files in archive/
```

---

## 7. macOS Metadata Cleanup

**Found 16,000+ ._* metadata files** (AppleDouble format)

These are macOS extended attribute files created on external drives.

```bash
# Clean all ._* files (safe to delete)
find /Volumes/Crucial\ X8/Code/Present-Agent2 -name "._*" -type f -delete

# Add to .gitignore (already present ✅)
echo "._*" >> .gitignore

# Prevent creation (configure external drive)
# Note: This is a macOS system behavior on non-HFS+ volumes
```

**Savings**: Minimal storage (~64KB) but cleaner file listings

---

## 8. Git Repository Cleanup

### 8.1 Current State

**504 modified/untracked files** - Repository is in a large uncommitted state

```bash
# Key issues:
# - Many node_modules changes (from package updates)
# - Large number of deleted files not staged
# - New untracked documentation files
# - PID files and logs tracked

# Check what's actually changed
git status
git diff --stat
```

### 8.2 Recommended Actions

```bash
# 1. Review .gitignore completeness
# Already has:
# - logs/
# - *.log
# - *.pid
# - *.checkpoint.json
# But many files aren't being ignored properly

# 2. Update .gitignore
cat >> .gitignore << 'EOF'

# PID files
*.pid
.*.pid

# macOS metadata
._*
.DS_Store

# Enrichment outputs
enrich-*.log
enrichment-*.log

# Checkpoint files (all variants)
*.checkpoint.json
.*.checkpoint.json

# Test edge files
test-edge*.json

# Archive directories
**/archive/

EOF

# 3. Clean up tracked files that should be ignored
git rm --cached .enrichment.pid .enrichment-robust.pid
git rm --cached enrich-*.log enrichment-*.log
git rm --cached .gift-attributes-checkpoint.json
git rm --cached test-edge.json
git rm --cached data/.enrichment-checkpoint.json
git rm --cached data/.enrichment-robust-checkpoint.json
# etc...

# 4. Commit the cleanup
git add .gitignore
git commit -m "Clean up repository: improve .gitignore and remove tracked artifacts"

# 5. Review and stage actual code changes
git add -p  # Interactive staging
```

### 8.3 Git History Cleanup (Optional)

**Warning**: Only if repository is private and you have backups

```bash
# Remove large files from history (if any)
git filter-repo --strip-blobs-bigger-than 10M --force

# Or use BFG Repo-Cleaner for more comprehensive cleanup
```

---

## 9. Proposed Directory Structure

### 9.1 Current vs Proposed

```
CURRENT:
Present-Agent2/
├── *.md (13 files - too many)
├── *.ts (13 test files in root)
├── *.js (3 test files in root)
├── *.log (7 log files in root)
├── *.pid (2 pid files in root)
├── *.sh (7 shell scripts in root)
├── scripts/ (67+ TypeScript files, flat)
├── src/ (good organization ✅)
├── frontend/ (good organization ✅)
├── data/ (696M, needs cleanup)
├── logs/ (35M, needs rotation)
├── docs/ (good, but some consolidation needed)
└── dist/ (816K, should be in .gitignore)

PROPOSED:
Present-Agent2/
├── README.md                    # Main readme
├── ENRICHMENT_STATUS.md         # Active monitoring doc
├── package.json
├── tsconfig.json
├── .env.local                   # (gitignored)
├── scripts/
│   ├── core/                    # Essential operational scripts
│   ├── enrichment/              # All enrichment variants
│   ├── testing/                 # Test scripts
│   │   └── exploratory/         # One-off test scripts
│   ├── validation/              # Check/verify scripts
│   ├── analysis/                # Data analysis scripts
│   ├── maintenance/             # Data maintenance
│   ├── legacy/                  # Deprecated scripts
│   └── utils/                   # Helper utilities
├── src/                         # ✅ Already well organized
├── frontend/                    # ✅ Already well organized
├── data/
│   ├── raw/                     # Current imports only
│   ├── export/                  # Current exports + 1 backup
│   ├── processed/               # Processed data
│   ├── archive/                 # Historical data
│   │   ├── raw-imports-2025-10/
│   │   ├── analysis-2025-11/
│   │   └── rebuild-logs/
│   ├── canonical_taxonomy.json
│   └── *.checkpoint.json        # Active checkpoints only
├── logs/
│   ├── combined.log             # Current logs (rotated at 10MB)
│   ├── error.log                # Current error logs (rotated at 5MB)
│   └── archive/                 # Rotated logs (gzipped)
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── guides/
│   ├── reports/
│   ├── runbooks/
│   └── archive/
│       ├── enrichment/          # Enrichment implementation docs
│       ├── implementations/
│       ├── sessions/
│       └── phase-ab/
├── dist/                        # Build output (gitignored)
└── test-results/                # Test outputs (gitignored)
```

---

## 10. Automation Scripts

### 10.1 Daily Cleanup Script

**Create**: `scripts/utils/daily-cleanup.sh`

```bash
#!/bin/bash
# Daily cleanup routine for Present-Agent2
# Run with: ./scripts/utils/daily-cleanup.sh

set -e

PROJECT_ROOT="/Volumes/Crucial X8/Code/Present-Agent2"
cd "$PROJECT_ROOT"

echo "🧹 Running daily cleanup..."

# 1. Clean macOS metadata files
echo "  Removing macOS metadata files..."
find . -name "._*" -type f -delete

# 2. Check log sizes and rotate if needed
echo "  Checking log sizes..."
if [ -f "logs/combined.log" ]; then
  SIZE=$(stat -f%z "logs/combined.log" 2>/dev/null || stat -c%s "logs/combined.log")
  if [ "$SIZE" -gt 10485760 ]; then  # 10MB
    echo "  ⚠️  combined.log is >10MB, rotating..."
    ./scripts/utils/rotate-logs.sh
  fi
fi

# 3. Clean old checkpoints (keep last 3)
echo "  Cleaning old checkpoints..."
cd data
ls -t .*.checkpoint.json 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
cd ..

# 4. Remove stale PID files
echo "  Removing stale PID files..."
find . -maxdepth 1 -name "*.pid" -type f -mtime +1 -delete

# 5. Clean temp logs in root
echo "  Cleaning temporary logs..."
find . -maxdepth 1 -name "enrich-*.log" -type f -mtime +7 -delete
find . -maxdepth 1 -name "enrichment-*.log" -type f -mtime +7 -delete

# 6. Report disk usage
echo ""
echo "📊 Disk usage summary:"
echo "  node_modules:  $(du -sh node_modules 2>/dev/null | cut -f1)"
echo "  data:          $(du -sh data 2>/dev/null | cut -f1)"
echo "  logs:          $(du -sh logs 2>/dev/null | cut -f1)"
echo "  dist:          $(du -sh dist 2>/dev/null | cut -f1)"
echo ""
echo "✅ Cleanup complete!"
```

### 10.2 Weekly Archive Script

**Create**: `scripts/utils/weekly-archive.sh`

```bash
#!/bin/bash
# Weekly archival routine
# Run with: ./scripts/utils/weekly-archive.sh

set -e

PROJECT_ROOT="/Volumes/Crucial X8/Code/Present-Agent2"
cd "$PROJECT_ROOT"

DATE=$(date +%Y-%m-%d)
echo "📦 Running weekly archive ($DATE)..."

# 1. Archive old logs
echo "  Archiving logs older than 7 days..."
mkdir -p logs/archive
find logs -maxdepth 1 -name "*.log" -type f -mtime +7 -exec gzip {} \; -exec mv {}.gz logs/archive/ \; 2>/dev/null || true

# 2. Archive old rebuild logs
echo "  Archiving rebuild logs..."
mkdir -p data/archive/rebuild-logs
find data -maxdepth 1 -name "rebuild-*.log" -type f -exec mv {} data/archive/rebuild-logs/ \; 2>/dev/null || true

# 3. Keep only latest backup in data/export
echo "  Cleaning old export backups..."
cd data/export
ls -t products.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true
ls -t export-summary.json.bak.* 2>/dev/null | tail -n +2 | xargs rm -f 2>/dev/null || true
cd "$PROJECT_ROOT"

# 4. Clean archives older than 90 days
echo "  Removing archives older than 90 days..."
find logs/archive -name "*.log.gz" -mtime +90 -delete 2>/dev/null || true
find data/archive -type f -mtime +90 -delete 2>/dev/null || true

# 5. Report
echo ""
echo "📊 Archive summary:"
echo "  Archived logs: $(ls -1 logs/archive | wc -l) files"
echo "  Data archives: $(du -sh data/archive 2>/dev/null | cut -f1)"
echo ""
echo "✅ Weekly archive complete!"
```

### 10.3 Pre-commit Hook

**Create**: `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Pre-commit hook to prevent committing artifacts

# Check for common artifacts
ARTIFACTS=(
  "*.pid"
  "*.log"
  ".*.checkpoint.json"
  "enrich-*.log"
  "enrichment-*.log"
)

FOUND=""
for pattern in "${ARTIFACTS[@]}"; do
  if git diff --cached --name-only | grep -E "$pattern"; then
    FOUND="yes"
    echo "❌ Error: Attempting to commit artifact files matching: $pattern"
  fi
done

if [ -n "$FOUND" ]; then
  echo ""
  echo "Please unstage these files before committing:"
  echo "  git reset HEAD <file>"
  echo ""
  echo "Or update .gitignore to exclude them."
  exit 1
fi

exit 0
```

### 10.4 Dependency Audit Script

**Create**: `scripts/utils/audit-dependencies.sh`

```bash
#!/bin/bash
# Audit dependencies for security and updates

echo "🔍 Auditing dependencies..."
echo ""

# 1. Security audit
echo "1. Security vulnerabilities:"
npm audit --production
echo ""

# 2. Outdated packages
echo "2. Outdated packages:"
npm outdated
echo ""

# 3. Unused dependencies
echo "3. Checking for unused dependencies..."
if command -v depcheck &> /dev/null; then
  depcheck --json | jq -r '.dependencies[]' | while read dep; do
    echo "  - $dep (unused)"
  done
else
  echo "  ℹ️  Install depcheck for unused dependency detection: npm install -g depcheck"
fi
echo ""

# 4. Bundle size
echo "4. Bundle sizes:"
echo "  node_modules: $(du -sh node_modules 2>/dev/null | cut -f1)"
echo "  frontend/node_modules: $(du -sh frontend/node_modules 2>/dev/null | cut -f1)"
echo ""

echo "✅ Audit complete!"
```

### 10.5 Add to package.json

```json
{
  "scripts": {
    "clean:daily": "./scripts/utils/daily-cleanup.sh",
    "clean:weekly": "./scripts/utils/weekly-archive.sh",
    "clean:logs": "find logs -name '*.log' -mtime +7 -delete",
    "clean:metadata": "find . -name '._*' -type f -delete",
    "clean:all": "npm run clean:daily && npm run clean:weekly",
    "audit:deps": "./scripts/utils/audit-dependencies.sh",
    "logs:rotate": "./scripts/utils/rotate-logs.sh"
  }
}
```

---

## 11. Implementation Checklist

### Phase 1: Immediate Cleanup (30 minutes)

```bash
# High-impact, low-risk cleanup

✅ 1. Clean macOS metadata files
find /Volumes/Crucial\ X8/Code/Present-Agent2 -name "._*" -type f -delete

✅ 2. Remove root-level test files
rm -f test-neo4j-connection.js test-neo4j-e76e.js test-priority-1.js
rm -f test-dialogue-turn.mjs test-emotional-intelligence.ts
rm -f test-*-improvements.ts test-*-enhancement.ts
rm -f demo-*.ts validate-*.ts test-edge.json

✅ 3. Remove unused dependencies
npm uninstall axios body-parser commander wrap-ansi

✅ 4. Clean old PID files
rm -f .enrichment.pid .enrichment-robust.pid

✅ 5. Archive old logs from root
mkdir -p logs/archive/enrichment-2025-12
mv enrich-*.log enrichment-*.log logs/archive/enrichment-2025-12/

✅ 6. Update .gitignore
# Add missing patterns (see section 8.2)

✅ 7. Stage and commit cleanup
git add .gitignore
git rm --cached *.pid *.log (as appropriate)
git commit -m "chore: major repository cleanup"
```

**Expected time**: 30 minutes
**Estimated savings**: ~70M disk space + cleaner repo

### Phase 2: Documentation Organization (1 hour)

```bash
✅ 1. Move implementation docs
mkdir -p docs/archive/enrichment
mv ENRICHMENT_AUTOMATION_GUIDE.md docs/archive/enrichment/
mv HYBRID_ENRICHMENT_SUMMARY.md docs/archive/enrichment/
mv MULTI_LLM_*.md docs/archive/enrichment/
mv *_FIX_SUMMARY.md docs/archive/enrichment/
mv *_COMPLETE.md docs/archive/enrichment/

✅ 2. Update cross-references
# Update any docs that reference moved files

✅ 3. Create/update docs/README.md
# Ensure it points to correct locations

✅ 4. Commit documentation reorganization
git add docs/
git commit -m "docs: reorganize documentation structure"
```

**Expected time**: 1 hour

### Phase 3: Scripts Organization (2 hours)

```bash
✅ 1. Create new script directories
mkdir -p scripts/{core,enrichment,testing,validation,analysis,maintenance,legacy,utils}

✅ 2. Move scripts to appropriate directories
# See section 1.2 for detailed moves

✅ 3. Update package.json scripts
# Update script paths

✅ 4. Test critical scripts still work
npm run setup:schema -- --help
npm run chat
npm run test:personas:quick

✅ 5. Commit scripts reorganization
git add scripts/ package.json
git commit -m "refactor: reorganize scripts into functional directories"
```

**Expected time**: 2 hours

### Phase 4: Data Cleanup (1 hour)

```bash
✅ 1. Archive old raw imports
mkdir -p data/archive/raw-imports-2025-10
# Move old category files (see section 6.2)

✅ 2. Clean export backups
# Keep latest backup only

✅ 3. Archive rebuild logs
mkdir -p data/archive/rebuild-logs
mv data/rebuild-*.log data/archive/rebuild-logs/

✅ 4. Archive analysis files
mkdir -p data/archive/analysis-2025-11
# Move historical analysis files

✅ 5. Commit data cleanup
git add data/.gitignore  # If updated
git commit -m "chore: clean up data directory"
```

**Expected time**: 1 hour
**Estimated savings**: ~115M disk space

### Phase 5: Automation Setup (1 hour)

```bash
✅ 1. Create utility scripts
# Create scripts in scripts/utils/ (see section 10)

✅ 2. Make scripts executable
chmod +x scripts/utils/*.sh

✅ 3. Test automation scripts
./scripts/utils/daily-cleanup.sh
./scripts/utils/audit-dependencies.sh

✅ 4. Set up cron jobs (optional)
# Add to crontab for automatic cleanup
# 0 2 * * * cd /Volumes/Crucial\ X8/Code/Present-Agent2 && ./scripts/utils/daily-cleanup.sh
# 0 3 * * 0 cd /Volumes/Crucial\ X8/Code/Present-Agent2 && ./scripts/utils/weekly-archive.sh

✅ 5. Update package.json
# Add cleanup scripts (see section 10.5)

✅ 6. Commit automation
git add scripts/utils/ package.json
git commit -m "feat: add automated cleanup and maintenance scripts"
```

**Expected time**: 1 hour

### Phase 6: Code Quality (2-4 hours, ongoing)

```bash
✅ 1. Address TODO/FIXME comments
# Review 7 files with TODOs (see section 2.4)

✅ 2. Replace console.log with logger
# Priority: scripts with 10+ console.logs

✅ 3. Run security audit
npm audit
npm audit fix

✅ 4. Update dependencies
npm outdated
npm update

✅ 5. Run test suite
npm test

✅ 6. Commit improvements
git add .
git commit -m "refactor: improve code quality and update dependencies"
```

**Expected time**: 2-4 hours (can be spread over multiple sessions)

---

## 12. Expected Outcomes

### 12.1 Disk Space Savings

```
Before:
- Total project size: ~1.5GB
- Logs: 35M
- Data: 696M
- node_modules: 600M
- macOS metadata: ~1M

After:
- Total project size: ~1.3GB (-200M, 13% reduction)
- Logs: 2M (rotated, -33M)
- Data: 581M (cleaned, -115M)
- node_modules: 590M (unused deps removed, -10M)
- macOS metadata: 0 (-1M)
```

### 12.2 Repository Quality

```
Before:
- 504 modified/untracked files
- 13 test files in root
- 12 markdown docs in root
- 67+ flat scripts directory
- 16K+ metadata files
- 35M logs in repository

After:
- Clean git status
- 0 test files in root (moved to scripts/)
- 3 markdown docs in root (README, STATUS, REFERENCE)
- Organized scripts with clear hierarchy
- 0 metadata files
- Logs properly ignored and rotated
```

### 12.3 Developer Experience

**Before**:
- Hard to find scripts (67 files in flat directory)
- Unclear which enrichment script to use
- Manual log management
- Test files mixed with production code
- Large uncommitted changes

**After**:
- Clear script organization by function
- Documentation clearly indicates which scripts to use
- Automated log rotation
- Clean separation of concerns
- Clean git repository

### 12.4 Maintenance

**Before**:
- Manual cleanup required
- Logs grow unbounded
- No dependency auditing
- macOS metadata accumulates

**After**:
- Automated daily cleanup
- Logs rotate at size limits
- Regular dependency audits
- macOS metadata automatically cleaned

---

## 13. Quick Start Commands

After implementing all recommendations:

```bash
# Daily use
npm run clean:daily          # Run daily cleanup
npm run clean:weekly         # Run weekly archive
npm run logs:rotate          # Rotate logs manually
npm run audit:deps           # Audit dependencies

# One-time cleanup (start here)
./scripts/utils/daily-cleanup.sh
npm uninstall axios body-parser commander wrap-ansi
npm audit fix

# Scripts now organized
npm run core:setup           # scripts/core/setup-schema.ts
npm run enrich:multi         # scripts/enrichment/enrich-attributes-multi-llm.ts
npm run test:personas        # scripts/testing/test-personas.ts
npm run validate:env         # scripts/validation/check-env.ts
npm run analyze:stats        # scripts/analysis/analyze-product-stats.ts
```

---

## 14. Risk Assessment

### Low Risk (Safe to implement immediately)

✅ Remove macOS metadata files
✅ Remove unused dependencies
✅ Archive old logs
✅ Move test files from root
✅ Update .gitignore
✅ Create automation scripts

### Medium Risk (Test before committing)

⚠️ Reorganize scripts directory
⚠️ Delete old backups
⚠️ Archive raw data files
⚠️ Replace console.log with logger

### High Risk (Backup first, test thoroughly)

🔴 Delete dist/ directory (regenerated on build)
🔴 Clean up git history (permanent)
🔴 Delete archived data (ensure in Neo4j first)

---

## 15. Maintenance Schedule

### Daily (Automated)
- Clean macOS metadata
- Check log sizes
- Remove stale PIDs

### Weekly (Automated)
- Archive old logs
- Clean old checkpoints
- Remove old backups

### Monthly (Manual)
- Review disk usage
- Audit dependencies
- Update outdated packages
- Review test scripts for obsolescence

### Quarterly (Manual)
- Deep clean archived data
- Review script organization
- Update documentation
- Security audit

---

## 16. Monitoring & Alerts

### Add to Documentation

Create `docs/runbooks/maintenance.md`:

```markdown
# Maintenance Runbook

## Daily Checks
- [ ] Enrichment process status (if running)
- [ ] Log file sizes (<10MB combined.log)
- [ ] Disk space on external drive (>100GB free)

## Weekly Checks
- [ ] npm audit report (no HIGH/CRITICAL)
- [ ] Test suite passing (190/190)
- [ ] Data backup status

## Monthly Checks
- [ ] Dependency updates available
- [ ] Archive cleanup (remove >90 days)
- [ ] Script usage analysis (identify unused)

## Alerts to Watch
- ⚠️ combined.log >10MB (rotate immediately)
- ⚠️ data/ >1GB (review for cleanup)
- 🔴 npm audit HIGH/CRITICAL (patch immediately)
- 🔴 Test failures (investigate immediately)
```

---

## Conclusion

This comprehensive cleanup plan will:

1. **Reduce disk usage by ~200MB** (13% reduction)
2. **Improve repository organization** (clear script hierarchy)
3. **Automate maintenance** (daily/weekly cleanup)
4. **Enhance developer experience** (easier to find files)
5. **Maintain code quality** (remove dead code, update deps)
6. **Ensure security** (regular audits, updated packages)

**Recommended implementation timeline**:
- Phase 1 (Immediate): 30 minutes
- Phases 2-4 (Organization): 4 hours
- Phase 5 (Automation): 1 hour
- Phase 6 (Code Quality): Ongoing

**Total initial investment**: ~5-6 hours
**Ongoing maintenance**: Automated (5-10 minutes/week for review)

---

**Generated by**: Repository Maintenance Specialist
**Date**: December 8, 2025
**Version**: 1.0
**Next Review**: January 8, 2026
