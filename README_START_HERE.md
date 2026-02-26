# Present-Agent2 - Start Here

**Repository:** https://github.com/GuillaumeRacine/present-agent2
**Version:** 3.4.0 - Quality Stabilized, Enrichment Gaps Remain
**Status:** ✅ Active Development - Continue Building This Repo

---

## ⚠️ Important: This is the CORRECT Repository

**There was a previous Present-Agent v1** that has been **archived and removed**.

- ❌ **Present-Agent v1** = Old, abandoned in October 2024, 6% relevance (broken)
- ✅ **Present-Agent2 (this repo)** = Current, active development, 40% quality (needs tuning)

**All references to v1 have been cleaned up. This is the only active project.**

---

## Quick Start

```bash
# 1. Navigate to project
cd "/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/src"

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..

# 3. Setup environment
cp .env.local.example .env.local
# Fill in: OPENAI_API_KEY, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD

# 4. Verify environment
npm run env:check

# 5. Start interactive chat
npm run chat
```

---

## Key Documentation

| File | Purpose |
|------|---------|
| `src/README.md` | Main project documentation |
| `src/.claude/PROJECT_STATUS.md` | Current status for LLM agents |
| `../PRESENT_AGENT2_ANALYSIS.md` | **Comprehensive analysis (START HERE)** |
| `src/MULTI_LLM_ARCHITECTURE.md` | Multi-LLM system design |
| `src/RECOMMENDATION_QUALITY_TEST_RESULTS.md` | Known issues & test results |
| `src/docs/README.md` | Documentation hub |

---

## Current Status

### Data Quality ⚠️
- **133,328 products** in Neo4j (4,809 brands)
- **49% interest coverage** (65,998 products)
- **60% category coverage** (79,412 products)
- **69% occasion coverage** (91,774 products)
- **68% relationship coverage** (90,490 products)
- **58% attribute coverage** (77,294 products)
- **41,554 products** have **no enrichment edges** (31.2% of catalog)

### System Status ✅
- **190/190 tests passing**
- **10-agent architecture operational**
- **Neo4j database active** (local Docker + optional Aura)
- **Latest quality run:** 2026-02-25 (Avg Bar Raiser **89/100**)

### Known Issues ⚠️
- **Enrichment gaps:** 31.2% of products have no graph edges
- **Response time:** 36-107s (target: <10s)
- **Thin interests:** 19 interests have <100 products
- **Over-tagged categories:** "Experiences" and "Subscriptions" are labels, not real experiences/subscriptions

---

## Next Steps

1. **Read the comprehensive analysis (historical + context):**
   ```bash
   cat "/Volumes/Seagate 2TB/1_Projects/Protoypes/PRESENT_AGENT2_ANALYSIS.md"
   ```

2. **Setup and test:**
   ```bash
   cd src
   npm install
   npm run env:check
   npm run chat
   ```

3. **Run quality tests:**
   ```bash
   npm run test:personas:quick
   npm run attributes:status
   ```

4. **Close enrichment gaps first:**
   - Run expand scripts on the 41,545 unenriched products
   - Merge duplicate interests
   - Re-tag thin interests

---

## Path to Production

**Timeline:** 2-4 weeks of quality + performance tuning

**Phase 1 (Week 1-2):** Close enrichment gaps + stabilize quality
**Phase 2 (Week 1):** Performance optimization to <10s
**Phase 3 (Week 1):** Deploy MVP

**Total:** ~1 month to production-ready MVP

---

## Quick Commands

```bash
# Start working
npm run chat                    # Interactive CLI
npm run dev                     # Full stack
npm test                        # Run all tests

# Check status
npm run attributes:status       # Data coverage
npm run env:check              # Environment
git log --oneline -10          # Recent commits

# Test quality
npm run test:personas:quick     # Quick test
npm run test:real-users:easy    # Real scenarios
```

---

**Ready to start. Read `PRESENT_AGENT2_ANALYSIS.md` for full context.**

**Last updated:** 2026-02-26
