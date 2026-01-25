#!/bin/bash
#
# ROBUST PRODUCT ENRICHMENT RUNNER
#
# This script runs the enrichment to completion. It will:
# - Use all available LLM providers (Gemini, OpenAI, Anthropic)
# - Automatically handle rate limits with exponential backoff
# - Resume from checkpoint on restart
# - Log everything to a timestamped file
#
# USAGE:
#   ./run-enrichment-robust.sh           # Runs in foreground with logging
#   ./run-enrichment-robust.sh background # Runs in background (nohup)
#
# To monitor progress when running in background:
#   tail -f enrichment-robust-*.log
#
# To check if it's still running:
#   pgrep -f "enrich-products-robust"
#

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

LOG_FILE="enrichment-robust-$(date +%Y%m%d-%H%M%S).log"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ROBUST PRODUCT ENRICHMENT - Runs to Completion${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Log file: ${GREEN}$LOG_FILE${NC}"
echo ""

# Check for required environment
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local not found. Make sure API keys are set.${NC}"
fi

# Check for at least one provider
HAS_PROVIDER=false
if [ -n "$GOOGLE_API_KEY" ] || [ -n "$GEMINI_API_KEY" ]; then HAS_PROVIDER=true; fi
if [ -n "$OPENAI_API_KEY" ]; then HAS_PROVIDER=true; fi
if [ -n "$ANTHROPIC_API_KEY" ]; then HAS_PROVIDER=true; fi

if [ "$HAS_PROVIDER" = false ]; then
    echo -e "${YELLOW}Note: Provider API keys will be loaded from .env.local${NC}"
fi

# Build command (export TMPDIR first for nohup compatibility)
export TMPDIR=/tmp
CMD="npx tsx scripts/enrich-products-robust.ts --live --batch-size 15 --concurrency 3"

# Check for background mode
if [ "$1" = "background" ] || [ "$1" = "bg" ]; then
    echo -e "Running in ${YELLOW}BACKGROUND${NC} mode..."
    echo ""
    echo -e "To monitor: ${GREEN}tail -f $LOG_FILE${NC}"
    echo -e "To stop:    ${GREEN}pkill -f 'enrich-products-robust'${NC}"
    echo ""

    nohup $CMD > "$LOG_FILE" 2>&1 &
    PID=$!
    echo -e "Started with PID: ${GREEN}$PID${NC}"
    echo $PID > .enrichment-robust.pid

    # Wait a few seconds and check if it's still running
    sleep 3
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Process is running${NC}"
    else
        echo -e "${YELLOW}⚠ Process may have exited. Check $LOG_FILE for errors.${NC}"
    fi
else
    echo -e "Running in ${GREEN}FOREGROUND${NC} mode..."
    echo -e "Press Ctrl+C to stop (progress will be saved to checkpoint)"
    echo ""

    # Run with tee for both console and file logging
    $CMD 2>&1 | tee "$LOG_FILE"
fi
