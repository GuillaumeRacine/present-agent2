# Roadmap

Present Agent2 development phases and priorities.

---

## Phase 1: MVP (Core Recommendation Engine)

**Status:** Complete

| Feature | Status |
|---------|--------|
| 10+1 agent orchestration (incl. Bar Raiser) | Done |
| Neo4j graph + vector DB | Done |
| Product catalog (133,328 products, 4,809 brands) | Done |
| Hybrid search (7-factor scoring + text fallback) | Done |
| Interest enrichment (49% — 65,998 products, 223 interests) | Done (partial — new products unenriched) |
| Category enrichment (53 categories, 469K rels) | Done |
| Attribute enrichment (58%, 14 boolean flags) | Done (partial — new products unenriched) |
| Multi-LLM enrichment pipeline | Done |
| Embedding generation (100% — 133,328/133,328) | Done |
| Conversation persistence | Done |
| Web interface (chat + logs + products) | Done |
| Local Docker Neo4j setup | Done |
| Python enrichment pipeline | Done |
| Bar Raiser quality enforcement | Done |
| Bar Raiser deterministic overrides | Done (v3.3.1 — stable scoring) |
| Recommendation quality (Bar Raiser avg 91/100) | Done (target was 80/100) |

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

## Phase 3: Data Quality & Enrichment

**Status:** Core enrichment done for original 91,783 products. 41,545 new products loaded but unenriched.

| Task | Current | Target | Status |
|------|---------|--------|--------|
| Occasion tagging | **69%** (91,774 products, 1.68M rels) | 80%+ | Done for batch 0+1; pending for batch 2+ |
| Relationship tagging | **68%** (90,490 products, 1.52M rels) | 80%+ | Done for batch 0+1; pending for batch 2+ |
| Attribute flags | **58%** (77,294 products, 14 attrs) | 60%+ | Done for batch 0+1; pending for batch 2+ |
| Interest mapping | **49%** (65,998 products, 223 interests, 335K rels) | 80%+ | Needs cleanup + expansion |
| Category mapping | **60%** (79,412 products, 53 categories, 469K rels) | 80%+ | Done for batch 0+1 |
| Explorer overhaul | 7-factor scoring, archetype boost, zero-match penalty | Better relevance | Done (v3.3.1) |
| Bestseller flagging | **31%** (41,770 products) | 10%+ | Done |
| Interest data cleanup | Manual post-enrichment fixes | Clean assignments | Ongoing (see MEMORY.md) |
| Brand diversification | Enforced in search (vendor URL normalization) | No brand > 5% | Done |

**Note:** Coverage dropped from ~100% to 49-69% because 41,545 new products were added via the acquisition pipeline without enrichment. The original 91,783 products remain fully enriched.

---

## Product & Enrichment Gaps (Live Data)

Confirmed via Neo4j queries on 2026-02-26.

```text
Enrichment Coverage (of 133,328 products)

┌──────────────────┬───────────────┬───────────┬──────────────────────────────────────────────────┐
│       Gap        │ Missing Count │ Missing % │                      Impact                      │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No ratings       │ 133,328       │ 100%      │ Zero social proof — no confidence signals        │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No reviews       │ 133,068       │ 99.8%     │ Essentially nothing                              │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No interests     │ 67,330        │ 50.5%     │ Half the catalog invisible to interest search    │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No attributes    │ 56,034        │ 42.0%     │ Can't match archetypes (practical, luxury, etc.) │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No categories    │ 53,916        │ 40.4%     │ Two-fifths of catalog unstructured               │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No relationships │ 42,838        │ 32.1%     │ Can't match to "gift for wife/dad/boss"          │
├──────────────────┼───────────────┼───────────┼──────────────────────────────────────────────────┤
│ No occasions     │ 41,554        │ 31.2%     │ Can't match to birthday/christmas/wedding        │
└──────────────────┴───────────────┴───────────┴──────────────────────────────────────────────────┘

The 41,545 batch 2+ products have embeddings (vector search works) but no graph edges
(interest/category/occasion/relationship search fails).
```

```text
Attribute Flags (14 booleans, on ~58% of products)

┌─────────────────┬────────────┬──────────────┬───────────────┬─────────────────┐
│    Attribute    │ True Count │ % of Catalog │ Market Demand │       Gap       │
├─────────────────┼────────────┼──────────────┼───────────────┼─────────────────┤
│ is_personalized │ 5,935      │ 4.5%         │ 28%           │ -23.5pp (worst) │
├─────────────────┼────────────┼──────────────┼───────────────┼─────────────────┤
│ is_luxury       │ 10,705     │ 8.0%         │ ~15%          │ -7pp            │
├─────────────────┼────────────┼──────────────┼───────────────┼─────────────────┤
│ is_eco_friendly │ 12,276     │ 9.2%         │ ~12%          │ -3pp            │
├─────────────────┼────────────┼──────────────┼───────────────┼─────────────────┤
│ is_handcrafted  │ 12,303     │ 9.2%         │ ~10%          │ OK              │
├─────────────────┼────────────┼──────────────┼───────────────┼─────────────────┤
│ is_experiential │ 14,750     │ 11.1%        │ Growing fast  │ Thin            │
└─────────────────┴────────────┴──────────────┴───────────────┴─────────────────┘

is_personalized at 4.5% vs 28% market demand is the single biggest archetype mismatch.
```

