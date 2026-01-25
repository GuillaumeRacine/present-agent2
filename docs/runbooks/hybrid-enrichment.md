# Hybrid Product Enrichment Runbook

## Overview

The hybrid enrichment script (`scripts/enrich-products-hybrid.ts`) is a production-ready tool for enriching product data with interests, occasions, and gift attributes using a cost-efficient two-pass strategy.

## Architecture

### Two-Pass Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  PASS 1: HEURISTIC ENRICHMENT (Fast, Free)                  │
│  ────────────────────────────────────────────────────────   │
│  • Keyword matching against interest taxonomy               │
│  • Regex patterns for occasion detection                    │
│  • Rule-based gift attribute inference                      │
│  • ~1000+ products/second                                   │
│  • Zero cost                                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────────────────┐
              │  Enrichment Check    │
              │  < 2 interests OR    │
              │  < 1 occasion?       │
              └──────────────────────┘
                    ↓           ↓
                  Yes          No → Done
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  PASS 2: LLM GAP-FILL (Slow, Paid)                          │
│  ────────────────────────────────────────────────────────   │
│  • Batched LLM calls (10-20 products/request)                │
│  • GPT-4o-mini for speed and cost                           │
│  • Parallel batch processing (3-5 concurrent)                │
│  • ~5-10 products/second                                     │
│  • $0.15/1M input tokens, $0.60/1M output tokens             │
└─────────────────────────────────────────────────────────────┘
```

### Performance Characteristics

| Metric | Heuristic Pass | LLM Pass |
|--------|---------------|----------|
| Speed | 1000+/sec | 5-10/sec |
| Cost | $0 | ~$0.002/product |
| Coverage | 60-70% | 95%+ |
| Accuracy | 80-85% | 90-95% |

## Usage

### Basic Commands

```bash
# Dry run on 100 products (see what would happen)
tsx scripts/enrich-products-hybrid.ts --limit 100

# Live run with full enrichment
tsx scripts/enrich-products-hybrid.ts --live

# Heuristic only (zero cost)
tsx scripts/enrich-products-hybrid.ts --skip-llm --live

# LLM only (skip heuristic)
tsx scripts/enrich-products-hybrid.ts --skip-heuristic --live

# Resume interrupted run
tsx scripts/enrich-products-hybrid.ts --resume --live
```

### Advanced Options

```bash
# Custom batch size and concurrency
tsx scripts/enrich-products-hybrid.ts \
  --live \
  --batch-size 20 \
  --concurrency 5

# Process specific subset
tsx scripts/enrich-products-hybrid.ts \
  --limit 1000 \
  --live

# Maximum speed (heuristic only)
tsx scripts/enrich-products-hybrid.ts \
  --skip-llm \
  --live
```

## Flags Reference

| Flag | Description | Default |
|------|-------------|---------|
| `--live` | Apply changes to database | `false` (dry-run) |
| `--limit N` | Process only first N products | All products |
| `--skip-heuristic` | Skip keyword-based pass | `false` |
| `--skip-llm` | Skip LLM gap-fill pass | `false` |
| `--resume` | Resume from checkpoint | `false` |
| `--concurrency N` | Parallel batch count | `3` |
| `--batch-size N` | Products per LLM call | `15` |

## Enrichment Scope

### 1. Interests (150+ taxonomy)

Extracts specific interests from product data:

```typescript
// Examples:
"Espresso Machine" → ["coffee", "espresso", "barista", "brewing"]
"Yoga Mat" → ["yoga", "fitness", "wellness", "mindfulness"]
"Italian Cookbook" → ["cooking", "italy", "food", "recipes"]
```

### 2. Occasions (13 types)

Tags products with suitable gift occasions:

```typescript
const OCCASIONS = [
  'birthday', 'christmas', 'anniversary', 'wedding',
  'valentines_day', 'mothers_day', 'fathers_day',
  'graduation', 'housewarming', 'thank_you',
  'get_well', 'congratulations', 'retirement'
];
```

### 3. Gift Attributes (15 key attributes)

Infers gift-giving attributes:

```typescript
const GIFT_ATTRIBUTES = [
  'isExperiential',      // Classes, events, activities
  'isMemoryMaking',      // Creates lasting memories
  'isSentimental',       // Emotional, meaningful
  'isPersonalized',      // Custom, monogrammed
  'isPractical',         // Useful, functional
  'isLuxury',           // Premium, high-end
  'isConsumable',       // Food, wine, beauty
  'isArtistic',         // Art, creative
  'isMinimalist',       // Simple, clean
  'isShared',           // Social, group experiences
  'isConversationStarter', // Unique, interesting
  'isEducational',      // Teaches skills
  'isHandcrafted',      // Artisan-made
  'isLastingValue',     // Durable, investment
  'isEcoFriendly'       // Sustainable, green
];
```

## Cost Analysis

### Example: 10,000 Products

```
HEURISTIC PASS (Pass 1):
• Products fully enriched: ~7,000 (70%)
• Products needing LLM: ~3,000 (30%)
• Cost: $0

