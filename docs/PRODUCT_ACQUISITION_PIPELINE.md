# Product Acquisition Pipeline

> 8-stage pipeline that discovers Shopify stores, vets them for gift relevance, scrapes their products, normalizes/loads into Neo4j, enriches with graph relationships, and validates quality.

**Status:** Active | **Last run:** 2026-02-24 | **Output:** 47,509 products from 1,664 brands

---

## Quick Start

```bash
# Full pipeline (dry run — prints stats, no DB writes)
./scripts/pipeline/run_acquisition.sh

# Full pipeline — live mode with embeddings
./scripts/pipeline/run_acquisition.sh --live --embed

# Full pipeline — wipe DB first, load fresh
./scripts/pipeline/run_acquisition.sh --live --embed --wipe --yes

# Resume from specific stage (e.g., skip filter/vet, start at scrape)
./scripts/pipeline/run_acquisition.sh --stage 3 --live

# Override limits
./scripts/pipeline/run_acquisition.sh --stores 2000 --products 50 --live --embed
```

---

## Prerequisites

| Dependency | Purpose | Check |
|-----------|---------|-------|
| Docker Desktop | Neo4j container | `docker ps \| grep neo4j` |
| Neo4j running | Graph database | `./start-local.sh --status` |
| Python 3.10+ | Stages 1-4, 6-7 | `python3 --version` |
| Node.js 18+ / tsx | Stage 5 + enrichment | `node --version` |
| OpenAI API key | Vetting (Stage 2), embeddings (Stage 5), enrichment (Stage 5b) | Set in `src/.env.local` |
| Storeleads CSV | Stage 1 input (2.8M stores) | `domains_export.csv` in project root |

### Neo4j Credentials

| Setting | Value | Where stored |
|---------|-------|-------------|
| URI | `bolt://localhost:7687` | `src/.env.local` (line 26) |
| Username | `neo4j` | `src/.env.local` (line 27) |
| Password | `presentagent2024` | `src/.env.local` (line 28) |
| Container | `present-agent-neo4j` | `start-local.sh` |
| Docker auth | `NEO4J_AUTH=neo4j/presentagent2024` | `start-local.sh` |
| Browser | http://localhost:7474 | Docker port mapping |

**Also hardcoded in:** `scripts/product_enrichment/load_neo4j.py`, `load_images.py`, `shopify_scraper.py` (as defaults).

---

## Pipeline Overview

```
[Stage 1] CSV Filter & Rank     → 2.8M stores → ~5K-10K shortlisted
     ↓
[Stage 2] Store Vetting Agent   → LLM scores gift relevance → ~1K-2K vetted
     ↓
[Stage 3] Shopify Scraper       → Fetch bestseller products per store
     ↓
[Stage 4] Product Normalizer    → Canonical schema + validation + dedupe
     ↓
[Stage 5] Neo4j Loader          → MERGE products + generate embeddings
     ↓
[Stage 5b] Enrichment Pipeline  → Interests, categories, occasions, relationships, attributes
     ↓
[Stage 6] Learner Agent         → Analyze run, generate improvements
     ↓
[Stage 7] Bar Raiser            → Quality gate: product sample + catalog balance + recs test
     ↓
[Stage 8] Quality Tests         → 5-persona end-to-end recommendation test
```

---

## Stage 1: CSV Filter & Rank

**Script:** `scripts/pipeline/filter_stores.py`
**Input:** `domains_export.csv` (2.8M rows, Storeleads export)
**Output:** `data/pipeline/shortlisted_stores.json`

### What it does
Deterministic filtering + composite ranking — no LLM needed.

### Inclusion criteria
- Category in gift-relevant set (14 categories: Home & Garden, Beauty, Food & Drink, Health, Sports, Arts, Toys, Pets, Gifts, Games, Books, Jewelry, Apparel, Shopping)
- Monthly sales >= $10K (filters dead/tiny stores)
- NOT tagged `Dropshipper` or `Print on Demand`
- Country: US, CA, GB, AU, EU (shipping-friendly)
- Has a `domain_url` (can be scraped)

### Ranking score (composite, weighted)
| Signal | Weight | Source field |
|--------|--------|-------------|
| Monthly sales | 0.30 | `estimated_monthly_sales` |
| Monthly visits | 0.20 | `estimated_monthly_visits` |
| Avg rating ≥ 3.5 | 0.15 | `combined_avgrating` |
| Review count | 0.15 | `combined_reviews` |
| Social followers | 0.10 | ig + tiktok + fb |
| Category tier bonus | 0.10 | Gift-relevance ranking |

