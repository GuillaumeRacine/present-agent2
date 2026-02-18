# GitHub Issues: Conversational UX Improvement Feature

**Feature Spec**: `/Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md`
**Created**: 2025-11-18
**Total Issues**: 12

---

## Issue #1: Core DialogueManager Agent Implementation

**Title**: Implement DialogueManager agent with confidence-based routing

**Labels**: `P0`, `size:L`, `agent`, `core-feature`

**Description**:
Create the DialogueManager agent that sits between the Listener and downstream agents, making intelligent decisions about when to ask clarifying questions versus proceeding to recommendations.

**Context**:
Currently, the system always returns recommendations even when confidence is low (0.3 or less) and critical context is missing. This results in poor relevance (4.3/10 average) and 33% success rate. The DialogueManager will be the "dialogue gate" that decides: "Should we ask questions or show products?"

**Acceptance Criteria**:
- [ ] Create `DialogueManagerAgent` class extending `BaseAgent<DialogueManagerInput, DialogueManagerOutput>` at `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/dialogue-manager.ts`
- [ ] Implement `assessContext()` method that evaluates:
  - Overall confidence from ListenerOutput
  - Critical fields coverage (relationshipType, interests, budget, occasion)
  - Count of critical fields present vs missing
  - High-impact ambiguities detection
- [ ] Implement `decide()` method with confidence-based routing:
  - **≥ 0.7 confidence + ≥3 critical fields** → `mode: 'recommend'`
  - **0.5-0.7 confidence + ≥2 critical fields** → `mode: 'hybrid'`
  - **< 0.5 confidence OR <2 critical fields** → `mode: 'ask'`
- [ ] Return structured `DialogueManagerOutput` with mode, reasoning, and confidence assessment
- [ ] Agent processes in < 200ms (excluding any LLM calls)
- [ ] Unit tests for all decision branches (minimum 90% coverage)

**Technical Guidance**:
```typescript
// File: src/services/agents/dialogue-manager.ts
export interface DialogueManagerInput {
  listenerOutput: ListenerOutput;
  memoryOutput?: MemoryOutput;
  conversationHistory?: ConversationTurn[];
}

export interface DialogueManagerOutput {
  mode: 'ask' | 'recommend' | 'hybrid';
  questions?: ClarifyingQuestion[];
  proceedWithRecommendations: boolean;
  questionsForRefinement?: ClarifyingQuestion[];
  reasoning: string;
  confidenceAssessment: {
    overallConfidence: number;
    criticalFieldsCovered: string[];
    criticalFieldsMissing: string[];
    highImpactAmbiguities: string[];
  };
}

class DialogueManagerAgent extends BaseAgent<DialogueManagerInput, DialogueManagerOutput> {
  async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
    // 1. Assess current context quality
    const assessment = this.assessContext(input.listenerOutput);

    // 2. Make routing decision
    return this.decide(assessment);
  }

  private assessContext(listener: ListenerOutput): ConfidenceAssessment {
    // Check critical fields: relationshipType, interests, budget, occasion
    // Identify high-impact ambiguities
    // Return structured assessment
  }

  private decide(assessment: ConfidenceAssessment): DialogueManagerOutput {
    // Apply confidence thresholds from spec (Section 3.2)
    // Return mode with reasoning
  }
}
```

**Dependencies**: None (foundational)

**Testing Requirements**:
- Test confidence threshold boundaries (0.5, 0.7)
- Test critical field counting (0-4 fields)
- Test decision tree for all combinations
- Test edge cases (undefined fields, null confidence)

**Success Metrics**:
- Correctly routes high-confidence queries (≥0.7) to recommend mode
- Correctly routes low-confidence queries (<0.5) to ask mode
- Never routes with <2 critical fields to recommend mode
- Executes in <200ms per call

**Estimated Complexity**: Large (3-4 days)
- Agent structure: 4 hours
- Decision logic: 8 hours
- Unit tests: 8 hours
- Integration: 4 hours

---

## Issue #2: Question Generation System

**Title**: Build question generation engine for all gap types

**Labels**: `P0`, `size:XL`, `agent`, `core-feature`

**Description**:
Implement comprehensive question generation that creates targeted clarifying questions based on missing critical fields, vague interests, ambiguities, and conflicting intent signals.

**Context**:
The Listener already detects ambiguities and calculates confidence, but we never act on this intelligence. This system will generate 1-3 prioritized questions with suggested answers to gather missing context efficiently.

**Acceptance Criteria**:
- [ ] Implement `generateQuestions()` method in DialogueManager that creates questions for:
  - **Essential gaps**: Missing budget, missing interests, missing relationship type
  - **Refinement needs**: Vague interests ("music", "sports", "art")
  - **Ambiguity resolution**: Leverage existing `listener.ambiguities` array
  - **Intent conflicts**: Detect conflicting intentSignals (safe+unique, practical+sentimental)
  - **Constraint confirmation**: Life context implications (small apartment, etc.)
- [ ] Each question includes:
  - Unique ID
  - Type classification (essential, refinement, ambiguity, intent, constraint)
  - Natural language question text
  - 3-5 suggested answers with labels and values
  - Priority ranking (1=highest)
  - Estimated impact on confidence (0.0-1.0)
- [ ] Implement `prioritizeQuestions()` that sorts by:
  - Priority (budget=1, relationshipType=2, interests=3, intent=4, occasion=5)
  - Confidence impact score
- [ ] Return maximum 3 questions per turn
- [ ] Questions feel natural and conversational (not robotic)
- [ ] Unit tests for all question types

**Technical Guidance**:
```typescript
export interface ClarifyingQuestion {
  id: string;
  type: 'essential' | 'refinement' | 'ambiguity' | 'intent' | 'constraint';
  field: string;
  question: string;
  suggestedAnswers: Array<{
    label: string;           // "Under $50"
    value: any;              // { min: 0, max: 50 }
    description?: string;    // Optional explanation
  }>;
  priority: number;          // 1 = highest
  impactOnConfidence: number; // 0.0 - 1.0
}

private generateQuestions(
  listener: ListenerOutput,
  assessment: ConfidenceAssessment
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  // Budget question (if missing)
  if (!listener.budget || listener.budget.max === 0) {
    questions.push({
      id: 'budget',
      type: 'essential',
      field: 'budget',
      question: "What's your budget range for this gift?",
      suggestedAnswers: [
        { label: "Under $25", value: { min: 0, max: 25 } },
        { label: "$25-$50", value: { min: 25, max: 50 } },
        { label: "$50-$100", value: { min: 50, max: 100 } },
        { label: "$100-$200", value: { min: 100, max: 200 } },
        { label: "Above $200", value: { min: 200, max: 10000 } }
      ],
      priority: 1,
      impactOnConfidence: 0.15
    });
  }

  // Interest refinement (if vague)
  // Intent clarification (if conflicting)
  // Use detected ambiguities
  // etc.

  return questions;
}
```

**Question Templates** (from spec Section 3.3):

**Essential - Budget**:
- Question: "What's your budget range for this gift?"
- Answers: ["Under $50", "$50-$100", "$100-$200", "Above $200"]

**Essential - Interests** (if missing):
- Question: "What are they passionate about or interested in?"
- Answers: ["Food & cooking", "Outdoor & nature", "Arts & crafts", "Tech & gaming", "Sports & fitness", "Music & entertainment"]

**Refinement - Music**:
- Question: "You mentioned music - can you be more specific?"
- Answers: ["Plays an instrument", "Listens/collects (vinyl, merch)", "Makes music (production)", "Multiple/All of the above"]

**Intent - Conflicts**:
- Question: "I see you want both practical and unique. Which is more important?"
- Answers: ["Practical first, uniqueness is a bonus", "Unique first, but should be useful", "Both equally important"]

**Dependencies**: Issue #1 (DialogueManager core)

**Testing Requirements**:
- Test question generation for each gap type
- Test prioritization algorithm
- Test question limit (max 3)
- Test no duplicate questions in single turn
- Validate question phrasing naturalness

