# Attribute Enrichment Automation Guide

## Status: RUNNING

The automatic attribute enrichment process is now running in the background with robust retry logic.

### Current Progress

- **Started:** December 6, 2025 at 21:59 PST
- **Process ID:** 51787
- **Initial State:** 1,500 products completed, 40,809 remaining
- **Target:** 41,535 products total (updated count: 40,809 remaining)
- **Processing Rate:** ~0.2 products/second (~12 products/minute)
- **Estimated Time:** 5-7 hours with retries

### How It Works

The retry wrapper script (`scripts/run-enrichment-with-retry.sh`) automatically:

1. **Runs the enrichment:** Executes `npx tsx scripts/enrich-attributes-only.ts --live`
2. **Monitors for failures:** Catches API errors, rate limits, network issues
3. **Automatic retry:** Waits 60 seconds and retries automatically
4. **Checkpointing:** Each run resumes from where it left off
5. **Smart backoff:** After 5 consecutive failures, increases delay to 120 seconds
6. **Max retries:** Stops after 100 attempts (prevents infinite loops)

### Files Created

1. **`scripts/run-enrichment-with-retry.sh`** - Main retry wrapper
   - Handles automatic retries
   - Logs all attempts
   - Monitors progress
   - Exits when complete

2. **`scripts/monitor-enrichment.sh`** - Progress monitor
   - Shows real-time progress
   - Displays ETA
   - Shows recent batches
   - Process status

3. **`logs/enrichment-retry.log`** - Main log file
   - All retry attempts
   - Progress updates
   - Error messages
   - Timestamps

4. **`data/.enrich-attributes-checkpoint.json`** - Checkpoint data
   - Last processed product ID
   - Products completed
   - Stats and costs
   - Automatic resume point

## Monitoring Commands

### Quick Status Check
```bash
./scripts/monitor-enrichment.sh
```

Shows:
- Current progress (products processed, remaining)
- Processing rate
- Estimated time to completion
- Recent batch results
- Process status

### Watch Live Progress
```bash
tail -f logs/enrichment-retry.log
```

Shows real-time updates as batches complete.

### Check Specific Stats
```bash
# See only batch completions
tail -f logs/enrichment-retry.log | grep "Batch #"

# See retry attempts
tail -f logs/enrichment-retry.log | grep "Attempt #"

# See errors
tail -f logs/enrichment-retry.log | grep -i error
```

### Checkpoint Data
```bash
cat data/.enrich-attributes-checkpoint.json | jq
```

## Management Commands

### Check if Running
```bash
pgrep -f "run-enrichment-with-retry.sh"
```

If you get a PID, it's running. Currently: **51787**

### Stop the Process
```bash
kill $(pgrep -f "run-enrichment-with-retry.sh")
```

Or with specific PID:
```bash
kill 51787
```

### Restart After Stopping
```bash
nohup ./scripts/run-enrichment-with-retry.sh > logs/enrichment-retry-output.log 2>&1 &
```

### Manual Single Run (No Retry)
```bash
npx tsx scripts/enrich-attributes-only.ts --live
```

## Expected Behavior

### Normal Operation
- Batches complete every ~5-10 seconds
- 100% success rate per batch (20/20 products)
- Checkpoint saved every 100 products
- Cost increasing gradually (~$0.04 per 1,500 products)

### Handling Failures

**Scenario 1: API Rate Limit**
- Script fails after several batches
- Waits 60 seconds
- Retries automatically
- Resumes from checkpoint

**Scenario 2: Temporary Network Issue**
- Single batch fails
- Script exits
- Waits 60 seconds
- Retries from last checkpoint

**Scenario 3: Consecutive Failures (5+)**
- Increases retry delay to 120 seconds
- Logs warning about potential issues
- Continues retrying

**Scenario 4: Max Retries Reached (100)**
- Stops and logs final status
- Requires manual intervention
- Check logs for root cause

## Progress Tracking

### Key Milestones

| Products | Percentage | Est. Cost | Time |
|----------|-----------|-----------|------|
| 5,000    | 12%       | $0.13     | 1h   |
| 10,000   | 24%       | $0.27     | 2h   |
| 20,000   | 48%       | $0.54     | 4h   |
| 30,000   | 72%       | $0.80     | 6h   |
| 40,000   | 96%       | $1.07     | 8h   |
| 41,535   | 100%      | $1.11     | 8.5h |

*Note: Times assume ~0.2 products/sec with retry delays*

### Success Indicators

When complete, you'll see:
```
═══════════════════════════════════════════════════════════════════════
  🎉 ENRICHMENT COMPLETE!
═══════════════════════════════════════════════════════════════════════

Total products enriched: 41535
Total attempts: 15
```

The process will automatically exit.

## Troubleshooting

### Process Not Running?
```bash
./scripts/monitor-enrichment.sh
```

If status shows "NOT RUNNING", restart:
```bash
nohup ./scripts/run-enrichment-with-retry.sh > logs/enrichment-retry-output.log 2>&1 &
```

### Stuck on Same Product?
Check the logs:
```bash
tail -100 logs/enrichment-retry.log | grep -E "(Error|failed|Batch #)"
```

If you see repeated errors on the same product, there may be a data issue.

### Too Many Failures?
Check:
1. **OpenAI API Key:** Ensure it's valid and has credits
2. **Neo4j Connection:** Verify database is accessible
3. **Network:** Check internet connectivity
4. **Rate Limits:** Wait longer between retries

### High Error Rate in Batches
The script validates that 80%+ of products in each batch get attributes.
If validation fails repeatedly:
- Check product data quality
- Review error messages in logs
- Consider reducing batch size

## Cost Estimates

Based on current progress:

- **Model:** GPT-4o-mini
- **Pricing:** $0.15/1M input tokens, $0.60/1M output tokens
- **Current Cost:** ~$0.04 per 1,500 products
- **Estimated Total:** $1.00-$1.50 for all 41,535 products
- **Tokens Used:** ~5-7M total

Very affordable for comprehensive enrichment!

## What Happens After Completion?

1. Script automatically exits with success message
2. Checkpoint file shows `needsAttributes: 0`
3. All 41,535 products will have gift attributes
4. Can verify with:
   ```bash
   npx tsx scripts/enrich-attributes-only.ts
   ```
   (dry-run mode will show 0 products need attributes)

## Next Steps After Completion

Once all products are enriched:

1. **Verify Coverage:**
   ```bash
   npx tsx scripts/enrich-attributes-only.ts
   ```
   Should show: "All products already have attributes!"

2. **Query the Data:**
   - Products with `isPractical = true`
   - Products with `isLuxury = true`
   - Multi-attribute searches

3. **Test the System:**
   - Run dialogue tests
   - Verify gift recommendations
   - Check attribute accuracy

4. **Clean Up:**
   - Archive logs if needed
   - Remove checkpoint file
   - Document any issues found

## Support

If you need to intervene:

1. **Check current status:** `./scripts/monitor-enrichment.sh`
2. **Review recent logs:** `tail -100 logs/enrichment-retry.log`
3. **Stop if needed:** `kill $(pgrep -f run-enrichment-with-retry.sh)`
4. **Manual run:** `npx tsx scripts/enrich-attributes-only.ts --live`
5. **Resume automation:** Restart the retry wrapper script

---

**Created:** December 6, 2025
**Process Started:** 21:59 PST
**PID:** 51787
**Expected Completion:** December 7, 2025 ~03:00-05:00 PST
