# Multi-LLM Fallback System - Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    START ENRICHMENT                             │
│                                                                  │
│  1. Load checkpoint (if exists)                                 │
│  2. Initialize LLM clients (OpenAI, Anthropic, Gemini)         │
│  3. Count products needing attributes                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FETCH BATCH OF PRODUCTS                         │
│                                                                  │
│  Query: Products WHERE is_practical IS NULL                     │
│  Batch Size: 20 (configurable)                                  │
│  Order: BY product.id (for resumability)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TRY PROVIDER #1: OPENAI                        │
│                                                                  │
│  Model: gpt-4o-mini                                             │
│  Prompt: Batch of 20 products → Analyze gift attributes        │
│  Response: JSON array with attributes                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ┌────────┐
                    │ PARSE  │
                    │  JSON  │
                    └────┬───┘
                         │
                         ▼
                  ┌──────────────┐
                  │  VALIDATE    │
                  │ ≥80% Success?│
                  └──────┬───┬───┘
                         │   │
                    YES  │   │  NO
                         │   │
                         ▼   ▼
           ┌──────────────┐ ┌────────────────────────────────┐
           │   SUCCESS!   │ │   TRY PROVIDER #2: ANTHROPIC   │
           │              │ │                                 │
           │ - Save attrs │ │  Model: claude-3-haiku         │
           │ - Update DB  │ │  Same prompt, same products    │
           │ - Track cost │ │  Parse → Validate              │
           │ - Continue   │ └─────────┬────────────┬─────────┘
           └──────────────┘           │            │
                  │              YES  │            │  NO
                  │                   ▼            ▼
                  │         ┌──────────────┐ ┌────────────────────────────┐
                  │         │   SUCCESS!   │ │  TRY PROVIDER #3: GEMINI   │
                  │         │              │ │                             │
                  │         │ - Save attrs │ │  Model: gemini-2.0-flash   │
                  │         │ - Update DB  │ │  Same prompt, same products │
                  │         │ - Track cost │ │  Parse → Validate          │
                  │         │ - Continue   │ └─────────┬──────────┬───────┘
                  │         └──────────────┘           │          │
                  │                │              YES  │          │  NO
                  │                │                   ▼          ▼
                  │                │         ┌──────────────┐ ┌──────────────┐
                  │                │         │   SUCCESS!   │ │   COMPLETE   │
                  │                │         │              │ │   FAILURE    │
                  │                │         │ - Save attrs │ │              │
                  │                │         │ - Update DB  │ │ - Log batch  │
                  │                │         │ - Track cost │ │ - Save IDs   │
                  │                │         │ - Continue   │ │ - Continue   │
                  │                │         └──────────────┘ └──────────────┘
                  │                │                │                 │
                  └────────────────┴────────────────┴─────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │  CHECKPOINT CHECK       │
                            │                         │
                            │  Every 100 products:    │
                            │  - Save progress        │
                            │  - Save provider stats  │
                            │  - Save cost data       │
                            └────────┬────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   MORE PRODUCTS?     │
                          └──────┬───────┬───────┘
                                 │       │
                            YES  │       │  NO
                                 │       │
                                 ▼       ▼
                    ┌────────────────┐ ┌─────────────────────────┐
                    │  FETCH NEXT    │ │   VERIFY COVERAGE       │
                    │    BATCH       │ │                         │
                    │                │ │  - Count with attrs     │
                    │ (Loop back up) │ │  - Calculate %          │
                    └────────────────┘ │  - Generate report      │
                                       └────────┬────────────────┘
                                                │
                                                ▼
                                       ┌─────────────────────────┐
                                       │    FINAL SUMMARY        │
                                       │                         │
                                       │  - Products processed   │
                                       │  - Provider breakdown   │
                                       │  - Cost per provider    │
                                       │  - Complete failures    │
                                       │  - Total time & rate    │
                                       └─────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN ORCHESTRATOR                            │
│                    runEnrichment(options)                           │
│                                                                      │
│  - Initialize clients                                               │
│  - Load checkpoint                                                  │
│  - Main processing loop                                             │
│  - Save checkpoints                                                 │
│  - Generate final report                                            │
└──────────────┬────────────┬────────────┬────────────┬──────────────┘
               │            │            │            │
               ▼            ▼            ▼            ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │   Database   │ │   LLM    │ │  Parser  │ │  Checkpoint  │
    │   Module     │ │  Module  │ │  Module  │ │   Module     │
    └──────────────┘ └──────────┘ └──────────┘ └──────────────┘
