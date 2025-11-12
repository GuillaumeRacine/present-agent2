# Complete Documentation Index

**Last Updated**: October 29, 2025
**Version**: 2.1.0

---

## Quick Access by Need

### I want to...

**...understand what's currently happening**
→ [Deployment Status](DEPLOYMENT_STATUS.md) - Live Phase C deployment progress

**...understand the system architecture**
→ [Architecture](ARCHITECTURE.md) - Complete system design

**...use the API**
→ [API Documentation](API.md) - Endpoints and usage

**...deploy/run the system**
→ [README](../README.md) - Setup and quick start

**...monitor the deployment**
→ [Monitoring Guide](guides/MONITORING.md) - Monitoring commands

**...understand Phase C**
→ [Phase C Deploying](phases/PHASE_C_DEPLOYING.md) - Current deployment details

**...work on the codebase (LLM)**
→ [.claude/PROJECT_STATUS.md](../.claude/PROJECT_STATUS.md) - LLM context
→ [.claude/CODEBASE_SUMMARY.md](../.claude/CODEBASE_SUMMARY.md) - Code reference

---

## Documentation Structure

```
docs/
├── README.md                          # Documentation index
├── DOCUMENTATION_INDEX.md             # This file
├── DEPLOYMENT_STATUS.md               # ⭐ Live Phase C status
├── ARCHITECTURE.md                    # ⭐ System design
├── API.md                             # API reference
├── PROJECT_STATUS.md                  # System capabilities
│
├── phases/                            # Phase-specific docs
│   ├── PHASE_A_B_COMPLETE.md         # Vector expansion + whitelist removal
│   ├── PHASE_C_DEPLOYING.md          # ⭐ LLM interest extraction (LIVE)
│   └── PHASE_C_IMPLEMENTATION.md     # Original Phase C spec
│
├── guides/                            # Technical guides
│   ├── BATCHED_DEPLOYMENT.md         # Large-scale deployment patterns
│   ├── MONITORING.md                  # System monitoring
│   └── INTEREST_EXTRACTION.md        # (Future: Interest extraction details)
│
├── archive/                           # Historical docs
│   ├── COMPLETE_SETUP_SUMMARY.md
│   ├── ENHANCEMENTS_COMPLETE.md
│   ├── FIXES_COMPLETE.md
│   └── ... (older status documents)
│
└── [Other docs]
    ├── AGENTS.md                      # Agent architecture
    ├── contributor/                   # Contributor onboarding
    │   └── AGENTS.md                  # Repository guidelines
    ├── agents/                        # Agent-specific bundles
    │   ├── listener/                  # Listener enhancements + checklists
    │   ├── storyteller/               # Storyteller deep dives
    │   ├── meaning/                   # Meaning agent reports
    │   └── validator/                 # Validator improvements
    ├── performance/                   # Cache & explorer optimization
    │   ├── cache/                     # Cache implementation docs
    │   └── explorer/                  # Explorer performance reports
    ├── improvements/                  # Daily and rollout summaries
    ├── relationships/                 # Relationship modeling guides
    ├── quality/                       # QA strategy + validation
    ├── CONVERSATION_PERSISTENCE.md    # History storage
    ├── FRONTEND_GUIDE.md              # Frontend docs
    ├── FRONTEND_COMPLETE.md           # Frontend summary
    ├── GRAPH_SCHEMA_V2.md            # Database schema
    ├── PERSONA_TESTING_FRAMEWORK.md  # Testing guide
    ├── CLAUDE.md                      # Claude-specific docs
    └── product_vision.md              # Original vision

.claude/                               # Claude Code context
├── PROJECT_STATUS.md                  # ⭐ LLM-friendly status
├── CODEBASE_SUMMARY.md               # ⭐ Code quick reference
├── PROJECT_CONTEXT.md                 # Project context
├── README.md                          # Agent system guide
├── WORKFLOW.md                        # Agent workflows
└── ...
```

---

## Core Documentation (Start Here)

