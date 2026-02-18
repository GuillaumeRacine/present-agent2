# Technical Enhancements for Conversational UX Issues
## Engineering Manager Directives

**Based on**: Technical Review v1.0 (November 18, 2025)
**Purpose**: Enhanced technical guidance for implementing GitHub Issues #1-12

---

## Cross-Cutting Technical Requirements

### 1. Type Safety Enhancements

**Apply to**: All issues, especially #1, #2, #3, #4

**Requirement**: Use discriminated unions instead of optional properties

```typescript
// ❌ AVOID: Optional properties that depend on mode
interface DialogueManagerOutput {
  mode: 'ask' | 'recommend' | 'hybrid';
  questions?: ClarifyingQuestion[];  // When is this defined?
  questionsForRefinement?: ClarifyingQuestion[];  // When is this defined?
}

// ✅ PREFERRED: Discriminated union
type DialogueManagerOutput =
  | {
      mode: 'ask';
      questions: ClarifyingQuestion[];  // Always present for 'ask'
      proceedWithRecommendations: false;
      // ... other fields
    }
  | {
      mode: 'recommend';
      questions?: never;  // Never present for 'recommend'
      proceedWithRecommendations: true;
      // ... other fields
    }
  | {
      mode: 'hybrid';
      questionsForRefinement: ClarifyingQuestion[];  // Always present for 'hybrid'
      proceedWithRecommendations: true;
      // ... other fields
    };
```

**Benefits**:
- TypeScript compiler enforces correct property usage
- Impossible states become unrepresentable
- Better IDE autocomplete
- Catches bugs at compile time

---

### 2. Performance Budgets

**Apply to**: All issues, tracked in #11 (Analytics)

**Requirements**:
```typescript
const PERFORMANCE_BUDGETS = {
  // Agent execution budgets
  dialogueManager: 300,      // ms - Decision making
  questionGeneration: 50,    // ms - Template-based generation
  answerMerging: 100,        // ms - Context enrichment

  // Total flow budgets
  turnWithQuestions: 8000,   // ms - Turn that asks questions
  turnWithAnswers: 35000,    // ms - Turn that shows recommendations

  // Multi-turn budgets
  maxTotalTime: 45000,       // ms - Maximum end-to-end time
  maxTurns: 3                // Absolute limit
};

// Enforcement
async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
  const startTime = Date.now();

  const result = await this.processInternal(input);

  const elapsedMs = Date.now() - startTime;
  if (elapsedMs > PERFORMANCE_BUDGETS.dialogueManager) {
    logger.warn('DialogueManager exceeded performance budget', {
      budgetMs: PERFORMANCE_BUDGETS.dialogueManager,
      actualMs: elapsedMs,
      overageMs: elapsedMs - PERFORMANCE_BUDGETS.dialogueManager
    });
    metrics.counter('dialogue_manager.budget_exceeded').inc();
  }

  return result;
}
```

---

### 3. Error Recovery Patterns

**Apply to**: All issues, especially #1, #4, #5

**Requirement**: Every agent must have explicit error recovery

```typescript
class DialogueManagerAgent {
  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 60000
  });

  async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.processInternal(input)
      );
    } catch (error) {
      return this.handleError(error, input);
    }
  }

  private handleError(
    error: Error,
    input: DialogueManagerInput
  ): DialogueManagerOutput {
    logger.error('DialogueManager: Fatal Error', {
      error: error.message,
      stack: error.stack,
      sessionId: input.sessionId,
      confidence: input.listenerOutput.confidence
    });

    // Determine recovery strategy
    if (error instanceof QuestionGenerationError) {
      // Question generation failed - proceed with recommendations
      return this.buildFallbackRecommendMode(
        input,
        'Question generation failed - proceeding to recommendations'
      );
    } else if (error instanceof ConversationHistoryError) {
      // History retrieval failed - treat as first turn
      return this.processAsFirstTurn(input);
    } else {
      // Unknown error - safe fallback
      metrics.counter('dialogue_manager.fatal_error').inc();
      return this.buildEmergencyRecommendMode(
        input,
        'Technical issue encountered - showing recommendations'
      );
    }
  }
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime?: number;

  constructor(private config: {
    failureThreshold: number;
    resetTimeoutMs: number;
  }) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      logger.error('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold
      });
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const elapsed = Date.now() - this.lastFailureTime;
    return elapsed >= this.config.resetTimeoutMs;
  }
}
```