```

### Database Module

```typescript
┌─────────────────────────────────────────┐
│        Database Operations              │
├─────────────────────────────────────────┤
│                                         │
│  fetchProductsNeedingAttributes()       │
│    ↓                                    │
│    SELECT * FROM Product                │
│    WHERE is_practical IS NULL           │
│    ORDER BY id                          │
│    LIMIT batch_size                     │
│                                         │
│  saveAttributesToNeo4j()                │
│    ↓                                    │
│    MATCH (p:Product {id: $id})          │
│    SET p += attributes                  │
│    SET p.attributes_updated_at = now()  │
│                                         │
│  countProductsNeedingAttributes()       │
│    ↓                                    │
│    MATCH (p:Product)                    │
│    WHERE p.is_practical IS NULL         │
│    RETURN count(p)                      │
│                                         │
│  verifyAttributeCoverage()              │
│    ↓                                    │
│    MATCH (p:Product)                    │
│    RETURN sum(CASE WHEN                 │
│      p.is_practical IS NOT NULL ...)    │
│                                         │
└─────────────────────────────────────────┘
```

### LLM Module

```typescript
┌──────────────────────────────────────────────────────────┐
│              LLM Provider Interfaces                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  callOpenAI(prompt) → {response, tokens}                │
│    Model: gpt-4o-mini                                   │
│    JSON mode: enabled                                   │
│    Temperature: 0.3                                     │
│    Cost: $0.15/1M input, $0.60/1M output               │
│                                                          │
│  callAnthropic(prompt) → {response, tokens}             │
│    Model: claude-3-haiku-20240307                       │
│    Max tokens: 4096                                     │
│    Temperature: 0.3                                     │
│    Cost: $0.25/1M input, $1.25/1M output               │
│                                                          │
│  callGemini(prompt) → {response, tokens}                │
│    Model: gemini-2.0-flash                              │
│    Response MIME: application/json                      │
│    Temperature: 0.3                                     │
│    Cost: $0.075/1M input, $0.30/1M output              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Parser Module

```typescript
┌──────────────────────────────────────────────────────┐
│          Response Parsing & Validation              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  parseLLMResponse(response, products)               │
│    ↓                                                 │
│    1. Parse JSON                                     │
│    2. Handle multiple formats:                       │
│       - Direct array                                 │
│       - {products: [...]}                            │
│       - {results: [...]}                             │
│       - Single object → wrap in array               │
│    3. Extract attributes                            │
│    4. Map to product IDs                            │
│    ↓                                                 │
│    Return: AttributeResult[]                         │
│                                                      │
│  validateBatchSuccess(results)                       │
│    ↓                                                 │
│    1. Count products with ≥1 attribute              │
│    2. Calculate success rate                         │
│    3. Check against threshold (80%)                  │
│    ↓                                                 │
│    Return: {valid, successRate, validCount}         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Checkpoint Module

```typescript
┌──────────────────────────────────────────────────────┐
│           Checkpoint Management                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Checkpoint Structure:                               │
│  {                                                   │
│    lastProcessedId: "prod_12345",                   │
│    processedCount: 500,                             │
│    stats: {                                          │
│      providerStats: {                               │
│        openai: {batches, products, tokens, cost},  │
│        anthropic: {...},                            │
│        gemini: {...}                                │
│      },                                              │
│      batchesByProvider: {...},                      │
│      completeFailures: 2                            │
│    },                                                │
│    timestamp: "2025-12-07T..."                      │
│  }                                                   │
│                                                      │
│  Operations:                                         │
│  - loadCheckpoint() → Resume state                  │
│  - saveCheckpoint() → Persist state                 │
│  - clearCheckpoint() → Start fresh                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Data Flow

### Single Batch Processing

```
Product IDs: [p1, p2, ..., p20]
      ↓
Fetch from Neo4j
      ↓
Products: [{id, title, description, price}, ...]
      ↓
Generate Prompt
      ↓
"Analyze these 20 products and identify gift attributes..."
      ↓
┌─────────────────────────────────────────┐
│         Multi-LLM Fallback Logic        │
├─────────────────────────────────────────┤
│                                         │
│  for provider in [openai, anthropic,    │
│                    gemini]:             │
│    try:                                 │
│      response = call(provider, prompt)  │
│      results = parse(response)          │
│      validation = validate(results)     │
│                                         │
│      if validation.valid:               │
│        return results                   │
│      else:                              │
│        continue  # Try next provider    │
│                                         │
│  # All failed                          │
│  recordFailure(batch, attempts)         │
│  return empty_results                   │
│                                         │
└─────────────────────────────────────────┘
      ↓
Results: [
  {productId: "p1", attributes: {isPractical: true, ...}},
  {productId: "p2", attributes: {isLuxury: true, ...}},
  ...
]
      ↓
Save to Neo4j
      ↓
MATCH (p:Product {id: "p1"})
SET p.is_practical = true, p.is_luxury = false, ...
```

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│           Error Occurs                  │
└────────────┬────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  Error Type? │
      └──┬────┬───┬──┘
         │    │   │
    ┌────┘    │   └────┐
    ▼         ▼        ▼
