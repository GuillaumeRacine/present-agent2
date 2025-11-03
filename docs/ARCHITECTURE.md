# Architecture Overview - Present-Agent2

**Last Updated**: October 29, 2025
**Version**: 2.1.0

---

## System Overview

Present-Agent2 is a sophisticated multi-agent AI system that provides personalized gift recommendations using:
- **10 specialized agents** working in orchestrated sequence
- **Neo4j graph database** with vector embeddings
- **Hybrid search** combining graph relationships and semantic similarity
- **LLM-powered reasoning** for context understanding and personalization
- **Conversation persistence** for learning and improvement

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Chat UI    │  │ Conv. Logs   │  │   Products   │         │
│  │  (Next.js)   │  │   Explorer   │  │   Explorer   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer (Express)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ /api/        │  │ /api/        │  │ /api/        │         │
│  │ recommend    │  │ conversations│  │ products     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Orchestrator Layer                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Agent Orchestrator                         │    │
│  │  • Manages agent sequence                              │    │
│  │  • Handles context flow                                │    │
│  │  • Error recovery                                      │    │
│  │  • Performance tracking                                │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      10-Agent System                            │
│                                                                  │
│  1️⃣  Listener      →  Context Extraction                        │
│  2️⃣  Memory        →  History & Profile Recall                  │
│  3️⃣  Relationship  →  Dynamics Analysis                         │
│  4️⃣  Constraints   →  Requirement Validation                    │
│  5️⃣  Meaning       →  Meaningful Criteria                       │
│  6️⃣  Explorer      →  Product Discovery (Hybrid Search)         │
│  7️⃣  Validator     →  Quality Check                             │
│  8️⃣  Storyteller   →  Reasoning Generation                      │
│  9️⃣  Presenter     →  Final Formatting                          │
│  🔟 Learner        →  Profile Enrichment                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │    Neo4j Database    │      │    External APIs     │        │
│  │                      │      │                      │        │
│  │  • Products (41,686) │      │  • OpenAI (GPT-4)   │        │
│  │  • Interests (710+)  │      │  • Cohere (embeds)  │        │
│  │  • Recipients        │      │  • Anthropic        │        │
│  │  • Conversations     │      │                      │        │
│  │  • Relationships     │      │                      │        │
│  │  • Vector indexes    │      │                      │        │
│  └──────────────────────┘      └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Architecture

### Agent Flow

