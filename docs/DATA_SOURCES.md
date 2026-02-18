# Data Sources

All data used by Present Agent2 for gift recommendations.

---

## Product Catalog (B-Corp Brands)

### Raw Catalog (iCloud)

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

---

### Enriched Catalog (Local)

**Location:** `scripts/product_enrichment/output/enriched_catalog.json` (~88MB)

The raw catalog is processed through a Python enrichment pipeline that adds:
- Recipient signals (who would this gift suit?)
- Composite gift scores (practical, luxury, sentimental, etc.)
- Review-based insights (parsed from Shopify data)
- Bestseller flags

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
| `run_pipeline.sh` | Orchestrates the full enrichment pipeline end-to-end |

**Shopify Scraping Status:**
- 315 B-Corp brands identified
- ~50 brands scraped so far
- 166 brands have Shopify bestseller collections available
- Remaining brands queued for scraping

---

## Neo4j Database (Current)

**Instance:** Local Docker (`bolt://localhost:7687`)
**Products:** 64,964 (deduplicated from 88,674 Aura dataset)

### Enrichment Coverage

| Enrichment | Coverage | Details |
|------------|----------|---------|
| Interests | 99.3% | 105 canonical interests, 872 synonyms, avg 5.2/product |
| Occasions | 84.6% | 41 occasion tags, avg 3.1/product |
| Attributes | 74.6% | 14 boolean flags (is_practical, is_luxury, etc.) |
| Embeddings | In progress | 64,954 products being embedded (1536-dim, OpenAI text-embedding-3-small) |

### Multi-LLM Enrichment (Completed Dec 8, 2025)

- 29,124 products enriched with 14 boolean attributes
- 99.99% success rate (3 failures)
- Cost: $1.12 total
- Providers: OpenAI gpt-4o-mini (97.5%), Gemini 2.0 Flash (2.5%)

---

## Research Papers

**Location:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`

14 academic papers on gift psychology, recommendation systems, and social dynamics.

See `research/RESEARCH_INDEX.md` for full index with key insights.

---

*Last updated: 2026-02-17*
