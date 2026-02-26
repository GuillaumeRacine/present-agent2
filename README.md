# Present Agent2 - AI Gift Recommendation System

> 10-agent architecture for intelligent, ethical gift recommendations

---

## Quick Links

- **CLAUDE.md** - Complete context for LLM agents
- **docs/CURRENT_DOCS.md** - Authoritative active documentation index (start here for docs)
- **docs/PRODUCT_INVENTORY_PLAYBOOK.md** - Short-term inventory expansion plan
- **docs/CANONICAL_PRODUCT_SCHEMA.md** - Connector output contract
- **GitHub:** `GuillaumeRacine/present-agent2` (private)
- **Original:** `/Volumes/Crucial/X8/Code/Present/Agent2/`
- **Vault:** `/Users/gui/Obs_Vault/1_Projects/Present_Agent2/`

---

## Overview

AI-powered gift recommendation system using:
- 10 specialized agents (Listener, Memory, Explorer, Validator, etc.)
- Neo4j graph database + vector search
- OpenAI GPT-4 for reasoning
- Cohere embeddings
- 133,328 curated products loaded in Neo4j (4,809 brands)
- 102MB B-Corp raw catalog (1.28M records) as upstream source
- 14 academic research papers on gift psychology

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Express + TypeScript (API server)
- **Database:** Neo4j (graph + vector)
- **AI:** OpenAI GPT-4, Cohere embeddings
- **Data:** B-Corp ethical product catalog

---

## Folder Structure

```
present-agent2/
├── CLAUDE.md          # Complete LLM context
├── README.md          # This file
├── src/               # Next.js codebase (copy from Crucial X8)
├── docs/              # Documentation
├── data/              # Product catalog + schemas
├── research/          # Paper summaries + insights
├── agents/            # Agent implementation notes
└── scripts/           # Data loading, testing
```

---

## Setup

### Prerequisites
- Node.js 18+
- Neo4j 5.x (Docker or Desktop)
- OpenAI API key
- Cohere API key

### Installation

```bash
# Install dependencies
cd src && npm install
cd frontend && npm install && cd ..

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Start Neo4j (local)
./start-local.sh --neo4j

# Start dev server
npm run dev
```

---

## Data Sources

### Product Catalog
**iCloud:** `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`
- 21 JSON files (102MB)
- B-Corp certified brands
- Sustainable/ethical products

### Research Papers
**Seagate:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`
- 14 academic papers
- Gift psychology, AI recommendations, consumer behavior

---

## Current Status

**Last verified:** February 25, 2026
**In progress:** Enrichment coverage recovery + performance
**Next:** Close enrichment gaps on batch 2+ products

---

## For Developers

**Read CLAUDE.md first** - Complete context, architecture, research insights

Key files:
- `CLAUDE.md` - Full project context
- `src/agents/` - Agent implementations
- `data/schema.md` - Database schema
- `docs/architecture.md` - System design

---

## For LLM Agents

Start here:
1. Read `CLAUDE.md` (comprehensive context)
2. Check `/Users/gui/Obs_Vault/0_InnerContext/Self_Context/coding.md` (Guillaume's patterns)
3. Review research papers (gift psychology)
4. Examine product data structure

---

*Last updated: 2026-02-26*
