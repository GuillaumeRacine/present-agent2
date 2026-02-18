# Codebase Summary - Quick Reference

**Last Updated**: February 17, 2026
**Version**: 3.0.0

---

## Project Structure

```
Present-Agent2/
├── src/
│   ├── services/
│   │   ├── agents/          # 10 specialized agents
│   │   ├── orchestrator.ts  # Agent coordination
│   │   ├── interest-extractor.ts  # LLM extraction
│   │   ├── conversation-persister.ts  # History storage
│   │   └── feedback-collector.ts  # Learning system
│   ├── lib/
│   │   ├── neo4j.ts        # Database connection
│   │   └── logger.ts       # Winston logging
│   ├── types/
│   │   ├── agents.ts       # Agent interfaces
│   │   └── recipient.ts    # Recipient data types
│   └── server.ts           # Express API server
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # Chat UI
│   │   ├── logs/           # Conversation logs viewer
│   │   ├── products/       # Product explorer
│   │   └── api/            # API proxy routes
│   └── ...
├── scripts/
│   ├── product_enrichment/ # Python enrichment pipeline
│   │   ├── shopify_scraper.py
│   │   ├── review_parser.py
│   │   ├── recipient_signals.py
│   │   ├── composite_scorer.py
│   │   ├── load_neo4j.py
│   │   └── run_pipeline.sh
│   ├── rebuild-interests-batched.sh
│   ├── test-personas.ts
│   └── ingest-products.ts
├── docs/                   # Documentation (sub-files)
├── data/                   # State files, logs
├── personas/               # Test personas
├── docker-compose.yml      # Neo4j Docker config
├── start-local.sh          # Full startup script
└── .claude/                # Claude Code context
```

---

## Core Components

### Agents (`src/services/agents/`)

| Agent | File | Model | Purpose |
|-------|------|-------|---------|
| **Listener** | `listener.ts` | GPT-4 | Extract context from queries |
| **Memory** | `memory.ts` | - | Recall history + profiles |
| **Relationship** | `relationship.ts` | GPT-4 | Analyze relationship dynamics |
| **Constraints** | `constraints.ts` | - | Validate requirements |
| **Meaning** | `meaning.ts` | GPT-4o-mini | Identify interests |
| **Explorer** | `explorer.ts` | - | Hybrid search (graph+vector+text) |
| **Validator** | `validator.ts` | - | Quality check |
| **Storyteller** | `storyteller.ts` | GPT-4 | Generate reasoning |
| **Presenter** | `presenter.ts` | - | Format response |
| **Learner** | `recipient-learner.ts` | GPT-4 | Build recipient profiles |

### Key Services

**Orchestrator** (`src/services/orchestrator.ts`)
- Coordinates agent execution
- Manages context flow
- Error handling and recovery
- Performance tracking

**Interest Extractor** (`src/services/interest-extractor.ts`)
- LLM-powered interest extraction (Phase C)
- Uses GPT-4o-mini
- Extracts 3-10 interests per product
- Relevance and confidence scoring

**Conversation Persister** (`src/services/conversation-persister.ts`)
- Stores all conversations in Neo4j
- Captures queries, responses, context
- Agent execution metrics
- History for learning

**Neo4j Client** (`src/lib/neo4j.ts`)
- Database connection management
- Query execution
- Vector search operations
- Transaction handling

---

## Agent Execution Flow

```typescript
// Simplified orchestrator flow
async orchestrate(query: string, userId: string, sessionId: string) {
  // 1. Extract context
  const context = await listenerAgent.execute(query);

  // 2. Recall history + enrich profile
  const memory = await memoryAgent.execute(context, userId);

  // 3. Analyze relationship
  const relationship = await relationshipAgent.execute(
    context,
    memory.recipient
  );

  // 4. Validate constraints
  const constraints = await constraintsAgent.execute(context);

  // 5. Identify meaningful interests
  const meaning = await meaningAgent.execute(context, relationship);

  // 6. Search products (hybrid: graph + vector + text fallback)
  const products = await explorerAgent.execute(
    meaning.interests,
    constraints
  );

  // 7. Validate quality
  const validated = await validatorAgent.execute(products, context);

  // 8. Generate reasoning
  const recommendations = await storytellerAgent.execute(
    validated,
    context,
    relationship
  );

  // 9. Format response
  const response = await presenterAgent.execute(recommendations);

  // 10. Update recipient profile (async)
  recipientLearnerAgent.execute(context, memory.recipient);

  return response;
}
```

