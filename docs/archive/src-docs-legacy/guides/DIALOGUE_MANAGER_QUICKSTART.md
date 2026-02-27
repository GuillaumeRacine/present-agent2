# DialogueManager Quick Start Guide

## Overview

The DialogueManager agent intelligently decides whether to ask clarifying questions or proceed directly to product recommendations based on confidence scoring and context completeness.

## Quick Start

### 1. Enable DialogueManager

```typescript
import { createOrchestrator } from './services/orchestrator';

// Create orchestrator with DialogueManager enabled
const orchestrator = await createOrchestrator(true); // Pass true to enable
```

### 2. Execute Query

```typescript
const result = await orchestrator.execute({
  userQuery: 'gift for my mom',
  userId: 'user-123',
  sessionId: 'session-abc',
});
```

### 3. Handle Different Modes

```typescript
// Check which mode DialogueManager chose
switch (result.mode) {
  case 'clarifying':
    // Show questions to user
    console.log('Please answer these questions:');
    result.questions.forEach(q => {
      console.log(`Q: ${q.question}`);
      console.log('Options:', q.suggestedAnswers.map(a => a.label));
    });
    break;

  case 'recommendations':
    // Show recommendations
    console.log('Here are some recommendations:');
    result.recommendations.recommendations.forEach(rec => {
      console.log(`${rec.rank}. ${rec.product.title} - $${rec.product.price}`);
    });
    break;

  case 'recommendations_with_refinement':
    // Show recommendations + offer to refine
    console.log('Here are some recommendations:');
    result.recommendations.recommendations.forEach(rec => {
      console.log(`${rec.rank}. ${rec.product.title} - $${rec.product.price}`);
    });
    console.log('\nWant better results? Answer these:');
    result.refinementQuestions?.forEach(q => {
      console.log(`- ${q.question}`);
    });
    break;
}
```

### 4. Submit Answers (Multi-Turn)

```typescript
// User answered questions
const answers = {
  budget: { min: 50, max: 100 },
  interests: 'cooking',
  occasion: { name: 'birthday', urgency: 'planned' },
};

// Re-execute with clarifications
const result2 = await orchestrator.execute({
  userQuery: 'gift for my mom', // Original query
  userId: 'user-123',
  sessionId: 'session-abc', // Same session
  clarifications: answers, // NEW: Answers provided
  originalQuery: 'gift for my mom', // For context
});

// Now should get recommendations
console.log(result2.mode); // 'recommendations'
```

## Decision Logic

### High Confidence (≥0.7) → Recommend
```typescript
{
  mode: 'recommend',
  proceedWithRecommendations: true,
  reasoning: 'High confidence (0.85) with 4/4 critical fields'
}
```

**Example queries:**
- "Birthday gift for my wife who loves cooking and baking, budget $50-100"
- "Tech gadget for my 25 year old brother who's into gaming, under $200"

### Medium Confidence (0.5-0.7) → Hybrid
```typescript
{
  mode: 'hybrid',
  questionsForRefinement: [...],
  proceedWithRecommendations: true,
  reasoning: 'Medium confidence (0.65) - showing recommendations with refinement option'
}
```

**Example queries:**
- "Something for my dad" (has relationship, missing interests/budget)
- "Gift for coworker who likes music, around $50" (has some context, could refine)

### Low Confidence (<0.5) → Ask
```typescript
{
  mode: 'ask',
  questions: [...],
  proceedWithRecommendations: false,
  reasoning: 'Low confidence (0.35) or insufficient critical fields (1/4)'
}
```

**Example queries:**
- "gift ideas" (too vague)
- "something nice" (no specific details)
- "help me find a present" (very generic)

## Critical Fields

DialogueManager checks for these 4 critical fields (needs at least 2/4):

1. **Relationship Type** (`recipient.relationshipType`)
   - Parent, partner, friend, coworker, etc.

2. **Interests** (`interests`)
   - At least one interest mentioned

3. **Budget** (`budget.max > 0`)
   - Budget range specified

4. **Occasion** (`occasion`)
   - Birthday, holiday, anniversary, etc.

## Question Types

