# Project Status for Claude Code

**Last Updated**: February 25, 2026
**Version**: 3.4.0 - Quality Edge Cases + Zero-Result Handling

---

## Current State: Active Development - Product Expansion + Enrichment

```
+===========================================================+
|              PRESENT-AGENT2 STATUS                        |
+===========================================================+
|  Version:       3.4.0 - Quality Edge Cases + Zero-Result  |
|  Products (DB): 133,328 (4,809 brands)                     |
|  Embeddings:    100% (133,328/133,328)                     |
|  Interest Coverage:  49% (65,998 products, 223 interests)  |
|  Category Coverage:  60% (79,412 products, 53 categories)  |
|  Occasion Coverage:  69% (91,774 products, 15 occasions)   |
|  Relationship Coverage: 68% (90,490 products, 18 rels)     |
|  Attribute Coverage: 58% (77,294 products, 14 flags)       |
|  Bestsellers:   31% (41,770 products)                      |
|  Neo4j Instance: Local Docker (bolt://localhost:7687)      |
|  Bar Raiser Avg: 91/100 (deterministic overrides, pre-exp) |
+===========================================================+
```

**Note:** Coverage percentages dropped from near-100% to 49-69% because 41,545 new products were added without enrichment. The original 91,783 products remain fully enriched.

---

## Recent: Quality Edge Case Fixes v3.4.0 (February 25, 2026)

Extensive quality testing (20 edge cases) revealed 71% failure rate on non-standard queries. Three root causes fixed:

### Fix 1: Zero-Result Response Handling
- **Files:** `orchestrator.ts`, `types/agents.ts`, `chat_tui.py`, `page.tsx`
- New `no_results` mode in OrchestratorOutput discriminated union
- Returns helpful message + actionable suggestions instead of empty response
- Chat TUI and web frontend both render no-results gracefully

### Fix 2: Minimum Confidence Threshold (0.50)
- **File:** `presenter.ts`
- Products with confidenceScore < 0.50 filtered out in both `selectTopCandidates` and `selectFallbackCandidates`
- If all candidates below threshold, returns empty → triggers no_results path

### Fix 3: Age-Inappropriate Product Filtering
- **File:** `explorer.ts`
- Title regex filter: baby/toddler patterns excluded for age ≥ 13, kids patterns for age ≥ 18
- Handles numeric, decade ("30s"), and named ("teen", "elderly") age formats

### Bug Fixes
- Storyteller NaN division-by-zero when no stories generated
- Bar Raiser auto-rejects with score 0 when zero recommendations (skip LLM call)

---

## Previous: Quality Fixes (February 19, 2026)

End-to-end quality testing with 5 personas revealed 7 critical issues (avg Bar Raiser score 52/100). Six fixes were implemented:

### Fix 1: Storyteller "unknown shopper" prompt
- **File:** `src/services/agents/storyteller.ts`
- Replaced giver-referencing prompt with recipient-focused instruction
- Made all dual-context instructions conditional on `giverContext` existence
- Added `stripGiverReferences()` deterministic post-processing with regex patterns
- **Result:** Eliminates "As an unknown shopper" in reasoning text

### Fix 2: Answer merger — diverse answer formats
- **File:** `src/services/conversation/answer-merger.ts`
- Fixed `interests` handler to accept arrays (was crashing on `["cooking", "travel"]`)
- Fixed `occasion` handler to normalize string→object format with `urgency: 'planned'`
- Added `recipientAge`, `recipientGender`, `age`, `gender` handlers
- Updated `CONFIDENCE_BOOST_VALUES`, `calculateConfidenceBoost`, `buildNaturalQuery`
- **Result:** Turn 2 clarification no longer returns 500 error

### Fix 3: Missing Interest nodes for underserved niches
- **Script:** `src/scripts/add-missing-interests.ts`
- Added Interest nodes: skateboarding (119 products), music (+39), extreme sports (1,355), outdoor adventure (5,270)
- **Result:** Skateboarding/music queries now return relevant products

### Fix 4: Zero-match vector penalty
- **File:** `src/services/agents/explorer.ts`
- Halves vector score contribution when product matches zero stated interests
- Applied to both `searchForInterest()` and `searchByEmbedding()` Cypher queries
- **Result:** Reduces irrelevant high-vector-similarity products (tea for coffee queries)

