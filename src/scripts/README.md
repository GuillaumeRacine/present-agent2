# Scripts Reference

All scripts run from `src/` directory: `npx tsx scripts/<name>.ts [flags]`

## Core Pipeline (run regularly)

- `expand-interests.ts --live` — Graph enrichment: interests (223 nodes)
- `expand-categories.ts --live` — Graph enrichment: categories (53 nodes)
- `expand-occasions.ts --live` — Graph enrichment: occasions (15 nodes)
- `expand-relationships.ts --live` — Graph enrichment: relationships (18 nodes)
- `expand-attributes.ts --live` — Graph enrichment: 14 boolean attribute flags
- `enrich-products-robust.ts` — Product enrichment with multi-LLM failover
- `enrich-attributes-multi-llm.ts` — Attribute enrichment with multi-LLM

## Data Loading

- `ingest-products.ts` — Main product loader
- `ingest-missing-gift-brands.ts --live --embed` — Load from iCloud BCorp CSV
- `import-raw-products.ts` — Raw product import
- `pipeline/load_products.ts --live --wipe --embed` — Neo4j loader + embeddings
- `pipeline/load_gift_cards.ts` — Gift card loader

## Testing and Validation

- `chat.ts` — Interactive chat CLI
- `test-personas.ts` — Persona test harness
- `test-recommendations.ts` — Recommendation quality tests
- `test-workflow.ts` — End-to-end workflow test
- `test-edge-cases.ts` — Edge case tests
- `graph-audit.ts` — Full graph structure audit

## Diagnostics

- `check-env.ts` — Environment variable check
- `check-neo4j.ts` — Neo4j connection test
- `check-coverage.ts` — Graph enrichment coverage stats
- `check-attribute-status.ts` — Attribute flag coverage
- `check-unenriched.ts` — Count unenriched products
- `analyze-product-stats.ts` — Product statistics

## Data Cleanup

- `add-missing-interests.ts` — Add specific interest nodes
- `clean-coffee-interest.ts` — Remove misassigned coffee interest products
- `cleanup-orphaned-interests.ts` — Remove orphaned interest nodes
- `normalize-interests.ts` — Deduplicate interest names

## Archive

Superseded scripts live in `src/scripts/archive/`. Do not use unless investigating history.
