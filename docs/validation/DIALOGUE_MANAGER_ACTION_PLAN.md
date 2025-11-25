# DialogueManager UX Improvement Action Plan

**Date**: November 18, 2025
**Status**: READY FOR IMPLEMENTATION
**Timeline**: 2-4 weeks
**Owner**: Engineering Team

---

## Executive Summary

The DialogueManager backend is **production-ready** but needs a **UX layer** to meet success criteria. This document provides a detailed action plan to close the gap.

**Current State**:
- Backend: ✅ 9/10 (excellent)
- UX: ❌ 3/10 (poor)

**Target State**:
- Backend: ✅ 9/10 (maintain)
- UX: ✅ 8.5/10 (massive improvement)

**Time Required**: 2-4 weeks (depends on priority level)

---

## Priority 1: MUST FIX (Week 1-2)

### 1. Build DialoguePresenter Agent (2-3 days)

**Problem**: DialogueManager returns raw JSON, no natural language

**Current output**:
```json
{
  "mode": "ask",
  "questions": [
    { "id": "budget", "question": "What's your budget range?" }
  ]
}
```

**Expected output**:
```
I'd love to help you find the perfect gift! 🎁

To give you the best recommendations, I just need to know a bit more:

1. What's your budget range for this gift?
   💰 Under $25 | 💰 $25-$50 | 💰 $50-$100 | 💰 $100-$200 | 💰 Above $200

Let's find something they'll love!
```

#### Implementation Steps

**Step 1.1**: Create DialoguePresenter interface (0.5 days)

```typescript
// File: src/services/agents/dialogue-presenter.ts

import { BaseAgent } from './base';
import {
  DialogueManagerOutput,
  DialoguePresenterInput,
  DialoguePresenterOutput,
} from '../../types/dialogue';

export class DialoguePresenterAgent extends BaseAgent<
  DialoguePresenterInput,
  DialoguePresenterOutput
> {
  name = 'DialoguePresenter';

  async process(input: DialoguePresenterInput): Promise<DialoguePresenterOutput> {
    const { dialogueOutput, userContext, conversationHistory } = input;

    // Route to appropriate presenter based on mode
    switch (dialogueOutput.mode) {
      case 'ask':
        return this.presentQuestions(dialogueOutput, userContext);
      case 'recommend':
        return this.presentRecommendations(dialogueOutput, userContext);
      case 'hybrid':
        return this.presentHybrid(dialogueOutput, userContext);
    }
  }

  private presentQuestions(
    output: DialogueManagerOutput,
    context: UserContext
  ): DialoguePresenterOutput {
    // Generate conversational question prompt
    const greeting = this.getGreeting(context);
    const explanation = this.getExplanation(context);
    const formattedQuestions = this.formatQuestions(output.questions);
    const closing = this.getClosing(context);

    return {
      type: 'questions',
      naturalLanguage: `${greeting}\n\n${explanation}\n\n${formattedQuestions}\n\n${closing}`,
      questions: output.questions, // Include structured data for UI
    };
  }

  private getGreeting(context: UserContext): string {
    if (context.emotionalState === 'stressed') {
      return "Let's find something great, fast! ⚡";
    }
    if (context.emotionalState === 'excited') {
      return "I love helping find the perfect gift! 🎁";
    }
    return "I'd love to help you find the perfect gift! 🎁";
  }

  private getExplanation(context: UserContext): string {
    if (context.timePressure === 'urgent') {
      return "Just a couple quick questions to get you the best options:";
    }
    return "To give you the best recommendations, I just need to know a bit more:";
  }

  private formatQuestions(questions: ClarifyingQuestion[]): string {
    return questions.map((q, i) => {
      const answers = q.suggestedAnswers
        .map(a => this.formatAnswer(a, q.field))
        .join(' | ');

      return `${i + 1}. ${q.question}\n   ${answers}`;
    }).join('\n\n');
  }

  private formatAnswer(answer: SuggestedAnswer, field: string): string {
    // Add emoji based on field type
    const emoji = this.getEmojiForField(field);
    return `${emoji} ${answer.label}`;
  }

  private getEmojiForField(field: string): string {
    const emojiMap: Record<string, string> = {
      budget: '💰',
      interests: '🎯',
      relationship: '👥',
      occasion: '🎉',
      age: '👤',
    };
    return emojiMap[field] || '•';
  }

  private getClosing(context: UserContext): string {
    return "Let's find something they'll love!";
  }
}
```

