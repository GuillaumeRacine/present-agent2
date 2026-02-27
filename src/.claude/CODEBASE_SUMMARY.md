# Codebase Summary - Quick Reference

**Last Updated**: February 27, 2026
**Version**: 3.5.0

---

## Project Structure

```
Present-Agent2/
├── src/
│   ├── services/
│   │   ├── agents/               # 10+1 specialized agents
│   │   │   ├── listener.ts       # Extract context from queries
│   │   │   ├── memory.ts         # Recall history + profiles
│   │   │   ├── relationship.ts   # Analyze relationship dynamics
│   │   │   ├── constraints.ts    # Validate requirements
│   │   │   ├── meaning.ts        # Identify interests
│   │   │   ├── explorer.ts       # Hybrid search (graph+vector+text+archetype)
│   │   │   ├── validator.ts      # Quality check
│   │   │   ├── storyteller.ts    # Generate reasoning (with post-processing)
│   │   │   ├── presenter.ts      # Format response
│   │   │   ├── recipient-learner.ts  # Build recipient profiles
│   │   │   └── bar-raiser.ts     # Quality gate scoring
│   │   ├── conversation/
│   │   │   ├── answer-merger.ts  # Merge clarification answers into context
│   │   │   └── dialogue-presenter.ts  # Generate clarifying questions
│   │   ├── orchestrator.ts       # Agent coordination
│   │   ├── interest-extractor.ts # LLM extraction
│   │   ├── conversation-persister.ts  # History storage
│   │   └── feedback-collector.ts # Learning system
│   ├── lib/
│   │   ├── neo4j.ts              # Database connection
│   │   └── logger.ts             # Winston logging
│   ├── types/
│   │   ├── agents.ts             # Agent interfaces
│   │   └── recipient.ts          # Recipient data types
│   └── server.ts                 # Express API server
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Chat UI
│   │   ├── logs/                 # Conversation logs viewer
│   │   ├── products/             # Product explorer
│   │   └── api/                  # API proxy routes
│   └── ...
├── scripts/
│   ├── product_enrichment/       # Python enrichment pipeline
│   │   ├── shopify_scraper.py    # Shopify bestseller + catalog scraper
│   │   ├── review_parser.py      # Review data parser
│   │   ├── recipient_signals.py  # Recipient signal extraction
│   │   ├── composite_scorer.py   # Quality scoring
│   │   ├── load_neo4j.py         # Load enriched catalog
│   │   ├── load_bestsellers.py   # Load bestseller flags
│   │   ├── load_shopify_tags.py  # Load Shopify tags + product_type
│   │   └── run_pipeline.sh       # Full pipeline runner
│   ├── expand-interests.ts       # Interest nodes + MATCHES_INTEREST (223 interests, 168K rels)
│   ├── expand-categories.ts      # Category nodes + IN_CATEGORY (59 cats, 139K rels)
│   ├── expand-occasions.ts       # GiftOccasion tagging (15 occasions, 551K rels)
│   ├── expand-relationships.ts   # GiftRelationship tagging (18 rels, 462K rels)
│   ├── expand-attributes.ts      # 14 boolean attribute flags (72.3% coverage)
│   ├── add-missing-interests.ts  # Add skateboarding, music, extreme sports, outdoor adventure
│   ├── clean-coffee-interest.ts  # Remove furniture from coffee interest
│   ├── ingest-missing-gift-brands.ts  # Load gift-curated products from iCloud CSV
│   ├── test-personas.ts          # Persona testing framework
│   ├── test_quality.py           # 5-persona end-to-end quality test (Python)
│   └── ingest-products.ts        # Original product ingest
├── docs/                         # Documentation (sub-files)
├── research/                     # Academic research + market analysis
├── data/                         # State files, logs, Shopify data
├── personas/                     # Test personas
├── docker-compose.yml            # Neo4j Docker config
├── start-local.sh                # Full startup script
└── .claude/                      # Claude Code context
```

---

## Core Components

### Agents (`src/services/agents/`)

