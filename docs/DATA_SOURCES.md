# Data Sources

All data used by Present Agent2 for gift recommendations.

---

## Current Data Sources

### 1. Product Catalog (B-Corp Brands)

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
- `scripts/expand-interests.ts --live` — Interest nodes + MATCHES_INTEREST (105 interests, 59K+ rels)
- `scripts/expand-categories.ts --live` — Category nodes + IN_CATEGORY (53 cats, 138K+ rels)

---

## Neo4j Database (Current)

**Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
**Container:** `present-agent-neo4j`
**Products:** 64,964 (deduplicated from 88,674 Aura dataset)

### Enrichment Coverage

| Enrichment | Coverage | Details |
|------------|----------|---------|
| Interests | 99.3% | 105 canonical interests, 872 synonyms, avg 5.2/product |
| Categories | 100% | 53+ categories, 138K+ IN_CATEGORY rels |
| Embeddings | 100% | 64,964 products, 1536-dim OpenAI text-embedding-3-small |
| Attributes | 75.4% | 14 boolean flags via heuristic tagger (expand-attributes.ts) |
| Occasions | 100% | 15 occasions, 539K+ GIFT_FOR_OCCASION rels |
| Relationships | 98.7% | 18 relationships, 453K+ GIFT_FOR_RELATIONSHIP rels |
| Shopify tags | 17% | 11,062 products with cleaned Shopify tags |
| Shopify product_type | 15.8% | 10,239 products with Shopify product_type |
| Reviews | 1% | 665 products with review data |
| Bestsellers | 1.7% | 1,113 products flagged across 159 brands (Shopify scrape) |
| Shopify tags | 15.1% | 9,793 products with cleaned Shopify tags |
| Shopify product_type | 14.8% | 9,603 products with Shopify product type |

### Multi-LLM Enrichment (Completed Dec 8, 2025)

- 29,124 products enriched with 14 boolean attributes
- 99.99% success rate (3 failures)
- Cost: $1.12 total
- Providers: OpenAI gpt-4o-mini (97.5%), Gemini 2.0 Flash (2.5%)

---

## Planned Data Sources (Expansion Waves)

Full details: `docs/PRODUCT_EXPANSION_WAVES.md`

### Tier 1: Highest Priority

| Source | Type | Products | Integration | Status |
|--------|------|----------|-------------|--------|
| Remaining B-Corp Shopify (265 brands) | Physical | ~15,000 | Existing scraper | Wave 1 |
| New B-Corp brands (52 identified) | Physical | ~5,000 | Shopify scraper | Wave 1 |
| Non-B-Corp ethical brands (45 identified) | Physical | ~5,000 | Shopify scraper | Wave 1 |
| Gift card aggregator (Runa/Tango/Reloadly) | Digital | 2K-14K brands | REST API | Wave 2 |
| Etsy API v3 | Artisan/Handmade | ~30,000 curated | REST API (OAuth2) | Wave 3 |

### Tier 2: High Value

| Source | Type | Products | Integration | Status |
|--------|------|----------|-------------|--------|
| Cratejoy API | Subscription boxes | ~500 curated | REST API | Wave 3 |
| Tinggly / Cloud 9 Living | Experiences | ~1,000 | Affiliate/scrape | Wave 3 |
| MasterClass / Audible | Digital subscriptions | ~50 | Manual curation | Wave 2 |

### Tier 3: Broad Coverage

| Source | Type | Products | Integration | Status |
|--------|------|----------|-------------|--------|
| Datafeedr aggregator | Multi-marketplace | ~10K curated from ~1B | REST API | Wave 4 |
| AvantLink | Outdoor/lifestyle | ~2,000 | Affiliate feed | Wave 4 |
| ShareASale / CJ Affiliate | Broad retail | Variable | Affiliate feed | Wave 4 |

### DO NOT Integrate

| Source | Reason |
|--------|--------|
| **Amazon PA-API** | **Explicitly prohibits LLM/ML use in TOS** |
| StubHub API | Gated access, not publicly available |

### Research Documents

| File | Contents |
|------|----------|
| `research/IDEAL_PRODUCT_CATALOG_ANALYSIS.md` | Market data, gift psychology, category framework, price strategy |
| `research/B_CORP_SHOPIFY_BRANDS_RESEARCH.md` | 150+ ethical brands mapped by category with gift scores |
| `research/EXPERIENCE_GIFT_DATA_SOURCES.md` | 50+ experience/subscription/digital platforms with API details |

---

*Last updated: 2026-02-18*
