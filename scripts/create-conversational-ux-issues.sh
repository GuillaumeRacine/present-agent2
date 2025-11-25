#!/bin/bash

# Script to create all Conversational UX Improvement GitHub issues
# Usage: ./scripts/create-conversational-ux-issues.sh

set -e

echo "Creating GitHub issues for Conversational UX Improvement feature..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI is not installed. Please install it first:"
    echo "  brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub. Please run:"
    echo "  gh auth login"
    exit 1
fi

# Issue #1: Core DialogueManager Agent
echo "Creating Issue #1: Core DialogueManager Agent Implementation..."
gh issue create \
  --title "Core DialogueManager Agent Implementation" \
  --label "P0,size:L,agent,core-feature" \
  --body "$(cat <<'EOF'
## Description
Create the DialogueManager agent that sits between the Listener and downstream agents, making intelligent decisions about when to ask clarifying questions versus proceeding to recommendations.

## Context
Currently, the system always returns recommendations even when confidence is low (0.3 or less) and critical context is missing. This results in poor relevance (4.3/10 average) and 33% success rate. The DialogueManager will be the "dialogue gate" that decides: "Should we ask questions or show products?"

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.1)

## Acceptance Criteria
- [ ] Create `DialogueManagerAgent` class extending `BaseAgent<DialogueManagerInput, DialogueManagerOutput>` at `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/dialogue-manager.ts`
- [ ] Implement `assessContext()` method that evaluates overall confidence, critical fields coverage, and high-impact ambiguities
- [ ] Implement `decide()` method with confidence-based routing:
  - **≥ 0.7 confidence + ≥3 critical fields** → `mode: 'recommend'`
  - **0.5-0.7 confidence + ≥2 critical fields** → `mode: 'hybrid'`
  - **< 0.5 confidence OR <2 critical fields** → `mode: 'ask'`
- [ ] Return structured `DialogueManagerOutput` with mode, reasoning, and confidence assessment
- [ ] Agent processes in < 200ms (excluding any LLM calls)
- [ ] Unit tests for all decision branches (minimum 90% coverage)

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #1)

## Dependencies
None (foundational)

## Estimated Complexity
Large (3-4 days)
EOF
)"

echo "✓ Created Issue #1"
echo ""

# Issue #2: Question Generation System
echo "Creating Issue #2: Question Generation System..."
gh issue create \
  --title "Question Generation System" \
  --label "P0,size:XL,agent,core-feature" \
  --body "$(cat <<'EOF'
## Description
Implement comprehensive question generation that creates targeted clarifying questions based on missing critical fields, vague interests, ambiguities, and conflicting intent signals.

## Context
The Listener already detects ambiguities and calculates confidence, but we never act on this intelligence. This system will generate 1-3 prioritized questions with suggested answers to gather missing context efficiently.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 3.3)

## Acceptance Criteria
- [ ] Implement `generateQuestions()` method for all gap types: essential, refinement, ambiguity, intent, constraint
- [ ] Each question includes: unique ID, type, natural language text, 3-5 suggested answers, priority, confidence impact
- [ ] Implement `prioritizeQuestions()` that sorts by priority and confidence impact
- [ ] Return maximum 3 questions per turn
- [ ] Questions feel natural and conversational (not robotic)
- [ ] Unit tests for all question types

## Question Templates
- **Budget**: "What's your budget range for this gift?" with 5 suggested ranges
- **Interests**: "What are they passionate about?" with 6 suggested categories
- **Refinement**: "You mentioned music - can you be more specific?" with genre options
- **Intent**: "I see you want both X and Y. Which is more important?" with priority options

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #2)

## Dependencies
- Issue #1 (DialogueManager core)

## Estimated Complexity
Extra Large (5-6 days)
EOF
)"

echo "✓ Created Issue #2"
echo ""

