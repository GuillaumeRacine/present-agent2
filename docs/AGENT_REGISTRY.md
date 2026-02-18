# Agent Registry

All agents in Present Agent2: 10 runtime recommendation agents + 26 Claude Code meta-agents.

---

## Runtime Agents (10)

These execute during each recommendation request, orchestrated by `src/services/orchestrator.ts`.

| # | Agent | File | Model | Purpose |
|---|-------|------|-------|---------|
| 1 | **Listener** | `src/services/agents/listener.ts` | GPT-4 | Extract context from user query (recipient, occasion, budget, interests) |
| 2 | **Memory** | `src/services/agents/memory.ts` | - | Recall past preferences, purchases, recipient profiles |
| 3 | **Relationship** | `src/services/agents/relationship.ts` | GPT-4 | Analyze social dynamics (closeness, power, formality) |
| 4 | **Constraints** | `src/services/agents/constraints.ts` | - | Validate hard requirements (budget, shipping, availability) |
| 5 | **Meaning** | `src/services/agents/meaning.ts` | GPT-4o-mini | Identify emotional/symbolic significance, map to interests |
| 6 | **Explorer** | `src/services/agents/explorer.ts` | - | Hybrid search: graph (70%) + vector (30%) + text fallback |
| 7 | **Validator** | `src/services/agents/validator.ts` | - | Quality check: filters, dedup, ensures criteria met |
| 8 | **Storyteller** | `src/services/agents/storyteller.ts` | GPT-4 | Generate personal, contextual reasoning per recommendation |
| 9 | **Presenter** | `src/services/agents/presenter.ts` | - | Format final response with intro/outro, ranked list |
| 10 | **Learner** | `src/services/agents/recipient-learner.ts` | GPT-4 | Build/update recipient profiles from conversation (async) |

### Execution Flow

```
User Query → Listener → Memory → Relationship → Constraints → Meaning
                                                                  ↓
                          Presenter ← Storyteller ← Validator ← Explorer
                              ↓
                          Response
                              ↓ (async)
                          Learner
```

---

## Claude Code Meta-Agents (26)

Defined in `src/.claude/agents/`. Used by Claude Code for development tasks, not at runtime.

### Data Enrichment Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Interest Enricher** | `interest-enricher.md` | Expand product interest tags using LLM |
| **Attribute Enricher** | `attribute-enricher.md` | Add 14 boolean gift attributes to products |
| **Category Enricher** | `category-enricher.md` | Categorize products into gift taxonomy |

### Quality & Testing Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Code Quality Guardian** | `code-quality-guardian.md` | Enforce code standards, review PRs |
| **Testing Agent** | `testing-agent.md` | Write and run tests, validate coverage |
| **Stress Tester** | `stress-tester.md` | Load test, edge case discovery |
| **Ingestion Validator** | `ingestion-validator.md` | Verify data loading integrity |
| **User Simulator** | `user-simulator.md` | Simulate diverse user queries |

### Management Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Engineering Manager** | `engineering-manager.md` | Coordinate development, prioritize work |
| **Product Manager** | `product-manager.md` | Feature prioritization, user stories |
| **Doc Organizer** | `doc-organizer.md` | Documentation structure and cleanup |
| **Tickets Manager** | `tickets-manager.md` | GitHub issues and project board management |

### Design & Architecture Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Architect** | `architect.md` | System design, database schema, API design |
| **Archetype Generator** | `archetype-generator.md` | Define gift archetype taxonomy |

### Data Pipeline Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Product Importer** | `product-importer.md` | Import product data from various sources |
| **Product Ingestor** | `product-ingestor.md` | Ingest and normalize product records |

### Runtime Agent Specs (Documentation Only)

Each runtime agent also has a specification file in `src/.claude/agents/`:

`listener-agent.md`, `memory-agent.md`, `relationship-agent.md`, `constraints-agent.md`, `meaning-agent.md`, `explorer-agent.md`, `validator-agent.md`, `storyteller-agent.md`, `presenter-agent.md`, `learning-agent.md`

These define the agent's role, inputs, outputs, prompts, and success criteria.

---

## Other Claude Code Context Files

Located in `src/.claude/`:

| File | Purpose |
|------|---------|
| `PROJECT_STATUS.md` | Current version, database stats, enrichment status |
| `CODEBASE_SUMMARY.md` | Technical architecture quick reference |
| `PROJECT_CONTEXT.md` | Brief project overview |
| `RECOMMENDATION_AGENT_WORKFLOW.md` | Deep-dive into multi-agent philosophy and flow |
| `MULTI_MODEL_AGENTS.md` | Multi-LLM fallback strategy docs |
| `GITHUB_AGENT_GUIDE.md` | GitHub workflow for agents |
| `GITHUB_WORKFLOW.md` | Git branching and PR conventions |
| `SECURITY_CHECKLIST.md` | Security review checklist |
| `WORKFLOW.md` | Development workflow conventions |
| `README.md` | Context directory overview |

---

*Last updated: 2026-02-17*
