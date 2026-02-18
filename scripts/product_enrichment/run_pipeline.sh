#!/bin/bash
# Product Enrichment Pipeline
# Runs: review_parser → recipient_signals → shopify_scraper → composite_scorer
#
# Usage:
#   ./run_pipeline.sh              # Full pipeline
#   ./run_pipeline.sh --skip-scrape # Skip Shopify scraping (use cached data)
#   ./run_pipeline.sh --scrape-only # Only run Shopify scraper

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
BCORP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp"

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo " Product Enrichment Pipeline"
echo " $(date)"
echo "========================================"
echo ""

SKIP_SCRAPE=false
SCRAPE_ONLY=false
SCRAPE_LIMIT=0

for arg in "$@"; do
    case $arg in
        --skip-scrape) SKIP_SCRAPE=true ;;
        --scrape-only) SCRAPE_ONLY=true ;;
        --scrape-limit=*) SCRAPE_LIMIT="${arg#*=}" ;;
    esac
done

if [ "$SCRAPE_ONLY" = true ]; then
    echo "=== Step: Shopify Scraper (full catalog fetch) ==="
    python3 "$SCRIPT_DIR/shopify_scraper.py" \
        --bcorp-dir "$BCORP_DIR/json/" \
        --output "$OUTPUT_DIR/shopify_data.json" \
        ${SCRAPE_LIMIT:+--limit "$SCRAPE_LIMIT"}
    echo ""
    echo "Done. Shopify data saved to $OUTPUT_DIR/shopify_data.json"
    exit 0
fi

# Step 1: Parse reviews
echo "=== Step 1/4: Review Parser ==="
python3 "$SCRIPT_DIR/review_parser.py" \
    --input-dir "$BCORP_DIR/json/" \
    --output "$OUTPUT_DIR/parsed_reviews.json"
echo ""

# Step 2: Extract recipient signals
echo "=== Step 2/4: Recipient Signal Extractor ==="
python3 "$SCRIPT_DIR/recipient_signals.py" \
    --input "$OUTPUT_DIR/parsed_reviews.json" \
    --output "$OUTPUT_DIR/recipient_enriched.json"
echo ""

# Step 3: Shopify scraper (optional)
if [ "$SKIP_SCRAPE" = true ]; then
    echo "=== Step 3/4: Shopify Scraper [SKIPPED] ==="
    if [ ! -f "$OUTPUT_DIR/shopify_data.json" ]; then
        echo "  Warning: No cached shopify_data.json found. Scores will be less accurate."
        echo '{}' > "$OUTPUT_DIR/shopify_data.json"
    fi
else
    echo "=== Step 3/4: Shopify Scraper (discover collections) ==="
    python3 "$SCRIPT_DIR/shopify_scraper.py" \
        --discover-only \
        --bcorp-dir "$BCORP_DIR/json/" \
        --output "$OUTPUT_DIR/shopify_data.json" \
        ${SCRAPE_LIMIT:+--limit "$SCRAPE_LIMIT"}
fi
echo ""

# Step 4: Composite scorer
echo "=== Step 4/4: Composite Scorer ==="
python3 "$SCRIPT_DIR/composite_scorer.py" \
    --reviews "$OUTPUT_DIR/parsed_reviews.json" \
    --signals "$OUTPUT_DIR/recipient_enriched.json" \
    --shopify "$OUTPUT_DIR/shopify_data.json" \
    --cleaned "$BCORP_DIR/BCorps_Products_Cleaned.json" \
    --output "$OUTPUT_DIR/enriched_catalog.json"
echo ""

echo "========================================"
echo " Pipeline Complete"
echo " Output: $OUTPUT_DIR/enriched_catalog.json"
echo " $(date)"
echo "========================================"

# Quick stats
python3 -c "
import json
with open('$OUTPUT_DIR/enriched_catalog.json') as f:
    data = json.load(f)
scored = [p for p in data if p['popularity_score'] > 0]
gifts = [p for p in data if p.get('gift_proven')]
print(f'  Total products: {len(data)}')
print(f'  With popularity score: {len(scored)}')
print(f'  Gift-proven: {len(gifts)}')
print(f'  Top product: {scored[0][\"product_title\"]} (score: {scored[0][\"popularity_score\"]})')
"