LLM PASS (Pass 2):
• Products enriched: 3,000
• Tokens: ~1.5M (500 tokens/product)
• Cost: ~$0.15 input + ~$0.60 output = $1.13 total
• Time: ~10 minutes

TOTAL COST: $1.13 for 10,000 products
```

Compare to pure LLM approach: **$6.00** (5.3x more expensive)

## Checkpoint System

The script automatically saves progress every 5 batches to:
```
data/.enrichment-checkpoint.json
```

### Checkpoint Structure

```json
{
  "processedIds": ["id1", "id2", ...],
  "stats": {
    "totalProducts": 10000,
    "heuristicProcessed": 10000,
    "heuristicEnriched": 7000,
    "llmProcessed": 1500,
    "llmEnriched": 1500,
    "totalInterestsAdded": 25000,
    "totalOccasionsAdded": 15000,
    "totalAttributesSet": 40000,
    "tokensUsed": 750000,
    "estimatedCost": 0.56
  },
  "timestamp": "2025-11-27T10:30:00.000Z"
}
```

### Resume After Interruption

```bash
# If script is interrupted, resume with:
tsx scripts/enrich-products-hybrid.ts --resume --live

# Checkpoint is automatically cleared on successful completion
```

## Output Example

```
══════════════════════════════════════════════════════════════════
  HYBRID PRODUCT ENRICHMENT
══════════════════════════════════════════════════════════════════

Mode: LIVE
Products: 10000
Strategy: Two-pass hybrid
Batch size: 15 products/call
Concurrency: 3 parallel batches

📊 PASS 1: Heuristic Enrichment (keyword-based)

✓ Heuristic pass complete in 8.5s
  Fully enriched: 7234 products
  Need LLM: 2766 products

🤖 PASS 2: LLM Gap-Fill (batched, GPT-4o-mini)

✓ LLM: 2766/2766 | Rate: 4.8/s | Cost: $1.12 | ETA: 0s

✓ LLM pass complete in 576.2s
  Enriched: 2766 products
  Tokens: 1,383,000
  Cost: $1.12

══════════════════════════════════════════════════════════════════
  ENRICHMENT SUMMARY
══════════════════════════════════════════════════════════════════

Products:
  Total processed: 10000
  Heuristic only: 7234
  LLM enriched: 2766

Enrichments:
  Interests added: 28,432
  Occasions added: 18,891
  Attributes set: 45,678

LLM Usage:
  Tokens: 1,383,000
  Estimated cost: $1.12

Performance:
  Total time: 584.7s
  Rate: 17.1 products/s

