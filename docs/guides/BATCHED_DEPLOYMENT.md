# Batched Deployment Guide

**Last Updated**: October 29, 2025
**Purpose**: Technical guide for running large-scale batched operations

---

## Overview

This guide documents the batched processing system used for the historical Phase C interest extraction run. The same pattern can be reused for other large catalog operations, including 88,674-product production workflows.

---

## Why Batching?

### The Problem

Processing tens-of-thousands of products in a single operation:
- Takes 23+ hours continuously
- Risks hitting API rate limits
- Makes debugging difficult
- Loses all progress on failure
- Blocks other operations
- Hard to monitor progress

### The Solution

Process in smaller batches with:
- **Checkpointing**: Save progress every N products
- **Resume capability**: Restart from last checkpoint
- **Error recovery**: Retry failed batches
- **Progress tracking**: Real-time status updates
- **Cost estimation**: Track spending per batch

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│          Batched Deployment System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐                                       │
│  │  Main Script     │  rebuild-interests-batched.sh         │
│  │  (Orchestrator)  │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           │ Calls in batches                                │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │  Worker Script   │  rebuild-interests.ts                 │
│  │  (Processor)     │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           │ Processes products                              │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │  State Manager   │  interest-rebuild-state.json          │
│  │  (Checkpoint)    │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           │ Saves every 100 products                        │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │  Statistics      │  interest-stats.json                  │
│  │  (Analytics)     │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Start Deployment
    │
    ▼
Check for Existing Checkpoint
    │
    ├─ Found → Resume from checkpoint
    │
    └─ Not found → Start from beginning
    │
    ▼
For each batch (1-42):
    │
    ├─ Load next 1,000 products
    │
    ├─ Process in groups of 10
    │   │
    │   ├─ Extract interests (LLM)
    │   ├─ Store in Neo4j
    │   └─ Update checkpoint every 100
    │
    ├─ Log batch results
    │
    ├─ Update statistics
    │
    └─ Pause 30s before next batch
    │
    ▼
All batches complete
    │
    ▼
Generate final report
```

---

## Implementation

### Main Script: `rebuild-interests-batched.sh`

**Purpose**: Orchestrates batch processing

**Key Features**:
1. Automatic checkpoint detection
2. Batch loop with progress tracking
3. Error handling and retry
4. Cost and time estimation
5. Clean terminal output

**Code Structure**:
```bash
#!/bin/bash
set -e  # Exit on error

# Configuration
TOTAL_PRODUCTS=41686
BATCH_SIZE=1000
CURRENT_BATCH=0

# Check for checkpoint
if [ -f "data/interest-rebuild-state.json" ]; then
  PROCESSED=$(extract_processed_count)
  CURRENT_BATCH=$((PROCESSED / BATCH_SIZE))
  echo "Resuming from batch $CURRENT_BATCH"
fi

# Process batches
for ((batch=$CURRENT_BATCH; batch<$NUM_BATCHES; batch++)); do
  LIMIT=$(((batch + 1) * BATCH_SIZE))

  # Run worker script with limit
  npx tsx scripts/rebuild-interests.ts --limit $LIMIT

  # Check for errors
  if [ $? -ne 0 ]; then
    echo "Batch failed, safe to retry"
    exit 1
  fi

  # Pause between batches
  sleep 30
done

echo "Deployment complete!"
```

### Worker Script: `rebuild-interests.ts`

**Purpose**: Processes products and extracts interests

**Key Features**:
1. Product loading with filtering
2. Interest extraction via LLM
3. Neo4j storage
4. Checkpoint management
5. Statistics tracking

**Code Structure**:
```typescript
class InterestRebuilder {
  private state: RebuildState;
  private stats: RebuildStats;

  async run(options: RebuildOptions) {
    // Load state from checkpoint
    await this.loadState();

    // Load products (skip already processed)
    const products = await this.loadProducts(options);

    // Process in batches of 10
    for (let i = 0; i < products.length; i += 10) {
      const batch = products.slice(i, i + 10);

      // Extract interests (parallel)
      await Promise.all(
        batch.map(p => this.processProduct(p))
      );

      // Checkpoint every 100 products
      if ((i + 10) % 100 === 0) {
        await this.saveCheckpoint();
      }
    }

    // Generate final statistics
    await this.generateStats();
  }

