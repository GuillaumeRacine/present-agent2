# Present-Agent2: AI-Powered Gift Recommendation System

A sophisticated multi-agent AI system that provides personalized gift recommendations using graph-based knowledge representation, vector embeddings, and context-aware reasoning.

## Overview

Present-Agent2 uses a 10-agent architecture to understand context, analyze relationships, and recommend thoughtful gifts by learning about recipients over time. The system combines Neo4j graph database, vector embeddings, and LLM-powered agents to deliver personalized recommendations.

## Key Features

- **Multi-Agent Architecture**: 10 specialized agents work together to understand context and make recommendations
- **Graph-Based Knowledge**: Neo4j stores products, recipients, relationships, and conversation history
- **Hybrid Search**: Combines vector similarity and graph relationships for intelligent product discovery
- **Recipient Learning**: Builds comprehensive profiles that improve with each interaction
- **Conversation Persistence**: Stores complete conversation history for analytics and learning
- **Web Interface**: Modern React/Next.js frontend for testing and iteration
- **Persona Testing Framework**: Automated testing with diverse user personas

## Architecture

### 10-Agent System

1. **Listener Agent** - Extracts context from user queries
2. **Memory Agent** - Recalls user history and recipient profiles
3. **Relationship Agent** - Analyzes relationship dynamics
4. **Constraints Agent** - Validates requirements (budget, timing, preferences)
5. **Meaning Agent** - Identifies meaningful gift criteria
6. **Explorer Agent** - Discovers product candidates using hybrid search
7. **Validator Agent** - Ensures quality and appropriateness
8. **Storyteller Agent** - Crafts personal reasoning for recommendations
9. **Presenter Agent** - Formats final presentation
10. **Recipient Learner Agent** - Builds and enriches recipient profiles

### Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Database**: Neo4j (graph + vector)
- **AI**: OpenAI GPT-4, Cohere embeddings
- **Testing**: Custom persona framework

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Neo4j Aura account or local Neo4j instance
- OpenAI API key
- Cohere API key (optional, for embeddings)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Set up environment variables**:
   Copy `.env.local.example` to `.env.local` and fill in values:
   ```env
   # Core APIs (at least one required)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...

   # Neo4j Database
   NEO4J_URL=neo4j+s://<your-instance>.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=...
   NEO4J_DATABASE=neo4j

   # Server
   BACKEND_PORT=3000
   FRONTEND_URL=http://localhost:3001
   ```

   Notes:
   - The code accepts `NEO4J_USERNAME` or `NEO4J_USER` (legacy).
   - Some scripts also accept `NEO4J_URI` (legacy alias for `NEO4J_URL`).
   - Do not commit or edit real keys in the repo. Keep secrets only in your local `.env.local`.
   - Never paste real keys into issues/PRs/docs. See SECURITY.md for policy.

3. **Verify environment**:
   ```bash
   npm run env:check
   ```

4. **Set up Neo4j schema**:
   ```bash
   npm run setup:schema
   ```

5. **Ingest product data** (optional):
   ```bash
   npm run ingest:products
   ```

### Running the Application

#### Interactive CLI Chat (Recommended for Testing)
```bash
npm run chat
```
This starts an interactive chat session where you can:
- Search for gifts conversationally
- Build conversation history over multiple sessions
- See the multi-agent system in action
- Test recommendations as a real user

Your user ID (`guillaume.racine.gr@gmail.com`) will track your history across sessions.

#### Full Stack Web UI
```bash
npm run dev
```
This starts:
- Backend API server on `http://localhost:3000`
- Frontend UI on `http://localhost:3001`

#### Separate Terminals

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
cd frontend && npm run dev
```

### Testing

Run the persona testing framework:
```bash
# Quick test (3 personas)
npm run test:personas:quick

# Full test (all personas)
npm run test:personas:list

# Single persona
npm run test:persona -- "Tech Enthusiast Dad"
```

### Graph Analysis and Tagging

```bash
# Verify environment and connectivity
npm run env:check

# Analyze product graph and export summary to data/product-analysis.json
npx tsx scripts/analyze-product-stats.ts --export

# Tag products with occasions (start with dry-run, then live)
npm run tag:occasions -- --limit 1000            # dry-run preview
npm run tag:occasions -- --limit 1000 --live     # apply changes

