#!/bin/bash

###############################################################################
# Enrichment Progress Monitor
#
# Shows real-time progress of the attribute enrichment process
#
# Usage:
#   ./scripts/monitor-enrichment.sh
###############################################################################

CHECKPOINT_FILE="data/.enrich-attributes-checkpoint.json"
LOG_FILE="logs/enrichment-retry.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ENRICHMENT PROGRESS MONITOR${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if process is running
if pgrep -f "run-enrichment-with-retry.sh" > /dev/null; then
    echo -e "${GREEN}Status: RUNNING${NC}"
    PID=$(pgrep -f "run-enrichment-with-retry.sh")
    echo -e "${BLUE}PID: ${PID}${NC}"
else
    echo -e "${YELLOW}Status: NOT RUNNING${NC}"
fi

echo ""

# Show checkpoint progress
if [ -f "$CHECKPOINT_FILE" ]; then
    echo -e "${CYAN}Checkpoint Data:${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────────────${NC}"

    processed=$(jq -r '.processedCount // 0' "$CHECKPOINT_FILE")
    needs=$(jq -r '.stats.needsAttributes // 0' "$CHECKPOINT_FILE")
    total=$(jq -r '.stats.totalInDb // 0' "$CHECKPOINT_FILE")
    attrs=$(jq -r '.stats.attributesSet // 0' "$CHECKPOINT_FILE")
    cost=$(jq -r '.stats.estimatedCost // 0' "$CHECKPOINT_FILE")
    tokens=$(jq -r '.stats.tokensUsed // 0' "$CHECKPOINT_FILE")
    timestamp=$(jq -r '.timestamp // "unknown"' "$CHECKPOINT_FILE")

    remaining=$needs
    percent=$((processed * 100 / (processed + remaining)))

    echo -e "  Processed:     ${GREEN}${processed}${NC} / ${CYAN}${needs}${NC} (${YELLOW}${percent}%${NC})"
    echo -e "  Remaining:     ${YELLOW}${remaining}${NC}"
    echo -e "  Attributes:    ${GREEN}${attrs}${NC}"
    echo -e "  Cost:          ${YELLOW}\$${cost}${NC}"
    echo -e "  Tokens:        ${BLUE}${tokens}${NC}"
    echo -e "  Last Update:   ${CYAN}${timestamp}${NC}"

    # Calculate ETA
    if [ "$processed" -gt 0 ]; then
        start=$(jq -r '.stats.startTime // 0' "$CHECKPOINT_FILE")
        now=$(date +%s)000
        elapsed=$((now - start))
        elapsed_sec=$((elapsed / 1000))

        if [ "$elapsed_sec" -gt 0 ]; then
            rate=$(echo "scale=2; $processed / $elapsed_sec" | bc)
            eta_sec=$(echo "scale=0; $remaining / $rate" | bc)

            # Format ETA
            hours=$((eta_sec / 3600))
            minutes=$(((eta_sec % 3600) / 60))

            echo -e "  Rate:          ${GREEN}${rate}${NC} products/sec"
            echo -e "  ETA:           ${YELLOW}~${hours}h ${minutes}m${NC}"
        fi
    fi
else
    echo -e "${YELLOW}No checkpoint file found${NC}"
fi

echo ""
echo -e "${CYAN}Recent Activity:${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────${NC}"

if [ -f "$LOG_FILE" ]; then
    tail -15 "$LOG_FILE" | grep -E "(Batch #|Progress:|Attempt|Complete|Error|Retrying)" || echo "No recent activity"
else
    echo -e "${YELLOW}No log file found${NC}"
fi

echo ""
echo -e "${CYAN}Commands:${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────────${NC}"
echo -e "  Watch live:     ${GREEN}tail -f $LOG_FILE${NC}"
echo -e "  Stop process:   ${YELLOW}kill \$(pgrep -f run-enrichment-with-retry.sh)${NC}"
echo -e "  Restart:        ${GREEN}./scripts/run-enrichment-with-retry.sh${NC}"
echo ""
