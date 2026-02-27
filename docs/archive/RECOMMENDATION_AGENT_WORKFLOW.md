# Multi-Agent Recommendation Workflow

## Philosophy: Like a Thoughtful Friend

Imagine a friend helping you find a gift. They would:
1. **Listen carefully** to understand who you're shopping for
2. **Ask clarifying questions** to get the full picture
3. **Recall past conversations** about this person
4. **Consider the relationship** and what matters
5. **Think deeply** about what would be meaningful
6. **Explore options** from multiple angles
7. **Validate ideas** against constraints
8. **Present thoughtfully** with personal reasoning
9. **Learn from feedback** to improve next time

Each agent embodies one of these aspects of thoughtful gift-giving.

---

## Agent Workflow Overview

```
User Query
    ↓
[1. LISTENER AGENT] - Extracts deep context
    ↓
[2. MEMORY AGENT] - Recalls relevant history
    ↓
[3. RELATIONSHIP AGENT] - Analyzes relationship dynamics
    ↓
[4. CONSTRAINTS AGENT] - Validates requirements (budget, values, timing)
    ↓
[5. MEANING AGENT] - Identifies what would be meaningful
    ↓
[6. EXPLORER AGENT] - Finds candidates via graph + embeddings
    ↓
[7. VALIDATOR AGENT] - Checks fit against all criteria
    ↓
[8. STORYTELLER AGENT] - Crafts personal reasoning
    ↓
[9. PRESENTER AGENT] - Formats final recommendations
    ↓
Recommendations to User
    ↓
[10. LEARNING AGENT] - Learns from feedback
```

---

## Agent Definitions

### 1. Listener Agent
**Role:** Deep understanding of user intent

**Input:** Raw user query
**Output:** Rich context object

**Responsibilities:**
- Extract explicit information (recipient, occasion, budget, interests)
- Infer implicit context (urgency, emotional tone, relationship dynamics)
- Identify constraints (must-haves, deal-breakers)
- Detect sentiment and stress level (casual browse vs. urgent need)
- Ask clarifying questions if ambiguous

**Example:**
```
Input: "Need something for my dad's birthday, he's been stressed at work lately"

Output:
{
  recipient: "dad",
  occasion: "birthday",
  emotional_context: "stressed, needs relaxation",
  gift_intent: "stress relief + birthday celebration",
  relationship_tone: "caring, supportive",
  urgency: "planned",
  implicit_needs: ["relaxation", "appreciation", "quality time"]
}
```

**Specialized LLM Prompt:**
```
You are a deeply empathetic listener. Your role is to understand not just WHAT
the user is asking for, but WHY and what EMOTIONAL needs underlie the request.

Listen for:
- Explicit facts (who, when, budget)
- Emotional undertones (stress, celebration, obligation, love)
- Relationship dynamics (close, formal, complicated)
- Unspoken needs (connection, appreciation, humor)

Ask clarifying questions when you sense important context is missing.
```

---

### 2. Memory Agent
**Role:** Recall relevant history

**Input:** Context from Listener + user_id + recipient_id
**Output:** Historical insights

**Responsibilities:**
- Query conversation history for this user
- Find past mentions of this recipient
- Recall previous gifts given to similar people
- Identify user's stated values and preferences
- Surface relevant past recommendations and outcomes

**Example:**
```
Input: {user: "user_123", recipient: "dad", occasion: "birthday"}

Output:
{
  past_conversations: [
    "3 months ago: mentioned dad loves coffee and morning routine",
    "6 months ago: dad appreciated practical gifts over novelty"
  ],
  previous_gifts: [
    {recipient: "dad", occasion: "father's day", product: "book on woodworking", outcome: "loved it"}
  ],
  user_values: ["quality over quantity", "sustainable products"],
  recipient_interests: ["coffee", "woodworking", "hiking", "reading"],
  successful_patterns: ["practical + thoughtful", "supports hobbies"]
}
```