### Fix 5: Coffee interest cleanup
- **Script:** `src/scripts/clean-coffee-interest.ts`
- Removed 35 furniture products (coffee tables, desks, etc.) from coffee Interest
- **Result:** Coffee interest no longer returns furniture

### Fix 6: Test harness format fix
- **File:** `scripts/test_quality.py`
- Updated occasion format from string to `{"name": "birthday"}` object
- Kept `interests` as array (Fix 2 now handles it)

### Quality Test Results (Post-Fix)
| Persona | Before | After | Notes |
|---------|--------|-------|-------|
| Vague gift | 500 error | 83/100 | Turn 2 works, diverse results |
| Dad (coffee/outdoor) | 42/100 | 42-48/100 | Improved but needs more coffee products |
| Wife (yoga/wellness) | 72/100 | 65-72/100 | Good, LLM variance |
| Nephew (skateboarding) | 42/100 | 55-65/100 | Music t-shirts vs meditation |
| Boss (tea/reading) | 62/100 | 72-82/100 | Strong tea results |
| **Average** | **52/100** | **~64/100** | Target ≥60 met |

---

## Recent: Product Expansion (February 19, 2026)

### iCloud CSV Ingest
- **Source:** `~/Library/Mobile Documents/.../BCorp/all_gifts_skus.csv` (15,308 records)
- **Script:** `src/scripts/ingest-missing-gift-brands.ts`
- **Result:** 3,110 new products from 20 brands loaded into Neo4j
- Brands include: goodeeworld.com, bomajewelry.com, noondaycollection.com, fable.com, olympiacoffee.com, metriccoffee.com, etc.
- 2,775 embeddings generated (~13 min)
- Graph links created: 2,812 interest + 681 category + 11,100 occasion + 8,325 relationship

### Shopify Enrichment (Prior)
- All 315 original brands scraped for bestsellers (1,113 matched) and full catalog (37K products, 11K tags matched)
- Shopify tags loaded for 11,062 products
- Shopify product_type loaded for 11,062 products

---

## What's Working

### Core System
- 10+1 agent recommendation engine (includes Bar Raiser quality gate)
- Neo4j graph database (67,739 products, 367 brands)
- Hybrid search (graph + vector + text fallback + archetype attribute boost)
- Zero-match vector penalty for irrelevant results
- Conversation persistence with clarification flow
- Web interface (chat + logs + products)
- Deterministic post-processing to strip giver-referencing language

### Data Quality (February 19, 2026)
- **Products**: 67,739 total (367 brands)
- **Embeddings**: 100% coverage (1536-dim OpenAI text-embedding-3-small)
- **Interests**: 66.3% coverage (44,911 products)
  - 110 Interest nodes (including skateboarding, music, extreme sports, outdoor adventure)
  - 102,491 MATCHES_INTEREST relationships
- **Categories**: 78.3% coverage (53,006 products)
  - 59 Category nodes
  - 139,467 IN_CATEGORY relationships
- **Occasions**: 100% coverage (67,729 products)
  - 15 GiftOccasion nodes
  - 550,937 GIFT_FOR_OCCASION relationships
- **Relationships**: 98.8% coverage (66,920 products)
  - 18 GiftRelationship nodes
  - 461,997 GIFT_FOR_RELATIONSHIP relationships
- **Attributes**: 72.3% coverage (48,973 products)
  - 14 boolean gift attribute flags
- **Quality signals**: 1,113 bestsellers, 665 with reviews, 11,062 with Shopify tags
- **Personas**: 4 GiftPersona nodes, 139 FITS_PERSONA relationships

---

## System Architecture

### Multi-Agent Workflow
1. **Listener** — Extracts context from conversation
2. **Memory** — Recalls past preferences and purchases
3. **Relationship** — Understands social dynamics
4. **Constraints** — Validates requirements (budget, shipping, availability)
5. **Meaning** — Identifies emotional/symbolic significance
6. **Explorer** — Searches product catalog with hybrid approach
7. **Validator** — Ensures recommendations meet all criteria
8. **Storyteller** — Generates personal, contextual reasoning (with post-processing)
9. **Presenter** — Formats recommendations for user
10. **Learner** — Captures feedback for improvement
11. **Bar Raiser** — Quality gate scoring (target ≥60/100)

