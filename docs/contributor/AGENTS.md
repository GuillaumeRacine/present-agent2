# Repository Guidelines

**Version**: 2.5.0 | **Last Updated**: February 24, 2026

---

## Project Structure

```
Present-Agent2/
├── src/
│   ├── services/
│   │   ├── agents/           # 10 specialized recommendation agents
│   │   ├── conversation-persister.ts # Conversation state management
│   │   └── orchestrator.ts   # Agent coordination
│   ├── lib/                  # Shared utilities
│   ├── types/                # TypeScript type definitions
│   └── server.ts             # Express API server
├── frontend/                 # Next.js React UI
├── scripts/                  # Operational scripts
├── docs/                     # Documentation
├── data/                     # Product data and exports
├── test-results/             # Persona test outputs
└── .claude/                  # Claude Code configuration
    └── agents/               # 19 agent definitions
```

---

## Development Commands

### Daily Development
```bash
npm run dev              # Full stack (backend + frontend)
npm run chat             # Interactive CLI chat
npm run server:dev       # Backend with watch mode
cd frontend && npm run dev  # Frontend only
```

### Database Operations
```bash
npm run setup:schema     # Initialize Neo4j schema
npm run ingest:products  # Load product data
npm run attributes:status  # Check attribute coverage
```

### Testing
```bash
npm test                     # Vitest unit tests (190 tests)
npm run test:personas:quick  # Quick persona validation
npm run test:personas:list   # Full persona suite
npm run test:real-users:easy # Real scenario tests
```

---

## Coding Standards

### TypeScript
- **Strict mode** enabled - fix all `tsc --noEmit` errors
- ES modules with explicit async return types
- Single-responsibility agents with `process` method

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `RecommendationOrchestrator` |
| Functions | camelCase | `extractContext` |
| Files | kebab-case | `relationship-agent.ts` |
| Types | PascalCase | `ListenerOutput` |

### Code Style
- 2-space indentation
- Relative imports within modules
- Comments only for non-obvious orchestration logic

---

## Agent Architecture

### 10-Agent Recommendation System
Located in `src/services/agents/`:

| # | Agent | File | Purpose |
|---|-------|------|---------|
| 1 | Listener | `listener.ts` | Context extraction |
| 2 | Memory | `memory.ts` | History + profiles |
| 3 | Relationship | `relationship.ts` | Dynamics analysis |
| 4 | Constraints | `constraints.ts` | Validation |
| 5 | Meaning | `meaning.ts` | Interest identification |
| 6 | Explorer | `explorer.ts` | Product discovery |
| 7 | Validator | `validator.ts` | Quality check |
| 8 | Storyteller | `storyteller.ts` | Reasoning |
| 9 | Presenter | `dialogue-presenter.ts` | Formatting |
| 10 | Learner | `recipient-learner.ts` | Profile enrichment |

### Supporting Components
- `base.ts` - Abstract base agent class
- `dialogue-manager.ts` - Conversation flow
- `orchestrator.ts` - Agent coordination

---

## Testing Guidelines

### Unit Tests
- Place tests beside source: `*.test.ts`
- Run with Vitest: `npm test`
- Maintain ≥80% coverage on agent logic

### Persona Testing
- Add personas in `data/personas/*.json`
- Quick suite: `npm run test:personas:quick`
- Full suite: `npm run test:personas:list`

### Pre-Push Checklist
1. `npm test` - All 190 tests pass
2. `npm run test:personas:quick` - Core personas work
3. `tsc --noEmit` - No type errors

---

## Commit Guidelines

### Format
```
Short imperative summary (50 chars)

- Detail 1
- Detail 2

Agents touched: Listener, Validator
```

### Examples
- `Fix vague query handling in DialogueManager`
- `Add occasion tagging to product ingestion`
- `Improve Storyteller reasoning quality`

---

## Pull Request Process

1. **Description**: What changes and why
2. **Agents Affected**: List modified agents
3. **Testing**: Verification commands run
4. **Screenshots**: For frontend changes
5. **Follow-ups**: Unchecked task bullets

---

## Security

- **Secrets**: `.env.local` only, never commit
- **Templates**: Use `.env.example` for structure
- **Logging**: Never log credentials
- **Validation**: `npm run setup:schema` to verify keys

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [README.md](../../README.md) | Project overview |
| [docs/ARCHITECTURE.md](../ARCHITECTURE.md) | System design |
| [docs/API.md](../API.md) | API reference |
| [.claude/PROJECT_STATUS.md](../../.claude/PROJECT_STATUS.md) | Current status |
| [.claude/agents/](../../.claude/agents/) | Agent definitions |

---

## Current Status

- **Version**: 2.5.0 (Production Ready)
- **Products**: 88,674
- **Attribute Coverage**: 74.6%
- **Tests**: 190/190 passing