---

### 4. Logging Standards

**Apply to**: All issues, enforced in #11 (Analytics)

**Requirement**: Structured logging with consistent format

```typescript
// Standard log format
interface LogContext {
  sessionId: string;
  userId?: string;
  agentName: string;
  operation: string;
  durationMs?: number;
  [key: string]: any;  // Additional context
}

// Usage in DialogueManager
logger.info('DialogueManager: Decision Made', {
  sessionId: input.sessionId,
  userId: input.userId,
  agentName: 'DialogueManager',
  operation: 'decide',
  mode: result.mode,
  confidence: result.confidenceAssessment.overallConfidence,
  criticalFields: result.confidenceAssessment.criticalFieldCount,
  questionsCount: result.questions?.length || 0,
  reasoning: result.reasoning,
  durationMs: result.decisionTimeMs
});

// Error logging
logger.error('DialogueManager: Error', {
  sessionId: input.sessionId,
  userId: input.userId,
  agentName: 'DialogueManager',
  operation: 'process',
  error: {
    message: error.message,
    stack: error.stack,
    type: error.constructor.name
  },
  context: {
    confidence: input.listenerOutput.confidence,
    criticalFields: assessment?.criticalFieldCount
  }
});

// Performance logging
logger.debug('DialogueManager: Performance', {
  sessionId: input.sessionId,
  agentName: 'DialogueManager',
  operation: 'process',
  phases: {
    assessContext: assessContextMs,
    generateQuestions: generateQuestionsMs,
    decide: decideMs
  },
  totalMs: result.decisionTimeMs,
  budgetMs: PERFORMANCE_BUDGETS.dialogueManager,
  withinBudget: result.decisionTimeMs <= PERFORMANCE_BUDGETS.dialogueManager
});
```

**Log Levels**:
- `DEBUG`: Internal state, phase timings, detailed execution
- `INFO`: Decisions, state changes, user actions
- `WARN`: Approaching limits, fallback scenarios, budget violations
- `ERROR`: Failures, exceptions, circuit breaker trips

---

### 5. Validation Requirements

**Apply to**: All issues, especially #1, #2, #4, #5

**Requirement**: Validate all inputs and outputs

```typescript
// Input validation (Issue #1, #4)
function validateDialogueManagerInput(input: DialogueManagerInput): void {
  const errors: string[] = [];

  if (!input.listenerOutput) {
    errors.push('listenerOutput is required');
  }

  if (!input.memoryOutput) {
    errors.push('memoryOutput is required');
  }

  if (input.listenerOutput?.confidence !== undefined) {
    if (input.listenerOutput.confidence < 0 || input.listenerOutput.confidence > 1) {
      errors.push(`Invalid confidence: ${input.listenerOutput.confidence} (must be 0-1)`);
    }
  }

  if (input.conversationHistory) {
    input.conversationHistory.forEach((turn, idx) => {
      if (!turn.sessionId) {
        errors.push(`Turn ${idx} missing sessionId`);
      }
      if (turn.turnNumber < 1) {
        errors.push(`Turn ${idx} has invalid turnNumber: ${turn.turnNumber}`);
      }
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid DialogueManagerInput', { errors });
  }
}

// Output validation (Issue #1)
function validateDialogueManagerOutput(output: DialogueManagerOutput): void {
  const errors: string[] = [];

  // Mode-specific validation
  if (output.mode === 'ask') {
    if (!output.questions || output.questions.length === 0) {
      errors.push('Ask mode requires at least 1 question');
    }
    if (output.questions && output.questions.length > 3) {
      errors.push(`Too many questions: ${output.questions.length} (max 3)`);
    }
    if (output.proceedWithRecommendations !== false) {
      errors.push('Ask mode must not proceed to recommendations');
    }
  }

  if (output.mode === 'recommend') {
    if (output.proceedWithRecommendations !== true) {
      errors.push('Recommend mode must proceed to recommendations');
    }
  }

  if (output.mode === 'hybrid') {
    if (!output.questionsForRefinement || output.questionsForRefinement.length === 0) {
      errors.push('Hybrid mode requires refinement questions');
    }
    if (output.proceedWithRecommendations !== true) {
      errors.push('Hybrid mode must proceed to recommendations');
    }
  }

  // Question validation
  output.questions?.forEach((q, idx) => {
    if (!q.id) errors.push(`Question ${idx} missing id`);
    if (!q.question) errors.push(`Question ${idx} missing question text`);
    if (!q.suggestedAnswers || q.suggestedAnswers.length < 2) {
      errors.push(`Question ${idx} needs at least 2 answer options`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Invalid DialogueManagerOutput', { errors });
  }
}

// Custom error class
class ValidationError extends Error {
  constructor(message: string, public details: { errors: string[] }) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

---

## Issue-Specific Enhancements

### Issue #1: Core DialogueManager Agent

**Additional Requirements**:

1. **Configuration Externalization**
```typescript
// Don't hardcode thresholds in agent
class DialogueManagerAgent {
  constructor(private config: DialogueManagerConfig) {}
}

