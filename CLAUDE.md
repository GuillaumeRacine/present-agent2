# Present Agent2 - AI Gift Recommendation System

> 10-agent architecture for intelligent gift recommendations using Neo4j, OpenAI, and Cohere.
> Curated giftable products from vetted Shopify brands. Optimizes for both giver and receiver.

**Status:** Active Development | **Version:** 3.4.0 | **Updated:** 2026-02-26

---

## Quick Start

```bash
# 1. Start Neo4j (requires Docker Desktop)
./start-local.sh

# 2. Install dependencies (from src/)
cd src && npm install

# 3. Start backend + frontend
npm run dev
# Backend: http://localhost:3000 | Frontend: http://localhost:3001

# Check status anytime
./start-local.sh --status
```

---

## Architecture

```
User Query → Listener → Memory → Relationship → Constraints → Meaning
                                                                  ↓
              Response ← Presenter ← Storyteller ← Validator ← Explorer
                                                                  ↓ (async)
                                                               Learner
```

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 | Chat UI, logs viewer, product explorer |
| Backend | Express + TypeScript | API server, agent orchestration |
| Database | Neo4j 5 (Docker) | Graph relationships + vector search |
| AI/LLM | OpenAI GPT-4/4o-mini | Reasoning, context extraction, storytelling |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim product + concept embeddings |
| Enrichment | Python pipeline | Shopify scraping, review parsing, scoring |
| Data | Shopify gift brands | 133,328 products (~4,809 brands) |

---

## Current Database

- **Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
- **Products:** 133,328 (4,809 brands) — 91,783 enriched + 41,545 unenriched
- **Embeddings:** 1536-dim via OpenAI, 100% coverage (133,328/133,328)
- **Graph:** 168K interest rels, 234K category rels, 842K occasion rels, 758K relationship rels
- **Coverage:** Interests 49% | Categories 60% | Occasions 69% | Relationships 68% | Attributes 58%
- **Taxonomy:** 223 interests, 53 categories, 15 occasions, 18 relationships
- **Search:** Hybrid graph + vector + fulltext + archetype attribute scoring + zero-match penalty
- **Quality signals:** 41,770 bestsellers (31%), 0 with reviews (API enrichment pipeline ready)
- **API Enrichment:** Google Shopping + Amazon via RapidAPI (`RAPIDAPI_KEY` in `src/.env.local`)
- **Pending:** Run expand-* scripts on 41,545 unenriched products; then review RapidAPI enrichment for ratings/reviews

---

## Documentation Index