| Agent | File | Model | Purpose |
|-------|------|-------|---------|
| **Listener** | `listener.ts` | GPT-4 | Extract context from queries |
| **Memory** | `memory.ts` | — | Recall history + profiles |
| **Relationship** | `relationship.ts` | GPT-4 | Analyze relationship dynamics |
| **Constraints** | `constraints.ts` | — | Validate requirements |
| **Meaning** | `meaning.ts` | GPT-4o-mini | Identify interests |
| **Explorer** | `explorer.ts` | — | Hybrid search (graph+vector+text+archetype) |
| **Validator** | `validator.ts` | — | Quality check |
| **Storyteller** | `storyteller.ts` | GPT-4o (temp 0.7) | Generate reasoning + post-processing |
| **Presenter** | `presenter.ts` | — | Format response |
| **Learner** | `recipient-learner.ts` | GPT-4 | Build recipient profiles |
| **Bar Raiser** | `bar-raiser.ts` | GPT-4o-mini | Quality gate scoring (target ≥60/100) |

### Conversation Flow (`src/services/conversation/`)

| Component | File | Purpose |
|-----------|------|---------|
| **DialoguePresenter** | `dialogue-presenter.ts` | Generate clarifying questions (Turn 1) |
| **AnswerMerger** | `answer-merger.ts` | Merge answers into context (Turn 2) |

**AnswerMerger handles:** interests (string or array), occasion (string or object), budget, recipientAge/age, recipientGender/gender. Normalizes all to expected downstream format.

### Key Services

**Orchestrator** (`src/services/orchestrator.ts`)
- Coordinates agent execution through the full pipeline
- Manages context flow between agents
- Handles clarification flow (Turn 1 questions → Turn 2 answers)
- Error handling and recovery
- Performance tracking

**Explorer Agent** (`src/services/agents/explorer.ts`)
- 3 search methods: `searchForInterest()`, `searchByEmbedding()`, `searchFromInterestGraph()`
- Hybrid scoring: vector 35% + interest 25% + quality 15% + price 15% + context 10% + archetype boost 8%
- Zero-match penalty: halves vector score when product matches zero stated interests
- Quality signals: avg_rating ≥ 4.5 → +0.08, is_bestseller → +0.10, gift_proven → +0.15
- Archetype attribute boost: boolean flags × archetype mapping (up to 8%)
- Brand diversity: vendor URL normalization, 10x vectorLimit
- Fulltext fallback with LIMIT 25

**Storyteller Agent** (`src/services/agents/storyteller.ts`)
- GPT-4o at temperature 0.7
- Conditional dual-context instructions (giver + recipient vs recipient-only)
- `stripGiverReferences()` deterministic post-processing removes "As an unknown shopper" etc.
- Only applied when `giverContext` is null

---

## Agent Execution Flow

```
Turn 1 (initial query):
  Listener → Memory → Relationship → Constraints → Meaning
  → DialoguePresenter (if needs clarification) → return questions

Turn 2 (with answers):
  AnswerMerger (merge answers into context)
  → Explorer → Validator → Storyteller → Bar Raiser → Presenter
  → Learner (async)
  → return recommendations
```

---

## Hybrid Search (Explorer Agent)

```
Query interests → Generate embedding from interests
  ↓
3 parallel search paths:
  1. searchForInterest()      — Graph traversal: MATCHES_INTEREST + IN_CATEGORY + GIFT_FOR_OCCASION/RELATIONSHIP
  2. searchByEmbedding()      — Vector similarity on product_embedding index
  3. searchFromInterestGraph() — Interest-first graph walk (no vector)
  ↓
Merge candidates → Deduplicate by product_url
  ↓
Score each candidate:
  vector 35% × (zero-match penalty 0.5 if no interest match)
  + interest 25%
  + quality 15% (avg_rating, review_count, bestseller, gift_proven)
  + price 15% (fit to budget)
  + context 10% (occasion, relationship match)
  + archetype boost up to 8% (boolean flags × persona mapping)
  ↓
Brand diversity enforcement → limit per vendor
  ↓
Return top N candidates
```

---

## Database Schema

### Nodes

| Node | Count | Key Properties |
|------|-------|---------------|
| **Product** | 133,328 | product_url (unique), title, description, price, brand_url, embedding, 14 boolean attrs |
| **Interest** | 110 | name (unique) |
| **Category** | 59 | name (unique) |
| **GiftOccasion** | 15 | name (unique) |
| **GiftRelationship** | 18 | name (unique) |
| **GiftPersona** | 4 | name |

