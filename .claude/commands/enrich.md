# Product Enrichment Workflow

Quick workflow for enriching existing products in Neo4j that are missing graph connections or attributes.

## Current Status Check

First, check what needs enrichment:
```bash
npx tsx scripts/analyze-product-stats.ts 2>&1 | head -60
```

Key metrics to look for:
- **Without interests:** Products needing interest extraction
- **Without occasions:** Products needing occasion tagging
- **Without attributes:** Products needing attribute population

---

## Quick Enrichment Steps

### Step 1: Fix Orphaned Products (Interests)
```bash
# Test first
npx tsx scripts/fix-orphaned-products.ts --limit 100

# Full run
npx tsx scripts/fix-orphaned-products.ts --live
```

### Step 2: Tag Occasions
```bash
# Test first
npm run tag:occasions -- --limit 500

# Full run
npm run tag:occasions -- --live
```

### Step 3: Populate Attributes (if needed)
```bash
# Check coverage first
npm run attributes:status

# If <90%, run:
npx tsx scripts/populate-gift-attributes.ts --live --use-llm --resume
```

### Step 4: Generate Archetypes (if needed)
```bash
npx tsx scripts/generate-archetype-embeddings.ts --live --resume
```

### Step 5: Validate
```bash
npx tsx scripts/analyze-product-stats.ts
```

---

## Expected Results

After enrichment, you should see:
- Interest coverage: >80%
- Occasion coverage: >50%
- Attribute coverage: >90%

---

## Full Pipeline

For more control, use `/ingest` command which provides the complete multi-stage workflow.
