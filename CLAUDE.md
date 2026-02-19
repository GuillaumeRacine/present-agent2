# Present Agent2 - AI Gift Recommendation System

> 10-agent architecture for intelligent gift recommendations using Neo4j, OpenAI, and Cohere.
> B-Corp certified products only. Optimizes for both giver and receiver.

**Status:** Active Development | **Version:** 3.2.0 | **Updated:** 2026-02-19

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
| Frontend | Next.js 14/15 | Chat UI, logs viewer, product explorer |
| Backend | Express + TypeScript | API server, agent orchestration |
| Database | Neo4j 5 (Docker) | Graph relationships + vector search |
| AI/LLM | OpenAI GPT-4/4o-mini | Reasoning, context extraction, storytelling |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim product + concept embeddings |
| Enrichment | Python pipeline | Shopify scraping, review parsing, scoring |
| Data | B-Corp Products | 67,739 products (367 brands) |

---

## Current Database

- **Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
- **Products:** 67,739 (367 brands, deduplicated, enriched)
- **Coverage:** Interests 66.3% | Categories 78.3% | Occasions 100% | Relationships 98.8% | Attributes 72.3%
- **Embeddings:** 1536-dim via OpenAI, 100% coverage (67,739 products)
- **Graph:** 102K interest rels, 139K category rels, 551K occasion rels, 462K relationship rels
- **Search:** Hybrid graph + vector + fulltext + archetype attribute scoring + zero-match penalty
- **Quality signals:** 1,113 bestsellers, 665 with reviews, 11,062 with Shopify tags

---

## Documentation Index

| File | Purpose |
|------|---------|
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

---

## Environment Variables

Required in `src/.env.local`:

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=presentagent2024
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...          # Fallback LLM
GEMINI_API_KEY=...             # Fallback LLM
COHERE_API_KEY=...             # Re-ranking (optional)
ETSY_API_KEY=...               # Product expansion (pending activation)
BACKEND_PORT=3000
PORT=3001
LOG_LEVEL=info
```

---

## Key Principles

1. **Multi-perspective optimization** - Optimize for recipient satisfaction, giver self-expression, and relationship appropriateness
2. **Hybrid search** - Graph for precise relationships + vectors for semantic similarity
3. **Ethical sourcing** - B-Corp certified products only, sustainability filters
4. **Explainability** - Every recommendation includes reasoning (why this gift, what it signals)
5. **Giver-receiver balance** - Don't optimize only for recipient; consider giver's self-expression
6. **Context sensitivity** - Occasion, relationship stage, cultural norms, budget constraints

---

## For LLM Agents

**Reading order:**
1. This file (project overview + doc index)
2. `docs/AGENT_REGISTRY.md` (understand the agents)
3. `src/.claude/CODEBASE_SUMMARY.md` (code patterns)
4. `docs/DATABASE_SCHEMA.md` (data model)
5. `docs/CONTEXT_INDEX.md` (Guillaume's full context system)

**Key files:** `src/services/orchestrator.ts` (main workflow), `src/services/agents/explorer.ts` (hybrid search), `src/services/agents/storyteller.ts` (reasoning), `src/services/conversation/answer-merger.ts` (clarification flow), `src/server.ts` (API)

---

*Project by Guillaume Racine | github.com/GuillaumeRacine (private)*