### Product Properties
- **Core**: product_url, title, description, price, brand_url, currency, tags, materials
- **Embeddings**: embedding (1536-dim float array)
- **Quality signals**: gift_suitability_score, popularity_score, gift_proven, is_bestseller, avg_rating, review_count, recommendation_rate
- **Boolean attributes (14)**: is_practical, is_luxury, is_consumable, is_experiential, is_sentimental, is_personalized, is_eco_friendly, is_handcrafted, is_artistic, is_educational, is_wellness, is_shared, is_lasting_value, is_conversation_starter
- **Shopify enrichment**: shopify_tags, shopify_product_type, bestseller_rank
- **Source tracking**: source (e.g. 'gift_skus_csv')

### Relationships

| Type | Count | From → To |
|------|-------|-----------|
| MATCHES_INTEREST | 102,491 | Product → Interest |
| IN_CATEGORY | 139,467 | Product → Category |
| GIFT_FOR_OCCASION | 550,937 | Product → GiftOccasion |
| GIFT_FOR_RELATIONSHIP | 461,997 | Product → GiftRelationship |
| FITS_PERSONA | 139 | Product → GiftPersona |

### Indexes
- **Vector**: `product_embedding` on `embedding` (1536-dim, cosine)
- **Fulltext**: `product_search` on `title`, `description`, `brand_url`
- **Constraint**: `product_url` unique on Product

---

## API Endpoints

### Backend (Express, port 3000)
- `POST /api/recommend` — Main recommendation endpoint
- `POST /api/answer` — Submit clarification answers (Turn 2)
- `GET /api/conversations` — Conversation history
- `GET /api/products` — Product search
- `GET /health` — Health check

### Frontend (Next.js, port 3001)
- `/` — Chat UI
- `/logs` — Conversation logs viewer
- `/products` — Product explorer

---

## Configuration

### Environment Variables (.env.local)
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
COHERE_API_KEY=...
ETSY_API_KEY=...               # Pending activation

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=presentagent2024

BACKEND_PORT=3000
PORT=3001
LOG_LEVEL=info
```

---

## Quality Testing

### End-to-End Test (`scripts/test_quality.py`)
Tests 5 personas through the full recommendation pipeline:
1. **Vague gift** — Tests clarification flow (Turn 1 → Turn 2)
2. **Dad (coffee/outdoors)** — Tests interest precision
3. **Wife (yoga/wellness)** — Tests wellness category
4. **Nephew (skateboarding/music, 16yo)** — Tests teen/niche interests
5. **Boss (tea/reading)** — Tests occasion + relationship context

Each persona scored by Bar Raiser on: product relevance, reasoning quality, diversity, price fit, occasion appropriateness.

**Target:** Average Bar Raiser score ≥60/100
**Current:** ~64/100 (with LLM variance between runs)

---

## Key Files to Know

### Most Important
1. **`src/services/orchestrator.ts`** — Agent coordination (main workflow)
2. **`src/services/agents/explorer.ts`** — Hybrid search with 3 methods + scoring
3. **`src/services/agents/storyteller.ts`** — Reasoning generation + post-processing
4. **`src/services/conversation/answer-merger.ts`** — Clarification answer merging
5. **`src/server.ts`** — API endpoints

### Enrichment Scripts
6. **`scripts/expand-interests.ts`** — Interest graph builder (223 interests, 168K rels)
7. **`scripts/expand-occasions.ts`** — Occasion tagger (15 occasions, 551K rels)
8. **`scripts/expand-relationships.ts`** — Relationship tagger (18 rels, 462K rels)
9. **`scripts/expand-attributes.ts`** — Boolean attribute flagger (14 attrs)
10. **`scripts/ingest-missing-gift-brands.ts`** — iCloud CSV product loader

### Testing
11. **`scripts/test_quality.py`** — 5-persona quality test with Bar Raiser scoring

---

**Last Updated**: February 19, 2026
**Version**: 3.2.0 (Quality fixes + product expansion)