  async processProduct(product: Product) {
    try {
      // Extract interests via LLM
      const interests = await this.extractor.extract(product);

      // Store in Neo4j
      await this.storeInterests(product.id, interests);

      // Update state
      this.state.processedProducts++;
    } catch (error) {
      this.state.failedProducts.push(product.id);
    }
  }
}
```

---

## Configuration

### Batch Parameters

**Batch Size** (`BATCH_SIZE`):
- Default: 1,000 products
- Range: 100-5,000
- Considerations:
  - Smaller = More frequent checkpoints, slower
  - Larger = Fewer checkpoints, faster but riskier

**Checkpoint Interval** (`CHECKPOINT_INTERVAL`):
- Default: 100 products
- Range: 10-500
- Considerations:
  - Smaller = Less data loss on failure
  - Larger = Better performance

**Concurrency** (`BATCH_CONCURRENCY`):
- Default: 5 parallel requests
- Range: 1-10
- Considerations:
  - Higher = Faster but may hit rate limits
  - Lower = Slower but safer

**Pause Duration**:
- Default: 30 seconds between batches
- Range: 10-120 seconds
- Purpose: Avoid API rate limits

### Tuning for Different Use Cases

**Fast Processing** (willing to accept more risk):
```bash
BATCH_SIZE=2000
CHECKPOINT_INTERVAL=200
BATCH_CONCURRENCY=10
PAUSE_DURATION=10
```

**Safe Processing** (minimize risk):
```bash
BATCH_SIZE=500
CHECKPOINT_INTERVAL=50
BATCH_CONCURRENCY=3
PAUSE_DURATION=60
```

**Balanced** (recommended):
```bash
BATCH_SIZE=1000
CHECKPOINT_INTERVAL=100
BATCH_CONCURRENCY=5
PAUSE_DURATION=30
```

---

## Checkpoint System

### State File Format

**Location**: `data/interest-rebuild-state.json`

**Structure**:
```json
{
  "startedAt": "2025-10-29T17:30:00Z",
  "lastCheckpoint": "2025-10-29T18:15:00Z",
  "processedProducts": 1247,
  "failedProducts": [],
  "lastProcessedProductId": "p_12470",
  "currentBatch": 1,
  "totalBatches": 42,
  "estimatedCompletion": "2025-11-01T11:30:00Z"
}
```

### How Checkpointing Works

1. **Save checkpoint** every 100 products:
```typescript
async saveCheckpoint() {
  const state = {
    startedAt: this.startedAt,
    lastCheckpoint: new Date().toISOString(),
    processedProducts: this.processedCount,
    failedProducts: this.failed,
    lastProcessedProductId: this.lastId,
    currentBatch: Math.floor(this.processedCount / 1000),
    totalBatches: 42,
    estimatedCompletion: this.calculateETA()
  };

  await fs.writeFile(
    'data/interest-rebuild-state.json',
    JSON.stringify(state, null, 2)
  );
}
```

2. **Load checkpoint** on startup:
```typescript
async loadState() {
  try {
    const data = await fs.readFile(
      'data/interest-rebuild-state.json',
      'utf8'
    );
    this.state = JSON.parse(data);

    logger.info('Checkpoint found', {
      processed: this.state.processedProducts,
      failed: this.state.failedProducts.length
    });
  } catch {
    // No checkpoint, start fresh
    this.state = this.createNewState();
  }
}
```

3. **Skip processed products**:
```typescript
async loadProducts(options) {
  const query = `
    MATCH (p:Product)
    WHERE p.id > $lastProcessedId
    ORDER BY p.id
    LIMIT $limit
    RETURN p
  `;

  return await neo4j.run(query, {
    lastProcessedId: this.state.lastProcessedProductId || '',
    limit: options.limit
  });
}
```

---

## Running a Deployment

### Pre-Flight Checklist

Before starting:
- [ ] Neo4j connection working
- [ ] OpenAI API key valid
- [ ] Sufficient API quota/credits
- [ ] Disk space for logs (>1GB)
- [ ] Terminal session (tmux/screen recommended)
- [ ] Backup of current state (optional)

### Starting the Deployment

**Method 1: Direct execution**
```bash
# Make executable
chmod +x scripts/rebuild-interests-batched.sh

# Run in foreground
./scripts/rebuild-interests-batched.sh
```

**Method 2: Background with tmux** (recommended)
```bash
# Start tmux session
tmux new -s phase-c-deployment

# Run script
./scripts/rebuild-interests-batched.sh

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t phase-c-deployment
```

**Method 3: Background with nohup**
```bash
# Run in background
nohup ./scripts/rebuild-interests-batched.sh \
  > deployment.log 2>&1 &

# Get process ID
echo $!

# Monitor
tail -f deployment.log
```

### Monitoring Progress

**Real-time log**:
```bash
tail -f data/rebuild-batch-*.log
```

**Current state**:
```bash
cat data/interest-rebuild-state.json | jq '.processedProducts'
```

**Progress percentage**:
```bash
cat data/interest-rebuild-state.json | jq \
  '(.processedProducts / 41686 * 100 | floor)'