```
User Query: "Gift for my wine-loving mom, budget $50"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣  LISTENER AGENT                                              │
│ Extracts: recipient=mom, interests=[wine], budget=$50           │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2️⃣  MEMORY AGENT                                                │
│ Recalls: Previous conversations, mom's profile                   │
│ Enriches: mom.age=65, mom.preferences=[red wine, gardening]    │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3️⃣  RELATIONSHIP AGENT                                          │
│ Analyzes: Mother-child relationship, formality level            │
│ Suggests: Personal, thoughtful, quality over quantity           │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4️⃣  CONSTRAINTS AGENT                                           │
│ Validates: budget=$50, timing=normal, occasion=none             │
│ Result: All constraints valid ✅                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5️⃣  MEANING AGENT                                               │
│ Identifies: [wine, sommelier, tasting, wine-accessories]        │
│ Confidence: 0.85                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6️⃣  EXPLORER AGENT (Hybrid Search)                              │
│                                                                  │
│ Graph Search (70% weight):                                      │
│   MATCH (p:Product)-[:MATCHES_INTEREST]->(i:Interest)           │
│   WHERE i.name IN [wine, sommelier, tasting]                    │
│   → 45 products found                                           │
│                                                                  │
│ Vector Search (30% weight):                                     │
│   Semantic similarity to "wine-loving mom gift"                 │
│   → Top 100 products                                            │
│                                                                  │
│ Combined & Scored:                                              │
│   → 24 products (budget filtered, ranked)                       │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7️⃣  VALIDATOR AGENT                                             │
│ Checks: Appropriateness, quality, budget compliance             │
│ Filters: Removes 2 products, keeps 22                           │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8️⃣  STORYTELLER AGENT                                           │
│ Generates: Personal reasoning for top 5 products                │
│ Example: "This wine tasting journal would be perfect for your   │
│          mom because it combines her love of wine with the      │
│          thoughtful documentation of special moments..."         │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9️⃣  PRESENTER AGENT                                             │
│ Formats: JSON response with products, reasoning, confidence     │
│ Returns: Top 5 recommendations                                   │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 🔟 RECIPIENT LEARNER AGENT (Async)                              │
│ Updates: mom's profile with new interests and preferences       │
│ Stores: Conversation for future recommendations                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Details

#### 1. Listener Agent
**Purpose**: Extract structured context from natural language queries
**Model**: GPT-4 (high accuracy needed)
**Output**: `{ recipient, relationship, interests, budget, occasion, constraints }`

#### 2. Memory Agent
**Purpose**: Recall history and enrich with recipient profiles
**Data Sources**:
- Neo4j conversation history
- Neo4j recipient profiles
- Session context
**Output**: Enriched recipient profile + relevant history

#### 3. Relationship Agent
**Purpose**: Understand relationship dynamics
**Model**: GPT-4 (nuanced understanding needed)
**Output**: Relationship insights, appropriateness guidance

#### 4. Constraints Agent
**Purpose**: Validate and normalize requirements
**Type**: Rule-based (no LLM)
**Output**: Validated constraints, issues flagged

#### 5. Meaning Agent
**Purpose**: Identify meaningful gift criteria
**Model**: GPT-4o-mini (cost-effective)
**Output**: List of interests with relevance scores
**Recent Change**: Phase B removed whitelist, now uses full taxonomy

#### 6. Explorer Agent
**Purpose**: Discover products via hybrid search
**Components**:
- **Graph Search**: Finds products via interest relationships
- **Vector Search**: Semantic similarity via embeddings
- **Hybrid Scoring**: Combines both (70% graph, 30% vector)
- **Text Fallback**: Full-text search if graph returns <5 products

**Recent Changes**:
- Phase A: Expanded vector window 30→100 products
- Phase A: Added intelligent text fallback
- Phase C: Rebuilding interest graph (710→10,000+ interests)

#### 7. Validator Agent
**Purpose**: Quality control and appropriateness
**Type**: Rule-based with heuristics
**Output**: Filtered product list

#### 8. Storyteller Agent
**Purpose**: Generate personal reasoning
**Model**: GPT-4 (best quality)
**Output**: Personalized explanation for each recommendation

#### 9. Presenter Agent
**Purpose**: Format final response
**Type**: Template-based
**Output**: Structured JSON response

#### 10. Recipient Learner Agent
**Purpose**: Build and enrich recipient profiles
**Trigger**: Async after response sent
**Updates**: Recipient node in Neo4j with new insights

---

## Data Architecture

### Neo4j Graph Schema

```
┌─────────────┐
│   Product   │
│             │
│ • id        │
│ • name      │
│ • desc      │
│ • price     │
│ • vendor    │
│ • category  │
│ • embedding │◄────── Vector Index (1536 dims)
└─────────────┘
       │
       │ MATCHES_INTEREST (relevance: 0.0-1.0)
       │
       ▼
┌─────────────┐
│  Interest   │
│             │
│ • name      │
│ • category  │
│ • count     │
└─────────────┘
       │
       │ INTERESTED_IN
       │
       ▼
┌─────────────┐
│  Recipient  │
│             │
│ • name      │
│ • age       │
│ • profile   │
└─────────────┘
       │
       │ RELATIONSHIP
       │
       ▼
┌─────────────┐
│    User     │
│             │
│ • userId    │
└─────────────┘
       │
       │ HAD_CONVERSATION
       │
       ▼
┌─────────────┐
│Conversation │
│             │
│ • query     │
│ • response  │
│ • timestamp │
│ • context   │
│ • metrics   │
└─────────────┘
```

### Database Statistics

| Node Type | Count | Status |
|-----------|-------|--------|
| Products | 41,686 | ✅ Complete |
| Interests | 710 (growing) | 🚀 Phase C |
| Recipients | Variable | 📈 Growing |
| Users | Variable | 📈 Growing |
| Conversations | Variable | 📈 Growing |

### Indexes

1. **Vector Index**: Product embeddings (1536 dimensions)
   - Type: Cosine similarity
   - Used by: Explorer Agent vector search

2. **Property Indexes**:
   - `Product.id` (unique)
   - `Interest.name` (unique)
   - `Recipient.id` (unique)
   - `User.userId` (unique)
   - `Conversation.sessionId` (indexed)

3. **Full-Text Indexes**:
   - `Product.name` + `Product.description`
   - Used by: Explorer Agent text fallback

---

## Search Architecture

### Hybrid Search Strategy

The Explorer Agent uses a sophisticated 3-tier search strategy:

#### Tier 1: Graph Search (Primary)
```cypher
MATCH (p:Product)-[r:MATCHES_INTEREST]->(i:Interest)
WHERE i.name IN $interests
  AND p.price >= $minPrice
  AND p.price <= $maxPrice
