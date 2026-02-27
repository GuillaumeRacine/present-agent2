# Present-Agent2 Project Context

## Quick Overview
AI-powered gift recommendation engine using Neo4j graph database with vector embeddings.

## Current Status
Building the core recommendation engine from scratch. See active todos for current progress.

## Key Files
- `product_vision.md` - Product requirements and assumptions to test
- `data/export/products.json` - 41,686 products
- `data/export/facets.json` - 105,731 product facets with confidence scores
- `data/canonical_taxonomy.json` - 27 standard gift categories
- `.claude/agents/architect.md` - Coding agent instructions

## Architecture Decisions
1. **Neo4j** for graph storage (products, facets, categories, relationships)
2. **OpenAI embeddings** for semantic search
3. **Cohere** for re-ranking
4. **TypeScript** for type safety
5. **CLI-first** testing with extensive logging

## Data Model
```
Product -[HAS_FACET]-> Facet
Product -[IN_CATEGORY]-> Category
Product -[FROM_VENDOR]-> Vendor
Facet properties: facet_key, facet_value, confidence, source
```

## Development Priorities
1. Observable system (logs everything)
2. Test assumptions about graph-based recommendations
3. Measure recommendation relevance
4. Fast iteration

## What We're NOT Doing (Yet)
- User authentication
- Frontend UI
- Real-time learning
- Production deployment
- Multi-session memory

Focus: Build and test the core recommendation engine.
