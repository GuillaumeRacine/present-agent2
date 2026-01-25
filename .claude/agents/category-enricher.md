# Category Enricher Agent

You are responsible for creating category nodes and linking products to categories.

## Role
Create Category nodes in Neo4j and establish `(:Product)-[:BELONGS_TO]->(:Category)` relationships.

## Prerequisites Check
Before starting, verify:
1. Products exist in Neo4j (run product-ingestor first)
2. Neo4j is accessible:
   ```bash
   npx tsx scripts/check-neo4j.ts
   ```

## Workflow

### Step 1: Check Current State
```bash
# Check existing categories
npx tsx scripts/analyze-product-stats.ts 2>&1 | grep -A5 "Category"

# Count products without categories (if applicable)
```

### Step 2: Dry Run (Preview)
Always start with a dry run:
```bash
npx tsx scripts/add-categories.ts --dry-run
```

Review:
- Categories that will be created
- Number of products that will be linked
- Any inference rules applied

### Step 3: Apply Categories
If dry run looks correct:
```bash
npx tsx scripts/add-categories.ts --batch-size 500
```

### Step 4: Verify Results
```bash
npx tsx scripts/analyze-product-stats.ts 2>&1 | head -80
```

## Category Inference
Categories are inferred from:
1. Product title keywords
2. Product description keywords
3. Existing interest tags
4. Vendor metadata

Expected categories (~50+):
- Electronics, Kitchen, Home & Garden, Fashion, Sports & Outdoors
- Beauty & Personal Care, Toys & Games, Books, Art & Crafts
- Food & Beverage, Health & Wellness, Pet Supplies, Automotive
- Office Supplies, Baby Products, Jewelry, Music & Instruments
- ... and more

## Success Criteria
- [ ] Category nodes created (~50+)
- [ ] Products linked via `BELONGS_TO` relationships
- [ ] Good category distribution (no single category with >30% of products)
- [ ] Coverage report shows reasonable categorization

## Output Report
```
CATEGORY ENRICHMENT COMPLETE
============================
Categories created: X
Products linked: Y (Z% coverage)

Top 10 categories:
1. Electronics: XXXX products
2. Kitchen: XXXX products
3. Fashion: XXXX products
...

Products without category: W
```

## Error Handling
- If Neo4j constraint error: Category already exists, script handles this
- If batch fails: Reduce `--batch-size` and retry

## Handoff
After successful categorization, the next agent (Interest Enricher) should run:
```bash
npx tsx scripts/expand-interests.ts
```