# Issue #3: Multi-Turn Conversation State
echo "Creating Issue #3: Multi-Turn Conversation State Management..."
gh issue create \
  --title "Multi-Turn Conversation State Management" \
  --label "P0,size:M,database,core-feature" \
  --body "$(cat <<'EOF'
## Description
Create a conversation state management system that tracks asked questions, received answers, and conversation turns across a session to enable intelligent multi-turn dialogue without repetition.

## Context
Users will engage in 1-3 rounds of Q&A before receiving recommendations. We must track what we've asked to avoid annoying repetition and to merge clarifications with the original query context.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.5)

## Acceptance Criteria
- [ ] Create `ConversationTurn` interface with turnNumber, userInput, listenerOutput, dialogueDecision, askedQuestions, receivedAnswers
- [ ] Implement `getAskedQuestions(conversationHistory)` method in DialogueManager
- [ ] Filter out already-asked questions before generating new questions
- [ ] Implement maximum turn limit (3 rounds) with forced recommendation mode after
- [ ] Store conversation turns in Neo4j with proper relationships
- [ ] Implement session retrieval by sessionId
- [ ] Add conversation turn to orchestrator context
- [ ] Unit tests for deduplication logic

## Neo4j Schema
```cypher
CREATE (turn:ConversationTurn {
  id: $turnId,
  sessionId: $sessionId,
  turnNumber: $turnNumber,
  timestamp: datetime(),
  askedQuestions: $askedQuestions,
  confidence: $confidence
})
```

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #3)

## Dependencies
- Issue #1, #2

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #3"
echo ""

# Issue #4: Orchestrator Integration
echo "Creating Issue #4: Orchestrator Integration for Dialogue Branching..."
gh issue create \
  --title "Orchestrator Integration for Dialogue Branching" \
  --label "P0,size:M,orchestrator,core-feature" \
  --body "$(cat <<'EOF'
## Description
Modify the orchestrator to insert DialogueManager between Listener and downstream agents, implementing conditional branching based on dialogue mode (ask vs recommend vs hybrid).

## Context
Currently orchestrator runs: Listener → Memory → Curator → Explorer → Validator → Presenter in sequence. We need to add DialogueManager after Memory and branch based on its decision.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.2)

## Acceptance Criteria
- [ ] Modify orchestrator to instantiate and call DialogueManager after Memory agent
- [ ] Implement conditional branching for ask/hybrid/recommend modes
- [ ] Update `OrchestratorOutput` type to support new modes with questions/refinementQuestions
- [ ] Retrieve conversation history for current sessionId
- [ ] Store new conversation turn after each execution
- [ ] Maintain backward compatibility (existing recommendation flow unchanged)
- [ ] Integration tests for all three modes

## Flow
```
User Query → Listener → Memory → DialogueManager
                                       ↓
                        ┌──────────────┼──────────────┐
                        ↓              ↓              ↓
                      ASK          HYBRID        RECOMMEND
                  (questions)  (recs + refine)  (full pipeline)
```

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #4)

## Dependencies
- Issue #1, #2, #3

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #4"
echo ""

# Issue #5: Answer Merging
echo "Creating Issue #5: Answer Merging and Context Enrichment..."
gh issue create \
  --title "Answer Merging and Context Enrichment" \
  --label "P1,size:M,core-feature" \
  --body "$(cat <<'EOF'
## Description
When users answer clarifying questions, merge those answers with the original query context and re-run the Listener to extract enriched context for better recommendations.

## Context
After asking "What's your budget?" and user selects "$50-$100", we need to integrate this into the context as if user had said "gift for dad, budget $50-100" from the start.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.2)

## Acceptance Criteria
- [ ] Implement `mergeWithClarifications()` function that builds enriched query incorporating answers
- [ ] Handle different answer types: budget, interests, intent, refinement
- [ ] Re-run Listener with enriched context
- [ ] Verify confidence increases after incorporating answers
- [ ] Track confidence improvement per answer (analytics)
- [ ] Unit tests for all answer types

