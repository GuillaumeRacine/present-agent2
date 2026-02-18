# Hybrid Enrichment - Quick Reference Card

## Most Common Commands

### 1. Test Run (Dry Run)
```bash
tsx scripts/enrich-products-hybrid.ts --limit 100
```
**When to use**: Before first real run, to verify behavior

---

### 2. Full Production Enrichment
```bash
tsx scripts/enrich-products-hybrid.ts --live
```
**When to use**: Main enrichment run on all products

---

### 3. Heuristic Only (Zero Cost)
```bash
tsx scripts/enrich-products-hybrid.ts --skip-llm --live
```
**When to use**: Initial enrichment, tight budget, speed priority

---

### 4. Resume Interrupted Run
```bash
tsx scripts/enrich-products-hybrid.ts --resume --live
```
**When to use**: After interruption or error

---

### 5. Custom Batch Configuration
```bash
tsx scripts/enrich-products-hybrid.ts --batch-size 20 --concurrency 5 --live
```
**When to use**: Need to tune performance/cost

---

## All Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--live` | `false` | Apply changes (default is dry-run) |
| `--limit N` | All | Process only first N products |
| `--skip-heuristic` | `false` | Skip keyword-based pass |
| `--skip-llm` | `false` | Skip LLM gap-fill pass |
| `--resume` | `false` | Resume from checkpoint |
| `--concurrency N` | `3` | Parallel batch count |
| `--batch-size N` | `15` | Products per LLM call |

---

## Performance Quick Guide

| Goal | Command | Speed | Cost |
|------|---------|-------|------|
| **Maximum Speed** | `--skip-llm --live` | 1000+/s | $0 |
| **Maximum Accuracy** | `--skip-heuristic --live` | 8-12/s | High |
| **Best Balance** | `--live` | 15-20/s | Low |
| **Budget Conscious** | `--skip-llm --live` | 1000+/s | $0 |

---

## Typical Workflow

```bash
# Step 1: Test on small sample
tsx scripts/enrich-products-hybrid.ts --limit 100

# Step 2: Review output, then run full enrichment
tsx scripts/enrich-products-hybrid.ts --live

# Step 3: If interrupted, resume
tsx scripts/enrich-products-hybrid.ts --resume --live
```

---

## Cost Estimates

| Products | Heuristic Only | Hybrid (2-pass) | LLM Only |
|----------|----------------|-----------------|----------|
| 1,000 | $0 | $0.11 | $0.60 |
| 10,000 | $0 | $1.13 | $6.00 |
| 100,000 | $0 | $11.25 | $60.00 |

---

## Troubleshooting Quick Fixes

### Interrupted Run
```bash
tsx scripts/enrich-products-hybrid.ts --resume --live
```

### Rate Limit Errors
```bash
tsx scripts/enrich-products-hybrid.ts --concurrency 1 --live
```

### High Costs
```bash
tsx scripts/enrich-products-hybrid.ts --skip-llm --live
```

### Clear Checkpoint
```bash
rm data/.enrichment-checkpoint.json
```

---

## Output Summary Explained

```
Products:
  Total processed: 10000        ← Total products enriched
  Heuristic only: 7234          ← Enriched by keywords only
  LLM enriched: 2766            ← Required LLM gap-fill

Enrichments:
  Interests added: 28,432       ← Total new interests
  Occasions added: 18,891       ← Total new occasions
  Attributes set: 45,678        ← Total attributes set

LLM Usage:
  Tokens: 1,383,000             ← Total tokens used
  Estimated cost: $1.12         ← Total LLM cost
```

---

## Quick Links

- **Full Documentation**: `docs/runbooks/hybrid-enrichment.md`
- **Implementation Summary**: `HYBRID_ENRICHMENT_SUMMARY.md`
- **Test Script**: `scripts/test-enrichment-logic.ts`
- **Examples**: `scripts/examples/run-hybrid-enrichment-example.sh`

---

## Emergency Contacts

- Script location: `scripts/enrich-products-hybrid.ts`
- Checkpoint file: `data/.enrichment-checkpoint.json`
- Logs: Check terminal output
- Database: Neo4j Browser

---

**TIP**: Start with `--limit 100` to test, then run `--live` for full enrichment.
