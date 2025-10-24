# Agent Workflow Orchestration

This document describes how the multi-agent system works together to build features from idea to validated implementation.

## Agent System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                             │
│                 "Build recommendation engine"                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                   PRODUCT MANAGER/DESIGNER                      │
│  • Research solutions & best practices                          │
│  • Validate product assumptions                                 │
│  • Create feature specification                                 │
│  • Define success metrics                                       │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                    [Feature Spec Doc]
                             ↓
                    ╔════════════════════╗
                    ║  STRESS TESTER ⚡   ║  ← CHECKPOINT 1
                    ║  Vision Alignment? ║
                    ╚════════════════════╝
                             ↓
              ✅ Approved / ❌ Escalate to User
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                      TICKETS MANAGER                            │
│  • Convert spec to GitHub issues                                │
│  • Break down into smaller tasks                                │
│  • Set labels, milestones, priorities                           │
│  • Link dependencies                                            │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                    [GitHub Issue(s)]
                             ↓
                    ╔════════════════════╗
                    ║  STRESS TESTER ⚡   ║  ← CHECKPOINT 2
                    ║  Scope Appropriate?║
                    ╚════════════════════╝
                             ↓
              ✅ Approved / ❌ Escalate to User
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                   ENGINEERING MANAGER                           │
│  • Review technical approach                                    │
│  • Add architecture guidance                                    │
│  • Define interfaces & contracts                                │
│  • Specify logging & testing requirements                       │
│  • Raise quality bar                                            │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                [Technically Complete Issue]
                             ↓
                    ╔════════════════════╗
                    ║  STRESS TESTER ⚡   ║  ← CHECKPOINT 3
                    ║  Micro-Macro Fit?  ║
                    ╚════════════════════╝
                             ↓
              ✅ Approved / ❌ Escalate to User
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                      CODING AGENT                               │
│  • Implement feature                                            │
│  • Follow architecture & patterns                               │
│  • Add extensive logging                                        │
│  • Write unit tests                                             │
│  • Document code                                                │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                    [Implementation + Tests]
                             ↓
                    ╔════════════════════╗
                    ║  STRESS TESTER ⚡   ║  ← CHECKPOINT 4
                    ║  Matches Spec?     ║
                    ╚════════════════════╝
                             ↓
              ✅ Approved / ❌ Escalate to User
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                   TESTING/DEBUGGING AGENT                       │
│  • Run unit & integration tests                                 │
│  • Test edge cases                                              │
│  • Verify logging & observability                               │
│  • Find & report bugs                                           │
│  • Verify acceptance criteria                                   │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                    [Bug Reports or ✅ Pass]
                             ↓
                    (if bugs → back to Coding Agent)
                    (if pass → continue)
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                    USER SIMULATION AGENT                        │
│  • Test with realistic personas                                 │
│  • Validate user experience                                     │
│  • Measure success metrics                                      │
│  • Provide UX feedback                                          │
│  • Verify product assumptions                                   │
└────────────────────────────┬───────────────────────────────────┘
                             ↓
                    [Test Report + Feedback]
                             ↓
                    ╔════════════════════╗
                    ║  STRESS TESTER ⚡   ║  ← CHECKPOINT 5
                    ║  Assumptions Valid?║
                    ╚════════════════════╝
                             ↓
              ✅ Approved / ❌ Escalate to User
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                      FEATURE COMPLETE ✅                        │
│  • Code implemented & tested                                    │
│  • User experience validated                                    │
│  • Metrics measured                                             │
│  • Product assumptions tested                                   │
│  • Vision alignment confirmed                                   │
└────────────────────────────────────────────────────────────────┘
```

## Workflow Steps in Detail

### Step 1: Product Manager/Designer

**Triggered by:** User request or product need

**Inputs:**
- User request/problem statement
- Product vision (`product_vision.md`)
- Existing product context

**Activities:**
1. Research existing solutions and best practices
2. Validate product assumptions to test
3. Define user flows and interactions
4. Specify acceptance criteria
5. Define success metrics
6. Document edge cases and failure modes

**Outputs:**
- Feature specification document
- User flows
- Success metrics
- Open questions

**Handoff to:** Tickets Manager

---

### Step 2: Tickets Manager

**Triggered by:** Feature spec from Product Manager

**Inputs:**
- Feature specification
- Product requirements
- Acceptance criteria

**Activities:**
1. Convert spec to GitHub issue(s)
2. Break large features into smaller tasks
3. Apply labels, milestones, priorities
4. Document dependencies
5. Link related issues

**Outputs:**
- GitHub issue(s) with `status:needs-review`
- Task breakdown (if applicable)
- Dependency map

**Handoff to:** Engineering Manager

---

### Step 3: Engineering Manager

**Triggered by:** GitHub issue with `status:needs-review`

**Inputs:**
- GitHub issue from Tickets Manager
- System architecture context
- Technical constraints

**Activities:**
1. Review technical approach for soundness
2. Add architecture guidance and patterns
3. Define interfaces and contracts
4. Specify logging requirements
5. Define testing strategy
6. Add error handling requirements
7. Estimate complexity

**Outputs:**
- Technically complete issue with:
  - Architecture decisions
  - Code interfaces/contracts
  - Logging requirements
  - Testing requirements
  - Error handling strategy
- Status updated to `status:ready`

**Handoff to:** Coding Agent

---

### Step 4: Coding Agent (Architect)

**Triggered by:** GitHub issue with `status:ready`

**Inputs:**
- Technically complete GitHub issue
- Architecture guidance
- Code standards and patterns

**Activities:**
1. Implement feature following specs
2. Use TypeScript with strict typing
3. Add extensive structured logging
4. Write unit tests
5. Handle errors gracefully
6. Document complex logic
7. Follow architecture patterns

**Outputs:**
- Implementation code
- Unit tests
- Documentation
- Status updated to `status:testing`

**Handoff to:** Testing/Debugging Agent

---

### Step 5: Testing/Debugging Agent

**Triggered by:** Issue with `status:testing`

**Inputs:**
- Implementation from Coding Agent
- Test requirements from issue
- Acceptance criteria

**Activities:**
1. Run unit tests
2. Run integration tests (if applicable)
3. Test edge cases
4. Verify logging output
5. Check error handling
6. Manual CLI testing
7. Performance verification

**Outputs:**
- Test results (pass/fail)
- Bug reports (if issues found)
- Test coverage report

**Decisions:**
- If bugs found → Create bug issues, send back to Coding Agent
- If all pass → Hand off to User Simulation Agent

**Handoff to:** User Simulation Agent (if pass) or Coding Agent (if bugs)

---

### Step 6: User Simulation Agent

**Triggered by:** Feature passing all technical tests

**Inputs:**
- Working implementation
- Product spec with success metrics
- User personas

**Activities:**
1. Test with realistic personas
2. Simulate natural user interactions
3. Evaluate recommendation quality
4. Measure success metrics
5. Validate product assumptions
6. Provide UX feedback

**Outputs:**
- User simulation test report
- Success metrics measured
- UX feedback and suggestions
- Product assumption validation

**Decisions:**
- If UX issues → Report back to Product Manager
- If successful → Mark feature as complete ✅

**Handoff to:** Product Manager (for validation) or mark Done

---

## Agent Communication

### Document Artifacts
- **Feature Spec** - Product Manager creates, everyone references
- **GitHub Issues** - Tickets Manager creates, Engineering Manager enhances
- **Code** - Coding Agent creates, Testing Agent verifies
- **Test Reports** - Testing/User Simulation Agents create
- **Bug Reports** - Testing Agent creates for Coding Agent

### Status Labels
- `status:needs-review` - Awaiting Engineering Manager
- `status:ready` - Ready for Coding Agent
- `status:in-progress` - Coding Agent working
- `status:testing` - Testing Agent working
- `status:user-validation` - User Simulation Agent working
- `status:blocked` - Waiting on dependency
- `status:done` - Complete ✅

## Using the Workflow

### Option 1: Full Workflow
Start from the beginning:
```
"Use the product manager agent to research and spec out a recommendation engine"
```
Then proceed through each step.

### Option 2: Jump to Stage
Start at any point:
```
"Use the engineering manager agent to review issue #5"
```

### Option 3: Automatic Handoffs
Claude will automatically hand off between agents:
```
"Build a recommendation engine using the full agent workflow"
```
Claude will invoke each agent in sequence.

## Iteration & Feedback Loops

### Bug Fix Loop
```
Testing Agent → [finds bug] → Coding Agent → [fixes] → Testing Agent
```

### UX Issue Loop
```
User Simulation Agent → [UX issue] → Product Manager → [revises spec] → Tickets Manager → ...
```

### Architecture Review Loop
```
Engineering Manager → [concerns] → Product Manager → [adjusts] → Engineering Manager
```

## Quality Gates

Feature cannot progress until:

**Product Manager → Tickets Manager:**
- ✅ Clear problem statement
- ✅ Defined acceptance criteria
- ✅ Success metrics specified

**Tickets Manager → Engineering Manager:**
- ✅ Requirements documented
- ✅ GitHub issue created
- ✅ Dependencies identified

**Engineering Manager → Coding Agent:**
- ✅ Technical approach validated
- ✅ Architecture guidance provided
- ✅ Quality requirements specified

**Coding Agent → Testing Agent:**
- ✅ Code implemented
- ✅ Unit tests written
- ✅ Logging added

**Testing Agent → User Simulation Agent:**
- ✅ All tests passing
- ✅ Edge cases handled
- ✅ No critical bugs

**User Simulation Agent → Done:**
- ✅ User experience validated
- ✅ Success metrics measured
- ✅ Product assumptions tested

## Example: Building Recommendation Engine

**1. Product Manager**
```markdown
# Feature: Core Recommendation Engine

