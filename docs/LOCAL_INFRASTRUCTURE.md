# Local Infrastructure

Docker-based local development setup for Present Agent2.

---

## Docker Compose

**File:** `docker-compose.yml` (project root)

```bash
# Start Neo4j
docker compose up -d

# View logs
docker compose logs -f neo4j

# Stop
docker compose down
```

### Neo4j Container

| Setting | Value |
|---------|-------|
| Image | `neo4j:5-community` |
| Container | `present-agent-neo4j` |
| Browser | `http://localhost:7474` |
| Bolt | `bolt://localhost:7687` |
| Auth | `neo4j/presentagent2024` |
| Heap | 512MB initial, 1GB max |
| Page cache | 512MB |
| Plugins | APOC |
| Data dir | `./neo4j-data/` |

---

## Startup Script

**File:** `start-local.sh`

```bash
./start-local.sh              # Full startup (Docker + schema + data load)
./start-local.sh --neo4j      # Only start Neo4j
./start-local.sh --load       # Only load data (Neo4j already running)
./start-local.sh --enrich     # Run enrichment pipeline + load
./start-local.sh --status     # Check status of everything
./start-local.sh --stop       # Stop Neo4j container
```

### What `--full` Does

1. Checks Docker Desktop is installed and running
2. Starts Neo4j via `docker compose up -d`
3. Waits for Neo4j health check to pass
4. Sets up schema (constraints, indexes, reference nodes)
5. Loads enriched product catalog from `scripts/product_enrichment/output/`

---

## Enrichment Pipeline

**Location:** `scripts/product_enrichment/`

### Run Full Pipeline

```bash
./start-local.sh --enrich
# or manually:
cd scripts/product_enrichment && bash run_pipeline.sh
```

### Pipeline Steps

1. `shopify_scraper.py` - Scrape Shopify storefronts
2. `review_parser.py` - Parse and analyze reviews
3. `recipient_signals.py` - Extract recipient-fit signals
4. `composite_scorer.py` - Compute multi-factor gift scores
5. `load_neo4j.py` - Load into Neo4j

Output lands in `scripts/product_enrichment/output/`.

---

## Embedding Generation

Embeddings are generated via the TypeScript codebase using OpenAI `text-embedding-3-small` (1536 dimensions).

```bash
# From src/ directory
npm run setup:schema     # Creates vector indexes
npx tsx scripts/generate-embeddings-local.ts --limit 100    # Test run
npx tsx scripts/generate-embeddings-local.ts                # Full run
```

### Check Embedding Status

```bash
# Query Neo4j for embedding coverage
docker exec present-agent-neo4j cypher-shell -u neo4j -p presentagent2024 \
  "MATCH (p:Product) WHERE p.product_embedding IS NOT NULL RETURN count(p)"
```

---

## Status Check

```bash
./start-local.sh --status
```

Shows: Docker version, Neo4j container status, data file inventory, database stats (product count, interest coverage, etc.).

---

## Data Volumes

| Directory | Contents |
|-----------|----------|
| `neo4j-data/data/` | Neo4j database files |
| `neo4j-data/logs/` | Neo4j server logs |
| `neo4j-data/plugins/` | APOC and other plugins |
| `neo4j-data/import/` | CSV/JSON import staging |

---

## Current Database Size

| Metric | Value |
|--------|-------|
| Products | 133,328 |
| Brands | 4,809 |
| Embeddings | 133,328 (100%) |
| Bestsellers | 41,770 (31%) |

---

## Check Embedding Status

```bash
docker exec present-agent-neo4j cypher-shell -u neo4j -p presentagent2024 \
  "MATCH (p:Product) WHERE p.embedding IS NOT NULL RETURN count(p)"
```

---

## Product Audit TUI

```bash
./pa
```

Terminal UI for browsing and spot-checking products. See `docs/PRODUCT_AUDIT_TUI.md`.

---

*Last updated: 2026-02-24*