**Graph Query:**
```cypher
MATCH (u:User {id: $userId})-[:HAS_RELATIONSHIP]->(r:Recipient {id: $recipientId})
MATCH (u)-[:HAD_CONVERSATION]->(ct:ConversationTurn)
WHERE ct.mentioned_recipients CONTAINS r.name
MATCH (r)-[:INTERESTED_IN]->(i:Interest)
MATCH (past_rec:Recommendation)-[:FOR_RECIPIENT]->(r)
WHERE past_rec.was_liked = true
RETURN ct.message, i.name, past_rec
```

---

### 3. Relationship Agent
**Role:** Understand relationship dynamics

**Input:** Context + Memory insights
**Output:** Relationship profile

**Responsibilities:**
- Analyze relationship type and closeness
- Determine appropriate formality level
- Identify relationship "love language" (quality time, gifts, acts of service)
- Consider social context (will others be present? is this reciprocal?)
- Assess relationship stage (new, established, complicated)

**Example:**
```
Input: {recipient: "dad", relationship_type: "parent", past_interactions: [...]}

Output:
{
  closeness_score: 0.85,
  formality: "casual but respectful",
  love_language: "quality time + practical gifts",
  gift_giving_style: "Dad appreciates thought over expense",
  social_context: "family birthday gathering",
  relationship_stage: "established, supportive",
  key_insight: "Dad values things that show you know him well",
  budget_guidance: "$30-$80 feels right (not too cheap, not excessive)",
  tone_guidance: "Personal, practical, with a touch of humor"
}
```

**Specialized LLM Prompt:**
```
You are a relationship counselor specializing in gift-giving dynamics.

Consider:
- What does THIS relationship value? (intimacy vs. formality)
- What's the gift-giving "language" of this relationship?
- What social dynamics are at play?
- What would feel authentic vs. forced?
- What budget feels appropriate (not too little, not awkwardly much)?

Your output should guide the gift selection toward authenticity.
```

---

### 4. Constraints Agent
**Role:** Hard requirements and boundaries

**Input:** Context + Memory + Relationship profile
**Output:** Validated constraints

**Responsibilities:**
- Extract hard requirements (dietary restrictions, values, allergies)
- Set budget boundaries (min/max with reasoning)
- Identify timing constraints (shipping, availability)
- Flag deal-breakers (no animal products, must be sustainable)
- Prioritize constraints (critical vs. nice-to-have)

**Example:**
```
Input: {recipient: "sister", occasion: "birthday", budget: "under $50", mentioned: "she's vegan"}

Output:
{
  hard_constraints: {
    max_price: 50,
    currency: "USD",
    must_align_with_values: ["vegan"],
    must_be_available: true,
    shipping_needed_by: "2024-11-15"
  },
  soft_preferences: {
    preferred_price_range: [30, 45],
    preferred_styles: ["minimalist", "eco-friendly"],
    avoid: ["overly cutesy", "fast fashion"]
  },
  deal_breakers: ["contains animal products", "tested on animals"],
  critical_values: ["vegan (MUST respect)", "sustainability (nice-to-have)"]
}
```

**Graph Query:**
```cypher
MATCH (r:Recipient {id: $recipientId})-[rv:VALUES]->(v:Value)
WHERE rv.is_requirement = true
RETURN v.name, rv.importance, v.is_exclusion
```

---

### 5. Meaning Agent
**Role:** Identify what would be meaningful

**Input:** All previous context
**Output:** Meaning framework

**Responsibilities:**
- Identify what would resonate emotionally
- Consider what message the gift sends
- Think about long-term impact vs. momentary delight
- Balance practical utility with sentimental value
- Consider how the gift fits into the recipient's life story

**Example:**
```
Input: {recipient: "dad", occasion: "birthday", emotional_context: "stressed at work", interests: ["coffee", "reading"]}

Output:
{
  meaning_themes: [
    "relaxation and self-care",
    "appreciation for hard work",
    "quality over quantity"
  ],
  emotional_message: "I see you're working hard and I want you to have moments of peace",
  gift_archetype: "practical luxury",
  ideal_outcome: "Dad uses it daily and thinks of you during his morning routine",
  avoid: [
    "generic 'dad gifts' (tie, mug with joke)",
    "work-related items (adds to stress)",
    "high-maintenance items (adds burden)"
  ],
  lean_toward: [
    "elevates existing ritual (coffee, reading)",
    "creates moments of calm",
    "shows you understand him"
  ]
}
```