### CLI

```bash
python3 scripts/pipeline/filter_stores.py                      # Top 500 (default)
python3 scripts/pipeline/filter_stores.py --limit 2000          # Top 2000
python3 scripts/pipeline/filter_stores.py --min-sales 50000     # Higher threshold
python3 scripts/pipeline/filter_stores.py --dry-run             # Stats only, no output
```

### Last run stats
- 2,823,680 total → 267,064 pass filters → top 2,000 by rank score

---

## Stage 2: Store Vetting Agent

**Script:** `scripts/pipeline/vet_stores.py`
**Input:** `data/pipeline/shortlisted_stores.json`
**Output:** `data/pipeline/vetted_stores.json`

### What it does
LLM-assisted vetting using GPT-4o-mini. Processes stores in batches of 20. Each store scored 1-5 on:
- **Gift relevance** — Does this store sell giftable products?
- **Product diversity** — Range of products vs single-product store?
- **Quality signals** — Rating, reviews, brand legitimacy
- **Category value** — Fills gaps in current catalog?

Stores with avg score >= 3.0 pass.

### CLI

```bash
python3 scripts/pipeline/vet_stores.py                          # Vet all
python3 scripts/pipeline/vet_stores.py --limit 100              # First 100 only
python3 scripts/pipeline/vet_stores.py --min-score 3.0          # Pass threshold
python3 scripts/pipeline/vet_stores.py --resume                 # Continue from last
python3 scripts/pipeline/vet_stores.py --dry-run                # Preview, no API calls
```

### Cost
~$0.50-1.00 total (gpt-4o-mini, batches of 20)

### Last run stats
- 2,000 stores → 1,803 passed (91.1%), 177 failed, 20 errors

---

## Stage 3: Shopify Product Scraper

**Script:** `scripts/pipeline/scrape_products.py`
**Input:** `data/pipeline/vetted_stores.json`
**Output:** `data/pipeline/raw_products/` (one `.jsonl` file per store)
**Progress:** `data/pipeline/scrape_progress.json`

### What it does
Fetches products from Shopify's public JSON API. Strategy per store:
1. Discover collections → find bestseller/popular/top-selling collection handle
2. If found: scrape that collection (products pre-ranked by store)
3. If not found: scrape `/products.json` (default sort = best-selling)
4. Cap at `--max-products` per store (default: 30)

### Rate limiting
- 1.2s delay between requests to same domain
- Exponential backoff on 429 (Too Many Requests)
- Max 3 retries per request

### CLI

```bash
python3 scripts/pipeline/scrape_products.py                     # All vetted stores
python3 scripts/pipeline/scrape_products.py --limit 10          # First 10 only
python3 scripts/pipeline/scrape_products.py --max-products 50   # Top 50 per store
python3 scripts/pipeline/scrape_products.py --resume            # Continue from last
python3 scripts/pipeline/scrape_products.py --store food52.com  # Single store test
```

### Known failure modes
- **Headless Shopify (API blocked):** 130 stores returned 0 products (Uncommon Goods, Mejuri, Skims, Bombas, Food52, Gymshark). These use custom frontends that block `/products.json`. Future fix: sitemap/HTML scraping.
- **Regional duplicates:** 25+ stores with duplicate regional domains (e.g., uk.store.com, au.store.com) waste pipeline time.

### Last run stats
- 1,803 attempted → 1,673 scraped, 130 failed → 55,212 raw products

---

## Stage 4: Product Normalizer

**Script:** `scripts/pipeline/normalize_products.py`
**Input:** `data/pipeline/raw_products/*.jsonl`
**Output:** `data/pipeline/normalized_products.jsonl`
**Stats:** `data/pipeline/normalized_products_stats.json`

### What it does
Maps Shopify product JSON to the canonical schema (`docs/CANONICAL_PRODUCT_SCHEMA.md`):

| Shopify field | Canonical field |
|--------------|----------------|
| `handle` + store domain | `canonical_url` |
| `title` | `title` |
| `body_html` (stripped) | `description` |
| `vendor` | `brand` |
| `variants[0].price` | `price` |
| `variants[0].sku` | `source_product_id` |
| `images[0].src` | `images[0]` |
| `product_type` | `categories_raw[0]` |
| `tags` | `tags_raw` |

### Validation gates
1. Required fields present (title, price, URL)
2. `price > 0` and `currency` present
3. At least 1 image URL
4. `title + description` >= 24 chars
5. Price in range ($1-$10,000)

