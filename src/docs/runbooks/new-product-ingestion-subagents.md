# New Product Ingestion — Subagent Runbook

Audience: Claude Code subagents (coding agents) to implement the end‑to‑end ingestion and enrichment flow for newly supplied products, consistent with the previous production run documented in `docs/archive/PRODUCT_INGESTION_COMPLETE.md`.

Scope: Import raw products → merge into canonical export → ingest to Neo4j with real embeddings → enrich via category, interest, and attribute subagents → generate archetype embeddings → validate.

## 0) Prerequisites

- Environment variables in `.env.local`:
  - `OPENAI_API_KEY` (required; mock embeddings disabled)
  - `NEO4J_URL`, `NEO4J_PASSWORD`, `NEO4J_USER` (or `NEO4J_USERNAME`), `NEO4J_DATABASE`
- Data paths:
  - Raw file (latest): `data/raw/products 23_11_2025.json`
  - Canonical export: `data/export/products.json`
  - Facets export: `data/export/facets.json`
- Tools: `tsx`, Neo4j accessible from this host.

Important: Real OpenAI embeddings are enforced. Flags to skip or mock embeddings are disabled by design.

## 1) Confirm Inputs and Environment

- Verify `.env.local` has valid OpenAI + Neo4j credentials.
- Confirm raw file presence: `data/raw/products 23_11_2025.json`.
- Sanity check export counts: `wc -l data/export/products.json` is not exact for JSON, but confirm file exists and size looks reasonable.

Acceptance:
- Credentials present, raw file exists, exports present.

## 2) Import Raw → Canonical Export (Deduped)

Script: `scripts/import-raw-products.ts`

Dry run (preview):
```
npx tsx scripts/import-raw-products.ts --source "data/raw/products 23_11_2025.json" --dry-run
```

Merge (appends new, deduped records + updates summary with backups):
```
npx tsx scripts/import-raw-products.ts --source "data/raw/products 23_11_2025.json" --merge
```

Notes:
- Dedupes against existing `id` and `product_url`.
- Backups created for `data/export/products.json` (and summary) on merge.

Acceptance:
- New candidates are counted; merged file increases by the expected number of new products; backups created.

## 3) Ingest Products to Neo4j (with Real Embeddings)

Script: `scripts/ingest-products.ts`

Test (limit):
```
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" \
  npx tsx scripts/ingest-products.ts --limit 100
```

Full run:
```
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" \
  npx tsx scripts/ingest-products.ts
```

Behavior:
- Streams from `data/export/products.json`.
- Skips products already present in Neo4j (resume-safe).
- Generates 4 embeddings per product: `product_embedding`, `style_embedding`, `sentiment_embedding`, `use_case_embedding` (1536‑d, cosine index expected by schema).

Acceptance:
- New products appear as `(:Product)` with all four embeddings and base properties populated.
- Script summary shows ingested vs skipped counts; checkpoint cleared on success.

## 4) Enrich via Subagents (Graph Signals)

### 4a) Categories (create nodes + link products)
Script: `scripts/add-categories.ts`

Dry run:
```
npx tsx scripts/add-categories.ts --dry-run
```

Live:
```
npx tsx scripts/add-categories.ts --batch-size 500
```

Acceptance:
- Category nodes exist (~50+). Products show `(:Product)-[:BELONGS_TO]->(:Category)` edges. Coverage report printed.

### 4b) Interest Expansion (taxonomy‑based retagging)
Script: `scripts/expand-interests.ts`

Dry run:
```
npx tsx scripts/expand-interests.ts
```

Live:
```
npx tsx scripts/expand-interests.ts --live
```

Acceptance:
- Increased average interests per product; improved coverage for hiking/yoga and long‑tail categories. New `MATCHES_INTEREST` edges with confidence metadata.

### 4c) Gift Attributes (keyword or LLM)
Script: `scripts/populate-gift-attributes.ts`

Dry run (keyword):
```
npx tsx scripts/populate-gift-attributes.ts --limit 500
```

Live (LLM, resumable):
```
npx tsx scripts/populate-gift-attributes.ts --live --use-llm --resume
```

Acceptance:
- Product nodes updated with `is_*` boolean attributes. Checkpointing works; coverage matches expectations (LLM provides ~95%+).

## 5) Generate Archetype Embeddings

Script: `scripts/generate-archetype-embeddings.ts`

Dry run:
```
npx tsx scripts/generate-archetype-embeddings.ts --limit 200
```

Live (resume safe):
```
npx tsx scripts/generate-archetype-embeddings.ts --live --resume
```

Behavior:
- Converts active `is_*` attributes to semantic text and embeds to `product.archetype_embedding` (1536‑d). Stores `archetype_text`, counts, timestamps.

Acceptance:
- New or missing products have `archetype_embedding` set. Checkpoint cleared on successful completion.

## 6) Validation & Health Checks

Neo4j health:
```
npx tsx scripts/check-neo4j.ts
```

Product statistics:
```
npx tsx scripts/analyze-product-stats.ts
```

API stats (when server is running):
- `GET /api/products/stats` should return totals for products, facets, categories.
- Quick search sanity: `GET /api/products?query=coffee&limit=10` returns results.

Acceptance:
- Health check OK. Stats reflect increased counts. API returns products for common queries.

## Roles, Touchpoints, and AC per Subagent

1) Importer (Raw → Canonical)
- Files: `scripts/import-raw-products.ts`, `data/raw/*.json`, `data/export/products.json`
- Deliverables: Deduped new products merged; backups created; summary updated.

2) Ingestor (Neo4j + Embeddings)
- Files: `scripts/ingest-products.ts`, `src/lib/llm.ts`, `src/lib/neo4j.ts`
- Deliverables: New `Product` nodes with 4 embeddings; ingestion summary logged.

3) Category Subagent
- Files: `scripts/add-categories.ts`, `src/lib/interest-synonyms.ts`
- Deliverables: `Category` nodes and `BELONGS_TO` edges; coverage report.

4) Interest Subagent
- Files: `scripts/expand-interests.ts`, `src/lib/interest-synonyms.ts`
- Deliverables: Expanded `Interest` nodes/edges; increases for target interests; summary.

5) Attributes Subagent
- Files: `scripts/populate-gift-attributes.ts`, `src/types/gift-attributes*.ts`
- Deliverables: Updated `is_*` flags on products; checkpoint/resume supported; summary.

6) Archetype Embeddings Subagent
- Files: `scripts/generate-archetype-embeddings.ts`, `src/lib/llm.ts`
- Deliverables: `archetype_embedding` set for products with attributes; summary and cost estimate.

7) Validator Subagent
- Files: `scripts/check-neo4j.ts`, `scripts/analyze-product-stats.ts`, server endpoints
- Deliverables: Health OK, stats updated, API returns results for common queries.

## Guardrails & Notes

- Do NOT re‑introduce mock embeddings or `--skip-embeddings` options.
- Use `--limit` and dry runs before full runs.
- Scripts include retry logic and checkpointing where relevant; leverage `--resume` for long LLM/embedding jobs.
- If Neo4j throws `ArgumentError` or type issues, re‑run the step; batch scripts already use `toInteger` and per‑batch sessions.

## References

- Previous complete ingestion: `docs/archive/PRODUCT_INGESTION_COMPLETE.md`
- Subagents improvement context: `docs/subagents-improvement-plan.md`
- Key scripts: see `scripts/` directory mentioned above.