**Specialized LLM Prompt:**
```
You are a gift philosopher. Your role is to understand what makes a gift MEANINGFUL.

Consider:
- What emotional need does the gift address?
- What message does it send about the relationship?
- How does it fit into the recipient's life and values?
- Will it be cherished, used, or forgotten?
- Does it honor who they are or who they want to be?

Think deeply. The best gifts say "I see you and I value you."
```

---

### 6. Explorer Agent
**Role:** Find candidate products

**Input:** All context + constraints + meaning framework
**Output:** Candidate products (20-30)

**Responsibilities:**
- Execute hybrid graph + embedding search
- Explore multiple paths (interests, values, occasions, archetypes)
- Use multi-embedding similarity (product, style, sentiment, use_case)
- Consider complementary interests (coffee → morning ritual items)
- Balance diversity (different price points, different gift types)

**Search Strategy:**
```cypher
// 1. Direct interest matches
MATCH (r:Recipient)-[:INTERESTED_IN]->(i:Interest)
MATCH (p:Product)-[:MATCHES_INTEREST]->(i)
WHERE p.price <= $maxPrice AND p.available = true

// 2. Complementary interest paths
MATCH (i1:Interest)<-[:INTERESTED_IN]-(r)
MATCH (i1)-[:COMPLEMENTS]->(i2:Interest)
MATCH (p:Product)-[:MATCHES_INTEREST]->(i2)

// 3. Value alignment paths
MATCH (r)-[:VALUES]->(v:Value)
MATCH (p:Product)-[:ALIGNS_WITH]->(v)

// 4. Gift archetype paths
MATCH (p:Product)-[:BELONGS_TO]->(ga:GiftArchetype)
WHERE ga.name IN $preferred_archetypes

// 5. Embedding similarity (multi-aspect)
WITH p,
  gds.similarity.cosine($meaning_embedding, p.product_embedding) as meaning_match,
  gds.similarity.cosine($style_embedding, p.style_embedding) as style_match,
  gds.similarity.cosine($sentiment_embedding, p.sentiment_embedding) as sentiment_match

// 6. Score and rank
WITH p, (graph_score * 0.6 + embedding_scores * 0.4) as final_score
ORDER BY final_score DESC
LIMIT 30

RETURN p
```

**Output:**
```
[
  {product: {...}, score: 0.89, matched_via: ["interest:coffee", "archetype:practical_luxury"]},
  {product: {...}, score: 0.85, matched_via: ["complementary:reading", "value:quality"]},
  ...
]
```

---

### 7. Validator Agent
**Role:** Check each candidate against ALL criteria

**Input:** Candidate products + all context
**Output:** Scored and validated products

**Responsibilities:**
- Check hard constraints (price, values, availability)
- Validate against meaning framework
- Check for red flags (poor reviews, wrong tone, too generic)
- Score fit across multiple dimensions
- Explain why each product passed or failed

**Validation Checklist:**
```
For each product:
✓ Within budget? ($30-50)
✓ Respects values? (vegan: yes)
✓ Matches relationship tone? (casual but thoughtful)
✓ Aligns with meaning themes? (stress relief, quality)
✓ Practical AND meaningful? (daily use + emotional resonance)
✓ Avoids anti-patterns? (not generic, not burden)
✓ Unique enough? (not obvious/cliche)
✓ Will it delight? (predict emotional response)
```

**Output:**
```
[
  {
    product: "Artisan coffee subscription",
    overall_score: 0.92,
    validation: {
      budget: "✓ $35/month",
      values: "✓ sustainable sourcing",
      relationship: "✓ shows ongoing care",
      meaning: "✓ elevates daily ritual",
      uniqueness: "✓ curated, not generic",
      predicted_delight: 0.88
    },
    concerns: ["subscription = ongoing commitment"]
  },
  {
    product: "Premium coffee grinder",
    overall_score: 0.87,
    validation: {...},
    concerns: ["might already have one"]
  }
]
```