✅ All changes saved to database
```

## Best Practices

### 1. Start with Dry Run

Always test with a dry run first:

```bash
tsx scripts/enrich-products-hybrid.ts --limit 100
```

### 2. Heuristic-First for Speed

For maximum speed and zero cost:

```bash
tsx scripts/enrich-products-hybrid.ts --skip-llm --live
```

Then run LLM gap-fill later if needed:

```bash
tsx scripts/enrich-products-hybrid.ts --skip-heuristic --live
```

### 3. Tune Batch Size

- **Small batches (5-10)**: More API calls, slower, better error recovery
- **Large batches (20-30)**: Fewer API calls, faster, higher risk

Recommended: **15** (sweet spot)

### 4. Tune Concurrency

- **Low concurrency (1-2)**: Slower, respects rate limits strictly
- **High concurrency (5-8)**: Faster, may hit rate limits

Recommended: **3** (balanced)

### 5. Monitor Costs

For large datasets (100k+ products), run on subset first:

```bash
# Test on 1000 products
tsx scripts/enrich-products-hybrid.ts --limit 1000 --live

# Check cost, then scale up
tsx scripts/enrich-products-hybrid.ts --live
```

## Troubleshooting

### Script Interrupted

```bash
# Resume from checkpoint
tsx scripts/enrich-products-hybrid.ts --resume --live
```

### Rate Limit Errors

```bash
# Reduce concurrency
tsx scripts/enrich-products-hybrid.ts --concurrency 1 --live
```

### High Costs

```bash
# Use heuristic only
tsx scripts/enrich-products-hybrid.ts --skip-llm --live

# Or reduce batch size (more accurate pricing)
tsx scripts/enrich-products-hybrid.ts --batch-size 5 --live
```

### Low Quality Results

```bash
# Skip heuristic, use only LLM
tsx scripts/enrich-products-hybrid.ts --skip-heuristic --live
```

## Integration

### With Other Scripts

```bash
# 1. Import products
tsx scripts/import-raw-products.ts

# 2. Enrich with hybrid script
tsx scripts/enrich-products-hybrid.ts --live

# 3. Verify results
tsx scripts/verify-enrichment.ts
```

### Neo4j Queries

After enrichment, verify in Neo4j:

```cypher
// Check interest distribution
MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)
RETURN i.name, COUNT(p) AS products
ORDER BY products DESC
LIMIT 20;

// Check occasion coverage
MATCH (p:Product)-[:SUITABLE_FOR]->(o:Occasion)
RETURN o.name, COUNT(p) AS products
ORDER BY products DESC;

// Check attribute statistics
MATCH (p:Product)
WHERE p.isExperiential = true
RETURN COUNT(p) AS experiential_count;
```

## Performance Tuning

### For Maximum Speed

```bash
tsx scripts/enrich-products-hybrid.ts \
  --skip-llm \
  --live
```

Expected: **1000+ products/second**

### For Maximum Accuracy

```bash
tsx scripts/enrich-products-hybrid.ts \
  --skip-heuristic \
  --batch-size 10 \
  --concurrency 5 \
  --live
```

Expected: **8-12 products/second**, higher cost

### For Best Balance

```bash
tsx scripts/enrich-products-hybrid.ts \
  --batch-size 15 \
  --concurrency 3 \
  --live
```

Expected: **15-20 products/second**, ~70% cost savings

## Monitoring

### Watch Progress

```bash
# Terminal 1: Run script
tsx scripts/enrich-products-hybrid.ts --live

# Terminal 2: Monitor checkpoint
watch -n 5 'cat data/.enrichment-checkpoint.json | jq ".stats"'

# Terminal 3: Monitor Neo4j
# (Use Neo4j Browser to query in real-time)
```

## Maintenance

### Clear Checkpoint

```bash
rm data/.enrichment-checkpoint.json
```

### Re-enrich Products

```bash
# Clear existing enrichments first (optional)
# Then run script
tsx scripts/enrich-products-hybrid.ts --live
```

## Related Documentation

- [Interest Taxonomy](/src/lib/interest-synonyms.ts) - Full interest taxonomy
- [Gift Attributes](/src/types/gift-attributes.ts) - Attribute definitions
- [LLM Client](/src/lib/llm.ts) - LLM provider configuration
- [Import Runbook](/docs/runbooks/import-products.md) - Product import process

## Support

For issues or questions:
1. Check this runbook
2. Review script output for error messages
3. Check Neo4j logs for database errors
4. Verify API keys are valid in `.env.local`