| File | Purpose |
|------|---------|
| **[docs/CURRENT_DOCS.md](docs/CURRENT_DOCS.md)** | Authoritative list of active docs (use this before any other docs) |
| **[docs/PRODUCT_INVENTORY_PLAYBOOK.md](docs/PRODUCT_INVENTORY_PLAYBOOK.md)** | Short-term product expansion execution plan |
| **[docs/CANONICAL_PRODUCT_SCHEMA.md](docs/CANONICAL_PRODUCT_SCHEMA.md)** | Canonical connector schema + validation gates |
| **[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)** | Product catalog, enrichment pipeline, data locations |
| **[docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** | Neo4j nodes, relationships, indexes, vector embeddings |
| **[docs/LOCAL_INFRASTRUCTURE.md](docs/LOCAL_INFRASTRUCTURE.md)** | Docker setup, start-local.sh, enrichment pipeline |
| **[docs/AGENT_REGISTRY.md](docs/AGENT_REGISTRY.md)** | 10 runtime agents + 26 Claude Code meta-agents |
| **[docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)** | Backend + frontend API routes |
| **[docs/ROADMAP.md](docs/ROADMAP.md)** | Phase 1-3 features, performance targets |
| **[docs/CONTEXT_INDEX.md](docs/CONTEXT_INDEX.md)** | Cross-reference to all context files in Guillaume's system |
| **[src/docs/API.md](src/docs/API.md)** | Full API reference with request/response schemas |
| **[src/docs/ARCHITECTURE.md](src/docs/ARCHITECTURE.md)** | Detailed system architecture |
| **[docs/PRODUCT_EXPANSION_WAVES.md](docs/PRODUCT_EXPANSION_WAVES.md)** | 4-wave product expansion plan with category taxonomy |
| **[research/RESEARCH_INDEX.md](research/RESEARCH_INDEX.md)** | 14 academic papers on gift psychology |
| **[research/IDEAL_PRODUCT_CATALOG_ANALYSIS.md](research/IDEAL_PRODUCT_CATALOG_ANALYSIS.md)** | Market data, gift psychology, price strategy |
| **[research/B_CORP_SHOPIFY_BRANDS_RESEARCH.md](research/B_CORP_SHOPIFY_BRANDS_RESEARCH.md)** | 150+ ethical brands mapped by category |
| **[research/EXPERIENCE_GIFT_DATA_SOURCES.md](research/EXPERIENCE_GIFT_DATA_SOURCES.md)** | 50+ experience/subscription/digital gift platforms |
| **[src/.claude/PROJECT_STATUS.md](src/.claude/PROJECT_STATUS.md)** | Detailed version history, enrichment stats |
| **[src/.claude/CODEBASE_SUMMARY.md](src/.claude/CODEBASE_SUMMARY.md)** | Code patterns, agent flow, key files |
| **[src/.claude/RECOMMENDATION_AGENT_WORKFLOW.md](src/.claude/RECOMMENDATION_AGENT_WORKFLOW.md)** | Deep-dive into multi-agent philosophy |
| **[data/quality_tests/latest.md](data/quality_tests/latest.md)** | Latest quality test report (human/LLM-readable) |
| **[data/quality_tests/latest.json](data/quality_tests/latest.json)** | Latest quality test data (structured, for analysis) |

---

## Quality Test Trail

All quality test runs are saved to `data/quality_tests/` with timestamped files:

```
data/quality_tests/
├── latest.md                        # Symlink to most recent report
├── latest.json                      # Symlink to most recent data
├── run_YYYYMMDD_HHMMSS.md          # Human/LLM-readable report per run
├── run_YYYYMMDD_HHMMSS.json        # Structured data per run (scores, recs, timings)
└── run_YYYYMMDD_HHMMSS_raw/        # Full API responses per persona/turn
    ├── vague-gift_turn1.json
    ├── vague-gift_turn2.json
    ├── dad-coffee_turn1.json
    └── ...
```

**For agents:** Read `data/quality_tests/latest.md` to understand current recommendation quality. Compare across runs to track progress. Each report includes:
- Per-persona Bar Raiser scores with dimension breakdowns
- Full product recommendations with reasoning text
- Automated evaluation checks (budget respect, keyword avoidance, giver leakage)
- Agent timing breakdowns per turn
- Clarification questions asked and answered

**Run tests:** `python3 scripts/test_quality.py` (requires backend on port 3000)
**Run one persona:** `python3 scripts/test_quality.py --persona dad`
**List personas:** `python3 scripts/test_quality.py --list`

**Quality status (v3.4.0):**
- Bar Raiser avg 89/100 (latest run 2026-02-25, target was 80)
- Deterministic checks: 22-23/26 passing (budget, giver leakage, URLs strong)
- **Zero-result handling**: Returns `no_results` mode with helpful suggestions instead of empty response
- **Min confidence 0.50**: Filters out low-confidence garbage products from recommendations
- **Age-inappropriate filter**: Excludes baby/toddler/kids products when recipient is older
- Storyteller NaN fix (division by zero on empty stories)
- Bar Raiser auto-rejects with score 0 when zero recommendations
- Quality needs retest after product expansion to 133K

---

## Environment Variables

Required in `src/.env.local`:

```bash
NEO4J_URL=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=presentagent2024
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...          # Fallback LLM
GEMINI_API_KEY=...             # Fallback LLM
COHERE_API_KEY=...             # Re-ranking (optional)
RAPIDAPI_KEY=...               # Google Shopping + Amazon enrichment (RapidAPI)
ETSY_API_KEY=...               # Product expansion (pending activation)
BACKEND_PORT=3000
PORT=3001
LOG_LEVEL=info
```

Notes:
- The code accepts `NEO4J_USERNAME` or `NEO4J_USER` (legacy).
- Some scripts also accept `NEO4J_URI` as a legacy alias for `NEO4J_URL`.

---

## Key Principles

1. **Multi-perspective optimization** - Optimize for recipient satisfaction, giver self-expression, and relationship appropriateness
2. **Hybrid search** - Graph for precise relationships + vectors for semantic similarity
3. **Curated sourcing** - LLM-vetted Shopify brands filtered for gift relevance from Storeleads data
4. **Explainability** - Every recommendation includes reasoning (why this gift, what it signals)
5. **Giver-receiver balance** - Don't optimize only for recipient; consider giver's self-expression
6. **Context sensitivity** - Occasion, relationship stage, cultural norms, budget constraints

---

## For LLM Agents

**Reading order:**
1. `docs/CURRENT_DOCS.md` (active docs only)
2. This file (project overview + doc index)
3. `docs/AGENT_REGISTRY.md` (understand the agents)
4. `src/.claude/CODEBASE_SUMMARY.md` (code patterns)
5. `docs/DATABASE_SCHEMA.md` (data model)
6. `docs/CONTEXT_INDEX.md` (Guillaume's full context system)

**Key files:** `src/src/services/orchestrator.ts` (main workflow), `src/src/services/agents/explorer.ts` (hybrid search), `src/src/services/agents/storyteller.ts` (reasoning), `src/src/services/conversation/answer-merger.ts` (clarification flow), `src/src/server.ts` (API)

---

*Project by Guillaume Racine | github.com/GuillaumeRacine (private)*
