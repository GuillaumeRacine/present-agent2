# Context Enhancement Plan: Giver & Recipient Profiling
**Date**: 2025-11-03
**Status**: Proposal

---

## Current Architecture Audit

### ✅ What We Have

**9-Agent Workflow**:
1. **Listener** - Extracts context from query
2. **Memory** - Recalls history and patterns
   - ✅ **RecipientLearner sub-agent** (exists!)
3. **Relationship** - Analyzes relationship dynamics
4. **Constraints** - Validates requirements
5. **Meaning** - Identifies meaningful criteria
6. **Explorer** - Discovers products
7. **Validator** - Quality gate
8. **Storyteller** - Crafts reasoning
9. **Presenter** - Formats output

### ✅ RecipientLearner Sub-Agent (ALREADY IMPLEMENTED)

**Location**: `src/services/agents/recipient-learner.ts`

**Purpose**: Builds deep recipient profiles over time

**What It Tracks**:
- Recipient interests with confidence levels
- Values and preferences
- Gift history and outcomes
- Past feedback signals
- Life stage and recent events
- Dislikes and exclusions

**Integration**: Runs as part of Memory agent (line 40-55 in memory.ts)

**Output**:
```typescript
{
  enriched_recipient: RecipientProfile,
  learning_updates: LearningUpdate[],
  confidence_level: number,
  knowledge_gaps: string[]
}
```

---

## ❌ What's Missing: GiverProfiler Sub-Agent

### Problem
Currently, we don't capture deep **giver context**:
- No understanding of giver's shopping philosophy
- No budget patterns across occasions
- No giving style preferences
- No learned vendor/brand preferences
- No understanding of giver's values in gift-giving

This leads to:
- Generic recommendations that don't match giver's style
- Missing context about why giver shops the way they do
- No personalization based on giver's past behavior
- Weak personalization score (5.3/10)

---

## Proposed Solution: GiverProfiler Sub-Agent

### Architecture

```
Memory Agent
├── RecipientLearner (existing) ✅
│   └── Builds recipient profiles
└── GiverProfiler (NEW) ⭐
    └── Builds giver profiles
```

### GiverProfiler Responsibilities

**1. Shopping Style Analysis**
- Budget patterns by occasion type
- Budget patterns by relationship type
- Timing patterns (last-minute vs. planned)
- Value priorities (practical, thoughtful, luxurious, experiential)

**2. Giving Philosophy**
- What makes them choose a gift?
- Brand/vendor preferences
- Quality vs. quantity preferences
- Personalization importance
- Sentimentality vs. practicality

**3. Past Behavior Patterns**
- Most successful gift types
- Avoided categories
- Preferred price points
- Diversity in past gifts
- Repeat patterns

**4. Giver Values & Context**
- What they value in gift-giving
- Their own interests (for shared-interest gifts)
- Their relationship to recipient
- Their confidence level in gift-giving

---

## Proposed Implementation

### File: `src/services/agents/giver-profiler.ts`

```typescript
/**
 * Giver Profiler Sub-Agent
 *
 * Builds comprehensive giver profile to understand shopping style,
 * giving philosophy, and personalization preferences.
 */

export interface GiverProfilerInput {
  userId: string;
  currentQuery: string;
  listenerContext: any;
  pastConversations: any[];
  pastRecipients: any[];
}

export interface GiverProfile {
  userId: string;

  // Shopping Style
  shoppingStyle: {
    typical_timing: 'last-minute' | 'planned' | 'week-before' | 'month-ahead';
    budget_patterns: {
      by_occasion: Map<string, { min: number; max: number; avg: number }>;
      by_relationship: Map<string, { min: number; max: number; avg: number }>;
    };
    price_sensitivity: 'budget-conscious' | 'value-focused' | 'flexible' | 'luxury-oriented';
  };

  // Giving Philosophy
  givingPhilosophy: {
    primary_values: string[]; // e.g., ['thoughtful', 'practical', 'experiential']
    personalization_importance: number; // 0-1
    sentimentality_score: number; // 0-1
    risk_tolerance: 'conservative' | 'moderate' | 'adventurous';
  };

  // Preferences
  preferences: {
    preferred_vendors: string[];
    avoided_vendors: string[];
    preferred_categories: string[];
    avoided_categories: string[];
    brand_conscious: boolean;
  };

  // Success Patterns
  successPatterns: {
    most_successful_types: string[];
    most_successful_attributes: string[];
    highest_rated_gifts: Array<{ product_id: string; occasion: string; rating: number }>;
  };

  // Confidence
  confidence: {
    data_quality: number; // 0-1 (based on history depth)
    prediction_confidence: number; // 0-1
    last_updated: Date;
  };
}

export interface GiverProfilerOutput {
  giver_profile: GiverProfile;
  insights: string[]; // Key insights about giver
  recommendations: string[]; // Recommendations for better personalization
}
```