interface DialogueManagerConfig {
  confidenceThresholds: {
    high: number;      // Default: 0.7
    medium: number;    // Default: 0.5
    low: number;       // Default: 0.3
  };
  criticalFieldMinimum: number;  // Default: 2
  maxTurns: number;              // Default: 3
  maxQuestionsPerTurn: number;   // Default: 3
  performanceBudgetMs: number;   // Default: 300
}

// Load from environment or config file
const config = loadDialogueManagerConfig();
const dialogueManager = new DialogueManagerAgent(config);
```

2. **Testability Hooks**
```typescript
// Support forced modes for testing
interface DialogueManagerInput {
  // ... existing fields
  forcedMode?: 'ask' | 'recommend' | 'hybrid';  // For testing only
  __testOverrides?: {
    skipHistoryCheck?: boolean;
    skipValidation?: boolean;
    mockQuestions?: ClarifyingQuestion[];
  };
}
```

3. **Metrics Collection**
```typescript
class DialogueManagerAgent {
  async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
    const startTime = Date.now();

    // ... processing

    // Emit metrics
    metrics.histogram('dialogue_manager.decision_time_ms').observe(elapsedMs);
    metrics.counter('dialogue_manager.decisions', { mode: result.mode }).inc();
    metrics.histogram('dialogue_manager.confidence_input').observe(input.listenerOutput.confidence);
    metrics.histogram('dialogue_manager.critical_fields').observe(assessment.criticalFieldCount);

    return result;
  }
}
```

---

### Issue #2: Question Generation System

**Additional Requirements**:

1. **Question Template Registry**
```typescript
// Centralized question template management
class QuestionTemplateRegistry {
  private templates = new Map<string, QuestionTemplate>();

  register(template: QuestionTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): QuestionTemplate | undefined {
    return this.templates.get(id);
  }

  getByType(type: QuestionType): QuestionTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.type === type);
  }
}

interface QuestionTemplate {
  id: string;
  type: 'essential' | 'refinement' | 'ambiguity' | 'intent' | 'constraint';
  field: string;
  questionText: string;
  suggestedAnswers: Array<{ label: string; value: any; description?: string }>;
  priority: number;
  impactOnConfidence: number;
  conditions?: (context: ListenerOutput) => boolean;  // When to show
}

// Usage
const registry = new QuestionTemplateRegistry();

// Register budget question
registry.register({
  id: 'budget',
  type: 'essential',
  field: 'budget',
  questionText: "What's your budget range for this gift?",
  suggestedAnswers: [
    { label: 'Under $25', value: { min: 0, max: 25 } },
    { label: '$25-$50', value: { min: 25, max: 50 } },
    // ...
  ],
  priority: 1,
  impactOnConfidence: 0.15,
  conditions: (context) => !context.budget || context.budget.max === 0
});
```

2. **Dynamic Answer Options**
```typescript
// For questions with dynamic options (e.g., based on interest)
interface QuestionTemplate {
  // ... existing fields
  answerGenerator?: (context: ListenerOutput) => SuggestedAnswer[];
}

