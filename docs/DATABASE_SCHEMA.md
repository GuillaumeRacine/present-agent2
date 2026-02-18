# Database Schema (Neo4j)

Local Neo4j 5-community via Docker. Graph + vector hybrid.

---

## Node Types

### Core Nodes

| Node | Key Properties | Count |
|------|---------------|-------|
| **Product** | id, title, description, price, available, vendor, product_embedding | 64,964 |
| **Interest** | id, name, category | 105 canonical |
| **InterestSynonym** | id, synonym, canonical | 872 |
| **Occasion** | id, name | 41 |
| **Category** | name | ~27 |
| **GiftArchetype** | id, name | Gift types (practical, luxury, sentimental, etc.) |

### User/Conversation Nodes

| Node | Key Properties | Purpose |
|------|---------------|---------|
| **User** | id, email, name | System users |
| **Recipient** | id, name, age, preferences, profile | Gift recipients (learned over time) |
| **ConversationTurn** | sessionId, query, response, timestamp | Each query/response pair |
| **Recommendation** | rank, reasoning, confidenceScore | Stored recommendations |
| **Feedback** | event, rating, comment | User feedback on recommendations |

---

## Relationship Types

| Relationship | From → To | Weight | Purpose |
|-------------|-----------|--------|---------|
| `HAS_INTEREST` | Product → Interest | 0.0-1.0 | Product matches interest |
| `SUITABLE_FOR` | Product → Occasion | 0.0-1.0 | Product fits occasion |
| `IN_CATEGORY` | Product → Category | - | Product categorization |
| `SYNONYM_OF` | InterestSynonym → Interest | - | "tech" → "technology" |
| `HAS_RECIPIENT` | User → Recipient | - | User's known recipients |
| `PREFERS` | Recipient → Interest | 0.0-1.0 | Recipient preferences |
| `HAD_CONVERSATION` | User → ConversationTurn | - | Conversation history |
| `RECOMMENDED` | ConversationTurn → Product | - | Products recommended |

---

## Product Attributes (14 Boolean Flags)

Added via multi-LLM enrichment (Dec 2025):

`is_practical`, `is_luxury`, `is_personalizable`, `is_experiential`, `is_collectible`, `is_tech`, `is_handmade`, `is_eco_friendly`, `is_educational`, `is_novelty`, `is_sentimental`, `is_wellness`, `is_subscription`, `is_foodie`

Coverage: 74.6% of products (66,134/88,674 at time of enrichment).

---

## Vector Embeddings (1536 dimensions, cosine similarity)

### Product Embeddings (4 types)

| Index | Property | Purpose |
|-------|----------|---------|
| `product_embedding` | `product_embedding` | General product representation |
| `style_embedding` | `style_embedding` | Aesthetic/design style |
| `sentiment_embedding` | `sentiment_embedding` | Emotional tone |
| `use_case_embedding` | `use_case_embedding` | How product is used |

### User/Recipient Embeddings (5 types)

| Index | Property | Purpose |
|-------|----------|---------|
| `profile_embedding` | `profile_embedding` | User's overall profile |
| `value_embedding` | `value_embedding` | User's values (sustainability, quality) |
| `user_style_embedding` | `style_embedding` | User's aesthetic preferences |
| `interest_embedding` | `interest_embedding` | Recipient's interests |
| `personality_embedding` | `personality_embedding` | Recipient's personality traits |

### Concept Embeddings (3 types)

| Index | Property | Purpose |
|-------|----------|---------|
| `interest_concept` | `interest_embedding` | Interest semantic representation |
| `value_concept` | `value_embedding` | Value semantic representation |
| `occasion_concept` | `occasion_embedding` | Occasion semantic representation |

**Total:** 12 vector indexes, all 1536-dim via OpenAI `text-embedding-3-small`.

---

## Schema Setup (Cypher)

### Constraints

```cypher
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE
CREATE CONSTRAINT interest_id IF NOT EXISTS FOR (i:Interest) REQUIRE i.id IS UNIQUE
CREATE CONSTRAINT recipient_id IF NOT EXISTS FOR (r:Recipient) REQUIRE r.id IS UNIQUE
CREATE CONSTRAINT occasion_id IF NOT EXISTS FOR (o:Occasion) REQUIRE o.id IS UNIQUE
CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE
```

### Property Indexes

```cypher
CREATE INDEX product_price IF NOT EXISTS FOR (p:Product) ON (p.price)
CREATE INDEX product_available IF NOT EXISTS FOR (p:Product) ON (p.available)
CREATE INDEX interest_name IF NOT EXISTS FOR (i:Interest) ON (i.name)
CREATE INDEX conversation_timestamp IF NOT EXISTS FOR (c:ConversationTurn) ON (c.timestamp)
```

### Vector Index Example

```cypher
CREATE VECTOR INDEX product_embedding IF NOT EXISTS
FOR (n:Product) ON (n.product_embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
}
```

### Fulltext Index

```cypher
CREATE FULLTEXT INDEX productSearchIndex IF NOT EXISTS
FOR (p:Product) ON EACH [p.name, p.description]
```

Note: Fulltext indexes are available on local Docker Neo4j (not on Aura Free tier).

---

## Hybrid Search Strategy

```
Query → Graph Search (70% weight) + Vector Search (30% weight) → Combined ranking
         ↓ if < 5 results
       Text Fallback (fulltext index)
```

See `src/services/agents/explorer.ts` for implementation.

---

*Last updated: 2026-02-17*
