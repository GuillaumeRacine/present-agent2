# Database Schema (Neo4j)

**Last verified:** 2026-02-26
**Instance:** Local Neo4j 5-community via Docker (`bolt://localhost:7687`)
**Container:** `present-agent-neo4j`

---

## Node Types

### Core Nodes

| Node | Key Properties | Count |
|------|---------------|-------|
| **Product** | product_url (unique), title, description, price, brand_url, embedding | 133,328 |
| **Interest** | name (unique) | 223 |
| **Category** | name (unique) | 53 |
| **GiftOccasion** | name (unique) | 15 |
| **GiftRelationship** | name (unique) | 18 |

### User/Conversation Nodes

| Node | Key Properties | Purpose |
|------|---------------|---------|
| **User** | id, email, name | System users |
| **Recipient** | id, name, age, preferences, profile | Gift recipients (learned over time) |
| **ConversationTurn** | sessionId, query, response, timestamp | Each query/response pair |
| **Recommendation** | rank, reasoning, confidenceScore | Stored recommendations |
| **Feedback** | event, rating, comment | User feedback on recommendations |

---

## Product Properties (Full)

### Core
- `product_url` — Unique identifier (URL slug)
- `title` — Product name
- `description` — Full product description
- `price` — Numeric price
- `currency` — Price currency (e.g. "USD")
- `brand_url` — Brand domain (e.g. "marinelayer.com")
- `tags` — Product tags (string)
- `materials` — Product materials (string)
- `available` — Boolean: product available for recommendations (required by Explorer agent)
- `source` — Data source identifier

### Embeddings
- `embedding` — 1536-dim float array (OpenAI text-embedding-3-small)
- Coverage: 100% (133,328/133,328 products)

### Quality Signals
- `gift_suitability_score` — Composite gift fitness score
- `popularity_score` — Popularity metric
- `gift_proven` — Boolean: known good gift
- `is_bestseller` — Boolean: brand bestseller (41,770 products, 31%)
- `avg_rating` — Average customer rating (0 products currently)
- `review_count` — Number of reviews (0 products currently)
- `recommendation_rate` — % of reviewers who recommend
- `bestseller_rank` — Rank within brand bestsellers

### Boolean Attribute Flags (14)
Coverage: 58% (77,294/133,328 products)

| Flag | Description |
|------|-------------|
| `is_practical` | Useful everyday item |
| `is_luxury` | Premium/luxury item |
| `is_consumable` | Consumable/food/drink |
| `is_experiential` | Experience-oriented |
| `is_sentimental` | Emotionally meaningful |
| `is_personalized` | Can be personalized |
| `is_eco_friendly` | Environmentally friendly |
| `is_handcrafted` | Handmade/artisan |
| `is_artistic` | Art/creative item |
| `is_educational` | Learning/educational |
| `is_wellness` | Health/wellness focused |
| `is_shared` | Designed for sharing |
| `is_lasting_value` | Durable/long-lasting |
| `is_conversation_starter` | Unique/conversation piece |

### Shopify Enrichment
- `shopify_tags` — Shopify product tags
- `shopify_product_type` — Shopify product type

---

## Relationship Types

| Relationship | From → To | Count | Products Covered | Coverage |
|-------------|-----------|-------|-----------------|----------|
| `MATCHES_INTEREST` | Product → Interest | 167,520 | 65,998 | 49% |
| `IN_CATEGORY` | Product → Category | 234,486 | 79,412 | 60% |
| `GIFT_FOR_OCCASION` | Product → GiftOccasion | 842,412 | 91,774 | 69% |
| `GIFT_FOR_RELATIONSHIP` | Product → GiftRelationship | 758,046 | 90,490 | 68% |

**Note:** Coverage percentages reflect that ~41,545 recently-added products have not yet been enriched. The original 91,783 products have near-100% enrichment.

### User-facing Relationships
| Relationship | From → To | Purpose |
|-------------|-----------|---------|
| `HAS_RECIPIENT` | User → Recipient | User's known recipients |
| `PREFERS` | Recipient → Interest | Recipient preferences |
| `HAD_CONVERSATION` | User → ConversationTurn | Conversation history |
| `RECOMMENDED` | ConversationTurn → Product | Products recommended |

---

## Interest Nodes (223)

Includes: coffee, tea, yoga, wellness, outdoor, hiking, camping, cooking, wine, beer, gardening, reading, music, skateboarding, extreme sports, outdoor adventure, jewelry, fashion, home decor, art, sustainability, and 200+ more.

---

## GiftOccasion Nodes (15)

Birthday, Christmas, Valentine's Day, Mother's Day, Father's Day, Wedding, Anniversary, Graduation, Housewarming, Thank You, Get Well, Baby Shower, Retirement, Just Because, Sympathy.

---

## GiftRelationship Nodes (18)

Partner/Spouse, Parent, Child, Sibling, Friend, Best Friend, Grandparent, Aunt/Uncle, Cousin, Colleague, Boss, Teacher, Mentor, Neighbor, In-Law, Godparent, Pet Owner, Acquaintance.

---

## Indexes

### Vector Index
```cypher
CREATE VECTOR INDEX product_embedding IF NOT EXISTS
FOR (n:Product) ON (n.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
}
```

### Fulltext Index
```cypher
CREATE FULLTEXT INDEX product_search IF NOT EXISTS
FOR (p:Product) ON EACH [p.title, p.description, p.brand_url]
```

### Unique Constraint
```cypher
CREATE CONSTRAINT product_url_unique IF NOT EXISTS
FOR (p:Product) REQUIRE p.product_url IS UNIQUE
```

---

## Hybrid Search Strategy

```
Query interests → Embed interests via OpenAI
  ↓
3 search paths (parallel):
  1. Interest graph walk: MATCHES_INTEREST + IN_CATEGORY + occasion/relationship context
  2. Vector similarity: product_embedding index (cosine, top N)
  3. Interest-first graph: Start from Interest nodes, walk to Products
  ↓
Score: interest 35% + vector 25% + quality 15% + price 15% + context 10%
  + archetype attribute boost (up to 8%)
  ↓
Zero-match penalty → Brand diversity enforcement → Top recommendations
```

**Zero-match penalty:** When a product matches zero stated interests but the user has stated interests, the vector score contribution is reduced (x0.3). Products with NO interest graph matches are removed from the candidate pool when the user states interests.

See `src/src/services/agents/explorer.ts` for implementation.

---

## Key Statistics (February 26, 2026)

| Metric | Value |
|--------|-------|
| Total products | 133,328 |
| Total brands | 4,809 |
| Products with embeddings | 133,328 (100%) |
| Products with attribute flags | 77,294 (58%) |
| Products with interests | 65,998 (49%) |
| Products with categories | 79,412 (60%) |
| Products with occasions | 91,774 (69%) |
| Products with relationships | 90,490 (68%) |
| Bestseller products | 41,770 (31%) |
| Available = true | 133,328 (100%) |
| Interest nodes | 223 |
| Category nodes | 53 |
| GiftOccasion nodes | 15 |
| GiftRelationship nodes | 18 |
