# Present Agent2 - Complete Context Index

> Cross-reference to all relevant context files in Guillaume's system

---

## Master Context Files

### 1. InnerOS Core Identity

| File | Path | Relevant Content |
|------|------|-----------------|
| **Master Context** | `~/Obs_Vault/0_InnerContext/Self_Context/master_context.md` | Core identity, family, ADHD, 2026 focus |
| **LLM Instructions** | `~/Obs_Vault/0_InnerContext/Self_Context/llm_instructions.md` | **CRITICAL** - Communication style, onion peel learning, ADHD considerations |
| **Coding Context** | `~/Obs_Vault/0_InnerContext/Self_Context/coding.md` | Lines 289-294: present-agent2 details, multi-agent patterns |
| **Workflows** | `~/Obs_Vault/0_InnerContext/Self_Context/workflows.md` | Morning focus, mission-critical work, closure matters |
| **Architecture** | `~/Obs_Vault/0_InnerContext/Self_Context/architecture.md` | InnerOS system design principles |

**Key Takeaways:**
- Guillaume has ADHD - fragmentation is costly, close loops
- 2026 focus: AI product studio, weekly prototyping
- Communication: Direct, tables > bullets, challenge assumptions
- Learning style: Onion peel (broad → deep, layer by layer)

---

### 2. InnerOS Operating System

| File | Path | Key Principles |
|------|------|----------------|
| **Values** | `~/Obs_Vault/0_InnerContext/Operating System/values.md` | 7 core values |
| **Principles** | `~/Obs_Vault/0_InnerContext/Operating System/principles.md` | Operating rules |
| **Daily Structure** | `~/Obs_Vault/0_InnerContext/Operating System/daily_structure.md` | Morning = mission-critical cognitive work |
| **Boundaries** | `~/Obs_Vault/0_InnerContext/Operating System/boundaries.md` | Anti-goals, what to avoid |