**Estimated time**: 0.5 days (4 hours)

---

**Step 1.2**: Add conversation transitions (1 day)

```typescript
// File: src/services/agents/dialogue-presenter.ts (extend)

class DialoguePresenterAgent {
  private presentRecommendations(
    output: DialogueManagerOutput,
    context: UserContext,
    conversationHistory?: ConversationTurn[]
  ): DialoguePresenterOutput {
    const transition = this.getTransition(conversationHistory);
    const summary = this.getSummary(context);

    return {
      type: 'recommendations',
      naturalLanguage: `${transition}\n\n${summary}`,
      // Recommendations come from downstream agents
    };
  }

  private getTransition(history?: ConversationTurn[]): string {
    if (!history || history.length === 0) {
      return "Here are some great options for you:";
    }

    const lastTurn = history[history.length - 1];

    if (lastTurn.mode === 'ask') {
      return "Perfect! Now I can show you some thoughtful recommendations:";
    }

    if (lastTurn.userCorrected) {
      return "Ah, got it! Let me adjust those recommendations:";
    }

    return "Based on what you told me, here are some ideas:";
  }

  private getSummary(context: UserContext): string {
    const parts: string[] = [];

    if (context.budget) {
      parts.push(`Budget: $${context.budget.min}-${context.budget.max}`);
    }

    if (context.interests?.length > 0) {
      parts.push(`Interests: ${context.interests.join(', ')}`);
    }

    if (context.recipient?.relationshipType) {
      parts.push(`For your ${context.recipient.relationshipType}`);
    }

    if (context.occasion?.name) {
      parts.push(`Occasion: ${context.occasion.name}`);
    }

    if (parts.length > 0) {
      return `Looking for: ${parts.join(' • ')}`;
    }

    return "";
  }
}
```

**Estimated time**: 1 day

---

**Step 1.3**: Integrate with Orchestrator (0.5 days)

```typescript
// File: src/services/orchestrator.ts

async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
  // ... existing code

  // After DialogueManager decision
  const dialogueDecision = await this.dialogueAgent.process({
    listenerOutput,
    memoryOutput,
    conversationHistory,
  });

  // NEW: Present the dialogue decision
  const presented = await this.dialoguePresenterAgent.process({
    dialogueOutput: dialogueDecision,
    userContext: this.extractUserContext(listenerOutput),
    conversationHistory,
  });

  if (dialogueDecision.mode === 'ask') {
    return {
      mode: 'clarifying',
      naturalLanguage: presented.naturalLanguage,
      questions: presented.questions,
      // ...
    };
  }

  // Continue to recommendations
  // ...
}

private extractUserContext(listener: ListenerOutput): UserContext {
  return {
    budget: listener.budget,
    interests: listener.interests.map(i => i.interest || i),
    recipient: listener.recipient,
    occasion: listener.occasion,
    emotionalState: this.detectEmotionalState(listener),
    timePressure: this.detectTimePressure(listener),
    budgetSensitivity: this.detectBudgetSensitivity(listener),
  };
}

private detectEmotionalState(listener: ListenerOutput): EmotionalState {
  // Simple heuristics for MVP
  if (listener.userQuery.includes('urgent') || listener.userQuery.includes('asap')) {
    return 'stressed';
  }
  if (listener.userQuery.includes('excited') || listener.userQuery.includes('love')) {
    return 'excited';
  }
  return 'neutral';
}
```