**Success Metrics**:
- Generates appropriate questions for all identified gaps
- Questions prioritized correctly (budget first, etc.)
- Never generates >3 questions per turn
- Questions include 3-5 answer options each

**Estimated Complexity**: Extra Large (5-6 days)
- Budget question: 2 hours
- Interest questions: 6 hours
- Refinement logic: 8 hours
- Intent conflict detection: 6 hours
- Ambiguity integration: 6 hours
- Prioritization: 4 hours
- Unit tests: 12 hours

---

## Issue #3: Multi-Turn Conversation State Management

**Title**: Implement conversation history tracking to prevent duplicate questions

**Labels**: `P0`, `size:M`, `database`, `core-feature`

**Description**:
Create a conversation state management system that tracks asked questions, received answers, and conversation turns across a session to enable intelligent multi-turn dialogue without repetition.

**Context**:
Users will engage in 1-3 rounds of Q&A before receiving recommendations. We must track what we've asked to avoid annoying repetition and to merge clarifications with the original query context.

**Acceptance Criteria**:
- [ ] Create `ConversationTurn` interface:
  - turnNumber, userInput, listenerOutput, dialogueDecision
  - askedQuestions (array of question field IDs)
  - receivedAnswers (map of questionId → answer value)
  - recommendationsShown (boolean)
  - timestamp
- [ ] Implement `getAskedQuestions(conversationHistory)` method in DialogueManager
- [ ] Filter out already-asked questions before generating new questions
- [ ] Implement maximum turn limit (3 rounds) with forced recommendation mode after
- [ ] Store conversation turns in Neo4j:
  - `CREATE (turn:ConversationTurn)` node
  - Relationship `(turn)-[:PART_OF]->(session:Session)`
  - Relationship `(turn)-[:FOLLOWS]->(previousTurn:ConversationTurn)`
- [ ] Implement session retrieval by sessionId
- [ ] Add conversation turn to orchestrator context
- [ ] Unit tests for deduplication logic

**Technical Guidance**:
```typescript
// File: src/types/conversation.ts
export interface ConversationTurn {
  id: string;
  sessionId: string;
  turnNumber: number;
  timestamp: Date;
  userInput: string;
  listenerOutput: ListenerOutput;
  dialogueDecision: DialogueManagerOutput;
  askedQuestions: string[];  // ['budget', 'interests']
  receivedAnswers: Record<string, any>;  // { budget: { min: 50, max: 100 } }
  recommendationsShown: boolean;
  confidence: number;
}

// In DialogueManager
private getAskedQuestions(history?: ConversationTurn[]): string[] {
  if (!history || history.length === 0) return [];
  return history.flatMap(turn => turn.askedQuestions);
}

async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
  const { conversationHistory } = input;

  // Check if we've exceeded max turns
  if (conversationHistory && conversationHistory.length >= 3) {
    return {
      mode: 'recommend',
      proceedWithRecommendations: true,
      reasoning: 'Maximum question rounds reached - showing best recommendations'
    };
  }

  // Get already-asked questions
  const askedBefore = this.getAskedQuestions(conversationHistory);

  // Filter new questions
  const newQuestions = potentialQuestions.filter(q =>
    !askedBefore.includes(q.field)
  );

  // ... rest of logic
}
```

**Neo4j Schema**:
```cypher
// Create conversation turn
CREATE (turn:ConversationTurn {
  id: $turnId,
  sessionId: $sessionId,
  turnNumber: $turnNumber,
  timestamp: datetime(),
  userInput: $userInput,
  askedQuestions: $askedQuestions,
  confidence: $confidence,
  mode: $mode,
  recommendationsShown: $recommendationsShown
})

// Link to session
MATCH (session:Session {id: $sessionId})
CREATE (turn)-[:PART_OF]->(session)

// Link to previous turn (if exists)
OPTIONAL MATCH (prev:ConversationTurn {sessionId: $sessionId, turnNumber: $turnNumber - 1})
FOREACH (p IN CASE WHEN prev IS NOT NULL THEN [prev] ELSE [] END |
  CREATE (turn)-[:FOLLOWS]->(p)
)

// Store answers
UNWIND $answers as answer
CREATE (turn)-[:ANSWERED {
  questionId: answer.questionId,
  value: answer.value,
  timestamp: datetime()
}]->(turn)
```

**Dependencies**: Issue #1, #2

