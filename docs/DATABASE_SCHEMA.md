# Database Schema (Neo4j)

**Last updated:** 2026-02-19
**Instance:** Local Neo4j 5-community via Docker (`bolt://localhost:7687`)
**Container:** `present-agent-neo4j`

---

## Node Types

### Core Nodes

| Node | Key Properties | Count |
|------|---------------|-------|
| **Product** | product_url (unique), title, description, price, brand_url, embedding | 67,739 |
| **Interest** | name (unique) | 110 |
| **Category** | name (unique) | 59 |
| **GiftOccasion** | name (unique) | 15 |
| **GiftRelationship** | name (unique) | 18 |
| **GiftPersona** | name | 4 |

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

### Embeddings
- `embedding` — 1536-dim float array (OpenAI text-embedding-3-small)

### Quality Signals
- `gift_suitability_score` — Composite gift fitness score
- `popularity_score` — Popularity metric
- `gift_proven` — Boolean: known good gift
- `is_bestseller` — Boolean: brand bestseller (1,113 products)
- `avg_rating` — Average customer rating (665 products)
- `review_count` — Number of reviews (665 products)
- `recommendation_rate` — % of reviewers who recommend (665 products)
- `bestseller_rank` — Rank within brand bestsellers

### Boolean Attribute Flags (14)
Coverage: 72.3% (48,973 products)

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
- `shopify_tags` — Shopify product tags (11,062 products)
- `shopify_product_type` — Shopify product type (11,062 products)

### Source Tracking
- `source` — Data source identifier (e.g. `gift_skus_csv` for iCloud CSV imports)

---

## Relationship Types

| Relationship | From → To | Count | Coverage | Properties |
|-------------|-----------|-------|----------|------------|
| `MATCHES_INTEREST` | Product → Interest | 102,491 | 66.3% (44,911 products) | relevance_score |
| `IN_CATEGORY` | Product → Category | 139,467 | 78.3% (53,006 products) | — |
| `GIFT_FOR_OCCASION` | Product → GiftOccasion | 550,937 | 100% (67,729 products) | — |
| `GIFT_FOR_RELATIONSHIP` | Product → GiftRelationship | 461,997 | 98.8% (66,920 products) | — |
| `FITS_PERSONA` | Product → GiftPersona | 139 | <1% | — |

### User-facing Relationships
| Relationship | From → To | Purpose |
|-------------|-----------|---------|
| `HAS_RECIPIENT` | User → Recipient | User's known recipients |
| `PREFERS` | Recipient → Interest | Recipient preferences |
| `HAD_CONVERSATION` | User → ConversationTurn | Conversation history |
| `RECOMMENDED` | ConversationTurn → Product | Products recommended |

---

## Interest Nodes (110)

Includes: coffee, tea, yoga, wellness, outdoor, hiking, camping, cooking, wine, beer, gardening, reading, music, skateboarding, extreme sports, outdoor adventure, jewelry, fashion, home decor, art, sustainability, and 88 more.

Notable additions (v3.2.0): skateboarding (119 products), music (+39 products), extreme sports (1,355 products), outdoor adventure (5,270 products).

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
Score: vector 35% × zero-match-penalty + interest 25% + quality 15% + price 15% + context 10%
  + archetype attribute boost (up to 8%)
  ↓
Brand diversity enforcement → Top recommendations
```

**Zero-match penalty:** When a product matches zero stated interests but the user has stated interests, the vector score contribution is halved (×0.5). Prevents high-vector-similarity but irrelevant products from dominating.

See `src/services/agents/explorer.ts` for implementation.

---

## Key Statistics (February 19, 2026)

| Metric | Value |
|--------|-------|
| Total products | 67,739 |
| Total brands | 367 |
| Products with embeddings | 67,739 (100%) |
| Products with attribute flags | 48,973 (72.3%) |
| Products with Shopify tags | 11,062 (16.3%) |
| Products with reviews | 665 (1.0%) |
| Bestseller products | 1,113 (1.6%) |
| Products from iCloud CSV | 2,775 (4.1%) |
| Interest nodes | 110 |
| Category nodes | 59 |
| GiftOccasion nodes | 15 |
| GiftRelationship nodes | 18 |
| GiftPersona nodes | 4 |