### Integration into Memory Agent

**Enhanced Memory Agent** (`memory.ts`):

```typescript
export class MemoryAgent extends BaseAgent<MemoryInput, MemoryOutput> {
  name = 'Memory';
  private recipientLearner: RecipientLearner;
  private giverProfiler: GiverProfiler; // NEW

  constructor(private neo4j: Driver) {
    super();
    this.recipientLearner = new RecipientLearner(neo4j);
    this.giverProfiler = new GiverProfiler(neo4j); // NEW
  }

  async process(input: MemoryInput): Promise<MemoryOutput> {
    // ... existing code ...

    // Build recipient profile (existing)
    const recipientLearning = await this.recipientLearner.process({...});

    // Build giver profile (NEW)
    const giverProfiling = await this.giverProfiler.process({
      userId: input.userId,
      currentQuery: input.listenerOutput.userQuery || '',
      listenerContext: input.listenerOutput,
      pastConversations,
      pastRecipients,
    });

    return {
      // ... existing fields ...
      enrichedRecipient: recipientLearning.enriched_recipient,
      giverProfile: giverProfiling.giver_profile, // NEW
      giverInsights: giverProfiling.insights, // NEW
    };
  }
}
```

---

## Enhanced Personalization Flow

### Current Flow (Weak Personalization)
```
Query → Context Extraction → Products → Generic Reasoning → Output
```

### Enhanced Flow (Strong Personalization)
```
Query → Context Extraction
      ↓
  Memory Agent
      ├── RecipientLearner: "Mom loves gardening, just retired, values wellness"
      └── GiverProfiler: "User is thoughtful planner, values experiential gifts, $50-150 budget"
      ↓
  Meaning Agent: "Gift should be experiential, wellness-focused, nature-related"
      ↓
  Explorer: Finds products matching BOTH giver style + recipient interests
      ↓
  Storyteller: "Since you usually give thoughtful experiential gifts, and your mom
                just retired and loves wellness, this garden workshop would be perfect..."
```

---

## Example: Sarah's Test Case

### Before (Generic)
```
Query: "Eco-friendly birthday gift for my mom, just retired, loves gardening"
Storyteller: "This flower arrangement would be great for someone who loves gardening."
Score: 4/10 personalization
```

### After (With GiverProfiler)
```
Query: "Eco-friendly birthday gift for my mom, just retired, loves gardening"

GiverProfile detected:
  - Shopping style: Thoughtful planner
  - Philosophy: Values experiential, sentimental gifts
  - Budget pattern: $50-150 for mother
  - Past success: Wellness experiences, nature-related activities

RecipientProfile detected:
  - Mom, 58, just retired
  - Loves gardening, cooking, reading
  - Values: Wellness, nature, family

Storyteller: "Since you typically choose thoughtful experiential gifts and your
              mom just retired, this guided nature walk and garden workshop would
              celebrate her new chapter while honoring her love of gardening and
              wellness. At $120, it's within your typical range for mom."

Score: 8.5/10 personalization
```

---

## Impact on Recommendation Quality

### Current Issues (from quality report)
- Relevance: 5.7/10
- Personalization: 5.3/10
- UX: 5.3/10

### Expected Improvements with GiverProfiler

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Personalization** | 5.3 | **8.5** | +3.2 |
| **Relevance** | 5.7 | **7.5** | +1.8 |
| **UX** | 5.3 | **7.0** | +1.7 |
| **Success Rate** | 0% | **50-60%** | +50-60% |

### Why This Works

1. **Storyteller gets richer context**
   - Knows giver's typical style
   - Knows giver's budget patterns
   - Can reference past successful gifts
   - Can adjust tone to giver's preferences

2. **Explorer can filter better**
   - Avoid categories giver typically avoids
   - Prioritize vendors giver prefers
   - Match price points to giver's typical range

3. **Meaning agent is more accurate**
   - Understands giver's value priorities
   - Knows if giver prefers practical vs. sentimental
   - Can identify gift archetype giver typically chooses

4. **Presenter can customize**
   - Show reasoning that resonates with giver's style
   - Emphasize attributes giver values
   - Use language matching giver's preferences

---

## Implementation Plan

### Phase 1: GiverProfiler Core (1-2 days)
- [ ] Create `src/services/agents/giver-profiler.ts`
- [ ] Implement shopping style analysis
- [ ] Implement giving philosophy detection
- [ ] Query Neo4j for giver patterns

### Phase 2: Integration (1 day)
- [ ] Integrate GiverProfiler into Memory agent
- [ ] Update Memory agent output type
- [ ] Pass giver profile through agent chain
- [ ] Update Storyteller to use giver profile