```

**Estimated completion**:
```bash
cat data/interest-rebuild-state.json | jq \
  '.estimatedCompletion'
```

### Pausing/Stopping

**Graceful stop**:
```
Press Ctrl+C
```
- Finishes current product
- Saves checkpoint
- Exits cleanly

**Force stop** (not recommended):
```bash
# Find process
ps aux | grep rebuild-interests

# Kill it
kill -9 [PID]
```
- May lose progress since last checkpoint
- Safe to resume

### Resuming

**Simply run again**:
```bash
./scripts/rebuild-interests-batched.sh
```
- Automatically detects checkpoint
- Resumes from last position
- No data loss

---

## Error Handling

### Common Errors

#### 1. API Rate Limit

**Symptoms**:
```
Error: Rate limit exceeded (429)
```

**Solutions**:
```bash
# Reduce concurrency
# In rebuild-interests.ts:
const BATCH_CONCURRENCY = 3; // down from 5

# Increase pause duration
# In rebuild-interests-batched.sh:
PAUSE_DURATION=60 # up from 30
```

#### 2. Network Timeout

**Symptoms**:
```
Error: ECONNRESET
Error: ETIMEDOUT
```

**Solutions**:
```typescript
// Add retry logic
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

#### 3. Neo4j Connection Lost

**Symptoms**:
```
Error: ServiceUnavailable
Error: Session expired
```

**Solutions**:
```typescript
// Reconnect before each batch
async processBatch() {
  await this.neo4j.verifyConnectivity();
  // ... process products
}
```

#### 4. Disk Space Full

**Symptoms**:
```
Error: ENOSPC
```

**Solutions**:
```bash
# Clean old logs
rm data/rebuild-batch-*.log

# Compress existing logs
gzip logs/*.log
```

### Error Recovery

**Automatic recovery**:
- Script saves checkpoint every 100 products
- On error, state is preserved
- Simply re-run script to resume

**Manual recovery**:
```bash
# Check what failed
cat data/interest-rebuild-state.json | jq '.failedProducts'

# Reprocess failed products
npx tsx scripts/rebuild-interests.ts \
  --products "[failed IDs]"
```

---

## Performance Optimization

### Parallel Processing

**Current**: 5 products in parallel

**Increase** (if no rate limits):
```typescript
// In rebuild-interests.ts
const BATCH_CONCURRENCY = 10; // up from 5
```

**Impact**:
- 2x faster processing
- Higher API costs (same total, faster)
- Risk of hitting rate limits

### Caching

**Enable LLM response caching**:
```typescript
class InterestExtractor {
  private cache = new Map<string, Interest[]>();

  async extract(product: Product) {
    const key = product.id;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const interests = await this.llmExtract(product);
    this.cache.set(key, interests);

    return interests;
  }
}
```

**Impact**:
- Faster retries
- Lower costs on re-runs
- Uses memory

### Database Optimization

**Batch Neo4j writes**:
```typescript
async storeInterests(
  productInterests: Array<{productId, interests}>
) {
  // Single transaction for multiple products
  const session = this.driver.session();
  const tx = session.beginTransaction();

  for (const {productId, interests} of productInterests) {
    await tx.run(STORE_QUERY, {productId, interests});
  }

  await tx.commit();
  await session.close();
}
```

**Impact**:
- Faster writes
- Fewer database round-trips
- Lower Neo4j connection overhead

---

## Monitoring & Metrics

### Key Metrics

**Progress Metrics**:
- Products processed
- Products remaining
- Current batch
- Progress percentage
- Estimated completion time

**Performance Metrics**:
- Average processing time per product
- Products per second
- Batch completion time
- API call duration

**Cost Metrics**:
- API calls made
- Tokens consumed (input/output)
- Cost per product
- Total cost to date
- Estimated total cost

**Quality Metrics**:
- Interests extracted per product
- Unique interests discovered
- Failed extractions
- Retry count

### Tracking Metrics

**In-Script Tracking**:
```typescript
class MetricsTracker {
  private metrics = {
    startTime: Date.now(),
    productsProcessed: 0,
    apiCalls: 0,
    tokensUsed: {input: 0, output: 0},
    costsAccrued: 0,
    failures: 0
  };

  recordProduct(product: Product, result: ExtractionResult) {
    this.metrics.productsProcessed++;
    this.metrics.apiCalls++;
    this.metrics.tokensUsed.input += result.tokensInput;
    this.metrics.tokensUsed.output += result.tokensOutput;
    this.metrics.costsAccrued += result.cost;
  }

  getStats() {
    const duration = Date.now() - this.metrics.startTime;
    const productsPerSecond =
      this.metrics.productsProcessed / (duration / 1000);

    return {
      ...this.metrics,
      duration,
      productsPerSecond,
      estimatedTotal: this.calculateTotal()
    };
  }
}
```

