# Multi-LLM Fallback Enrichment - Quick Start Guide

## 30-Second Overview

The multi-LLM fallback system enriches products with gift attributes using 3 LLM providers for maximum reliability:
- **OpenAI** (primary) → **Anthropic** (backup) → **Gemini** (last resort)

If OpenAI fails validation, it immediately tries Anthropic. If that fails, tries Gemini. If all fail, logs the batch and continues processing.

## Installation

**Already installed!** All dependencies are in package.json:
- `openai`: ✓
- `@anthropic-ai/sdk`: ✓
- `@google/generative-ai`: ✓

## Setup

### 1. Configure API Keys

Add to `.env.local`:

```bash
# At least ONE required, all THREE recommended
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

### 2. Verify Setup

```bash
npm run enrich:multi:test
```

This runs a dry-run test on 100 products with verbose logging.

## Usage

### Quick Commands

```bash
# Test on 100 products (dry-run)
npm run enrich:multi:test

# Dry-run with default settings
npm run enrich:multi

# LIVE RUN - actually save to database
npm run enrich:multi:live

# Test fallback mechanism
npm run test:fallback
```

### Full Command Options

```bash
npx tsx scripts/enrich-attributes-multi-llm.ts [options]

Options:
  --live              Save changes (default: dry-run)
  --batch-size N      Products per call (default: 20)
  --limit N           Max products to process
  --verbose           Detailed logging
```

## Reading the Output

### Real-time Progress

```
Batch #1 ✓: 18/20 products (90.0%) via openai | Total: 20/1000 | Cost: $0.0002
```

- `✓` = Success
- `18/20` = Valid products (90% success rate)
- `via openai` = Which provider was used
- `Total: 20/1000` = Overall progress
- `Cost: $0.0002` = Running cost

### Fallback in Action

```
Batch #5 ✗: 12/20 products (60.0%) via openai | Trying anthropic...
Batch #5 ✓: 19/20 products (95.0%) via anthropic | Total: 100/1000 | Cost: $0.0011
```

- First attempt with OpenAI failed (60% < 80% threshold)
- Automatically tried Anthropic
- Anthropic succeeded (95% success rate)

### Final Summary

```
Provider Usage:
  OPENAI:
    Batches: 42 (failures: 3)
    Products: 840
    Cost: $0.0252
  ANTHROPIC:
    Batches: 5 (failures: 0)
    Products: 100
    Cost: $0.0125
  GEMINI:
    Batches: 3 (failures: 0)
    Products: 60
    Cost: $0.0023
```

Shows which provider handled how many batches and the cost per provider.

## Understanding Success Rates

### What is "Success"?

A batch succeeds if **≥80% of products** get at least 1 attribute assigned.

Example:
- Batch of 20 products
- 18 products get attributes (e.g., isPractical=true, isLuxury=false)
- 2 products get no attributes
- Success rate: 18/20 = 90% ✓ (passes 80% threshold)

### What Happens on Failure?

If a batch fails validation:
1. Current provider marked as failed
2. Move to next provider immediately
3. Try with next provider (no changes to prompt)
4. If all 3 fail → log to failures file and continue

## Files Created

### Checkpoint File
`data/.enrich-attributes-multi-llm-checkpoint.json`
- Saves progress every 100 products
- Includes provider statistics
- Resume from here if interrupted

### Failures File
`data/.enrich-attributes-multi-llm-failures.json`
- Lists batches that failed all 3 providers
- Includes product IDs for retry
- Shows what went wrong with each provider

## Common Scenarios

### Scenario 1: Normal Operation (Mostly OpenAI)

```
✅ Expected:
- 80-90% batches via OpenAI
- 10-20% via Anthropic/Gemini
- 0-2% complete failures
```

### Scenario 2: OpenAI Rate Limited

```
⚠️ What happens:
- First few batches use OpenAI
- OpenAI gets rate limited
- Automatically switches to Anthropic
- After rate limit expires, returns to OpenAI
```

### Scenario 3: Provider Down

```
⚠️ What happens:
- If OpenAI is down/unavailable
- All batches go to Anthropic
- If Anthropic also down → Gemini
- Processing continues without interruption
```

## Cost Comparison

Example for 1,000 products:

| Scenario | Cost | Time |
|----------|------|------|
| All OpenAI | $0.38 | 3-4 min |
| All Anthropic | $0.62 | 3-4 min |
| All Gemini | $0.19 | 3-4 min |
| **Mixed (typical)** | **$0.30** | **3-4 min** |

Fallback system typically costs **20% less** than pure OpenAI while maintaining higher reliability.

## Troubleshooting

### No Providers Available

```bash
# Check API keys
env | grep -E "OPENAI|ANTHROPIC|GOOGLE|GEMINI"
```

### All Batches Failing

```bash
# Run with verbose logging
npm run enrich:multi:test