---

## Hybrid Search (Explorer Agent)

```typescript
// src/services/agents/explorer.ts

async execute(interests: string[], constraints: Constraints) {
  // Tier 1: Graph Search (70% weight)
  const graphResults = await this.searchByInterests(interests);

  // Tier 2: Vector Search (30% weight)
  const vectorResults = await this.vectorSearch(interests);

  // Combine and score
  const combined = this.hybridScore(graphResults, vectorResults);

  // Tier 3: Text Fallback (if <5 results)
  if (combined.length < 5) {
    return await this.textFallbackSearch(interests, constraints);
  }

  return combined;
}

// Graph search
async searchByInterests(interests: string[]) {
  const query = `
    MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
    WHERE i.name IN $interests
    WITH p, SUM(r.relevance) as graphScore
    ORDER BY graphScore DESC
    LIMIT 100
    RETURN p, graphScore
  `;
  return await this.neo4j.run(query, {interests});
}

// Vector search
async vectorSearch(interests: string[]) {
  const embedding = await this.getEmbedding(interests.join(' '));
  const query = `
    CALL db.index.vector.queryNodes(
      'product-embeddings',
      100,
      $embedding
    )
    YIELD node as p, score as vectorScore
    RETURN p, vectorScore
  `;
  return await this.neo4j.run(query, {embedding});
}

// Text fallback (Phase A addition)
async textFallbackSearch(interests: string[], constraints: Constraints) {
  const query = `
    CALL db.index.fulltext.queryNodes(
      'productSearchIndex',
      $searchText
    )
    YIELD node as p, score as textScore
    WHERE p.price >= $minPrice AND p.price <= $maxPrice
    ORDER BY textScore DESC
    LIMIT 100
    RETURN p, textScore
  `;
  return await this.neo4j.run(query, {
    searchText: interests.join(' '),
    minPrice: constraints.minPrice,
    maxPrice: constraints.maxPrice
  });
}

// Hybrid scoring
hybridScore(graphResults, vectorResults) {
  const combined = new Map();

  for (const result of graphResults) {
    combined.set(result.id, {
      product: result.product,
      score: result.graphScore * 0.7
    });
  }

  for (const result of vectorResults) {
    if (combined.has(result.id)) {
      combined.get(result.id).score += result.vectorScore * 0.3;
    } else {
      combined.set(result.id, {
        product: result.product,
        score: result.vectorScore * 0.3
      });
    }
  }

  return Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}
```

---

## Phase C Interest Extraction

```typescript
// src/services/interest-extractor.ts

class InterestExtractor {
  async extract(product: Product): Promise<Interest[]> {
    const prompt = `
      Extract 3-10 relevant, specific interests from this product.
      Focus on searchable interests that gift buyers would use.

      Product:
      - Name: ${product.name}
      - Description: ${product.description}
      - Category: ${product.category}

      Return interests with:
      - name: specific interest (e.g., "wine", not "beverages")
      - relevance: 0.0-1.0 (how relevant is this interest?)
      - confidence: 0.0-1.0 (how confident are you?)
      - category: beverages, hobbies, lifestyle, etc.

      Return as JSON array.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{role: 'user', content: prompt}],
      temperature: 0.3,
      response_format: {type: 'json_object'}
    });

    const data = JSON.parse(response.choices[0].message.content);
    const interests = data.interests || [];

    // Filter: Keep relevance > 0.3
    return interests
      .filter(i => i.relevance > 0.3)
      .slice(0, 10);
  }

  async storeInterests(
    productId: string,
    interests: Interest[]
  ): Promise<void> {
    const query = `
      MATCH (p:Product {id: $productId})
      UNWIND $interests as interest

      MERGE (i:Interest {name: interest.name})
      ON CREATE SET
        i.category = interest.category,
        i.createdAt = timestamp()

      MERGE (p)-[r:MATCHES_INTEREST]->(i)
      ON CREATE SET
        r.relevance = interest.relevance,
        r.confidence = interest.confidence,
        r.extractedBy = 'llm-phase-c',
        r.createdAt = timestamp()
    `;

    await this.neo4j.run(query, {productId, interests});
  }
}
```

---

## API Endpoints

```typescript
// src/server.ts

