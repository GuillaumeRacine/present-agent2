# Maintenance Runbook - Present-Agent2

**Purpose**: Standard operating procedures for maintaining a healthy codebase
**Owner**: Development Team
**Last Updated**: December 8, 2025

---

## Daily Maintenance

### Morning Checklist (2 minutes)

```bash
# 1. Check enrichment status (if running)
cat ENRICHMENT_STATUS.md

# 2. Review log file sizes
ls -lh logs/

# 3. Check git status
git status --short | wc -l
# Should be minimal - if >50 files, investigate

# 4. Run automated cleanup
npm run clean:daily
```

### What to Watch For

| Indicator | Normal | Warning | Critical |
|-----------|--------|---------|----------|
| combined.log | <10MB | 10-20MB | >20MB |
| error.log | <5MB | 5-10MB | >10MB |
| data/ size | <700MB | 700-900MB | >1GB |
| Git changes | <20 files | 20-100 files | >100 files |

### Action Items

If logs are large:
```bash
npm run logs:rotate
```

If data is large:
```bash
npm run clean:weekly
```

---

## Weekly Maintenance

### Sunday Evening Checklist (10 minutes)

```bash
# 1. Run weekly archive
npm run clean:weekly

# 2. Audit dependencies
npm run audit:deps

# 3. Check for updates
npm outdated

# 4. Review test status
npm test

# 5. Check disk usage
du -sh node_modules data logs
```

### Dependency Update Strategy

**Minor updates**: Apply weekly
```bash
npm update
```

**Major updates**: Test in dev first
```bash
# Review breaking changes
npm outdated
# Update one at a time
npm install <package>@latest
npm test
git commit -m "chore: update <package> to vX.X.X"
```

### Security Patches

**HIGH/CRITICAL**: Apply immediately
```bash
npm audit fix
npm test
git commit -m "security: fix vulnerabilities"
```

**MODERATE**: Apply weekly
```bash
npm audit fix
```

**LOW**: Review monthly

---

## Monthly Maintenance

### First Monday of Month (30 minutes)

#### 1. Deep Clean Archives

```bash
# Remove archives older than 90 days
find logs/archive -name "*.log.gz" -mtime +90 -delete
find data/archive -type f -mtime +90 -delete

# Report
echo "Archived logs: $(ls -1 logs/archive | wc -l)"
echo "Data archives: $(du -sh data/archive)"
```

#### 2. Dependency Health Check

```bash
# Full audit
npm run audit:deps > reports/audit-$(date +%Y-%m).txt

# Check for unused dependencies
npx depcheck

# Review licenses
npx license-checker --summary
```

#### 3. Code Quality Review

```bash
# Check for TODO/FIXME comments
grep -r "TODO\|FIXME\|XXX\|HACK" src/ scripts/ --include="*.ts" | wc -l

# Check console.log usage (should be minimal in src/)
grep -r "console\.log" src/ --include="*.ts" | wc -l

# Run linter (if configured)
npm run lint 2>/dev/null || echo "Linter not configured"
```

#### 4. Script Organization Review

```bash
# Find unused scripts (not called in last 30 days)
find scripts -name "*.ts" -type f -mtime +30

# Review for consolidation opportunities
find scripts -name "test-*.ts" | wc -l
find scripts -name "check-*.ts" | wc -l
find scripts -name "enrich-*.ts" | wc -l
```

#### 5. Database Health

```bash
# Run product stats analysis
npm run analyze:stats

# Check data coverage
# Expected: 99%+ interests, 85%+ occasions, 95%+ attributes
```

---

## Quarterly Maintenance

### End of Quarter (2 hours)

#### 1. Major Version Updates

Review and update major dependencies:

```bash
# Check for major updates
npm outdated

# For each major update:
# 1. Review changelog
# 2. Check breaking changes
# 3. Update in dev branch
# 4. Run full test suite
# 5. Test enrichment pipeline
# 6. Deploy to production
```

#### 2. Archive Historical Data

```bash
# Move old raw data to cold storage
QUARTER=$(date +%Y-Q%q)
mkdir -p data/archive/cold-storage-$QUARTER

# Archive raw imports older than 6 months
find data/raw -name "*.json" -mtime +180 -exec mv {} data/archive/cold-storage-$QUARTER/ \;

# Archive old analysis files
find data -name "*-analysis.json" -mtime +180 -exec mv {} data/archive/cold-storage-$QUARTER/ \;
```

#### 3. Documentation Review

```bash
# Update outdated docs
find docs -name "*.md" -exec grep -l "Last Updated:" {} \;

# Check for broken links
# Manual: Review docs/README.md and all cross-references

# Update architecture if changed
# Review docs/ARCHITECTURE.md
```

#### 4. Security Audit

```bash
# Run comprehensive security scan
npm audit

# Check for leaked secrets
git log -p | grep -i "api_key\|password\|secret"

# Review .gitignore
# Ensure all sensitive files are ignored

# Check log files for sensitive data
grep -r "api_key\|password\|secret" logs/ || echo "No secrets found"
```

#### 5. Performance Review

```bash
# Check enrichment performance
# Review logs/multi-llm-enrichment-full.log

# Check recommendation response times
# Target: <30 seconds average

# Review database query performance
# Check for slow queries in Neo4j
```

---

## Incident Response

### Enrichment Process Failed

**Symptoms**: Process stopped, checkpoint not advancing