WITH p,
     SUM(r.relevance * i.weight) as graphScore
ORDER BY graphScore DESC
LIMIT 100
RETURN p, graphScore
```

**Weight**: 70% of final score
**Advantages**: Precise, explainable, fast
**Limitation**: Requires good interest graph (Phase C addresses this)

#### Tier 2: Vector Search (Secondary)
```cypher
CALL db.index.vector.queryNodes(
  'product-embeddings',
  100,
  $queryEmbedding
)
YIELD node as p, score as vectorScore
WHERE p.price >= $minPrice
  AND p.price <= $maxPrice
RETURN p, vectorScore
```

**Weight**: 30% of final score
**Advantages**: Semantic understanding, handles novel queries
**Limitation**: Less precise, requires quality embeddings

#### Tier 3: Text Fallback (Safety Net)
```cypher
CALL db.index.fulltext.queryNodes(
  'productSearchIndex',
  $queryText
)
YIELD node as p, score as textScore
WHERE p.price >= $minPrice
  AND p.price <= $maxPrice
ORDER BY textScore DESC
LIMIT 100
RETURN p, textScore
```

**Trigger**: When Tier 1+2 return <5 products
**Weight**: 100% (used exclusively when triggered)
**Advantages**: Always finds something
**Added**: Phase A

### Hybrid Scoring Formula

```typescript
const finalScore = (
  (graphScore * 0.7) +
  (vectorScore * 0.3)
) * qualityMultiplier;

// Quality multipliers:
// - Has image: 1.0
// - No image: 0.95
// - Low price (<$10): 0.9
// - Premium product: 1.1
```

---

## Interest Extraction (Phase C)

### LLM-Based Extraction

**Model**: GPT-4o-mini
**Cost**: ~$0.00054 per product
**Speed**: ~2 seconds per product

### Extraction Process

```typescript
// For each product:
1. Send to GPT-4o-mini:
   "Extract 3-10 relevant interests from this product:
    Name: [name]
    Description: [description]
    Category: [category]"

2. LLM returns:
   [
     { name: "wine", relevance: 0.95, confidence: 0.92, category: "beverages" },
     { name: "sommelier", relevance: 0.85, confidence: 0.88, category: "hobbies" },
     { name: "tasting", relevance: 0.80, confidence: 0.85, category: "activities" }
   ]

3. Filter: Keep interests with relevance > 0.3

4. Store: CREATE (p)-[:MATCHES_INTEREST {relevance: r}]->(i)
```

### Batched Processing

**Script**: `scripts/rebuild-interests-batched.sh`
**Batch Size**: 1,000 products
**Total Batches**: 42
**Checkpointing**: Every 100 products
**Resume**: Automatic from last checkpoint

### Quality Features

- **Relevance scoring**: 0.0-1.0 per interest
- **Confidence levels**: Track extraction certainty
- **Category tagging**: Group related interests
- **Deduplication**: Merge similar interests (e.g., "wine" + "wines")
- **Validation**: Reject nonsense or off-topic interests

---

## API Architecture

### Endpoints

#### POST /api/recommend
Main recommendation endpoint.

**Request**:
```json
{
  "userQuery": "Gift for wine-loving mom, $50",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "product": { "id": "p1", "name": "Wine Journal", "price": 45 },
      "score": 0.92,
      "reasoning": "Perfect for documenting tasting notes..."
    }
  ],
  "context": { "recipient": "mom", "interests": ["wine"] },
  "confidence": 0.85,
  "processingTime": 28500
}
```

#### GET /api/conversations
Retrieve conversation history.

**Query Params**:
- `userId`: Filter by user
- `limit`: Number of conversations (default: 50)
- `offset`: Pagination offset

#### GET /api/products
Search and filter products.

**Query Params**:
- `search`: Text search
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `category`: Filter by category
- `limit`: Results limit (default: 50)

#### GET /api/health
Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-29T17:45:00Z"
}
```

---

## Frontend Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **State**: React hooks + Context API
- **API**: Native fetch with proxy

### Pages

