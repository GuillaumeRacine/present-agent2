# Product Graph Audit & Ingestion Priorities

This document summarizes the current product graph status and proposes a prioritized backlog for the next ingestion batches to maximize recommendation quality and user experience.

## Executive Summary

- The catalog is large (≈41.7k products) with vendor coverage and prices across bands, but the signal graph is shallow in key dimensions.
- Interests: only 18 interest nodes; coverage is uneven (some interests have 1 product). Synonyms and long‑tail interests are underrepresented.
- Values: only 5 value nodes power alignment; this is too coarse for value‑based matching.
- Attributes: boolean gift attributes exist, but true flags per product are sparse (median ≈3 of 100). Attribute density needs boosting, and experiential/personalized signals are likely underrepresented.
- Categories: not modeled; diversity falls back to a placeholder. Category modeling will unlock better filtering and diversity.

Priorities
- P0: Expand interests (taxonomy + tagging) and values (add nodes + alignment edges).
- P0: Introduce categories and link products to categories.
- P1: Ingest experiential and personalized gift inventory; enrich attribute density (isExperiential, isMemoryMaking, isPersonalized, etc.).
- P1: Balance price bands (focus on 50–200) and diversify vendors beyond art/print‑heavy sources.
- P2: Add local/handcrafted vendors, gift cards/subscriptions; improve vendor quality metadata.

## Current Graph Audit (key metrics)

From scripts/graph-audit.ts (connected to current Neo4j):

- Products: 41,704
- Interests: 18
- Occasions: 25
- Values: 5
- Coverage (edges, distinct products):
  - MATCHES_INTEREST: 41,704 (100%)
  - SUITABLE_FOR: 41,704 (100%)
  - ALIGNS_WITH: 41,704 (100%)
- Interests (top 5 by product count): art (8,580), outdoors (6,034), tech (4,974), fitness (4,526), skincare (3,739)
- Interests (bottom 5): cooking (665), tea (592), fishing (551), hiking (1), yoga (1)
- Price bands: <25 (12,216), 25–50 (8,558), 50–100 (7,135), 100–200 (4,924), 200+ (8,871)
- Attribute density (is_* true counts per product): avg 2.89, p50 3, p90 5 (out of 100)
- Vendors: top vendors ~100 products each; no missing vendor/price fields

Notes
- 100% coverage on edges suggests batch linking for all products; however, node variety is small (18 interests, 5 values) ⇒ limited discriminative power.
- Interest tail: hiking/yoga coverage of 1 each is a data issue (taxonomy or tagging bug). Cooking/tea/fishing are comparatively low.
- Attribute density is low; expected 10–30 per product for nuanced matching (per attribute prompt guidance). This limits archetype/meaning alignment.
- Vendors skew toward art/print sources (many art galleries), likely inflating “art” interest representation.

## Identified Gaps & Hypotheses

1) Interest Taxonomy & Tagging (P0)
- Gap: Only 18 interests; long‑tail common gift interests missing (jewelry, books, toys, board games, pets, stationery, baby/parenting, home decor, kitchen gadgets, DIY/crafts, spa/wellness, cars/auto, cycling, camping, photography/cameras, musical instruments).
- Gap: Severe under‑tagging for hiking/yoga; likely taxonomy or mapping issue.
- Impact: Poor recall on user intent; DialogueManager asks more questions; Explorer leans on vectors instead of crisp graph matches.

2) Values Variety (P0)
- Gap: Only 5 values (eco‑friendly, vegan, handmade, local, minimalist). Missing: quality, sustainable packaging, fair trade, gender‑neutral, family‑friendly, wellness‑oriented, luxury, practical, unique/limited, tech‑savvy, sentimental/romantic.
- Impact: Weak value alignment; limited capability to personalize by giver values.

3) Categories (P0)
- Gap: No `(:Category)` modeling; diversity uses a placeholder.
- Impact: Recommendations may cluster; users can’t filter by category; diversity logic is constrained.

4) Attribute Density & Distribution (P1)
- Gap: Median 3 true attributes per product (out of 100). Signals like `isExperiential`, `isPersonalized`, `isMemoryMaking`, `isShared`, `isGiftCard`, etc., are likely underused.
- Impact: Archetype matching and Presenter “why this” reasoning are weaker; UX explanations less persuasive.

5) Inventory Balance & Vendors (P1)
- Gap: Heavy representation of art/prints; underrepresentation of mainstream “gift” verticals (personalized goods, experiences, subscriptions, consumables/food, gadgets, games).
- Impact: Feels niche for many personas; budget/relationship scenarios under‑served.

6) Occasions (P2)
- Occasions nodes exist (25), but ensure distribution is not overly uniform; add seasonal/more granular occasions (Mother’s Day, Father’s Day, Valentine’s, Housewarming, New Baby, Teacher Gifts, Get Well, Thank You).

