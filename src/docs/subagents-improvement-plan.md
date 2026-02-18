# Present-Agent2: Subagent‑Driven Improvement Plan

This document uses the system’s own subagents, observed behavior, and data inspection to propose concrete, implementable improvements to the product graph, attributes, retrieval/scoring, and UX. It is structured for multi‑agent implementation (Claude Code + coding subagents) with tickets, code touchpoints, Cypher, and validation steps.

## Snapshot (from repo + tooling)

- Products: 41,704
- With attributes: 41,703 (100.0%)
- Interests: 18 (e.g., art, outdoors, tech, fitness, skincare)
- Recipients: 3 (test)
- Conversations: 47 (some with undefined queries)
- DialogueManager and DialoguePresenter tests: 70/70 passing (ask/hybrid/recommend flows work)
- Explorer: hybrid graph+vector, diversity logic; missing category dimension; `matchedArchetype` TODO

## Goals

- Improve recommendation relevance, personalization, and trust via richer graph signals and clearer “why this gift” reasoning.
- Make the “ask” flow smarter by leveraging meaning/attributes to ask fewer, higher‑signal questions.
- Preserve speed; keep first result page under ~3–5s with warmed caches.

## Overview of Subagents and Roles

- Listener: extract context (recipient, occasion, interests, budget).
- Memory: recall patterns, user profile, history.
- Meaning: select archetypes + desired attributes + discovery hints.
- Explorer: retrieve candidates (graph + vector), ensure diversity.
- Validator: apply quality gates (relevance, archetype, personalization, diversity).
- Presenter/Storyteller: explain reasoning and value; highlight attributes.
- DialogueManager/Presenter: steer clarifying questions and tone.

## Improvements by Area

### A. Graph Modeling & Coverage

1) Introduce Categories
- Add `(:Category)` and `(p:Product)-[:IN_CATEGORY]->(:Category)` edges.
- Seed with ~40–80 curated categories (e.g., Home & Kitchen, Experiences, Beauty & Skincare, Tech Gadgets, Books, Games, Outdoor Gear, Coffee & Tea, Jewelry, Art Prints, Fitness, Travel Gear).
- Use categories for diversity and filtering.

2) Expand Interests + Synonyms
- Current interests (~18) are too coarse; expand to ~100–200 including synonyms (gaming↔video games, coffee↔espresso, skincare↔beauty, hiking↔outdoors, photography↔cameras, coding↔programming, decor↔home decor, candles↔aromatherapy, board games↔games, LEGO↔building, knitting↔crafts).
- Auto‑tag 1–3 interests per product from title/description (LLM or rule‑based), add `MATCHES_INTEREST` with `relevance_score` (0.6–0.95) by source confidence.

3) Vendor/Brand Node
- Add `(:Vendor)` and `(p)-[:SOLD_BY]->(v)` with fields like `vendor_quality`, `shipping_speed`, `return_policy_score`, `rating_count` (nullable to start).
- Use for tie‑breaking and trust weighting.

4) Occasions/Values Coverage
- Increase `SUITABLE_FOR` and `ALIGNS_WITH` edges (LLM extraction or regex rules). Calibrate scores by source (explicit tags > inferred > keyword).

### B. Indexing & Retrieval

5) Full‑text Index for Fallback/Text Boost
- Create: `CALL db.index.fulltext.createNodeIndex('product_fulltext',['Product'],['title','description'])`
- In Explorer: when graph interest match is empty, query `db.index.fulltext.queryNodes('product_fulltext', $q)` and blend matches (e.g., text score → interestScore 0.6–0.8) rather than raw `CONTAINS`.

6) Archetype Embedding
- Build a per‑product `archetype_embedding` from boolean gift attributes (e.g., text of active `is_*` flags) and index it (already supported in schema). Improves Explorer’s optional 5% archetype vector.

7) Rebalance Hybrid Weights (post‑coverage)
- After interest coverage improves, modestly raise graph components (interest/value/occasion) in hybrid score and reduce vector a touch to reflect stronger graph.

### C. Attributes & Meaning Bridge

