#!/bin/bash
# Quick progress checker for attribute enrichment

LOG_FILE="logs/attribute-enrichment-full-run.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ATTRIBUTE ENRICHMENT PROGRESS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get latest batch info
LATEST=$(tail -20 "$LOG_FILE" | grep "Batch #" | tail -1)
if [ -n "$LATEST" ]; then
    echo "$LATEST"
    echo ""
fi

# Get checkpoint info
CHECKPOINT=$(tail -50 "$LOG_FILE" | grep "Checkpoint saved" | tail -1)
if [ -n "$CHECKPOINT" ]; then
    echo "Latest checkpoint: $(tail -50 "$LOG_FILE" | grep -B1 "Checkpoint saved" | head -1)"
    echo ""
fi

# Calculate progress
PROCESSED=$(tail -50 "$LOG_FILE" | grep "Total:" | tail -1 | sed 's/.*Total: \([0-9]*\)\/\([0-9]*\).*/\1/')
TOTAL=$(tail -50 "$LOG_FILE" | grep "Total:" | tail -1 | sed 's/.*Total: \([0-9]*\)\/\([0-9]*\).*/\2/')

if [ -n "$PROCESSED" ] && [ -n "$TOTAL" ]; then
    PERCENT=$(echo "scale=1; $PROCESSED * 100 / $TOTAL" | bc)
    REMAINING=$((TOTAL - PROCESSED))
    
    echo "Progress: $PROCESSED / $TOTAL ($PERCENT%)"
    echo "Remaining: $REMAINING products"
    
    # Estimate time remaining (at ~1.7 products/sec)
    SECONDS_LEFT=$((REMAINING / 2))
    HOURS=$((SECONDS_LEFT / 3600))
    MINS=$(((SECONDS_LEFT % 3600) / 60))
    
    echo "Est. time left: ${HOURS}h ${MINS}m (at current rate)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run: ./check-progress.sh to refresh"
echo "View log: tail -f $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
