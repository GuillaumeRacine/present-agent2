# Data Sources

All data used by Present Agent2 for gift recommendations.

---

## Current Data Sources

### 1. Product Catalog (Shopify Gift Brands)

#### Raw Catalog (iCloud)

**Location:** `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`

| File | Size | Notes |
|------|------|-------|
| `PresentAgentList-1.json` through `-21.json` | 102MB total | 1.28M lines raw |
| `master.json` | 26.9MB | Combined |
| `BCorps_Products_Cleaned.json` | 9.3MB | Cleaned subset |

**Schema (raw):**
```json
{
  "Brand URL": "https://...",
  "Product URL": "https://...",
  "Product Title": "...",
  "Price": "32.00",
  "Currency": "USD",
  "Sizes/Formats available": "...",
  "Variants (colors, etc.)": "...",
  "Text Product Description": "..."
}
```

**Sample Brands:** Marine Layer, Ten Thousand Villages, and other sustainable DTC / B-Corp certified companies.

**Active repo location:** `/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/` (this working copy).

#### Enriched Catalog (Local)

**Location:** `scripts/product_enrichment/output/enriched_catalog.json` (~88MB)

The raw catalog is processed through a Python enrichment pipeline that adds:
- Recipient signals (who would this gift suit?)
- Composite gift scores (practical, luxury, sentimental, etc.)
- Review-based insights (parsed from Shopify data)
- Bestseller flags

### 2. Research Papers

**Location:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`

14 academic papers on gift psychology, recommendation systems, and social dynamics.

See `research/RESEARCH_INDEX.md` for full index with key insights.

---

## Python Enrichment Pipeline

**Location:** `scripts/product_enrichment/`

| Script | Purpose |
|--------|---------|
| `shopify_scraper.py` | Scrapes Shopify storefronts for reviews, bestsellers, and product details |
| `review_parser.py` | Parses and analyzes product reviews for gift-relevant signals |
| `recipient_signals.py` | Extracts recipient-fit signals (e.g., "great for dads", "perfect housewarming") |
| `composite_scorer.py` | Combines all signals into multi-factor gift scores |
| `load_neo4j.py` | Loads enriched products into local Neo4j instance |
| `load_bestsellers.py` | Loads Shopify bestseller data (is_bestseller, rank) into Neo4j |
| `load_shopify_tags.py` | Loads Shopify tags + product_type into Neo4j (native driver) |
| `run_pipeline.sh` | Orchestrates the full enrichment pipeline end-to-end |

**Shopify Scraping Status:**
- 315 B-Corp brands identified (all Shopify stores)
- 315/315 brands discovery-scanned (collections identified)
- 163/315 brands have bestseller data fetched (1,729 products scraped, 1,113 matched to Neo4j)
- Rate limited at 1.2s/req with exponential backoff
- Pipeline is resumable with `--resume-from` flag
- `--bestsellers-only --max-bestsellers 15` mode for lightweight scraping

**TypeScript Enrichment Scripts:**
- `scripts/expand-interests.ts --live` — Interest nodes + MATCHES_INTEREST (223 interests, 168K rels)
- `scripts/expand-categories.ts --live` — Category nodes + IN_CATEGORY (53 cats, 234K rels)
- `scripts/expand-occasions.ts --live` — Occasion nodes + GIFT_FOR_OCCASION (15 occasions, 842K rels)
- `scripts/expand-relationships.ts --live` — Relationship nodes + GIFT_FOR_RELATIONSHIP (18 rels, 758K rels)
- `scripts/expand-attributes.ts --live` — 14 boolean attribute flags (77K products)

---

## Neo4j Database (Current)

**Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
**Container:** `present-agent-neo4j`
**Products:** 133,328 total (4,809 brands)
**Embeddings:** 133,328/133,328 (100%)

### Enrichment Coverage (verified 2026-02-24)

~91,783 products are enriched (original batches). ~41,545 recently-added products are unenriched (embeddings only).

| Enrichment | Products | Coverage | Details |
|------------|----------|----------|---------|
| Embeddings | 133,328 | 100% | 1536-dim OpenAI text-embedding-3-small |
| Interests | 65,998 | 49% | 223 interests, 167K MATCHES_INTEREST rels |
| Categories | 79,412 | 60% | 53 categories, 234K IN_CATEGORY rels |
| Occasions | 91,774 | 69% | 15 occasions, 842K GIFT_FOR_OCCASION rels |
| Relationships | 90,490 | 68% | 18 relationships, 758K GIFT_FOR_RELATIONSHIP rels |
| Attributes | 77,294 | 58% | 14 boolean flags |
| Reviews | 0 | 0% | API enrichment pipeline ready (Google Shopping + Amazon) |
| Bestsellers | 41,770 | 31% | Shopify bestseller flag |

**Note:** Interest enrichment assigns too broadly — cleanup needed after each enrichment run (see MEMORY.md).

---

## Product Acquisition (Current Strategy)

**Primary source:** Storeleads CSV export (2.8M Shopify stores) → 8-stage pipeline
**Pipeline doc:** `docs/PRODUCT_ACQUISITION_PIPELINE.md`

| Batch | Offset | Products | Status |
|-------|--------|----------|--------|
| 0 | 0-2000 | 47,509 | Complete (enriched) |
| 1 | 4000 | 44,274 | Complete (enriched) |
| 2+ | 6000+ | 41,545 | Loaded, **embedded**, needs graph enrichment |
| **Total** | | **133,328** | **100% embedded, 49-69% enriched** |

### API Enrichment Sources (Review Data)

| Source | API | Purpose | Status |
|--------|-----|---------|--------|
| Google Shopping | Real-Time Product Search (RapidAPI) | Ratings, review counts, price ranges | Ready (scripts built) |
| Amazon | Real-Time Amazon Data (RapidAPI) | Ratings, reviews, bestseller lists | Ready (scripts built) |

**Pipeline:** `scripts/pipeline/google_shopping_enrich.py`, `amazon_enrich.py`, `amazon_bestsellers.py`, `google_shopping_discover.py`, `load_review_enrichments.py`
**Shared utils:** `scripts/pipeline/api_utils.py`
**Budget:** Pro tier = 20K calls/mo ($50), ~6,600 products enriched per month
**Key:** `RAPIDAPI_KEY` in `src/.env.local` (same key for both APIs)

### Future Sources (lower priority)

| Source | Type | Integration | Status |
|--------|------|-------------|--------|
| Etsy API v3 | Artisan/Handmade | REST API (OAuth2) | Pending activation |
| Gift card aggregator (Runa/Tango/Reloadly) | Digital | REST API | Research |
| Cratejoy API | Subscription boxes | REST API | Research |

### DO NOT Integrate

| Source | Reason |
|--------|--------|
| **Amazon PA-API** | **Explicitly prohibits LLM/ML use in TOS** (Real-Time Amazon Data on RapidAPI is a third-party scraper, not the official PA-API) |
| StubHub API | Gated access, not publicly available |

### Research Documents

| File | Contents |
|------|----------|
| `research/IDEAL_PRODUCT_CATALOG_ANALYSIS.md` | Market data, gift psychology, category framework, price strategy |
| `research/B_CORP_SHOPIFY_BRANDS_RESEARCH.md` | 150+ ethical brands mapped by category with gift scores |
| `research/EXPERIENCE_GIFT_DATA_SOURCES.md` | 50+ experience/subscription/digital platforms with API details |

---

*Last verified against Neo4j: 2026-02-26*
