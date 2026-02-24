#!/bin/bash
#
# Run product acquisition in ranked brand/store batches with embeddings.
#
# Default: 10 batches x 2000 stores = next 20k ranked stores.
#
# Usage:
#   ./scripts/pipeline/run_acquisition_batches.sh
#   ./scripts/pipeline/run_acquisition_batches.sh --start-offset 4000
#   ./scripts/pipeline/run_acquisition_batches.sh --batches 10 --batch-size 2000 --products 30
#   ./scripts/pipeline/run_acquisition_batches.sh --no-push
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNNER="$PROJECT_ROOT/scripts/pipeline/run_acquisition.sh"
LOG_DIR="$PROJECT_ROOT/data/pipeline/batch_runs"

BATCHES=10
BATCH_SIZE=2000
START_OFFSET=0
MAX_PRODUCTS=30
DO_PUSH=1

while [[ $# -gt 0 ]]; do
    case $1 in
        --batches) BATCHES="$2"; shift 2 ;;
        --batch-size) BATCH_SIZE="$2"; shift 2 ;;
        --start-offset) START_OFFSET="$2"; shift 2 ;;
        --products) MAX_PRODUCTS="$2"; shift 2 ;;
        --no-push) DO_PUSH=0; shift ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

mkdir -p "$LOG_DIR"

timestamp() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

echo ""
echo "================================================================"
echo "  ACQUISITION BATCH RUNNER"
echo "================================================================"
echo "  Batches:         $BATCHES"
echo "  Batch size:      $BATCH_SIZE"
echo "  Start offset:    $START_OFFSET"
echo "  Products/store:  $MAX_PRODUCTS"
echo "  Embeddings:      enabled"
echo "  Git push:        $([ "$DO_PUSH" -eq 1 ] && echo "enabled" || echo "disabled")"
echo "  Started at:      $(timestamp)"
echo "================================================================"
echo ""

for ((i=0; i<BATCHES; i++)); do
    BATCH_NUM=$((i + 1))
    OFFSET=$((START_OFFSET + i * BATCH_SIZE))
    BATCH_LOG="$LOG_DIR/batch_${BATCH_NUM}_offset_${OFFSET}.log"

    echo ""
    echo "----------------------------------------------------------------"
    echo "  BATCH $BATCH_NUM/$BATCHES (offset=$OFFSET, stores=$BATCH_SIZE)"
    echo "  Started: $(timestamp)"
    echo "  Log: $BATCH_LOG"
    echo "----------------------------------------------------------------"

    (
      cd "$PROJECT_ROOT"
      "$RUNNER" \
        --stores "$BATCH_SIZE" \
        --offset "$OFFSET" \
        --products "$MAX_PRODUCTS" \
        --live \
        --embed \
        --skip-recs
    ) 2>&1 | tee "$BATCH_LOG"

    echo "  Batch $BATCH_NUM complete at $(timestamp)"

    if [ "$DO_PUSH" -eq 1 ]; then
        echo "  Git checkpoint push attempt..."
        (
          cd "$PROJECT_ROOT"
          git add scripts/pipeline/filter_stores.py \
                  scripts/pipeline/run_acquisition.sh \
                  scripts/pipeline/run_acquisition_batches.sh || true

          if ! git diff --cached --quiet; then
            git commit -m "pipeline: add offset batching workflow for acquisition runs" || true
          fi

          git push origin "$(git branch --show-current)" || true
        )
    fi
done

echo ""
echo "================================================================"
echo "  ALL BATCHES COMPLETE"
echo "  Finished at: $(timestamp)"
echo "================================================================"
echo ""