**Testing Requirements**:
- Test deduplication (don't ask budget twice)
- Test max turns enforcement (3 rounds → recommend)
- Test conversation retrieval by sessionId
- Test turn ordering and sequencing
- Test answer storage and retrieval

**Success Metrics**:
- Never asks same question twice in session
- Correctly enforces 3-turn maximum
- Retrieves conversation history in <100ms
- Stores turn data successfully in Neo4j

**Estimated Complexity**: Medium (2-3 days)
- Data models: 4 hours
- Neo4j schema: 4 hours
- Deduplication logic: 4 hours
- Session management: 4 hours
- Unit tests: 8 hours

---

## Issue #4: Orchestrator Integration for Dialogue Branching

**Title**: Integrate DialogueManager into orchestrator with conditional flow

**Labels**: `P0`, `size:M`, `orchestrator`, `core-feature`

**Description**:
Modify the orchestrator to insert DialogueManager between Listener and downstream agents, implementing conditional branching based on dialogue mode (ask vs recommend vs hybrid).

**Context**:
Currently orchestrator runs: Listener → Memory → Curator → Explorer → Validator → Presenter in sequence. We need to add DialogueManager after Memory and branch based on its decision.

**Acceptance Criteria**:
- [ ] Modify `/Volumes/Crucial X8/Code/Present-Agent2/src/services/orchestrator.ts` to:
  - Instantiate DialogueManager agent
  - Call DialogueManager after Memory agent
  - Pass listenerOutput, memoryOutput, conversationHistory
- [ ] Implement conditional branching:
  - **If mode='ask'**: Return questions early, skip downstream agents
  - **If mode='hybrid'**: Continue to recommendations AND attach refinement questions
  - **If mode='recommend'**: Continue normal flow
- [ ] Update `OrchestratorOutput` type to support new modes:
  - Add `mode: 'clarifying' | 'recommendations_with_refinement' | 'recommendations'`
  - Add `questions?: ClarifyingQuestion[]`
  - Add `refinementQuestions?: ClarifyingQuestion[]`
  - Add `partialContext?: ListenerOutput`
  - Add `reasoning?: string`
- [ ] Retrieve conversation history for current sessionId
- [ ] Store new conversation turn after each execution
- [ ] Maintain backward compatibility (existing recommendation flow unchanged)
- [ ] Integration tests for all three modes

**Technical Guidance**:
```typescript
// File: src/services/orchestrator.ts

export interface OrchestratorOutput {
  mode: 'clarifying' | 'recommendations_with_refinement' | 'recommendations';

  // When mode = 'clarifying'
  questions?: ClarifyingQuestion[];
  partialContext?: ListenerOutput;
  reasoning?: string;

  // When mode = 'recommendations' or 'recommendations_with_refinement'
  recommendations?: RecommendationResult[];
  intro?: string;

  // When mode = 'recommendations_with_refinement'
  refinementQuestions?: ClarifyingQuestion[];

  // Common
  sessionId: string;
  timestamp: Date;
}

async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const startTime = Date.now();

  // Step 1: Extract context (existing)
  const listenerOutput = await this.listenerAgent.process({
    userQuery: input.userQuery,
    userId: input.userId
  });

  // Step 2: Recall memory (existing)
  const memoryOutput = await this.memoryAgent.process({
    userId: input.userId,
    currentContext: listenerOutput
  });

  // NEW Step 3: Retrieve conversation history
  const conversationHistory = await this.getConversationHistory(input.sessionId);

  // NEW Step 4: Dialogue Management Decision
  const dialogueDecision = await this.dialogueAgent.process({
    listenerOutput,
    memoryOutput,
    conversationHistory
  });

  // NEW Step 5: Branch based on decision
  if (dialogueDecision.mode === 'ask') {
    // Store turn and return questions
    await this.storeConversationTurn(input.sessionId, {
      userInput: input.userQuery,
      listenerOutput,
      dialogueDecision,
      askedQuestions: dialogueDecision.questions!.map(q => q.field),
      recommendationsShown: false
    });

    return {
      mode: 'clarifying',
      questions: dialogueDecision.questions,
      partialContext: listenerOutput,
      reasoning: dialogueDecision.reasoning,
      sessionId: input.sessionId,
      timestamp: new Date()
    };
  }

  if (dialogueDecision.mode === 'hybrid') {
    // Continue to recommendations AND prepare refinement questions
    const recommendations = await this.continueRecommendationPipeline(
      memoryOutput,
      listenerOutput
    );

    await this.storeConversationTurn(input.sessionId, {
      userInput: input.userQuery,
      listenerOutput,
      dialogueDecision,
      askedQuestions: [],
      recommendationsShown: true
    });

    return {
      mode: 'recommendations_with_refinement',
      recommendations,
      refinementQuestions: dialogueDecision.questionsForRefinement,
      intro: "Here are some ideas based on what you've told me...",
      sessionId: input.sessionId,
      timestamp: new Date()
    };
  }

  // Normal flow: proceed to recommendations
  const recommendations = await this.continueRecommendationPipeline(
    memoryOutput,
    listenerOutput
  );

  await this.storeConversationTurn(input.sessionId, {
    userInput: input.userQuery,
    listenerOutput,
    dialogueDecision,
    askedQuestions: [],
    recommendationsShown: true
  });

  return {
    mode: 'recommendations',
    recommendations,
    intro: "I've found some great options for you...",
    sessionId: input.sessionId,
    timestamp: new Date()
  };
}

private async continueRecommendationPipeline(
  memoryOutput: MemoryOutput,
  listenerOutput: ListenerOutput
): Promise<RecommendationResult[]> {
  // Existing pipeline: Curator → Explorer → Validator → Presenter
  const curatorOutput = await this.curatorAgent.process({ ... });
  // ... rest of existing flow
  return presenterOutput.recommendations;
}
```

**Dependencies**: Issue #1, #2, #3

**Testing Requirements**:
- Integration test: Low confidence query → ask mode
- Integration test: High confidence query → recommend mode
- Integration test: Medium confidence query → hybrid mode
- Integration test: Conversation history retrieval
- Integration test: Turn storage
- Regression test: Existing recommendation flow unchanged

**Success Metrics**:
- Successfully branches based on dialogue mode
- Stores conversation turns correctly
- Maintains existing performance for high-confidence queries
- No breaking changes to existing API contracts

**Estimated Complexity**: Medium (2-3 days)
- Orchestrator modification: 6 hours
- Branching logic: 4 hours
- Conversation history integration: 4 hours
- Turn storage: 4 hours
- Integration tests: 8 hours

---

## Issue #5: Answer Merging and Context Enrichment

**Title**: Build system to merge clarification answers with original query

**Labels**: `P1`, `size:M`, `core-feature`

**Description**:
When users answer clarifying questions, merge those answers with the original query context and re-run the Listener to extract enriched context for better recommendations.

**Context**:
After asking "What's your budget?" and user selects "$50-$100", we need to integrate this into the context as if user had said "gift for dad, budget $50-100" from the start. This enriched context should flow through the normal recommendation pipeline.

**Acceptance Criteria**:
- [ ] Implement `mergeWithClarifications()` function that:
  - Takes original query, clarification answers, and sessionId
  - Retrieves previous conversation turns
  - Builds enriched query incorporating answers
  - Returns enhanced context for Listener re-processing
- [ ] Handle different answer types:
  - Budget answers → update `budget` field
  - Interest answers → add to `interests` array
  - Intent answers → update `intentSignals`
  - Refinement answers → replace vague interests with specific ones
- [ ] Re-run Listener with enriched context
- [ ] Verify confidence increases after incorporating answers
- [ ] Track confidence improvement per answer (analytics)
- [ ] Unit tests for all answer types

**Technical Guidance**:
```typescript
// File: src/services/conversation/answer-merger.ts

export interface ClarificationAnswers {
  [questionId: string]: any;
  // e.g., { budget: { min: 50, max: 100 }, interests: "cooking" }
}

export async function mergeWithClarifications(
  originalQuery: string,
  answers: ClarificationAnswers,
  sessionId: string
): Promise<EnrichedContext> {
  // 1. Retrieve conversation history
  const history = await getConversationHistory(sessionId);
  const previousContext = history[history.length - 1]?.listenerOutput;

  if (!previousContext) {
    throw new Error('No previous context found for session');
  }

  // 2. Build enriched context
  const enrichedContext = { ...previousContext };

  // Merge budget answer
  if (answers.budget) {
    enrichedContext.budget = {
      min: answers.budget.min,
      max: answers.budget.max,
      currency: 'USD',
      confidence: 1.0  // User explicitly specified
    };
  }

  // Merge interest answers
  if (answers.interests) {
    const newInterest = {
      interest: answers.interests,
      level: 'high',  // User explicitly mentioned
      source: 'clarification'
    };
    enrichedContext.enhancedInterests = [
      ...(enrichedContext.enhancedInterests || []),
      newInterest
    ];
  }

  // Merge intent answers
  if (answers.intent_priority) {
    enrichedContext.intentSignals = {
      ...enrichedContext.intentSignals,
      primary: answers.intent_priority
    };
  }

  // 3. Build natural language query for re-extraction
  const enrichedQuery = buildNaturalQuery(originalQuery, answers);

  // 4. Calculate confidence boost
  const confidenceBoost = calculateConfidenceBoost(answers);

  return {
    enrichedContext,
    enrichedQuery,
    confidenceBoost,
    clarificationsApplied: Object.keys(answers)
  };
}

function buildNaturalQuery(original: string, answers: ClarificationAnswers): string {
  let query = original;

  if (answers.budget) {
    query += `, budget $${answers.budget.min}-$${answers.budget.max}`;
  }

  if (answers.interests) {
    query += `, interested in ${answers.interests}`;
  }

  // etc.

  return query;
}

function calculateConfidenceBoost(answers: ClarificationAnswers): number {
  // Each essential answer adds ~0.15 confidence
  // Each refinement adds ~0.10 confidence
  let boost = 0;

  if (answers.budget) boost += 0.15;
  if (answers.interests) boost += 0.20;
  if (answers.occasion) boost += 0.10;

  return Math.min(boost, 0.5);  // Cap at +0.5
}
```

**Usage in API/Orchestrator**:
```typescript
// When user submits answers to questions
if (input.clarifications) {
  const enriched = await mergeWithClarifications(
    input.originalQuery,
    input.clarifications,
    input.sessionId
  );

  // Re-run Listener with enriched query
  const listenerOutput = await this.listenerAgent.process({
    userQuery: enriched.enrichedQuery,
    userId: input.userId,
    previousContext: enriched.enrichedContext
  });

  // Continue with enriched context
  // ...
}
```

**Dependencies**: Issue #3

**Testing Requirements**:
- Test budget answer merging
- Test interest answer merging
- Test intent answer merging
- Test multiple answers in single turn
- Test confidence improvement calculation
- Test query reconstruction naturalness

**Success Metrics**:
- Merged answers correctly populate ListenerOutput fields
- Confidence increases by expected amount (0.1-0.2 per answer)
- Re-extraction succeeds 100% of time
- Enriched context produces better recommendations

**Estimated Complexity**: Medium (2-3 days)
- Answer merging logic: 6 hours
- Query reconstruction: 4 hours
- Confidence boost calculation: 3 hours
- Listener integration: 4 hours
- Unit tests: 8 hours

---

## Issue #6: Frontend Question UI Component

**Title**: Build ClarifyingQuestionBlock component for rendering questions

**Labels**: `P1`, `size:L`, `frontend`, `ui`

**Description**:
Create a React component that renders clarifying questions with selectable answer buttons, handles multi-question display, and submits answers back to the backend.

**Context**:
Users need an intuitive UI to answer 1-3 questions quickly. Questions should feel conversational and easy to interact with, especially on mobile. Suggested answers should be tappable/clickable buttons, not text inputs.

**Acceptance Criteria**:
- [ ] Create `ClarifyingQuestionBlock` component at `/Volumes/Crucial X8/Code/Present-Agent2/frontend/components/clarifying-question-block.tsx`
- [ ] Display 1-3 questions in a single block
- [ ] Render suggested answers as selectable buttons
- [ ] Highlight selected answer (visual state)
- [ ] Allow one selection per question (radio button behavior)
- [ ] Show "Continue" button (disabled until at least 1 answer selected)
- [ ] Optional: "Skip questions - show me anything" escape hatch
- [ ] Handle answer submission with callback
- [ ] Responsive design (works on mobile and desktop)
- [ ] Accessible (keyboard navigation, screen reader friendly)
- [ ] Include question priority indicator (essential vs optional)

**Technical Guidance**:
```typescript
// File: frontend/components/clarifying-question-block.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ClarifyingQuestion {
  id: string;
  type: 'essential' | 'refinement' | 'ambiguity' | 'intent' | 'constraint';
  field: string;
  question: string;
  suggestedAnswers: Array<{
    label: string;
    value: any;
    description?: string;
  }>;
  priority: number;
}

interface ClarifyingQuestionBlockProps {
  questions: ClarifyingQuestion[];
  onAnswer: (answers: Record<string, any>) => void;
  onSkip?: () => void;
  className?: string;
}

export function ClarifyingQuestionBlock({
  questions,
  onAnswer,
  onSkip,
  className
}: ClarifyingQuestionBlockProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleAnswerSelect = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = () => {
    onAnswer(answers);
  };

  const essentialQuestions = questions.filter(q => q.type === 'essential');
  const optionalQuestions = questions.filter(q => q.type !== 'essential');
  const hasAnsweredEssential = essentialQuestions.every(q => answers[q.id] !== undefined);

  return (
    <div className={cn("space-y-6 mt-4 p-6 bg-muted/50 rounded-lg border", className)}>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Help me find the perfect gift:
        </p>
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-sm font-semibold text-foreground">
              {idx + 1}.
            </span>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">
                {q.question}
                {q.type === 'essential' && (
                  <span className="ml-2 text-xs text-destructive">*</span>
                )}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 ml-6">
            {q.suggestedAnswers.map(answer => (
              <button
                key={answer.label}
                onClick={() => handleAnswerSelect(q.id, answer.value)}
                className={cn(
                  "px-4 py-2 text-sm rounded-md border transition-all",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary",
                  answers[q.id] === answer.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background hover:bg-muted border-border"
                )}
                aria-pressed={answers[q.id] === answer.value}
              >
                {answer.label}
              </button>
            ))}
          </div>

          {answers[q.id] && (
            <p className="text-xs text-muted-foreground ml-6">
              Selected: {q.suggestedAnswers.find(a => a.value === answers[q.id])?.label}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={!hasAnsweredEssential}
          className="flex-1"
        >
          Continue
          {!hasAnsweredEssential && (
            <span className="ml-2 text-xs opacity-70">
              (answer required questions)
            </span>
          )}
        </Button>

        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-sm text-muted-foreground"
          >
            Skip - show me anything
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Required for best results
      </p>
    </div>
  );
}
```

**Styling Requirements**:
- Use existing shadcn/ui components (Button, etc.)
- Match current chat interface design
- Mobile-first responsive design
- Clear visual feedback on selection
- Accessible color contrast
- Smooth transitions

**Dependencies**: Issue #2 (question format)

**Testing Requirements**:
- Visual test: Renders 1 question correctly
- Visual test: Renders 3 questions correctly
- Interaction test: Can select/deselect answers
- Interaction test: Continue button enables after selection
- Interaction test: Skip button works
- Accessibility test: Keyboard navigation
- Accessibility test: Screen reader announces questions

**Success Metrics**:
- Renders in <100ms
- Mobile-friendly tap targets (min 44px)
- Keyboard accessible (all WCAG 2.1 AA criteria)
- Users can answer 3 questions in <15 seconds

**Estimated Complexity**: Large (3-4 days)
- Component structure: 6 hours
- Styling: 8 hours
- State management: 4 hours
- Accessibility: 6 hours
- Mobile responsive: 4 hours
- Testing: 6 hours

---

## Issue #7: Frontend Chat Integration for Questions

**Title**: Update chat interface to handle question/answer flow

**Labels**: `P1`, `size:M`, `frontend`, `integration`

**Description**:
Modify the main chat interface (`page.tsx`) to handle rendering questions, collecting answers, and submitting enriched follow-up queries based on user responses.

**Context**:
Currently the chat interface only renders recommendations. We need to extend it to support three message types: normal recommendations, questions, and hybrid (recommendations + refinement questions).

**Acceptance Criteria**:
- [ ] Update `Message` interface to support:
  - `questions?: ClarifyingQuestion[]`
  - `refinementQuestions?: ClarifyingQuestion[]`
  - `messageType: 'user' | 'assistant' | 'questions' | 'recommendations'`
- [ ] Render `ClarifyingQuestionBlock` when message contains questions
- [ ] Handle question answer submission:
  - Construct enriched query with answers
  - Submit to API with clarifications payload
  - Show loading state while processing
- [ ] Handle hybrid mode (recommendations + refinement questions):
  - Show recommendations first
  - Show refinement questions below
  - Make refinement optional (don't block)
- [ ] Track conversation turns in frontend state
- [ ] Show conversation progress (e.g., "Question 1 of 3")
- [ ] Integration with existing recommendation display
- [ ] Maintain scroll position and focus

**Technical Guidance**:
```typescript
// File: frontend/app/page.tsx

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;

  // New fields
  messageType?: 'questions' | 'recommendations' | 'hybrid';
  questions?: ClarifyingQuestion[];
  recommendations?: Recommendation[];
  refinementQuestions?: ClarifyingQuestion[];
  reasoning?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationTurns, setConversationTurns] = useState<number>(0);
  const [sessionId] = useState(() => generateSessionId());

  const handleQuestionResponse = async (answers: Record<string, any>) => {
    // Get original query
    const originalQuery = messages.find(m => m.role === 'user')?.content || '';

    // Build enriched query
    const enrichedQuery = buildEnrichedQueryString(originalQuery, answers);

    // Add user's answer summary to chat
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: formatAnswersSummary(answers),
        timestamp: new Date()
      }
    ]);

    // Submit with clarifications
    await handleSubmit(enrichedQuery, {
      sessionId,
      clarifications: answers,
      originalQuery
    });

    setConversationTurns(prev => prev + 1);
  };

  const handleSubmit = async (
    query: string,
    options?: {
      sessionId: string;
      clarifications?: Record<string, any>;
      originalQuery?: string;
    }
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId,
          sessionId: options?.sessionId || sessionId,
          clarifications: options?.clarifications
        })
      });

      const result = await response.json();

      // Handle different response types
      if (result.type === 'questions') {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: result.reasoning || 'Let me ask a few questions...',
            messageType: 'questions',
            questions: result.questions,
            timestamp: new Date()
          }
        ]);
      } else if (result.type === 'recommendations') {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: result.intro || 'Here are some recommendations...',
            messageType: 'recommendations',
            recommendations: result.recommendations,
            timestamp: new Date()
          }
        ]);
      } else if (result.type === 'recommendations_with_refinement') {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: result.intro || 'Here are some ideas...',
            messageType: 'hybrid',
            recommendations: result.recommendations,
            refinementQuestions: result.refinementQuestions,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {messages.map(message => (
        <div key={message.id} className="message">
          {message.messageType === 'questions' && message.questions && (
            <ClarifyingQuestionBlock
              questions={message.questions}
              onAnswer={handleQuestionResponse}
              onSkip={() => handleSubmit('show me anything', { sessionId })}
            />
          )}

          {message.messageType === 'recommendations' && message.recommendations && (
            <RecommendationsList recommendations={message.recommendations} />
          )}

          {message.messageType === 'hybrid' && (
            <>
              {message.recommendations && (
                <RecommendationsList recommendations={message.recommendations} />
              )}
              {message.refinementQuestions && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Want more personalized picks?
                  </p>
                  <ClarifyingQuestionBlock
                    questions={message.refinementQuestions}
                    onAnswer={handleQuestionResponse}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {conversationTurns > 0 && conversationTurns < 3 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Question round {conversationTurns} of 3
        </div>
      )}
    </div>
  );
}

function buildEnrichedQueryString(
  original: string,
  answers: Record<string, any>
): string {
  // Build natural language query with answers
  // e.g., "gift for dad" + { budget: {min: 50, max: 100} }
  // → "gift for dad, budget $50-$100"
}

function formatAnswersSummary(answers: Record<string, any>): string {
  // Format answers for display in chat
  // e.g., "Budget: $50-$100, Interests: cooking"
}
```

**Dependencies**: Issue #6

**Testing Requirements**:
- Test rendering questions message
- Test rendering recommendations message
- Test rendering hybrid message
- Test answer submission flow
- Test conversation turn tracking
- Test max turns enforcement (3)
- Test skip functionality
- Integration test: full Q&A → recommendation flow

**Success Metrics**:
- Correctly renders all message types
- Answer submission works 100% of time
- Maintains scroll position during updates
- Shows loading states appropriately
- Conversation flow feels natural

**Estimated Complexity**: Medium (2-3 days)
- Message type handling: 4 hours
- Answer submission flow: 6 hours
- UI integration: 6 hours
- State management: 4 hours
- Testing: 6 hours

---

## Issue #8: Backend API Endpoint for Clarifications

**Title**: Update /api/chat endpoint to handle clarification payloads

**Labels**: `P1`, `size:S`, `backend`, `api`

**Description**:
Modify the chat API endpoint to accept clarification answers, merge them with context, and return appropriate response types (questions, recommendations, or hybrid).

**Context**:
Currently API only accepts `{ query, userId }`. We need to extend it to handle `{ query, userId, sessionId, clarifications }` and return different response shapes based on orchestrator mode.

**Acceptance Criteria**:
- [ ] Update API request schema to accept:
  - `query: string`
  - `userId: string`
  - `sessionId: string`
  - `clarifications?: Record<string, any>`
  - `originalQuery?: string`
- [ ] When clarifications present:
  - Call `mergeWithClarifications()` to build enriched context
  - Pass enriched context to orchestrator
- [ ] Return response shape based on orchestrator mode:
  - **'clarifying'**: `{ type: 'questions', questions, reasoning, context }`
  - **'recommendations'**: `{ type: 'recommendations', recommendations, intro }`
  - **'recommendations_with_refinement'**: `{ type: 'recommendations', recommendations, refinementQuestions, intro }`
- [ ] Include sessionId in all responses
- [ ] Add error handling for invalid clarifications
- [ ] Add request validation (Zod schema)
- [ ] API tests for all response types

**Technical Guidance**:
```typescript
// File: src/app/api/chat/route.ts (Next.js) or src/server.ts (Express)

import { z } from 'zod';

const ChatRequestSchema = z.object({
  query: z.string().min(1),
  userId: z.string(),
  sessionId: z.string(),
  clarifications: z.record(z.any()).optional(),
  originalQuery: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = ChatRequestSchema.parse(body);

    const { query, userId, sessionId, clarifications } = validated;

    // If clarifications provided, merge with previous context
    let orchestratorInput;
    if (clarifications) {
      const enriched = await mergeWithClarifications(
        validated.originalQuery || query,
        clarifications,
        sessionId
      );

      orchestratorInput = {
        userQuery: enriched.enrichedQuery,
        userId,
        sessionId,
        enrichedContext: enriched.enrichedContext
      };
    } else {
      orchestratorInput = {
        userQuery: query,
        userId,
        sessionId
      };
    }

    // Execute orchestrator
    const result = await orchestrator.execute(orchestratorInput);

    // Return appropriate response shape
    if (result.mode === 'clarifying') {
      return Response.json({
        type: 'questions',
        questions: result.questions,
        context: result.partialContext,
        reasoning: result.reasoning,
        sessionId: result.sessionId
      });
    }

    if (result.mode === 'recommendations_with_refinement') {
      return Response.json({
        type: 'recommendations',
        recommendations: result.recommendations,
        refinementQuestions: result.refinementQuestions,
        intro: result.intro,
        sessionId: result.sessionId
      });
    }

    // Normal recommendation response
    return Response.json({
      type: 'recommendations',
      recommendations: result.recommendations,
      intro: result.intro,
      sessionId: result.sessionId
    });

  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Response Type Definitions**:
```typescript
type ChatResponse =
  | {
      type: 'questions';
      questions: ClarifyingQuestion[];
      reasoning: string;
      context: ListenerOutput;
      sessionId: string;
    }
  | {
      type: 'recommendations';
      recommendations: Recommendation[];
      intro: string;
      refinementQuestions?: ClarifyingQuestion[];
      sessionId: string;
    };
```

**Dependencies**: Issue #5 (answer merging)

**Testing Requirements**:
- Test normal query (no clarifications)
- Test query with clarifications
- Test invalid clarifications (error handling)
- Test all response type shapes
- Test sessionId propagation
- API integration tests

**Success Metrics**:
- Accepts all valid request formats
- Returns correct response shape for each mode
- Handles errors gracefully
- Response time <2s for normal flow
- 100% request validation coverage

**Estimated Complexity**: Small (1-2 days)
- Schema definition: 2 hours
- Request handling: 4 hours
- Response formatting: 3 hours
- Error handling: 3 hours
- Tests: 4 hours

---

## Issue #9: Hybrid Mode Implementation

**Title**: Implement hybrid mode (show recommendations + refinement questions)

**Labels**: `P2`, `size:M`, `feature`, `ux`

**Description**:
For medium-confidence scenarios (0.5-0.7), show recommendations immediately but also provide optional refinement questions that users can answer to get better suggestions.

**Context**:
Not all users want to answer questions before seeing results. Hybrid mode provides the best of both worlds: immediate gratification for impatient users, refinement option for quality-focused users.

**Acceptance Criteria**:
- [ ] DialogueManager generates `mode: 'hybrid'` for:
  - Confidence 0.5-0.7
  - Critical fields covered ≥ 2
- [ ] Generate 1-2 refinement questions (not essential, not blocking)
- [ ] Orchestrator continues to full recommendation pipeline in hybrid mode
- [ ] Attach refinement questions to recommendation response
- [ ] Frontend renders recommendations first, questions below
- [ ] "Want more personalized picks?" prompt for questions
- [ ] Questions are optional (user can ignore)
- [ ] If user answers refinement questions:
  - Re-run with enriched context
  - Show improved recommendations
  - Track confidence improvement
- [ ] Integration tests for hybrid flow

**Technical Guidance**:
```typescript
// In DialogueManager.decide()
if (overallConfidence >= 0.5 && overallConfidence < 0.7 && criticalFieldsCovered >= 2) {
  // Generate 1-2 refinement questions (not essential)
  const refinementQuestions = this.generateRefinementQuestions(
    listenerOutput,
    assessment
  ).slice(0, 2);

  return {
    mode: 'hybrid',
    proceedWithRecommendations: true,
    questionsForRefinement: refinementQuestions,
    reasoning: 'Medium confidence - showing recommendations with refinement option',
    confidenceAssessment: assessment
  };
}

private generateRefinementQuestions(
  listener: ListenerOutput,
  assessment: ConfidenceAssessment
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  // Interest depth questions (not essentials)
  if (listener.interests.some(i => ['music', 'sports', 'art'].includes(i))) {
    // "What kind of music?" etc.
  }

  // Intent refinement
  if (assessment.highImpactAmbiguities.length > 0) {
    // "When you say 'special', what matters most?"
  }

  return questions.filter(q => q.type === 'refinement' || q.type === 'ambiguity');
}
```

**Frontend Display**:
```tsx
{message.messageType === 'hybrid' && (
  <>
    <div className="recommendations-section">
      <h3>Here are some ideas based on what you've told me:</h3>
      <RecommendationsList recommendations={message.recommendations} />
    </div>

    <div className="refinement-section mt-8 pt-6 border-t">
      <p className="text-sm text-muted-foreground mb-4">
        Not quite right? Answer these questions for more personalized recommendations:
      </p>
      <ClarifyingQuestionBlock
        questions={message.refinementQuestions!}
        onAnswer={handleRefinementResponse}
      />
    </div>
  </>
)}
```

**Dependencies**: Issue #2, #4, #6, #7

**Testing Requirements**:
- Test hybrid mode triggering (confidence 0.5-0.7)
- Test recommendation generation in hybrid mode
- Test refinement question generation
- Test optional refinement flow (user ignores)
- Test refinement flow (user answers)
- Test confidence improvement after refinement
- E2E test: medium query → hybrid → refine → better recs

**Success Metrics**:
- Hybrid mode triggers for 0.5-0.7 confidence range
- Recommendations shown within normal timeframe
- Refinement questions are relevant and helpful
- Answering refinement improves confidence by ≥0.1
- ≥30% of users engage with refinement questions

**Estimated Complexity**: Medium (2-3 days)
- DialogueManager logic: 4 hours
- Refinement question generation: 6 hours
- Orchestrator integration: 3 hours
- Frontend rendering: 4 hours
- Flow testing: 6 hours
- E2E testing: 4 hours

---

## Issue #10: Persona Testing with Conversational UX

**Title**: Extend persona testing framework to validate Q&A improvement

**Labels**: `P1`, `size:M`, `testing`, `validation`

**Description**:
Update the persona testing framework to simulate answering clarifying questions and measure improvement in recommendation quality compared to baseline (no questions).

**Context**:
We need to validate that asking questions actually improves recommendation relevance. Extend existing persona tests to answer questions programmatically and compare final recommendations.

**Acceptance Criteria**:
- [ ] Extend persona definitions with clarification answers:
  - Each persona has pre-defined answers to budget, interests, etc.
  - Simulate "vague query" scenario (initial query missing info)
  - Simulate "detailed query" scenario (all info upfront)
- [ ] Implement automated question answering:
  - When system asks questions, persona selects appropriate answers
  - Validate question relevance (should match missing info)
- [ ] Measure metrics for both scenarios:
  - **Vague query WITHOUT dialogue**: Baseline relevance
  - **Vague query WITH dialogue**: Improved relevance
  - Calculate improvement percentage
- [ ] Track key metrics:
  - Relevance score improvement
  - Confidence score improvement
  - Number of question rounds
  - Interest match accuracy
- [ ] Generate comparison report
- [ ] Validate target improvements:
  - Relevance: 4.3/10 → ≥7.0/10
  - Success rate: 33% → ≥70%
  - Interest match: 47% → ≥80%

**Technical Guidance**:
```typescript
// File: src/testing/persona-dialogue-tests.ts

interface PersonaWithAnswers extends Persona {
  clarificationAnswers: {
    budget?: { min: number; max: number };
    interests?: string;
    occasion?: string;
    intentPriority?: string;
  };
}

const sarahWithAnswers: PersonaWithAnswers = {
  ...sarah,  // Existing persona
  clarificationAnswers: {
    budget: { min: 50, max: 100 },
    interests: 'sustainable living',
    occasion: 'birthday',
    intentPriority: 'unique'
  }
};

async function testPersonaWithDialogue(persona: PersonaWithAnswers) {
  // Scenario 1: Vague query (baseline)
  const vagueQuery = "gift for mom";
  const baselineResult = await orchestrator.execute({
    userQuery: vagueQuery,
    userId: persona.id,
    sessionId: generateSessionId()
  });

  const baselineScore = calculateRelevanceScore(
    baselineResult.recommendations,
    persona
  );

  // Scenario 2: Vague query + dialogue
  const dialogueSessionId = generateSessionId();
  const firstResult = await orchestrator.execute({
    userQuery: vagueQuery,
    userId: persona.id,
    sessionId: dialogueSessionId
  });

  // Should receive questions
  expect(firstResult.mode).toBe('clarifying');
  expect(firstResult.questions).toBeDefined();

  // Simulate answering questions
  const answers = simulateAnswers(firstResult.questions!, persona);

  // Submit answers
  const finalResult = await orchestrator.execute({
    userQuery: vagueQuery,
    userId: persona.id,
    sessionId: dialogueSessionId,
    clarifications: answers
  });

  const dialogueScore = calculateRelevanceScore(
    finalResult.recommendations,
    persona
  );

  // Calculate improvement
  const improvement = ((dialogueScore - baselineScore) / baselineScore) * 100;

  return {
    persona: persona.name,
    baselineScore,
    dialogueScore,
    improvement,
    questionsAsked: firstResult.questions!.length,
    confidenceImprovement: finalResult.confidence - baselineResult.confidence
  };
}

function simulateAnswers(
  questions: ClarifyingQuestion[],
  persona: PersonaWithAnswers
): Record<string, any> {
  const answers: Record<string, any> = {};

  questions.forEach(q => {
    // Match question to persona's pre-defined answers
    if (q.field === 'budget' && persona.clarificationAnswers.budget) {
      answers[q.id] = persona.clarificationAnswers.budget;
    } else if (q.field === 'interests' && persona.clarificationAnswers.interests) {
      // Find matching suggested answer
      const match = q.suggestedAnswers.find(a =>
        a.label.toLowerCase().includes(persona.clarificationAnswers.interests!)
      );
      answers[q.id] = match?.value || persona.clarificationAnswers.interests;
    }
    // ... etc for other fields
  });

  return answers;
}

async function runAllPersonaDialogueTests() {
  const personas = [sarahWithAnswers, mikeWithAnswers, lisaWithAnswers];
  const results = [];

  for (const persona of personas) {
    const result = await testPersonaWithDialogue(persona);
    results.push(result);
  }

  // Generate report
  console.log('\n=== Dialogue UX Improvement Results ===\n');
  results.forEach(r => {
    console.log(`${r.persona}:`);
    console.log(`  Baseline: ${r.baselineScore}/10`);
    console.log(`  With Dialogue: ${r.dialogueScore}/10`);
    console.log(`  Improvement: +${r.improvement.toFixed(1)}%`);
    console.log(`  Questions: ${r.questionsAsked}`);
    console.log(`  Confidence Δ: +${r.confidenceImprovement.toFixed(2)}`);
    console.log('');
  });

  // Validate targets
  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
  const avgFinalScore = results.reduce((sum, r) => sum + r.dialogueScore, 0) / results.length;

  console.log(`Average Improvement: +${avgImprovement.toFixed(1)}%`);
  console.log(`Average Final Score: ${avgFinalScore.toFixed(1)}/10`);
  console.log(`Target: ≥7.0/10 → ${avgFinalScore >= 7.0 ? 'PASS ✓' : 'FAIL ✗'}`);

  return results;
}
```

**Dependencies**: Issue #1-8 (all core features)

**Testing Requirements**:
- Test baseline (vague query, no dialogue)
- Test dialogue flow (vague query + Q&A)
- Test detailed query (no questions needed)
- Validate improvement targets
- Test all personas
- Generate comparison reports

**Success Metrics**:
- Dialogue flow shows ≥20% improvement over baseline
- Final relevance ≥7.0/10
- Questions asked are appropriate (match missing info)
- Confidence improves by ≥0.15 per answer

**Estimated Complexity**: Medium (2-3 days)
- Persona extension: 4 hours
- Answer simulation: 6 hours
- Baseline comparison: 4 hours
- Report generation: 4 hours
- Validation logic: 4 hours
- Documentation: 2 hours

---

## Issue #11: Analytics and Monitoring

**Title**: Add analytics tracking for dialogue engagement and improvement

**Labels**: `P2`, `size:S`, `observability`, `analytics`

**Description**:
Implement analytics to track user engagement with questions, confidence improvements, question abandonment rates, and overall dialogue effectiveness.

**Context**:
We need data to measure success of the conversational UX and identify areas for improvement. Track both technical metrics (confidence deltas) and behavioral metrics (engagement rates).

**Acceptance Criteria**:
- [ ] Track dialogue events:
  - `dialogue.questions_shown` (mode, question_count, confidence, session_id)
  - `dialogue.questions_answered` (question_ids, answer_count, time_to_answer)
  - `dialogue.questions_skipped` (skip_type: button | timeout | ignored)
  - `dialogue.confidence_improvement` (before, after, delta, answers_provided)
  - `dialogue.recommendations_shown` (mode: direct | after_questions | hybrid)
- [ ] Calculate and log metrics per session:
  - Question engagement rate (answered / shown)
  - Average questions per session
  - Average confidence improvement
  - Time to first recommendation
  - Question abandonment rate
- [ ] Store metrics in database for analysis
- [ ] Create metrics dashboard or reporting endpoint
- [ ] Log to existing logging infrastructure
- [ ] Add Prometheus/Grafana metrics (optional)

**Technical Guidance**:
```typescript
// File: src/services/analytics/dialogue-analytics.ts

interface DialogueAnalytics {
  trackQuestionsShown(event: {
    sessionId: string;
    userId: string;
    mode: 'ask' | 'hybrid';
    questions: ClarifyingQuestion[];
    confidence: number;
    timestamp: Date;
  }): Promise<void>;

  trackQuestionsAnswered(event: {
    sessionId: string;
    userId: string;
    questionIds: string[];
    answers: Record<string, any>;
    timeToAnswer: number;  // milliseconds
    timestamp: Date;
  }): Promise<void>;

  trackQuestionsSkipped(event: {
    sessionId: string;
    userId: string;
    skipType: 'button' | 'timeout' | 'ignored';
    timestamp: Date;
  }): Promise<void>;

  trackConfidenceImprovement(event: {
    sessionId: string;
    userId: string;
    beforeConfidence: number;
    afterConfidence: number;
    answersProvided: string[];
    timestamp: Date;
  }): Promise<void>;

  trackRecommendationsShown(event: {
    sessionId: string;
    userId: string;
    mode: 'direct' | 'after_questions' | 'hybrid';
    recommendationCount: number;
    finalConfidence: number;
    timestamp: Date;
  }): Promise<void>;
}

class DialogueAnalyticsService implements DialogueAnalytics {
  async trackQuestionsShown(event) {
    // Log to console/file
    logger.info('Dialogue: Questions Shown', {
      sessionId: event.sessionId,
      mode: event.mode,
      questionCount: event.questions.length,
      questionTypes: event.questions.map(q => q.type),
      confidence: event.confidence
    });

    // Store in Neo4j
    await neo4j.run(`
      MATCH (session:Session {id: $sessionId})
      CREATE (event:DialogueEvent {
        type: 'questions_shown',
        timestamp: datetime(),
        mode: $mode,
        questionCount: $questionCount,
        confidence: $confidence
      })
      CREATE (event)-[:IN_SESSION]->(session)
    `, {
      sessionId: event.sessionId,
      mode: event.mode,
      questionCount: event.questions.length,
      confidence: event.confidence
    });

    // Prometheus metric (optional)
    metrics.counter('dialogue_questions_shown_total', {
      mode: event.mode
    }).inc();

    metrics.histogram('dialogue_questions_count', {
      mode: event.mode
    }).observe(event.questions.length);
  }

  async trackConfidenceImprovement(event) {
    const delta = event.afterConfidence - event.beforeConfidence;

    logger.info('Dialogue: Confidence Improved', {
      sessionId: event.sessionId,
      before: event.beforeConfidence,
      after: event.afterConfidence,
      delta,
      answersCount: event.answersProvided.length
    });

    // Prometheus
    metrics.histogram('dialogue_confidence_delta').observe(delta);
    metrics.histogram('dialogue_confidence_final').observe(event.afterConfidence);
  }

  async getSessionMetrics(sessionId: string) {
    // Aggregate metrics for a session
    const events = await this.getSessionEvents(sessionId);

    return {
      questionsShown: events.filter(e => e.type === 'questions_shown').length,
      questionsAnswered: events.filter(e => e.type === 'questions_answered').length,
      engagementRate: this.calculateEngagementRate(events),
      averageConfidenceImprovement: this.calculateAvgConfidenceImprovement(events),
      timeToRecommendation: this.calculateTimeToRecommendation(events)
    };
  }
}
```

**Usage in Orchestrator**:
```typescript
// When showing questions
if (dialogueDecision.mode === 'ask') {
  await analytics.trackQuestionsShown({
    sessionId: input.sessionId,
    userId: input.userId,
    mode: 'ask',
    questions: dialogueDecision.questions!,
    confidence: dialogueDecision.confidenceAssessment.overallConfidence,
    timestamp: new Date()
  });
}

// When receiving answers
if (input.clarifications) {
  const before = previousTurn.confidence;
  const after = newListenerOutput.confidence;

  await analytics.trackConfidenceImprovement({
    sessionId: input.sessionId,
    userId: input.userId,
    beforeConfidence: before,
    afterConfidence: after,
    answersProvided: Object.keys(input.clarifications),
    timestamp: new Date()
  });
}
```

**Metrics to Track**:
1. **Question Engagement Rate**: % of users who answer when asked (target: ≥75%)
2. **Average Questions Per Session**: How many rounds needed (target: ≤2.0)
3. **Confidence Delta**: Average improvement from answers (target: +0.15-0.25)
4. **Time to First Recommendation**: Including Q&A (target: ≤45s)
5. **Question Abandonment Rate**: % who bail on questions (target: ≤15%)
6. **Mode Distribution**: ask vs recommend vs hybrid usage

**Dependencies**: Issue #1-9 (all features)

**Testing Requirements**:
- Test each analytics event fires correctly
- Test metric calculation accuracy
- Test Neo4j storage
- Test aggregation queries
- Test dashboard endpoint (if applicable)

**Success Metrics**:
- All events tracked accurately
- Metrics available within 1s of event
- No performance impact on main flow
- Metrics queryable for reporting

**Estimated Complexity**: Small (1-2 days)
- Event definitions: 2 hours
- Tracking implementation: 6 hours
- Storage integration: 4 hours
- Aggregation queries: 4 hours
- Dashboard/reporting: 4 hours (optional)

---

## Issue #12: Documentation and User Guide

**Title**: Document conversational UX feature for users and developers

**Labels**: `P2`, `size:S`, `documentation`

**Description**:
Create comprehensive documentation explaining the conversational UX feature, how it works, when questions are asked, and how to use it effectively.

**Context**:
Users and developers need to understand the new dialogue system. Provide clear documentation with examples, decision logic explanation, and best practices.

**Acceptance Criteria**:
- [ ] Create user-facing documentation:
  - How the system decides to ask questions
  - Example conversations (vague → questions → recommendations)
  - How to answer questions effectively
  - How to skip questions if needed
  - Privacy considerations
- [ ] Create developer documentation:
  - Architecture overview (DialogueManager, decision tree)
  - API changes (request/response formats)
  - Question generation logic
  - How to extend with new question types
  - Testing strategies
- [ ] Update README with feature description
- [ ] Create architectural diagram (dialogue flow)
- [ ] Add code examples for common scenarios
- [ ] Document confidence thresholds and reasoning
- [ ] Add troubleshooting guide

**Documentation Structure**:

**User Guide** (`docs/USER_GUIDE_CONVERSATIONAL_UX.md`):
```markdown
# Conversational Gift Recommendations

## How It Works

Present-Agent2 now asks smart questions when it needs more information to give you great recommendations.

### When Will I Be Asked Questions?

You'll see questions when:
- Your description is vague ("gift for dad")
- Budget is missing
- We don't know their interests

You WON'T see questions when:
- You provide detailed context upfront
- The system is confident in recommendations

### Example Conversation

**You**: "gift for dad"

**System**: "I'd love to help! Quick questions:
1. What's your budget? [Under $50] [$50-$100] [Above $100]
2. What are his main interests? [Sports] [Tech] [Outdoors] [Cooking]"

**You**: [Selects "$50-$100" and "Cooking"]

**System**: "Perfect! Here are some cooking gifts for your dad..."

### Tips for Best Results

- Answer at least the required questions (marked with *)
- You can skip and say "show me anything"
- More context = better recommendations
- Takes just 10-15 seconds to answer

## Privacy

All questions are optional. Your answers are used only to improve recommendations for your current session.
```

**Developer Guide** (`docs/DEVELOPER_GUIDE_CONVERSATIONAL_UX.md`):
```markdown
# Conversational UX - Developer Guide

## Architecture

### Flow Diagram
```
User Query
    ↓
Listener (extract context)
    ↓
Memory (recall preferences)
    ↓
DialogueManager (NEW)
    ↓
    ├─ confidence ≥ 0.7 → RECOMMEND mode → Full Pipeline
    ├─ confidence 0.5-0.7 → HYBRID mode → Recommendations + Refinement Questions
    └─ confidence < 0.5 → ASK mode → Return Questions
```

### Components

**DialogueManager Agent**
- Location: `src/services/agents/dialogue-manager.ts`
- Purpose: Decide ask vs recommend vs hybrid
- Input: ListenerOutput, MemoryOutput, ConversationHistory
- Output: Mode + Questions (if applicable)

**Decision Logic**
```typescript
if (confidence >= 0.7 && criticalFields >= 3) → recommend
else if (confidence >= 0.5 && criticalFields >= 2) → hybrid
else → ask
```

### API Changes

**Request Format**
```typescript
{
  query: string;
  userId: string;
  sessionId: string;
  clarifications?: Record<string, any>;  // NEW
}
```

**Response Formats**
```typescript
// Questions
{
  type: 'questions',
  questions: ClarifyingQuestion[],
  reasoning: string
}

// Recommendations
{
  type: 'recommendations',
  recommendations: Recommendation[]
}

// Hybrid
{
  type: 'recommendations',
  recommendations: Recommendation[],
  refinementQuestions: ClarifyingQuestion[]
}
```

### Adding New Question Types

1. Define question in `generateQuestions()`:
```typescript
if (condition) {
  questions.push({
    id: 'new_question',
    type: 'refinement',
    field: 'fieldName',
    question: "Natural language question?",
    suggestedAnswers: [...],
    priority: 5,
    impactOnConfidence: 0.08
  });
}
```

2. Handle answer in `mergeWithClarifications()`:
```typescript
if (answers.new_question) {
  enrichedContext.fieldName = answers.new_question;
}
```

### Testing

See `src/testing/persona-dialogue-tests.ts` for examples.

```typescript
// Test that low confidence triggers questions
const result = await orchestrator.execute({
  userQuery: "gift for dad",  // Vague
  userId: testUserId,
  sessionId: generateSessionId()
});

expect(result.mode).toBe('clarifying');
expect(result.questions).toHaveLength(3);
```
```

**Files to Create**:
1. `docs/USER_GUIDE_CONVERSATIONAL_UX.md`
2. `docs/DEVELOPER_GUIDE_CONVERSATIONAL_UX.md`
3. `docs/diagrams/dialogue-flow.mmd` (Mermaid diagram)
4. Update `README.md` with feature summary
5. Update `CHANGELOG.md` with v2.3.0 entry

**Dependencies**: Issue #1-11 (all features)

**Testing Requirements**:
- Review documentation for accuracy
- Verify code examples work
- Test links and references
- Ensure diagrams render correctly

**Success Metrics**:
- Documentation complete and accurate
- Code examples run successfully
- Clear for both users and developers
- Covers all major use cases

**Estimated Complexity**: Small (1 day)
- User guide: 3 hours
- Developer guide: 4 hours
- Diagrams: 2 hours
- Code examples: 2 hours
- Review and polish: 2 hours

---

## Summary of Issues

| # | Title | Priority | Size | Dependencies | Est. Time |
|---|-------|----------|------|--------------|-----------|
| 1 | Core DialogueManager Agent | P0 | L | None | 3-4 days |
| 2 | Question Generation System | P0 | XL | #1 | 5-6 days |
| 3 | Multi-Turn Conversation State | P0 | M | #1, #2 | 2-3 days |
| 4 | Orchestrator Integration | P0 | M | #1-3 | 2-3 days |
| 5 | Answer Merging | P1 | M | #3 | 2-3 days |
| 6 | Frontend Question UI | P1 | L | #2 | 3-4 days |
| 7 | Frontend Chat Integration | P1 | M | #6 | 2-3 days |
| 8 | Backend API Endpoint | P1 | S | #5 | 1-2 days |
| 9 | Hybrid Mode | P2 | M | #2, #4, #6-7 | 2-3 days |
| 10 | Persona Testing | P1 | M | #1-8 | 2-3 days |
| 11 | Analytics & Monitoring | P2 | S | #1-9 | 1-2 days |
| 12 | Documentation | P2 | S | #1-11 | 1 day |

**Total Estimated Time**: 26-37 days (with parallelization: ~4-5 weeks)

## Implementation Phases

### Phase 1: Core Backend (Week 1-2) - P0 Issues
- Issue #1: DialogueManager (3-4 days)
- Issue #2: Question Generation (5-6 days)
- Issue #3: Conversation State (2-3 days) - parallel with #2
- Issue #4: Orchestrator Integration (2-3 days)

### Phase 2: Frontend & Integration (Week 2-3) - P1 Issues
- Issue #5: Answer Merging (2-3 days) - parallel with frontend
- Issue #6: Question UI Component (3-4 days)
- Issue #7: Chat Integration (2-3 days)
- Issue #8: API Endpoint (1-2 days) - parallel with #7

### Phase 3: Polish & Validation (Week 3-4) - P1-P2 Issues
- Issue #9: Hybrid Mode (2-3 days)
- Issue #10: Persona Testing (2-3 days) - parallel with #9
- Issue #11: Analytics (1-2 days)
- Issue #12: Documentation (1 day)

## Success Criteria

This feature is successful when:

**Quantitative**:
- Recommendation relevance: 4.3/10 → ≥7.0/10 (63% improvement)
- Success rate: 33% → ≥70% (112% improvement)
- Interest match: 47% → ≥80% (70% improvement)
- Question engagement: ≥75% of users answer when asked
- Average question rounds: ≤2.0 per session

**Qualitative**:
- Users describe experience as "helpful" not "interrogative"
- Questions feel natural and conversational
- System demonstrates understanding

**Technical**:
- No regression in high-confidence query performance
- Added latency <1s per query
- No duplicate questions in session
- 90%+ test coverage on new code

---

## Creating Issues with gh CLI

To create these issues in GitHub:

```bash
# Issue #1
gh issue create --title "Core DialogueManager Agent Implementation" \
  --label "P0,size:L,agent,core-feature" \
  --body-file docs/issues/issue-01-dialogue-manager.md

# Issue #2
gh issue create --title "Question Generation System" \
  --label "P0,size:XL,agent,core-feature" \
  --body-file docs/issues/issue-02-question-generation.md

# ... etc for all issues
```

Or use a script to create all at once:
```bash
./scripts/create-conversational-ux-issues.sh
```