## Expected Confidence Boost
- Budget answer: +0.15
- Interest answer: +0.20
- Occasion answer: +0.10
- Cap at +0.5 total

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #5)

## Dependencies
- Issue #3

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #5"
echo ""

# Issue #6: Frontend Question UI
echo "Creating Issue #6: Frontend Question UI Component..."
gh issue create \
  --title "Frontend Question UI Component" \
  --label "P1,size:L,frontend,ui" \
  --body "$(cat <<'EOF'
## Description
Create a React component that renders clarifying questions with selectable answer buttons, handles multi-question display, and submits answers back to the backend.

## Context
Users need an intuitive UI to answer 1-3 questions quickly. Questions should feel conversational and easy to interact with, especially on mobile. Suggested answers should be tappable/clickable buttons, not text inputs.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.3.A)

## Acceptance Criteria
- [ ] Create `ClarifyingQuestionBlock` component at `frontend/components/clarifying-question-block.tsx`
- [ ] Display 1-3 questions in a single block
- [ ] Render suggested answers as selectable buttons
- [ ] Highlight selected answer (visual state)
- [ ] Show "Continue" button (disabled until at least 1 answer selected)
- [ ] Optional: "Skip questions - show me anything" escape hatch
- [ ] Handle answer submission with callback
- [ ] Responsive design (works on mobile and desktop)
- [ ] Accessible (keyboard navigation, screen reader friendly)
- [ ] Include question priority indicator (essential vs optional)

## Design Requirements
- Use shadcn/ui components
- Match current chat interface design
- Mobile-first responsive design
- Tap targets ≥44px for mobile
- WCAG 2.1 AA compliance

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #6)

## Dependencies
- Issue #2 (question format)

## Estimated Complexity
Large (3-4 days)
EOF
)"

echo "✓ Created Issue #6"
echo ""

# Issue #7: Frontend Chat Integration
echo "Creating Issue #7: Frontend Chat Integration for Questions..."
gh issue create \
  --title "Frontend Chat Integration for Questions" \
  --label "P1,size:M,frontend,integration" \
  --body "$(cat <<'EOF'
## Description
Modify the main chat interface (page.tsx) to handle rendering questions, collecting answers, and submitting enriched follow-up queries based on user responses.

## Context
Currently the chat interface only renders recommendations. We need to extend it to support three message types: normal recommendations, questions, and hybrid (recommendations + refinement questions).

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.3.B)

## Acceptance Criteria
- [ ] Update `Message` interface to support questions, refinementQuestions, messageType
- [ ] Render `ClarifyingQuestionBlock` when message contains questions
- [ ] Handle question answer submission with enriched query construction
- [ ] Handle hybrid mode (recommendations + refinement questions)
- [ ] Track conversation turns in frontend state
- [ ] Show conversation progress (e.g., "Question 1 of 3")
- [ ] Integration with existing recommendation display
- [ ] Maintain scroll position and focus

## Message Types
- `questions`: Show only questions (ASK mode)
- `recommendations`: Show only recommendations (RECOMMEND mode)
- `hybrid`: Show recommendations + refinement questions (HYBRID mode)

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #7)

## Dependencies
- Issue #6

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #7"
echo ""

# Issue #8: Backend API Endpoint
echo "Creating Issue #8: Backend API Endpoint for Clarifications..."
gh issue create \
  --title "Backend API Endpoint for Clarifications" \
  --label "P1,size:S,backend,api" \
  --body "$(cat <<'EOF'
## Description
Modify the chat API endpoint to accept clarification answers, merge them with context, and return appropriate response types (questions, recommendations, or hybrid).

## Context
Currently API only accepts `{ query, userId }`. We need to extend it to handle `{ query, userId, sessionId, clarifications }` and return different response shapes based on orchestrator mode.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 4.4)

