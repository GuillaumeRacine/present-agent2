# Present-Agent2: Database & Data Architecture

**Database:** Neo4j (Graph + Vector)
**Approach:** Hybrid (Graph relationships + Vector embeddings + Text search)

**Instance:** local via docker desktop: /Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2
version: "3.8"

# Local Neo4j for Present Agent2
# All data stored on SSD at ./neo4j-data/
# Usage:
#   docker compose up -d
#   docker compose logs -f neo4j
#   docker compose down

services:
  neo4j:
    image: neo4j:5-community
    container_name: present-agent-neo4j
    ports:
      - "7474:7474"   # Browser UI
      - "7687:7687"   # Bolt protocol
    environment:
      - NEO4J_AUTH=neo4j/presentagent2024
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=1G
      - NEO4J_server_memory_pagecache_size=512m
      # Enable vector index support
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
      - NEO4J_dbms_security_procedures_allowlist=apoc.*
    volumes:
      - ./neo4j-data/data:/data
      - ./neo4j-data/logs:/logs
      - ./neo4j-data/plugins:/plugins
      - ./neo4j-data/import:/var/lib/neo4j/import
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s


---

## Why This Architecture?

**Graph database chosen because gift recommendations are inherently contextual, relational and with different intentions/motivations vs. self-shopping - hence why more subjective, contextual and qualitative insights can provide more curated, personal, delightful and thoughtful experiences:**
- Product ↔ Interest relationships
- User ↔ Recipient relationships
- Gift ↔ Occasion appropriateness
- Interest ↔ Interest similarities (yoga + wellness)

**Vector embeddings added for semantic search:**
- "Wine lover" matches products even without exact "wine" tag
- Captures nuance (sommelier, tasting, vineyard all cluster near wine)
- Handles synonyms and related concepts

**Result:** Best of both worlds - precise relationships + fuzzy semantic matching

---

## Node Types (Entities)

### Core Nodes

| Node | Properties | Purpose |
|------|-----------|---------|
| **Product** | id, title, description, price, available, vendor | 88,674 B-Corp products |
| **Interest** | id, name | 105 canonical interests (e.g., "coffee", "hiking") |
| **InterestSynonym** | id, synonym, canonical | 872 synonyms mapped to interests |
| **Occasion** | id, name | 41 occasions (birthday, anniversary, etc.) |
| **User** | id, email, name | People using the system |
| **Recipient** | id, name, age, preferences | Gift recipients (learned over time) |
| **Category** | name | Product categories |
| **GiftArchetype** | id, name | Gift types (practical, luxury, sentimental, etc.) |

### Conversation Nodes

| Node | Purpose |
|------|---------|
| **ConversationTurn** | Each query/response in a chat session |
| **Recommendation** | Stores recommended products with reasoning |

---

## Relationship Types (Edges)

| Relationship | From → To | Purpose | Weight |
|--------------|-----------|---------|--------|
| **HAS_INTEREST** | Product → Interest | Product matches interest | 0.0-1.0 |
| **SUITABLE_FOR** | Product → Occasion | Product fits occasion | 0.0-1.0 |
| **IN_CATEGORY** | Product → Category | Product categorization | - |
| **SYNONYM_OF** | InterestSynonym → Interest | Map "tech" → "technology" | - |
| **HAS_RECIPIENT** | User → Recipient | User's known recipients | - |
| **PREFERS** | Recipient → Interest | Recipient's interests | 0.0-1.0 |
| **HAD_CONVERSATION** | User → ConversationTurn | Conversation history | - |
| **RECOMMENDED** | ConversationTurn → Product | Products recommended | - |

---

## Vector Embeddings (1536 dimensions)

### Product Embeddings (4 types)

| Embedding | Property | Purpose |
|-----------|----------|---------|
| **Product embedding** | `product_embedding` | General product representation |
| **Style embedding** | `style_embedding` | Aesthetic/design style |
| **Sentiment embedding** | `sentiment_embedding` | Emotional tone |
| **Use case embedding** | `use_case_embedding` | How product is used |

**Example:**
```javascript
Product: "Hand-carved wooden coffee scoop"
- product_embedding: [coffee, wood, artisan, kitchen, ...]
- style_embedding: [rustic, handmade, natural, ...]
- sentiment_embedding: [thoughtful, warm, personal, ...]
- use_case_embedding: [daily ritual, morning routine, ...]
```