**Actions**:
```bash
# 1. Check logs
tail -100 logs/error.log

# 2. Check checkpoint
cat data/.enrich-attributes-multi-llm-checkpoint.json

# 3. Check process status
ps aux | grep enrich

# 4. Restart with resume
npm run enrich:multi:live -- --resume
```

### Logs Growing Too Fast

**Symptoms**: combined.log >50MB in a day

**Actions**:
```bash
# 1. Rotate immediately
npm run logs:rotate

# 2. Check for log spam
tail -1000 logs/combined.log | cut -d' ' -f4 | sort | uniq -c | sort -rn | head

# 3. Identify source
# Look for repeated error messages or debug logs

# 4. Fix source (add rate limiting or reduce log level)
```

### Disk Space Running Low

**Symptoms**: <50GB free on external drive

**Actions**:
```bash
# 1. Check disk usage
df -h "/Volumes/Crucial X8"

# 2. Find large directories
du -sh /Volumes/Crucial\ X8/Code/Present-Agent2/* | sort -rh | head -10

# 3. Clean up
npm run clean:daily
npm run clean:weekly

# 4. Archive old data
# Move data/archive/cold-storage-* to external backup

# 5. Clean node_modules if needed
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install
```

### High Security Vulnerabilities

**Symptoms**: npm audit shows HIGH or CRITICAL

**Actions**:
```bash
# 1. Check details
npm audit

# 2. Apply automatic fixes
npm audit fix

# 3. If fix breaks things
npm audit fix --force  # Only if you understand the risks

# 4. Manual fix if needed
# Update specific package to patched version

# 5. Test thoroughly
npm test
npm run test:personas:quick

# 6. Commit
git commit -m "security: fix HIGH/CRITICAL vulnerabilities"
```

### Git Repository Too Large

**Symptoms**: git status shows 500+ files

**Actions**:
```bash
# 1. Check what changed
git status --short

# 2. Check .gitignore
cat .gitignore

# 3. Remove tracked artifacts
git rm --cached *.log *.pid *.checkpoint.json

# 4. Update .gitignore
# Add missing patterns

# 5. Commit cleanup
git add .gitignore
git commit -m "chore: cleanup git repository"
```

---

## Monitoring Alerts

### Set Up Alerts

Create `.github/workflows/maintenance-alert.yml` (if using GitHub):

```yaml
# Example: Alert if logs are too large
name: Maintenance Alert
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9am
jobs:
  check-health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check log sizes
        run: |
          if [ -f "logs/combined.log" ]; then
            SIZE=$(stat -c%s "logs/combined.log")
            if [ "$SIZE" -gt 20971520 ]; then
              echo "::warning::combined.log is >20MB"
            fi
          fi
```

### Manual Monitoring

Add to weekly checklist:

```bash
# Check for large files
find . -size +50M -not -path "*/node_modules/*" -not -path "*/data/raw/*"

# Check for too many checkpoints
find data -name "*.checkpoint.json" | wc -l
# Should be <10

# Check for orphaned PID files
find . -maxdepth 1 -name "*.pid" -mtime +1

# Check for old logs
find logs -name "*.log" -mtime +30
```

---

## Automation

### Cron Jobs (Optional)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Daily cleanup at 2 AM
0 2 * * * cd /Volumes/Crucial\ X8/Code/Present-Agent2 && ./scripts/utils/daily-cleanup.sh >> logs/cleanup.log 2>&1

# Weekly archive on Sunday at 3 AM
0 3 * * 0 cd /Volumes/Crucial\ X8/Code/Present-Agent2 && ./scripts/utils/weekly-archive.sh >> logs/archive.log 2>&1

# Monthly dependency audit on 1st of month at 9 AM
0 9 1 * * cd /Volumes/Crucial\ X8/Code/Present-Agent2 && ./scripts/utils/audit-dependencies.sh >> logs/audit.log 2>&1
```

### npm Scripts

Already configured in package.json:

```bash
npm run clean:daily        # Run daily cleanup
npm run clean:weekly       # Run weekly archive
npm run logs:rotate        # Rotate logs manually
npm run audit:deps         # Audit dependencies
```

---

## Metrics to Track

### Weekly

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Pass Rate | 100% | 190/190 | ✅ |
| Response Time | <30s | 25-30s | ✅ |
| Interest Coverage | >95% | 99.3% | ✅ |
| Attribute Coverage | >95% | 53%→95% | ⚡ |
| Log Size | <10MB | Check | - |
| Disk Usage | <1GB | 696MB | ✅ |

### Monthly

| Metric | Target | Track |
|--------|--------|-------|
| Security Vulnerabilities | 0 HIGH/CRITICAL | `npm audit` |
| Outdated Dependencies | <5 major | `npm outdated` |
| Code Coverage | >80% | `npm test -- --coverage` |
| TODO Comments | Decreasing | `grep -r TODO` |
| Unused Scripts | <5 | Manual review |

---

## Contacts

### Escalation

- **Critical Issues**: Immediate attention required
- **High Priority**: Within 24 hours
- **Normal**: Next maintenance window

### Resources

- **Full Cleanup Report**: `/CLEANUP_REPORT.md`
- **Quick Start**: `/CLEANUP_QUICK_START.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **Project Status**: `/.claude/PROJECT_STATUS.md`

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2025-12-08 | Initial runbook created | Maintenance Specialist |

---

**Next Review**: January 8, 2026
