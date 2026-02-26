#!/bin/bash
# Present Agent2 - Local Development Startup
#
# Prerequisites: Docker Desktop installed and running
#
# What this does:
#   1. Starts Neo4j via Docker (data stored on SSD)
#   2. Waits for Neo4j to be healthy
#   3. Sets up schema (constraints, indexes, reference nodes)
#   4. Loads enriched product catalog
#
# Usage:
#   ./start-local.sh             # Full startup
#   ./start-local.sh --neo4j     # Only start Neo4j
#   ./start-local.sh --load      # Only load data (Neo4j already running)
#   ./start-local.sh --enrich    # Run enrichment pipeline + load
#   ./start-local.sh --status    # Check status of everything

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENRICHMENT_DIR="$PROJECT_DIR/scripts/product_enrichment"
OUTPUT_DIR="$ENRICHMENT_DIR/output"

# Allow env overrides for consistency with src/.env.local
NEO4J_URI="${NEO4J_URL:-${NEO4J_URI:-bolt://localhost:7687}}"
NEO4J_USER="${NEO4J_USERNAME:-${NEO4J_USER:-neo4j}}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-presentagent2024}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[present-agent]${NC} $1"; }
warn() { echo -e "${YELLOW}[present-agent]${NC} $1"; }
err() { echo -e "${RED}[present-agent]${NC} $1"; }

# --- Check prerequisites ---
check_docker() {
    if ! command -v docker &> /dev/null; then
        err "Docker not found!"
        echo ""
        echo "Install Docker Desktop:"
        echo "  https://www.docker.com/products/docker-desktop/"
        echo ""
        echo "After installing, open Docker Desktop and wait for it to start."
        echo "Then re-run this script."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        err "Docker daemon not running!"
        echo "Open Docker Desktop and wait for it to start, then re-run."
        exit 1
    fi

    log "Docker: OK"
}

check_python() {
    if ! command -v python3 &> /dev/null; then
        err "Python3 not found!"
        exit 1
    fi
    log "Python3: $(python3 --version)"
}

# --- Neo4j operations ---
start_neo4j() {
    log "Starting Neo4j..."
    cd "$PROJECT_DIR"

    if docker ps --format '{{.Names}}' | grep -q present-agent-neo4j; then
        log "Neo4j already running"
    else
        docker compose up -d neo4j
        log "Neo4j container starting..."
    fi

    # Wait for health
    log "Waiting for Neo4j to be ready..."
    local retries=0
    local max_retries=30

    while [ $retries -lt $max_retries ]; do
        if docker exec present-agent-neo4j wget --quiet --tries=1 --spider http://localhost:7474 2>/dev/null; then
            log "Neo4j is healthy!"
            echo ""
            echo "  Browser: http://localhost:7474"
            echo "  Bolt:    bolt://localhost:7687"
            echo "  Auth:    neo4j / presentagent2024"
            echo ""
            return 0
        fi
        retries=$((retries + 1))
        echo -n "."
        sleep 2
    done

    err "Neo4j failed to start after ${max_retries} attempts"
    echo "Check logs: docker compose logs neo4j"
    exit 1
}

stop_neo4j() {
    log "Stopping Neo4j..."
    cd "$PROJECT_DIR"
    docker compose down
    log "Neo4j stopped."
}

# --- Data operations ---
run_enrichment() {
    log "Running enrichment pipeline..."
    cd "$ENRICHMENT_DIR"
    bash run_pipeline.sh --skip-scrape
}

load_data() {
    log "Loading enriched catalog into Neo4j..."

    if [ ! -f "$OUTPUT_DIR/enriched_catalog.json" ]; then
        warn "No enriched catalog found. Running enrichment pipeline first..."
        run_enrichment
    fi

    # Install neo4j Python driver if needed
    python3 -c "import neo4j" 2>/dev/null || pip3 install neo4j --quiet

    cd "$ENRICHMENT_DIR"
    python3 load_neo4j.py \
        --input "$OUTPUT_DIR/enriched_catalog.json" \
        --uri "$NEO4J_URI" \
        --user "$NEO4J_USER" \
        --password "$NEO4J_PASSWORD"
}

show_status() {
    echo ""
    log "=== Present Agent2 Status ==="
    echo ""

    # Docker
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo "  Docker:   $(docker --version | head -1)"
    else
        echo "  Docker:   NOT AVAILABLE"
    fi

    # Neo4j
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q present-agent-neo4j; then
        echo "  Neo4j:    RUNNING (localhost:7687)"
    elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q present-agent-neo4j; then
        echo "  Neo4j:    STOPPED"
    else
        echo "  Neo4j:    NOT CREATED"
    fi

    # Data files
    echo ""
    echo "  Data files:"
    for f in parsed_reviews.json recipient_enriched.json shopify_data.json enriched_catalog.json; do
        if [ -f "$OUTPUT_DIR/$f" ]; then
            size=$(du -h "$OUTPUT_DIR/$f" | cut -f1)
            echo "    $f: ${size}"
        else
            echo "    $f: MISSING"
        fi
    done

    # Neo4j data dir
    echo ""
    if [ -d "$PROJECT_DIR/neo4j-data/data" ]; then
        size=$(du -sh "$PROJECT_DIR/neo4j-data/data" 2>/dev/null | cut -f1)
        echo "  Neo4j data on SSD: ${size}"
    else
        echo "  Neo4j data on SSD: NOT CREATED"
    fi

    # DB stats if running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q present-agent-neo4j; then
        echo ""
        log "Database stats:"
        python3 -c "import neo4j" 2>/dev/null && \
            python3 "$ENRICHMENT_DIR/load_neo4j.py" --stats --uri "$NEO4J_URI" --user "$NEO4J_USER" --password "$NEO4J_PASSWORD" 2>/dev/null || \
            echo "  (install neo4j driver: pip3 install neo4j)"
    fi
}

# --- Main ---
case "${1:-full}" in
    --neo4j)
        check_docker
        start_neo4j
        ;;
    --stop)
        stop_neo4j
        ;;
    --load)
        check_python
        load_data
        ;;
    --enrich)
        check_python
        run_enrichment
        load_data
        ;;
    --status)
        show_status
        ;;
    full|--full)
        check_docker
        check_python
        start_neo4j
        load_data
        log "Done! Neo4j is running with enriched data."
        log "Open http://localhost:7474 to explore the graph."
        ;;
    *)
        echo "Usage: $0 [--neo4j|--stop|--load|--enrich|--status|--full]"
        echo ""
        echo "  --full     Full startup: Neo4j + load data (default)"
        echo "  --neo4j    Only start Neo4j"
        echo "  --stop     Stop Neo4j"
        echo "  --load     Only load data (Neo4j must be running)"
        echo "  --enrich   Run enrichment pipeline + load"
        echo "  --status   Check status of everything"
        ;;
esac