# Check failures file
cat data/.enrich-attributes-multi-llm-failures.json | jq
```

### Checkpoint Issues

```bash
# Clear checkpoint to start fresh
rm data/.enrich-attributes-multi-llm-checkpoint.json
npm run enrich:multi:live
```

## Best Practices

### 1. Start Small
```bash
npm run enrich:multi:test  # Test 100 products first
```

### 2. Monitor First Run
```bash
# Use verbose mode to watch fallback behavior
npx tsx scripts/enrich-attributes-multi-llm.ts --limit 500 --verbose
```

### 3. Check Failures
```bash
# After run, review any complete failures
cat data/.enrich-attributes-multi-llm-failures.json
```

### 4. Optimize Batch Size

- **Large batches (20-30)**: Faster, but higher failure rate
- **Small batches (10-15)**: Slower, but more reliable
- **Default (20)**: Good balance

### 5. Use Dry-Run First

Always test without `--live` first:
```bash
npm run enrich:multi  # Dry-run
# Check output looks good
npm run enrich:multi:live  # Then live
```

## Advanced Usage

### Custom Batch Size

```bash
# Smaller batches for better quality
npx tsx scripts/enrich-attributes-multi-llm.ts --live --batch-size 10

# Larger batches for speed
npx tsx scripts/enrich-attributes-multi-llm.ts --live --batch-size 30
```

### Process Specific Number

```bash
# Process exactly 500 products
npx tsx scripts/enrich-attributes-multi-llm.ts --live --limit 500
```

### Testing Fallback

```bash
# Run simulation test
npm run test:fallback

# Shows how fallback handles failures
```

## Resume After Interruption

The script automatically resumes:

```bash
# First run (interrupted at 500 products)
npm run enrich:multi:live
^C  # Interrupted

# Resume (starts from product 501)
npm run enrich:multi:live  # Automatically continues!
```

Checkpoint saved every 100 products, so you lose max 99 products of progress.

## Monitoring Progress

### Real-time Stats

- **Total**: Overall progress
- **Rate**: Products per second
- **Cost**: Running total cost
- **Provider**: Which LLM handling batch

### Provider Distribution

Look for healthy distribution:
- Primary (OpenAI): 70-85%
- Backup (Anthropic): 10-20%
- Last resort (Gemini): 0-10%

If Gemini is handling >30%, check OpenAI and Anthropic API keys.

## Support

### Documentation
- **Full Guide**: `scripts/MULTI_LLM_ENRICHMENT_README.md`
- **Implementation**: `MULTI_LLM_IMPLEMENTATION_SUMMARY.md`
- **This Guide**: `MULTI_LLM_QUICK_START.md`

### Test Scripts
- **Test fallback**: `npm run test:fallback`
- **Test enrichment**: `npm run enrich:multi:test`

### Logs
- **Checkpoint**: `data/.enrich-attributes-multi-llm-checkpoint.json`
- **Failures**: `data/.enrich-attributes-multi-llm-failures.json`

## Next Steps

1. **Test on small batch**:
   ```bash
   npm run enrich:multi:test
   ```

2. **Review output** - check provider distribution

3. **Run on full dataset**:
   ```bash
   npm run enrich:multi:live
   ```

4. **Monitor progress** - watch for complete failures

5. **Review failures** (if any):
   ```bash
   cat data/.enrich-attributes-multi-llm-failures.json
   ```

6. **Celebrate** when all products have attributes! 🎉

---

**Ready to start?**

```bash
npm run enrich:multi:test
```
