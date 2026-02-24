#!/bin/bash
#
# Product Data Acquisition Pipeline - Orchestrator
#
# Chains all pipeline stages with checkpoints and progress tracking.
#
# Usage:
#   ./scripts/pipeline/run_acquisition.sh                    # Full pipeline (dry run by default)
#   ./scripts/pipeline/run_acquisition.sh --live             # Full pipeline, write data
#   ./scripts/pipeline/run_acquisition.sh --live --embed     # Full pipeline + embeddings
#   ./scripts/pipeline/run_acquisition.sh --stage 3          # Start from stage 3
#   ./scripts/pipeline/run_acquisition.sh --stage 5 --live --embed --wipe  # Wipe + reload
#   ./scripts/pipeline/run_acquisition.sh --stores 500       # Override store limit
#   ./scripts/pipeline/run_acquisition.sh --offset 2000      # Start at ranked offset
#   ./scripts/pipeline/run_acquisition.sh --products 50      # Override products per store
#

set -euo pipefail

# --- Config ---
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PIPELINE_DIR="$PROJECT_ROOT/data/pipeline"
SRC_DIR="$PROJECT_ROOT/src"
SCRIPTS_DIR="$PROJECT_ROOT/scripts/pipeline"
LOG_FILE="$PIPELINE_DIR/run_log.json"

# Defaults
START_STAGE=1
LIVE=""
EMBED=""
WIPE=""
STORE_LIMIT=500
STORE_OFFSET=0
MAX_PRODUCTS=30
SKIP_RECS=""

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)    START_STAGE="$2"; shift 2 ;;
        --live)     LIVE="--live"; shift ;;
        --embed)    EMBED="--embed"; shift ;;
        --wipe)     WIPE="--wipe"; shift ;;
        --stores)   STORE_LIMIT="$2"; shift 2 ;;
        --offset)   STORE_OFFSET="$2"; shift 2 ;;
        --products) MAX_PRODUCTS="$2"; shift 2 ;;
        --skip-recs) SKIP_RECS="--skip-recs"; shift ;;
        *)          echo "Unknown arg: $1"; exit 1 ;;
    esac
done

# --- Helpers ---
timestamp() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

log_stage() {
    local stage="$1" status="$2" message="$3"
    echo ""
    echo "================================================================"
    echo "  STAGE $stage: $message [$status]"
    echo "  $(timestamp)"
    echo "================================================================"
}

check_stage() {
    local stage="$1"
    if [ "$START_STAGE" -gt "$stage" ]; then
        return 1  # Skip
    fi
    return 0  # Run
}

# --- Init ---
mkdir -p "$PIPELINE_DIR/raw_products"

echo ""
echo "================================================================"
echo "  PRODUCT DATA ACQUISITION PIPELINE"
echo "================================================================"
echo "  Start stage:      $START_STAGE"
echo "  Store limit:      $STORE_LIMIT"
echo "  Store offset:     $STORE_OFFSET"
echo "  Products/store:   $MAX_PRODUCTS"
echo "  Live mode:        ${LIVE:-no}"
echo "  Embeddings:       ${EMBED:-no}"
echo "  Wipe DB:          ${WIPE:-no}"
echo "  Project root:     $PROJECT_ROOT"
echo "  Pipeline dir:     $PIPELINE_DIR"
echo "  Started at:       $(timestamp)"
echo ""

# Save run metadata
cat > "$LOG_FILE" << EOF
{
  "started_at": "$(timestamp)",
  "start_stage": $START_STAGE,
  "store_limit": $STORE_LIMIT,
  "store_offset": $STORE_OFFSET,
  "max_products": $MAX_PRODUCTS,
  "live": $([ -n "$LIVE" ] && echo "true" || echo "false"),
  "embed": $([ -n "$EMBED" ] && echo "true" || echo "false"),
  "wipe": $([ -n "$WIPE" ] && echo "true" || echo "false"),
  "stages_completed": []
}
EOF

# ====================================================================
# STAGE 1: CSV Filter & Rank
# ====================================================================
if check_stage 1; then
    log_stage 1 "RUNNING" "CSV Filter & Rank"
    python3 "$SCRIPTS_DIR/filter_stores.py" \
        --limit "$STORE_LIMIT" \
        --offset "$STORE_OFFSET" \
        || { log_stage 1 "FAILED" "CSV Filter & Rank"; exit 1; }
    log_stage 1 "DONE" "CSV Filter & Rank"

    # Verify output
    if [ ! -f "$PIPELINE_DIR/shortlisted_stores.json" ]; then
        echo "  ERROR: shortlisted_stores.json not created"
        exit 1
    fi
    STORE_COUNT=$(python3 -c "import json; d=json.load(open('$PIPELINE_DIR/shortlisted_stores.json')); print(len(d.get('stores', [])))")
    echo "  Stores shortlisted: $STORE_COUNT"
fi