### Rejection reasons
| Reason | Count (last run) |
|--------|-----------------|
| Out of stock | 5,167 |
| Duplicate URL | 1,166 |
| Validation error | 1,129 |
| Price out of range | 332 |

### CLI

```bash
python3 scripts/pipeline/normalize_products.py                  # All raw products
python3 scripts/pipeline/normalize_products.py --dry-run        # Stats only
python3 scripts/pipeline/normalize_products.py --store x.com    # Single store
```

### Last run stats
- 55,212 raw → 47,509 valid (86% pass rate)

---

## Stage 5: Neo4j Loader + Embeddings

**Script:** `scripts/pipeline/load_products.ts` (TypeScript — runs from `src/` dir)
**Input:** `data/pipeline/normalized_products.jsonl`
**Output:** Products in Neo4j with embeddings

### What it does
1. **Wipe** (optional): Deletes all Product nodes, taxonomy nodes, and relationships
2. **Load**: MERGE products by `product_url` (idempotent — safe to re-run)
3. **Embed**: Generate 1536-dim OpenAI embeddings for `title + description`
4. **Index**: Recreate vector + fulltext indexes

### Critical property
Sets `product.available = true` — required by the Explorer agent's Cypher query (`WHERE product.available = true`). Without this, ALL queries return 0 products.

### CLI

```bash
# Must run from src/ directory
cd src

tsx ../scripts/pipeline/load_products.ts                         # Dry run
tsx ../scripts/pipeline/load_products.ts --live                  # Load only
tsx ../scripts/pipeline/load_products.ts --live --embed          # Load + embeddings
tsx ../scripts/pipeline/load_products.ts --live --wipe           # Wipe first
tsx ../scripts/pipeline/load_products.ts --live --embed --wipe --yes  # Full, no confirm
```

### Cost
~$1.00 for 50K products (text-embedding-3-small)

### Last run stats
- 47,509 loaded, 0 embedding failures, 100% coverage

---

## Stage 5b: Enrichment Pipeline

**Scripts:** `src/scripts/expand-*.ts` (5 scripts, run from `src/` dir)
**Runs after:** Stage 5 (only in `--live` mode)

Creates graph relationships between products and taxonomy nodes using LLM classification.

| Script | Creates | Nodes | Relationships | Coverage |
|--------|---------|-------|---------------|----------|
| `expand-interests.ts --live` | `MATCHES_INTEREST` | 110 Interest nodes | ~60K rels | 66% |
| `expand-categories.ts --live` | `IN_CATEGORY` | 59 Category nodes | ~119K rels | 78% |
| `expand-occasions.ts --live` | `GIFT_FOR_OCCASION` | 15 Occasion nodes | ~434K rels | 100% |
| `expand-relationships.ts --live` | `GIFT_FOR_RELATIONSHIP` | 18 Relationship nodes | ~391K rels | 99% |
| `expand-attributes.ts --live` | 14 boolean flags | (on Product nodes) | ~40K products | 84% |

### Boolean attribute flags
`is_practical`, `is_luxury`, `is_consumable`, `is_experiential`, `is_sentimental`, `is_personalized`, `is_eco_friendly`, `is_handcrafted`, `is_artistic`, `is_educational`, `is_wellness`, `is_shared`, `is_lasting_value`, `is_conversation_starter`

### CLI (run from `src/`)

```bash
cd src
tsx ../scripts/expand-interests.ts --live
tsx ../scripts/expand-categories.ts --live
tsx ../scripts/expand-occasions.ts --live
tsx ../scripts/expand-relationships.ts --live
tsx ../scripts/expand-attributes.ts --live
```

### Cost
~$1.00 total (gpt-4o-mini for attribute classification)

---

## Stage 6: Learner Agent

**Script:** `scripts/pipeline/learner.py`
**Input:** Scrape progress, normalization stats, bar raiser report
**Output:** `data/pipeline/run_learnings.json`

### What it analyzes
- Scrape success/failure rates and patterns
- Product yield per store category and sales tier
- Normalization rejection patterns
- Category gaps and coverage issues

### Output format

```json
{
  "run_id": "2026-02-24_001",
  "stores_attempted": 1803,
  "stores_scraped_successfully": 1673,
  "products_loaded": 47509,
  "category_weights_adjustment": { ... },
  "recommendations": [ ... ]
}
```

### CLI

```bash
python3 scripts/pipeline/learner.py
python3 scripts/pipeline/learner.py --run-id 2026-02-24_001
```

