# Present-Agent2

AI-powered gift recommendation engine using Neo4j graph database, vector embeddings, and multi-agent workflow.

## Overview

Present-Agent2 is a conversational AI assistant that provides highly relevant gift recommendations that feel like advice from a caring friend. It combines three powerful layers:
1. **Graph Database** - Structured relationships and context
2. **Vector Embeddings** - Semantic understanding
3. **Multi-Agent Workflow** - Specialized intelligence

**Core Innovation:** The system doesn't just match keywords or collaborative filtering - it understands WHY you're giving a gift, WHO the recipient is, and WHAT would be meaningful.

## Product Vision

See [`product_vision.md`](product_vision.md) and [`SYSTEM_COHERENCE_REVIEW.md`](SYSTEM_COHERENCE_REVIEW.md) for complete details.

**Key Goals:**
- Learn from minimal conversational input
- Provide 3-5 highly relevant recommendations with personal reasoning
- Remember context across sessions
- Get smarter over time from all user feedback

**Current Status:** ✅ Architecture designed and validated - Ready for implementation

## Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│                   MULTI-AGENT WORKFLOW                      │
│  Listener → Memory → Relationship → Constraints → Meaning   │
│              ↓                                               │
│           Explorer (Discovery Engine)                       │
│              ↓                                               │
│           Validator (Quality Gate)                          │
│              ↓                                               │
│           Storyteller (Personal Reasoning)                  │
│              ↓                                               │
│           Presenter (User Experience)                       │
│              ↓                                               │
│           Learning (Feedback Loop)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              NEO4J GRAPH DATABASE LAYER                     │
│                                                              │
│  Nodes: User, Recipient, Product, Interest, Value,         │
│         Occasion, ConversationTurn, Recommendation          │
│                                                              │
│  Edges: HAS_RELATIONSHIP, INTERESTED_IN, MATCHES_INTEREST,  │
│         SUITABLE_FOR, COMPLEMENTS, etc.                     │
│                                                              │
│  Learning: Weights updated from user feedback              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            VECTOR EMBEDDINGS LAYER                          │
│                                                              │
│  Multiple embeddings per entity:                           │
│  - Products: product, style, sentiment, use_case           │
│  - Users: profile, value, style                            │
│  - Recipients: interest, personality                        │
│                                                              │
│  Hybrid Search: Graph (60%) + Embeddings (40%)            │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Language:** TypeScript (strict mode)
- **Database:** Neo4j 5.x (graph + vector indexes)
- **Embeddings:** OpenAI (text-embedding-3-small)
- **Runtime:** Node.js 20+
- **Frontend:** Next.js + Vercel (planned)

### What Makes This Different

Unlike traditional recommendation systems:
- **Context-Aware:** Understands WHY you're giving (occasion, emotional context)
- **Relationship-Intelligent:** Calibrates to social dynamics (new relationship vs. close family)
- **Emotionally Resonant:** Recommends what matters, not just what matches
- **Conversationally Efficient:** Learns from minimal input
- **Self-Improving:** Network effect from all user outcomes
- **Transparent:** Explains reasoning like a friend would

## Documentation

### Core Docs
- [`product_vision.md`](product_vision.md) - Product vision and goals
- [`GRAPH_SCHEMA_V2.md`](GRAPH_SCHEMA_V2.md) - Complete graph database schema
- [`SYSTEM_COHERENCE_REVIEW.md`](SYSTEM_COHERENCE_REVIEW.md) - Architecture validation

