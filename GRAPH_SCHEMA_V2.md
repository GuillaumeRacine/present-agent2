# Comprehensive Graph Schema for Gift Recommendations

## Design Philosophy

**Core Principle:** Graph structure + Node embeddings + Relationship learning

- **Graph:** Captures explicit connections (User→Recipient, Product→Occasion)
- **Embeddings:** Capture semantic meaning (interests, values, product descriptions)
- **Inference:** Learn implicit patterns (complementary interests, gift archetypes)

**NO manual faceting.** All dimensions inferred from:
- User chat messages (LLM extracts context)
- Product descriptions (embeddings capture semantics)
- Interaction history (behavior reveals preferences)

---

## Node Types

### 1. User
The gift giver and their complete context.

```cypher
(:User {
  id: string,
  email: string,
  name: string,
  created_at: datetime,

  // Embeddings (1536-dim vectors)
  profile_embedding: float[],      // Semantic profile from chat history
  value_embedding: float[],        // Values/lifestyle (vegan, eco-friendly, etc.)
  style_embedding: float[],        // Aesthetic preferences

  // Aggregated metrics
  total_recommendations: int,
  total_gifts_given: int,
  avg_gift_price: float,
  favorite_categories: string[]    // Inferred from history
})
```

**Learned from:**
- Chat conversation analysis (LLM extracts values, style, personality)
- Gift history patterns
- Budget behavior over time

---

### 2. Recipient
People in the user's life who receive gifts.

```cypher
(:Recipient {
  id: string,
  name: string,
  relationship_type: string,       // Inferred from context (dad, wife, friend)

  // Embeddings
  interest_embedding: float[],     // Semantic interests
  personality_embedding: float[],  // Personality traits (inferred from descriptions)

  // Metadata
  age_range: string,               // Inferred from context (optional)
  gender: string,                  // Inferred from context (optional)

  // Aggregated
  gifts_received_count: int,
  avg_gift_price_received: float
})
```