```text
Thin Interests (< 100 products = non-functional)

┌──────────────────┬──────────┬─────────────┐
│     Interest     │ Products │  Viability  │
├──────────────────┼──────────┼─────────────┤
│ drones           │ 3        │ Dead        │
├──────────────────┼──────────┼─────────────┤
│ non-fiction      │ 7        │ Dead        │
├──────────────────┼──────────┼─────────────┤
│ luxury-travel    │ 11       │ Dead        │
├──────────────────┼──────────┼─────────────┤
│ trivia           │ 12       │ Dead        │
├──────────────────┼──────────┼─────────────┤
│ entrepreneurship │ 17       │ Dead        │
├──────────────────┼──────────┼─────────────┤
│ programming      │ 29       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ backpacking      │ 29       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ adventure-travel │ 33       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ skiing           │ 35       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ sci-fi           │ 39       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ kayaking         │ 45       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ singing          │ 49       │ Nearly dead │
├──────────────────┼──────────┼─────────────┤
│ aquarium         │ 53       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ woodworking      │ 55       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ podcasts         │ 58       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ chess            │ 78       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ poetry           │ 87       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ pilates          │ 90       │ Thin        │
├──────────────────┼──────────┼─────────────┤
│ guitar           │ 93       │ Thin        │
└──────────────────┴──────────┴─────────────┘
```

```text
Price Distribution

┌───────────┬──────────┬───────┬───────────────┬───────────────┐
│   Band    │ Products │   %   │ Market Demand │      Gap      │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ Under $25 │ 44,190   │ 33.1% │ 30%           │ +3% (OK)      │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ $25-50    │ 30,448   │ 22.8% │ 25%           │ -2% (slight)  │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ $50-100   │ 23,423   │ 17.6% │ 25%           │ -7.4% (worst) │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ $100-200  │ 15,865   │ 11.9% │ 15%           │ -3%           │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ $200-500  │ 11,114   │ 8.3%  │ 4%            │ +4% (over)    │
├───────────┼──────────┼───────┼───────────────┼───────────────┤
│ $500+     │ 8,288    │ 6.2%  │ 1%            │ +5% (over)    │
└───────────┴──────────┴───────┴───────────────┴───────────────┘

$50-100 is the sweet spot for most gift occasions and is 7.4pp underrepresented.
$200+ is 9pp over market demand.
```

```text
Top Categories (Surprises)

The DB has 7,897 "Experiences" and 5,976 "Subscriptions" — these are category labels
on physical products, not actual experience/subscription products.
```

```text
Completely Missing Product Types

┌────────────────────────┬────────────────┬──────────────────────────────────────────────────────────────┐
│          Type          │  Market Size   │                         Why Critical                         │
├────────────────────────┼────────────────┼──────────────────────────────────────────────────────────────┤
│ Digital gift cards     │ $358.9B        │ 53% of wish lists. "Last-minute gift" = nothing to recommend │
├────────────────────────┼────────────────┼──────────────────────────────────────────────────────────────┤
│ Experience gifts       │ $133.3B        │ Strongest research backing. Zero actual bookable experiences │
├────────────────────────┼────────────────┼──────────────────────────────────────────────────────────────┤
│ Subscription boxes     │ $53.6B         │ 19.5% CAGR. Great for ongoing relationships                  │
├────────────────────────┼────────────────┼──────────────────────────────────────────────────────────────┤
│ Gaming/streaming cards │ Part of $1.24T │ Teen/young adult gap filler                                  │
├────────────────────────┼────────────────┼──────────────────────────────────────────────────────────────┤
│ Online courses         │ Growing        │ MasterClass, Audible, Skillshare — aspirational gifts        │
└────────────────────────┴────────────────┴──────────────────────────────────────────────────────────────┘
```

```text
Priority Stack

Tier 1: Fix What We Have (immediate, no new APIs)
1) Run expand-* scripts on batch 2+ products (41,545 products)
2) Merge duplicate Interest nodes (reduce graph fragmentation)
3) Re-tag thin interests (raise all sub-100 interests)

Tier 2: Add Review Data (needs RAPIDAPI_KEY)
4) RapidAPI Pro → run google_shopping_enrich.py + amazon_enrich.py on bestsellers
5) Run amazon_bestsellers.py to discover new products

Tier 3: Fill Category Gaps (needs new connectors)
6) Gift card API (Runa/Tango)
7) Experience gift curation (Tinggly, ClassBento, Airbnb Experiences)
8) Subscription box API (Cratejoy)
9) Etsy API v3 to raise personalization coverage
```

---

## Phase 4: Product Expansion (Waves 1-4)

**Status:** Wave 0 complete (133,328 products loaded). Waves 1-4 planned — see `docs/PRODUCT_EXPANSION_WAVES.md`

Target: ~125,000+ products across physical, digital, experiential, subscription categories. Already exceeded for physical products.

### Wave 1: Complete B-Corp + New Ethical Brands
- 8-stage acquisition pipeline operational (`scripts/pipeline/`)
- 133,328 products from 4,809 brands now loaded
- Remaining work: enrich batch 2+ products, continue sourcing from Storeleads CSV
- Target: enrichment coverage back to 80%+

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
| Query response time | < 3s | 36-107s (2026-02-25) |
| Agent orchestration | < 5s | ~25s (2026-02-25) |
| Product search | < 1s | TBD |
| Bar Raiser score | ≥80/100 avg | 89/100 (latest run 2026-02-25) |
| Click-through rate | > 40% | Not measured |
| Purchase rate | > 15% | Not measured |

---

## Testing Strategy

| Type | Status | Details |
|------|--------|---------|
| Unit tests | 190/190 passing | Individual agent logic |
| Integration tests | Working | Agent orchestration flow |
| Persona testing | 5-persona quality test (`scripts/test_quality.py`) | Bar Raiser avg 91/100 |
| Deterministic checks | 22-23/26 passing | Budget, giver leakage, URLs |
| Product audit TUI | Working (`./pa`) | Neo4j product browsing + spot-checking |
| User testing | Framework ready | Validation with real users |

---

*Last updated: 2026-02-26*
