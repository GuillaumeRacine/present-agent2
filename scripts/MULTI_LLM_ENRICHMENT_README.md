# Multi-LLM Fallback Enrichment System

## Overview

The `enrich-attributes-multi-llm.ts` script provides a robust, multi-provider fallback system for enriching products with gift attributes. It automatically falls back through OpenAI → Anthropic → Gemini if a provider fails validation.

## Key Features

### 1. Three-Tier Fallback Strategy
- **Primary**: OpenAI (GPT-4o-mini) - Best quality, middle cost
- **Secondary**: Anthropic (Claude Haiku) - Good quality, higher cost
- **Tertiary**: Gemini (2.0 Flash) - Lowest cost, good quality

### 2. Intelligent Failure Handling
- **No retries with same LLM**: Moves immediately to next provider on validation failure
- **Validation requirement**: Minimum 80% success rate per batch
- **Complete failure tracking**: Records batches that failed all 3 providers
- **Separate failures file**: `data/.enrich-attributes-multi-llm-failures.json`

### 3. Cost Tracking Per Provider
```
OpenAI:     $0.15/1M input, $0.60/1M output
Anthropic:  $0.25/1M input, $1.25/1M output
Gemini:     $0.075/1M input, $0.30/1M output
```

### 4. Checkpoint System
- Saves every 100 products
- Includes provider usage statistics
- Tracks which LLM succeeded for each batch
- Resume from exact point of failure

## Usage

### Basic Commands

```bash
# Dry run (test without saving)
npx tsx scripts/enrich-attributes-multi-llm.ts

# Live run (actually save changes)
npx tsx scripts/enrich-attributes-multi-llm.ts --live

# Test on small batch
npx tsx scripts/enrich-attributes-multi-llm.ts --limit 100 --verbose

# Custom batch size
npx tsx scripts/enrich-attributes-multi-llm.ts --live --batch-size 15

# Verbose mode (detailed logging)
npx tsx scripts/enrich-attributes-multi-llm.ts --live --verbose
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--live` | Apply changes to database | false (dry-run) |
| `--batch-size N` | Products per LLM call | 20 |
| `--limit N` | Maximum products to process | unlimited |
| `--verbose` | Show detailed LLM logs | false |

## How It Works

### Batch Processing Flow

For each batch of products:

1. **Try OpenAI First**
   - Call GPT-4o-mini with batch
   - Parse and validate response
   - If ≥80% success → Save and continue
   - If <80% success → Move to Anthropic

2. **Fallback to Anthropic**
   - Call Claude Haiku with same batch
   - Parse and validate response
   - If ≥80% success → Save and continue
   - If <80% success → Move to Gemini

3. **Final Fallback to Gemini**
   - Call Gemini 2.0 Flash with same batch
   - Parse and validate response
   - If ≥80% success → Save and continue
   - If <80% success → Record as complete failure

4. **Complete Failure Handling**
   - Log to `data/.enrich-attributes-multi-llm-failures.json`
   - Track all 3 provider attempts
   - Continue processing remaining batches
   - Report at end of run

### Validation Criteria

A batch is considered successful if:
- At least 80% of products have ≥1 attribute assigned
- Response can be parsed as valid JSON
- Response contains expected number of products

## Output Files

### Checkpoint File
`data/.enrich-attributes-multi-llm-checkpoint.json`

```json
{
  "lastProcessedId": "prod_12345",
  "processedCount": 500,
  "stats": {
    "providerStats": {
      "openai": { "batches": 15, "products": 300, "tokens": 45000, "cost": 0.012 },
      "anthropic": { "batches": 5, "products": 100, "tokens": 15000, "cost": 0.008 },
      "gemini": { "batches": 5, "products": 100, "tokens": 15000, "cost": 0.003 }
    },
    "completeFailures": 0
  }
}
```

### Failures File
`data/.enrich-attributes-multi-llm-failures.json`

```json
[
  {
    "batchNumber": 42,
    "productIds": ["prod_100", "prod_101", "prod_102"],
    "attempts": [
      { "provider": "openai", "error": "Batch validation failed", "successRate": 0.65 },
      { "provider": "anthropic", "error": "Batch validation failed", "successRate": 0.70 },
      { "provider": "gemini", "error": "API error", "successRate": 0 }
    ],
    "timestamp": "2025-12-07T10:30:00Z"
  }
]
```

## Environment Setup

Required environment variables in `.env.local`:

