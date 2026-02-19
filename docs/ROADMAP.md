# Roadmap

Present Agent2 development phases and priorities.

---

## Phase 1: MVP (Core Recommendation Engine)

**Status:** Complete

| Feature | Status |
|---------|--------|
| 10+1 agent orchestration (incl. Bar Raiser) | Done |
| Neo4j graph + vector DB | Done |
| B-Corp product catalog (64,964 products) | Done |
| Hybrid search (graph 70% + vector 30% + text fallback) | Done |
| Interest enrichment (99.3% coverage) | Done |
| Category enrichment (53 categories, 138K rels) | Done |
| Attribute enrichment (74.6%, 14 boolean flags) | Done |
| Multi-LLM enrichment pipeline | Done |
| Embedding generation (100% coverage, 1536-dim) | Done |
| Conversation persistence | Done |
| Web interface (chat + logs + products) | Done |
| Local Docker Neo4j setup | Done |
| Python enrichment pipeline | Done |
| Bar Raiser quality enforcement | Done |
| Recommendation quality (target: 8.5/10 relevance) | Needs work (last tested at ~4/10) |

---

## Phase 2: Learning Infrastructure

**Status:** Planned (12-step implementation plan ready)

Wire up the existing but dormant learning agents so the system improves from every interaction.

| Feature | Status | Details |
|---------|--------|---------|
| LearningAgent wiring | Planned | Implemented but never called by orchestrator |
| FeedbackCollector wiring | Planned | Implemented but never instantiated in server |
| GiverProfiler persistence | Planned | 2 methods stubbed, no Neo4j save |
| Recommendation tracking | Planned | No `recommendationId` linking recs to feedback |
| Confidence decay | Planned | Stale interest scores persist forever |
| Complementary interest discovery | Planned | Can't learn "coffee + hiking = outdoorsy dad" |
| Per-agent quality trending | Planned | QualityTracker has a TODO |

**Plan:** `plans/precious-launching-seal.md` (12 steps, 4 phases)

---

## Phase 3: Data Quality & Enrichment (Wave 0)

**Status:** Core enrichment done, Explorer overhauled

| Task | Current | Target | Priority |
|------|---------|--------|----------|
| Occasion tagging | **100%** (539K rels) | 80%+ | Done |
| Relationship tagging | **98.7%** (453K rels) | 80%+ | Done |
| Attribute flags | **75.4%** (125K flags, 14 attrs) | 60%+ | Done |
| Interest bridging | **93K+ rels** (category bridge + singular fixes) | Thin pools > 100 | Done |
| Explorer overhaul | Additive scoring, 10x vectorLimit, archetype boost | Better relevance | Done |
| Review data | 1% coverage | 30%+ | High (needs Shopify scraping) |
| Bestseller flagging | **1.7%** (1,113 products, 159 brands) | 10%+ | Improved (was 0.33%; 315 brands scraped) |
| Brand diversification | Marine Layer = 14% | No brand > 5% | Medium (diversity enforced in search) |

---

## Phase 4: Product Expansion (Waves 1-4)

**Status:** Researched, planned — see `docs/PRODUCT_EXPANSION_WAVES.md`

Target: ~125,000 products across physical, digital, experiential, subscription categories.

### Wave 1: Complete B-Corp + New Ethical Brands
- Finish Shopify scraping for remaining 265/315 brands
- Add 52 new B-Corp brands (Tony's Chocolonely, Pela, Bellroy, Peak Design, etc.)
- Add 45 non-B-Corp ethical brands (Uncommon Goods, EarthHero, etc.)
- Target: +15,000 products

### Wave 2: Digital Gifts & Gift Cards
- Gift card aggregator API (Runa/Tango/Reloadly — single API = thousands of brands)
- Digital subscriptions (MasterClass, Audible, Spotify, etc.)
- Target: +5,000 curated digital options

### Wave 3: Artisan & Experience Marketplace
- Etsy API v3 (built-in `recipient` and `occasion` fields)
- Experience affiliate partners (Tinggly, Cloud 9 Living, Virgin Experience Days)
- Cratejoy subscription boxes
- Target: +30,000 products

### Wave 4: Broad Affiliate Coverage
- Datafeedr aggregator (~1B products, filtered to gift-suitable)
- AvantLink (REI, Patagonia, Backcountry feeds)
- Niche category deepening
- Target: +10,000 curated products

**DO NOT integrate:** Amazon PA-API (explicitly prohibits LLM/ML use)

**Full details:** `docs/PRODUCT_EXPANSION_WAVES.md`, `research/` directory

---

## Phase 5: Advanced Features

**Status:** Future

| Feature | Description |
|---------|-------------|
| Social closeness scoring | Weight recommendations by relationship depth |
| Gift history tracking | Remember past gifts to avoid repeats |
| Multi-recipient scenarios | "Gift for the whole family" |
| NewsAPI integration | Trending gift ideas, seasonal insights |
| Trend analysis | Popular gifts by season/occasion |
| Group gifting | Collaborative gift purchases |
| Recurring gifts | Birthday/holiday reminders |
| Gift registries | Wish list integration |
| Partner integrations | Direct purchase links |

---

## Performance Targets

| Metric | Target | Last Measured |
|--------|--------|---------------|
| Query response time | < 3s | 22-34s |
| Agent orchestration | < 5s | ~25s |
| Product search | < 1s | TBD |
| Recommendation relevance | > 8.5/10 | ~4/10 |
| Click-through rate | > 40% | Not measured |
| Purchase rate | > 15% | Not measured |

---

## Testing Strategy

| Type | Status | Details |
|------|--------|---------|
| Unit tests | 190/190 passing | Individual agent logic |
| Integration tests | Working | Agent orchestration flow |
| Persona testing | 15 personas documented | Gift recommendation accuracy |
| User testing | Framework ready | Validation with real users |

---

*Last updated: 2026-02-18*
