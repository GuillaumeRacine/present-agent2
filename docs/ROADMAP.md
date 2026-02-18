# Roadmap

Present Agent2 development phases and priorities.

---

## Phase 1: MVP (Core Recommendation Engine)

**Status:** Mostly complete

| Feature | Status |
|---------|--------|
| 10-agent orchestration | Done |
| Neo4j graph + vector DB | Done |
| B-Corp product catalog (64,964 products) | Done |
| Hybrid search (graph 70% + vector 30% + text fallback) | Done |
| Interest enrichment (99.3% coverage) | Done |
| Occasion tagging (84.6% coverage) | Done |
| Attribute enrichment (74.6%, 14 boolean flags) | Done |
| Multi-LLM enrichment pipeline | Done |
| Conversation persistence | Done |
| Web interface (chat + logs + products) | Done |
| Local Docker Neo4j setup | Done |
| Python enrichment pipeline | Done |
| Embedding generation | In progress |
| Recommendation quality (target: 8.5/10 relevance) | Needs work (last tested at ~4/10) |

---

## Phase 2: Quality & Data Expansion

**Status:** Next up

### Immediate Priorities

1. **Complete Shopify scraping** - 50/315 brands done, 166 with bestseller collections
2. **Integrate new attributes into recommendation scoring** - Attributes exist but not fully used
3. **Improve candidate recall** - Explorer returns 1-4 candidates, target 10-20
4. **User testing** - Validate recommendations with real users
5. **Performance optimization** - Response times 22-34s, target < 5s

### Data Improvements

- Enrich remaining 25.4% of products without attributes
- Add Shopify reviews and bestseller data to scoring
- Improve embedding quality with enriched descriptions

### Agent Improvements

- Better budget-aware selection in Explorer
- Fix Neo4j syntax errors in edge cases
- Strengthen Validator filtering logic
- Improve Storyteller reasoning quality

---

## Phase 3: Advanced Features

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

*Last updated: 2026-02-17*