## Prioritized Ingestion Backlog

P0 — Must do next
- Expand Interests to ~150–200 terms with synonyms and map existing products:
  - Add hierarchical/alias structure (e.g., outdoors→hiking/camping/cycling; beauty→skincare/makeup; gaming→video games/board games; crafts→knitting/DIY).
  - Re‑tag products: target +1 to +2 additional interests per product where confident.
  - Fix hiking/yoga mapping bug and backfill.
- Add Values to ~25–40 nodes and assign ALIGNS_WITH with calibrated `alignment_score`:
  - Examples: quality, sustainable packaging, fair trade, handcrafted, minimalist, luxury, practical, unique/limited, gender‑neutral, family‑friendly, wellness, experiential, tech‑forward.
- Introduce Categories (40–80) and link products:
  - Examples: Experiences, Personalized, Subscriptions, Food & Drink, Coffee & Tea, Beauty & Skincare, Home & Kitchen, Decor, Books, Games & Puzzles, Toys, Jewelry, Fitness, Outdoor, Tech Gadgets, Music & Instruments, Photography, Auto, Pets, Stationery.

P1 — High impact
- Ingest Experiential Inventory (classes, workshops, tours, tickets, vouchers):
  - Boost `isExperiential`, `isMemoryMaking`, `isShared`, `isActive` signals.
  - Target 1–2k items with balanced price bands (50–200 core).
- Ingest Personalized Goods (engraved jewelry, photo books, monogrammed items):
  - Boost `isPersonalized`, `isSentimental`, `isHeartfelt`.
- Ingest Subscriptions (coffee/tea, snack boxes, hobby kits):
  - Boost `isSubscriptionBased`, `isConsumable`, `isPractical`.
- Mainstream Gift Catalogs (gadgets, games, kits): diversify beyond art prints.

P2 — Medium impact
- Local/Handcrafted Vendors and Marketplaces (artisan goods, Etsy‑like sources):
  - Boost `isHandcrafted`, `isLocal`, `isUnique`.
- Gift Cards & Experiences Aggregators: ensure breadth and ease for last‑minute gifts.
- Seasonal Occasions Expansion: add and link products to seasonal moments (Mother’s Day, Valentine’s, Housewarming, New Baby, Teacher Gifts).

## Quantitative Targets (next 1–2 batches)

- Interests: +100 new interest nodes; average interests per product ≥ 2.5 (where applicable).
- Values: +20 new value nodes; at least 1 value edge for ≥ 70% of products, 2+ for ≥ 40%.
- Categories: link ≥ 80% of products to ≥ 1 category; ≤ 2 categories per product for clarity.
- Attributes: median is_* true from 3 → 10+; p90 ≥ 20.
- Inventory mix: +2k experiential, +2k personalized, +1k subscriptions; mid‑price (50–200) +25% lift.

## Ingestion Spec (fields to collect)

- Required: `id`, `title`, `description`, `url`, `price`, `vendor`, `image`, `availability`
- Classification: `category`, `subcategories`, `tags`
- Signals: extracted/interpreted `interests[]`, `values[]`, `occasions[]`, `attributes (is_*)`
- Optional: `brand`, `rating_count`, `rating_value`, `shipping_speed`, `return_policy`

## Edge Creation Guidance

- MATCHES_INTEREST: 0.6–0.95 relevance; source‑aware (LLM high‑confidence > keywords).
- SUITABLE_FOR: support multiple occasions; seasonal tags welcome.
- ALIGNS_WITH: values from an expanded set; prefer explicit signals in text/specs.
- IN_CATEGORY: one primary category, optional secondary (max 2/category).

## Quality Checks for Each Batch

- Distribution sanity: price bands (avoid over‑skew to 200+), vendor diversity (≤ 2% per vendor ideally), category balance (≥ 10 categories represented per 1k items).
- Signal density: interests per product (avg ≥ 2), values per product (avg ≥ 1), attributes (median ≥ 10 true flags).
- Spot checks: random 50 items across categories for correct interests/values.
- Regression: ensure no drops in Validator pass rate or persona test scores.

## Suggested Sources (non‑exhaustive)

- Experiences: Class platforms, local experience providers, ticket vendors.
- Personalized: Photo book services, engraving/monogram shops, custom print vendors.
- Subscriptions: Coffee/tea/subscription marketplaces, hobby kits.
- Mainstream gadgets/games: Specialty retailers with clean feeds.
- Local/handcrafted: Artisan marketplaces and boutique vendors.

## Rollout & Measurement

- Phase 1 import (P0): interests/values/categories; re‑tag existing products; re‑run attribute inference where text quality is good.
- Phase 2 import (P1): experiential/personalized/subscriptions (focus 50–200 price band).
- Track KPIs: Validator pass rate, diversity score, interest match rate, archetype alignment score, persona success rate, response time.

