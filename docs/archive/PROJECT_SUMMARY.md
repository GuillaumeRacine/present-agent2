# Present Agent2 - Project Setup Complete

> Created: 2026-02-15 | Status: Ready for code migration

---

## What Was Created

### Seagate SSD Structure

```
/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/
├── CLAUDE.md                     # ★ Complete LLM context (12KB)
├── README.md                     # Quick overview & setup
├── MIGRATION_CHECKLIST.md        # Step-by-step migration guide
├── PROJECT_SUMMARY.md            # This file
├── docs/
│   └── CONTEXT_INDEX.md          # Cross-references to all InnerOS files
├── data/
│   └── DATA_MANIFEST.md          # Complete data inventory
├── research/
│   └── RESEARCH_INDEX.md         # 14 papers, key insights
├── agents/                       # (empty, ready for code)
└── src/                          # (empty, ready for code)
```

### Shared Vault Structure

```
~/Obs_Vault/1_Projects/Present_Agent2/
├── PROJECT_CONTEXT.md            # Vault overview, links to Seagate
├── research/                     # (empty, ready for summaries)
├── data/                         # (empty, ready for notes)
├── docs/                         # (empty, ready for design docs)
└── planning/                     # (empty, ready for roadmap)
```

---

## Documentation Created (8 files)

| File | Size | Purpose |
|------|------|---------|
| **CLAUDE.md** | 12KB | Complete context for LLM agents - START HERE |
| **README.md** | 2KB | Quick overview, setup instructions |
| **DATA_MANIFEST.md** | 5KB | Product catalog + research papers inventory |
| **RESEARCH_INDEX.md** | 12KB | 14 papers, insights, implications |
| **CONTEXT_INDEX.md** | 10KB | Cross-references to InnerOS files |
| **MIGRATION_CHECKLIST.md** | 8KB | Step-by-step migration guide |
| **PROJECT_CONTEXT.md** (vault) | 3KB | Vault-based overview |
| **PROJECT_SUMMARY.md** | This file | Setup summary |

**Total:** ~52KB of comprehensive documentation

---

## Key Features of CLAUDE.md

### Complete LLM Context

- **Architecture**: 10-agent system design
- **Tech Stack**: Next.js, Neo4j, OpenAI, Cohere
- **Data Sources**: 102MB B-Corp products, 14 research papers
- **Research Insights**: Gift psychology, multi-perspective optimization
- **Database Schema**: Neo4j graph structure
- **API Endpoints**: Expected routes
- **Development Setup**: Environment, Neo4j, migration steps
- **For LLM Agents**: Reading order, communication style, ADHD considerations

### Cross-Referenced Context

Links to all relevant files:
- Guillaume's master_context.md
- Guillaume's llm_instructions.md (CRITICAL)
- Guillaume's coding.md (present-agent2 section)
- Guillaume's workflows.md
- InnerOS values, principles, goals
- Coaching agents
- Related projects (tao-substack, emailLLM2)

---

## Research Foundation

### 14 Academic Papers Indexed

**Core Papers:**
1. Gift recommendation systems: a review (2025)
2. Gift giving in the age of AI (Fu, 2024)
3. Integrative review of gift-giving research (Givi, 2023)
4. Gifts that reflect givers promote closeness
5. Giver-receiver discrepancy (Peng, 2024)
6. Power dynamics: Boss vs subordinate
7. Self-gifting consumer behavior
8. Understanding AI impact on charitable giving (Yang, 2024)
9-14. Additional papers on psychology, systems

**Key Insights Extracted:**
- Optimize for BOTH giver and receiver
- Social closeness modulates strategy
- Context > preferences
- Explainability builds trust
- Price-appreciation asymmetry

**Implications for Design:**
- Multi-agent architecture based on research
- Database schema includes closeness, power dynamics
- Recommendation algorithm weights by relationship
- Explanation templates structured

---

## Data Sources Documented

### Product Catalog (102MB)

**Location:** `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`

- 21 JSON files: PresentAgentList-1 through 21
- 1.28M product records
- B-Corp certified brands
- Created Nov 2023

**Schema documented, sample brands identified**

### Research Papers (~750KB)