**Estimated time**: 0.5 days

---

**Total for Task 1**: 2-3 days

**Success Metric**: "Feels human" score increases from 3/10 → 7/10

---

### 2. Add Escape Hatch (1 day)

**Problem**: Users forced through questions, no visible "skip" option

**Current UX**: Only questions, no alternative

**Expected UX**:
```
[Question 1]
[Question 2]
[Question 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏃 In a hurry? [Show me popular gifts now]
```

#### Implementation Steps

**Step 2.1**: Add escape hatch to question response (0.25 days)

```typescript
// File: src/services/agents/dialogue-presenter.ts

private formatQuestions(questions: ClarifyingQuestion[]): string {
  const questionText = questions.map((q, i) => {
    // ... existing formatting
  }).join('\n\n');

  const escapeHatch = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏃 In a hurry? [Show me popular gifts now]
  `;

  return `${questionText}\n${escapeHatch}`;
}
```

**Step 2.2**: Handle escape hatch in orchestrator (0.25 days)

```typescript
// File: src/services/orchestrator.ts

async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
  // Check if user selected escape hatch
  if (input.escapeHatch === true) {
    this.log('User selected escape hatch - showing popular picks');

    // Force recommend mode with popular/safe filters
    const popularFilters = {
      sortBy: 'popularity',
      safeChoices: true,
    };

    return this.proceedToRecommendations(input, popularFilters);
  }

  // ... rest of normal flow
}
```

**Step 2.3**: Add frontend UI (0.5 days)

```typescript
// File: frontend/components/clarifying-questions.tsx