8) Attribute Consistency Rules
- Extend mutually exclusive pairs: (`isMinimalist` vs `isOrnate`), (`isBeginner` vs `isExpert`), (`isPassive` vs `isActive` when not multi‑modal), (`isCompact` vs `isBulky`). Keep price‑based guards.

9) Desired Attributes → Explorer Filters
- Meaning already outputs desired attributes; leverage to add soft filters/boosts in Explorer (e.g., if `isExperiential` is desired, boost products flagged as experiential by +0.05–0.1 in hybrid).

10) Fill `matchReasons.matchedArchetype`
- Populate from Meaning’s primary archetype for each result and surface in Presenter/Storyteller.

### D. Diversity & UX

11) Diversity Using Real Dimensions
- Replace placeholder category with real category constraint (max 2 per category). Keep vendor ≤2, interest ≤4, price range balance.

12) Attribute Badges + “Why” Copy
- Show top 3–5 gift attributes as badges (e.g., Experiential • Shared • Memory‑making) in Presenter/Storyteller output.
- Add a brief “Why this matches” line using archetype + an interest/value match.

13) Smarter Questions
- If Meaning wants experiential but budget missing, prefer “Experiences under $100 or stretch to $150?”
- Use `desiredAttributes`/`valuePreferences` to frame fewer, higher‑signal questions.

### E. Data Quality & Feedback

14) Coverage Dashboards
- Track: % products with ≥3 interests; ≥1 value; ≥1 occasion; attribute count distribution; per‑vendor coverage.

15) Feedback Signals
- Persist per‑product signals (“considered”, “purchased”, “dismissed”) and map to `Recommendation` nodes with strengths; use in social proof and de‑duplication.

## Implementation Plan (Tickets)

Phase 1: Foundations (schema + low‑risk code)
1. Full‑text index and Explorer fallback
   - Code: `src/services/agents/explorer.ts` (add fulltext integration; replace `CONTAINS` fallback)
   - Schema: add index create call in `src/db/schema.ts` (or one‑off migration)
   - AC: For vague queries, recall improves (≥20% more candidates) without relevance drop (Validator pass rate stable)

2. `matchedArchetype` in results
   - Code: `src/services/agents/explorer.ts` (in `mapRecordToCandidate`)
   - Presenter: display archetype label in reasons
   - AC: Each recommendation shows matched archetype aligned with Meaning primary

3. Conversation persister query fix
   - Code: `src/services/conversation-persister.ts` — ensure `userQuery` stored; use `originalQuery || userQuery`
   - AC: Inspect shows recent conversations with the correct query text

Phase 2: Categories, Synonyms, and Diversity
4. Category nodes and relationships
   - Schema: `src/db/schema.ts` add `(:Category)` + `IN_CATEGORY` index and ingest support
   - Ingest: map basic categories from product text/vendor (rule‑based v1)
   - Explorer: replace placeholder category with actual category in `ensureDiversity`
   - AC: Diversity shows multiple categories; vendor and category caps enforced

5. Interest normalization & expansion
   - New util: `src/lib/interest-synonyms.ts` (map + normalization fn)
   - Meaning: expand `discoveryHints.interestPathways` with synonyms
   - Ingest: tag additional interests where high‑confidence text matches
   - AC: Average `matchedInterests` per candidate increases; Validator interest scores improve

Phase 3: Attributes & Archetype Embedding
6. Attribute rule extensions
   - Code: `src/types/gift-attributes.ts` — add more exclusivity + conditional rules
   - Tests: add unit tests in `src/lib/__tests__` for rules
   - AC: No logically inconsistent attribute pairs after validation

7. Product archetype embeddings
   - Ingest: create `archetype_embedding` from active `is_*` flags (text → embedding)
   - Schema: ensure vector idx exists (`product_archetype_embedding` done)
   - Explorer: keep optional cosine in hybrid composition (already present)
   - AC: Small but measurable lift in Validator’s archetype scores

Phase 4: UX polish driven by Meaning/Attributes
8. Attribute badges + why copy
   - Presenter/Storyteller: surface top 3–5 attributes + 1‑line “why” tying archetype and 1–2 matches
   - AC: Persona quick tests report higher perceived personalization/clarity