// Example: Refine interest question
registry.register({
  id: 'refine_interest',
  type: 'refinement',
  field: 'interests',
  questionText: (interest) => `You mentioned ${interest} - can you be more specific?`,
  answerGenerator: (context) => {
    const interest = context.interests[0];
    return getRefinementOptionsFor(interest);
  },
  priority: 4,
  impactOnConfidence: 0.12
});
```

3. **Question Prioritization Algorithm**
```typescript
/**
 * Prioritize questions based on:
 * 1. Priority number (1 = highest)
 * 2. Confidence impact
 * 3. Type (essential > refinement > ambiguity)
 */
function prioritizeQuestions(questions: ClarifyingQuestion[]): ClarifyingQuestion[] {
  const TYPE_WEIGHTS = {
    essential: 100,
    refinement: 50,
    intent: 30,
    ambiguity: 20,
    constraint: 10
  };

  return questions.sort((a, b) => {
    // Primary: Priority number (lower = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Secondary: Type weight
    const aTypeWeight = TYPE_WEIGHTS[a.type];
    const bTypeWeight = TYPE_WEIGHTS[b.type];
    if (aTypeWeight !== bTypeWeight) {
      return bTypeWeight - aTypeWeight; // Higher weight first
    }

    // Tertiary: Confidence impact
    return b.impactOnConfidence - a.impactOnConfidence;
  });
}
```

---

### Issue #3: Multi-Turn Conversation State

**Additional Requirements**:

1. **State Machine Implementation**
```typescript
enum ConversationState {
  INITIAL = 'initial',
  ASKED_QUESTIONS = 'asked_questions',
  RECEIVED_ANSWERS = 'received_answers',
  SHOWING_RECOMMENDATIONS = 'showing_recommendations',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  ERROR = 'error'
}

class ConversationStateMachine {
  private validTransitions: Record<ConversationState, ConversationState[]> = {
    [ConversationState.INITIAL]: [
      ConversationState.ASKED_QUESTIONS,
      ConversationState.SHOWING_RECOMMENDATIONS,
      ConversationState.ERROR
    ],
    [ConversationState.ASKED_QUESTIONS]: [
      ConversationState.RECEIVED_ANSWERS,
      ConversationState.ABANDONED,
      ConversationState.ERROR
    ],
    [ConversationState.RECEIVED_ANSWERS]: [
      ConversationState.ASKED_QUESTIONS,  // Can ask more
      ConversationState.SHOWING_RECOMMENDATIONS,
      ConversationState.ERROR
    ],
    [ConversationState.SHOWING_RECOMMENDATIONS]: [
      ConversationState.COMPLETED
    ],
    [ConversationState.COMPLETED]: [],
    [ConversationState.ABANDONED]: [],
    [ConversationState.ERROR]: []
  };

  transition(
    from: ConversationState,
    to: ConversationState
  ): void {
    if (!this.isValidTransition(from, to)) {
      throw new InvalidStateTransitionError(
        `Invalid transition from ${from} to ${to}`,
        { from, to, validTransitions: this.validTransitions[from] }
      );
    }
  }

  private isValidTransition(from: ConversationState, to: ConversationState): boolean {
    return this.validTransitions[from]?.includes(to) || false;
  }
}
```

2. **Turn Deduplication Logic**
```typescript
/**
 * Check if question was already asked in this session
 * Use Set for O(1) lookup
 */
function getAskedQuestions(history?: ConversationTurn[]): Set<string> {
  if (!history || history.length === 0) {
    return new Set();
  }

  const asked = new Set<string>();
  history.forEach(turn => {
    turn.askedQuestions.forEach(questionId => asked.add(questionId));
  });

  return asked;
}

// Usage
const askedBefore = getAskedQuestions(conversationHistory);
const newQuestions = potentialQuestions.filter(q =>
  !askedBefore.has(q.field)
);
```

3. **Conversation History Optimization**
```typescript
/**
 * Only retrieve recent turns (not entire history)
 * Optimized Neo4j query
 */
