# Listener Agent Quick Reference

## When to Use Enhanced Fields

### 1. Enhanced Constraints (`enhancedConstraints`)

**Use when you need**:
- Filter out specific categories (excluded)
- Enforce requirements (required)
- Handle size/space limitations
- Respect timing urgency

**Examples**:
```typescript
// Check for exclusions
if (listenerOutput.enhancedConstraints?.excluded?.includes('food')) {
  // Filter out food items
}

// Respect size constraints
if (listenerOutput.enhancedConstraints?.size === 'small') {
  // Only show compact items
}

// Handle urgency
if (listenerOutput.enhancedConstraints?.timing === 'urgent') {
  // Prioritize fast shipping
}
```

---

### 2. Life Context (`lifeContext`)

**Use when you need**:
- Understand recipient's current situation
- Infer related needs or interests
- Adjust recommendations for life stage

**Examples**:
```typescript
// New parent = practical gifts
if (listenerOutput.lifeContext?.recentEvents?.includes('new baby')) {
  // Prioritize practical, easy-to-use items
}

// Busy professional = time-saving
if (listenerOutput.lifeContext?.timeAvailability === 'very_busy') {
  // Focus on convenience, time-savers
}

// Retiree = leisure interests
if (listenerOutput.lifeContext?.lifeStage === 'retiree') {
  // Emphasize hobbies, experiences
}
```

---

### 3. Relationship Depth (`relationshipDepth`)

**Use when you need**:
- Validate gift appropriateness
- Set budget expectations
- Filter by formality level

**Examples**:
```typescript
// Check appropriateness
if (!listenerOutput.relationshipDepth?.appropriateness?.personalGifts) {
  // Filter out personalized items for professional relationships
}

// Adjust for closeness
if (listenerOutput.relationshipDepth?.closeness === 'professional') {
  // Show safe, professional gifts only
}

// Consider duration
if (listenerOutput.relationshipDepth?.duration === 'new') {
  // Avoid overly intimate or expensive items
}
```

---

### 4. Intent Signals (`intentSignals`)

**Use when you need**:
- Prioritize recommendations by intent
- Craft appropriate messaging
- Filter by uniqueness/safety

**Examples**:
```typescript
// Unique gifts for "stand out" intent
if (listenerOutput.intentSignals?.unique) {
  // Boost uniqueness score, prioritize rare finds
}

// Safe choices for uncertain givers
if (listenerOutput.intentSignals?.safe) {
  // Show popular, can't-go-wrong options
}

// Sentimental gifts for emotional occasions
if (listenerOutput.intentSignals?.sentimental) {
  // Prioritize meaningful, personal items
}

// Last minute urgency
if (listenerOutput.intentSignals?.lastMinute) {
  // Filter by fast shipping, digital delivery
}
```

---

### 5. Enhanced Interests (`enhancedInterests`)

**Use when you need**:
- Match by expertise level
- Avoid dislikes
- Leverage inferred interests

**Examples**:
```typescript
// Expert-level interests
const expertInterests = listenerOutput.enhancedInterests?.explicit
  ?.filter(i => i.level === 'expert')
  .map(i => i.interest);

// Avoid anti-interests
const dislikes = listenerOutput.enhancedInterests?.antiInterests || [];
// Filter out products matching dislikes

// Use inferred interests
const inferredWithConfidence = listenerOutput.enhancedInterests?.inferred
  ?.filter(i => i.confidence > 0.7)
  .map(i => i.interest);
```

---

### 6. Gift Philosophy (`giftPhilosophy`)

**Use when you need**:
- Align recommendations with giver values
- Craft resonant messaging
- Prioritize by what matters

**Examples**:
```typescript
// Meaningful gifts for sentimental givers
if (listenerOutput.giftPhilosophy?.valuesMeaning) {
  // Boost personalization score
  // Craft stories about emotional connection
}

// Practical gifts for utility-focused givers
if (listenerOutput.giftPhilosophy?.valuesPracticality) {
  // Emphasize usefulness in descriptions
  // Prioritize functional items
}

// Quality focus
if (listenerOutput.giftPhilosophy?.valuesQuality) {
  // Filter for premium brands
  // Emphasize craftsmanship
}

// Sustainability
if (listenerOutput.giftPhilosophy?.valuesSustainability) {
  // Filter for eco-friendly products
  // Highlight ethical sourcing
}
```

---

### 7. Ambiguities (`ambiguities`)

**Use when you need**:
- Identify missing information
- Prompt for clarification
- Set confidence thresholds

