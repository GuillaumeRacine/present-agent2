# Present-Agent2 Documentation

Complete documentation for the Present-Agent2 AI-powered gift recommendation system.

## Current Status: Phase C Deploying

**Deployment**: Batch 1/42 running (started Oct 29, 17:30)
**Progress**: 710 unique interests from 500 test products
**ETA**: November 1, 2025, 11:30
**See**: [Deployment Status](DEPLOYMENT_STATUS.md) for live updates

## Quick Links

### Core Documentation
- **[Deployment Status](DEPLOYMENT_STATUS.md)** - Phase C deployment progress (LIVE)
- **[Architecture](ARCHITECTURE.md)** - Complete system architecture
- **[API Documentation](API.md)** - Complete API reference
- **[Project Status](PROJECT_STATUS.md)** - System capabilities and roadmap

### Phase Documentation
- **[Phase A & B Complete](phases/PHASE_A_B_COMPLETE.md)** - Vector expansion + whitelist removal
- **[Phase C Deploying](phases/PHASE_C_DEPLOYING.md)** - LLM interest extraction (IN PROGRESS)

### Guides & References
- **[Batched Deployment Guide](guides/BATCHED_DEPLOYMENT.md)** - Large-scale deployment patterns
- **[Monitoring Guide](guides/MONITORING.md)** - System monitoring and alerting
- **[Conversation Persistence](CONVERSATION_PERSISTENCE.md)** - History storage system
- **[Frontend Guide](FRONTEND_GUIDE.md)** - Frontend implementation details
- **[Persona Testing](PERSONA_TESTING_FRAMEWORK.md)** - Testing framework guide
- **[Graph Schema](GRAPH_SCHEMA_V2.md)** - Neo4j database schema
- **[Agents](AGENTS.md)** - Agent architecture and workflows

## Documentation Structure

### Getting Started

1. **[README.md](../README.md)** (Main) - Start here for overview and quick start
2. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current status and capabilities
3. **[FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)** - Setting up and using the web interface

### Technical Reference

- **[API.md](API.md)** - API endpoints and usage
- **[GRAPH_SCHEMA_V2.md](GRAPH_SCHEMA_V2.md)** - Database structure
- **[AGENTS.md](AGENTS.md)** - Agent system architecture
- **[CONVERSATION_PERSISTENCE.md](CONVERSATION_PERSISTENCE.md)** - Data persistence

### Testing

- **[PERSONA_TESTING_FRAMEWORK.md](PERSONA_TESTING_FRAMEWORK.md)** - Automated testing guide

### Additional Resources

- **[FRONTEND_COMPLETE.md](FRONTEND_COMPLETE.md)** - Frontend implementation summary
- **[product_vision.md](product_vision.md)** - Original product vision
- **[CLAUDE.md](CLAUDE.md)** - Claude-specific documentation

## Key Features

### Core System

- **10-Agent Architecture**: Specialized agents for each aspect of recommendation
- **Graph Database**: Neo4j with 41,686 products
- **Hybrid Search**: Graph relationships + vector embeddings
- **Recipient Learning**: Builds profiles that improve over time
- **Conversation History**: Full persistence of all interactions

### User Interface

- **Chat UI**: Interactive gift recommendation interface
- **Conversation Logs**: View past conversations with agent traces
- **Product Explorer**: Browse and search the product database

### Developer Tools

- **API**: RESTful endpoints for all functionality
- **Testing Framework**: Automated persona-based testing
- **Logging**: Comprehensive Winston logging
- **Documentation**: Complete guides and references

## Common Tasks

### Running the System

```bash
# Full stack (backend + frontend)
npm run dev

# Backend only
npm run server

# Frontend only
cd frontend && npm run dev
```

See [README.md](../README.md) for detailed setup instructions.

### Testing

```bash
# Quick test with 3 personas
npm run test:personas:quick

# Test all personas
npm run test:personas:list

# Test specific persona
npm run test:persona -- "Tech Enthusiast Dad"
```

See [PERSONA_TESTING_FRAMEWORK.md](PERSONA_TESTING_FRAMEWORK.md) for details.

### API Usage

```bash
# Get recommendations
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"Gift for my mom who loves gardening"}'

# Get conversation history
curl http://localhost:3000/api/conversations?userId=user-123

# Search products
curl http://localhost:3000/api/products?search=coffee&maxPrice=100
```

See [API.md](API.md) for complete API reference.

### Database Management

```bash
# Set up Neo4j schema
npm run setup:schema

# Ingest products from CSV
npm run ingest:products -- path/to/products.csv
```

See [GRAPH_SCHEMA_V2.md](GRAPH_SCHEMA_V2.md) for schema details.

## Architecture Overview

### 10-Agent System

1. **Listener** - Extracts context from queries
2. **Memory** - Recalls history and profiles
3. **Relationship** - Analyzes relationship dynamics
4. **Constraints** - Validates requirements
5. **Meaning** - Identifies meaningful criteria
6. **Explorer** - Discovers products via hybrid search
7. **Validator** - Ensures quality
8. **Storyteller** - Crafts personal reasoning
9. **Presenter** - Formats presentation
10. **Recipient Learner** - Builds recipient profiles

See [AGENTS.md](AGENTS.md) for detailed agent documentation.

### Data Flow

```
User Query
    ↓
Listener Agent → Context Extraction
    ↓
Memory Agent → History + Recipient Profile
    ↓
Relationship Agent → Relationship Analysis
    ↓
Constraints Agent → Requirement Validation
    ↓
Meaning Agent → Meaningful Criteria
    ↓
Explorer Agent → Product Discovery (Graph + Vector)
    ↓
Validator Agent → Quality Check
    ↓
Storyteller Agent → Reasoning Generation
    ↓
Presenter Agent → Final Formatting
    ↓
Response to User + Conversation Persistence
```

### Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Database**: Neo4j (graph + vector)
- **AI**: OpenAI GPT-4, Cohere embeddings
- **Testing**: Custom persona framework
- **Logging**: Winston

## File Organization

```
docs/
├── README.md                         # This file
├── PROJECT_STATUS.md                 # Current status
├── API.md                            # API reference
├── CONVERSATION_PERSISTENCE.md       # Persistence guide
├── FRONTEND_GUIDE.md                 # Frontend docs
├── FRONTEND_COMPLETE.md              # Frontend summary
├── PERSONA_TESTING_FRAMEWORK.md      # Testing guide
├── GRAPH_SCHEMA_V2.md                # Database schema
├── AGENTS.md                         # Agent architecture
├── product_vision.md                 # Original vision
├── CLAUDE.md                         # Claude docs
└── archive/                          # Old/superseded docs
```

## Getting Help

1. **Check the docs**: Start with relevant guide above
2. **Review examples**: See test personas and API examples
3. **Check logs**: Look in `logs/` for error details
4. **Open an issue**: Report bugs or request features on GitHub

## Contributing to Docs

When updating documentation:

1. Keep docs in sync with code
2. Include examples and code snippets
3. Update this README when adding new docs
4. Archive superseded documentation in `archive/`
5. Use clear section headers and formatting

## Changelog

### October 29, 2025
- Created comprehensive documentation structure
- Added API documentation
- Added conversation persistence guide
- Created project status document
- Reorganized all documentation
- Archived old status documents

### October 28, 2025
- Added frontend documentation
- Created persona testing guide
- Updated graph schema documentation

---

**Last Updated**: October 29, 2025
**Status**: Documentation complete and current
