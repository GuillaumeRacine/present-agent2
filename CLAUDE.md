# Present Agent2 - AI Gift Recommendation System

> 10-agent architecture for intelligent gift recommendations using Neo4j, OpenAI, and Cohere.
> Curated giftable products from vetted Shopify brands. Optimizes for both giver and receiver.

**Status:** Active Development | **Version:** 3.5.0 | **Updated:** 2026-02-27

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
| Data | Shopify gift brands | 133,403 products (~4,809 brands) |

---

## Current Database

- **Instance:** Local Docker Neo4j 5-community (`bolt://localhost:7687`)
- **Products:** 133,403 (4,809+ brands) — 91,783 enriched + 41,545 unenriched + 75 gift cards
- **Embeddings:** 1536-dim via OpenAI, 100% coverage (133,403/133,403)
- **Graph:** 335K+ interest, 469K+ category, 1.68M+ occasion, 1.52M+ relationship rels
- **Coverage:** Interests 49% | Categories 60% | Occasions 69% | Relationships 68% | Attributes 58%
- **Taxonomy:** 223 interests, 53 categories, 15 occasions, 18 relationships
- **Search:** Hybrid graph + vector + fulltext + archetype attribute scoring + zero-match penalty
- **Quality signals:** 41,770 bestsellers (31%), 0 with reviews (API enrichment pipeline ready)
- **Pending:** Quality retest with gift cards; RapidAPI enrichment for reviews; enrich batch 2+

---

## Documentation

See **[docs/CURRENT_DOCS.md](docs/CURRENT_DOCS.md)** for the complete active doc index.

---

## Quality

- **Bar Raiser avg:** 91/100 (target 80) — needs retest with gift cards
- **Deterministic checks:** 22-23/26 passing
- **Run tests:** `python3 scripts/test_quality.py` (requires backend on port 3000)
- **Latest report:** `data/quality_tests/latest.md`
- **Change history:** `docs/CHANGELOG.md`

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

**Always auto-loaded:** CLAUDE.md + memory/MEMORY.md (~230 lines combined)

**Load by task:**

| Task | Additional Files |
|------|-----------------|
| Code fix / feature | `src/.claude/CODEBASE_SUMMARY.md` |
| Agent behavior | + `docs/AGENT_REGISTRY.md` |
| Database / Cypher | + `docs/DATABASE_SCHEMA.md` |
| Product pipeline | + `docs/PRODUCT_ACQUISITION_PIPELINE.md` |
| API changes | + `src/docs/API.md` |
| Architecture | + `src/docs/ARCHITECTURE.md` |
| Quality testing | + `data/quality_tests/latest.md` |
| Known issues | + `docs/KNOWN_ISSUES.md` |

**Key files:** `src/src/services/orchestrator.ts` (main workflow), `src/src/services/agents/explorer.ts` (hybrid search), `src/src/services/agents/storyteller.ts` (reasoning), `src/src/server.ts` (API)

---

*Project by Guillaume Racine | github.com/GuillaumeRacine (private)*