┌────────┐ ┌──────┐ ┌────────────┐
│ API    │ │Parse │ │Validation  │
│ Error  │ │Error │ │Failure     │
└───┬────┘ └──┬───┘ └─────┬──────┘
    │         │           │
    │         │           │
    └─────────┴───────────┘
              ▼
    ┌──────────────────┐
    │ Log error details │
    │ Update provider   │
    │ failure stats     │
    └────────┬──────────┘
             │
             ▼
    ┌──────────────────┐
    │ More providers?  │
    └────┬──────┬──────┘
         │      │
    YES  │      │  NO
         │      │
         ▼      ▼
    ┌─────┐  ┌────────────────┐
    │Try  │  │Record complete │
    │Next │  │failure & save  │
    └─────┘  │to failures file│
             └────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────┐
│                   Global State                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  stats: Stats {                                         │
│    totalInDb: 88,674                                   │
│    needsAttributes: 40,405                             │
│    processedThisRun: 500                               │
│    attributesSet: 4,250                                │
│    tokensUsed: 250,000                                 │
│    estimatedCost: 0.0375                               │
│    errors: 2                                            │
│    completeFailures: 2                                 │
│    providerStats: {                                    │
│      openai: {batches: 20, products: 400, ...}        │
│      anthropic: {batches: 3, products: 60, ...}       │
│      gemini: {batches: 2, products: 40, ...}          │
│    }                                                    │
│  }                                                      │
│                                                         │
│  lastProcessedId: "prod_12345"                         │
│  failedBatches: FailedBatch[]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
          ↓                    ↓
    ┌──────────┐      ┌─────────────────┐
    │ Every    │      │   On Error or   │
    │ 100 prod │      │   Completion    │
    └────┬─────┘      └────────┬────────┘
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌─────────────────────┐
│ Save Checkpoint  │  │  Save Final State   │
│ to JSON file     │  │  Clear Checkpoint   │
└──────────────────┘  └─────────────────────┘
```

## Concurrency Model

```
Current: SEQUENTIAL PROCESSING
─────────────────────────────────

Batch 1 → Process → Save → Batch 2 → Process → Save → ...

One batch at a time, one provider at a time


Potential Future: CONCURRENT PROCESSING
───────────────────────────────────────

Batch 1 ──┬─→ OpenAI    ────┐
          ├─→ Anthropic ────┤─→ First success wins
          └─→ Gemini    ────┘

Multiple batches in parallel with concurrent provider attempts
```

## File System Structure

```
present-agent2/
│
├── scripts/
│   ├── enrich-attributes-multi-llm.ts      # Main script (1,050 lines)
│   ├── test-multi-llm-fallback.ts          # Test simulation
│   ├── MULTI_LLM_ENRICHMENT_README.md      # Full documentation
│   └── ...
│
├── data/
│   ├── .enrich-attributes-multi-llm-checkpoint.json
│   │   ↑ Checkpoint state
│   │
│   └── .enrich-attributes-multi-llm-failures.json
│       ↑ Failed batch tracking
│
├── MULTI_LLM_IMPLEMENTATION_SUMMARY.md     # Implementation details
├── MULTI_LLM_QUICK_START.md                # Quick start guide
└── MULTI_LLM_ARCHITECTURE.md               # This file
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────┐
│              Performance Profile                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Throughput:     ~5 products/second                    │
│  Latency:        ~4 seconds per batch (20 products)    │
│  Checkpoint:     Every 100 products (~20 seconds)      │
│  Memory:         ~50 MB (constant)                     │
│                                                         │
│  Bottlenecks:                                          │
│  1. LLM API latency (3-4s per call)                   │
│  2. Neo4j write latency (~100ms per product)          │
│  3. Rate limiting delays (500ms between batches)      │
│                                                         │
│  Optimization Opportunities:                            │
│  1. Batch database writes (instead of one-by-one)     │
│  2. Concurrent batch processing                        │
│  3. Parallel provider attempts                         │
│  4. Connection pooling for Neo4j                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Cost Model

```
Per 1,000 Products (avg 500 tokens each):

OpenAI Only:
  Input:  500K tokens × $0.15/1M = $0.075
  Output: 200K tokens × $0.60/1M = $0.120
  Total:  $0.195 per 1K products

Anthropic Only:
  Input:  500K tokens × $0.25/1M = $0.125
  Output: 200K tokens × $1.25/1M = $0.250
  Total:  $0.375 per 1K products

Gemini Only:
  Input:  500K tokens × $0.075/1M = $0.0375
  Output: 200K tokens × $0.30/1M = $0.060
  Total:  $0.0975 per 1K products

Mixed (typical distribution):
  OpenAI:     80% × $0.195 = $0.156
  Anthropic:  15% × $0.375 = $0.056
  Gemini:      5% × $0.098 = $0.005
  Total:      $0.217 per 1K products

For 40K products: ~$8.68
```

---

This architecture provides:
- ✅ High reliability through multi-provider fallback
- ✅ Cost optimization through provider diversity
- ✅ Complete observability with detailed tracking
- ✅ Fault tolerance with checkpoint/resume
- ✅ Scalability through batch processing