### Search Capabilities
- **Graph Search**: Interest/Category/Occasion/Relationship traversal
- **Vector Search**: Embedding-based similarity (1536-dim, cosine)
- **Text Fallback**: Full-text search on title/description/brand
- **Hybrid Fusion**: vector 35% + interest 25% + quality 15% + price 15% + context 10% + archetype boost 8%
- **Zero-match penalty**: Vector score halved when product matches zero stated interests
- **Archetype boost**: Boolean attribute flags matched to persona archetype (up to 8%)
- **Brand diversity**: Vendor URL normalization prevents brand dominance

### Clarification Flow
- **DialoguePresenter** → asks clarifying questions (Turn 1)
- **AnswerMerger** → merges answers into context (Turn 2)
  - Handles: interests (array), occasion (string/object), recipientAge, recipientGender
- **Orchestrator** → runs full pipeline with enriched context

---

## Neo4j Database

**Instance**: Local Docker (`bolt://localhost:7687`)
**Container**: `present-agent-neo4j`
**Size**: 67,739 products (367 brands)

### Schema Summary
- **Product**: Core node with 14 boolean attribute flags, embeddings, quality signals
- **Interest**: 110 nodes (canonical interests)
- **Category**: 59 nodes
- **GiftOccasion**: 15 nodes
- **GiftRelationship**: 18 nodes
- **GiftPersona**: 4 nodes

### Graph Relationships
| Type | Count | Coverage |
|------|-------|----------|
| MATCHES_INTEREST | 102,491 | 66.3% |
| IN_CATEGORY | 139,467 | 78.3% |
| GIFT_FOR_OCCASION | 550,937 | 100% |
| GIFT_FOR_RELATIONSHIP | 461,997 | 98.8% |
| FITS_PERSONA | 139 | <1% |

### Indexes
- **Vector**: `product_embedding` on `embedding` field (1536-dim, cosine)
- **Fulltext**: `product_search` on `title`, `description`, `brand_url`
- **Property**: `product_url` (unique constraint)

---

## Available Scripts

### Enrichment
```bash
# Graph enrichment (from src/)
npx tsx scripts/expand-interests.ts --live    # Interest nodes + MATCHES_INTEREST
npx tsx scripts/expand-categories.ts --live   # Category nodes + IN_CATEGORY
npx tsx scripts/expand-occasions.ts --live    # GiftOccasion tagging
npx tsx scripts/expand-relationships.ts --live # GiftRelationship tagging
npx tsx scripts/expand-attributes.ts --live   # 14 boolean attribute flags

# Product ingest
npx tsx scripts/ingest-missing-gift-brands.ts          # Dry run
npx tsx scripts/ingest-missing-gift-brands.ts --live    # Load products
npx tsx scripts/ingest-missing-gift-brands.ts --live --embed  # Load + embeddings + graph links

# Taxonomy cleanup
npx tsx scripts/add-missing-interests.ts     # Add skateboarding, music, extreme sports, outdoor adventure
npx tsx scripts/clean-coffee-interest.ts     # Remove furniture from coffee interest
```

### Python Pipeline (from project root)
```bash
python3 scripts/product_enrichment/shopify_scraper.py --from-neo4j --bestsellers-only  # Scrape bestsellers
python3 scripts/product_enrichment/shopify_scraper.py --from-neo4j                      # Full catalog scrape
python3 scripts/product_enrichment/load_bestsellers.py   # Load bestseller flags
python3 scripts/product_enrichment/load_shopify_tags.py  # Load Shopify tags + product_type
python3 scripts/product_enrichment/load_neo4j.py         # Load enriched catalog
```

### Testing
```bash
# Quality test (from project root)
python3 scripts/test_quality.py              # Run 5-persona quality test

# Unit tests (from src/)
npm test
```

### Development
```bash
# Start backend + frontend (from src/)
npm run dev
# Backend: http://localhost:3000 | Frontend: http://localhost:3001

# Start Neo4j
./start-local.sh
./start-local.sh --status
```

