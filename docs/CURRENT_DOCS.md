# Current Docs Index (Authoritative)

Use this file as the single source of truth for active documentation.

If a doc is not listed here, treat it as historical context and verify before using.

## 1) Start Here

- `CLAUDE.md` - Canonical project snapshot, architecture, quality status.
- `docs/CURRENT_DOCS.md` - This file.

## 2) Product Inventory Expansion (Active)

- `docs/PRODUCT_ACQUISITION_PIPELINE.md` - 8-stage pipeline: filter -> vet -> scrape -> normalize -> load -> enrich -> learn -> validate.
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
- `src/.claude/CODEBASE_SUMMARY.md` - Code patterns, agent flow, key files.

## 5) Quality + Tracking

- `data/quality_tests/latest.md` - Most recent quality run summary.
- `data/quality_tests/latest.json` - Most recent quality run structured output.
- `docs/CHANGELOG.md` - Version history and interest cleanup log.
- `docs/KNOWN_ISSUES.md` - Active bugs and limitations.

## 6) Reference

- `research/RESEARCH_INDEX.md` - 14 academic papers on gift psychology.
- `research/IDEAL_PRODUCT_CATALOG_ANALYSIS.md` - Market data, gift psychology, price strategy.
- `research/B_CORP_SHOPIFY_BRANDS_RESEARCH.md` - 150+ ethical brands by category.
- `research/EXPERIENCE_GIFT_DATA_SOURCES.md` - 50+ experience/subscription/digital gift platforms.
- `docs/CONTEXT_INDEX.md` - Cross-reference to Guillaume's full context system.

## 7) Task-Based Loading Guide

| Task | Load These Files |
|------|-----------------|
| Code fix / feature | `src/.claude/CODEBASE_SUMMARY.md` |
| Agent behavior | + `docs/AGENT_REGISTRY.md` |
| Database / Cypher | + `docs/DATABASE_SCHEMA.md` |
| Product pipeline | + `docs/PRODUCT_ACQUISITION_PIPELINE.md` |
| API changes | + `src/docs/API.md` |
| Architecture | + `src/docs/ARCHITECTURE.md` |
| Quality testing | + `data/quality_tests/latest.md` |
| Known issues | + `docs/KNOWN_ISSUES.md` |

## 8) Archive Rules

- Archive location: `docs/archive/` (all archived docs, including legacy src/docs/).
- A document is "active" only if:
  1. It is listed in this file.
  2. It has been updated within the current quarter or explicitly marked "evergreen".
  3. It does not conflict with `CLAUDE.md`.

When docs conflict, precedence is:
1. `CLAUDE.md`
2. `docs/CURRENT_DOCS.md` listed files
3. Everything else
