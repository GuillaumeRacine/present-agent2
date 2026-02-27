# Product Enrichment - Quick Start Guide

## TL;DR - Run This Now

### Fix the Critical Attribute Gap (6% → 90%+)

```bash
# Test on 100 products first (2 minutes, $0.01)
npx tsx scripts/enrich-attributes-focused.ts --live --batch-size 20 --target 100

# If successful, enrich all 83K products (8 hours, $2-4)
npx tsx scripts/enrich-attributes-focused.ts --live --batch-size 20 --concurrency 3
```

---

## What Was Fixed

Three critical bugs were causing only 56% actual coverage:

1. **Silent LLM Failures**: Products with failed enrichment were counted as "processed"
2. **Misleading Counters**: Progress showed 100% but database had empty data
3. **No Verification**: Script didn't check if data actually made it to Neo4j

**All fixed!** See [ENRICHMENT_BUG_FIXES.md](./ENRICHMENT_BUG_FIXES.md) for details.

---

## Current Database State

```
Total products:           88,674
Products with interests:  49,306 (55.6%)
Products with occasions:  34,541 (39.0%)
Products with attributes:  5,330 (6.0%)  ← CRITICAL GAP
Products with ZERO data:  30,871 (34.8%)
```

---

## Two Scripts, Two Purposes

### 1. Attribute-Focused (NEW - Use This First)

**Purpose**: Fix the critical 6% attribute coverage gap

**Best for**:
- Quick wins (attributes only)
- Cost-efficient ($2 vs $6)
- Faster completion (8hrs vs 20hrs)

```bash
npx tsx scripts/enrich-attributes-focused.ts [options]
```

**Options**:
- `--live` - Apply changes (omit for dry-run)
- `--batch-size N` - Products per LLM call (default: 20)
- `--concurrency N` - Parallel batches (default: 3)
- `--target N` - Stop after N products (default: all)
- `--verbose` - Show detailed logs

### 2. Robust Enrichment (UPDATED - Use Second)

**Purpose**: Complete enrichment of all fields (interests, occasions, attributes)

**Best for**:
- Full enrichment
- Products with no data at all
- Comprehensive coverage

```bash
npx tsx scripts/enrich-products-robust.ts [options]
```

**Options**:
- `--live` - Apply changes (omit for dry-run)
- `--batch-size N` - Products per LLM call (default: 15)
- `--concurrency N` - Parallel batches (default: 3)
- `--verbose` - Show detailed logs

---

## Recommended Workflow

### Step 1: Test on Small Batch (5 minutes)

```bash
# Test attribute enrichment on 100 products
npx tsx scripts/enrich-attributes-focused.ts --live --batch-size 20 --target 100 --verbose

# Verify results in Neo4j
# Should see ~90+ products with 3+ attributes
```

### Step 2: Enrich Attributes (8 hours)

```bash
# Run overnight - enriches ~83K products needing attributes
npx tsx scripts/enrich-attributes-focused.ts --live --batch-size 20 --concurrency 3

# Monitor in terminal:
# Progress: 10,000/83,000 (12.0%) | Success: 94.2% | Rate: 2.9/s | Cost: $0.234 | ETA: 6h 58m
```

**Expected outcome**:
- Attribute coverage: 6% → 90%+
- Cost: $2-4 (depending on provider)
- Time: ~8 hours
- Processes: ~83,000 products

### Step 3: Complete Remaining Enrichment (12 hours)

```bash
# Fill in interests/occasions for remaining products
npx tsx scripts/enrich-products-robust.ts --live --batch-size 15 --concurrency 3

# Monitor in terminal:
# Progress: 5,000/39,000 (12.8%) | Success: 96.5% | Rate: 2.1/s | Cost: $0.456 | ETA: 4h 30m
```

**Expected outcome**:
- Overall coverage: 56% → 95%+
- Cost: $3-6 additional
- Time: ~12 hours
- Processes: ~39,000 remaining products

---

## What You'll See

### Progress Display

```
✔ Progress: 1,245/83,000 (1.5%) | Success: 94.2% | Rate: 2.9/s | Cost: $0.023 | ETA: 7h 48m
  Enriched: 23 heuristic + 177 LLM | Added: 412 interests, 289 occasions, 1,123 attrs
```

**Fields explained**:
- **Progress**: Products processed / Total needed (Percentage)
- **Success**: % of products that received valid enrichment
- **Rate**: Products per second
- **Cost**: Estimated API costs so far
- **ETA**: Time remaining at current rate

### Final Summary

```
═══════════════════════════════════════════════════════════════════════
  ENRICHMENT COMPLETE
═══════════════════════════════════════════════════════════════════════

Actual Coverage in Database:
  Products with interests: 82,341 / 88,674 (92.9%)
  Products with occasions: 75,112 / 88,674 (84.7%)
  Products with attributes: 81,456 / 88,674 (91.9%)  ← FIXED!

Products:
  Total processed: 83,124
  Heuristic only: 8,234
  LLM enriched: 74,890

Enrichments:
  Interests added: 241,234
  Occasions added: 156,789
  Attributes set: 389,456

LLM Usage:
  Tokens: 24,937,482
  Estimated cost: $1.87
  Errors: 23

Provider Usage:
  gemini: 68,234 products
  openai: 5,656 products
  anthropic: 0 products

Performance:
  Total time: 7.8 hours
  Rate: 2.96 products/s
```