## Acceptance Criteria
- [ ] Update API request schema to accept query, userId, sessionId, clarifications, originalQuery
- [ ] When clarifications present, call `mergeWithClarifications()` to build enriched context
- [ ] Return response shape based on orchestrator mode (questions/recommendations/hybrid)
- [ ] Include sessionId in all responses
- [ ] Add error handling for invalid clarifications
- [ ] Add request validation (Zod schema)
- [ ] API tests for all response types

## Response Types
```typescript
type ChatResponse =
  | { type: 'questions'; questions: ClarifyingQuestion[]; reasoning: string; }
  | { type: 'recommendations'; recommendations: Recommendation[]; intro: string; }
  | { type: 'recommendations'; recommendations: Recommendation[]; refinementQuestions: ClarifyingQuestion[]; }
```

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #8)

## Dependencies
- Issue #5 (answer merging)

## Estimated Complexity
Small (1-2 days)
EOF
)"

echo "✓ Created Issue #8"
echo ""

# Issue #9: Hybrid Mode
echo "Creating Issue #9: Hybrid Mode Implementation..."
gh issue create \
  --title "Hybrid Mode Implementation" \
  --label "P2,size:M,feature,ux" \
  --body "$(cat <<'EOF'
## Description
For medium-confidence scenarios (0.5-0.7), show recommendations immediately but also provide optional refinement questions that users can answer to get better suggestions.

## Context
Not all users want to answer questions before seeing results. Hybrid mode provides the best of both worlds: immediate gratification for impatient users, refinement option for quality-focused users.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 3.5)

## Acceptance Criteria
- [ ] DialogueManager generates `mode: 'hybrid'` for confidence 0.5-0.7 with ≥2 critical fields
- [ ] Generate 1-2 refinement questions (not essential, not blocking)
- [ ] Orchestrator continues to full recommendation pipeline in hybrid mode
- [ ] Attach refinement questions to recommendation response
- [ ] Frontend renders recommendations first, questions below with "Want more personalized picks?" prompt
- [ ] Questions are optional (user can ignore)
- [ ] If user answers refinement questions, show improved recommendations
- [ ] Integration tests for hybrid flow

## User Experience
```
Here are some ideas based on what you've told me:

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

Want more personalized picks? Answer these:
- Question 1 [answer options]
- Question 2 [answer options]
```

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #9)

## Dependencies
- Issue #2, #4, #6, #7

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #9"
echo ""

# Issue #10: Persona Testing
echo "Creating Issue #10: Persona Testing with Conversational UX..."
gh issue create \
  --title "Persona Testing with Conversational UX" \
  --label "P1,size:M,testing,validation" \
  --body "$(cat <<'EOF'
## Description
Update the persona testing framework to simulate answering clarifying questions and measure improvement in recommendation quality compared to baseline (no questions).

## Context
We need to validate that asking questions actually improves recommendation relevance. Extend existing persona tests to answer questions programmatically and compare final recommendations.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 7)

## Acceptance Criteria
- [ ] Extend persona definitions with clarification answers
- [ ] Implement automated question answering (persona selects appropriate answers)
- [ ] Measure metrics for both scenarios: vague query WITHOUT dialogue vs WITH dialogue
- [ ] Track: relevance improvement, confidence improvement, question rounds, interest match
- [ ] Generate comparison report
- [ ] Validate target improvements:
  - Relevance: 4.3/10 → ≥7.0/10
  - Success rate: 33% → ≥70%
  - Interest match: 47% → ≥80%

## Test Scenarios
1. **Baseline**: Vague query ("gift for mom") → immediate recommendations
2. **With Dialogue**: Vague query → questions → answers → improved recommendations
3. **Comparison**: Calculate improvement percentage

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #10)

## Dependencies
- Issue #1-8 (all core features)

## Estimated Complexity
Medium (2-3 days)
EOF
)"

echo "✓ Created Issue #10"
echo ""

# Issue #11: Analytics
echo "Creating Issue #11: Analytics and Monitoring..."
gh issue create \
  --title "Analytics and Monitoring for Dialogue Engagement" \
  --label "P2,size:S,observability,analytics" \
  --body "$(cat <<'EOF'