# ====================================================================
# STAGE 2: Store Vetting Agent
# ====================================================================
if check_stage 2; then
    log_stage 2 "RUNNING" "Store Vetting Agent"
    python3 "$SCRIPTS_DIR/vet_stores.py" \
        --resume \
        || { log_stage 2 "FAILED" "Store Vetting Agent"; exit 1; }
    log_stage 2 "DONE" "Store Vetting Agent"

    if [ ! -f "$PIPELINE_DIR/vetted_stores.json" ]; then
        echo "  ERROR: vetted_stores.json not created"
        exit 1
    fi
    VETTED_COUNT=$(python3 -c "import json; d=json.load(open('$PIPELINE_DIR/vetted_stores.json')); print(len(d.get('stores', [])))")
    echo "  Stores vetted: $VETTED_COUNT"
fi

# ====================================================================
# STAGE 3: Shopify Product Scraper
# ====================================================================
if check_stage 3; then
    log_stage 3 "RUNNING" "Shopify Product Scraper"
    python3 "$SCRIPTS_DIR/scrape_products.py" \
        --max-products "$MAX_PRODUCTS" \
        --resume \
        || { log_stage 3 "FAILED" "Shopify Product Scraper"; exit 1; }
    log_stage 3 "DONE" "Shopify Product Scraper"

    JSONL_COUNT=$(ls "$PIPELINE_DIR/raw_products/"*.jsonl 2>/dev/null | wc -l | tr -d ' ')
    echo "  Store files: $JSONL_COUNT"
fi

# ====================================================================
# STAGE 4: Product Normalizer
# ====================================================================
if check_stage 4; then
    log_stage 4 "RUNNING" "Product Normalizer"
    python3 "$SCRIPTS_DIR/normalize_products.py" \
        || { log_stage 4 "FAILED" "Product Normalizer"; exit 1; }
    log_stage 4 "DONE" "Product Normalizer"

    if [ ! -f "$PIPELINE_DIR/normalized_products.jsonl" ]; then
        echo "  ERROR: normalized_products.jsonl not created"
        exit 1
    fi
    PRODUCT_COUNT=$(wc -l < "$PIPELINE_DIR/normalized_products.jsonl" | tr -d ' ')
    echo "  Normalized products: $PRODUCT_COUNT"
fi

# ====================================================================
# STAGE 5: Neo4j Load + Embeddings
# ====================================================================
if check_stage 5; then
    log_stage 5 "RUNNING" "Neo4j Load + Embeddings"

    # Must run from src/ directory for imports
    cd "$SRC_DIR"
    tsx ../scripts/pipeline/load_products.ts $LIVE $EMBED $WIPE --yes \
        || { log_stage 5 "FAILED" "Neo4j Load + Embeddings"; exit 1; }
    cd "$PROJECT_ROOT"
    log_stage 5 "DONE" "Neo4j Load + Embeddings"
fi

# ====================================================================
# STAGE 5b: Enrichment Pipeline (reuse existing scripts)
# ====================================================================
if check_stage 5 && [ -n "$LIVE" ]; then
    log_stage "5b" "RUNNING" "Enrichment Pipeline"

    cd "$SRC_DIR"

    echo "  Running interest expansion..."
    tsx ../scripts/expand-interests.ts --live 2>&1 | tail -5 || true

    echo "  Running category expansion..."
    tsx ../scripts/expand-categories.ts --live 2>&1 | tail -5 || true

    echo "  Running occasion expansion..."
    tsx ../scripts/expand-occasions.ts --live 2>&1 | tail -5 || true

    echo "  Running relationship expansion..."
    tsx ../scripts/expand-relationships.ts --live 2>&1 | tail -5 || true

    echo "  Running attribute expansion..."
    tsx ../scripts/expand-attributes.ts --live 2>&1 | tail -5 || true

    cd "$PROJECT_ROOT"
    log_stage "5b" "DONE" "Enrichment Pipeline"
fi

# ====================================================================
# STAGE 6: Learner Agent
# ====================================================================
if check_stage 6; then
    log_stage 6 "RUNNING" "Learner Agent"
    python3 "$SCRIPTS_DIR/learner.py" \
        || { log_stage 6 "FAILED" "Learner Agent"; exit 1; }
    log_stage 6 "DONE" "Learner Agent"
fi

# ====================================================================
# STAGE 7: Bar Raiser
# ====================================================================
if check_stage 7; then
    log_stage 7 "RUNNING" "Bar Raiser"
    python3 "$SCRIPTS_DIR/bar_raiser.py" \
        $SKIP_RECS \
        || { log_stage 7 "FAILED" "Bar Raiser"; exit 1; }
    log_stage 7 "DONE" "Bar Raiser"
fi

# ====================================================================
# DONE
# ====================================================================
echo ""
echo "================================================================"
echo "  PIPELINE COMPLETE"
echo "  Finished at: $(timestamp)"
echo "================================================================"
echo ""
echo "  Next steps:"
echo "    1. Review bar raiser report: cat $PIPELINE_DIR/bar_raiser_report.md"
echo "    2. Review learner output:    cat $PIPELINE_DIR/run_learnings.json"
echo "    3. Run quality tests:        python3 scripts/test_quality.py"
echo "    4. Start the app:            cd src && npm run dev"
echo ""
