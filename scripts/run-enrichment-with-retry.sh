#!/bin/bash

###############################################################################
# Automatic Retry Wrapper for Attribute Enrichment
#
# This script runs the attribute enrichment with automatic retry logic:
# - Runs until all ~41,535 products are enriched
# - Automatically retries on failures after 60 second delay
# - Resumes from checkpoint each time
# - Logs all attempts with timestamps
# - Max 100 retries to prevent infinite loops
#
# Usage:
#   ./scripts/run-enrichment-with-retry.sh
#
# Monitor:
#   tail -f logs/enrichment-retry.log
#
# Stop:
#   kill <PID> or Ctrl+C
###############################################################################

set -e

# Configuration
CHECKPOINT_FILE="data/.enrich-attributes-checkpoint.json"
LOG_FILE="logs/enrichment-retry.log"
MAX_RETRIES=100
RETRY_DELAY=60
TARGET_TOTAL=41535

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# Log function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} | $1" | tee -a "$LOG_FILE"
}

# Get current progress from checkpoint
get_progress() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        local processed=$(jq -r '.processedCount // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        local needs=$(jq -r '.stats.needsAttributes // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        echo "${processed}|${needs}"
    else
        echo "0|0"
    fi
}

# Check if enrichment is complete
is_complete() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        local needs=$(jq -r '.stats.needsAttributes // 0' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
        if [ "$needs" -eq 0 ]; then
            return 0
        fi
    fi
    return 1
}

# Main script
main() {
    log "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
    log "${CYAN}  AUTOMATIC ENRICHMENT RETRY WRAPPER${NC}"
    log "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
    log ""
    log "${BLUE}Target:${NC} ${TARGET_TOTAL} products"
    log "${BLUE}Max retries:${NC} ${MAX_RETRIES}"
    log "${BLUE}Retry delay:${NC} ${RETRY_DELAY}s"
    log "${BLUE}Log file:${NC} ${LOG_FILE}"
    log ""

    # Check initial status
    local progress=$(get_progress)
    local processed=$(echo $progress | cut -d'|' -f1)
    local needs=$(echo $progress | cut -d'|' -f2)

    if [ "$processed" -gt 0 ]; then
        local remaining=$((needs))
        log "${YELLOW}Resuming from checkpoint:${NC}"
        log "  Processed: ${GREEN}${processed}${NC}"
        log "  Remaining: ${YELLOW}${remaining}${NC}"
        log ""
    fi

    # Check if already complete
    if is_complete; then
        log "${GREEN}✅ Enrichment already complete!${NC}"
        exit 0
    fi

    local attempt=0
    local consecutive_failures=0

    while [ $attempt -lt $MAX_RETRIES ]; do
        attempt=$((attempt + 1))

        log "${CYAN}───────────────────────────────────────────────────────────────────────${NC}"
        log "${CYAN}Attempt #${attempt}${NC}"
        log "${CYAN}───────────────────────────────────────────────────────────────────────${NC}"

        # Get current progress
        progress=$(get_progress)
        processed=$(echo $progress | cut -d'|' -f1)
        needs=$(echo $progress | cut -d'|' -f2)

        if [ "$needs" -gt 0 ]; then
            local remaining=$((needs))
            local percent=$((processed * 100 / (processed + remaining)))
            log "${BLUE}Progress:${NC} ${processed}/${TARGET_TOTAL} (${percent}%) | ${YELLOW}Remaining: ${remaining}${NC}"
        fi

        log ""
        log "${BLUE}Running enrichment...${NC}"

        # Run the enrichment script
        if npx tsx scripts/enrich-attributes-only.ts --live 2>&1 | tee -a "$LOG_FILE"; then
            log ""
            log "${GREEN}✅ Attempt #${attempt} completed successfully${NC}"
            consecutive_failures=0

            # Check if we're done
            if is_complete; then
                log ""
                log "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
                log "${GREEN}  🎉 ENRICHMENT COMPLETE!${NC}"
                log "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
                log ""

                # Show final stats
                progress=$(get_progress)
                processed=$(echo $progress | cut -d'|' -f1)
                log "${GREEN}Total products enriched: ${processed}${NC}"
                log "${GREEN}Total attempts: ${attempt}${NC}"
                log ""
                exit 0
            fi

            # Continue with small delay
            log ""
            log "${BLUE}Continuing to next batch in 5 seconds...${NC}"
            sleep 5

        else
            local exit_code=$?
            log ""
            log "${RED}❌ Attempt #${attempt} failed (exit code: ${exit_code})${NC}"
            consecutive_failures=$((consecutive_failures + 1))

            # Show current progress
            progress=$(get_progress)
            processed=$(echo $progress | cut -d'|' -f1)
            needs=$(echo $progress | cut -d'|' -f2)

            if [ "$processed" -gt 0 ]; then
                log "${YELLOW}Progress saved: ${processed} products completed${NC}"
            fi

            # Check for too many consecutive failures
            if [ $consecutive_failures -ge 5 ]; then
                log "${RED}⚠️  Too many consecutive failures (${consecutive_failures}). Check for issues:${NC}"
                log "${RED}   - API key validity${NC}"
                log "${RED}   - Network connectivity${NC}"
                log "${RED}   - Neo4j connection${NC}"
                log ""
                log "${YELLOW}Increasing retry delay to 120 seconds...${NC}"
                sleep 120
                consecutive_failures=0
            else
                # Wait before retry
                log "${YELLOW}Retrying in ${RETRY_DELAY} seconds...${NC}"
                log ""
                sleep $RETRY_DELAY
            fi
        fi
    done

    # Max retries reached
    log ""
    log "${RED}═══════════════════════════════════════════════════════════════════════${NC}"
    log "${RED}  ⚠️  MAX RETRIES REACHED (${MAX_RETRIES})${NC}"
    log "${RED}═══════════════════════════════════════════════════════════════════════${NC}"
    log ""

    progress=$(get_progress)
    processed=$(echo $progress | cut -d'|' -f1)
    needs=$(echo $progress | cut -d'|' -f2)

    log "${YELLOW}Final status:${NC}"
    log "  Processed: ${processed}"
    log "  Remaining: ${needs}"
    log ""
    log "${YELLOW}Manual intervention required. Check logs and retry manually.${NC}"
    exit 1
}

# Run main script
main