---

### 8. Storyteller Agent
**Role:** Craft personal reasoning for each recommendation

**Input:** Top 5-10 validated products + all context
**Output:** Personal reasoning for each

**Responsibilities:**
- Explain WHY this gift makes sense for THIS person
- Connect product to recipient's interests, values, life
- Tell a micro-story about how they might use/enjoy it
- Make it personal, not generic
- Show emotional intelligence

**Example:**
```
Product: "Artisan coffee subscription from local roasters"

Generic reasoning (BAD):
"This coffee subscription would be great for your dad since he likes coffee."

Personal reasoning (GOOD):
"Your dad's morning coffee routine is his moment of calm before the work stress hits.
This subscription delivers freshly roasted beans from small roasters, so each month
becomes a little discovery. It's not just coffee—it's a reminder to slow down and
savor something good. Plus, it keeps giving all year, so he'll think of you during
those peaceful morning moments."
```

**Specialized LLM Prompt:**
```
You are a master gift storyteller. Your role is to explain why THIS gift is perfect
for THIS person in THIS moment of their life.

For each recommendation:
1. Connect to WHO they are (interests, values, personality)
2. Connect to WHAT's happening (occasion, emotional context)
3. Paint a picture of HOW they'll experience it
4. Show the emotional resonance (not just features)
5. Make it feel like advice from someone who knows both people well

Write 2-3 sentences max. Be warm, specific, and insightful.
```

---

### 9. Presenter Agent
**Role:** Format and order final recommendations

**Input:** Top 5 products with reasoning
**Output:** Beautiful presentation

**Responsibilities:**
- Order by overall fit (not just score)
- Balance diversity (price points, gift types)
- Format for easy scanning
- Highlight key strengths of each
- Include images, prices, links
- Add helpful metadata (delivery time, reviews)

**Output Format:**
```
🎁 5 Thoughtful Gift Ideas for Dad's Birthday

1. ⭐ Artisan Coffee Subscription ($35/month)
   "His morning ritual, elevated..."

   Why this stands out:
   • Ongoing care (thinks of you monthly)
   • Supports small roasters (aligns with values)
   • Creates moments of discovery

   [Image] [View Product] ⏰ Delivers monthly

2. 📚 Leather Journal + Fountain Pen ($42)
   "For his thoughts during quiet moments..."

   Why this stands out:
   • Encourages reflection (stress relief)
   • Quality craftsmanship (honors his taste)
   • Pairs reading with writing

   [Image] [View Product] 🚚 Arrives in 2-3 days

[... etc ...]
```

---

### 10. Learning Agent
**Role:** Learn from user feedback

**Input:** Recommendations + user interactions
**Output:** Updated graph relationships and scores

**Responsibilities:**
- Track which recommendations were clicked/purchased
- Capture user feedback (liked, dismissed, "not quite right")
- Update graph relationships based on outcomes
- Adjust scoring weights
- Identify patterns for future recommendations

**Learning Updates:**
```cypher
// If recommendation was liked
MATCH (rec:Recommendation {id: $recId})-[:RECOMMENDED]->(p:Product)
MATCH (p)-[mi:MATCHES_INTEREST]->(i:Interest)
SET mi.relevance_score = mi.relevance_score * 1.1

// Update user preferences
MATCH (u:User)-[rel:HAS_RELATIONSHIP]->(r:Recipient)
SET rel.successful_interests = rel.successful_interests + [i.name]

// Learn complementary patterns
MATCH (i1:Interest)<-[:INTERESTED_IN]-(r)
MATCH (p)-[:MATCHES_INTEREST]->(i2:Interest)
MERGE (i1)-[comp:COMPLEMENTS]->(i2)
ON CREATE SET comp.strength = 0.1
ON MATCH SET comp.strength = comp.strength + 0.05
```

---

## Agent Orchestration

### Sequential Flow (Default)
Each agent passes enriched context to the next:

```typescript
async function recommendGift(userQuery: string, userId: string) {
  // 1. Listen
  const context = await listenerAgent.extract(userQuery);

  // 2. Remember
  const memory = await memoryAgent.recall(context, userId);

  // 3. Understand relationship
  const relationship = await relationshipAgent.analyze(context, memory);

  // 4. Validate constraints
  const constraints = await constraintsAgent.validate(context, memory, relationship);

  // 5. Identify meaning
  const meaning = await meaningAgent.identify(context, memory, relationship, constraints);

  // 6. Explore options
  const candidates = await explorerAgent.search(context, memory, relationship, constraints, meaning);

  // 7. Validate candidates
  const validated = await validatorAgent.check(candidates, context, memory, relationship, constraints, meaning);

  // 8. Tell stories
  const withStories = await storytellerAgent.narrate(validated, context, memory, relationship, meaning);

  // 9. Present
  const recommendations = await presenterAgent.format(withStories);

  return recommendations;
}
```

### Parallel Optimization (Advanced)
Some agents can run in parallel:

```typescript
// After Listener, run Memory + Relationship in parallel
const [memory, relationship] = await Promise.all([
  memoryAgent.recall(context, userId),
  relationshipAgent.analyze(context)
]);

// After Explorer, run Validator + Storyteller in parallel (on different product batches)
const [topCandidates, backupCandidates] = splitCandidates(candidates);
const [validated, stories] = await Promise.all([
  validatorAgent.check(topCandidates, ...),
  storytellerAgent.narrate(backupCandidates, ...)
]);
```

---

## Context Object (Passed Between Agents)

```typescript
interface RecommendationContext {
  // From Listener
  user_query: string;
  recipient: string;
  occasion: string;
  budget: {min: number, max: number};
  emotional_context: string;
  urgency: string;
  explicit_interests: string[];

  // From Memory
  conversation_history: ConversationTurn[];
  past_gifts: Recommendation[];
  recipient_profile: RecipientProfile;
  user_values: string[];

  // From Relationship
  relationship_dynamics: {
    closeness: number;
    formality: string;
    love_language: string;
    social_context: string;
  };

  // From Constraints
  hard_constraints: Constraint[];
  soft_preferences: Preference[];
  deal_breakers: string[];

  // From Meaning
  meaning_themes: string[];
  emotional_message: string;
  gift_archetype: string;
  ideal_outcome: string;

  // From Explorer
  candidates: Product[];

  // From Validator
  validated_products: ValidatedProduct[];

  // From Storyteller
  recommendations_with_stories: RecommendationWithStory[];
}
```

---

## Agent Communication Protocol

Each agent:
1. **Receives:** Context object + specialized inputs
2. **Processes:** Uses LLM + graph queries + embeddings
3. **Enriches:** Adds new insights to context
4. **Passes:** Enhanced context to next agent
5. **Logs:** Decisions and reasoning for debugging

**Logging Example:**
```json
{
  "agent": "meaning_agent",
  "timestamp": "2024-10-24T16:30:00Z",
  "input": {
    "recipient": "dad",
    "interests": ["coffee", "reading"],
    "emotional_context": "stressed"
  },
  "reasoning": "Dad needs stress relief + appreciation. Coffee ritual is his calm moment. Gift should elevate this without adding burden.",
  "output": {
    "meaning_themes": ["relaxation", "appreciation", "quality"],
    "gift_archetype": "practical_luxury",
    "avoid": ["work items", "high maintenance"]
  },
  "execution_time_ms": 450
}
```

---

## Benefits of Multi-Agent Approach

### 1. Separation of Concerns
Each agent focuses on ONE aspect of thoughtful gift-giving:
- Listener: Understanding
- Memory: History
- Relationship: Dynamics
- Constraints: Boundaries
- Meaning: Purpose
- Explorer: Options
- Validator: Fit
- Storyteller: Communication
- Presenter: Format
- Learning: Improvement

### 2. Specialized Prompts
Each agent has a unique LLM prompt optimized for its task.

