# Current Docs Index (Authoritative)

Use this file as the single source of truth for active documentation.

If a doc is not listed here, treat it as historical context and verify before using.

## 1) Start Here

- `CLAUDE.md` - Canonical project snapshot, architecture, quality status.
- `README_START_HERE.md` - Operational quick start for local setup.
- `docs/CURRENT_DOCS.md` - This file.

## 2) Product Inventory Expansion (Active)

- `docs/PRODUCT_INVENTORY_PLAYBOOK.md` - Source strategy, connector plan, and execution order.
- `docs/CANONICAL_PRODUCT_SCHEMA.md` - Canonical ingestion schema and quality gates.
- `docs/PRODUCT_EXPANSION_WAVES.md` - Medium-term source expansion waves.
- `docs/DATA_SOURCES.md` - Current data sources and enrichment pipeline.

## 3) System + Runtime

- `docs/AGENT_REGISTRY.md` - Runtime and meta-agent definitions.
- `docs/API_ENDPOINTS.md` - Backend and frontend endpoint map.
- `docs/DATABASE_SCHEMA.md` - Neo4j schema, relationship coverage, indexes.
- `docs/LOCAL_INFRASTRUCTURE.md` - Docker/local infra and startup commands.
- `docs/ROADMAP.md` - Current phase and priorities.

## 4) Code-Level Docs (Still Active)

- `src/docs/API.md` - Detailed request/response API reference.
- `src/docs/ARCHITECTURE.md` - System architecture deep dive (implementation-focused).
- `src/docs/SECURITY.md` - Security controls and handling policy.

## 5) Quality + Validation

- `data/quality_tests/latest.md` - Most recent quality run summary.
- `data/quality_tests/latest.json` - Most recent quality run structured output.
- `src/docs/reports/DATA_STATUS_CURRENT.md` - Current dataset metrics.

## 6) Archive Rules

- Archive location: `docs/archive/` (root) and `src/docs/archive/` (app-level).
- A document is "active" only if:
  1. It is listed in this file.
  2. It has been updated within the current quarter or explicitly marked "evergreen".
  3. It does not conflict with `CLAUDE.md`.

When docs conflict, precedence is:
1. `CLAUDE.md`
2. `docs/CURRENT_DOCS.md` listed files
3. Everything else