# Fix products missing interests using LLM-based extraction (batch and iterate)
tsx scripts/fix-orphaned-products.ts --limit 1000 --live

# Normalize duplicate interests to canonical names
tsx scripts/normalize-interests.ts --live
```

## Project Structure

```
Present-Agent2/
├── src/
│   ├── services/
│   │   ├── agents/           # 10 specialized agents
│   │   ├── orchestrator.ts   # Agent coordination
│   │   ├── conversation-persister.ts  # Conversation storage
│   │   └── feedback-collector.ts      # Learning from feedback
│   ├── lib/
│   │   ├── neo4j.ts          # Database connection
│   │   └── logger.ts         # Logging configuration
│   ├── types/
│   │   ├── agents.ts         # Agent type definitions
│   │   └── recipient.ts      # Recipient data types
│   ├── scripts/
│   │   ├── ingest-products.ts   # Product data ingestion
│   │   └── test-personas.ts     # Persona testing
│   └── server.ts             # Express API server
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Chat UI
│   │   ├── logs/             # Conversation logs
│   │   ├── products/         # Product explorer
│   │   └── api/              # API routes
│   └── ...
├── docs/                     # Documentation
├── test-results/             # Persona test reports
└── personas/                 # Test persona definitions
```

## API Endpoints

### Recommendation API

**POST** `/api/recommend`
```json
{
  "userQuery": "Gift for my mom who loves gardening",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

### Conversation History

**GET** `/api/conversations?userId=user-123&limit=50`

**GET** `/api/conversations/:sessionId`

**GET** `/api/conversations/stats?userId=user-123`

### Products

**GET** `/api/products?search=coffee&minPrice=0&maxPrice=100`

**GET** `/api/products/stats`

See [docs/API.md](docs/API.md) for complete API documentation.

## Current Status

**✅ Production Ready - v2.4.0 - Enrichment Automation Active**
**📈 Live enrichment in progress:** see `ENRICHMENT_STATUS.md` for real-time monitoring.

### Data (December 6, 2025)
- **88,674 products** in Neo4j catalog
- **Interest coverage**: 99.3% (88,053 products) ✅
- **Occasion coverage**: 84.6% (75,060 products) ✅
- **Attribute coverage**: 53.2% (47,139 products) ⚡ **ENRICHING**
  - **Active enrichment**: 1,660/41,535 products done (4%)
  - **Target**: 95%+ coverage by December 7, 2025
  - **ETA**: 5-7 hours (~03:00-05:00 AM PST)
  - **Cost so far**: $0.048 (estimated total: ~$0.08)
  - **Monitor**: `./scripts/monitor-enrichment.sh`

### Recommendation System
- **10-agent architecture** fully operational
- **7/10 quality score** on real-user tests
- **100% success rate** on easy scenarios
- **Fast performance**: 25-30 seconds average query time

### Recent Achievements (December 2025)
- ✅ **Enrichment automation launched** (December 6, 2025)
- ✅ **Query bug fixed**: WHERE clause preventing attribute enrichment
- ✅ **Response parsing improved**: Handles all OpenAI JSON formats
- ✅ **Batch validation added**: 80% success threshold with fail-fast
- ✅ **Automated retry system**: Production-grade resilience
- ✅ **Monitoring tools**: Real-time progress tracking
- ✅ Interactive CLI chat interface for user testing
- ✅ Multi-agent workflow transparency and logging
- ✅ Conversation persistence and history tracking
- ✅ Agent performance analysis and optimization roadmap

**See**:
- [Attribute System Validation Report](docs/reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) for quality metrics
- [Agent Performance Analysis](docs/reports/AGENT_PERFORMANCE_ANALYSIS.md) for optimization roadmap
- [User Testing Guide](docs/guides/USER_TESTING_GUIDE.md) for testing instructions

## Documentation

### Getting Started
- **[QUICKSTART](docs/QUICKSTART.md)** - Get running in 5 minutes
- **[Architecture](docs/ARCHITECTURE.md)** - Complete system design
- **[API Documentation](docs/API.md)** - API endpoints and usage
- **[User Testing Guide](docs/guides/USER_TESTING_GUIDE.md)** - How to test recommendations

### Documentation Hub
- **[docs/README.md](docs/README.md)** - Complete documentation index organized by category

### Key Resources by Role

#### For Developers
- [QUICKSTART](docs/QUICKSTART.md) - Setup in 5 minutes
- [ARCHITECTURE](docs/ARCHITECTURE.md) - System design
- [API](docs/API.md) - API reference
- [Frontend Guide](docs/FRONTEND_GUIDE.md) - UI development
- [Testing Guide](docs/guides/TESTING_GUIDE.md) - Testing strategies
- [Repository Guidelines](docs/contributor/AGENTS.md) - Contribution standards

#### For Operations
- [Runbooks](docs/runbooks/) - Operational procedures
- [Data Status](docs/reports/DATA_STATUS_CURRENT.md) - Current metrics
- [Monitoring Guide](docs/guides/MONITORING.md) - System monitoring
- [Enrichment Status](ENRICHMENT_STATUS.md) - Live enrichment tracking

#### For Product/QA
- [Testing Executive Summary](docs/reports/TESTING_EXECUTIVE_SUMMARY.md) - Quality overview
- [Agent Performance Analysis](docs/reports/AGENT_PERFORMANCE_ANALYSIS.md) - Agent optimization
- [Validation Reports](docs/validation/) - UX validation
- [Quality Reports](docs/quality/) - Quality assessments
- [Persona Testing](docs/guides/PERSONA_TESTING_FRAMEWORK.md) - Automated testing

#### For Data Team
- [Attribute System](docs/attributes/) - 100-attribute system
- [Attribute Validation](docs/reports/ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) - Quality metrics
- [Enrichment Guide](docs/guides/COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md) - Data enrichment
- [Enrichment Runbook](docs/runbooks/hybrid-enrichment.md) - Operational procedures

### Claude Code Integration
- **[.claude/README.md](.claude/README.md)** - Claude Code configuration
- **[Custom Commands](.claude/commands/)** - Slash commands (/build, /test, /ingest, etc.)
- **[Agent Definitions](.claude/agents/)** - All agent specifications

## Development

### npm Scripts

```bash
# Development
npm run chat             # Interactive CLI chat (recommended for testing)
npm run dev              # Run full stack (backend + frontend)
npm run server           # Backend only
npm run server:dev       # Backend with watch mode

# Database
npm run setup:schema     # Initialize Neo4j schema
npm run ingest:products  # Load product data

# Testing
npm run test:personas:quick    # Quick persona test
npm run test:personas:list     # List all personas
npm run test:real-users:easy   # Real user scenario tests
npm run attributes:status      # Check attribute coverage

# Build
npm run build            # Build for production
```

### Enrichment Monitoring

Monitor the active enrichment process:

```bash
# Real-time progress monitoring
./scripts/monitor-enrichment.sh

# Check database statistics
npx tsx scripts/analyze-product-stats.ts

# View enrichment status
cat ENRICHMENT_STATUS.md
```

### Adding New Products

Products can be ingested from CSV:

```bash
npm run ingest:products -- path/to/products.csv
```

CSV format:
```csv
product_id,name,description,price,vendor,category
p001,Product Name,Description,29.99,Vendor Name,Category
```

### Creating Custom Personas

Add a new JSON file to `personas/`:

```json
{
  "name": "Persona Name",
  "profile": {
    "description": "Description of the persona",
    "shopping_behavior": "How they shop for gifts"
  },
  "test_cases": [
    {
      "query": "Gift for my friend who loves hiking",
      "expected_themes": ["outdoor", "adventure", "nature"]
    }
  ]
}
```

## Conversation Persistence

All user conversations are automatically persisted to Neo4j, including:

- User queries and responses
- Recommendations with reasoning
- Agent execution timings
- Context extraction
- Recipient profiles
- Success/failure status

This enables:
- Viewing conversation history in the frontend
- Learning from past interactions
- Debugging and analytics
- Improving recommendations over time

## Monitoring and Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- Console output during development

Log levels: `error`, `warn`, `info`, `debug`

Configure in `.env.local`:
```env
LOG_LEVEL=info
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test with persona framework
4. Submit a pull request

## License

Private project - All rights reserved

## Contact

For questions or issues, please open a GitHub issue.

---

**Version**: 2.4.0 - Enrichment Automation
**Last Updated**: December 6, 2025
**Status**: Production Ready - Active Enrichment (53.2% → 95%+ target), 190/190 Tests Passing
**Enrichment Monitoring**: `./scripts/monitor-enrichment.sh` | See `ENRICHMENT_STATUS.md` for details
