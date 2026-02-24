# Present-Agent2 Project Context

## Quick Overview
AI-powered gift recommendation engine with Neo4j graph storage and vector embeddings, backed by a 10-agent conversational workflow.

## Current Status
- Production-ready 10-agent recommendation system with optional auth and conversation persistence.
- Database size (latest known): 88,674 products.
- Attribute enrichment campaign completed (multi-LLM run): 74.6% coverage.
- Test suite is passing at 190/190 with active 12-15 point quality validation loops.

## Key Files
- `README.md` - User-facing project overview
- `docs/ARCHITECTURE.md` - System architecture
- `src/server.ts` - API endpoints (`/api/recommend`, `/api/auth/*`, `/api/conversations`, `/api/products`, `/api/feedback`)
- `src/types/agents.ts` - Agent contracts and orchestration outputs
- `src/lib/llm.ts` - Chat + embedding provider wrapper
- `.claude/PROJECT_STATUS.md` - Current operational state

## Architecture Decisions
1. **Neo4j** for graph + vector hybrid recommendation.
2. **OpenAI** for chat (GPT-4o-mini) and embeddings (text-embedding-3-small).
3. **Anthropic** Claude as chat fallback when OpenAI is unavailable.
4. **TypeScript** for static safety across orchestrator and API contracts.
5. **CLI + web UX** with shared backend contract.

## Data Model
- Product, Interest, Occasion, Category, Recipient, User, Conversation, and Recommendation nodes in Neo4j.
- 10 recommendation agents coordinate listener, memory, relationship, constraints, meaning, exploration, validation, storytelling, presentation, and profile learning.

## Development Priorities
1. Keep recommendation quality and refusal/clarification UX stable.
2. Maintain observability and recovery for enrichment and orchestration runs.
3. Expand coverage and UX quality through measured experiments.
4. Improve production hardening and runbook confidence.

## What We Are Doing
- Conversational recommendation improvements in production context.
- Documenting changes promptly so both human and agent workflows stay aligned.
- Maintaining reusable agent workflows for feature development and testing.