async function getConversationHistory(
  sessionId: string,
  limit: number = 10
): Promise<ConversationTurn[]> {
  const query = `
    MATCH (session:Session {id: $sessionId})-[:HAS_TURN]->(turn:ConversationTurn)
    WITH turn
    ORDER BY turn.turnNumber DESC
    LIMIT $limit
    RETURN turn
    ORDER BY turn.turnNumber ASC
  `;

  const result = await neo4j.run(query, { sessionId, limit });

  return result.records.map(record => {
    const turn = record.get('turn').properties;
    return {
      ...turn,
      // Parse JSON fields
      askedQuestions: JSON.parse(turn.askedQuestionsJson || '[]'),
      receivedAnswers: JSON.parse(turn.receivedAnswersJson || '{}'),
      listenerOutput: JSON.parse(turn.listenerOutputJson || '{}'),
      dialogueDecision: JSON.parse(turn.dialogueDecisionJson || '{}')
    };
  });
}
```

---

### Issue #4: Orchestrator Integration

**Additional Requirements**:

1. **Graceful Degradation**
```typescript
async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
  // ... existing steps 1-2 (Listener, Memory)

  // NEW Step 3: DialogueManager with fallback
  let dialogueDecision: DialogueManagerOutput;
  try {
    const conversationHistory = await this.getConversationHistory(input.sessionId);
    dialogueDecision = await this.dialogueAgent.process({
      listenerOutput,
      memoryOutput,
      conversationHistory
    });
  } catch (error) {
    logger.error('Orchestrator: DialogueManager failed, using fallback', {
      sessionId: input.sessionId,
      error: error.message
    });

    // Fallback: Proceed with recommendations
    dialogueDecision = {
      mode: 'recommend',
      proceedWithRecommendations: true,
      reasoning: 'DialogueManager failed - proceeding with recommendations',
      confidenceAssessment: {
        overallConfidence: listenerOutput.confidence,
        criticalFieldsCovered: [],
        criticalFieldsMissing: [],
        highImpactAmbiguities: [],
        criticalFieldCount: 0
      },
      decisionTimeMs: 0,
      processedAt: new Date()
    };
  }

  // ... rest of flow
}
```

2. **Branching Logic Type Safety**
```typescript
// Use type guards for branching
function isAskMode(output: DialogueManagerOutput): output is AskModeOutput {
  return output.mode === 'ask';
}

function isRecommendMode(output: DialogueManagerOutput): output is RecommendModeOutput {
  return output.mode === 'recommend';
}

function isHybridMode(output: DialogueManagerOutput): output is HybridModeOutput {
  return output.mode === 'hybrid';
}

// Usage
if (isAskMode(dialogueDecision)) {
  // TypeScript knows dialogueDecision.questions exists
  return {
    mode: 'clarifying',
    questions: dialogueDecision.questions,  // Type-safe!
    // ...
  };
}
```

---

### Issue #5: Answer Merging

**Additional Requirements**:

1. **Deep Merge Utility**
```typescript
/**
 * Deep merge objects, preserving nested structures
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target };

  Object.keys(source).forEach(key => {
    const sourceValue = source[key as keyof T];
    const targetValue = target[key as keyof T];

    if (isObject(sourceValue) && isObject(targetValue)) {
      output[key as keyof T] = deepMerge(targetValue, sourceValue as any);
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Concatenate arrays, remove duplicates
      output[key as keyof T] = [...new Set([...targetValue, ...sourceValue])] as any;
    } else {
      output[key as keyof T] = sourceValue as any;
    }
  });

  return output;
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
```

2. **Answer Validation**
```typescript
/**
 * Validate answers before merging
 */