**Learned from:**
- User descriptions in chat ("my dad loves coffee and hiking")
- Gift outcomes (what worked, what didn't)

---

### 3. Occasion
Events that prompt gift-giving.

```cypher
(:Occasion {
  id: string,
  name: string,                    // birthday, anniversary, holiday, etc.

  // Embeddings
  occasion_embedding: float[],     // Semantic meaning (what makes it special)
  sentiment_embedding: float[],    // Emotional tone (celebratory, romantic, formal)

  // Temporal
  is_recurring: boolean,
  typical_months: int[],           // When this occasion happens

  // Budget patterns
  avg_spend: float,                // Learned from history
  spend_variance: float
})
```

**Learned from:**
- User mentions in chat
- Seasonal patterns in gift-giving
- Budget analysis per occasion type

---

### 4. Interest
Hobbies, activities, passions.

```cypher
(:Interest {
  id: string,
  name: string,                    // coffee, hiking, gaming, reading, etc.

  // Embeddings
  interest_embedding: float[],     // Semantic meaning

  // Graph-learned
  popularity: float,               // How common is this interest
  gift_match_score: float          // How well does this map to products
})
```

**Key: Complementary interests learned via graph**
```cypher
(:Interest)-[:COMPLEMENTS {strength: float}]->(:Interest)
// Example: coffee COMPLEMENTS reading, morning_routine, artisanal_goods
```

**Inferred from:**
- User mentions
- Product descriptions
- Co-occurrence in successful recommendations

---

### 5. Value
Lifestyle values, requirements, preferences.

```cypher
(:Value {
  id: string,
  name: string,                    // vegan, eco-friendly, religious, minimalist
  category: string,                // dietary, ethical, religious, aesthetic

  // Embeddings
  value_embedding: float[],        // Semantic meaning

  // Constraints
  is_requirement: boolean,         // Must-have vs. nice-to-have
  is_exclusion: boolean            // Must NOT have (e.g., no animal products)
})
```

**Inferred from:**
- Chat analysis ("they're vegan", "she cares about sustainability")
- Product filtering behavior
- Explicit user statements

---

### 6. Product
Physical/digital products that can be gifted.

```cypher
(:Product {
  id: string,
  title: string,
  description: string,
  price: float,
  currency: string,
  vendor: string,
  url: string,
  image_url: string,
  available: boolean,

  // Embeddings (MULTIPLE for different aspects)
  product_embedding: float[],      // Overall semantic embedding
  style_embedding: float[],        // Visual/aesthetic style
  sentiment_embedding: float[],    // Emotional tone (fun, serious, romantic)
  use_case_embedding: float[],     // How it's used (practical, decorative, experiential)

  // Inferred attributes (NO manual tagging)
  gift_archetype: string,          // Inferred: practical, sentimental, experiential, humorous
  formality_score: float,          // 0-1: casual to formal
  uniqueness_score: float,         // 0-1: common to unique
  experience_score: float          // 0-1: physical object to pure experience
})
```

**Key: No prescribed categories!** Everything inferred from:
- Product description embeddings
- Purchase patterns
- User feedback

---

### 7. ConversationTurn
Individual messages in user chat sessions.

```cypher
(:ConversationTurn {
  id: string,
  session_id: string,
  user_id: string,
  message: string,
  role: string,                    // user | assistant
  timestamp: datetime,

  // Embeddings
  message_embedding: float[],      // Semantic content

  // Extracted entities (by LLM)
  mentioned_interests: string[],
  mentioned_values: string[],
  mentioned_recipients: string[],
  mentioned_occasions: string[],

  // Intent
  intent_type: string,             // search | refine | question | feedback
  sentiment: float                 // -1 to 1
})
```

**Used for:**
- Building user/recipient profiles over time
- Learning what descriptions work
- Identifying successful recommendation patterns

---

### 8. Recommendation
A recommendation event (product shown to user).

```cypher
(:Recommendation {
  id: string,
  user_id: string,
  session_id: string,
  product_id: string,
  timestamp: datetime,

  // Context
  query: string,
  rank: int,                       // Position in results (1-5)

  // Scores
  vector_score: float,             // Pure embedding similarity
  graph_score: float,              // Graph traversal contribution
  final_score: float,              // Combined score
  confidence: float,

  // Outcome (if known)
  was_clicked: boolean,
  was_purchased: boolean,
  was_liked: boolean,
  was_dismissed: boolean,
  feedback_text: string,

  // Attribution
  reasoning_path: string[],        // Which graph paths contributed
  matched_interests: string[],
  matched_values: string[]
})
```

**Critical for learning:**
- What recommendations work
- Which graph patterns predict success
- How to weight vector vs. graph signals

---

### 9. GiftArchetype (Inferred Category)
High-level gift types learned from patterns.

```cypher
(:GiftArchetype {
  id: string,
  name: string,                    // practical, sentimental, experiential, humorous

  // Embeddings
  archetype_embedding: float[],    // Semantic center of this archetype

  // Learned characteristics
  typical_price_range: [float, float],
  typical_occasions: string[],
  typical_relationships: string[]
})
```

**Learned, not prescribed.** Clusters emerge from:
- Product embeddings (k-means or similar)
- Purchase patterns
- Co-occurrence with occasions/relationships

---

## Relationships

### User → Recipient

```cypher
(:User)-[:HAS_RELATIONSHIP {
  relationship_type: string,       // dad, spouse, friend, colleague
  closeness: float,                // 0-1, inferred from chat/history
  years_known: int,
  gift_count: int,
  avg_gift_price: float,
  last_gift_date: datetime,

  // Learned patterns
  preferred_gift_archetypes: string[],
  successful_interests: string[]
}]->(:Recipient)
```

---

### User → Interest

```cypher
(:User)-[:HAS_INTEREST {
  strength: float,                 // 0-1, how much they care
  mentioned_count: int,
  first_mentioned: datetime,
  context: string                  // "for myself" vs. "for gift ideas"
}]->(:Interest)
```

---

### Recipient → Interest

```cypher
(:Recipient)-[:INTERESTED_IN {
  strength: float,                 // Inferred from user descriptions
  confidence: float,               // How sure are we
  source: string,                  // "user_stated" | "inferred" | "gift_history"
  mentioned_count: int
}]->(:Interest)
```

---

### Recipient → Value

```cypher
(:Recipient)-[:VALUES {
  importance: float,               // 0-1, how critical is this
  is_requirement: boolean,         // Must respect this (e.g., vegan)
  confidence: float
}]->(:Value)
```

---

### Product → Interest

```cypher
(:Product)-[:MATCHES_INTEREST {
  relevance_score: float,          // 0-1, how well does it match
  match_type: string,              // "direct" | "complementary" | "aspirational"
  inferred_by: string              // "embedding" | "purchase_history" | "description_nlp"
}]->(:Interest)
```

---

### Product → Value

```cypher
(:Product)-[:ALIGNS_WITH {
  alignment_score: float,          // 0-1
  is_certified: boolean,           // Actually certified vs. inferred
  confidence: float
}]->(:Value)
```

---

### Product → Occasion

```cypher
(:Product)-[:SUITABLE_FOR {
  suitability_score: float,        // 0-1, learned from history
  purchase_count: int,             // How often bought for this occasion
  success_rate: float              // When recommended, how often clicked/purchased
}]->(:Occasion)
```

---

### Product → GiftArchetype

```cypher
(:Product)-[:BELONGS_TO {
  membership_score: float,         // 0-1, fuzzy membership
  primary: boolean                 // Is this the main archetype
}]->(:GiftArchetype)
```

---

### Interest → Interest (Complementary)

```cypher
(:Interest)-[:COMPLEMENTS {
  strength: float,                 // 0-1, how often co-occur
  context: string,                 // "gift_giving" | "personal_interests"
  co_occurrence_count: int
}]->(:Interest)
```

**Examples learned from data:**
- coffee COMPLEMENTS reading, morning_routine, cozy_aesthetic
- hiking COMPLEMENTS photography, camping, outdoor_cooking
- gaming COMPLEMENTS anime, collectibles, tech_gadgets

---

### Recommendation → Product

```cypher
(:Recommendation)-[:RECOMMENDED {
  rank: int,
  score: float
}]->(:Product)
```

---

### Recommendation → ConversationTurn

```cypher
(:Recommendation)-[:GENERATED_FROM {
  turn_number: int
}]->(:ConversationTurn)
```

---

## Embeddings Strategy

### Multiple Embeddings Per Entity

**Product has 4 embeddings:**
1. `product_embedding` - Overall semantics (from title + description)
2. `style_embedding` - Visual/aesthetic (inferred from description)
3. `sentiment_embedding` - Emotional tone (inferred)
4. `use_case_embedding` - How it's used (inferred)

**Why?** Different aspects matter in different contexts:
- Searching for "coffee gift" → `product_embedding` (semantic match)
- User values "minimalist" → `style_embedding` (aesthetic match)
- Occasion is "romantic anniversary" → `sentiment_embedding` (emotional match)
- Recipient is "practical person" → `use_case_embedding` (utility match)

### Embedding Generation Process

**For Products:**
```python
# Generate specialized embeddings
product_embedding = embed(title + description)
style_embedding = embed("Aesthetic style: " + extract_style_cues(description))
sentiment_embedding = embed("Emotional tone: " + extract_sentiment(description))
use_case_embedding = embed("Use case: " + extract_use_case(description))
```

**For Users (from chat history):**
```python
# Aggregate conversation turns
profile_text = aggregate_user_messages(conversation_history)
value_text = extract_values_and_preferences(conversation_history)
style_text = extract_style_mentions(conversation_history)

user.profile_embedding = embed(profile_text)
user.value_embedding = embed(value_text)
user.style_embedding = embed(style_text)
```

**For Recipients (from user descriptions):**
```python
# From user's descriptions of the recipient
interest_text = aggregate_interest_mentions(user_descriptions)
personality_text = extract_personality_traits(user_descriptions)

recipient.interest_embedding = embed(interest_text)
recipient.personality_embedding = embed(personality_text)
```

---

## Recommendation Algorithm

### Hybrid: Graph Traversal + Multi-Embedding Similarity

```cypher
// 1. Start from User and context
MATCH (u:User {id: $userId})
MATCH (r:Recipient {id: $recipientId})
MATCH (o:Occasion {name: $occasion})

// 2. Get recipient's interests and values
MATCH (r)-[ri:INTERESTED_IN]->(i:Interest)
MATCH (r)-[rv:VALUES]->(v:Value)

// 3. Find products via multiple paths
MATCH (p:Product)
WHERE p.available = true
  AND p.price >= $minPrice
  AND p.price <= $maxPrice

// Path 1: Interest matching
OPTIONAL MATCH (p)-[pmi:MATCHES_INTEREST]->(i)

// Path 2: Value alignment
OPTIONAL MATCH (p)-[pav:ALIGNS_WITH]->(v)

// Path 3: Occasion suitability
OPTIONAL MATCH (p)-[pso:SUITABLE_FOR]->(o)

// Path 4: Successful pattern (similar users liked this)
OPTIONAL MATCH (similar_user:User)-[sur:HAS_RELATIONSHIP]->(similar_recipient:Recipient)
WHERE similar_user <> u
  AND sur.relationship_type = $relationshipType
OPTIONAL MATCH (rec:Recommendation {product_id: p.id, was_liked: true})
WHERE rec.user_id = similar_user.id

// 4. Graph score (weighted sum of paths)
WITH p, i, v, o,
  SUM(pmi.relevance_score * ri.strength) as interest_score,
  SUM(pav.alignment_score * rv.importance) as value_score,
  AVG(pso.suitability_score) as occasion_score,
  COUNT(rec) as social_proof_score,

  // 5. Multi-embedding similarity scores
  gds.similarity.cosine(u.profile_embedding, p.product_embedding) as profile_match,
  gds.similarity.cosine(u.style_embedding, p.style_embedding) as style_match,
  gds.similarity.cosine(r.personality_embedding, p.sentiment_embedding) as personality_match,
  gds.similarity.cosine(o.sentiment_embedding, p.sentiment_embedding) as occasion_sentiment_match

// 6. Combine scores (learned weights)
WITH p,
  (0.25 * interest_score +
   0.25 * value_score +
   0.15 * occasion_score +
   0.10 * social_proof_score +
   0.10 * profile_match +
   0.05 * style_match +
   0.05 * personality_match +
   0.05 * occasion_sentiment_match) as final_score

ORDER BY final_score DESC
LIMIT 10

RETURN p, final_score
```

---

## Learning & Inference

### What Gets Learned (NO Human Input)

1. **Interest Complementarity**
   - From: Co-occurrence in successful recommendations
   - Creates: Interest-[COMPLEMENTS]->Interest edges with strengths

2. **Gift Archetypes**
   - From: Product embedding clusters
   - Creates: GiftArchetype nodes + Product-[BELONGS_TO]->GiftArchetype

3. **Occasion Suitability**
   - From: Purchase history by occasion
   - Creates: Product-[SUITABLE_FOR]->Occasion with learned scores

4. **Value Alignment**
   - From: Product descriptions + user feedback
   - Creates: Product-[ALIGNS_WITH]->Value with confidence scores

5. **Relationship Patterns**
   - From: User-Recipient gift history
   - Updates: HAS_RELATIONSHIP.preferred_gift_archetypes

6. **Score Weights**
   - From: A/B testing different weight combinations
   - Optimizes: The 8 weights in the final score formula

---

## What's NOT Missing Anymore

✅ Temporal patterns - Occasion.typical_months, seasonal analysis
✅ Budget sensitivity - Per user, per relationship (in HAS_RELATIONSHIP)
✅ Gift outcomes - Recommendation.was_liked, feedback tracking
✅ Product attributes - Multiple embeddings capture all aspects
✅ Gift archetypes - Learned clusters, not prescribed

---

## Implementation Priority

**Phase 1: Core Graph (Now)**
- User, Recipient, Product, Interest, Value nodes
- Basic relationships
- Single product_embedding

**Phase 2: Conversation Integration**
- ConversationTurn nodes
- Build user/recipient profiles from chat
- Extract entities from conversations

**Phase 3: Recommendation Tracking**
- Recommendation nodes
- Track outcomes
- Learn from feedback

**Phase 4: Multi-Embeddings**
- Add specialized embeddings (style, sentiment, use_case)
- Multi-path similarity matching

**Phase 5: Advanced Learning**
- Interest complementarity
- Gift archetype clustering
- Weight optimization via A/B testing

---

## Key Insight

**The graph structure provides:**
- Explicit connections (User→Recipient, Product→Interest)
- Traversal paths (find products via multiple routes)
- Relationship strength (weighted edges)

**The embeddings provide:**
- Semantic similarity (fuzzy matching)
- Multi-aspect matching (style, sentiment, use case)
- Generalization (products similar to liked items)

**Together:** Graph structure + embeddings = Rich, learnable, inference-based recommendations.

No facets. No manual categories. Just structure + semantics + learning.