### Agent Definitions
All 10 recommendation agents documented in `.claude/agents/`:
1. **[listener-agent.md](.claude/agents/listener-agent.md)** - Deep context extraction
2. **[memory-agent.md](.claude/agents/memory-agent.md)** - History and patterns
3. **[relationship-agent.md](.claude/agents/relationship-agent.md)** - Social dynamics
4. **[constraints-agent.md](.claude/agents/constraints-agent.md)** - Requirements validation
5. **[meaning-agent.md](.claude/agents/meaning-agent.md)** - Emotional intelligence
6. **[explorer-agent.md](.claude/agents/explorer-agent.md)** - Product discovery
7. **[validator-agent.md](.claude/agents/validator-agent.md)** - Quality gate
8. **[storyteller-agent.md](.claude/agents/storyteller-agent.md)** - Personal reasoning
9. **[presenter-agent.md](.claude/agents/presenter-agent.md)** - User experience
10. **[learning-agent.md](.claude/agents/learning-agent.md)** - Feedback loop

### Workflow Overview
See [`.claude/RECOMMENDATION_AGENT_WORKFLOW.md`](.claude/RECOMMENDATION_AGENT_WORKFLOW.md) for complete workflow documentation.

## Getting Started

### Prerequisites
- Node.js 20+
- Neo4j 5.x (local or cloud)
- OpenAI API key

### Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys and Neo4j credentials

# Setup Neo4j schema
npm run setup:schema

# (Planned) Ingest product data
npm run ingest

# (Planned) Run CLI test interface
npm run cli
```

### Environment Variables
```bash
# .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=present-agent

OPENAI_API_KEY=sk-...
```

## Project Structure
```
Present-Agent2/
├── .claude/                    # Agent system
│   ├── agents/                # 10 agent definitions
│   │   ├── listener-agent.md
│   │   ├── memory-agent.md
│   │   ├── relationship-agent.md
│   │   ├── constraints-agent.md
│   │   ├── meaning-agent.md
│   │   ├── explorer-agent.md
│   │   ├── validator-agent.md
│   │   ├── storyteller-agent.md
│   │   ├── presenter-agent.md
│   │   └── learning-agent.md
│   └── RECOMMENDATION_AGENT_WORKFLOW.md
├── src/                       # Source code (to be implemented)
│   ├── lib/                  # Neo4j, OpenAI, logging
│   ├── services/             # Agent implementations
│   └── orchestrator.ts       # Agent workflow orchestration
├── scripts/                   # Setup and ingestion scripts
├── GRAPH_SCHEMA_V2.md        # Complete graph schema
├── SYSTEM_COHERENCE_REVIEW.md # Architecture validation
├── product_vision.md          # Product requirements
└── README.md                  # This file
```

## Implementation Roadmap

### ✅ Phase 1: Design (COMPLETE)
- [x] Graph database schema designed
- [x] Multi-agent workflow designed
- [x] 10 agent definitions written
- [x] System coherence validated

### Phase 2: Core Implementation (NEXT)
- [ ] Implement Neo4j schema setup
- [ ] Build agent orchestration system
- [ ] Implement context passing between agents
- [ ] Build Explorer agent (graph + embeddings search)
- [ ] Create CLI testing interface

### Phase 3: Frontend & Learning
- [ ] Build Next.js conversational UI
- [ ] Implement Learning agent feedback loop
- [ ] Add user authentication (Google OAuth)
- [ ] Create metrics dashboard

### Phase 4: Testing & Validation
- [ ] Build user simulator for testing
- [ ] A/B test different algorithms
- [ ] Measure against product assumptions
- [ ] Validate recommendation quality

## Success Metrics

### Target Metrics
- **Recommendation relevance:** > 8.0/10
- **User satisfaction:** > 80%
- **Response time:** < 2000ms
- **Conversation efficiency:** < 5 turns to confident recommendation

### Product Assumptions to Validate
1. Graph DB recommendations > collaborative filtering
2. LLMs extract context clicks don't capture
3. Vector embeddings + graph traversal = superior quality
4. No manual faceting needed - inference-based approach works
5. Conversational UI reduces user effort

## License

[License TBD]

---

**Status:** ✅ Architecture complete and validated - Ready for implementation
**Next Step:** Implement agent orchestration system
