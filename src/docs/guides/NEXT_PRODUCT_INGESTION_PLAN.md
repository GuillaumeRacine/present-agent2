# Next Product Ingestion Plan

## Objectives

- Increase selection and quality of recommendations by improving graph coverage and filling content gaps.
- Prioritize connections that impact recommendation relevance: Interests and Occasions.
- Balance price bands and demographics to cover common gift scenarios.

## KPIs (Targets)

- Coverage
  - ≥90% of products with ≥1 Interest edge
  - ≥80% of products with ≥1 Occasion edge
- Interests
  - Top 20 interests ≥1,000 products each
  - Close zero-coverage interests (tea, wine, sports, etc.)
- Occasions
  - Each major occasion ≥2,000 products (≈5% of catalog)
- Price balance
  - Each range ≥15% of priced products; add ~1,300 items in $100–200

## Phase 1 — Connect What We Have

- Interests extraction (existing catalog)
  - Command: `tsx scripts/fix-orphaned-products.ts --limit 1000 --live` (iterate; remove `--limit` when stable)
  - Deduplicate: `tsx scripts/normalize-interests.ts --live`
  - Re-run analysis: `npx tsx scripts/analyze-product-stats.ts --export`
- Occasion tagging (new)
  - Command: `npm run tag:occasions -- --limit 1000 --live [--use-llm]`
  - Start without `--use-llm` (fast heuristics), then add for refinement

## Phase 2 — Fill Inventory Gaps

- Interests with 0–2 coverage: add 500–1,000 items each
  - tea, wine, beer, gaming, sports, fitness, music, art, photography, pets,
    travel, outdoor, camping, tech, gadgets, home_decor, fashion, beauty,
    wellness, spa, self_care
- Occasions
  - Add lines mapped explicitly to birthday/holiday/anniversary; seed long tail
- Price bands
  - Curate $100–200 experiential/personalized inventory
- Demographics
  - Seed products for baby/kids/teen/senior and romantic/professional/casual archetypes

## Phase 3 — Attributes & Quality

- Populate gift attributes to support ranking/storytelling
  - `tsx scripts/populate-gift-attributes.ts --limit 2000 --live`
  - Or missing-only: `tsx scripts/populate-missing-attributes.ts`
- Validate via persona tests
  - `npm run test:personas:quick` → then focused personas (tech dad, yoga friend, wine lover)

## Phase 4 — Measure & Iterate

- Run: `npx tsx scripts/analyze-product-stats.ts --export`
- Track:
  - % products with interests/occasions
  - Interest and occasion distributions
  - Price band balance
  - Reduction in duplicates (`data/duplicate-analysis.json`)

## Ops & Safety

- Dry runs first: omit `--live` to preview changes
- Use `--limit` to validate small batches
- Ensure `.env.local` configured; verify: `npm run env:check`
- Schedule jobs off-hours; monitor Neo4j CPU/connection pool

## Subagents Workflow

- Product Manager
  - Define target interests, occasions, and price-band goals (see KPIs)
- Tickets Manager
  - Create issues per interest family and occasion with targets and sources
- Engineering Manager
  - Review ingestion scripts, Cypher upserts, dedupe plan
- Coding Agent
  - Run extraction/tagging, implement refinements (heuristic + LLM)
- Testing Agent
  - Re-run analysis and persona tests; verify KPIs improved
- User Simulation Agent
  - Validate recommendations for representative personas and occasions