**Statistics File**:
```json
{
  "summary": {
    "totalProducts": 41686,
    "processedProducts": 1247,
    "failedProducts": 0,
    "uniqueInterests": 1523,
    "avgInterestsPerProduct": 5.2,
    "avgProcessingTime": 2.1,
    "totalCost": 0.67
  },
  "topInterests": [
    {"name": "skincare", "count": 423, "avgRelevance": 0.82},
    {"name": "makeup", "count": 391, "avgRelevance": 0.89},
    {"name": "wine", "count": 89, "avgRelevance": 0.91}
  ]
}
```

---

## Best Practices

### Do's

✅ **Use tmux/screen** for long-running deployments
✅ **Monitor regularly** (every 6-12 hours)
✅ **Test on small batch** before full deployment
✅ **Check logs** for errors or warnings
✅ **Backup state files** periodically
✅ **Document any issues** encountered
✅ **Validate results** after completion

### Don'ts

❌ **Don't run in unstable network** conditions
❌ **Don't modify state files** manually
❌ **Don't run multiple instances** simultaneously
❌ **Don't skip validation** after deployment
❌ **Don't ignore rate limit warnings**
❌ **Don't delete checkpoints** during deployment

---

## Troubleshooting

### Deployment Won't Start

**Check**:
1. Neo4j connection: `npm run test:connection`
2. API keys: Check `.env.local`
3. Script permissions: `chmod +x scripts/*.sh`
4. Dependencies: `npm install`

### Deployment is Slow

**Possible causes**:
1. API rate limiting - increase pause duration
2. Network latency - check connection
3. Low concurrency - increase parallel processing
4. Neo4j slow - check database performance

### Checkpoint Not Updating

**Check**:
1. Disk space: `df -h`
2. File permissions: `ls -la data/`
3. Process running: `ps aux | grep rebuild`
4. Logs for errors: `tail -f data/rebuild-batch-*.log`

### High API Costs

**Possible causes**:
1. Long product descriptions - normal
2. Retry logic - check failed products
3. High concurrency - may be unnecessary

**Solutions**:
- Use GPT-4o-mini (60% cheaper)
- Reduce concurrency
- Implement caching
- Skip already-processed products

---

## Applying to Other Operations

### Template for New Batched Operations

```bash
#!/bin/bash
# batched-operation.sh

set -e

TOTAL_ITEMS=41686
BATCH_SIZE=1000
CURRENT_BATCH=0

# Checkpoint detection
if [ -f "data/operation-state.json" ]; then
  PROCESSED=$(get_processed_count)
  CURRENT_BATCH=$((PROCESSED / BATCH_SIZE))
fi

# Batch loop
for ((batch=$CURRENT_BATCH; batch<$NUM_BATCHES; batch++)); do
  LIMIT=$(((batch + 1) * BATCH_SIZE))

  # Run worker
  npx tsx scripts/operation-worker.ts --limit $LIMIT

  # Error handling
  if [ $? -ne 0 ]; then
    echo "Batch $batch failed"
    exit 1
  fi

  # Pause
  sleep 30
done

echo "Complete!"
```

### Use Cases

**Product Re-embedding**:
- Regenerate all product embeddings
- ~30 seconds per batch
- Cost: $10-15

**Facet Extraction**:
- Extract product facets via LLM
- ~1 hour per batch
- Cost: $20-30

**Description Enhancement**:
- Improve product descriptions
- ~2 hours per batch
- Cost: $40-60

**Image Analysis**:
- Extract features from product images
- ~3 hours per batch
- Cost: Vision API costs

---

## Summary

The batched deployment system provides:

✅ **Reliability**: Checkpoint-based resume capability
✅ **Observability**: Real-time progress tracking
✅ **Safety**: Graceful error handling and recovery
✅ **Efficiency**: Parallel processing with rate limiting
✅ **Flexibility**: Configurable batch size and concurrency
✅ **Monitoring**: Comprehensive metrics and logging

**Key Takeaway**: Use batching for any operation on a large product catalog (historically 41,686 products; now 88,674) that takes >1 hour or costs >$5.

---

**Last Updated**: October 29, 2025
**Used By**: Phase C interest extraction deployment
**Status**: Production-ready ✅
