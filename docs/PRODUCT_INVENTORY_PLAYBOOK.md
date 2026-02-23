# Product Inventory Playbook (Short Term)

Goal: quickly expand inventory with highly relevant and diverse giftable products while keeping legal/compliance risk low.

## 1) Strategy

Order of operations:

1. Prefer official APIs/feeds.
2. Use scraping only for sources where terms permit it.
3. Normalize all incoming records to one canonical schema.
4. Run quality + dedupe + taxonomy mapping before Neo4j load.

Reference schema: `docs/CANONICAL_PRODUCT_SCHEMA.md`.

## 2) Source Tiers

### Tier A (Implement First)

- Shopify (approved/partner feeds first; scraper fallback where allowed)
- Etsy API v3
- eBay Browse API

Why first:
- strong catalog breadth
- good gift intent coverage
- relatively fast connector implementation

### Tier B (After quality stabilizes)

- Experience/subscription sources from `research/EXPERIENCE_GIFT_DATA_SOURCES.md`
- Additional ethical brand feeds

## 3) Connector Contract

Each connector must output:

- JSONL file in `data/raw/<source>/`
- each row conforms to `docs/CANONICAL_PRODUCT_SCHEMA.md`
- includes `source`, `source_product_id`, `canonical_url`, `ingested_at`

Suggested naming:

- `data/raw/etsy/products_YYYYMMDD.jsonl`
- `data/raw/ebay/products_YYYYMMDD.jsonl`
- `data/raw/shopify/products_YYYYMMDD.jsonl`

## 4) Pipeline Stages

1. **Extract**
   - fetch source records
   - store raw snapshots (for replay/debug)
2. **Normalize**
   - map source fields -> canonical schema
3. **Validate**
   - required fields + price + images + legal metadata
4. **Dedupe**
   - URL/source/fuzzy dedupe
5. **Enrich**
   - map interests/occasions/relationships
   - compute gift attributes + quality signals
6. **Load**
   - use `scripts/product_enrichment/load_neo4j.py`

## 5) Immediate Build Plan (7 Days)

1. Day 1:
   - finalize canonical schema + gates
   - create connector skeletons
2. Day 2-3:
   - implement Etsy connector
   - implement eBay connector
3. Day 4:
   - normalize + dedupe stage
4. Day 5:
   - load into Neo4j + verify stats
5. Day 6:
   - run persona quality tests
6. Day 7:
   - tighten filters on weak categories and duplicates

## 6) Quality KPIs (Required)

- metadata completeness >= 90%
- duplicate rate <= 5%
- price validity >= 99%
- recommendation relevance improvement on persona suite
- category/vendor concentration reduction vs baseline

## 7) Repo Entry Points

- Current enrichment orchestrator:
  - `scripts/product_enrichment/run_pipeline.sh`
- Shopify scraping:
  - `scripts/product_enrichment/shopify_scraper.py`
- Composite scoring:
  - `scripts/product_enrichment/composite_scorer.py`
- Neo4j loader:
  - `scripts/product_enrichment/load_neo4j.py`
- Quality test harness:
  - `scripts/test_quality.py`

