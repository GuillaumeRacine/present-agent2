---
name: Implementation Task
about: Tickets Manager creates implementation task from approved spec
title: '[IMPL] '
labels: implementation, needs-eng-review
assignees: ''
---

## 🔨 Implementation Task

**Created by:** Tickets Manager Agent
**From Spec:** #[spec issue number]
**Status:** 🔍 Needs Engineering Manager Review

---

## Problem Statement
<!-- From product spec - the WHY -->



## Product Spec Reference
**Original Spec:** #[issue number]
**Related Issues:** #[issue], #[issue]

## Requirements
<!-- From product spec -->

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Acceptance Criteria
<!-- Clear, testable criteria from spec -->

- [ ] AC 1 (clear, testable)
- [ ] AC 2 (measurable)
- [ ] AC 3 (observable)

## Technical Implementation Notes
<!-- High-level technical approach - will be detailed by Engineering Manager -->

- Use Neo4j for [specific purpose]
- Generate embeddings for [specific data]
- Log [specific events/metrics]

## Success Metrics
<!-- How to measure -->

- Metric 1: [how to measure]
- Metric 2: [target value]

## Test Plan
<!-- Testing requirements -->

- [ ] Unit tests for [component]
- [ ] Integration tests for [workflow]
- [ ] CLI test with [scenario]

## Edge Cases
<!-- From spec -->

| Scenario | Expected Behavior |
|----------|-------------------|
| Edge case 1 | |
| Edge case 2 | |

## Dependencies

**Depends on:** #[issue number]
**Blocks:** #[issue number]
**Related:** #[issue number]

## Data Requirements
<!-- What data is needed, format, source -->



## Out of Scope
<!-- Explicitly what this issue does NOT include -->

-
-

---

## 🔍 Engineering Manager Review

<!-- EM adds technical details below -->

### Technical Approach
<!-- Validated/Modified approach with reasoning -->



### Architecture Decisions
- **Decision 1:**
- **Decision 2:**

### Data Model Changes
<!-- Schema changes needed in Neo4j, if any -->

```cypher
-- Example schema changes
```

### Interfaces & Contracts

```typescript
// Required interfaces
interface ComponentName {
  method(): ReturnType;
}
```

### Logging Requirements

```typescript
// Example structured logs required
logger.info('event_name', {
  field1: value,
  field2: value
});
```

### Error Handling Strategy
- Error case 1: [scenario] → [handling strategy]
- Error case 2: [scenario] → [handling strategy]

### Performance Considerations
- Expected latency: [target]
- Query optimization: [approach]
- Caching strategy: [if needed]

### Testing Requirements

```typescript
// Required test scenarios
describe('Component', () => {
  it('should test scenario 1');
  it('should test scenario 2');
});
```

### Technical Risks
- Risk 1: [description] → [mitigation]

### Estimated Complexity
- **Complexity:** Low/Medium/High
- **Estimated Time:** [hours/days]
- **Confidence:** High/Medium/Low

---

## ✅ Review & Approval Checklist

### Engineering Manager
- [ ] Technical approach validated
- [ ] Architecture guidance provided
- [ ] Interfaces defined
- [ ] Logging requirements specified
- [ ] Testing requirements specified
- [ ] No blocking unknowns

**Comment with:** `/eng-review-complete` when done

### Coding Agent - Pre-Implementation Review
- [ ] Understand all requirements
- [ ] Architecture guidance is clear
- [ ] All interfaces are defined
- [ ] Have questions answered

**Comment with:** `/ready-to-code` to begin implementation

### Implementation Complete
- [ ] Code implemented per specs
- [ ] Unit tests written
- [ ] Logging added
- [ ] Error handling implemented

**Comment with:** `/code-complete` when ready for testing

### Testing Agent Review
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Edge cases tested
- [ ] Logging verified
- [ ] No critical bugs

**Comment with:** `/testing-complete` when verified

### User Simulation
- [ ] UX validated with personas
- [ ] Success metrics measured
- [ ] Product assumptions tested

**Comment with:** `/ux-validated` when complete

---

## 🎯 Definition of Done

- [ ] Code implemented and reviewed
- [ ] Tests passing (unit + integration)
- [ ] Logging and observability added
- [ ] CLI test successful
- [ ] Documentation updated
- [ ] Metrics verified
- [ ] UX validated

**Close issue with:** `/done` - All criteria met ✅

---

<!-- DO NOT DELETE BELOW THIS LINE -->
**Agent Workflow Status:**
- Created by Tickets Manager: [ ]
- Engineering Manager Review: [ ]
- Coding Agent Ready: [ ]
- Implementation Complete: [ ]
- Testing Complete: [ ]
- UX Validated: [ ]
- Done: [ ]
