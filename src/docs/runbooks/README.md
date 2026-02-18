# Operational Runbooks

Step-by-step procedures for common operational tasks.

---

## Available Runbooks

### Data Operations

#### Product Ingestion
**[new-product-ingestion-subagents.md](new-product-ingestion-subagents.md)**

Complete pipeline for ingesting new product batches using the subagent system.

**Use cases:**
- Adding new product catalog
- Bulk product import
- Initial data setup
- Quarterly catalog updates

**Pipeline stages:**
1. Product Import (raw JSON → export format)
2. Neo4j Ingestion (create nodes + embeddings)
3. Category Enrichment (assign categories)
4. Interest Enrichment (link to interest taxonomy)
5. Attribute Enrichment (populate 100 attributes)
6. Archetype Generation (create embeddings)
7. Validation (quality gates)

**Quick start:**
```bash
/ingest full --source "data/raw/products_YYYY_MM_DD.json"
```

---

#### Product Enrichment
**[hybrid-enrichment.md](hybrid-enrichment.md)**

Enrich existing products with attributes, interests, and occasions using the hybrid enrichment system.

**Use cases:**
- Improving attribute coverage
- Fixing missing data
- Backfilling new attributes
- Quality improvements

**Enrichment types:**
- **Attributes**: 100-dimension gift attributes
- **Interests**: Link products to interest taxonomy
- **Occasions**: Tag with gift occasions

**Quick start:**
```bash
# Monitor active enrichment
./scripts/monitor-enrichment.sh

# Run enrichment with retry
./scripts/run-enrichment-with-retry.sh

# Check current status
npx tsx scripts/analyze-product-stats.ts
```

**See also:**
- [ENRICHMENT_QUICK_REFERENCE.md](../../scripts/ENRICHMENT_QUICK_REFERENCE.md) - Complete enrichment scripts reference
- [ENRICHMENT_AUTOMATION_GUIDE.md](../../ENRICHMENT_AUTOMATION_GUIDE.md) - Automation setup

---

### System Maintenance
**[maintenance.md](maintenance.md)**

Regular maintenance procedures and troubleshooting.

**Use cases:**
- Weekly/monthly maintenance tasks
- Database optimization
- Log rotation
- Health checks

**Common tasks:**
- Clear old logs
- Optimize Neo4j indexes
- Verify data integrity
- Update dependencies

---

## Quick Commands Reference

### Environment & Database
```bash
# Verify configuration
npm run env:check

# Initialize database schema
npm run setup:schema

# Check database statistics
npx tsx scripts/analyze-product-stats.ts --export
```

### Product Operations
```bash
# Import products from CSV
npm run ingest:products -- path/to/products.csv

# Analyze product coverage
npm run attributes:status

# Tag products with occasions
npm run tag:occasions -- --limit 1000 --live
```

### Enrichment Operations
```bash
# Monitor enrichment progress
./scripts/monitor-enrichment.sh

# Run enrichment loop
./run-enrichment-robust.sh

# Fix orphaned products
tsx scripts/fix-orphaned-products.ts --limit 1000 --live

# Normalize interests
tsx scripts/normalize-interests.ts --live
```

### Testing
```bash
# Quick persona test
npm run test:personas:quick

# Full test suite
npm test

# Manual testing CLI
npm run chat
```

---

## Emergency Procedures

### System Down
1. Check server status: `ps aux | grep node`
2. Check logs: `tail -f logs/error.log`
3. Restart: `npm run dev`
4. Verify: `npm run env:check`

### Database Connection Issues
1. Verify Neo4j status (check Aura console)
2. Test connection: `npm run env:check`
3. Check credentials in `.env.local`
4. Verify network connectivity

### Enrichment Failures
1. Check progress: `cat ENRICHMENT_STATUS.md`
2. View errors: `tail -f logs/error.log`
3. Resume from checkpoint: `./scripts/run-enrichment-with-retry.sh`
4. Verify API keys are valid

### Data Quality Issues
1. Run validation: `npx tsx scripts/analyze-product-stats.ts`
2. Check coverage: `npm run attributes:status`
3. Identify gaps: Review output from above commands
4. Run targeted enrichment for specific gaps

---

## Monitoring & Health Checks

### Daily Checks
- [ ] System uptime: `npm run dev` works
- [ ] Database connectivity: `npm run env:check` passes
- [ ] API response time: Test `/api/recommend`
- [ ] Error logs: `tail -f logs/error.log`

### Weekly Checks
- [ ] Data coverage metrics: `npm run attributes:status`
- [ ] Test suite: `npm test` all passing
- [ ] Persona tests: `npm run test:personas:quick` quality scores
- [ ] Disk space: Check log file sizes

### Monthly Checks
- [ ] Full data validation: `npx tsx scripts/analyze-product-stats.ts`
- [ ] Performance benchmarks: Run persona tests, check timing
- [ ] Dependency updates: `npm outdated`
- [ ] Documentation review: Ensure accuracy

---

## Troubleshooting

### Common Issues

**Issue: "Module not found" errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
cd frontend && npm install
```

**Issue: "Neo4j connection refused"**
```bash
# Solution: Verify credentials and connectivity
npm run env:check
# Check .env.local for correct values
# Verify Neo4j Aura instance is running
```

**Issue: "Enrichment stuck at X%"**
```bash
# Solution: Check for errors and resume
tail -f logs/error.log
# Kill the process
pkill -f enrich-products
# Resume from checkpoint
./scripts/run-enrichment-with-retry.sh
```

**Issue: "Out of memory"**
```bash
# Solution: Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run server
```

---

## Creating New Runbooks

When adding a new runbook:

1. Create file in `docs/runbooks/`
2. Use `.md` extension
3. Include these sections:
   - Purpose
   - Prerequisites
   - Step-by-step procedure
   - Verification steps
   - Rollback procedure (if applicable)
   - Troubleshooting
4. Add entry to this README
5. Cross-reference in related docs

**Template:**
```markdown
# [Operation Name]

## Purpose
What this runbook accomplishes

## Prerequisites
- Required tools
- Required access
- Required data

## Procedure
1. Step 1
2. Step 2
...

## Verification
How to verify success

## Rollback
How to undo if needed

## Troubleshooting
Common issues and solutions
```

---

## Related Documentation

### Guides
- **[Guides Directory](../guides/)** - Development and testing guides
- **[USER_TESTING_GUIDE](../guides/USER_TESTING_GUIDE.md)** - Manual testing procedures

### Scripts Reference
- **[ENRICHMENT_QUICK_REFERENCE](../../scripts/ENRICHMENT_QUICK_REFERENCE.md)** - All enrichment scripts
- **[scripts/ directory](../../scripts/)** - TypeScript automation scripts

### System Documentation
- **[ARCHITECTURE](../ARCHITECTURE.md)** - System design
- **[API](../API.md)** - API reference
- **[SECURITY](../SECURITY.md)** - Security guidelines

---

**Navigation**: [Back to Documentation Hub](../README.md) | [Main README](../../README.md)

**Last Updated**: December 8, 2025