### Essential Questions
- **Budget**: "What's your budget range for this gift?"
- **Interests**: "What are they passionate about or interested in?"
- **Relationship**: "What's your relationship to this person?"
- **Occasion**: "What's the occasion?"
- **Recipient Age**: "How old are they?"

### Refinement Questions
- **Music**: Musician? Listener? Producer?
- **Sports**: Specific sport? Fitness? Fan?
- **Cooking**: Home cook? Gourmet? Baker? Griller?
- **Tech**: Gamer? Gadget lover? Developer?
- And more...

### Intent Clarification
- **Intent Priority**: "Which is more important: practical or unique?"
- **Gift Philosophy**: "What matters most for this gift?"

### Constraint Clarification
- **Space**: "Should I avoid bulky items?"
- **Urgency**: "When do you need this gift?"

## Conversation Flow

```
User: "gift for dad"
  ↓
Listener: Extracts context (confidence: 0.4)
  ↓
Memory: Recalls past gifts
  ↓
DialogueManager: Decides MODE
  ↓
┌─────────────┬──────────────────┬─────────────────────┐
│ ASK MODE    │ HYBRID MODE      │ RECOMMEND MODE      │
├─────────────┼──────────────────┼─────────────────────┤
│ Show 2-3    │ Show            │ Show                │
│ questions   │ recommendations  │ recommendations     │
│             │ + refinement     │                     │
│             │ questions        │                     │
└─────────────┴──────────────────┴─────────────────────┘
       ↓              ↓                    ↓
  User answers   User may refine      User happy
       ↓              ↓                    ↓
  Merge answers  Merge if refined     Complete
       ↓              ↓
  Re-execute     Re-execute
       ↓              ↓
  Recommendations Refined recs
```

## Answer Submission Format

```typescript
// Budget answer
{ budget: { min: 50, max: 100 } }

// Interests answer
{ interests: 'cooking' }

// Relationship answer
{ relationship: 'parent' }

// Occasion answer
{ occasion: { name: 'birthday', urgency: 'planned' } }

// Age answer
{ recipient_age: 65 }

// Refinement answer
{ refine_music: 'musician' }

// Intent answer
{ intent_priority: 'practical' }

// Multiple answers
{
  budget: { min: 50, max: 100 },
  interests: 'cooking',
  occasion: { name: 'birthday', urgency: 'planned' }
}
```

## Confidence Boost

When user answers questions, confidence increases:

| Answer Type | Confidence Boost |
|------------|------------------|
| Interests | +0.20 |
| Budget | +0.15 |
| Refinements | +0.12 |
| Relationship | +0.12 |
| Occasion | +0.10 |
| Gift Philosophy | +0.09 |
| Recipient Age | +0.08 |
| Urgency | +0.07 |
| Space Constraint | +0.05 |

**Max total boost:** 0.50 (to prevent over-inflation)

Example:
```
Initial confidence: 0.4
+ Budget answer: +0.15
+ Interests answer: +0.20
= New confidence: 0.75 (now above threshold, will recommend)
```

## Max Turns Limit

DialogueManager enforces a **maximum of 3 conversation turns** to prevent infinite loops:

```
Turn 1: Initial query → Ask questions
Turn 2: Answer questions → Ask more or show recommendations
Turn 3: Final answers → ALWAYS show recommendations (forced)
```

After 3 turns, DialogueManager will **always** proceed to recommendations, even if confidence is still low.

## Question Deduplication

DialogueManager **never asks the same question twice** in a session:

```typescript
// Turn 1: Asked budget
askedQuestions: ['budget']

// Turn 2: Won't ask budget again
// Only asks questions not in askedQuestions array
```

## Performance Characteristics

| Operation | Latency |
|-----------|---------|
| DialogueManager decision | <50ms |
| Question generation | 0ms (template-based) |
| Context assessment | <10ms |
| **Total** | **<100ms** |

No LLM calls = fast and cheap!

## Error Handling

DialogueManager uses a **circuit breaker** pattern:

```
5 consecutive failures → Circuit OPEN
  ↓
Wait 60 seconds
  ↓
Try again (HALF_OPEN)
  ↓
2 successes → Circuit CLOSED
```

On error, **gracefully degrades** to recommend mode:
```typescript
{
  mode: 'recommend',
  proceedWithRecommendations: true,
  reasoning: 'Error occurred - proceeding to recommendations as fallback',
  fallbackReason: 'DialogueManager error: ...'
}
```