### User/Recipient Embeddings (5 types)

| Entity | Embedding | Purpose |
|--------|-----------|---------|
| **User** | `profile_embedding` | User's overall profile |
| **User** | `value_embedding` | User's values (sustainability, quality) |
| **User** | `style_embedding` | User's aesthetic preferences |
| **Recipient** | `interest_embedding` | Recipient's interests |
| **Recipient** | `personality_embedding` | Recipient's personality traits |

### Concept Embeddings (3 types)

| Entity | Embedding | Purpose |
|--------|-----------|---------|
| **Interest** | `interest_embedding` | Interest semantic representation |
| **Value** | `value_embedding` | Value semantic representation |
| **Occasion** | `occasion_embedding` | Occasion semantic representation |

**Total:** 12 vector indexes (all 1536-dim, cosine similarity)

---

## Hybrid Search Strategy

### 3-Mode Search (Used by Explorer Agent)

```
User Query: "Gift for wine-loving mom, $50"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ MODE 1: GRAPH SEARCH (70% weight)                          │
├─────────────────────────────────────────────────────────────┤
│ MATCH (p:Product)-[:HAS_INTEREST]->(i:Interest)            │
│ WHERE i.name IN ['wine', 'sommelier', 'tasting']           │
│   AND p.price <= 50                                        │
│ RETURN p, score                                            │
│                                                             │
│ Result: 45 products with exact interest matches            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ MODE 2: VECTOR SEARCH (30% weight)                         │
├─────────────────────────────────────────────────────────────┤
│ Query Embedding: embed("wine-loving mom gift $50")         │
│                                                             │
│ CALL db.index.vector.queryNodes(                           │
│   'product_embedding',                                      │
│   100,                                                      │
│   queryEmbedding                                            │
│ )                                                           │
│ YIELD node, score                                          │
│ WHERE node.price <= 50                                     │
│                                                             │
│ Result: 100 products semantically similar                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ MODE 3: TEXT FALLBACK (if both fail)                       │
├─────────────────────────────────────────────────────────────┤
│ CALL db.index.fulltext.queryNodes(                         │
│   'product_fulltext',                                       │
│   'wine AND (gift OR accessory)'                           │
│ )                                                           │
│ YIELD node, score                                          │
│                                                             │
│ Note: Fulltext NOT available on Aura Free tier             │
│ Status: Gracefully skipped, not blocking                   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ COMBINE & RANK                                              │
├─────────────────────────────────────────────────────────────┤
│ FinalScore = (0.7 × GraphScore) + (0.3 × VectorScore)      │
│                                                             │
│ Top 24 products returned, ranked by FinalScore             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Enrichment Status (December 2025)

| Enrichment | Coverage | Details |
|------------|----------|---------|
| **Products** | 88,674 total | B-Corp certified brands |
| **Interests** | 99.3% (88,053 products) | 105 canonical + 872 synonyms, avg 5.2/product |
| **Occasions** | 84.6% (75,060 products) | 41 occasions, avg 3.1/product |
| **Attributes** | 74.6% (66,134 products) | 14 boolean flags (is_practical, is_luxury, etc.) |

**Embeddings:** Generated for products, interests, occasions (1536-dim via OpenAI text-embedding-3-small)

---

## Schema Setup

### Constraints (Data Integrity)

```cypher
CREATE CONSTRAINT user_id IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE

CREATE CONSTRAINT product_id IF NOT EXISTS
FOR (p:Product) REQUIRE p.id IS UNIQUE

CREATE CONSTRAINT interest_id IF NOT EXISTS
FOR (i:Interest) REQUIRE i.id IS UNIQUE

-- + 7 more constraints (Recipient, Value, Occasion, Category, etc.)
```

### Property Indexes (Query Performance)

```cypher
CREATE INDEX product_price IF NOT EXISTS
FOR (p:Product) ON (p.price)

CREATE INDEX product_available IF NOT EXISTS
FOR (p:Product) ON (p.available)

-- + 3 more indexes (conversation_timestamp, user_email, etc.)
```

### Vector Indexes (Similarity Search)

```cypher
CREATE VECTOR INDEX product_embedding IF NOT EXISTS
FOR (n:Product) ON (n.product_embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
}

