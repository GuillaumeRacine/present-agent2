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
   Create `.env.local` in the root directory:
   ```env
   # Core APIs
   OPENAI_API_KEY=your_openai_key
   COHERE_API_KEY=your_cohere_key
   ANTHROPIC_API_KEY=your_anthropic_key

   # Neo4j Database
   NEO4J_URL=your_neo4j_url
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=neo4j

   # Server Configuration
   BACKEND_PORT=3000
   PORT=3001
   ```

3. **Set up Neo4j schema**:
   ```bash
   npm run setup:schema
   ```

4. **Ingest product data** (optional):
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

**✅ Production Ready - v2.2.0**

### Attribute System (Complete)
- **41,704 products** in catalog
- **99.7% attribute coverage** (41,562 products)
- **14 gift attributes** with rich multi-dimensional profiles
- **Archetype matching operational** (practical, sentimental, experiential, etc.)

### Recommendation System
- **10-agent architecture** fully operational
- **7/10 quality score** on real-user tests
- **100% success rate** on easy scenarios
- **Fast performance**: 25-30 seconds average query time

### Recent Achievements
- ✅ LLM-based attribute population completed ($35, 30 minutes)
- ✅ Interactive CLI chat interface for user testing
- ✅ Multi-agent workflow transparency and logging
- ✅ Conversation persistence and history tracking
- ✅ Agent performance analysis and optimization roadmap

**See**:
- [Attribute System Validation Report](ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md) for quality metrics
- [Agent Performance Analysis](AGENT_PERFORMANCE_ANALYSIS.md) for optimization roadmap
- [User Testing Guide](USER_TESTING_GUIDE.md) for testing instructions

## Documentation

### Core Documentation
- **[Attribute System Validation](ATTRIBUTE_SYSTEM_VALIDATION_REPORT.md)** ⭐ System status & quality metrics
- **[Agent Performance Analysis](AGENT_PERFORMANCE_ANALYSIS.md)** ⭐ Agent scoring & optimization roadmap
- **[User Testing Guide](USER_TESTING_GUIDE.md)** - How to test recommendations
- **[Architecture](docs/ARCHITECTURE.md)** - Complete system architecture
- **[API Documentation](docs/API.md)** - API endpoints and usage
- **[Documentation Index](docs/DOCUMENTATION_INDEX.md)** - All documentation

### Guides & References
- **[Repository Guidelines](docs/contributor/AGENTS.md)** - Contributor workflow and standards
- **[Frontend Guide](docs/FRONTEND_GUIDE.md)** - Complete frontend documentation
- **[Persona Testing](docs/PERSONA_TESTING_FRAMEWORK.md)** - Testing framework guide
- **[Graph Schema](docs/GRAPH_SCHEMA_V2.md)** - Neo4j database schema
- **[Agents](docs/AGENTS.md)** - Agent architecture and workflows
- **[Testing Guide](docs/guides/TESTING_GUIDE.md)** - Recommendation testing
- **[Authentication](docs/AUTHENTICATION_IMPLEMENTATION.md)** - Auth implementation

### Archives
- **[Phase A & B Reports](docs/archive/phase-ab/)** - Historical test reports

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

**Version**: 2.2.0
**Last Updated**: November 14, 2025
**Status**: ✅ Production Ready - 99.7% Attribute Coverage, Multi-Agent System Operational