**Key Principles for This Project:**
- **Containment over optionality** (bounded scope)
- **Regulation before optimization** (system must work first)
- **Completion over exploration** (ship MVP, don't endless tinker)
- **Embodied identity** (actually use the system)

---

### 3. Goals & Priorities (2026)

| File | Path | Relevance |
|------|------|-----------|
| **Intentions 2026** | `~/Obs_Vault/0_InnerContext/Goals/intentions_2026.md` | Year-level commitments |
| **Goals 2026** | `~/Obs_Vault/0_InnerContext/Goals/goals_2026.md` | Self, Work, Life goals |
| **Q1 2026** | `~/Obs_Vault/0_InnerContext/Goals/Quarterly/q1_2026.md` | Current quarter priorities |

**Relevant Goals:**
- Start M.Sc. in ML @ McGill (applied)
- Build & ship small prototypes fast & often
- Weekly prototyping cadence
- Present Agent2 = prototyping practice

---

### 4. Coaching Agents (Mark Manson Framework)

| Agent | File | When to Invoke |
|-------|------|----------------|
| **The Operator** | `~/Obs_Vault/0_InnerContext/Coaching/Coaches/02_The_Operator.md` | Stuck in planning, not shipping |
| **The Shadow** | `~/Obs_Vault/0_InnerContext/Coaching/Coaches/07_The_Shadow.md` | Avoiding something, self-deception |
| **The Executive Coach** | `~/Obs_Vault/0_InnerContext/Coaching/Coaches/08_The_Executive_Coach.md` | Need clarity, commitments |

**Agent Framework:** `~/Obs_Vault/0_InnerContext/Coaching/AGENTS.md`

**Relevance:**
- The Operator: Ship Present Agent2 MVP (don't overthink)
- The Shadow: Are we avoiding the hard parts?

---

### 5. Workflows (Execution Patterns)

| File | Path | Relevance |
|------|------|-----------|
| **All Workflows** | `~/Obs_Vault/0_InnerContext/Workflows/all_workflows.md` | 50+ workflow inventory |
| **Workflow Map** | `~/Obs_Vault/0_InnerContext/Workflows/workflow_map.md` | Master index |
| **WORKFLOW_INDEX** | `~/Obs_Vault/0_InnerContext/Workflows/WORKFLOW_INDEX.md` | PARA mapping |
| **Writing Agents** | `~/Obs_Vault/0_InnerContext/Workflows/Writing/Agents/` | 12-stage writing pipeline |
| **Crypto Workflows** | `~/Obs_Vault/0_InnerContext/Workflows/Crypto/` | DeFi position tracking |

**Patterns to Reference:**
- Writing Agents (12-stage pipeline) → similar multi-agent orchestration
- Narrative Architect → how to tell gift "story"
- Outline Strategist → how to structure recommendations

---

### 6. Data Feeds & Tracking

| File | Path | Relevance |
|------|------|-----------|
| **Data Feeds** | `~/Obs_Vault/0_InnerContext/Tracking/data_feeds.md` | 370+ lines, structured by domain |
| **Data Feeds Brainstorm** | `~/Obs_Vault/0_InnerContext/Coaching/Resources/Data_Feeds_Brainstorm.md` | 1387 lines, 150+ sources |
| **Metrics** | `~/Obs_Vault/0_InnerContext/Tracking/metrics.md` | What gets tracked |

**Potential Future Feature:**
- Integrate gift history tracking into InnerOS data feeds
- Track gift success rates, recipient reactions
- Close the loop (did they like it?)

---

### 7. Multi-Agent Reference Projects

| Project | Location | Pattern to Learn From |
|---------|----------|----------------------|
| **MILA Multi-Agent** | `~/Obs_Vault/0_InnerContext/mila_multi_agent_product_discovery.md` | Multi-agent product discovery |
| **Writing Agents** | `~/Obs_Vault/0_InnerContext/Workflows/Writing/Agents/` | 12-agent pipeline for content |
| **Tao Substack RAG** | GitHub: `tao-substack-daily-notes` | RAG system architecture |
| **EmailLLM2** | GitHub: `emailLLM2` | Multi-agent orchestration |

---

## Project-Specific Documentation

### Seagate SSD (Primary Location)

**Root:** `/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/`

| File | Purpose |
|------|---------|
| `CLAUDE.md` | **START HERE** - Hub document (~120 lines) with doc index |
| `docs/DATA_SOURCES.md` | Product catalog, enrichment pipeline, data locations |
| `docs/DATABASE_SCHEMA.md` | Neo4j nodes, relationships, indexes, vector embeddings |
| `docs/LOCAL_INFRASTRUCTURE.md` | Docker setup, start-local.sh, enrichment pipeline |
| `docs/AGENT_REGISTRY.md` | 10 runtime agents + 26 Claude Code meta-agents |
| `docs/API_ENDPOINTS.md` | Backend + frontend API routes |
| `docs/ROADMAP.md` | Phase 1-3 features, performance targets |
| `docs/CONTEXT_INDEX.md` | This file - cross-references |
| `research/RESEARCH_INDEX.md` | 14 papers, key insights |
| `data/DATA_MANIFEST.md` | Complete data inventory |

### Python Enrichment Pipeline

**Location:** `scripts/product_enrichment/`

| Script | Purpose |
|--------|---------|
| `shopify_scraper.py` | Scrape Shopify storefronts for reviews and bestsellers |
| `review_parser.py` | Parse and analyze product reviews |
| `recipient_signals.py` | Extract recipient-fit signals |
| `composite_scorer.py` | Multi-factor gift scoring |
| `load_neo4j.py` | Load enriched products into local Neo4j |
| `run_pipeline.sh` | Orchestrate full pipeline |

### Docker / Local Infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Neo4j 5-community container config |
| `start-local.sh` | Full startup: Docker + schema + data load |
| `neo4j-data/` | Persistent Neo4j data volume |

---

### Shared Vault (Obsidian)

**Root:** `~/Obs_Vault/1_Projects/Present_Agent2/`

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | Vault-based overview, links to Seagate |
| `research/` | Paper summaries, insights |
| `data/` | Product data notes |
| `docs/` | Design docs, decisions |
| `planning/` | Roadmap, feature specs |

---

## External Data Sources

### Product Catalog

**Location:** `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`

**Files:**
- `PresentAgentList-1.json` through `PresentAgentList-21.json` (102MB total)
- `master.json` (26.9MB)
- `BCorps_Products_Cleaned.json` (9.3MB)

**Access:**
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/
ls -lh PresentAgentList-*.json
```

---

### Research Papers

**Location:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`

**Papers:** 14 academic papers on gift psychology (see RESEARCH_INDEX.md)

**Access:**
```bash
cd /Volumes/Seagate\ 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research\ Papers/Gifts/
ls -lh *.md
```

---

### Original Codebase (Archived)

Codebase migrated from Crucial X8 to Seagate (Feb 2026). All active development is on the Seagate location.

---

## GitHub Context

### Repository

**Repo:** `GuillaumeRacine/present-agent2`
**Status:** Private
**Auth:** Need to run `gh auth login`

**Related Repos:**
- `tao-substack-daily-notes` - RAG system reference
- `emailLLM2` - Multi-agent orchestration example
- `defi-portfolio-dashboard` - Real-time dashboard patterns

**GitHub Projects Board:**
- https://github.com/users/GuillaumeRacine/projects/4
- Master board for prototypes, tasks, shipped items

---

## Critical Context Rules

### For LLM Agents

**Reading Order:**
1. **Root CLAUDE.md** (hub doc with doc index, ~120 lines)
2. **docs/AGENT_REGISTRY.md** (understand the 10 runtime + 26 meta agents)
3. **src/.claude/CODEBASE_SUMMARY.md** (code patterns, key files)
4. **docs/DATABASE_SCHEMA.md** (Neo4j data model)
5. **Guillaume's llm_instructions.md** (how to interact)
6. **Guillaume's coding.md** (tech patterns, multi-agent systems)
7. **Research papers** (gift psychology - see research/RESEARCH_INDEX.md)

**Communication Style:**
- Direct, no fluff
- Tables > bullets > prose
- Challenge assumptions
- Truth over comfort
- Focus on leverage points

**ADHD Considerations:**
- Fragmentation is costly (don't context switch)
- Close loops (bounded work, clear completion)
- Regulation before optimization (make it work first)
- Clear completion criteria

**Learning Style (Onion Peel):**
```
Layer 1: Bird's Eye    → What is it? When to use?
Layer 2: Core Mechanics → How does it work?
Layer 3: Implementation → Details, code, edge cases
Layer 4: Insights       → Why this design? Trade-offs?
```

**Don't:**
- Add emojis
- Use filler language ("Great question!")
- Hedge excessively
- Validate just to be agreeable
- Skip to implementation before understanding architecture

**Do:**
- Get straight to the point
- Provide structured outputs (tables)
- Challenge thinking
- Point out blind spots
- Connect across domains

---

## Cross-Project Learning

### Patterns from Other Projects

| Pattern | Source Project | Apply to Present Agent2 |
|---------|----------------|-------------------------|
| **12-agent pipeline** | Writing Agents | Inspiration for 10-agent orchestration |
| **RAG architecture** | Tao Substack | Vector + graph hybrid search |
| **Multi-chain dashboard** | DeFi Portfolio | Real-time Neo4j queries |
| **Email triage** | EmailLLM2 | Agent orchestration patterns |
| **Research synthesis** | MILA Multi-Agent | Product discovery workflow |

### Architecture Patterns (from coding.md)

**1. Multi-Agent Pattern (present-agent2):**
```
User Query → Listener → Memory → Relationship/Constraints →
Explorer → Validator → Presenter
```

**2. RAG Pipeline Pattern (tao-substack):**
```
Knowledge Base → Chunking → Embeddings → Vector Store →
Semantic Search + Claude → Generated Content
```

**3. DeFi Dashboard Pattern:**
```
Wallet Address → Multi-chain RPC → Protocol SDKs →
Position aggregation → Real-time dashboard
```

**Apply to Present Agent2:**
- Agent orchestration from multi-agent pattern
- Hybrid search from RAG pattern
- Real-time updates from DeFi pattern

---

## Integration Opportunities

### With InnerOS

**Potential Future:**
- Track gift history in InnerOS data feeds
- Integrate with weekly review (did gifts succeed?)
- Use relationship modeling for other contexts
- Export recommendations to Notion/Obsidian

**Current:**
- Keep as standalone prototype
- Document learnings for InnerOS integration later
- Focus on MVP, not over-engineering

---

## Quick Reference Commands

### Navigate to Context Files

```bash
# Master context
cat ~/Obs_Vault/0_InnerContext/Self_Context/master_context.md | head -200

# LLM instructions (CRITICAL)
cat ~/Obs_Vault/0_InnerContext/Self_Context/llm_instructions.md

# Coding context (present-agent2 section)
cat ~/Obs_Vault/0_InnerContext/Self_Context/coding.md | grep -A 50 "present-agent2"

# Workflows
cat ~/Obs_Vault/0_InnerContext/Self_Context/workflows.md

# Multi-agent reference
cat ~/Obs_Vault/0_InnerContext/mila_multi_agent_product_discovery.md
```

### Access Data

```bash
# Product catalog
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/

# Research papers
cd /Volumes/Seagate\ 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research\ Papers/Gifts/

# Project location
cd /Volumes/Seagate\ 2TB/1_Projects/Protoypes/present-agent2/
```

### Open in Obsidian

```bash
# Open vault project context
open "obsidian://open?vault=Shared%20Vault&file=1_Projects/Present_Agent2/PROJECT_CONTEXT"

# Open master context
open "obsidian://open?vault=Shared%20Vault&file=0_InnerContext/Self_Context/master_context"

# Open coding context
open "obsidian://open?vault=Shared%20Vault&file=0_InnerContext/Self_Context/coding"
```

---

## Context Validation Checklist

When starting work on Present Agent2, verify:

- [ ] Read Seagate `CLAUDE.md`
- [ ] Read Guillaume's `llm_instructions.md`
- [ ] Read Guillaume's `coding.md` (present-agent2 section)
- [ ] Understand ADHD constraints (close loops, minimize fragmentation)
- [ ] Understand communication style (direct, tables, challenge)
- [ ] Understand learning style (onion peel, broad → deep)
- [ ] Review research papers (gift psychology)
- [ ] Check data manifest (product catalog)
- [ ] Understand 2026 goals (weekly prototyping, ship fast)
- [ ] Know the core principles (containment, regulation, completion)

---

## Missing Context? Add Here

If you discover missing context files or links, document them:

**To Add:**
- [ ] Agent implementation patterns from Writing Agents
- [ ] Specific Neo4j patterns from other projects
- [ ] API integration patterns (NewsAPI, etc.)
- [ ] Testing strategies from other prototypes

---

*This index ensures LLM agents have complete context and know where to find everything.*

*Last updated: 2026-02-17*
