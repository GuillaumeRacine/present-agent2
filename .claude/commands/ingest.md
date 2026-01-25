# Product Ingestion Workflow

You are orchestrating the complete product ingestion pipeline. This is a multi-stage workflow that imports, processes, enriches, and validates product data.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT INGESTION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. IMPORT        2. INGEST         3. CATEGORIZE               │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐                 │
│  │ Raw JSON │ ──► │ Neo4j   │ ──►  │Category │                 │
│  │ → Export │      │ + Embed │       │ Nodes   │                 │
│  └─────────┘      └─────────┘       └─────────┘                 │
│       │                │                  │                      │
│       ▼                ▼                  ▼                      │
│  4. INTERESTS     5. ATTRIBUTES    6. ARCHETYPES                │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐                 │
│  │ Taxonomy │      │ LLM     │       │ Semantic│                 │
│  │ + Links  │      │ Flags   │       │ Vectors │                 │
│  └─────────┘      └─────────┘       └─────────┘                 │
│       │                │                  │                      │
│       └────────────────┴──────────────────┘                      │
│                        │                                         │
│                        ▼                                         │
│               7. VALIDATE & REPORT                               │
│               ┌─────────────────┐                                │
│               │ Quality Checks  │                                │
│               │ Coverage Report │                                │
│               └─────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Modes

### Full Pipeline (New Batch)
For ingesting a completely new batch of products:
```
/ingest full --source "data/raw/products_YYYY_MM_DD.json"
```

### Enrich Existing Products
For products already in Neo4j but missing enrichment:
```
/ingest enrich
```

### Specific Stage Only
Run individual stages:
```
/ingest import --source "data/raw/file.json"
/ingest neo4j
/ingest categories
/ingest interests
/ingest attributes
/ingest archetypes
/ingest validate
```

---

## Stage Details

### Stage 1: Import (product-importer agent)
**Purpose:** Import raw JSON to canonical export format
**Script:** `scripts/import-raw-products.ts`
**Input:** Raw JSON file
**Output:** Updated `data/export/products.json`

Commands:
```bash
# Dry run
npx tsx scripts/import-raw-products.ts --source "[file]" --dry-run

# Apply
npx tsx scripts/import-raw-products.ts --source "[file]" --merge
```

### Stage 2: Neo4j Ingest (product-ingestor agent)
**Purpose:** Create Product nodes with embeddings
**Script:** `scripts/ingest-products.ts`
**Input:** `data/export/products.json`
**Output:** Product nodes in Neo4j with 4 embeddings each

Commands:
```bash
# Test
NODE_OPTIONS="--max-old-space-size=4096" npx tsx scripts/ingest-products.ts --limit 100

# Full
NODE_OPTIONS="--max-old-space-size=4096" npx tsx scripts/ingest-products.ts
```

### Stage 3: Categories (category-enricher agent)
**Purpose:** Create category nodes and link products
**Script:** `scripts/add-categories.ts`
**Output:** Category nodes + BELONGS_TO relationships

Commands:
```bash
# Dry run
npx tsx scripts/add-categories.ts --dry-run

# Apply
npx tsx scripts/add-categories.ts --batch-size 500
```

### Stage 4: Interests (interest-enricher agent)
**Purpose:** Expand interest taxonomy and link products
**Scripts:** `scripts/expand-interests.ts`, `scripts/fix-orphaned-products.ts`
**Output:** Interest nodes + MATCHES_INTEREST relationships

Commands:
```bash
# Expand taxonomy
npx tsx scripts/expand-interests.ts --live

# Fix orphans
npx tsx scripts/fix-orphaned-products.ts --live
```

### Stage 5: Attributes (attribute-enricher agent)
**Purpose:** Populate 14 gift attribute flags via LLM
**Script:** `scripts/populate-gift-attributes.ts`
**Output:** is_* boolean properties on Product nodes

Commands:
```bash
# Test
npx tsx scripts/populate-gift-attributes.ts --limit 100

# Full
npx tsx scripts/populate-gift-attributes.ts --live --use-llm --resume
```

### Stage 6: Archetypes (archetype-generator agent)
**Purpose:** Generate semantic archetype embeddings
**Script:** `scripts/generate-archetype-embeddings.ts`
**Output:** archetype_embedding on Product nodes

Commands:
```bash
# Test
npx tsx scripts/generate-archetype-embeddings.ts --limit 200

# Full
npx tsx scripts/generate-archetype-embeddings.ts --live --resume
```

### Stage 7: Validate (ingestion-validator agent)
**Purpose:** Verify data quality and generate report
**Script:** `scripts/analyze-product-stats.ts`
**Output:** Validation report

Commands:
```bash
npx tsx scripts/check-neo4j.ts
npx tsx scripts/analyze-product-stats.ts
```

---

## Execution Instructions

### For Full Pipeline
1. Execute each stage in order
2. Always run dry-run/test first
3. Verify output before proceeding to next stage
4. Document results at each stage
5. Generate final validation report

### For Enrich Only (existing products)
Start at Stage 3 (Categories) and proceed through validation.

### Error Recovery
- All scripts support resume/checkpoint
- If a stage fails, fix the issue and re-run that stage
- Check logs in `logs/combined.log`

---

## Expected Timeline

| Stage | Products | Estimated Time |
|-------|----------|----------------|
| Import | Any | 1-5 minutes |
| Neo4j Ingest | 10K | 2-4 hours |
| Categories | 10K | 5-15 minutes |
| Interests | 10K | 30-60 minutes |
| Attributes (LLM) | 10K | 3-6 hours |
| Archetypes | 10K | 30-60 minutes |
| Validation | Any | 2-5 minutes |

**Total for 10K products:** ~8-14 hours

---

## Quality Gates

Before proceeding to next stage, verify:

| Stage | Quality Gate |
|-------|--------------|
| Import | Correct product count, no duplicates |
| Neo4j | All 4 embeddings present |
| Categories | >80% products categorized |
| Interests | <30% orphaned products |
| Attributes | >90% products with 2+ attributes |
| Archetypes | Embeddings match attributed products |
| Validate | Overall quality score >7/10 |

---

## Agent References

Detailed instructions for each stage are in `.claude/agents/`:
- `product-importer.md`
- `product-ingestor.md`
- `category-enricher.md`
- `interest-enricher.md`
- `attribute-enricher.md`
- `archetype-generator.md`
- `ingestion-validator.md`

---

Now, what would you like to do?
- Run full pipeline with a new batch?
- Enrich existing products?
- Run a specific stage?
- Check current database status first?