---

## Stage 7: Bar Raiser

**Script:** `scripts/pipeline/bar_raiser.py`
**Input:** Neo4j product data, optional recommendation test
**Output:** `data/pipeline/bar_raiser_report.md` + `bar_raiser_report.json`

### What it checks
1. **Product quality sample** (random 50): gift suitability, description quality, realistic prices, metadata coverage
2. **Catalog balance**: price band distribution, brand diversity, category coverage
3. **Recommendation smoke test** (3 persona queries): new products surfacing, brand diversity, no bad products

### Target price bands
| Band | Target |
|------|--------|
| $0-25 | 30% |
| $25-50 | 25% |
| $50-100 | 25% |
| $100-250 | 15% |
| $250+ | 5% |

### CLI

```bash
python3 scripts/pipeline/bar_raiser.py                          # Full check
python3 scripts/pipeline/bar_raiser.py --skip-recs              # Skip recommendation test
python3 scripts/pipeline/bar_raiser.py --sample-size 100        # Larger sample
```

---

## Stage 8: Quality Tests

**Script:** `scripts/test_quality.py`
**Input:** Live backend on port 3001
**Output:** `data/quality_tests/run_YYYYMMDD_HHMMSS.md` + `.json` + `_raw/`

### What it does
Runs 5 test personas through the full recommendation flow (API calls to backend), evaluating:
- Clarification question quality
- Recommendation relevance and diversity
- Budget respect
- Giver reference leakage
- Product URL validity
- Bar Raiser LLM scoring (stochastic — average over 3+ runs for reliability)

### Personas
| ID | Scenario | Key test |
|----|----------|----------|
| `vague-gift` | "I need a gift for someone" | Triggers clarification flow |
| `dad-coffee` | Coffee-loving outdoorsy dad, $50-80 | Interest matching, budget |
| `wife-yoga` | Yoga/wellness wife, anniversary, $120 | Occasion + interest |
| `nephew-teen` | 16yo skateboarder/music fan, $30-50 | Age-appropriate, niche interests |
| `boss-thankyou` | Tea/reading boss, thank you, $60 | Professional context, budget |

### CLI

```bash
# Requires backend running on port 3001
cd src && npm run dev &

python3 scripts/test_quality.py                                 # All 5 personas
python3 scripts/test_quality.py --persona dad                   # Single persona
python3 scripts/test_quality.py --list                          # List personas
```

### Output structure
```
data/quality_tests/
├── latest.md                           # Symlink → most recent report
├── latest.json                         # Symlink → most recent data
├── run_20260224_044912.md              # Human-readable report
├── run_20260224_044912.json            # Structured data
└── run_20260224_044912_raw/            # Full API responses per persona/turn
    ├── vague-gift_turn1.json
    ├── dad-coffee_turn1.json
    └── ...
```

---

## Data Files

```
data/pipeline/
├── shortlisted_stores.json             # Stage 1 output (ranked store list)
├── vetted_stores.json                  # Stage 2 output (LLM-scored stores)
├── raw_products/                       # Stage 3 output (per-store JSONL)
│   ├── food52.com.jsonl
│   ├── bellroy.com.jsonl
│   └── ... (~1,673 files)
├── normalized_products.jsonl           # Stage 4 output (canonical schema)
├── normalized_products_stats.json      # Stage 4 rejection stats
├── scrape_progress.json                # Stage 3 resume tracker
├── run_learnings.json                  # Stage 6 output
├── bar_raiser_report.md                # Stage 7 markdown report
├── bar_raiser_report.json              # Stage 7 structured data
└── run_log.json                        # Orchestrator run metadata
```

---

## Common Operations

### Full fresh pipeline run
```bash
./scripts/pipeline/run_acquisition.sh --live --embed --wipe --stores 2000 --products 30 --yes
```

### Re-run enrichment only (after manual fixes)
```bash
cd src
tsx ../scripts/expand-interests.ts --live
tsx ../scripts/expand-categories.ts --live
tsx ../scripts/expand-occasions.ts --live
tsx ../scripts/expand-relationships.ts --live
tsx ../scripts/expand-attributes.ts --live
```

### Set available flag (required after manual loads)
```bash
echo "MATCH (p:Product) SET p.available = true RETURN count(p);" | \
  docker exec -i present-agent-neo4j cypher-shell -u neo4j -p presentagent2024
```

### Run quality tests
```bash
cd src && npm run dev &       # Start backend
python3 scripts/test_quality.py
```