function ClarifyingQuestionsBlock({ questions, onAnswer, onEscapeHatch }) {
  return (
    <div className="space-y-6">
      {/* Questions */}
      {questions.map(q => (
        <QuestionCard key={q.id} question={q} />
      ))}

      {/* Separator */}
      <div className="border-t border-muted my-6" />

      {/* Escape Hatch */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          🏃 In a hurry?
        </p>
        <Button
          variant="outline"
          onClick={onEscapeHatch}
          className="w-full"
        >
          Show me popular gifts now
        </Button>
      </div>

      {/* Answer Button */}
      <Button onClick={onAnswer} disabled={!hasAnswers}>
        Continue
      </Button>
    </div>
  );
}
```

**Estimated time**: 1 day total

**Success Metric**: Abandonment rate decreases from 15% → 5%

---

**Total for Priority 1**: 3-4 days

**Deliverables**:
1. ✅ DialoguePresenter agent with conversational wrappers
2. ✅ Conversation transitions between turns
3. ✅ Escape hatch for impatient users

**Expected Impact**:
- "Feels human": 3/10 → 7/10 (+4 points)
- Abandonment: 15% → 5% (-67%)
- Success rate: 55% → 65% (+18%)

---

## Priority 2: SHOULD FIX (Week 3)

### 3. Context-Aware Messaging (2 days)

**Problem**: No empathy or emotional awareness

**Expected UX**:
- Budget-conscious: "Great choices at every budget!"
- Time-pressured: "Let's find something quickly..."
- Excited: "I love finding the perfect gift too!"

#### Implementation Steps

**Step 3.1**: Detect user context (0.5 days)

```typescript
// File: src/lib/context-detection.ts

export interface UserContext {
  emotionalState?: 'excited' | 'stressed' | 'uncertain' | 'neutral';
  timePressure?: 'urgent' | 'moderate' | 'low';
  budgetSensitivity?: 'high' | 'medium' | 'low';
  confidenceLevel?: 'confident' | 'uncertain' | 'overwhelmed';
}

export function detectUserContext(
  listener: ListenerOutput,
  history?: ConversationTurn[]
): UserContext {
  return {
    emotionalState: detectEmotionalState(listener),
    timePressure: detectTimePressure(listener),
    budgetSensitivity: detectBudgetSensitivity(listener),
    confidenceLevel: detectConfidenceLevel(listener, history),
  };
}

function detectEmotionalState(listener: ListenerOutput): EmotionalState {
  const query = listener.userQuery.toLowerCase();

  // Stressed indicators
  if (query.match(/urgent|asap|quickly|hurry|need now|last[-\s]minute/)) {
    return 'stressed';
  }

  // Excited indicators
  if (query.match(/excited|love|can't wait|amazing|perfect/)) {
    return 'excited';
  }

  // Uncertain indicators
  if (query.match(/not sure|don't know|help|confused|unsure/)) {
    return 'uncertain';
  }

  return 'neutral';
}

function detectTimePressure(listener: ListenerOutput): TimePressure {
  const occasion = listener.occasion;

  if (occasion?.daysUntil !== undefined) {
    if (occasion.daysUntil <= 2) return 'urgent';
    if (occasion.daysUntil <= 7) return 'moderate';
  }

  const query = listener.userQuery.toLowerCase();
  if (query.match(/urgent|asap|tomorrow|today/)) return 'urgent';
  if (query.match(/soon|week|quickly/)) return 'moderate';

  return 'low';
}

function detectBudgetSensitivity(listener: ListenerOutput): BudgetSensitivity {
  const budget = listener.budget;

  if (!budget) return 'medium';

  // Low budget = high sensitivity
  if (budget.max <= 50) return 'high';
  if (budget.max <= 150) return 'medium';

  return 'low';
}
```

**Step 3.2**: Add context-aware templates (1 day)

```typescript
// File: src/services/agents/dialogue-presenter.ts

class DialoguePresenterAgent {
  private getGreeting(context: UserContext): string {
    if (context.timePressure === 'urgent') {
      return "Let's find something great, fast! ⚡";
    }

    if (context.emotionalState === 'stressed') {
      return "I know gift shopping can be stressful - I'm here to help! 😊";
    }

    if (context.emotionalState === 'excited') {
      return "I love helping find the perfect gift! 🎁";
    }

    if (context.emotionalState === 'uncertain') {
      return "No worries! I'll help you find something they'll love! 🎯";
    }

    return "I'd love to help you find the perfect gift! 🎁";
  }

  private getExplanation(context: UserContext): string {
    if (context.timePressure === 'urgent') {
      return "Just 1-2 quick questions to get you the best options:";
    }

    return "To give you the best recommendations, I just need to know a bit more:";
  }

  private getBudgetEncouragement(context: UserContext): string {
    if (context.budgetSensitivity === 'high') {
      return "💡 Great choices exist at every budget! Let's find something thoughtful:";
    }

    return "";
  }

  private formatQuestions(
    questions: ClarifyingQuestion[],
    context: UserContext
  ): string {
    const questionText = questions.map((q, i) => {
      // Special handling for budget question
      if (q.id === 'budget' && context.budgetSensitivity === 'high') {
        return `${i + 1}. ${q.question}\n   ${this.getBudgetEncouragement(context)}\n   ${this.formatAnswers(q)}`;
      }

      return `${i + 1}. ${q.question}\n   ${this.formatAnswers(q)}`;
    }).join('\n\n');

    return questionText;
  }
}
```

**Step 3.3**: Add encouragement messages (0.5 days)

```typescript
// File: src/lib/encouragement.ts

export function getEncouragementMessage(
  context: UserContext,
  stage: 'questions' | 'recommendations' | 'refinement'
): string {
  if (stage === 'questions') {
    if (context.budgetSensitivity === 'high') {
      return "💡 Remember: Thoughtful gifts come in all budgets!";
    }

    if (context.emotionalState === 'uncertain') {
      return "💡 Don't worry - I'll guide you through this!";
    }
  }

  if (stage === 'recommendations') {
    if (context.confidenceLevel === 'uncertain') {
      return "💡 Not quite right? You can refine these anytime!";
    }
  }

  return "";
}
```

**Estimated time**: 2 days total

**Success Metric**: User satisfaction increases, especially for budget-conscious and stressed users

---

### 4. "What I Learned" Summary (1 day)

**Problem**: Users don't see how their answers are used

**Expected UX**:
```
Based on what you told me:
✓ Budget: $50-100
✓ Interests: Gardening, cooking
✓ Relationship: Mom
✓ Occasion: Birthday

Here are my top picks:
[Recommendations]
```

#### Implementation Steps

**Step 4.1**: Generate summary (0.5 days)

```typescript
// File: src/services/agents/dialogue-presenter.ts

private generateSummary(context: UserContext): string {
  const items: string[] = [];

  if (context.budget) {
    items.push(`✓ Budget: $${context.budget.min}-${context.budget.max}`);
  }

  if (context.interests && context.interests.length > 0) {
    const interests = context.interests.slice(0, 3).join(', ');
    items.push(`✓ Interests: ${interests}`);
  }

  if (context.recipient?.relationshipType) {
    items.push(`✓ For your ${context.recipient.relationshipType}`);
  }

  if (context.occasion?.name) {
    const occasion = context.occasion.name.replace(/_/g, ' ');
    items.push(`✓ Occasion: ${occasion}`);
  }

  if (items.length === 0) {
    return "";
  }

  return `Based on what you told me:\n${items.join('\n')}\n`;
}

private presentRecommendations(
  output: DialogueManagerOutput,
  context: UserContext,
  history?: ConversationTurn[]
): DialoguePresenterOutput {
  const transition = this.getTransition(history);
  const summary = this.generateSummary(context);
  const intro = "Here are my top picks:";

  return {
    type: 'recommendations',
    naturalLanguage: `${transition}\n\n${summary}\n${intro}`,
  };
}
```

**Step 4.2**: Add to UI (0.5 days)

```typescript
// File: frontend/components/recommendation-list.tsx

function RecommendationList({ recommendations, summary }) {
  return (
    <div className="space-y-6">
      {/* Summary Box */}
      {summary && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-sm font-medium mb-2">Based on what you told me:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {summary.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations.map(rec => (
          <ProductCard key={rec.id} product={rec} />
        ))}
      </div>
    </div>
  );
}
```

**Estimated time**: 1 day total

**Success Metric**: User trust increases ("I see it's using my answers")

---

**Total for Priority 2**: 3-4 days

**Deliverables**:
1. ✅ Context-aware messaging (empathy)
2. ✅ "What I learned" summary display

**Expected Impact**:
- "Feels human": 7/10 → 8.5/10 (+1.5 points)
- Trust score: 6/10 → 8/10 (+33%)
- User satisfaction: Especially for budget-conscious and stressed users

---

## Testing Plan (Week 4)

### 1. Re-run Persona Tests (1 day)

**Objective**: Validate UX improvements with same personas

**Scenarios**:
1. Vague query (Sarah) - Score target: 8/10 (up from 7/10)
2. Detailed query (Mike) - Score target: 9/10 (maintain)
3. Medium query (Sarah) - Score target: 8/10 (up from 6/10)
4. Multi-turn (Lisa) - Score target: 9/10 (up from 6/10)
5. Ambiguous interests (Mike) - Score target: 7/10 (up from 5/10)

**Success criteria**:
- [ ] Average score ≥8.0/10 across all scenarios
- [ ] No regression on detailed queries (Mike scenario stays ≥9/10)
- [ ] "Feels human" metric ≥7.5/10

**Estimated time**: 1 day

---

### 2. User Testing (2-3 days)

**Objective**: Validate with 10 real users

**Recruitment**:
- 2 last-minute gifters (like Mike)
- 3 thoughtful planners (like Sarah)
- 2 budget-conscious (like Jessica)
- 3 other demographics

**Test protocol**:
1. Give user scenario: "Find a birthday gift for your mom, budget $50-100"
2. Observe interaction (screen recording + think-aloud)
3. Collect metrics:
   - Time to first recommendation
   - Number of questions answered
   - Abandonment (yes/no)
   - Satisfaction (1-10)
   - "Felt human" (1-10)
   - "Would use again" (yes/no)
4. Post-test interview (5 min)

**Success criteria**:
- [ ] 8/10 users complete flow (80% completion)
- [ ] Average satisfaction ≥7.5/10
- [ ] Average "felt human" ≥7.5/10
- [ ] 7/10 "would use again" (70% retention intent)

**Estimated time**: 2-3 days

---

### 3. A/B Test Setup (Optional, 1 day)

**If time permits**, set up A/B test infrastructure:

**Control**: DialogueManager disabled (current behavior)
**Treatment**: DialogueManager enabled (new conversational UX)

**Metrics to track**:
- Relevance score (human evaluation)
- Success rate (recommendations meet needs)
- Abandonment rate
- Time to first recommendation
- Question engagement rate
- Conversion rate (if applicable)

**Sample size**: 100 users per variant (200 total)
**Duration**: 1 week
**Success threshold**: Treatment ≥ Control on all primary metrics

**Estimated time**: 1 day setup, 1 week data collection

---

## Launch Checklist

### Pre-Launch (Day before)

- [ ] All Priority 1 fixes merged to `main`
- [ ] All Priority 2 fixes merged to `main` (if time permits)
- [ ] Persona tests passing (≥8/10 avg score)
- [ ] User testing complete (≥7.5/10 satisfaction)
- [ ] Feature flag configured (`ENABLE_DIALOGUE_MANAGER=true`)
- [ ] Analytics events instrumented
- [ ] Error monitoring configured
- [ ] Rollback plan documented
- [ ] Team briefed on launch

### Launch Day

- [ ] Enable feature flag for 10% of traffic
- [ ] Monitor for 2 hours:
  - Error rates ≤ 0.1%
  - P95 latency ≤ 10s
  - Question engagement ≥ 60%
  - Abandonment ≤ 20%
- [ ] If metrics look good, increase to 50%
- [ ] Monitor for 4 hours
- [ ] If still good, increase to 100%

### Post-Launch (First week)

- [ ] Daily metrics review
- [ ] User feedback monitoring
- [ ] Iterate on messaging based on feedback
- [ ] Prepare Week 2 improvements

---

## Success Metrics

### Must Achieve (Launch Blockers)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| "Feels Human" | 3.0/10 | ≥7.0/10 | 🔴 Must fix |
| Relevance | 6.5/10 | ≥7.0/10 | 🟡 Close |
| Abandonment | 15% | ≤15% | 🟡 Borderline |

### Should Achieve (Goals)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Success Rate | 55% | ≥70% | 🟡 Needs work |
| Interest Match | 72% | ≥80% | 🟡 Close |
| Engagement | 60% | ≥75% | 🟡 Needs work |

### Post-Launch Tracking

| Metric | Week 1 Target | Week 4 Target | Month 3 Target |
|--------|--------------|---------------|----------------|
| Relevance | 7.0/10 | 7.5/10 | 8.0/10 |
| Success Rate | 70% | 75% | 80% |
| "Feels Human" | 7.5/10 | 8.0/10 | 8.5/10 |
| Engagement | 75% | 80% | 85% |

---

## Timeline Summary

### Option A: Fast Track (2 weeks)

**Week 1**: Priority 1 only
- Days 1-3: Build DialoguePresenter
- Day 4: Add escape hatch
- Day 5: Testing

**Week 2**: Launch prep
- Days 1-2: User testing
- Day 3: Fixes based on feedback
- Days 4-5: Launch to production

**Risk**: Medium UX (7/10), missing empathy features

---

### Option B: Quality Track (4 weeks) ⭐ RECOMMENDED

**Week 1**: Priority 1
- Days 1-3: Build DialoguePresenter
- Day 4: Add escape hatch
- Day 5: Integration testing

**Week 2**: Priority 2
- Days 1-2: Context-aware messaging
- Day 3: "What I learned" summary
- Days 4-5: Polish and refinement

**Week 3**: Testing
- Day 1: Persona testing
- Days 2-4: User testing (10 users)
- Day 5: Iteration based on feedback

**Week 4**: Launch
- Days 1-2: Final polish
- Day 3: Staged rollout (10% → 50% → 100%)
- Days 4-5: Monitoring and iteration

**Risk**: Low, high confidence in achieving all targets

---

## Resource Requirements

### Engineering

**Priority 1** (2 weeks):
- 1 senior engineer full-time (DialoguePresenter, integration)
- 1 frontend engineer part-time (50%, escape hatch UI)
- **Total**: 1.5 FTE-weeks

**Priority 2** (1 week):
- Same senior engineer (context-aware messaging, summary)
- **Total**: 1 FTE-week

**Testing** (1 week):
- QA engineer (persona testing, user testing)
- **Total**: 1 FTE-week

**Total Engineering**: 3.5 FTE-weeks (one senior engineer for 3 weeks + QA for 1 week)

### Design

**UI/UX**:
- Review conversational messaging (0.5 days)
- Design escape hatch UI (0.5 days)
- Design summary box (0.5 days)
- **Total**: 1.5 days

### Product

**Product Manager**:
- Review implementation (0.5 days)
- User testing facilitation (2 days)
- Metrics definition and tracking (0.5 days)
- **Total**: 3 days

---

## Risk Mitigation

### Risk 1: Users don't engage with questions (Abandonment stays high)

**Mitigation**:
- Feature flag allows quick disable
- Escape hatch provides alternative
- A/B test validates before full rollout

**Contingency**: If abandonment >20%, pause rollout and iterate

---

### Risk 2: "Feels human" score doesn't improve enough

**Mitigation**:
- User testing validates messaging before launch
- Iterative approach allows tweaking
- Multiple message templates to A/B test

**Contingency**: Add Priority 3 fixes (question explanations, smart ordering)

---

### Risk 3: Performance degradation

**Mitigation**:
- DialoguePresenter is fast (no LLM calls)
- Template-based approach is scalable
- Performance monitoring in place

**Contingency**: Cache common question templates, optimize message generation

---

### Risk 4: Implementation takes longer than estimated

**Mitigation**:
- Phased approach (can ship P1 only if needed)
- Clear task breakdown with time estimates
- Buffer time built into Week 4

**Contingency**: Ship Priority 1 only, iterate on Priority 2 post-launch

---

## Rollback Plan

**If metrics worsen after launch**:

1. **Immediate** (within 1 hour):
   - Disable feature flag (`ENABLE_DIALOGUE_MANAGER=false`)
   - System reverts to baseline behavior
   - No data loss (conversation history still persists)

2. **Short-term** (1-2 days):
   - Analyze what went wrong (logs, user feedback)
   - Identify specific issue (messaging, UX, performance)
   - Create targeted fix

3. **Long-term** (1 week):
   - Re-implement fix
   - Re-test with smaller user group (10%)
   - Gradual re-rollout if successful

**Rollback triggers**:
- Error rate >1%
- Abandonment >25%
- User satisfaction <6/10
- Performance degradation >2x

---

## Next Steps

1. **Today**: Review this action plan with engineering team
2. **Tomorrow**: Assign tasks, set up project board
3. **Day 3**: Start implementation (Priority 1, Task 1.1)
4. **Week 1 end**: Priority 1 complete, internal demo
5. **Week 2**: Priority 2 implementation
6. **Week 3**: Testing phase
7. **Week 4**: Launch! 🚀

---

**Prepared by**: User Simulator Agent
**Date**: November 18, 2025
**Status**: READY FOR IMPLEMENTATION
**Confidence**: High (detailed breakdown, clear tasks, realistic estimates)

**Questions?** Review the full UX Validation Report for context and rationale.
