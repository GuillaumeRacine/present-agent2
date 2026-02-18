# Present Agent2 - AI Gift Recommendation System

> 10-agent architecture for intelligent gift recommendations using Neo4j, OpenAI, and Cohere.
> B-Corp certified products only. Optimizes for both giver and receiver.

**Status:** Active Development | **Version:** 3.0.0 | **Updated:** 2026-02-17

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
| Data | B-Corp Products | 64,964 deduplicated products |

---

## Current Database

- **Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
- **Products:** 64,964 (deduplicated, enriched)
- **Coverage:** Interests 99.3% | Occasions 84.6% | Attributes 74.6%
- **Embeddings:** 1536-dim via OpenAI, generation in progress
- **Search:** Hybrid graph (70%) + vector (30%) + fulltext fallback

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
| **[research/RESEARCH_INDEX.md](research/RESEARCH_INDEX.md)** | 14 academic papers on gift psychology |
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

**Key files:** `src/services/orchestrator.ts` (main workflow), `src/services/agents/explorer.ts` (hybrid search), `src/server.ts` (API)

---

*Project by Guillaume Racine | github.com/GuillaumeRacine (private)*
