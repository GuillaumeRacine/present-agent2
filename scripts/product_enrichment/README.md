# Product Enrichment Scripts

Standalone Python scripts for enriching product data from external sources.

## Shopify Scraping
- `shopify_scraper.py` — Scrapes Shopify stores for product data, images, bestseller status. Flags: `--bestsellers-only`, `--from-neo4j`
- `run_pipeline.sh` — Orchestrates the full enrichment pipeline run

## Neo4j Loading
- `load_neo4j.py` — Alternative product loader (Python, for enrichment pipeline output)
- `load_bestsellers.py` — Sets `is_bestseller` flags on existing products
- `load_shopify_tags.py` — Loads Shopify tags and product_type fields
- `load_images.py` — Loads product image URLs

## Scoring and Analysis
- `composite_scorer.py` — Computes composite gift suitability scores
- `recipient_signals.py` — Extracts recipient demographic signals from products
- `review_parser.py` — Parses review text for sentiment and quality signals
- `validate_availability.py` — Checks product availability/OOS status

## Output
- `output/` — Pipeline run outputs (JSON files)