### 3. Traceable Reasoning
Can inspect what each agent contributed to the final recommendation.

### 4. Easy to Improve
Swap out or enhance individual agents without touching the rest.

### 5. Parallel Optimization
Run independent agents simultaneously for speed.

### 6. Human-Like Process
Mimics how a thoughtful friend would actually help you choose a gift.

---

## Example: Full Walkthrough

**User:** "I need a birthday gift for my dad who's been working really hard lately"

**1. Listener Agent:**
```
Extracted:
- Recipient: dad (parent relationship)
- Occasion: birthday
- Emotional context: "working hard" = stressed, needs appreciation
- Implicit: stress relief, recognition of effort
- Tone: caring, supportive
```

**2. Memory Agent:**
```
Recalled:
- Past mentions: "dad loves coffee, early morning person"
- Previous gifts: Father's Day book (was loved)
- Interests: coffee, reading, woodworking, outdoors
- Values: quality, sustainability
```

**3. Relationship Agent:**
```
Analyzed:
- Closeness: 0.85 (strong parent-child bond)
- Love language: quality time + practical thoughtfulness
- Gift style: appreciates thought over expense
- Budget guidance: $30-80 feels right
```

**4. Constraints Agent:**
```
Validated:
- Budget: $30-80
- Timeline: 2 weeks
- Preferences: quality, sustainable
- Avoid: generic "dad gifts", work items
```

**5. Meaning Agent:**
```
Identified:
- Themes: stress relief, appreciation, daily ritual
- Message: "I see how hard you work and want you to have moments of peace"
- Archetype: practical luxury
- Ideal: something he uses daily and thinks of you
```

**6. Explorer Agent:**
```
Found 25 candidates via:
- Interest paths: coffee equipment, books, outdoor gear
- Archetype: practical luxury items
- Embedding similarity: relaxation + quality + morning ritual
```

**7. Validator Agent:**
```
Validated top 10:
- Checked budget, values, relationship fit, meaning alignment
- Scored each on 8 dimensions
- Flagged concerns
```

**8. Storyteller Agent:**
```
For top 5, crafted personal reasoning:

"Premium Pour-Over Coffee Set":
"Your dad's morning coffee isn't just caffeine—it's his meditation before the day's demands hit. This pour-over set transforms that routine into a small ceremony. The ritual of carefully brewing slows him down, the quality elevates the moment, and every morning becomes a reminder that he deserves something special. It's practical luxury for his most important 15 minutes of the day."
```

**9. Presenter Agent:**
```
Formatted 5 recommendations with images, links, delivery info, ordered by overall fit
```

**10. Learning Agent:**
```
Tracked:
- Which recommendations user clicked
- Which was purchased
- Updated graph: dad + coffee → practical_luxury (strengthened)
- Learned: stress_relief + daily_ritual is effective pattern
```

---

## Implementation Plan

### Phase 1: Core Agents (Week 1)
- Listener, Memory, Constraints, Explorer agents
- Basic sequential orchestration
- Context passing infrastructure

### Phase 2: Meaning & Validation (Week 2)
- Meaning, Validator agents
- Enhanced graph queries
- Multi-path exploration

### Phase 3: Storytelling (Week 3)
- Storyteller, Presenter agents
- Specialized LLM prompts
- Beautiful formatting

### Phase 4: Learning (Week 4)
- Learning agent
- Feedback loops
- Graph relationship updates

### Phase 5: Optimization (Week 5)
- Parallel agent execution
- Caching and performance
- A/B testing of agent configurations

---

## Success Metrics

**Quantitative:**
- Recommendation relevance: >8.5/10 (user ratings)
- Click-through rate: >40%
- Purchase rate: >15%
- Query time: <3 seconds
- User retention: >70%

**Qualitative:**
- Recommendations feel personal (not generic)
- Reasoning resonates emotionally
- Users say "yes! that's perfect!"
- Feels like advice from someone who knows both people

---

This multi-agent system creates recommendations that feel thoughtful, personal, and deeply considered—like a caring friend would give.

Ready to build it?