**Examples**:
```typescript
// Check for critical gaps
if (listenerOutput.ambiguities?.some(a => a.field === 'budget')) {
  // Ask: "What's your budget for this gift?"
}

// Multiple ambiguities = low confidence
if (listenerOutput.ambiguities && listenerOutput.ambiguities.length > 2) {
  // Consider asking clarifying questions before searching
}

// Use suggested clarifications
listenerOutput.ambiguities?.forEach(amb => {
  if (amb.suggestedClarification) {
    // Present to user as follow-up question
  }
});
```

---

## Integration Patterns

### Pattern 1: Filtering Products

```typescript
function filterByEnhancedConstraints(
  products: Product[],
  listener: ListenerOutput
): Product[] {
  let filtered = products;

  // Exclude categories
  if (listener.enhancedConstraints?.excluded) {
    filtered = filtered.filter(p =>
      !listener.enhancedConstraints!.excluded!.some(exc =>
        p.categories.includes(exc)
      )
    );
  }

  // Require attributes
  if (listener.enhancedConstraints?.required) {
    filtered = filtered.filter(p =>
      listener.enhancedConstraints!.required!.every(req =>
        p.attributes.includes(req)
      )
    );
  }

  // Size constraints
  if (listener.enhancedConstraints?.size === 'small') {
    filtered = filtered.filter(p =>
      p.dimensions && p.dimensions.volume < SMALL_SIZE_THRESHOLD
    );
  }

  return filtered;
}
```

---

### Pattern 2: Scoring Adjustments

```typescript
function adjustScoreByIntent(
  baseScore: number,
  product: Product,
  listener: ListenerOutput
): number {
  let score = baseScore;

  // Boost for unique items if uniqueness is valued
  if (listener.intentSignals?.unique && product.uniquenessScore > 0.7) {
    score *= 1.3;
  }

  // Boost for practical items if practicality is valued
  if (listener.intentSignals?.practical && product.practicalityScore > 0.7) {
    score *= 1.2;
  }

  // Penalize if doesn't match gift philosophy
  if (listener.giftPhilosophy?.valuesQuality && product.qualityScore < 0.6) {
    score *= 0.7;
  }

  return score;
}
```

---

### Pattern 3: Personalized Messaging

```typescript
function craftPersonalizedReasoning(
  product: Product,
  listener: ListenerOutput
): string {
  const parts: string[] = [];

  // Lead with intent
  if (listener.intentSignals?.sentimental) {
    parts.push("This meaningful gift");
  } else if (listener.intentSignals?.practical) {
    parts.push("This practical choice");
  } else if (listener.intentSignals?.unique) {
    parts.push("This unique find");
  }

  // Connect to interests
  const interests = listener.enhancedInterests?.explicit || [];
  if (interests.length > 0) {
    const expertInterests = interests.filter(i => i.level === 'expert');
    if (expertInterests.length > 0) {
      parts.push(`perfect for a ${expertInterests[0].interest} expert`);
    } else {
      parts.push(`ideal for someone who loves ${interests[0].interest}`);
    }
  }

  // Address life context
  if (listener.lifeContext?.recentEvents) {
    parts.push(`especially meaningful during this ${listener.lifeContext.recentEvents[0]} phase`);
  }

  // Note constraints handled
  if (listener.enhancedConstraints?.space === 'minimal') {
    parts.push("won't take up much space");
  }

  return parts.join(', ') + '.';
}
```

---

### Pattern 4: Validation with Appropriateness

```typescript
function validateAppropriatenessForRelationship(
  product: Product,
  listener: ListenerOutput
): { valid: boolean; reason?: string } {
  const appropriateness = listener.relationshipDepth?.appropriateness;

  if (!appropriateness) {
    return { valid: true }; // No constraints
  }

  // Check if product is too personal
  if (!appropriateness.personalGifts && product.personalizationLevel === 'high') {
    return {
      valid: false,
      reason: 'Too personal for this relationship'
    };
  }

  // Check if product is too expensive
  if (!appropriateness.expensiveGifts && product.price > 100) {
    return {
      valid: false,
      reason: 'Too expensive for this relationship'
    };
  }

  // Check if product is too intimate
  if (!appropriateness.intimateGifts && product.intimacyLevel === 'high') {
    return {
      valid: false,
      reason: 'Too intimate for this relationship'
    };
  }

  // Check if humorous gifts are inappropriate
  if (!appropriateness.humorousGifts && product.tags.includes('gag gift')) {
    return {
      valid: false,
      reason: 'Humorous gifts not appropriate for this relationship'
    };
  }

  return { valid: true };
}
```

---

## Field Priority Matrix

When multiple signals conflict, use this priority order:

