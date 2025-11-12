# Repository Guidelines

## Project Structure & Module Organization
Present-Agent2 couples a Node/TypeScript backend with a Next.js frontend. Core orchestration and all 10 agents live in `src/services` (e.g., `src/services/agents/listener-agent.ts`), shared utilities in `src/lib`, and typed contracts in `src/types`. Operational scripts such as `scripts/setup-schema.ts` and `scripts/test-personas.ts` sit under `scripts/`, while long-form design docs live in `docs/`. The frontend UI resides in `frontend/app` with subroutes like `logs/` and `products/`. Persist persona outputs in `test-results/` and large datasets in `data/` so `src/` stays production-ready.

## Build, Test, and Development Commands
- `npm run dev` — concurrently watches the Express API and Next.js UI for day-to-day development.
- `npm run server:dev` / `npm run frontend` — launch stacks in separate terminals when isolating regressions.
- `npm run setup:schema` — provisions Neo4j indexes/vector indexes; rerun after model changes.
- `npm run ingest` or `npm run ingest:sample` — populate the graph from data exports; sample mode keeps runtime short.
- `npm test` runs Vitest unit suites; `npm run test:personas:quick` hits the 3-core persona loop; `npm run test:personas:list` is exhaustive; `npm run test:real-users:*` exercises scenario difficulty tiers.

## Coding Style & Naming Conventions
TypeScript runs in strict mode; fail builds if `tsc --noEmit` surfaces drift. Use ES modules, explicit async return types, PascalCase classes (e.g., `RecommendationOrchestrator`), camelCase functions, and kebab-case filenames (`relationship-agent.ts`). Keep imports relative within module boundaries and favor single-responsibility agents that expose a `process` method returning typed contexts. Default to 2-space indentation and reserve comments for orchestration logic that is not self-evident.

## Testing Guidelines
Unit files should live beside their subjects using the `*.test.ts` suffix and run through Vitest. Persona and scenario harnesses live in `scripts/test-personas.ts` and `scripts/test-real-user-scenarios.ts`; add personas in `data/personas/*.json` and invoke them via CLI arguments. Maintain ≥80% coverage on agent logic and ensure the persona quick suite passes before pushing. Capture flaky-agent traces in `logs/` or `test-results/` instead of scattering debug prints across source files.

## Commit & Pull Request Guidelines
Recent history uses short, imperative summaries with optional qualifiers (e.g., “Fix critical bugs and reorganize documentation - MVP ready”). Scope commits per concern, reference the agents or scripts touched, and document data migrations whenever Neo4j schemas shift. PRs should describe impacted agents, enumerate verification commands (Vitest, persona quick, dev server), link related docs under `docs/`, and include screenshots for frontend changes. Tag reviewers responsible for the affected agents and leave follow-up items as unchecked task list bullets.

## Security & Configuration Tips
Secrets belong in `.env.local` at the repo root; never commit keys—share templates via `.env.example`. Neo4j and LLM keys are mandatory for ingestion and persona tests, so validate them with `npm run setup:schema` before long runs. Place any experimental API adapters in `src/lib`, gate them with feature flags in `src/services/orchestrator.ts`, and avoid logging credentials when persisting traces.
