# Changelog

## v3.5.0 (2026-02-26) — Gift Cards + Price Range Support
- Added 75 digital gift card products with `min_price`/`max_price` support
- Explorer, Validator, Bar Raiser, Presenter all handle price range overlap
- Frontend shows "$25 - $500" for range products
- Fixed 112 duplicate Interest nodes (70 yoga, 41 skateboarding, 4 coffee) → 113 unique
- Created food/education/sports/shopping interest nodes
- Total: 133,403 products (133,328 + 75 gift cards), 100% embedding coverage

## v3.4.0 (2026-02-25) — Zero-Result Handling + Quality Filters
- **Zero-result handling**: New `no_results` mode in OrchestratorOutput. Returns message + suggestions instead of empty response. Chat TUI + web frontend both handle it.
- **Min confidence 0.50**: Presenter filters products with confidenceScore < 0.50. Empty result triggers no_results path.
- **Age-inappropriate filter**: Explorer regex filter on product titles. Baby/toddler excluded for age >= 13, kids for age >= 18.
- **Storyteller NaN fix**: Guard `stories.length > 0` before dividing in avgStoryLength.
- **Bar Raiser zero-rec cap**: Auto-rejects with score 0 when zero recommendations (skips LLM call).
- Bar Raiser avg 89/100 (target was 80). Deterministic checks 22-23/26 passing.

## v3.3.1 (2026-02-24) — Deterministic Bar Raiser + Explorer Rebalance
- **Bar Raiser deterministic overrides**: Computes interestCoverage, budgetAdherence, relevance, personalization deterministically. Overrides LLM score only when deterministic > LLM. Eliminates GPT-4o hallucination ("no interests specified") impact on scores. Scores now stable within +/-2 points.
- **Explorer rebalance**: interest 35% + vector 25% + quality 15% + price 15% + context 10% + archetype 8%
- **Zero-match penalty**: vector score x0.3 when zero interest matches
- **Zero-interest product filter**: Hard filter removes products with NO interest graph matches when user states interests
- **Graph path boost**: Interest graph products get 1.25x score boost in merge step
- **Presenter two-pass selection**: First prefers graph-matched products (strength >= 0.9), then falls back
- **FITS_PERSONA** in all 3 Cypher paths

## v3.2.1 (2026-02-23) — Explorer Scoring Fixes
- **Budget normalization**: "Up to $X" budgets (min < 25% of max) -> raise effective min to 40% of max
- **Competing interest penalty**: Products matching competing interest (tea) but not stated (coffee) get 50% penalty
- **Interest synonyms**: Removed tea<->coffee from related interests
- **Missing interests**: Added skateboarding, music, extreme sports, outdoor adventure
- **Coffee cleanup**: Removed 35 furniture products from coffee interest

## v3.2.0 (2026-02-22) — Storyteller Giver Leak Fix
- **Storyteller giver profile null-check**: Detect default giver profiles (confidence=0, timing='unknown') and treat as null. Use recipient-focused prompt. Fixed 5/5 "unknown shopper" leakage.
- **Storyteller stripGiverReferences**: Strengthened regex with prefix patterns (unknown/new/first-time shopper) and mid-sentence patterns
- **Answer merger**: Array interests, string->object occasion, recipientAge/Gender handlers
- **Explorer**: Zero-match vector penalty (x0.5)

## Interest Data Cleanup Log (2026-02-24)

Enrichment scripts assign interests too broadly. Manual cleanup needed after each enrichment run:

**Removed:**
- flutecenter.com from ALL interests (sheet music, not music gifts)
- 1,004 baby/toddler products from adult interests
- 66 kids play toys from teen/adult interests
- 31 plushshop plush toys from music/concerts/skateboarding
- 110 clothing (dress/skirt/shoe) from music interest
- 123 beauty products (serum/cleanser/foundation) from tea interest
- 4 metal clay turntable from music/vinyl/watches (pottery tool)
- 13 duplicate puppy yoga variants (kept only Lower Manhattan)

**Added:**
- 1,576 real skateboard products (nhsskatedirect, titus.de)
- 131 music store products (fender, impericon, printyourvinyl, goldendiscs, loopearplugs)
- 137 music keyword products (headphone, vinyl, turntable, etc.)
- 213 real tea store products (englishteastore, looseleafteamarket, davidstea, smithtea)
- 140 reading/book products (illumicrate, levenger, passionplanner, acemetaphor)