1. **Chat UI** (`/`)
   - Interactive recommendation interface
   - Real-time typing indicators
   - Display of recommendations with images
   - Product cards with reasoning

2. **Conversation Logs** (`/logs`)
   - List of past conversations
   - Filter by status (success/error)
   - View detailed agent execution traces
   - Export functionality

3. **Products Explorer** (`/products`)
   - Browse full product catalog
   - Search and filter
   - Category navigation
   - Product statistics

---

## Deployment Architecture

### Current Setup

```
Development Environment:
├─ Backend: localhost:3000
├─ Frontend: localhost:3001
├─ Neo4j: Aura (cloud)
└─ APIs: External (OpenAI, Cohere)

Production (Planned):
├─ Backend: Docker container
├─ Frontend: Vercel/Netlify
├─ Neo4j: Aura (production tier)
├─ APIs: Rate-limited, monitored
└─ CDN: Static assets
```

### Scaling Considerations

**Current Bottlenecks**:
1. Sequential agent execution (25-35s)
2. LLM API calls (rate limits)
3. Graph query complexity

**Optimization Strategies**:
1. Parallelize independent agents (Listener + Memory)
2. Cache LLM responses
3. Pre-compute vector embeddings
4. Optimize Neo4j queries
5. Add Redis caching layer

---

## Security Architecture

### Current Security

✅ **Environment Variables**: Secrets in `.env.local`
✅ **API Validation**: Input sanitization
✅ **Error Handling**: No sensitive data in errors
✅ **Logging**: Separate error logs

### Production Needs

⚠️ **Authentication**: JWT or OAuth2
⚠️ **Rate Limiting**: Prevent abuse
⚠️ **CORS**: Restrict origins
⚠️ **API Key Rotation**: Regular updates
⚠️ **Data Encryption**: At rest and in transit
⚠️ **Audit Logging**: Track all actions

---

## Monitoring & Observability

### Current Logging

**Winston Logger**:
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- Console output (development)

**Logged Metrics**:
- Agent execution times
- API response times
- Error rates
- Query patterns
- Confidence scores
- Graph vs vector usage

### Production Monitoring (Planned)

1. **APM**: Application Performance Monitoring
2. **Error Tracking**: Sentry or similar
3. **Analytics**: User behavior tracking
4. **Alerting**: Critical error notifications
5. **Dashboards**: Real-time metrics

---

## Technology Decisions

### Why Neo4j?
- **Graph relationships**: Natural fit for recommendations
- **Vector support**: Hybrid search in one database
- **ACID compliance**: Data consistency
- **Cypher query language**: Expressive and powerful

### Why GPT-4?
- **High accuracy**: Best for nuanced understanding
- **Reasoning**: Complex relationship analysis
- **Context window**: Handles long conversations

### Why GPT-4o-mini for Phase C?
- **Cost**: 60% cheaper than GPT-4
- **Speed**: 2x faster
- **Quality**: Sufficient for interest extraction
- **Scale**: Affordable for 41,686 products

### Why Cohere for Embeddings?
- **Quality**: High-quality semantic embeddings
- **Cost**: Competitive pricing
- **Specialized**: Built for search/retrieval

---

## Future Architecture

### Phase D: Real-Time Learning
- Capture user feedback
- Adjust relevance scores dynamically
- A/B testing framework

### Phase E: Advanced Features
- Image recognition for products
- Price tracking & alerts
- Purchase history integration
- Social recommendations

### Phase F: Scale
- Microservices architecture
- Event-driven processing
- Distributed caching
- Multi-region deployment

---

## Summary

Present-Agent2 uses a **layered, modular architecture** with:

✅ **10 specialized agents** for different aspects of recommendation
✅ **Hybrid search** combining graph and vector approaches
✅ **Neo4j graph database** for relationships and embeddings
✅ **LLM-powered reasoning** for personalization
✅ **Conversation persistence** for learning
✅ **Modern web interface** for testing and usage
✅ **Batched processing** for large-scale data operations

**Key Strengths**:
- Explainable recommendations (graph relationships)
- Semantic understanding (vector embeddings)
- Personalization (recipient profiles)
- Resilience (text fallback)
- Scalability (batched processing)

**Current Focus**: Phase C deployment (interest extraction)
**Next Focus**: Performance optimization, production hardening

---

**Last Updated**: October 29, 2025
**Version**: 2.1.0 (Phase C deploying)