## Feature Flag

DialogueManager is **disabled by default** for backward compatibility:

```typescript
// Disabled (default)
const orchestrator = await createOrchestrator();
// or
const orchestrator = await createOrchestrator(false);

// Enabled
const orchestrator = await createOrchestrator(true);
```

When disabled:
- Orchestrator skips DialogueManager
- Always proceeds directly to recommendations
- Backward compatible with existing behavior

## Testing

### Test Low Confidence
```typescript
const result = await orchestrator.execute({
  userQuery: 'gift ideas', // Very vague
  userId: 'test-user',
  sessionId: 'test-session',
});

expect(result.mode).toBe('clarifying');
expect(result.questions.length).toBeGreaterThan(0);
```

### Test High Confidence
```typescript
const result = await orchestrator.execute({
  userQuery: 'Birthday gift for my wife who loves cooking, budget $50-100',
  userId: 'test-user',
  sessionId: 'test-session',
});

expect(result.mode).toBe('recommendations');
expect(result.recommendations.recommendations.length).toBeGreaterThan(0);
```

### Test Multi-Turn
```typescript
// Turn 1: Ask
const turn1 = await orchestrator.execute({
  userQuery: 'gift for dad',
  userId: 'test-user',
  sessionId: 'test-session',
});
expect(turn1.mode).toBe('clarifying');

// Turn 2: Answer and get recommendations
const turn2 = await orchestrator.execute({
  userQuery: 'gift for dad',
  userId: 'test-user',
  sessionId: 'test-session',
  clarifications: {
    budget: { min: 50, max: 100 },
    interests: 'grilling',
  },
  originalQuery: 'gift for dad',
});
expect(turn2.mode).toBe('recommendations');
```

### Force Mode (Testing Only)
```typescript
// Force DialogueManager into specific mode
const result = await dialogueManager.process({
  listenerOutput,
  memoryOutput,
  conversationHistory: [],
  forcedMode: 'ask', // Force ask mode for testing
});
```

## Debugging

### Enable Logging
```bash
# Set log level
export LOG_LEVEL=debug

# Run with verbose logging
const result = await orchestrator.executeWithLogging(input);
```

### Check Decision Reasoning
```typescript
console.log('Mode:', result.mode);
console.log('Reasoning:', result.reasoning);
console.log('Confidence:', result.confidenceAssessment.overallConfidence);
console.log('Critical fields:', result.confidenceAssessment.criticalFieldsCovered);
console.log('Missing fields:', result.confidenceAssessment.criticalFieldsMissing);
```

### Inspect Performance
```typescript
console.log('Total time:', result.performance.totalExecutionTimeMs);
console.log('Agent timings:', result.performance.agentTimings);
```

## Common Patterns

### Pattern 1: Simple Vague Query
```typescript
"gift for mom"
  → Ask mode
  → Questions: budget, interests, occasion
  → User answers
  → Recommend mode
```

### Pattern 2: Medium Detail Query
```typescript
"Something for my coworker who likes coffee"
  → Hybrid mode
  → Show recommendations
  → Offer refinement: "Casual drinker? Enthusiast? Espresso lover?"
  → User may refine
  → Better recommendations
```

### Pattern 3: Detailed Query
```typescript
"Birthday gift for my wife who loves cooking, budget $50-100"
  → Recommend mode
  → Direct to recommendations
  → No questions needed
```

## Next Steps

1. **Implement frontend UI** for questions
2. **Add unit tests** for decision logic
3. **Monitor metrics** (question engagement, confidence improvement)
4. **A/B test** to validate improvement hypothesis

## Related Files

- Type definitions: `/src/types/dialogue.ts`
- Agent implementation: `/src/services/agents/dialogue-manager.ts`
- Question templates: `/src/lib/question-templates.ts`
- Conversation state: `/src/services/conversation/`
- Orchestrator: `/src/services/orchestrator.ts`

## Support

For questions or issues, check:
- Implementation summary: `/DIALOGUE_MANAGER_IMPLEMENTATION_SUMMARY.md`
- Feature spec: `/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md`
- Technical review: `/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md`
