# Claude Code Configuration

This directory contains Claude Code configuration for the Present-Agent2 project.

## Structure

```
.claude/
├── agents/                    # Specialized agent definitions
│   ├── [Development Agents]
│   │   ├── architect.md           # Coding agent with project context
│   │   ├── product-manager.md     # Feature specification
│   │   ├── engineering-manager.md # Technical review
│   │   ├── testing-agent.md       # QA and testing
│   │   ├── user-simulator.md      # UX validation
│   │   ├── doc-organizer.md       # Documentation management
│   │   └── ...
│   ├── [Product Ingestion Agents]
│   │   ├── product-importer.md    # Raw → Export import
│   │   ├── product-ingestor.md    # Neo4j + embeddings
│   │   ├── category-enricher.md   # Category assignment
│   │   ├── interest-enricher.md   # Interest taxonomy
│   │   ├── attribute-enricher.md  # Gift attributes (LLM)
│   │   ├── archetype-generator.md # Archetype embeddings
│   │   └── ingestion-validator.md # Quality validation
│   └── [10 Recommendation Agents]
├── commands/                  # Custom slash commands
│   ├── build.md              # Architect implementation
│   ├── test.md               # Testing workflow
│   ├── ingest.md             # Product ingestion pipeline
│   ├── enrich.md             # Quick enrichment workflow
│   └── ...
├── hooks/                     # Auto-load context hooks
├── PROJECT_STATUS.md          # Current project status
├── PROJECT_CONTEXT.md         # Quick project reference
├── CODEBASE_SUMMARY.md        # Code reference for agents
├── WORKFLOW.md                # Complete workflow guide
├── settings.local.json        # Claude Code configuration
└── README.md                  # This file
```

## Agents Overview

### Development Workflow Agents
| Agent | Purpose |
|-------|---------|
| `architect.md` | Implementation with project standards |
| `product-manager.md` | Feature specs and research |
| `engineering-manager.md` | Technical review |
| `tickets-manager.md` | GitHub issue creation |
| `testing-agent.md` | QA and testing |
| `user-simulator.md` | UX validation with personas |
| `code-quality-guardian.md` | Code quality enforcement |
| `doc-organizer.md` | Documentation management |

### Product Ingestion Agents (NEW)
| Agent | Purpose |
|-------|---------|
| `product-importer.md` | Import raw JSON to canonical export |
| `product-ingestor.md` | Create Product nodes with embeddings |
| `category-enricher.md` | Assign categories to products |
| `interest-enricher.md` | Expand interests and link products |
| `attribute-enricher.md` | Populate 14 gift attributes via LLM |
| `archetype-generator.md` | Generate archetype embeddings |
| `ingestion-validator.md` | Validate and report quality |

### Recommendation Engine Agents
| Agent | Purpose |
|-------|---------|
| `listener-agent.md` | Context extraction |
| `memory-agent.md` | History and profiles |
| `relationship-agent.md` | Relationship dynamics |
| `constraints-agent.md` | Budget/timing validation |
| `meaning-agent.md` | Interest identification |
| `explorer-agent.md` | Product discovery |
| `validator-agent.md` | Quality checking |
| `storyteller-agent.md` | Reasoning generation |
| `presenter-agent.md` | Response formatting |
| `learning-agent.md` | Profile enrichment |

## Usage

### Custom Slash Commands
```
/build [feature]   # Architect implementation
/test [component]  # Testing with coverage
/ux [feature]      # UX validation with personas
/spec [feature]    # Product specification
/sub [feature]     # Full multi-agent workflow
/ingest            # Product ingestion pipeline
/enrich            # Quick product enrichment
```

### Enrichment Monitoring Commands
```bash
./scripts/monitor-enrichment.sh              # Real-time progress
npx tsx scripts/analyze-product-stats.ts     # Database stats
./scripts/run-enrichment-with-retry.sh       # Start with retry
```

### Using Agents Directly
```
Use the architect agent to implement [feature]
Use the testing-agent to test [component]
Use the product-importer agent to import the new batch
Use the interest-enricher agent to fix orphaned products
```

### Product Ingestion Pipeline
For adding new product batches:
```
/ingest full --source "data/raw/products_YYYY_MM_DD.json"
```

For enriching existing products:
```
/enrich
```

## Key Files

| File | Purpose |
|------|---------|
| `PROJECT_STATUS.md` | Current system status and metrics |
| `CODEBASE_SUMMARY.md` | Code reference for LLM context |
| `WORKFLOW.md` | Development workflow documentation |
| `settings.local.json` | Tool permissions and settings |

## Current Status

- **Version**: 2.4.0 (Enrichment Automation)
- **Products in DB**: 88,674
- **Interest Coverage**: 99.3% (88,053 products) ✅
- **Occasion Coverage**: 84.6% (75,060 products) ✅
- **Attribute Coverage**: 53.2% (47,139 products) - **ENRICHING** ⚡
  - **Active**: 1,660/41,535 done (4%)
  - **Target**: 95%+ by December 7, 2025
- **Tests**: 190/190 passing

See `PROJECT_STATUS.md` for detailed status and active enrichment monitoring.

---

## Documentation Quick Links

### Project Documentation
- **[Main README](../README.md)** - Project overview and quick start
- **[Documentation Hub](../docs/README.md)** - Complete documentation index
- **[Architecture](../docs/ARCHITECTURE.md)** - System design
- **[API Reference](../docs/API.md)** - API documentation

### Claude Code Specifics
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current project state
- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** - Quick reference
- **[CODEBASE_SUMMARY.md](CODEBASE_SUMMARY.md)** - Code reference
- **[WORKFLOW.md](WORKFLOW.md)** - Development workflow
- **[Commands README](commands/README.md)** - Slash command guide

### Operational Guides
- **[Ingestion Runbook](../docs/runbooks/new-product-ingestion-subagents.md)** - Product ingestion
- **[Enrichment Runbook](../docs/runbooks/hybrid-enrichment.md)** - Data enrichment
- **[Enrichment Quick Reference](../scripts/ENRICHMENT_QUICK_REFERENCE.md)** - Scripts reference
- **[Monitoring Guide](../docs/guides/MONITORING.md)** - System monitoring

## Product Ingestion Pipeline

```
Raw JSON → Import → Neo4j+Embed → Categories → Interests → Attributes → Archetypes → Validate
```

Each stage has:
- Dedicated agent with detailed instructions
- Test/dry-run mode before apply
- Resume/checkpoint support
- Quality gates before proceeding

See `/ingest` command or `docs/runbooks/new-product-ingestion-subagents.md` for full documentation.
