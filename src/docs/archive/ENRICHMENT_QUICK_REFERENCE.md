# Enrichment Quick Reference

## Status: RUNNING (PID: 51787)

### One-Liner Checks

```bash
# Quick status
./scripts/monitor-enrichment.sh

# Watch live
tail -f logs/enrichment-retry.log

# Latest batch
tail -5 logs/enrichment-retry.log | grep "Batch #"

# Check if running
pgrep -f "run-enrichment-with-retry.sh"
```

### Current Progress

- **Started:** December 6, 2025 at 21:59 PST
- **Progress:** 1,520/40,809 products (3.7%)
- **Batches:** #78 completed
- **Rate:** ~0.2 products/second
- **Success:** 100% per batch
- **ETA:** ~60 hours (with retries, likely 5-7 hours actual)

### Stop/Start

```bash
# Stop
kill $(pgrep -f "run-enrichment-with-retry.sh")

# Start
nohup ./scripts/run-enrichment-with-retry.sh > logs/enrichment-retry-output.log 2>&1 &
```

### Files

- **Retry Script:** `scripts/run-enrichment-with-retry.sh`
- **Monitor:** `scripts/monitor-enrichment.sh`
- **Main Log:** `logs/enrichment-retry.log`
- **Checkpoint:** `data/.enrich-attributes-checkpoint.json`
- **Full Guide:** `ENRICHMENT_AUTOMATION_GUIDE.md`

### Expected Completion

**December 7, 2025 ~03:00-05:00 PST**

The script will:
1. Run until all 40,809 products are enriched
2. Automatically retry on failures (60s delay)
3. Resume from checkpoint each time
4. Exit with success message when complete

### Troubleshooting

**Not progressing?**
```bash
tail -100 logs/enrichment-retry.log | grep -i error
```

**Stuck?**
```bash
kill $(pgrep -f run-enrichment-with-retry.sh)
./scripts/run-enrichment-with-retry.sh
```

**Check logs:**
```bash
less logs/enrichment-retry.log
```

### What's Happening

The script is:
- Processing 20 products per batch
- Calling OpenAI GPT-4o-mini for attributes
- Validating 80%+ success per batch
- Saving checkpoint every 100 products
- Retrying automatically on failures

All good! Let it run.