**Location:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`

- 14 markdown files
- Date range: 2023-2025
- Ready for symlink or copy

---

## Migration Readiness

### Pre-Migration Complete ✓

- [x] Project structure created
- [x] Documentation written
- [x] Research indexed
- [x] Data inventoried
- [x] Context cross-referenced
- [x] Migration checklist created

### Next Steps (When Crucial X8 Connected)

1. **Mount Drive**
   - Connect Crucial X8 SSD
   - Navigate to `/Volumes/Crucial/X8/Code/Present/Agent2/`

2. **Copy Codebase**
   - Run rsync to Seagate location
   - Copy .env.local (API keys)
   - Verify Git status

3. **Migrate Data**
   - Copy product data from iCloud (102MB)
   - Symlink or copy research papers (750KB)

4. **Setup Environment**
   - npm install
   - Start Neo4j (Docker or Desktop)
   - Load product data
   - Generate embeddings
   - Build graph relationships

5. **Verify**
   - Test agents
   - Start dev server
   - Query recommendations

6. **Resume Work**
   - Complete NewsAPI integration (Dec 11, 2025 session)
   - Continue development

**Estimated migration time:** 30-60 minutes (plus embedding generation ~30-60 min)

---

## What LLM Agents Need to Know

### Reading Order

1. **Seagate CLAUDE.md** ← Start here (comprehensive)
2. **Guillaume's llm_instructions.md** ← Communication style (CRITICAL)
3. **Guillaume's coding.md** ← Tech patterns
4. **Master_context.md** ← If needed (core identity)
5. **Research papers** ← Gift psychology
6. **Data manifest** ← Product catalog

### Key Context Rules

**Communication:**
- Direct, no fluff
- Tables > bullets > prose
- Challenge assumptions
- Truth over comfort

**ADHD Considerations:**
- Fragmentation is costly
- Close loops (bounded work)
- Regulation before optimization
- Clear completion criteria

**Learning Style (Onion Peel):**
- Layer 1: Bird's eye (what is it?)
- Layer 2: Core mechanics (how does it work?)
- Layer 3: Implementation (details, code)
- Layer 4: Insights (why, trade-offs)

**Project Principles:**
- Containment over optionality (bounded scope)
- Completion over exploration (ship MVP)
- Multi-perspective optimization (giver + receiver)
- Explainability builds trust

---

## Integration with InnerOS

### Current Setup

- Project exists in `/Volumes/Seagate 2TB/` (active codebase)
- Documentation in `~/Obs_Vault/1_Projects/Present_Agent2/` (planning, research)
- Linked to all relevant InnerOS context files
- Part of 2026 weekly prototyping cadence

### Future Integration Opportunities

- Track gift history in InnerOS data feeds
- Integrate with weekly review
- Use relationship modeling for other contexts
- Export recommendations to Notion/Obsidian

**Current strategy:** Keep as standalone prototype, document learnings for later integration

---

## Related Projects (Reference Patterns)

| Project | Pattern to Reference |
|---------|---------------------|
| **tao-substack-daily-notes** | RAG system architecture |
| **emailLLM2** | Multi-agent orchestration |
| **defi-portfolio-dashboard** | Real-time Neo4j queries |
| **MILA Multi-Agent** | Product discovery workflow |
| **Writing Agents** | 12-stage pipeline |

---

## Quick Access Commands

### Navigate

```bash
# Seagate project
cd /Volumes/Seagate\ 2TB/1_Projects/Protoypes/present-agent2/

# Read complete context
cat CLAUDE.md | less

# Vault project
cd ~/Obs_Vault/1_Projects/Present_Agent2/

# Open in Obsidian
open "obsidian://open?vault=Shared%20Vault&file=1_Projects/Present_Agent2/PROJECT_CONTEXT"
```

### Access Data

```bash
# Product catalog
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/

# Research papers
cd /Volumes/Seagate\ 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research\ Papers/Gifts/

# InnerOS context
cat ~/Obs_Vault/0_InnerContext/Self_Context/llm_instructions.md
cat ~/Obs_Vault/0_InnerContext/Self_Context/coding.md | grep -A 50 "present-agent2"
```

### Start Work

```bash
# When Crucial X8 is connected:
# 1. Open MIGRATION_CHECKLIST.md
# 2. Follow steps Phase 1-8
# 3. Resume NewsAPI integration

# After migration:
cd /Volumes/Seagate\ 2TB/1_Projects/Protoypes/present-agent2/src/
docker start neo4j-present-agent
npm run dev
```

---

## Success Metrics

### Documentation Complete ✓

- [x] Comprehensive CLAUDE.md for LLM agents
- [x] Complete research index with insights
- [x] Data manifest with all sources
- [x] Context index linking to InnerOS
- [x] Migration checklist with troubleshooting
- [x] Vault PROJECT_CONTEXT linking everything

### Ready for Migration

- [x] Folder structure created
- [x] All paths documented
- [x] Cross-references complete
- [x] No missing context identified
- [ ] Crucial X8 connected (pending)
- [ ] Code migrated (pending)
- [ ] Data loaded (pending)
- [ ] Environment running (pending)

### Ready for Development

- [ ] Neo4j setup
- [ ] Product data loaded
- [ ] Embeddings generated
- [ ] Agents functional
- [ ] NewsAPI integration resumed

---

## What's Next

### Immediate (When Drive Connected)

1. Connect Crucial X8 SSD
2. Follow MIGRATION_CHECKLIST.md
3. Verify all files copied
4. Setup development environment
5. Test system end-to-end

### Near Term (This Week)

1. Complete NewsAPI integration (from Dec 11 session)
2. Test recommendation flow
3. Validate against research insights
4. Document any architecture changes
5. Add tests for agents

### Medium Term (This Month)

1. Launch MVP with basic recommendations
2. Test with real use cases (Guillaume + Lisa scenario)
3. Gather feedback
4. Iterate on recommendation algorithm
5. Improve explainability

---

## Notes

### Why This Setup Matters

**For LLM Agents:**
- Complete context in one place (CLAUDE.md)
- Clear reading order
- Cross-references to all relevant files
- Research insights applied to design
- Communication style documented

**For Guillaume:**
- Bounded scope (not over-engineered)
- Clear completion criteria
- Tied to 2026 prototyping goals
- ADHD-friendly (close loops, clear next steps)
- Part of ML learning journey

**For Future Development:**
- Research-backed design decisions
- Comprehensive data inventory
- Migration path documented
- Integration opportunities identified
- Pattern library for other projects

---

## Contact & Resources

**GitHub:** `GuillaumeRacine/present-agent2` (private, needs gh auth)
**Guillaume:** guillaume.racine.gr@gmail.com
**Last Worked:** Dec 11, 2025 (NewsAPI integration)
**Created:** Feb 15, 2026 (This setup)

**External Resources:**
- Neo4j: https://neo4j.com/
- Cohere: https://cohere.com/
- OpenAI: https://openai.com/
- NewsAPI: https://newsapi.org/

---

*Project setup complete. Ready for code migration and development.*

*For questions, read CLAUDE.md or ask Claude Code with project context:*
```bash
claude --cwd="/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2"
```

*Last updated: 2026-02-15*