---

## Troubleshooting

### "No LLM providers available"

**Problem**: Missing API keys

**Solution**:
```bash
# Check .env.local has at least one:
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### "Rate limit exceeded"

**Problem**: Too many requests to LLM provider

**Solution**: Script automatically handles this!
- Puts provider on cooldown
- Switches to next provider
- Uses exponential backoff
- Retries automatically

Just wait - it will recover and continue.

### "Low enrichment success rate"

**Problem**: LLM returning empty results

**Solution**: Script automatically:
1. Retries up to 3 times
2. Tries different providers
3. Falls back to heuristic enrichment
4. Logs warnings but continues

If this happens frequently, check:
- API keys are valid
- Providers have sufficient quota
- Network connectivity

### Process interrupted

**Problem**: Script stopped mid-run

**Solution**: Just re-run the same command!
- Robust script has checkpoint/resume (auto-resume)
- Attribute script queries database (skips already enriched)
- Both are safe to re-run

---

## Cost Control

### Estimate Before Running

For 83K products with attributes:
```
Gemini (cheapest):  83,000 × 300 tokens × $0.075/1M = $1.87
OpenAI (middle):    83,000 × 300 tokens × $0.15/1M  = $3.74
Anthropic (backup): 83,000 × 300 tokens × $0.25/1M  = $6.23
```

### Use --target for Incremental

```bash
# Enrich 1,000 products at a time
npx tsx scripts/enrich-attributes-focused.ts --live --target 1000

# Cost: ~$0.02-0.04 per run
# Time: ~6 minutes
# Repeat as needed
```

### Monitor Real-Time Costs

The script shows estimated cost as it runs:
```
Cost: $0.234
```

This updates every batch, so you can stop if costs get too high (Ctrl+C).

---

## Performance Tuning

### Faster (Higher Concurrency)

```bash
# Process 4-5 batches in parallel
npx tsx scripts/enrich-attributes-focused.ts --live --concurrency 5

# Pros: Faster completion (5-6 hours)
# Cons: Higher rate limit risk, more API errors
```

### More Reliable (Lower Concurrency)

```bash
# Process 1-2 batches in parallel
npx tsx scripts/enrich-attributes-focused.ts --live --concurrency 1

# Pros: Fewer errors, more stable
# Cons: Slower completion (10-12 hours)
```

### Balanced (Recommended)

```bash
# Process 3 batches in parallel
npx tsx scripts/enrich-attributes-focused.ts --live --concurrency 3

# Good balance of speed and reliability
```

### Batch Size Impact

| Batch Size | Speed | Quality | Cost |
|------------|-------|---------|------|
| 10         | Slower| Higher  | Higher (more calls) |
| 15         | Medium| Medium  | Medium |
| 20         | Faster| Good    | Lower (fewer calls) |
| 25+        | Fastest| Lower  | Lowest (but risky) |

**Recommendation**: Use 20 for attributes, 15 for full enrichment

---

## Verification

### Check Coverage After Running

```bash
npx tsx scripts/test-enrichment-100.ts
```

Shows current coverage for 100 sample products.

### Query Neo4j Directly

```cypher
// Products with attributes
MATCH (p:Product)
WHERE p.isPractical IS NOT NULL
RETURN count(p) as withAttributes

// Coverage breakdown
MATCH (p:Product)
WITH count(p) as total
MATCH (all:Product)
RETURN total,
       sum(CASE WHEN size([(all)-[:MATCHES_INTEREST]->() | 1]) > 0 THEN 1 ELSE 0 END) as withInterests,
       sum(CASE WHEN size([(all)-[:SUITABLE_FOR]->() | 1]) > 0 THEN 1 ELSE 0 END) as withOccasions,
       sum(CASE WHEN all.isPractical IS NOT NULL THEN 1 ELSE 0 END) as withAttributes
```

---

## FAQ

**Q: Which script should I run first?**

A: `enrich-attributes-focused.ts` - it fixes the critical 6% attribute gap cheaply and quickly.

**Q: Can I run both scripts at the same time?**

A: No - they'll conflict. Run attribute-focused first, then robust enrichment second.

**Q: What if I run out of API quota?**

A: Script automatically switches providers. If all fail, it falls back to heuristic enrichment.

**Q: How long will it take?**

A:
- Attribute-focused: ~8 hours for 83K products
- Robust enrichment: ~12 hours for remaining 39K products
- Total: ~20 hours for complete enrichment

**Q: Can I stop and resume?**

A: Yes! Robust script has checkpoints. Attribute script queries database for already-enriched products. Both are safe to restart.

**Q: What's the difference between dry-run and live?**

A:
- Dry-run (default): Shows what would happen, doesn't save to database
- Live (--live flag): Actually saves changes to Neo4j

**Q: Why is Success rate not 100%?**

A: Some products are genuinely hard to enrich (no description, obscure items). 90-95% success is expected and good!

---

## Need Help?

- **Detailed bug fixes**: See [ENRICHMENT_BUG_FIXES.md](./ENRICHMENT_BUG_FIXES.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: Check logs in `logs/combined.log` and `logs/error.log`