function validateAnswers(
  answers: Record<string, any>,
  questions: ClarifyingQuestion[]
): void {
  const errors: string[] = [];

  // Check all answer IDs are valid
  Object.keys(answers).forEach(answerId => {
    const question = questions.find(q => q.id === answerId);
    if (!question) {
      errors.push(`Unknown question ID: ${answerId}`);
    }
  });

  // Check answer values are valid
  questions.forEach(question => {
    const answer = answers[question.id];
    if (answer !== undefined) {
      const validValues = question.suggestedAnswers.map(sa => sa.value);
      const isValid = validValues.some(v =>
        JSON.stringify(v) === JSON.stringify(answer)
      );
      if (!isValid) {
        errors.push(`Invalid answer for ${question.id}: ${JSON.stringify(answer)}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Invalid answers', { errors });
  }
}
```

---

### Issue #11: Analytics and Monitoring

**Additional Requirements**:

1. **Metric Definitions**
```typescript
// Define all metrics upfront
const DIALOGUE_METRICS = {
  // Counters
  DECISIONS: 'dialogue_manager.decisions',
  QUESTIONS_SHOWN: 'dialogue_manager.questions_shown',
  QUESTIONS_ANSWERED: 'dialogue_manager.questions_answered',
  QUESTIONS_SKIPPED: 'dialogue_manager.questions_skipped',
  MAX_TURNS_REACHED: 'dialogue_manager.max_turns_reached',
  ERRORS: 'dialogue_manager.errors',

  // Histograms
  DECISION_TIME_MS: 'dialogue_manager.decision_time_ms',
  QUESTION_COUNT: 'dialogue_manager.question_count',
  CONFIDENCE_BOOST: 'dialogue_manager.confidence_boost',
  TURNS_PER_SESSION: 'dialogue_manager.turns_per_session',
  TIME_TO_ANSWER_MS: 'dialogue_manager.time_to_answer_ms',

  // Gauges
  ACTIVE_SESSIONS: 'dialogue_manager.active_sessions'
};

// Usage
metrics.counter(DIALOGUE_METRICS.DECISIONS, { mode: 'ask' }).inc();
metrics.histogram(DIALOGUE_METRICS.DECISION_TIME_MS).observe(elapsedMs);
```

2. **Alerting Thresholds**
```typescript
const ALERT_THRESHOLDS = {
  // Engagement alerts
  questionAbandonmentRate: 0.30,     // Alert if >30%
  questionEngagementRate: 0.50,      // Alert if <50%

  // Quality alerts
  avgConfidenceImprovement: 0.10,    // Alert if <0.10
  avgTurnsPerSession: 2.5,           // Alert if >2.5

  // Performance alerts
  decisionTimeP95Ms: 500,            // Alert if p95 >500ms
  errorRate: 0.05,                   // Alert if >5%

  // Business alerts
  recommendationQualityAfterQuestions: 7.0  // Alert if <7.0/10
};

// Monitoring function
async function checkAlerts() {
  const metrics = await getDialogueMetrics();

  if (metrics.questionAbandonmentRate > ALERT_THRESHOLDS.questionAbandonmentRate) {
    alert('Dialogue: High question abandonment rate', {
      current: metrics.questionAbandonmentRate,
      threshold: ALERT_THRESHOLDS.questionAbandonmentRate
    });
  }

  // ... check other thresholds
}
```

---

## Testing Requirements Enhancements

### Unit Test Structure

```typescript
describe('DialogueManagerAgent', () => {
  let agent: DialogueManagerAgent;
  let config: DialogueManagerConfig;

  beforeEach(() => {
    config = getDefaultConfig();
    agent = new DialogueManagerAgent(config);
  });

  describe('Decision Logic', () => {
    describe('High Confidence (≥0.7)', () => {
      it('should recommend with 3+ critical fields', async () => {
        // Arrange
        const input = createMockInput({
          confidence: 0.82,
          criticalFields: ['recipient', 'interests', 'budget']
        });

        // Act
        const result = await agent.process(input);

        // Assert
        expect(result.mode).toBe('recommend');
        expect(result.proceedWithRecommendations).toBe(true);
        expect(result.questions).toBeUndefined();
        expect(result.reasoning).toContain('High confidence');
      });

      it('should ask with <3 critical fields despite high confidence', async () => {
        const input = createMockInput({
          confidence: 0.82,
          criticalFields: ['recipient']  // Only 1
        });

        const result = await agent.process(input);

        expect(result.mode).toBe('ask');
      });
    });

    describe('Medium Confidence (0.5-0.7)', () => {
      it('should use hybrid mode with 2+ critical fields', async () => {
        // Test implementation
      });

      it('should ask with <2 critical fields', async () => {
        // Test implementation
      });
    });

    describe('Low Confidence (<0.5)', () => {
      it('should always ask questions', async () => {
        // Test implementation
      });
    });

    describe('Edge Cases', () => {
      it('should enforce max turns (3)', async () => {
        const input = createMockInput({
          confidence: 0.2,  // Low confidence
          conversationHistory: [
            { turnNumber: 1, askedQuestions: ['budget'] },
            { turnNumber: 2, askedQuestions: ['interests'] },
            { turnNumber: 3, askedQuestions: ['occasion'] }
          ]
        });

        const result = await agent.process(input);

        expect(result.mode).toBe('recommend');
        expect(result.reasoning).toContain('Maximum conversation turns');
      });

      it('should handle missing conversation history', async () => {
        // Test implementation
      });

      it('should handle undefined confidence', async () => {
        // Test implementation
      });
    });
  });

  describe('Performance', () => {
    it('should complete within performance budget (300ms)', async () => {
      const input = createMockInput({ confidence: 0.5 });

      const startTime = Date.now();
      await agent.process(input);
      const elapsedMs = Date.now() - startTime;

      expect(elapsedMs).toBeLessThan(PERFORMANCE_BUDGETS.dialogueManager);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to recommend mode on question generation error', async () => {
      // Mock question generation to throw error
      jest.spyOn(agent as any, 'generateQuestions').mockImplementation(() => {
        throw new QuestionGenerationError('Test error');
      });

      const input = createMockInput({ confidence: 0.3 });
      const result = await agent.process(input);

      expect(result.mode).toBe('recommend');
      expect(result.reasoning).toContain('technical issue');
    });
  });
});

// Helper functions
function createMockInput(overrides: Partial<{
  confidence: number;
  criticalFields: string[];
  conversationHistory: ConversationTurn[];
}>): DialogueManagerInput {
  return {
    listenerOutput: {
      confidence: overrides.confidence || 0.5,
      recipient: overrides.criticalFields?.includes('recipient') ? { relationshipType: 'mom' } : undefined,
      interests: overrides.criticalFields?.includes('interests') ? ['cooking'] : [],
      budget: overrides.criticalFields?.includes('budget') ? { min: 50, max: 100 } : undefined,
      // ... other fields
    },
    memoryOutput: createMockMemoryOutput(),
    conversationHistory: overrides.conversationHistory || []
  };
}
```

---

## Documentation Requirements

### 1. Architecture Decision Records (ADRs)

Create ADRs for major decisions:

**ADR-001: DialogueManager Pattern**
- Context: Need to decide when to ask questions vs show recommendations
- Decision: DialogueManager agent with confidence-based routing
- Alternatives considered: LLM-based decision, rule-based in orchestrator
- Consequences: New agent, more complexity, better UX

**ADR-002: Template-based Question Generation**
- Context: Questions need to be consistent and fast
- Decision: Use templates instead of LLM generation
- Alternatives: LLM-generated questions, hybrid approach
- Consequences: Faster, cheaper, less natural (can iterate)

**ADR-003: Discriminated Union Types**
- Context: Need type safety for mode-dependent properties
- Decision: Use discriminated unions for DialogueManagerOutput
- Alternatives: Optional properties, separate types
- Consequences: Better type safety, impossible states unrepresentable

### 2. Runbook for Production

**Runbook: DialogueManager Issues**

**Issue**: High question abandonment rate
- **Detection**: Alert fires when abandonment >30%
- **Investigation**:
  1. Check question phrasing (are they too complex?)
  2. Check number of questions (are we asking too many?)
  3. Check question relevance (are they pertinent?)
- **Resolution**:
  1. Reduce max questions from 3 to 2
  2. Adjust confidence thresholds to ask less frequently
  3. Review and improve question templates

**Issue**: DialogueManager errors
- **Detection**: Error rate >5% alert
- **Investigation**:
  1. Check error logs for error types
  2. Check circuit breaker state
  3. Check Neo4j connection
- **Resolution**:
  1. If circuit open: Wait for reset or manual reset
  2. If Neo4j issue: Check connection, restart if needed
  3. If code issue: Rollback feature flag, investigate

---

## Summary of Enhancements

### Must Implement (P0)
1. ✅ Discriminated union types for all mode-dependent outputs
2. ✅ Performance budgets with enforcement and monitoring
3. ✅ Circuit breaker pattern for error recovery
4. ✅ Structured logging with consistent format
5. ✅ Input/output validation for all agents

### Should Implement (P1)
6. ✅ Configuration externalization (thresholds, limits)
7. ✅ Question template registry system
8. ✅ State machine for conversation flow
9. ✅ Deep merge utility for answer merging
10. ✅ Comprehensive metrics collection

### Nice to Have (P2)
11. ✅ ADR documentation
12. ✅ Production runbook
13. ✅ Dynamic answer generators
14. ✅ Advanced question prioritization

---

**Document Version**: 1.0
**Created**: November 18, 2025
**Owner**: Engineering Manager Agent
**Next Review**: After Phase 1 implementation
