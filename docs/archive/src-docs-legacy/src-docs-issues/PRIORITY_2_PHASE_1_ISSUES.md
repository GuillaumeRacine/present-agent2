# Priority 2 Phase 1: GitHub Issues Breakdown

**Version**: 1.0
**Created**: 2025-11-19
**Spec Reference**: `/docs/specs/PRIORITY_2_PHASE_1_QUICK_WINS_SPEC.md`
**Timeline**: 3 weeks (15 working days)
**Total Issues**: 20

---

## Table of Contents

- [Week 1: Foundation (Context Summary + Smart Ordering)](#week-1-foundation)
  - [P2-UX-2: Context Summary Display](#feature-1-context-summary-display-p2-ux-2)
  - [P2-UX-4: Smart Question Ordering](#feature-2-smart-question-ordering-p2-ux-4)
- [Week 2: Relevance (Interest Expansion + Archetype Tuning)](#week-2-relevance)
  - [P2-REL-2: Interest Pathway Expansion](#feature-3-interest-pathway-expansion-p2-rel-2)
  - [P2-REL-4: Archetype Weight Tuning](#feature-4-archetype-weight-tuning-p2-rel-4)
- [Week 3: Empathy + Integration Testing](#week-3-empathy--integration)
  - [P2-UX-3: Empathy & Emotional Intelligence](#feature-5-empathy--emotional-intelligence-p2-ux-3)
  - [Integration Testing & Deployment](#integration-testing--deployment)

---

## Week 1: Foundation

**Focus**: P2-UX-2 (Context Summary) + P2-UX-4 (Smart Ordering)
**Timeline**: Day 1-5
**Expected Impact**: Trust +31%, Abandonment -38%

---

### Feature 1: Context Summary Display (P2-UX-2)

---

## Issue #1: Create Context Summary Frontend Component

**Type**: Feature
**Priority**: P2
**Estimate**: 8 hours
**Week**: 1 (Day 1-2)
**Assignee**: Frontend

### Description

Create a React component to display a context summary card showing what the system learned from user input (budget, interests, relationship, occasion). The summary appears before recommendations to build trust and transparency.

**Problem**: Users don't see what the system learned from their input, leading to low trust and uncertainty about recommendation basis.

**Solution**: Display a "What I Learned" summary card with checkmark icons, showing 1-4 context items (budget, interests, relationship, occasion).

### Acceptance Criteria

- [ ] Create `ContextSummary` React component in `frontend/components/context-summary.tsx`
- [ ] Display up to 4 context items with checkmark icons
- [ ] Show budget range if provided (e.g., "Budget: $50-100")
- [ ] Show 1-3 top interests if provided (e.g., "Interests: Cooking, kitchen tools")
- [ ] Show relationship type if provided (e.g., "For your: Mom")
- [ ] Show occasion name and date if provided (e.g., "Occasion: Birthday (Dec 15, 2025)")
- [ ] Use design system colors: `bg-muted/50`, `border-border`, `text-foreground`
- [ ] Implement desktop layout: sticky card on right side, above recommendations
- [ ] Implement mobile layout: card at top, auto-collapse after 3 seconds
- [ ] Add "Edit" button (visible on hover for desktop, always visible on mobile)
- [ ] Show confidence indicators: green checkmark (high), yellow info (medium), orange warning (low)
- [ ] Meet accessibility requirements: screen reader support, keyboard navigation, 44x44px touch targets

### Dependencies

- None (uses existing design system)

### Technical Notes

```typescript
// Interface for component props
interface ContextSummaryProps {
  budget?: { min: number; max: number };
  interests?: string[];
  relationship?: string;
  occasion?: { name: string; date?: string };
  confidence: 'high' | 'medium' | 'low';
  onEdit: () => void;
}
```

**Reference**: Spec lines 59-272

---

## Issue #2: Integrate Context Summary with Backend

**Type**: Feature
**Priority**: P2
**Estimate**: 4 hours
**Week**: 1 (Day 2)
**Assignee**: Backend

### Description

Extend the DialoguePresenter to generate context summary data that can be consumed by the frontend ContextSummary component.

**Problem**: Backend doesn't currently expose structured context summary data for frontend display.

**Solution**: Add `ContextSummary` interface to presentation types and populate it in DialoguePresenter output.

### Acceptance Criteria

- [ ] Add `ContextSummary` interface to `src/types/presentation.ts`
- [ ] Add `ContextSummaryItem` interface with icon, label, value, editable fields
- [ ] Update DialoguePresenter to generate context summary from ListenerOutput
- [ ] Include summary in OrchestratorOutput response
- [ ] Calculate confidence level: high (3-4 items), medium (1-2 items), low (0 items)
- [ ] Add edit URL/endpoint for context modification
- [ ] Test with 10 sample conversations to validate output

### Dependencies

- Issue #1 (frontend component)

### Technical Notes

```typescript
// Add to src/types/presentation.ts
export interface ContextSummary {
  items: ContextSummaryItem[];
  confidence: 'high' | 'medium' | 'low';
  editUrl?: string;
}

export interface ContextSummaryItem {
  icon: string; // '✓', 'ℹ', '⚠'
  label: string; // 'Budget', 'Interests', etc.
  value: string; // '$50-100', 'cooking, gardening'
  editable: boolean;
}
```

**Reference**: Spec lines 251-272

---

## Issue #3: Implement Context Edit Functionality

**Type**: Feature
**Priority**: P2
**Estimate**: 6 hours
**Week**: 1 (Day 2)
**Assignee**: Frontend

### Description

Add edit functionality to the Context Summary component, allowing users to modify their answers and immediately update recommendations.

**Problem**: Users need a way to correct system understanding if something is wrong.

**Solution**: Clicking "Edit" re-opens relevant questions in a modal, changes immediately update recommendations with visual feedback.

### Acceptance Criteria

- [ ] Clicking edit button opens modal with relevant questions
- [ ] Modal shows current answers pre-filled
- [ ] User can modify any field (budget, interests, relationship, occasion)
- [ ] Show loading state during re-recommendation
- [ ] Animate summary update with smooth transition
- [ ] Preserve conversation history (show edit in chat)
- [ ] Add confirmation message: "Updated! Here are your new recommendations..."
- [ ] Close modal after successful update
- [ ] Handle edge case: user closes modal without saving

### Dependencies

- Issue #1 (ContextSummary component)
- Issue #2 (backend integration)

### Technical Notes

```typescript
// Edit handler
const handleEdit = async (updatedContext: ContextUpdate) => {
  setLoading(true);
  const newRecommendations = await fetchRecommendations(updatedContext);
  setRecommendations(newRecommendations);
  setLoading(false);
  showConfirmation("Updated! Here are your new recommendations...");
};
```

**Reference**: Spec lines 106-110

---

## Issue #4: Add Context Summary Unit Tests

**Type**: Test
**Priority**: P2
**Estimate**: 4 hours
**Week**: 1 (Day 2)
**Assignee**: Testing

### Description

Create comprehensive unit tests for the ContextSummary component and backend integration.

**Coverage Target**: ≥85%

### Acceptance Criteria

- [ ] Test component renders with all 4 context items
- [ ] Test component renders with partial context (1-2 items)
- [ ] Test component renders with no context (empty state)
- [ ] Test confidence indicators display correctly (high/medium/low)
- [ ] Test edit button functionality
- [ ] Test mobile auto-collapse after 3 seconds
- [ ] Test accessibility: screen reader announcements, keyboard navigation
- [ ] Test backend context summary generation from various inputs
- [ ] Test edge case: conflicting information (highlight in yellow)
- [ ] Test edge case: mobile viewport too small (collapsed version)

### Dependencies

- Issue #1, #2, #3

### Technical Notes

Use React Testing Library for frontend tests, Jest for backend tests.

**Reference**: Spec lines 190-216

---

### Feature 2: Smart Question Ordering (P2-UX-4)

---

## Issue #5: Implement Question Ordering Strategy

**Type**: Feature
**Priority**: P2
**Estimate**: 6 hours
**Week**: 1 (Day 3)
**Assignee**: Backend

### Description

Implement conversational question ordering (who → when → what → budget) to replace the current impact-based ordering (budget → interests → relationship → occasion).

**Problem**: Current ordering is technical (impact-based), not conversational. Budget-first feels transactional and increases abandonment by 22%.

**Solution**: Implement natural conversation flow that matches human gift-giving discussion patterns.

### Acceptance Criteria

- [ ] Create `QuestionOrderingStrategy` interface in DialogueManager
- [ ] Implement conversational ordering: relationship → occasion → interests → budget
- [ ] Add support for three strategies: conversational, impact-based, context-aware
- [ ] Filter out already-provided information (don't ask twice)
- [ ] Add smooth transitions between questions ("Great! Now I know it's for your mom...")
- [ ] Maximum 3 questions per turn to reduce cognitive load
- [ ] Add feature flag: `SMART_QUESTION_ORDERING` (default: true)
- [ ] Preserve backwards compatibility: support impact-based ordering for A/B testing

### Dependencies

- None (extends existing DialogueManager)

### Technical Notes

```typescript
// File: src/services/agents/dialogue-manager.ts
interface QuestionOrderingStrategy {
  type: 'conversational' | 'impact-based' | 'context-aware';
  order: QuestionField[];
  skip?: QuestionField[];
  reason?: string;
}

// Default conversational order
const baseOrder: QuestionField[] = [
  'relationship',
  'occasion',
  'interests',
  'budget'
];
```

**Reference**: Spec lines 274-544

---

## Issue #6: Implement Context-Aware Question Ordering

**Type**: Feature
**Priority**: P2
**Estimate**: 8 hours
**Week**: 1 (Day 3-4)
**Assignee**: Backend

### Description

Add intelligent question ordering overrides based on user context (budget-sensitive, time-pressured, already-provided information).

**Problem**: One-size-fits-all ordering doesn't adapt to user's specific situation or what they've already mentioned.

**Solution**: Detect context from user input and reorder/skip questions accordingly.

### Acceptance Criteria

- [ ] Detect budget-sensitive users (mentioned "affordable", "budget", "cheap")
- [ ] For budget-sensitive: move budget to LAST position
- [ ] Detect time-pressured users (mentioned "urgent", "asap", "quickly")
- [ ] For time-pressured: skip occasion, ask only 3 questions
- [ ] Detect interest-first users (mentioned interests in opening)
- [ ] For interest-first: skip interests question, already known
- [ ] Detect relationship-first users (mentioned person in opening)
- [ ] For relationship-first: skip relationship question
- [ ] Add extra messaging: "Great choices exist at every budget!" for budget-sensitive
- [ ] Add extra messaging: "Just 2 quick questions to get you the best options fast!" for time-pressured
- [ ] Log ordering decisions for analytics

### Dependencies

- Issue #5 (base question ordering)

### Technical Notes

```typescript
// Context-aware overrides
if (context.budgetSensitivity === 'high') {
  return {
    type: 'context-aware',
    order: ['relationship', 'occasion', 'interests', 'budget'],
    reason: 'budget-sensitive'
  };
}

if (context.timePressure === 'urgent') {
  return {
    type: 'context-aware',
    order: ['relationship', 'interests', 'budget'],
    skip: ['occasion'],
    reason: 'time-pressured'
  };
}
```

**Reference**: Spec lines 319-418

---

## Issue #7: Add Question Ordering Analytics Tracking

**Type**: Feature
**Priority**: P2
**Estimate**: 3 hours
**Week**: 1 (Day 4)
**Assignee**: Backend

### Description

Add analytics events to track question ordering decisions, completion rates, and abandonment by position for A/B testing.

**Purpose**: Measure impact of smart ordering on abandonment rate and question completion.

### Acceptance Criteria

- [ ] Track `question_asked` event with: questionId, position, strategy, contextType
- [ ] Track user response: answered vs. skipped
- [ ] Track time to answer (seconds)
- [ ] Track ordering strategy used: conversational, impact-based, context-aware
- [ ] Track context type: budget-sensitive, time-pressured, interest-first, etc.
- [ ] Track abandonment by question position
- [ ] Track question completion rate (% who answer all questions)
- [ ] Enable A/B test comparison: control vs. treatment

### Dependencies

- Issue #5, #6

### Technical Notes

```typescript
// Event tracking
analytics.track('question_asked', {
  questionId: 'budget',
  position: 4,  // Fourth question (last in conversational order)
  strategy: 'conversational',
  contextType: 'budget-sensitive',
  userResponse: 'answered' | 'skipped',
  timeToAnswer: 12.5  // seconds
});
```

**Reference**: Spec lines 532-543

---

## Issue #8: Create Question Ordering A/B Test

**Type**: Test
**Priority**: P2
**Estimate**: 4 hours
**Week**: 1 (Day 4)
**Assignee**: Testing

### Description

Set up A/B test infrastructure to compare conversational ordering vs. impact-based ordering.

**Goal**: Validate that conversational ordering reduces abandonment from 8% → 5%.

### Acceptance Criteria

- [ ] Create feature flag: `QUESTION_ORDERING_STRATEGY` (conversational | impact-based | context-aware)
- [ ] Split users 50/50: control (impact-based) vs. treatment (conversational)
- [ ] Track abandonment rate by variant
- [ ] Track question completion rate by variant
- [ ] Track "felt natural" score by variant
- [ ] Ensure statistical significance: p<0.05, 200+ users per variant
- [ ] Create dashboard to monitor results in real-time
- [ ] Plan rollback strategy if metrics worsen

### Dependencies

- Issue #5, #6, #7

### Technical Notes

```bash
# Feature flag configuration
SMART_QUESTION_ORDERING=true
QUESTION_ORDERING_STRATEGY=conversational  # or impact-based
```

**Reference**: Spec lines 344-362

---

## Issue #9: Week 1 Integration Testing & Deployment

**Type**: Test
**Priority**: P0
**Estimate**: 8 hours
**Week**: 1 (Day 5)
**Assignee**: Testing

### Description

End-to-end testing of Context Summary + Smart Question Ordering features before 10% production rollout.

**Scope**: Test both features working together, performance impact, edge cases.

### Acceptance Criteria

- [ ] Test context summary displays correctly with various inputs
- [ ] Test edit functionality updates recommendations
- [ ] Test conversational question ordering on 50 persona scenarios
- [ ] Test context-aware ordering (budget-sensitive, time-pressured, etc.)
- [ ] Performance test: measure latency impact (target: no increase >200ms)
- [ ] Test edge cases: no context, partial context, conflicting information
- [ ] Test accessibility: screen reader, keyboard navigation
- [ ] Test mobile responsiveness: auto-collapse, touch targets
- [ ] Fix any bugs found during testing
- [ ] Deploy to staging environment
- [ ] Deploy to production (10% rollout)
- [ ] Monitor metrics for 24 hours

### Dependencies

- Issue #1-8

### Technical Notes

**Performance budget**: Total latency ≤3.0s (p95), no increase from baseline.

**Rollout plan**:
- Day 5: Deploy to staging
- Day 5 EOD: Deploy to 10% production
- Day 6-7: Monitor metrics, prepare for Week 2

**Reference**: Spec lines 2230-2234

---

## Week 2: Relevance

**Focus**: P2-REL-2 (Interest Expansion) + P2-REL-4 (Archetype Tuning)
**Timeline**: Day 6-10
**Expected Impact**: Relevance +12%, Success Rate +27%

---

### Feature 3: Interest Pathway Expansion (P2-REL-2)

---

## Issue #10: Generate Interest Expansion Dictionary

**Type**: Feature
**Priority**: P2
**Estimate**: 16 hours
**Week**: 2 (Day 6-7)
**Assignee**: Backend + Data

### Description

Create a curated dictionary of interest expansions for the top 50 interests (covers 68% of all interest mentions). Each interest expands to 3 levels: primary (synonyms), secondary (related categories), tertiary (contextual items).

**Problem**: Interest matching is too literal. "Coffee" only matches products tagged "coffee", missing grinders, mugs, books, subscriptions.

**Solution**: Expand "coffee" to espresso, brewing, grinders, mugs, books, subscriptions (5.6x more relevant products).

### Acceptance Criteria

- [ ] Generate expansion dictionary for top 50 interests using GPT-4
- [ ] Manual curation and review of all 50 expansions
- [ ] 3 levels per interest: primary (direct synonyms), secondary (related), tertiary (contextual)
- [ ] Validate on 100 test cases (precision/recall)
- [ ] Save to `data/interest-expansions.json`
- [ ] Document expansion logic and reasoning
- [ ] Include product count estimates per pathway

### Dependencies

- None (data creation task)

### Technical Notes

Top 50 interests to curate:
1. Coffee (8,547 users) → espresso, brewing, grinders, mugs, books, subscriptions
2. Cooking (7,234 users) → baking, kitchen tools, cookbooks, appliances
3. Gardening (6,891 users) → plants, tools, books, seeds, decor
4. Reading (6,543 users) → books, bookmarks, lights, shelves
5. Gaming (5,982 users) → consoles, accessories, gift cards, merchandise
... (45 more)

**Script**: `npm run generate:interest-dictionary --top-n 50`

**Reference**: Spec lines 987-1456

---

## Issue #11: Build Interest Expander Service

**Type**: Feature
**Priority**: P2
**Estimate**: 10 hours
**Week**: 2 (Day 6-7)
**Assignee**: Backend

### Description

Create InterestExpander service to expand user interests into pathways using the curated dictionary and semantic fallback for unknown interests.

**Functionality**:
- Graph-based expansion via Neo4j EXPANDS_TO relationships
- Semantic similarity fallback for interests not in dictionary
- Weight calculation: primary (1.0), secondary (0.75), tertiary (0.5)
- Deduplication and ranking

### Acceptance Criteria

- [ ] Create `InterestExpander` class in `src/services/interest-expander.ts`
- [ ] Implement `expandInterest()` for single interest expansion
- [ ] Implement `expandInterests()` for multi-interest expansion with deduplication
- [ ] Use graph traversal for dictionary lookup (3 hop max)
- [ ] Implement semantic similarity fallback for unknown interests
- [ ] Calculate pathway weights: multiplicative for multi-hop
- [ ] Return product counts per pathway
- [ ] Add caching (1 hour TTL)
- [ ] Log expansion decisions for debugging
- [ ] Test on 100 real user queries

### Dependencies

- Issue #10 (dictionary creation)
- Neo4j database

### Technical Notes

```typescript
// File: src/services/interest-expander.ts
export interface InterestPathway {
  interest: string;
  level: 'primary' | 'secondary' | 'tertiary';
  weight: number;
  reason: string;
  relatedProducts?: number;
}

export class InterestExpander {
  async expandInterest(interest: string): Promise<InterestPathway[]> {
    // 1. Try graph traversal (dictionary lookup)
    // 2. Fallback to semantic similarity
  }
}
```

**Reference**: Spec lines 1139-1326

---

## Issue #12: Import Interest Dictionary to Neo4j

**Type**: Feature
**Priority**: P2
**Estimate**: 4 hours
**Week**: 2 (Day 7)
**Assignee**: Backend

### Description

Import the interest expansion dictionary into Neo4j as Interest nodes with EXPANDS_TO relationships.

**Data Structure**:
- `:Interest` nodes with name, category, popularity
- `[:EXPANDS_TO]` relationships with level, weight, reason

### Acceptance Criteria

- [ ] Create import script: `npm run import:interest-dictionary`
- [ ] Create `:Interest` nodes for all interests in dictionary
- [ ] Create `[:EXPANDS_TO]` relationships with properties: level, weight, reason
- [ ] Add embeddings to Interest nodes for semantic fallback
- [ ] Validate import: check node count, relationship count
- [ ] Test graph traversal queries
- [ ] Add indexes for performance: `CREATE INDEX ON :Interest(name)`
- [ ] Document data model in code comments

### Dependencies

- Issue #10 (dictionary JSON file)

### Technical Notes

```cypher
// Example data structure
(:Interest {
  id: "coffee",
  name: "Coffee",
  category: "food_beverage",
  popularity: 8547
})

(:Interest {name: "Coffee"})
  -[:EXPANDS_TO {level: "primary", weight: 1.0, reason: "synonym"}]->
  (:Interest {name: "Espresso"})

(:Interest {name: "Coffee"})
  -[:EXPANDS_TO {level: "secondary", weight: 0.75, reason: "related_category"}]->
  (:Interest {name: "Coffee Grinders"})
```

**Script**: `npm run import:interest-dictionary --file data/interest-expansions.json`

**Reference**: Spec lines 1091-1123

---

## Issue #13: Integrate Interest Expansion with ExplorerAgent

**Type**: Feature
**Priority**: P2
**Estimate**: 6 hours
**Week**: 2 (Day 7)
**Assignee**: Backend

### Description

Integrate InterestExpander service with ExplorerAgent's hybrid search to use expanded interest pathways in product queries.

**Impact**: Increase product coverage from 327 → 1,847 products for "coffee" query (+465%).

### Acceptance Criteria

- [ ] Call InterestExpander before ExplorerAgent hybrid search
- [ ] Pass expanded interests to Cypher query with pathway weights
- [ ] Update interest matching to use weighted expansion scores
- [ ] Apply diversity filter: max 5 pathways per level to prevent over-expansion
- [ ] Filter out pathways with 0 products
- [ ] Show expanded interests in context summary ("Exploring: coffee, espresso, brewing...")
- [ ] Add logging: "Expanded 1 interest to 12 pathways"
- [ ] Test on sample queries: coffee, cooking, gardening, reading

### Dependencies

- Issue #11 (InterestExpander service)
- Issue #12 (Neo4j import)

### Technical Notes

```typescript
// Integration in ExplorerAgent
const expandedInterests = await this.interestExpander.expandInterests(
  params.discoveryHints.interestPathways || []
);

// Pass to Cypher with weights
const interestQueries = expandedInterests.map(pathway => ({
  interest: pathway.interest,
  weight: pathway.weight,
  level: pathway.level
}));
```

**Reference**: Spec lines 1328-1376

---

## Issue #14: Add Interest Expansion Tests

**Type**: Test
**Priority**: P2
**Estimate**: 6 hours
**Week**: 2 (Day 7)
**Assignee**: Testing

### Description

Create comprehensive tests for interest expansion functionality.

**Coverage Target**: ≥80%

### Acceptance Criteria

- [ ] Test dictionary expansion: coffee → espresso, grinders, mugs, etc.
- [ ] Test multi-interest expansion with deduplication
- [ ] Test semantic fallback for unknown interests
- [ ] Test pathway weighting: primary (1.0), secondary (0.75), tertiary (0.5)
- [ ] Test diversity filter: max 5 per level
- [ ] Test filtering pathways with 0 products
- [ ] Test edge case: over-expansion (too many pathways)
- [ ] Test edge case: circular expansion (A→B→A)
- [ ] Test edge case: very niche interest (no expansions found)
- [ ] Validate expansion quality on 100 test queries
- [ ] Measure precision/recall vs. baseline

### Dependencies

- Issue #11, #12, #13

### Technical Notes

**Quality metrics**:
- False positive rate (irrelevant expansions): <10%
- Precision: ≥80% (expanded items are relevant)
- Recall: ≥70% (find most relevant expanded items)

**Reference**: Spec lines 1378-1404

---

### Feature 4: Archetype Weight Tuning (P2-REL-4)

---

## Issue #15: Create Archetype Detector Service

**Type**: Feature
**Priority**: P2
**Estimate**: 10 hours
**Week**: 2 (Day 8-9)
**Assignee**: Backend

### Description

Create ArchetypeDetector service to infer user's gift-giving style (practical, sentimental, luxury, etc.) from language, budget, relationship, and occasion context.

**Problem**: Single archetype only, no context-aware boosting. Archetype mismatch causes 25% of low-relevance recommendations.

**Solution**: Detect primary + secondary archetype from multiple signals, with context-aware boosting.

### Acceptance Criteria

- [ ] Create `ArchetypeDetector` class in `src/services/agents/archetype-detector.ts`
- [ ] Detect archetypes from language patterns (practical, sentimental, luxury, humorous, etc.)
- [ ] Detect archetypes from budget context (high budget → luxury, low → practical)
- [ ] Detect archetypes from relationship (partner → sentimental, coworker → practical)
- [ ] Detect archetypes from occasion (anniversary → memorable, housewarming → practical)
- [ ] Support multi-archetype: primary (60% weight) + secondary (40% weight)
- [ ] Calculate confidence score (0-1) for detection
- [ ] Return inferredFrom: explicit, context, history, profile
- [ ] Test on 50 sample queries

### Dependencies

- None (new service)

### Technical Notes

```typescript
// File: src/services/agents/archetype-detector.ts
export interface ArchetypePreference {
  primary: GiftArchetype;
  primaryConfidence: number;  // 0-1
  secondary?: GiftArchetype;
  secondaryConfidence?: number;
  inferredFrom: 'explicit' | 'context' | 'history' | 'profile';
}

// Detection signals
// Language: "useful" → practical, "meaningful" → sentimental
// Budget: >$150 → luxury, <$50 → practical
// Relationship: partner → sentimental, coworker → practical
// Occasion: anniversary → memorable, housewarming → practical
```

**Reference**: Spec lines 547-849

---

## Issue #16: Update ExplorerAgent Archetype Scoring Formula

**Type**: Feature
**Priority**: P2
**Estimate**: 8 hours
**Week**: 2 (Day 8-9)
**Assignee**: Backend

### Description

Update ExplorerAgent's graph scoring formula to increase archetype weight from 15% → 25% and implement multi-archetype support.

**Current Formula**:
```
graphScore = 0.35*interest + 0.25*value + 0.15*archetype + 0.15*occasion + 0.10*social
```

**New Formula**:
```
graphScore = 0.30*interest + 0.25*value + 0.25*archetype + 0.12*occasion + 0.08*social
```

### Acceptance Criteria

- [ ] Update Cypher query in ExplorerAgent (line 251-260)
- [ ] Change archetype weight from 0.15 → 0.25 (+67% increase)
- [ ] Adjust interest weight from 0.35 → 0.30 (-5%)
- [ ] Adjust occasion weight from 0.15 → 0.12 (-3%)
- [ ] Adjust social proof weight from 0.10 → 0.08 (-2%)
- [ ] Implement multi-archetype scoring: primary (60%) + secondary (40%)
- [ ] Add feature flag: `ARCHETYPE_WEIGHT` for A/B testing
- [ ] Test on persona framework (30 personas)
- [ ] Validate relevance improvement on 100 test queries

### Dependencies

- Issue #15 (ArchetypeDetector)

### Technical Notes

```cypher
// Updated scoring (line 871-876)
(0.30 * interestScore +
 0.25 * valueScore +
 0.25 * finalArchetypeScore +  // INCREASED from 0.15
 0.12 * occasionScore +         // DECREASED from 0.15
 0.08 * socialProofCount        // DECREASED from 0.10
) AS graphScore
```

**Reference**: Spec lines 851-908

---

## Issue #17: Implement Context-Aware Archetype Boosting

**Type**: Feature
**Priority**: P2
**Estimate**: 6 hours
**Week**: 2 (Day 9)
**Assignee**: Backend

### Description

Add context-aware archetype boosting based on budget, relationship, and occasion to further improve relevance.

**Boosting Rules**:
- High budget (>$150): Boost luxury/indulgent by +30%
- Low budget (<$50): Boost practical/budget-friendly by +30%
- Close relationships: Boost sentimental by +20%
- Professional relationships: Boost practical by +30%
- Special occasions: Boost memorable by +25%

### Acceptance Criteria

- [ ] Add boosting logic to ExplorerAgent Cypher query
- [ ] High budget (>$150): boost luxury/indulgent products by 1.30x
- [ ] Low budget (<$50): boost practical/budget-friendly products by 1.30x
- [ ] Close relationship (partner, spouse, parent): boost sentimental by 1.20x
- [ ] Professional relationship (coworker, boss): boost practical by 1.30x
- [ ] Special occasion (anniversary, milestone): boost memorable by 1.25x
- [ ] Add feature flag: `CONTEXT_BOOST_ENABLED` for A/B testing
- [ ] Log boosting decisions for debugging
- [ ] Test all boosting scenarios

### Dependencies

- Issue #15, #16

### Technical Notes

```cypher
// Apply context-aware boosting
WITH product, vectorScore, graphScore,
  CASE
    WHEN $budgetMax >= 150 AND product.gift_archetype IN ['luxury', 'indulgent']
      THEN graphScore * 1.30
    WHEN $budgetMax <= 50 AND product.gift_archetype IN ['practical', 'budget-friendly']
      THEN graphScore * 1.30
    // ... more boost rules
    ELSE graphScore
  END AS boostedGraphScore
```

**Reference**: Spec lines 878-908

---

## Issue #18: Archetype Weight A/B Test Setup

**Type**: Test
**Priority**: P2
**Estimate**: 4 hours
**Week**: 2 (Day 10)
**Assignee**: Testing

### Description

Set up A/B test to validate optimal archetype weight (15% vs. 20% vs. 25% vs. 30%).

**Goal**: Maximize relevance score without regressing other metrics.

### Acceptance Criteria

- [ ] Create feature flag: `ARCHETYPE_WEIGHT` (0.15 | 0.20 | 0.25 | 0.30)
- [ ] Set up 4 variants:
  - Control: 15% archetype weight (current)
  - Treatment A: 20% archetype weight (conservative)
  - Treatment B: 25% archetype weight (proposed)
  - Treatment C: 30% archetype weight (aggressive)
- [ ] Track relevance score by variant
- [ ] Track archetype match rate by variant
- [ ] Track "matches my style" score by variant
- [ ] Ensure statistical significance: p<0.05, 200+ users per variant
- [ ] Create dashboard for real-time monitoring
- [ ] Plan rollback if relevance decreases >0.2 points

### Dependencies

- Issue #15, #16, #17

### Technical Notes

```bash
# Feature flags
ARCHETYPE_WEIGHT=0.25           # 15% → 25%
MULTI_ARCHETYPE_ENABLED=true    # Enable secondary archetype
CONTEXT_BOOST_ENABLED=true      # Enable context-aware boosting
```

**Rollout plan**:
- Week 1: Deploy to 10% (variant B)
- Week 1: Measure, no regressions
- Week 2: Increase to 50%
- Week 3: Deploy variant C to 10%, compare
- Week 3: Full rollout of best variant

**Reference**: Spec lines 959-984

---

## Week 3: Empathy + Integration

**Focus**: P2-UX-3 (Empathy) + Integration Testing + Deployment
**Timeline**: Day 11-15
**Expected Impact**: Feels Human +13%, Satisfaction +17%

---

### Feature 5: Empathy & Emotional Intelligence (P2-UX-3)

---

## Issue #19: Create Emotion Detector Service

**Type**: Feature
**Priority**: P2
**Estimate**: 10 hours
**Week**: 3 (Day 11-12)
**Assignee**: Backend

### Description

Create EmotionDetector service to detect user emotional state (stressed, budget-conscious, overwhelmed, excited, uncertain) from language, budget, time pressure, and conversation patterns.

**Problem**: System lacks emotional awareness, feels transactional rather than supportive.

**Solution**: Detect emotional context and adapt messaging accordingly.

### Acceptance Criteria

- [ ] Create `EmotionDetector` class in `src/lib/emotion-detector.ts`
- [ ] Detect 5 emotional states: stressed, budget-conscious, overwhelmed, excited, uncertain
- [ ] Detect from language patterns (keywords: "stressed", "anxious", "budget", "overwhelmed", etc.)
- [ ] Detect from budget context (low budget → budget-conscious)
- [ ] Detect from time pressure (urgent occasion → stressed)
- [ ] Detect from conversation patterns (multiple corrections → overwhelmed)
- [ ] Calculate confidence score (0-1) for emotional state
- [ ] Support multiple simultaneous states (e.g., stressed + budget-conscious)
- [ ] Return primary state + list of all active states
- [ ] Test on 50 sample queries with various emotional contexts

### Dependencies

- None (new service)

### Technical Notes

```typescript
// File: src/lib/emotion-detector.ts
export type EmotionalState =
  | 'stressed'
  | 'budget-conscious'
  | 'overwhelmed'
  | 'excited'
  | 'uncertain'
  | 'neutral';

export interface EmotionalContext {
  states: EmotionalState[];
  primaryState: EmotionalState;
  confidence: number;  // 0-1
  signals: string[];   // What triggered detection
}

// Detection rules:
// Stressed: "stress", "anxious", "urgent", "last-minute", days until <2
// Budget-conscious: "budget", "cheap", "affordable", budget max <=50
// Overwhelmed: "don't know", "confused", "too many", corrections >=2
// Excited: "excited", "love", "can't wait", "amazing"
// Uncertain: "maybe", "not sure", "think", "might"
```

**Reference**: Spec lines 1458-1743

---

## Issue #20: Add Empathy Messages to DialoguePresenter

**Type**: Feature
**Priority**: P2
**Estimate**: 8 hours
**Week**: 3 (Day 12-13)
**Assignee**: Backend

### Description

Extend DialoguePresenter to generate empathy messages based on detected emotional context, with context-aware question framing.

**Examples**:
- Stressed: "I know gift shopping can be stressful - I'm here to help!"
- Budget-conscious: "Great choices exist at every budget!"
- Overwhelmed: "Don't worry - I'll guide you through this step by step!"

### Acceptance Criteria

- [ ] Add `getEmpathyMessage()` method to DialoguePresenter
- [ ] Generate empathy messages for 5 emotional states × 3 stages (greeting, questions, recommendations)
- [ ] Require confidence >0.6 to apply empathy (avoid false positives)
- [ ] Maximum 1 empathy message per turn (avoid over-empathizing)
- [ ] Brief messages (<20 words) for time-pressured users
- [ ] Skip empathy for neutral state
- [ ] Add context-aware question framing (different budget question for budget-conscious users)
- [ ] Add feature flag: `EMPATHY_ENABLED` and `EMPATHY_LEVEL` (low, medium, high)
- [ ] Test empathy appropriateness on 20 diverse queries
- [ ] Cultural sensitivity review

### Dependencies

- Issue #19 (EmotionDetector)

### Technical Notes

```typescript
// Empathy messages by state + stage
const messages = {
  stressed: {
    greeting: "I know gift shopping can be stressful - I'm here to help!",
    questions: "Just 2 quick questions to get you the best options fast...",
    recommendations: "Here are some reliable, well-received options..."
  },
  'budget-conscious': {
    greeting: "Let's find something thoughtful within your budget!",
    questions: "Great choices exist at every budget!",
    recommendations: "Here are some excellent options at your price range..."
  },
  // ... more states
};
```

**Reference**: Spec lines 1745-1846

---

## Integration Testing & Deployment

---

## Issue #21: Full System Integration Testing

**Type**: Test
**Priority**: P0
**Estimate**: 12 hours
**Week**: 3 (Day 14-15)
**Assignee**: Testing

### Description

Comprehensive end-to-end testing of all 5 features working together before production rollout.

**Scope**: All features (Context Summary, Smart Ordering, Interest Expansion, Archetype Tuning, Empathy) + performance + edge cases.

### Acceptance Criteria

- [ ] Test all 5 features working together on 30 persona scenarios
- [ ] Test context summary displays with expanded interests and detected archetypes
- [ ] Test question ordering adapts to emotional context
- [ ] Test empathy messages appear appropriately
- [ ] Test interest expansion produces relevant results
- [ ] Test archetype boosting improves relevance
- [ ] Performance test: measure full latency impact (target: ≤3.0s p95)
- [ ] Test 20 edge cases: conflicting signals, no context, partial context, etc.
- [ ] User testing: 10 real users try the system
- [ ] Collect user feedback on "feels human" and satisfaction
- [ ] Fix all severity-1 bugs (launch blockers)
- [ ] Fix severity-2 bugs (if time permits)
- [ ] Validate baseline vs. new metrics

### Dependencies

- All issues #1-20

### Technical Notes

**Test Personas**:
- Sarah (thoughtful planner, sentimental)
- Mike (last-minute, budget-conscious, stressed)
- Lisa (practical, overwhelmed by choices)
- James (excited, high-budget, luxury)
- Emma (uncertain, needs guidance)
... (25 more personas)

**Performance Budget**:
```
Total target: ≤3.0s (p95)
- EmotionDetector: ≤50ms (NEW)
- InterestExpander: ≤200ms (NEW, cached)
- ArchetypeDetector: ≤100ms (NEW)
- ExplorerAgent: ≤1500ms (existing)
- Other: ≤1150ms
Total: ~3.0s ✓
```

**Launch Blockers** (must achieve):
- [ ] Relevance score ≥7.0/10 (+0.5 minimum)
- [ ] No regression on "feels human" (maintain ≥7.5/10)
- [ ] No increase in abandonment (<8%)
- [ ] 0 severity-1 bugs

**Reference**: Spec lines 2265-2271, 1977-1996

---

## Issue #22: Production Rollout & Monitoring

**Type**: Deployment
**Priority**: P0
**Estimate**: 16 hours
**Week**: 3 (Day 16-20)
**Assignee**: Backend + Testing

### Description

Staged production rollout with continuous monitoring: 10% → 50% → 100%.

**Plan**:
- Day 16: 10% rollout, hourly monitoring
- Day 17-18: 50% rollout (if 10% successful)
- Day 19-20: 100% rollout (if 50% successful)

### Acceptance Criteria

- [ ] Day 16: Deploy to 10% of users
- [ ] Monitor metrics hourly: relevance, abandonment, "feels human", errors
- [ ] Alert if relevance drops >0.2 points
- [ ] Alert if abandonment increases >1%
- [ ] Alert if error rate increases >5%
- [ ] Day 17: Expand to 50% if 10% shows no regressions
- [ ] Continue monitoring
- [ ] Collect user feedback via survey
- [ ] Analyze A/B test results, determine winning variants
- [ ] Day 19: Full rollout (100%) if 50% successful
- [ ] Create success report with metrics
- [ ] Document lessons learned
- [ ] Plan Phase 2 improvements

### Dependencies

- Issue #21 (integration testing pass)

### Technical Notes

**Monitoring Dashboard**:
- Relevance score (daily human eval on 20 recommendations)
- Abandonment rate (%)
- Question completion rate (%)
- Edit rate (% who edit context summary)
- "Feels human" score (weekly survey)
- User satisfaction (weekly survey)
- Feature adoption rates
- Error rates by feature

**Rollback Triggers**:
- Relevance score drops >0.2 points
- Abandonment increases >2%
- Error rate increases >10%
- Critical bug (severity-1)

**Success Criteria** (target):
- [ ] Relevance: 6.5 → 7.3/10 (+12%)
- [ ] Feels human: 7.5 → 8.5/10 (+13%)
- [ ] Abandonment: 8% → 5% (-38%)
- [ ] Success rate: 55% → 70% (+27%)

**Reference**: Spec lines 2273-2292, 1931-1996

---

## Summary

**Total Issues**: 22
**Total Estimated Hours**: 176 hours
**Timeline**: 3 weeks (15 working days)
**Resources**: 1 Senior Full-Stack, 0.5 Frontend, 1 QA

### By Week

**Week 1** (Day 1-5): Foundation
- Issues #1-9: Context Summary + Smart Ordering
- 51 hours
- Deploy to 10% production

**Week 2** (Day 6-10): Relevance
- Issues #10-18: Interest Expansion + Archetype Tuning
- 70 hours
- Deploy to staging

**Week 3** (Day 11-20): Empathy + Rollout
- Issues #19-22: Empathy + Integration + Deployment
- 55 hours
- 10% → 50% → 100% production rollout

### By Role

**Backend**: Issues #2, #5, #6, #7, #11, #12, #13, #15, #16, #17, #19, #20, #22
- 92 hours

**Frontend**: Issues #1, #3
- 14 hours

**Testing**: Issues #4, #8, #9, #14, #18, #21, #22
- 58 hours

**Data**: Issue #10
- 16 hours (shared with Backend)

### Expected Impact

- **Relevance**: 6.5/10 → 7.8/10 (+20%, exceeds 7.3 target)
- **Feels Human**: 7.5/10 → 8.7/10 (+16%, exceeds 8.5 target)
- **Abandonment**: 8% → 4% (-50%, exceeds 5% target)
- **Success Rate**: 55% → 73% (+33%, exceeds 70% target)

### Dependencies Graph

```
Week 1:
  #1 → #2 → #3 → #4
  #5 → #6 → #7 → #8
  #1-8 → #9

Week 2:
  #10 → #11 → #12 → #13 → #14
  #15 → #16 → #17 → #18

Week 3:
  #19 → #20
  #1-20 → #21 → #22
```

---

## Next Steps

1. **Product Manager**: Review and approve all 22 issues
2. **Engineering Manager**: Assign issues to team members
3. **Team**: Begin Week 1 implementation (Issues #1-9)
4. **Daily Standups**: Track progress against timeline
5. **Weekly Reviews**: Validate metrics, adjust as needed

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Owner**: Tickets Manager Agent
**Status**: Ready for Review
