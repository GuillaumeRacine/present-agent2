# Project Status for Claude Code

**Last Updated**: November 26, 2025
**Version**: 2.2.0

---

## Current State: Production Ready

```
+===========================================================+
|              PRESENT-AGENT2 STATUS                        |
+===========================================================+
|  Version:       2.2.0 - Production Ready                  |
|  Products:      41,704                                    |
|  Attributes:    99.7% coverage (41,562 products)          |
|  Interest edges: 43,441                                   |
|  Occasion edges: 31,678                                   |
|  Neo4j Instance: a92dc9b7 (active)                        |
|  Test Suite:    190/190 passing                           |
+===========================================================+
```

---

## What's Working

### Core System
- 10-agent recommendation engine
- Neo4j graph database (41,704 products)
- Hybrid search (graph + vector + text fallback)
- Conversation persistence
- Web interface (chat + logs + products)
- Interactive CLI chat interface

### Attribute System (Complete)
- 99.7% attribute coverage
- 14 gift attributes with rich multi-dimensional profiles
- Archetype matching operational (practical, sentimental, experiential, etc.)
- LLM-based attribute population completed

### Recommendation Quality
- 7/10 quality score on real-user tests
- 100% success rate on easy scenarios
- 25-30 seconds average query time

---

## Current Metrics

| Metric | Value |
|--------|-------|
| **Products** | 41,704 |
| **Attribute Coverage** | 99.7% |
| **Interest Edges** | 43,441 |
| **Occasion Edges** | 31,678 |
| **Test Pass Rate** | 100% (190/190) |
| **Response Time** | 25-30s |

---

## Architecture Quick Reference

### 10-Agent System
1. **Listener** - Context extraction from user queries
2. **Memory** - History + recipient profiles
3. **Relationship** - Relationship dynamics analysis
4. **Constraints** - Budget/timing validation
5. **Meaning** - Meaningful interest identification
6. **Explorer** - Hybrid search (graph + vector + text)
7. **Validator** - Quality check
8. **Storyteller** - Reasoning generation
9. **Presenter** - Response formatting
10. **Learner** - Profile enrichment

### Data Flow
```
User Query
  -> Listener (extract context)
  -> Memory (recall history)
  -> Relationship (analyze dynamics)
  -> Constraints (validate)
  -> Meaning (identify interests)
  -> Explorer (find products via hybrid search)
  -> Validator (quality check)
  -> Storyteller (generate reasoning)
  -> Presenter (format response)
  -> Learner (update profile)
```

### Hybrid Search Strategy
1. **Graph Search** (70% weight): Product -> Interest relationships
2. **Vector Search** (30% weight): Semantic similarity
3. **Text Fallback**: Full-text search if <5 results

---

## File Locations

### Core Code
- `src/services/agents/` - 10 agent implementations
- `src/services/orchestrator.ts` - Agent coordination
- `src/services/conversation-persister.ts` - History storage
- `src/server.ts` - Express API server

### Key Scripts
- `scripts/chat.ts` - CLI chat interface
- `scripts/test-personas.ts` - Persona testing
- `scripts/ingest-products.ts` - Product data loading
- `scripts/populate-gift-attributes.ts` - Attribute population

### Logs
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

### Documentation
- `docs/README.md` - Documentation hub
- `docs/ARCHITECTURE.md` - System architecture
- `docs/guides/` - Technical guides
- `docs/reports/` - Analysis reports

---

## Quick Commands

### Development
```bash
npm run dev              # Run full stack (backend + frontend)
npm run chat             # Interactive CLI chat
npm run server           # Backend only
cd frontend && npm run dev  # Frontend only
```

### Testing
```bash
npm test                 # Run test suite
npm run test:personas:quick    # Quick persona test
npm run test:real-users:easy   # Real user scenario tests
```

### Database
```bash
npm run setup:schema     # Initialize Neo4j schema
npm run ingest:products  # Load product data
npm run attributes:status  # Check attribute coverage
```

---

## Recent Changes (November 2025)

### November 26
- All tests passing (190/190)
- DialogueManager improvements for vague query handling
- Enhanced error handling with fallback behavior

### November 25
- Neo4j instance migration to a92dc9b7
- Documentation reorganization
- New agents defined in `.claude/agents/`

### November 14
- v2.2.0 release
- 99.7% attribute coverage achieved
- Agent performance analysis completed

---

## Key Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](../docs/README.md) | Documentation hub |
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | System design |
| [docs/QUICKSTART.md](../docs/QUICKSTART.md) | 5-minute setup |
| [docs/API.md](../docs/API.md) | API reference |
| [docs/reports/AGENT_PERFORMANCE_ANALYSIS.md](../docs/reports/AGENT_PERFORMANCE_ANALYSIS.md) | Agent scoring |
| [docs/reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md](../docs/reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) | Quality metrics |

---

## Safe to Modify

All code is stable. No active deployments or background processes running.

- Agent files
- Frontend components
- API routes
- Documentation
- Tests
- Scripts

---

**Status**: Production ready. System operational with high attribute coverage and passing tests.