9. Smart question selection
   - DialogueManager: prefer questions targeting missing high‑impact fields derived from `desiredAttributes`/`valuePreferences`
   - DialoguePresenter: phrasings for budget/experiential sliders
   - AC: Fewer turns to reach recommend (median −1 turn), no quality drop

## Code Touchpoints

- Explorer: `src/services/agents/explorer.ts`
  - Add fulltext stage; set `matchReasons.matchedArchetype`; update `ensureDiversity` once categories exist
  - Rebalance weights after coverage improvements

- Schema: `src/db/schema.ts`, `scripts/setup-schema.ts`
  - Fulltext index creation; Category + relationships; optional Vendor node

- Ingest: `scripts/ingest-data.ts` (and helpers)
  - Add category mapping; interest expansion; vendor linking; archetype embedding generation

- Attributes: `src/types/gift-attributes.ts`
  - Extend exclusivity/conditional rules; keep price guards

- Meaning: `src/services/agents/meaning.ts`
  - Expose `desiredAttributes`/`valuePreferences` in a way Explorer/Dialogue can consume consistently

- Dialogue: `src/services/agents/dialogue-manager.ts` and `dialogue-presenter.ts`
  - Improve question selection and messaging using desired attributes

- Presenter/Storyteller: `src/services/agents/presenter.ts`, `storyteller.ts`
  - Attribute badges + “why” copy

- Persister: `src/services/conversation-persister.ts`
  - Ensure `userQuery` stored correctly; fix undefined in inspect

## Concrete Cypher & Pseudocode

Full‑text index:
```
CALL db.index.fulltext.createNodeIndex(
  'product_fulltext', ['Product'], ['title','description']
)
```

Explorer fulltext fallback (pseudocode):
```
IF matchedInterests is empty THEN
  CALL db.index.fulltext.queryNodes('product_fulltext', $query)
  YIELD node, score
  WITH node AS product, score AS textScore
  SET interestScore = GREATEST(interestScore, normalize(textScore))
  ADD matchedInterests from tokens with 0.6–0.8 strength
END
```

Category diversity (once added):
```
MATCH (p)-[:IN_CATEGORY]->(c:Category)
WITH c.name AS category, count(*)
LIMIT per-category caps in ensureDiversity
```

Archetype embedding generation:
```
const text = activeAttributes(product).join(', ')
product.archetype_embedding = openai.embeddings.create(text)
```

## Validation & Metrics

Automated tests
- Unit tests for Dialogue/Presenter unchanged, add Explorer small tests (reason mapping, fallbacks)
- Validator thresholds remain; log Validator pass rate before/after changes

Persona tests (scripts)
- `npm run test:personas:quick` measure relevance/personalization/UX and response time

Runtime metrics
- Aggregate: avg relevance/personalization, interest match rate, archetype alignment, diversity score, response time
- Coverage: % products with ≥3 interests, ≥1 value, ≥1 occasion; attributes per product; vendor coverage

## Rollout Plan

1) Phase 1 (safe): fulltext + matchedArchetype + persister fix; deploy behind feature flags
2) Phase 2: categories + synonyms + diversity changes; reindex if needed
3) Phase 3: attribute rule extensions + archetype embeddings; batch job with backoff
4) Phase 4: UX tweaks (badges/why; smarter questions); A/B in CLI or small cohort

## Acceptance Criteria (summary)

- Vague queries return clarifying questions with higher success rate; specific queries show archetype‑based reasoning
- Validator pass rate does not regress; diversity shows vendor/category balance
- Inspect shows correct queries in conversations; interests per product grow; more graph signals used in scoring

## Execution Checklist for Coding Subagents

- Create tickets matching Phase 1–4 breakdown
- Generate PRs per ticket (schema, explorer, ingest, attributes, dialogue/presenter)
- Add migration script for indexes and new nodes (Categories, Vendors)
- Run `npm run env:check`, `npm run docs:organize`, `npm run test`, `npm run inspect`, `npm run test:personas:quick`
- Post‑deploy: compare metrics (Validator pass rate, diversity score, persona success rate)

