# Claude Code Configuration

This directory contains Claude Code configuration for the Present-Agent2 project.

## Structure

```
.claude/
├── agents/                    # 19 specialized agent definitions
│   ├── architect.md           # Coding agent with project context
│   ├── product-manager.md     # Feature specification
│   ├── engineering-manager.md # Technical review
│   ├── testing-agent.md       # QA and testing
│   ├── user-simulator.md      # UX validation
│   ├── doc-organizer.md       # Documentation management
│   └── [10 recommendation agents]
├── commands/                  # Custom slash commands
├── hooks/                     # Auto-load context hooks
├── PROJECT_STATUS.md          # Current project status
├── PROJECT_CONTEXT.md         # Quick project reference
├── CODEBASE_SUMMARY.md        # Code reference for agents
├── WORKFLOW.md                # Complete workflow guide
├── RECOMMENDATION_AGENT_WORKFLOW.md  # 10-agent system workflow
├── GITHUB_WORKFLOW.md         # GitHub integration
├── SECURITY_CHECKLIST.md      # Security requirements
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
| `stress-tester.md` | Performance testing |

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

### Using Agents
```
Use the architect agent to implement [feature]
Use the testing-agent to test [component]
Use the user-simulator agent to validate UX
```

### Full Workflow
```
/build [feature]   # Architect implementation
/test [component]  # Testing with coverage
/ux [feature]      # UX validation with personas
/spec [feature]    # Product specification
/sub [feature]     # Full multi-agent workflow
```

## Key Files

| File | Purpose |
|------|---------|
| `PROJECT_STATUS.md` | Current system status and metrics |
| `CODEBASE_SUMMARY.md` | Code reference for LLM context |
| `WORKFLOW.md` | Development workflow documentation |
| `settings.local.json` | Tool permissions and settings |

## Current Status

- **Version**: 2.2.0 (Production Ready)
- **Products**: 41,704
- **Attribute Coverage**: 99.7%
- **Tests**: 190/190 passing

See `PROJECT_STATUS.md` for detailed status.