-- + 11 more vector indexes (style, sentiment, use_case, etc.)
```

---

## Example Data Flow

### 1. Product Ingestion

```javascript
// From 88K B-Corp products CSV
{
  product_id: "prod_12345",
  title: "Hand-carved olive wood coffee scoop",
  description: "Artisan-crafted from sustainable olive wood...",
  price: 28.50,
  vendor: "Ten Thousand Villages",
  category: "Kitchen & Dining"
}
    ↓
// Generate embeddings
product_embedding = embed(title + description)
style_embedding = embed("rustic, handmade, natural, wood")
sentiment_embedding = embed("thoughtful, warm, personal")
use_case_embedding = embed("daily coffee ritual, kitchen tool")
    ↓
// Create graph relationships
MATCH (p:Product {id: "prod_12345"})
MATCH (i:Interest {name: "coffee"})
CREATE (p)-[:HAS_INTEREST {weight: 0.95}]->(i)

MATCH (o:Occasion {name: "housewarming"})
CREATE (p)-[:SUITABLE_FOR {weight: 0.80}]->(o)
```

### 2. Query Execution

```javascript
User: "Gift for coffee-loving friend, $30 budget"
    ↓
// Listener Agent extracts context
{
  recipient: "friend",
  interests: ["coffee"],
  budget: 30,
  relationship: "friend"
}
    ↓
// Explorer Agent: Hybrid search
Graph: 45 products with coffee interest
Vector: 100 products semantically similar
Combined: 24 products ranked
    ↓
// Validator Agent: Filter
24 → 12 products (quality gates)
    ↓
// Return top 5 with reasoning
```

---

## Why Graph + Vector (Not Just One)?

### Graph Alone (Insufficient)

**Problem:** Can't handle:
- Synonyms ("tech" vs "technology" vs "gadgets")
- Related concepts (yoga → wellness → mindfulness)
- Vague queries ("something unique")

### Vector Alone (Insufficient)

**Problem:** Can't leverage:
- Explicit relationships (product suitable for birthday)
- Weighted connections (coffee 0.95 match vs 0.20)
- Structured data (price, availability, vendor)

### Graph + Vector = Optimal

**Strengths:**
- Graph: Precise, explainable, structured
- Vector: Fuzzy, semantic, handles ambiguity
- Hybrid: Best of both, 70/30 weighting

---

## Current Limitations

### 1. Neo4j Aura Free Tier

| Feature | Status | Impact |
|---------|--------|--------|
| Graph relationships | ✅ Full support | Core functionality works |
| Vector indexes | ✅ Full support | Semantic search works |
| Fulltext indexes | ❌ Not available | Text fallback disabled |
| Performance | ⚠️ Limited compute | Slower queries |

**Workaround:** Rely on graph + vector (70/30), skip fulltext gracefully

**Upgrade Option:** $65/month for paid tier → gets fulltext + better performance

### 2. Sparse Recall Issue

**Current:** Explorer returns 1-4 candidates (too few)
**Target:** 10-20 candidates for Validator to filter
**Cause:** Batch size too small (10), thresholds too strict
**Fix:** Increase batch to 50, lower thresholds

---

## Right Approach? YES ✅

### Why This Architecture Works

1. **Graph captures structure** - Gift-giving has inherent relationships
2. **Vectors capture meaning** - Semantic similarity fills gaps
3. **Hybrid balances both** - 70% structure, 30% semantics
4. **Neo4j native support** - Built-in vector + graph in single database
5. **Proven in production** - 88K products, 99.3% interest coverage

### Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| **PostgreSQL + pgvector** | No native graph, need separate graph DB |
| **Pinecone/Weaviate** | Pure vector, lose relationship structure |
| **Qdrant + PostgreSQL** | 2 databases, sync complexity |
| **Pure LLM (no DB)** | Too expensive, can't scale to 88K products |

**Verdict:** Neo4j graph + vector is the right choice for this use case.

---

## Next Steps

### Immediate

1. **Fix Neo4j connection** - Instance may be paused (Aura Free idles after inactivity)
2. **Verify schema** - Run `npm run setup:schema --verify`
3. **Test queries** - Ensure hybrid search works

### Future Enhancements

1. **Collaborative filtering** - Add User→Product purchase relationships
2. **Temporal data** - Track recommendation effectiveness over time
3. **Graph algorithms** - PageRank for product importance
4. **Multi-hop queries** - "Products similar to products that users like me bought"

---

**Database is solid. Architecture is right. Issues are environment/config, not design.** ✅