| Priority | Field | Rationale |
|---|---|---|
| 1 | `enhancedConstraints.excluded` | Hard constraints, must respect |
| 2 | `relationshipDepth.appropriateness` | Social norms, avoid awkwardness |
| 3 | `enhancedConstraints.required` | Must-haves specified by user |
| 4 | `intentSignals` | Core user goals |
| 5 | `giftPhilosophy` | Value alignment |
| 6 | `enhancedInterests.antiInterests` | Avoid dislikes |
| 7 | `lifeContext` | Situational relevance |
| 8 | `enhancedInterests.explicit` | Direct interests |
| 9 | `enhancedInterests.inferred` | Likely interests |

---

## Confidence Interpretation

| Confidence Range | Interpretation | Action |
|---|---|---|
| 0.0 - 0.3 | Very Low | Ask multiple clarifying questions |
| 0.3 - 0.5 | Low | Ask 1-2 key clarifying questions |
| 0.5 - 0.7 | Moderate | Proceed with caution, show diverse options |
| 0.7 - 0.85 | Good | Proceed confidently |
| 0.85 - 1.0 | Excellent | High confidence recommendations |

---

## Common Queries & Expected Extraction

### Query: "Last minute gift for coworker, under $30"
```typescript
{
  relationshipDepth: { type: 'coworker', closeness: 'professional' },
  enhancedConstraints: { timing: 'urgent', budget: { max: 30 } },
  intentSignals: { lastMinute: true, safe: true }
}
```

### Query: "My mom loves gardening but hates clutter"
```typescript
{
  relationshipDepth: { type: 'parent', closeness: 'very_close' },
  enhancedInterests: {
    explicit: [{ interest: 'gardening' }],
    antiInterests: ['clutter']
  },
  enhancedConstraints: { excluded: ['clutter'], space: 'minimal' }
}
```

### Query: "Unique gift to impress my new boss"
```typescript
{
  relationshipDepth: { type: 'boss', closeness: 'professional', duration: 'new' },
  intentSignals: { impress: true, unique: true, safe: true }
}
```

---

## Migration Guide for Existing Agents

### Before (using basic fields only)
```typescript
const interests = listenerOutput.interests || [];
const budget = listenerOutput.budget;
```

### After (leveraging enhanced fields)
```typescript
// Use enhanced interests with levels
const expertInterests = listenerOutput.enhancedInterests?.explicit
  ?.filter(i => i.level === 'expert')
  .map(i => i.interest) || [];

// Fall back to basic interests if enhanced not available
const allInterests = expertInterests.length > 0
  ? expertInterests
  : (listenerOutput.interests || []);

// Use enhanced constraints
const excluded = listenerOutput.enhancedConstraints?.excluded || [];
const required = listenerOutput.enhancedConstraints?.required || [];

// Backward compatible budget access
const budget = listenerOutput.enhancedConstraints?.budget || listenerOutput.budget;
```

---

## Best Practices

1. **Always Check for Existence**: All enhanced fields are optional
   ```typescript
   if (listenerOutput.enhancedConstraints?.excluded) {
     // Use it
   }
   ```

2. **Provide Fallbacks**: Support both old and new fields
   ```typescript
   const constraints = listenerOutput.enhancedConstraints || {};
   ```

3. **Respect Hard Constraints First**: Exclusions > requirements > preferences

4. **Use Confidence Scores**: For inferred interests, respect confidence thresholds
   ```typescript
   const highConfidenceInferred = listenerOutput.enhancedInterests?.inferred
     ?.filter(i => i.confidence > 0.75) || [];
   ```

5. **Log Missing Context**: Track which fields are rarely extracted to improve prompts
   ```typescript
   if (!listenerOutput.relationshipDepth) {
     logger.warn('Missing relationship depth', { query });
   }
   ```

---

## Troubleshooting

### Issue: Enhanced fields not being extracted

**Possible causes**:
- LLM temperature too low (should be 0.3)
- Query too short/vague
- JSON parsing failure

**Solution**:
- Check logs for extraction errors
- Verify JSON mode is enabled
- Review prompt clarity

### Issue: Over-inference (extracting things not in query)

**Possible causes**:
- LLM being too creative
- Ambiguous phrasing in prompt

**Solution**:
- Review inference guidelines in prompt
- Lower temperature if needed
- Add examples of appropriate vs. over-inference

### Issue: Confidence scores too low

**Possible causes**:
- Missing many optional fields
- Ambiguous user query

**Solution**:
- Use ambiguities field to prompt for clarification
- Show diverse options when confidence < 0.7
- Track which fields most impact confidence

---

## Additional Resources

- **Full Documentation**: `LISTENER_ENHANCEMENTS.md`
- **Test Cases**: `test-listener-improvements.ts`
- **Type Validation**: `validate-listener-types.ts`
- **Source Code**: `src/services/agents/listener.ts`
- **Type Definitions**: `src/types/agents.ts`