### 1. Deployment Status ⭐
**File**: [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
**Purpose**: Current state of all deployments
**When to read**: Want to know what's happening right now
**Highlights**:
- Phase A, B, C status
- Live deployment progress
- Current metrics
- Timeline and ETAs

### 2. Architecture ⭐
**File**: [ARCHITECTURE.md](ARCHITECTURE.md)
**Purpose**: Complete system design
**When to read**: Want to understand how it works
**Highlights**:
- 10-agent system
- Hybrid search strategy
- Data architecture
- LLM interest extraction
- Phase C deployment

### 3. API Documentation
**File**: [API.md](API.md)
**Purpose**: API endpoints and usage
**When to read**: Integrating with the system
**Highlights**:
- `/api/recommend` - Main endpoint
- `/api/conversations` - History
- `/api/products` - Product search
- Request/response formats

### 4. Main README
**File**: [../README.md](../README.md)
**Purpose**: Project overview and setup
**When to read**: First time setup
**Highlights**:
- Quick start guide
- Installation steps
- Running the system
- npm scripts

---

## Phase Documentation

### Phase A & B Complete ✅
**File**: [phases/PHASE_A_B_COMPLETE.md](phases/PHASE_A_B_COMPLETE.md)
**Status**: Deployed Oct 28, 2025
**Changes**:
- Vector search: 30 → 100 products
- Text fallback: 100% coverage
- Interest whitelist removed
- Graph utilization: 45% → 78%

### Phase C Deploying 🚀
**File**: [phases/PHASE_C_DEPLOYING.md](phases/PHASE_C_DEPLOYING.md)
**Status**: In progress (Batch 1/42)
**Changes**:
- LLM-powered interest extraction
- 156 → ~10,000+ interests
- Comprehensive product coverage
- Expected: +49-95% confidence, +233-329% graph score

---

## Technical Guides

### Batched Deployment
**File**: [guides/BATCHED_DEPLOYMENT.md](guides/BATCHED_DEPLOYMENT.md)
**Purpose**: How to run large-scale operations
**Topics**:
- Why batching?
- Checkpoint system
- Configuration options
- Error recovery
- Performance optimization

### Monitoring
**File**: [guides/MONITORING.md](guides/MONITORING.md)
**Purpose**: System monitoring and alerting
**Topics**:
- Health checks
- Log monitoring
- Performance tracking
- Phase C progress
- Troubleshooting

### Contributor Workflow
**File**: [contributor/AGENTS.md](contributor/AGENTS.md)
**Purpose**: Repository guidelines and contributor standards
**Topics**:
- Project structure and agent module layout
- Required dev/test commands
- Coding style and naming conventions
- Testing expectations and coverage targets
- Commit/PR checklist + security tips

---

## Reference Documentation

### Agents
**File**: [AGENTS.md](AGENTS.md)
**Purpose**: Agent system architecture
**Topics**:
- 10-agent descriptions
- Execution flow
- Agent responsibilities
- Communication patterns

### Graph Schema
**File**: [GRAPH_SCHEMA_V2.md](GRAPH_SCHEMA_V2.md)
**Purpose**: Neo4j database structure
**Topics**:
- Node types
- Relationships
- Indexes
- Queries

### Conversation Persistence
**File**: [CONVERSATION_PERSISTENCE.md](CONVERSATION_PERSISTENCE.md)
**Purpose**: History storage system
**Topics**:
- What gets stored
- Schema design
- Querying history
- Analytics

### Frontend
**File**: [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)
**Purpose**: Frontend implementation
**Topics**:
- Next.js structure
- Chat UI
- Conversation logs
- Product explorer

### Persona Testing
**File**: [PERSONA_TESTING_FRAMEWORK.md](PERSONA_TESTING_FRAMEWORK.md)
**Purpose**: Automated testing
**Topics**:
- How to run tests
- Creating personas
- Interpreting results
- Test metrics

---

## LLM Context Files (.claude/)

### Project Status
**File**: [.claude/PROJECT_STATUS.md](../.claude/PROJECT_STATUS.md)
**Purpose**: LLM-friendly current state
**Audience**: Claude Code, LLM tools
**Contents**:
- What's working
- Current deployment
- Critical paths
- Quick commands
- Emergency procedures

### Codebase Summary
**File**: [.claude/CODEBASE_SUMMARY.md](../.claude/CODEBASE_SUMMARY.md)
**Purpose**: Code quick reference
**Audience**: Claude Code, LLM tools
**Contents**:
- Project structure
- Agent execution flow
- Hybrid search code
- API patterns
- Common debugging

---

## By Audience

### For Developers

**Getting Started**:
1. [README](../README.md) - Setup
2. [Architecture](ARCHITECTURE.md) - System design
3. [Codebase Summary](../.claude/CODEBASE_SUMMARY.md) - Code reference

**Working on Code**:
1. [Project Status](../.claude/PROJECT_STATUS.md) - Current state
2. [Agents](AGENTS.md) - Agent architecture
3. [API](API.md) - Endpoints

**Deploying**:
1. [Deployment Status](DEPLOYMENT_STATUS.md) - Current deployments
2. [Batched Deployment](guides/BATCHED_DEPLOYMENT.md) - How to deploy
3. [Monitoring](guides/MONITORING.md) - How to monitor

### For Product/PM

**Understanding**:
1. [Deployment Status](DEPLOYMENT_STATUS.md) - Current state
2. [Architecture](ARCHITECTURE.md) - How it works
3. [Phase C Deploying](phases/PHASE_C_DEPLOYING.md) - Current deployment

**Metrics**:
1. [Deployment Status](DEPLOYMENT_STATUS.md) - Performance metrics
2. [Project Status](PROJECT_STATUS.md) - Capabilities

### For QA/Testing

**Testing**:
1. [Persona Testing](PERSONA_TESTING_FRAMEWORK.md) - Test framework
2. [API](API.md) - Endpoints to test
3. [Monitoring](guides/MONITORING.md) - Health checks

### For DevOps

**Operations**:
1. [Monitoring](guides/MONITORING.md) - Monitoring guide
2. [Batched Deployment](guides/BATCHED_DEPLOYMENT.md) - Deployment patterns
3. [Deployment Status](DEPLOYMENT_STATUS.md) - Current operations

**Database**:
1. [Graph Schema](GRAPH_SCHEMA_V2.md) - Neo4j schema
2. [Architecture](ARCHITECTURE.md) - Data architecture

### For AI/LLM Tools

**Context**:
1. [.claude/PROJECT_STATUS.md](../.claude/PROJECT_STATUS.md) - Current state
2. [.claude/CODEBASE_SUMMARY.md](../.claude/CODEBASE_SUMMARY.md) - Code reference
3. [Deployment Status](DEPLOYMENT_STATUS.md) - Live status

---

## By Topic

### Deployment
- [Deployment Status](DEPLOYMENT_STATUS.md) - Current status
- [Phase A & B Complete](phases/PHASE_A_B_COMPLETE.md) - Previous deployments
- [Phase C Deploying](phases/PHASE_C_DEPLOYING.md) - Current deployment
- [Batched Deployment](guides/BATCHED_DEPLOYMENT.md) - How to deploy

### Architecture
- [Architecture](ARCHITECTURE.md) - System design
- [Agents](AGENTS.md) - Agent system
- [Graph Schema](GRAPH_SCHEMA_V2.md) - Database
- [Codebase Summary](../.claude/CODEBASE_SUMMARY.md) - Code structure

### Operations
- [Monitoring](guides/MONITORING.md) - System monitoring
- [Deployment Status](DEPLOYMENT_STATUS.md) - Current state
- [Project Status](PROJECT_STATUS.md) - Capabilities

### Development
- [README](../README.md) - Getting started
- [API](API.md) - API reference
- [Codebase Summary](../.claude/CODEBASE_SUMMARY.md) - Code guide
- [Frontend Guide](FRONTEND_GUIDE.md) - Frontend

### Testing
- [Persona Testing](PERSONA_TESTING_FRAMEWORK.md) - Test framework
- [API](API.md) - Endpoint testing
- [Monitoring](guides/MONITORING.md) - Health checks

---

## Documentation Maintenance

### When to Update

**After Deployment**:
- [ ] Update [Deployment Status](DEPLOYMENT_STATUS.md)
- [ ] Update metrics in [Architecture](ARCHITECTURE.md)
- [ ] Update phase status (if applicable)
- [ ] Update [.claude/PROJECT_STATUS.md](../.claude/PROJECT_STATUS.md)

**After Code Changes**:
- [ ] Update relevant technical docs
- [ ] Update [Codebase Summary](../.claude/CODEBASE_SUMMARY.md) if structure changed
- [ ] Update [API](API.md) if endpoints changed

**Weekly**:
- [ ] Review and update metrics
- [ ] Archive old status docs
- [ ] Check for broken links

**Monthly**:
- [ ] Review all docs for accuracy
- [ ] Update screenshots/examples
- [ ] Consolidate related docs

### Documentation Standards

**File Naming**:
- Use UPPERCASE for main docs (e.g., `README.md`)
- Use lowercase for guides (e.g., `monitoring.md`)
- Use descriptive names (e.g., `PHASE_C_DEPLOYING.md`)

**Structure**:
- Start with overview/summary
- Use clear headings (##, ###)
- Include code examples where helpful
- Add timestamps and version numbers
- Link to related docs

**Writing Style**:
- Clear, concise language
- Active voice
- Present tense for current state
- Past tense for completed work
- Future tense for planned work

**Formatting**:
- Use status indicators: ✅ ⚠️ 🚀 ⏳ ❌
- Use tables for comparisons
- Use code blocks with language tags
- Use links liberally
- Use lists for readability

---

## Missing/Future Documentation

**Planned**:
- [ ] Interest Extraction Guide (detailed LLM extraction)
- [ ] Performance Tuning Guide
- [ ] Production Deployment Guide
- [ ] Backup and Recovery Guide
- [ ] Security Best Practices
- [ ] Cost Optimization Guide

**Would Be Helpful**:
- [ ] Video walkthroughs
- [ ] Architecture diagrams (visual)
- [ ] API client examples
- [ ] Troubleshooting flowcharts
- [ ] Migration guides

---

## Quick Links by File Type

### Markdown Documentation
- All `.md` files in `docs/`
- All `.md` files in `.claude/`
- Main `README.md`

### Code Documentation
- TSDoc comments in `src/`
- Type definitions in `src/types/`

### Configuration
- `.env.local` (not in repo)
- `package.json`
- `tsconfig.json`

### Data/State
- `data/interest-rebuild-state.json`
- `data/interest-stats.json`

### Logs
- `logs/combined.log`
- `logs/error.log`
- `data/rebuild-batch-*.log`

---

## Getting Help

**Can't find what you need?**
1. Check this index for the right document
2. Use in-document search (Ctrl+F)
3. Check related documents (linked at bottom of each doc)
4. Check `.claude/` for LLM context

**Documentation outdated?**
1. Check [Deployment Status](DEPLOYMENT_STATUS.md) for latest
2. Check git history for recent changes
3. Update and submit PR

**Need more detail?**
1. Check related technical guides
2. Review source code
3. Check logs for real-time state
4. Ask in team chat

---

## Summary

**Total Documents**: 30+ files
**Core Docs**: 10 essential files
**Phase Docs**: 3 files
**Guides**: 2+ files
**Reference**: 8+ files
**LLM Context**: 2 files

**Most Important Right Now**:
1. ⭐ [Deployment Status](DEPLOYMENT_STATUS.md) - Phase C deploying
2. ⭐ [Phase C Guide](phases/PHASE_C_DEPLOYING.md) - Current deployment
3. ⭐ [Monitoring Guide](guides/MONITORING.md) - How to monitor

**For Development**:
1. ⭐ [Architecture](ARCHITECTURE.md) - System design
2. ⭐ [Codebase Summary](../.claude/CODEBASE_SUMMARY.md) - Code reference
3. ⭐ [API Docs](API.md) - Endpoints

---

**Last Updated**: October 29, 2025, 18:00
**Version**: 2.1.0 (Phase C deploying)
**Maintainer**: Development team