## Description
Implement analytics to track user engagement with questions, confidence improvements, question abandonment rates, and overall dialogue effectiveness.

## Context
We need data to measure success of the conversational UX and identify areas for improvement. Track both technical metrics (confidence deltas) and behavioral metrics (engagement rates).

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 7.2)

## Acceptance Criteria
- [ ] Track dialogue events: questions_shown, questions_answered, questions_skipped, confidence_improvement, recommendations_shown
- [ ] Calculate and log metrics per session: engagement rate, avg questions, confidence delta, time to recommendation
- [ ] Store metrics in database for analysis
- [ ] Create metrics dashboard or reporting endpoint
- [ ] Log to existing logging infrastructure
- [ ] Add Prometheus/Grafana metrics (optional)

## Key Metrics
1. **Question Engagement Rate**: % of users who answer (target: ≥75%)
2. **Average Questions Per Session**: Rounds needed (target: ≤2.0)
3. **Confidence Delta**: Average improvement (target: +0.15-0.25)
4. **Time to First Recommendation**: Including Q&A (target: ≤45s)
5. **Question Abandonment Rate**: % who bail (target: ≤15%)

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #11)

## Dependencies
- Issue #1-9 (all features)

## Estimated Complexity
Small (1-2 days)
EOF
)"

echo "✓ Created Issue #11"
echo ""

# Issue #12: Documentation
echo "Creating Issue #12: Documentation and User Guide..."
gh issue create \
  --title "Documentation and User Guide for Conversational UX" \
  --label "P2,size:S,documentation" \
  --body "$(cat <<'EOF'
## Description
Create comprehensive documentation explaining the conversational UX feature, how it works, when questions are asked, and how to use it effectively.

## Context
Users and developers need to understand the new dialogue system. Provide clear documentation with examples, decision logic explanation, and best practices.

**Spec Reference**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md` (Section 14)

## Acceptance Criteria
- [ ] Create user-facing documentation: how system decides to ask, example conversations, how to answer, privacy
- [ ] Create developer documentation: architecture, API changes, question generation logic, testing
- [ ] Update README with feature description
- [ ] Create architectural diagram (dialogue flow)
- [ ] Add code examples for common scenarios
- [ ] Document confidence thresholds and reasoning
- [ ] Add troubleshooting guide

## Files to Create
1. `docs/USER_GUIDE_CONVERSATIONAL_UX.md`
2. `docs/DEVELOPER_GUIDE_CONVERSATIONAL_UX.md`
3. `docs/diagrams/dialogue-flow.mmd` (Mermaid diagram)
4. Update `README.md`
5. Update `CHANGELOG.md` with v2.3.0 entry

## Content Outline
**User Guide**:
- How it works
- When questions are asked
- Example conversations
- Tips for best results
- Privacy considerations

**Developer Guide**:
- Architecture overview
- Flow diagram
- API changes
- Decision logic
- Adding new question types
- Testing strategies

## Technical Guidance
See full implementation details in: `/Volumes/Crucial X8/Code/Present-Agent2/docs/issues/CONVERSATIONAL_UX_ISSUES.md` (Issue #12)

## Dependencies
- Issue #1-11 (all features)

## Estimated Complexity
Small (1 day)
EOF
)"

echo "✓ Created Issue #12"
echo ""

echo "=========================================="
echo "✓ Successfully created all 12 issues!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  P0 (Critical): Issues #1-4"
echo "  P1 (High):     Issues #5-8, #10"
echo "  P2 (Medium):   Issues #9, #11, #12"
echo ""
echo "Estimated Total Time: 26-37 days"
echo "With parallelization: ~4-5 weeks"
echo ""
echo "Next Steps:"
echo "  1. Review issues on GitHub"
echo "  2. Assign to team members"
echo "  3. Start with Phase 1 (Issues #1-4)"
echo "  4. Track progress via GitHub Projects"
echo ""