---

## Next Steps

### Immediate Priorities
1. **Run enrichment on new products** — The 2,775 new products from iCloud CSV need full enrichment:
   - `expand-occasions.ts --live` (currently have basic 4-occasion links from ingest, need full 15-occasion coverage)
   - `expand-relationships.ts --live` (currently have basic 3-relationship links, need full 18-relationship coverage)
   - `expand-attributes.ts --live` (new products have no boolean attribute flags)
   - `expand-interests.ts --live` (improve interest coverage from 66.3%)
2. **Re-run quality test** — Verify Bar Raiser avg ≥60 after enrichment
3. **Etsy API integration** — API key registered (app: "present-agent"), pending activation. Rate: 5 QPS / 5K QPD. Fills teen/skateboarding/music/tech gaps.

### Product Catalog Gaps
- **Teen/youth**: Skateboarding (119 products), music (limited), gaming (none)
- **Coffee**: Improved with olympiacoffee + metriccoffee, but still tea-heavy
- **Tech**: Very limited B-Corp tech products
- **Experiences**: No experience/subscription gifts yet (research in `research/EXPERIENCE_GIFT_DATA_SOURCES.md`)

### Future Enhancements
1. **Wave 1 product expansion** — Etsy API for handmade/unique gifts (plan in `docs/PRODUCT_EXPANSION_WAVES.md`)
2. **Interest coverage** — Currently 66.3%, target 90%+ (run expand-interests on full catalog)
3. **Response time optimization** — Currently 38-87s per recommendation (parallelize LLM calls, use faster models for some agents)
4. **More review data** — Only 665 products (1%) have reviews. Scrape more review sources.
5. **FITS_PERSONA expansion** — Only 139 relationships. Need more persona tagging.

---

## Important Notes for LLMs and Subagents

### Quality Fixes (v3.2.0)
- **Storyteller** has deterministic post-processing that strips giver-referencing phrases. Do not add "As an unknown shopper" or similar language.
- **Answer merger** now handles array interests, string/object occasions, and age/gender fields. Test with both formats.
- **Explorer** has zero-match vector penalty. Products matching zero stated interests get halved vector score.
- **Bar Raiser** target is ≥60/100. Current average ~64/100 (LLM variance means individual runs may differ).

### Pre-existing TypeScript Issues
- 287 total TS errors, all pre-existing (scripts/, tests, dialogue-presenter, answer-merger)
- `skipQuestions` not in OrchestratorInput type but used in server.ts
- Mock agent modules not created (`./agents/__mocks__/*`)
- Do NOT attempt to fix these unless specifically asked

### Environment Variables Required
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=presentagent2024
OPENAI_API_KEY=[in .env.local]
ANTHROPIC_API_KEY=[in .env.local]
GEMINI_API_KEY=[in .env.local]
ETSY_API_KEY=[pending activation]
```

### Key Data Sources
- **iCloud BCorp folder**: `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`
  - `all_gifts_skus.csv` — 15,308 gift-curated product records (43 brands)
  - `master.csv` — Full B-Corp product catalog
- **Missing brands list**: `/tmp/missing_brands.txt` — 154 brands with ~5K products not yet in Neo4j
- **Shopify data**: `data/shopify_*.json` — Scraped bestsellers and full catalog data

---

## Version History
- v3.2.0 (Feb 19, 2026): Quality fixes (storyteller, answer-merger, explorer), product expansion (+2,775 products from 20 brands), missing interests, coffee cleanup
- v3.1.0 (Feb 18, 2026): Explorer overhaul (additive scoring, archetype boost, quality signals, brand diversity), Wave 0 enrichment complete
- v3.0.0 (Feb 17, 2026): Local Docker Neo4j, Python enrichment pipeline, doc restructure
- v2.5.0 (Dec 8, 2025): Multi-LLM attribute enrichment complete
- v2.4.0 (Dec 6, 2025): Enrichment automation implemented
- v2.3.0 (Dec 5, 2025): Documentation overhaul
- v2.2.0 (Dec 4, 2025): Agent optimizations
- v2.1.0 (Dec 3, 2025): Neo4j migration complete