import express from 'express';
import { orchestrator } from './services/orchestrator';

const app = express();

// Main recommendation endpoint
app.post('/api/recommend', async (req, res) => {
  const {userQuery, userId, sessionId} = req.body;

  try {
    const result = await orchestrator.orchestrate(
      userQuery,
      userId,
      sessionId
    );

    res.json(result);
  } catch (error) {
    logger.error('Recommendation failed', {error});
    res.status(500).json({error: error.message});
  }
});

// Conversation history
app.get('/api/conversations', async (req, res) => {
  const {userId, limit = 50, offset = 0} = req.query;

  const conversations = await neo4j.run(`
    MATCH (u:User {userId: $userId})-[:HAD_CONVERSATION]->(c:Conversation)
    ORDER BY c.timestamp DESC
    SKIP $offset
    LIMIT $limit
    RETURN c
  `, {userId, offset: parseInt(offset), limit: parseInt(limit)});

  res.json(conversations);
});

// Product search
app.get('/api/products', async (req, res) => {
  const {search, minPrice, maxPrice, category, limit = 50} = req.query;

  // ... search logic
  res.json(products);
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await neo4j.verifyConnectivity();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

---

## Frontend Structure

```typescript
// frontend/app/page.tsx - Chat UI

'use client';

export default function Home() {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        userQuery: query,
        userId: 'user-123',
        sessionId: generateSessionId()
      })
    });

    const data = await response.json();
    setRecommendations(data.recommendations);
    setLoading(false);
  };

  return (
    <div className="chat-interface">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Who are you shopping for?"
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Finding gifts...' : 'Get Recommendations'}
      </button>

      {recommendations.map(rec => (
        <ProductCard
          key={rec.product.id}
          product={rec.product}
          reasoning={rec.reasoning}
          score={rec.score}
        />
      ))}
    </div>
  );
}
```

---

## Configuration

### Environment Variables (.env.local)

```bash
# AI APIs
OPENAI_API_KEY=sk-...
COHERE_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...

# Neo4j (local Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=presentagent2024

# Server
BACKEND_PORT=3000
PORT=3001
LOG_LEVEL=info
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run frontend\"",
    "server": "tsx src/server.ts",
    "server:dev": "tsx --watch src/server.ts",
    "frontend": "cd frontend && npm run dev",

    "setup:schema": "tsx scripts/setup-schema.ts",
    "ingest:products": "tsx scripts/ingest-products.ts",

    "test:personas": "tsx scripts/test-personas.ts",
    "test:personas:quick": "tsx scripts/test-personas.ts quick",
    "test:personas:list": "tsx scripts/test-personas.ts list"
  }
}
```

---

## Database Schema

### Nodes

```cypher
// Product
CREATE (p:Product {
  id: string,
  name: string,
  description: string,
  price: float,
  vendor: string,
  category: string,
  embedding: list<float>  // 1536 dimensions
})

// Interest
CREATE (i:Interest {
  name: string,
  category: string,
  createdAt: timestamp
})

// Recipient
CREATE (r:Recipient {
  id: string,
  name: string,
  age: int,
  profile: map
})

// User
CREATE (u:User {
  userId: string
})

// Conversation
CREATE (c:Conversation {
  sessionId: string,
  query: string,
  response: string,
  timestamp: timestamp,
  context: map,
  metrics: map
})
```

### Relationships

```cypher
// Product matches interest
(p:Product)-[:MATCHES_INTEREST {
  relevance: float,  // 0.0-1.0
  confidence: float, // 0.0-1.0
  extractedBy: string  // 'llm-phase-c'
}]->(i:Interest)

// Recipient interested in
(r:Recipient)-[:INTERESTED_IN {
  strength: float
}]->(i:Interest)

// User relationship with recipient
(u:User)-[:RELATIONSHIP {
  type: string  // 'mother', 'friend', etc.
}]->(r:Recipient)

// User had conversation
(u:User)-[:HAD_CONVERSATION]->(c:Conversation)
```

### Indexes

```cypher
// Vector index for products
CREATE VECTOR INDEX `product-embeddings`
FOR (p:Product)
ON p.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
}

// Full-text index for products
CREATE FULLTEXT INDEX productSearchIndex
FOR (p:Product)
ON EACH [p.name, p.description]

// Property indexes
CREATE INDEX FOR (p:Product) ON (p.id)
CREATE INDEX FOR (i:Interest) ON (i.name)
CREATE INDEX FOR (r:Recipient) ON (r.id)
CREATE INDEX FOR (u:User) ON (u.userId)
CREATE INDEX FOR (c:Conversation) ON (c.sessionId)
```

---

## Testing

### Persona Testing

```bash
# Quick test (3 personas)
npm run test:personas:quick

# Full test (all personas)
npm run test:personas:list

# Single persona
npm run test:persona -- "Wine Enthusiast"
```

**Persona File Format** (`personas/wine-enthusiast.json`):
```json
{
  "name": "Wine Enthusiast",
  "profile": {
    "description": "Sophisticated wine lover",
    "shopping_behavior": "Seeks quality, specific varietals"
  },
  "test_cases": [
    {
      "query": "Gift for fellow wine enthusiast",
      "expected_themes": ["wine", "sommelier", "tasting"],
      "min_confidence": 0.6
    }
  ]
}
```

---

## Logging

### Winston Logger (`src/lib/logger.ts`)

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Usage

```typescript
logger.info('Processing query', {userId, query});
logger.warn('Low confidence score', {confidence: 0.32});
logger.error('Agent failed', {error, agent: 'Explorer'});
logger.debug('Search results', {count: results.length});
```

---

## Common Patterns

### Neo4j Query Pattern

```typescript
async function queryNeo4j<T>(
  query: string,
  params: any
): Promise<T[]> {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}
```

### LLM Call Pattern

```typescript
async function callLLM(
  prompt: string,
  options: {model?: string, temperature?: number} = {}
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: options.model || 'gpt-4',
    messages: [{role: 'user', content: prompt}],
    temperature: options.temperature || 0.7
  });

  return response.choices[0].message.content;
}
```

### Error Handling Pattern

```typescript
async function executeAgent<T>(
  agentFn: () => Promise<T>
): Promise<T | null> {
  try {
    const result = await agentFn();
    logger.info('Agent succeeded', {result});
    return result;
  } catch (error) {
    logger.error('Agent failed', {error});
    return null;
  }
}
```

---

## Key Files to Know

### Most Important
1. **`src/services/orchestrator.ts`** - Agent coordination (main workflow)
2. **`src/services/agents/explorer.ts`** - Hybrid search logic
3. **`src/services/interest-extractor.ts`** - Phase C extraction
4. **`src/server.ts`** - API endpoints

### Configuration
5. **`.env.local`** - Environment variables
6. **`package.json`** - Scripts and dependencies

### Documentation
7. **`docs/DEPLOYMENT_STATUS.md`** - Current status
8. **`docs/ARCHITECTURE.md`** - System design
9. **`.claude/PROJECT_STATUS.md`** - LLM context

### Deployment
10. **`scripts/rebuild-interests-batched.sh`** - Phase C deployment
11. **`data/interest-rebuild-state.json`** - Checkpoint state

---

## Quick Debugging

### Check System Health
```bash
curl http://localhost:3000/health
```

### Test Recommendation
```bash
curl -X POST http://localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"userQuery":"gift for mom"}'
```

### View Logs
```bash
tail -f logs/combined.log
grep ERROR logs/error.log | tail -20
```

### Check Phase C Progress
```bash
cat data/interest-rebuild-state.json | jq '.processedProducts'
```

### Query Neo4j
```cypher
// In Neo4j Browser
MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
RETURN p.name, i.name, r.relevance
LIMIT 10
```

---

**Last Updated**: February 17, 2026
**Version**: 3.0.0 (Local Docker Neo4j + Python enrichment pipeline)