### Phase 3: Enhancement (2-3 days)
- [ ] Enhance Explorer filtering with giver preferences
- [ ] Enhance Meaning agent with giver values
- [ ] Update Presenter with giver-aware formatting
- [ ] Build giver profile persistence in Neo4j

### Phase 4: Testing (1 day)
- [ ] Re-run persona tests
- [ ] Measure personalization improvement
- [ ] Validate giver profile accuracy
- [ ] A/B test with/without GiverProfiler

---

## Neo4j Schema Additions

### New Node: GiverProfile
```cypher
CREATE (gp:GiverProfile {
  user_id: string,
  shopping_style: string,
  giving_philosophy: string,
  personalization_importance: float,
  sentimentality_score: float,
  risk_tolerance: string,
  data_quality: float,
  last_updated: datetime
})
```

### New Relationships
```cypher
// Giver preferences
(:User)-[:HAS_GIVER_PROFILE]->(:GiverProfile)
(:GiverProfile)-[:PREFERS_VENDOR]->(:Vendor)
(:GiverProfile)-[:AVOIDS_VENDOR]->(:Vendor)
(:GiverProfile)-[:PREFERS_CATEGORY]->(:Category)
(:GiverProfile)-[:AVOIDS_CATEGORY]->(:Category)

// Giver patterns
(:GiverProfile)-[:TYPICALLY_SPENDS {
  min: float,
  max: float,
  avg: float,
  occasion: string,
  relationship_type: string
}]->(:BudgetPattern)

// Success tracking
(:GiverProfile)-[:HAD_SUCCESS_WITH {
  rating: float,
  occasion: string,
  timestamp: datetime
}]->(:Product)
```

---

## Additional Diversity Enhancements

### Current Diversity Issues
- Max 2 per vendor (good!)
- No category diversity check
- No interest diversity check
- No style diversity check

### Proposed Additional Checks

**In Explorer agent** (`explorer.ts`):

```typescript
private ensureDiversity(candidates: ProductCandidate[]): ProductCandidate[] {
  const diverse: ProductCandidate[] = [];
  const vendorCount = new Map<string, number>();
  const categoryCount = new Map<string, number>(); // NEW
  const interestCount = new Map<string, number>(); // NEW
  const priceRanges = { low: 0, mid: 0, high: 0 };

  for (const candidate of sorted) {
    const vendor = candidate.product.vendor;
    const category = candidate.product.category;
    const primaryInterest = candidate.matchReasons.matchedInterests[0];

    // Diversity checks
    const vendorOk = (vendorCount.get(vendor) || 0) < 2; // Max 2 per vendor
    const categoryOk = (categoryCount.get(category) || 0) < 3; // Max 3 per category
    const interestOk = (interestCount.get(primaryInterest) || 0) < 4; // Max 4 per interest
    const priceOk = priceRanges[range] < 5;

    const respectsDiversity = vendorOk && categoryOk && interestOk && priceOk;
    const exceptionalScore = candidate.scores.hybridScore > 0.95;

    if (respectsDiversity || exceptionalScore) {
      diverse.push(candidate);
      vendorCount.set(vendor, (vendorCount.get(vendor) || 0) + 1);
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      interestCount.set(primaryInterest, (interestCount.get(primaryInterest) || 0) + 1);
      priceRanges[range]++;
    }
  }

  this.log(
    `Diversity: ${vendorCount.size} vendors, ${categoryCount.size} categories, ` +
    `${interestCount.size} interest types`
  );

  return diverse;
}
```

**Expected Impact**: Diversity score **75% → 85%+**

---

## Success Criteria

### GiverProfiler
- ✅ Captures shopping style accurately
- ✅ Identifies giving philosophy
- ✅ Tracks budget patterns per relationship
- ✅ Learns from past successes
- ✅ Confidence ≥ 0.7 after 5+ interactions

### Personalization
- ✅ Personalization score ≥ 8.0/10
- ✅ Storyteller references giver's style
- ✅ Recommendations match giver's typical preferences
- ✅ Success rate ≥ 50%

### Diversity
- ✅ Diversity score ≥ 85%
- ✅ Max 2 per vendor
- ✅ Max 3 per category
- ✅ Max 4 per primary interest
- ✅ Balanced price ranges

---

## Questions for Discussion

1. **Priority**: Should we implement GiverProfiler before or after orphaned products fix completes?
2. **Scope**: Start with Phase 1 (core) only, or full implementation?
3. **Testing**: Run persona tests after Phase 2 to measure impact?
4. **Schema**: Should we persist giver profiles in Neo4j or keep in-memory for MVP?

---

**Next Steps**:
1. Get approval on architecture
2. Start Phase 1: GiverProfiler core implementation
3. Integrate into Memory agent
4. Test and measure impact