```bash
# At least one is required, all three recommended for full fallback
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
# or
GEMINI_API_KEY=AIza...

# Neo4j connection (required)
NEO4J_URL=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

## Cost Optimization

### Recommended Strategy

1. **Start with OpenAI** (default behavior)
   - Best quality-to-cost ratio
   - Most reliable validation

2. **Anthropic as safety net**
   - Handles edge cases well
   - Good at structured output

3. **Gemini for cost savings**
   - Lowest cost per token
   - Good for bulk processing

### Expected Costs (per 1000 products)

Assuming average 500 tokens per product:

- **All OpenAI**: ~$0.375
- **All Anthropic**: ~$0.625
- **All Gemini**: ~$0.1875
- **Mixed (typical)**: ~$0.30 (mostly OpenAI with some fallbacks)

## Progress Monitoring

### Real-time Output

```
Batch #42 ✓: 18/20 products (90.0%) via openai | Total: 840/1000 | Rate: 5.2/s | Cost: $0.0315
  💾 Checkpoint saved
```

### Final Summary

```
═══════════════════════════════════════════════════════════════════════
  ENRICHMENT COMPLETE
═══════════════════════════════════════════════════════════════════════

Coverage in Database:
  Products with attributes: 1,000 / 1,000 (100.0%)

Processing:
  Products processed: 1,000
  Attributes added: 8,500
  Complete failures: 2
  Errors: 2

Provider Usage:
  OPENAI:
    Batches: 42 (failures: 3)
    Products: 840
    Tokens: 420,000
    Cost: $0.0252
  ANTHROPIC:
    Batches: 5 (failures: 2)
    Products: 100
    Tokens: 50,000
    Cost: $0.0125
  GEMINI:
    Batches: 3 (failures: 0)
    Products: 60
    Tokens: 30,000
    Cost: $0.0023

Total:
  Tokens: 500,000
  Estimated cost: $0.0400

Performance:
  Total time: 3m 20s
  Rate: 5.0 products/s
```

## Comparison with Other Scripts

| Feature | enrich-attributes-only.ts | enrich-attributes-multi-llm.ts |
|---------|--------------------------|--------------------------------|
| Providers | OpenAI only | OpenAI → Anthropic → Gemini |
| Retry logic | None | Automatic fallback |
| Failure tracking | Basic error count | Detailed per-batch tracking |
| Cost tracking | Total only | Per-provider breakdown |
| Resilience | Low (stops on errors) | High (continues with fallbacks) |
| Best for | Simple, stable runs | Production, high reliability |

## Troubleshooting

### All Providers Failing

Check that API keys are valid:
```bash
npx tsx scripts/enrich-attributes-multi-llm.ts --verbose --limit 20
```

Review failures file:
```bash
cat data/.enrich-attributes-multi-llm-failures.json | jq
```

### Low Success Rates

If batches consistently fail validation:
1. Reduce batch size: `--batch-size 10`
2. Check product data quality
3. Review failures for patterns

### Rate Limiting

The script includes 500ms delay between batches. If still hitting limits:
1. Increase delay in code (line near end of batch loop)
2. Use smaller batch size
3. Check provider rate limit status

### Resuming After Failure

The script automatically resumes from checkpoint:
```bash
# Just re-run the same command
npx tsx scripts/enrich-attributes-multi-llm.ts --live
```

To start fresh:
```bash
rm data/.enrich-attributes-multi-llm-checkpoint.json
npx tsx scripts/enrich-attributes-multi-llm.ts --live
```

## Advanced Usage

### Testing Specific Provider Order

To test different provider priorities, modify line ~559:
```typescript
const providers: Array<'openai' | 'anthropic' | 'gemini'> = ['gemini', 'openai', 'anthropic'];
```

### Custom Validation Threshold

To change the 80% success requirement, modify line ~127:
```typescript
const MIN_BATCH_SUCCESS_RATE = 0.70; // 70%
```

### Analyzing Failures

```bash
# Count failures by provider
cat data/.enrich-attributes-multi-llm-failures.json | jq '[.[].attempts[0].provider] | group_by(.) | map({provider: .[0], count: length})'

# Get products that failed all providers
cat data/.enrich-attributes-multi-llm-failures.json | jq '[.[].productIds] | flatten | unique'
```

## Best Practices

1. **Start with small test**: `--limit 100 --verbose`
2. **Monitor first 500 products**: Check provider distribution
3. **Review failures regularly**: Look for patterns
4. **Adjust batch size**: Based on success rates
5. **Use dry-run first**: Verify behavior before `--live`

## Support & Issues

For issues or questions:
1. Check `data/.enrich-attributes-multi-llm-failures.json`
2. Run with `--verbose` to see detailed logs
3. Review checkpoint file for state
4. Compare with single-provider script for validation
