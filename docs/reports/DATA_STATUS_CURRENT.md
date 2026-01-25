# Data Status (Current)

**Date:** 2026-01-XX  
**Source:** Live Neo4j (`a92dc9b7`) inspected via scripts on this branch

## Snapshot
- **Products:** 88,674
- **`product_id` coverage:** 100% (all unique; constraint enforced)
  - Scheme: `vendor::sku` (canonical) with `::dup::<id>` suffix for duplicate SKU groups, else `vendor::url`, else `generated::<id>` (seed items)
- **Attributes (legacy 14 flags):** 41,570 products with flags set (46.9%); 47,104 without flags
- **Interests/occasions:** Not re-counted in this pass (see prior reports); use `scripts/fix-orphaned-products.ts` and `scripts/enrich-products-hybrid.ts` to audit/fill.

## Recent Changes
- Added uniqueness constraint on `Product.product_id` (alongside `Product.id`).
- Backfilled `product_id` for all products using deterministic rules; no duplicates remain.
- Ingestion now builds/stores `product_id` via `src/lib/product-id.ts` and upserts on that key.

## Next Actions
- Run enrichment to raise attribute coverage back to prior levels (46.9% → target 95%+).
- Audit interests/occasions coverage and fix orphans with `scripts/fix-orphaned-products.ts` (dry-run first).
- Ensure all ingest pipelines set `product_id` (vendor::sku preferred) to respect the uniqueness constraint.