## Problem Statement
Users need relevant gift recommendations with minimal input. Current alternatives
(browsing, searching) require too much effort and often disappoint.

## Product Assumptions
- Graph traversal + vector search > traditional filtering
- LLMs can extract context from natural language
- 3-5 recommendations with rationales > 20 without

## Success Metrics
- Avg relevance score: > 8/10
- Time to recommendation: < 2s
- User satisfaction: > 80%
[... full spec]
```

**2. Tickets Manager**
```markdown
# Issue #1: Build Core Recommendation Engine

## Requirements
- [ ] Neo4j graph traversal by facets
- [ ] Vector similarity search
- [ ] Scoring algorithm combining both
- [ ] Return 3-5 recommendations with rationales
[... full issue]

Labels: feature, recommendation-engine, priority:high
Status: needs-review
```

**3. Engineering Manager**
```markdown
## Engineering Manager Review

### Technical Approach
Use Cypher for graph traversal, cosine similarity for vectors,
weighted scoring: 0.4 * graph + 0.4 * vector + 0.2 * cohere

### Interfaces
```typescript
interface RecommendationEngine {
  recommend(context: UserContext): Promise<Recommendation[]>;
}
```
[... full review]

Status: ready → Assigned to coding-agent
```

**4. Coding Agent**
```typescript
// Implements recommendation engine
// Adds extensive logging
// Writes unit tests
// Documents code
```

**5. Testing Agent**
```
✅ Unit tests pass (15/15)
✅ Integration test pass (5/5)
✅ Edge cases handled
✅ Logging verified
✅ Performance: 1.8s avg

Status: user-validation
```

**6. User Simulation Agent**
```markdown
# Test Report: Persona "Sarah - Thoughtful Planner"

## Evaluation
- Relevance: 8.5/10
- Rationale Quality: 8/10
- User Experience: 9/10

✅ All success metrics met
✅ Product assumptions validated

Status: done ✅
```

## Current Project Phase

**Phase:** Core recommendation engine prototype
**Focus:** Validate product assumptions
**Priority:** Recommendation quality > everything else

Use this workflow to build and validate the recommendation engine systematically!