### Check Neo4j product count
```bash
curl -s -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -u neo4j:presentagent2024 \
  -d '{"statements":[{"statement":"MATCH (p:Product) RETURN count(p) AS products"}]}'
```

---

## Resume Runbook (Checkpoint: 2026-02-24)

Use this exact section to resume the paused 20K acquisition sequence.

### Last confirmed state before pause
- Branch: `codex/acquisition-batch-runner`
- Batch runner: `scripts/pipeline/run_acquisition_batches.sh`
- Active log from last run: `data/pipeline/batch_runs/batch_1_offset_4000.log`
- Pipeline metadata file: `data/pipeline/run_log.json`
- All pipeline processes were manually stopped (no active acquisition jobs)
- Neo4j checkpoint at pause:
  - `MATCH (p:Product) RETURN count(p)` -> `91783`
  - `MATCH (p:Product) WHERE p.embedding IS NOT NULL RETURN count(p)` -> `47689`

### Pre-resume checks (required)
```bash
cd "/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2"
git branch --show-current
docker ps | grep neo4j
test -f src/.env.local && echo "env ok"
```

### Resume options

#### Option A: Continue the interrupted offset-4000 work (recommended first)
This finishes the in-progress dataset before starting the next offset window.
```bash
./scripts/pipeline/run_acquisition.sh --stage 5 --live --embed --skip-recs 2>&1 | tee data/pipeline/batch_runs/resume_stage5_offset_4000.log
```

#### Option B: Restart clean batch loop from offset 4000
Use this if you intentionally want to rerun full stages with current resume files.
```bash
./scripts/pipeline/run_acquisition_batches.sh --start-offset 4000 --batches 10 --batch-size 2000 --products 30
```

### Continue the 10-batch / 20K plan
- Batch size: `2000`
- Planned windows:
  - Batch 1: offset `4000`
  - Batch 2: offset `6000`
  - Batch 3: offset `8000`
  - Batch 4: offset `10000`
  - Batch 5: offset `12000`
  - Batch 6: offset `14000`
  - Batch 7: offset `16000`
  - Batch 8: offset `18000`
  - Batch 9: offset `20000`
  - Batch 10: offset `22000`

### Post-batch validation (run after each batch)
```bash
# Products loaded
echo 'MATCH (p:Product) RETURN count(p);' | docker exec -i present-agent-neo4j cypher-shell -u neo4j -p presentagent2024

# Embedding coverage
echo 'MATCH (p:Product) WHERE p.embedding IS NOT NULL RETURN count(p);' | docker exec -i present-agent-neo4j cypher-shell -u neo4j -p presentagent2024

# Last pipeline config used
cat data/pipeline/run_log.json
```

### Notes from fixes applied in this run
- Stage 5 now runs from `src/` using `npx tsx scripts/pipeline/load_products.ts`.
- This avoids prior failures from missing global `tsx` and CommonJS/top-level-await mismatch.

---

## Cost Per Pipeline Run

| Stage | Resource | Est. cost |
|-------|----------|-----------|
| Store vetting (Stage 2) | GPT-4o-mini, ~100 batches | ~$0.50-1.00 |
| Embeddings (Stage 5) | text-embedding-3-small, ~50K | ~$1.00 |
| Enrichment (Stage 5b) | GPT-4o-mini for attributes | ~$1.00 |
| **Total** | | **~$2.50-3.00** |

---

## Known Issues

- **Headless Shopify stores** — 130 stores block `/products.json` API (Uncommon Goods, Mejuri, Skims, etc.). Need sitemap or HTML scraping as alternative.
- **Noisy interest matching** — Enrichment scripts assign interests too broadly (e.g., "music" linked to wind chimes). Manual cleanup required after enrichment.
- **Bar Raiser score stochasticity** — LLM-evaluating-LLM swings 30+ points between runs. Use deterministic checks (budget, giver leakage, URLs) as reliable metrics.
- **`available = true` required** — Explorer Cypher filters on this. Must be set on all products after load.

---

## Iteration Workflow

To improve quality, loop through:

1. **Run quality tests** → identify weak personas
2. **Analyze failures** → which products/interests/categories are wrong
3. **Fix interests** → add missing Interest nodes, remove false positives, boost real matches
4. **Re-run enrichment** if needed → expand-interests.ts, expand-categories.ts
5. **Restart backend** → clear caches
6. **Re-test** → verify improvement
7. **If catalog gaps** → run pipeline with more stores or targeted store additions
8. **Repeat** until Bar Raiser avg >= 80/100
