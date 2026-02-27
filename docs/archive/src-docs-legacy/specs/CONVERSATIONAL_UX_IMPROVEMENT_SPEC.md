# Feature Specification: Conversational UX Improvement
## Human-Like Gift Recommendation Dialogue System

**Version**: 1.0
**Date**: November 18, 2025
**Author**: Product Manager Agent
**Status**: Draft for Engineering Review

---

## Executive Summary

Transform Present-Agent2 from a "recommendation engine that responds" into a "knowledgeable gift expert that converses" by implementing intelligent dialogue management that knows when to ask clarifying questions versus when to provide recommendations with confidence.

**Target Outcome**: Users should feel like they're talking to a thoughtful friend who asks smart questions when needed, not a robot that always provides answers regardless of context quality.

---

## 1. Problem Statement

### Current State Issues

Based on analysis of `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/listener.ts`, `/Volumes/Crucial X8/Code/Present-Agent2/frontend/app/page.tsx`, and test results, the system currently:

1. **Always returns recommendations**, even when:
   - Query is extremely vague ("gift for dad")
   - Critical context is missing (no budget, no interests)
   - Confidence scores are low (< 0.3)
   - Results show poor relevance (2-3/10 scores in testing)

2. **Never asks clarifying questions** despite:
   - Having `ambiguities` detection in ListenerOutput
   - Having `suggestedClarification` fields defined
   - Confidence scoring system (0-1 scale)
   - Recognition of missing critical information

3. **Poor user outcomes** from test results:
   - 33% success rate in persona testing
   - 4.3/10 average relevance score
   - Users receiving "Sustainable Hiking Daypack" for gardening mom
   - Users receiving "Eco-Friendly Yoga Mat" for grilling dad

### Root Cause Analysis

```typescript
// Current Flow (orchestrator.ts lines 51-143)
User Query → Listener → Memory → ... → Explorer → Validator → Presenter
                                                                    ↓
                                                          ALWAYS shows results
```

The system has no "gate" between extraction and recommendation that decides: **"Should we ask questions or show products?"**

### User Impact

**Negative Outcomes**:
- Users lose trust when recommendations are clearly irrelevant
- Users don't know system needs more information
- Users waste time browsing bad suggestions
- Users abandon the system ("it doesn't understand me")

**Missed Opportunities**:
- System already extracts rich context (14 gift attributes, life context, intent signals)
- System already calculates confidence scores
- System already identifies ambiguities
- We just don't ACT on this intelligence

---

## 2. Product Vision Alignment

From `/Volumes/Crucial X8/Code/Present-Agent2/docs/product_vision.md`:

### Core Assumptions We're Addressing

✅ **"Can we use deep learning to provide 3 very relevant gift options over the course of a short conversation?"**
- Currently: We try to do it in ONE turn, even when context is insufficient
- Improved: We use conversation to gather enough context for relevance

✅ **"Conversational UI collects better attributes and preferences"**
- Currently: We extract what's given but never ask for more
- Improved: We proactively collect missing critical attributes

✅ **"Be transparent on the process and invite users to adjust, give more feedback"**
- Currently: We just show results
- Improved: We explain what we know, what we need, and invite refinement

### Measurement Alignment

Current metrics from product vision:
- **Overall recommendation relevance** - We're at 4.3/10 (CRITICAL)
- **Time/words to get to relevant recommendation** - One long query often fails
- **Perceived relevance** - Low (33% success rate)
- **Intention to return** - Unknown, but likely low with current quality

---

## 3. Solution Design

### 3.1 Core Concept: The Dialogue Gate

Insert an intelligent "Dialogue Manager" agent between Listener and downstream agents:

```
User Query → Listener → [NEW] DialogueManager → Decision Branch
                              ↓
                    ┌─────────┴──────────┐
                    ↓                    ↓
              ASK MODE              RECOMMEND MODE
        (Clarifying Questions)    (Full Pipeline → Products)
```

### 3.2 Decision Framework

The DialogueManager evaluates multiple signals to decide mode:

#### Signal 1: Confidence Score
From `listener.ts` (lines 197-286), we already calculate 0-1 confidence:

```typescript
// Confidence Thresholds (research-backed)
CONFIDENT_THRESHOLD = 0.7    // Strong candidate for recommendation
UNCERTAIN_THRESHOLD = 0.3    // Probably not good enough
```

**Decision Logic**:
- **≥ 0.7**: Proceed to recommendations (high confidence)
- **0.3 - 0.7**: Ask 1-2 targeted questions (partial context)
- **< 0.3**: Ask 2-3 essential questions (insufficient context)

#### Signal 2: Critical Field Coverage

Essential fields for gift recommendations:
```typescript
interface CriticalContext {
  recipient: {
    relationshipType: boolean;  // WHO (essential)
    interests: boolean;         // WHAT THEY LIKE (essential)
  };
  occasion?: boolean;           // WHY (helpful)
  budget: boolean;              // HOW MUCH (essential)
}
```

**Decision Logic**:
- Missing 0-1 critical fields + confidence > 0.5 → Recommend with caveats
- Missing 2+ critical fields → Ask questions
- All critical fields present + confidence > 0.7 → Recommend confidently

#### Signal 3: Ambiguity Detection

The Listener already identifies ambiguities (lines 116-121):
```typescript
ambiguities?: Array<{
  field: string;
  issue: string;
  suggestedClarification?: string;
}>
```

**Decision Logic**:
- 0 ambiguities → Proceed normally
- 1-2 ambiguities + confidence > 0.6 → Recommend, mention assumptions
- 3+ ambiguities → Ask clarifying questions
- Any "high-impact" ambiguity (budget unclear by 2x+ range) → Ask

#### Signal 4: Intent Signal Conflicts

From `types/agents.ts` (lines 81-89):
```typescript
intentSignals?: {
  safe: boolean;        // "can't go wrong"
  unique: boolean;      // "different", "nobody else will give"
  practical: boolean;   // "useful", "will use"
  sentimental: boolean; // "meaningful", "from the heart"
}
```

**Decision Logic**:
- Conflicting signals (safe + unique, practical + sentimental) → Ask user to prioritize
- Clear singular intent → Proceed to recommend

### 3.3 Question Generation Strategy

#### A. Question Types

**Type 1: Essential Information Gap**
```
Missing: Budget
Question: "What's your budget range for this gift?"
Suggested answers: ["Under $50", "$50-$100", "$100-$200", "Above $200"]
```

**Type 2: Interest Refinement**
```
Detected: "loves music"
Question: "What kind of music are they into?"
Suggested answers: ["Rock/Alternative", "Classical", "Jazz/Blues", "Electronic/Dance", "Hip-Hop/R&B"]
```

**Type 3: Ambiguity Resolution**
```
Detected: "something special"
Question: "When you say 'special,' what matters most?"
Suggested answers: ["Something unique they won't find elsewhere", "Something meaningful and personal", "Something high-quality and luxurious", "Something practical they'll use daily"]
```

**Type 4: Intent Clarification**
```
Detected: Conflicting signals (practical + unique)
Question: "I see you want something practical but also unique. Which is more important?"
Suggested answers: ["Practical first, uniqueness is a bonus", "Unique first, but should be useful", "Both equally important"]
```

**Type 5: Constraint Confirmation**
```
Detected: Possible constraint ("small apartment")
Question: "I noticed they live in a small space. Should I avoid bulky items?"
Suggested answers: ["Yes, keep it compact", "Small is ok, just not huge", "Size doesn't matter"]
```

#### B. Question Prioritization

When multiple questions possible, prioritize by impact:

1. **Budget** (if completely missing) - Highest impact on filtering
2. **Relationship type** (if unclear) - Affects appropriateness boundaries
3. **Core interests** (if vague/absent) - Drives product matching
4. **Intent/Philosophy** (if conflicting) - Shapes recommendation direction
5. **Occasion** (if missing) - Affects urgency and context

**Maximum questions per turn**: 3 (research shows diminishing returns after 3)

#### C. Question Format Best Practices

Based on research (see Web Search results), effective patterns:

**✅ DO: Ask with suggested answers**
```
Question: "What's their main hobby?"
Suggested: ["Outdoor activities", "Arts & crafts", "Cooking/food", "Tech & gaming", "Something else"]
```
Reduces cognitive load, guides user, enables quick taps/clicks.

**✅ DO: State assumptions upfront**
```
"I'm thinking practical gifts around $50-100 for a close friend.
Should I adjust anything?"
[Yes, change budget] [Yes, show unique items] [No, looks good]
```
Faster than asking 3 separate questions, user corrects only what's wrong.

**❌ DON'T: Ask open-ended follow-ups repeatedly**
```
"Tell me more about them..."
"What else?"
"Anything else I should know?"
```
Feels like interrogation, users don't know what's relevant.

**❌ DON'T: Ask obvious questions**
```
User: "Birthday gift for my wife"
System: "What's your relationship to them?"  // Obviously wife!
```
Breaks immersion, feels robotic.

### 3.4 Conversation Flow Examples

#### Example 1: High Confidence → Direct Recommendation

**User**: "Birthday gift for my tech-savvy brother who loves gaming and mechanical keyboards, budget $100-150"

**System Analysis**:
```typescript
{
  confidence: 0.82,
  criticalFieldsCovered: 4/4,
  ambiguities: 0,
  intentSignals: { practical: true }
}
```

**System Response**:
```
Great! I've found some excellent gaming and keyboard accessories for your brother...

1. Custom Keycap Set ($89)
   Perfect for mechanical keyboard enthusiasts...

2. RGB Gaming Mouse Pad ($45)
   Complements his setup...
```

**Rationale**: All critical context present, high confidence, clear intent.

---

#### Example 2: Medium Confidence → Ask + State Assumptions

**User**: "gift for dad who likes coffee, around $50"

**System Analysis**:
```typescript
{
  confidence: 0.55,
  criticalFieldsCovered: 3/4,  // Missing occasion
  ambiguities: [
    { field: "interest_level", issue: "How serious is he about coffee?" }
  ]
}
```

**System Response**:
```
I can help find a great coffee gift for your dad! Quick question to get this just right:

Is he a casual coffee drinker or more of a coffee enthusiast?
[Casual - morning coffee] [Enthusiast - tries different beans/methods]

I'm thinking practical gifts around $50 - let me know if I should adjust!
```

**Rationale**: Good context, but interest level affects whether to show basic accessories or specialty equipment.

---

#### Example 3: Low Confidence → Ask Essential Questions

**User**: "need something for my coworker"

**System Analysis**:
```typescript
{
  confidence: 0.22,
  criticalFieldsCovered: 1/4,  // Only relationship type
  ambiguities: [
    { field: "budget", issue: "no budget specified" },
    { field: "interests", issue: "no interests mentioned" },
    { field: "occasion", issue: "unclear occasion" }
  ]
}
```

**System Response**:
```
I'd love to help find the perfect gift! To give you the best recommendations, I need a bit more info:

1. What's your budget range?
   [Under $25] [$25-$50] [$50-$100] [Above $100]

2. What's the occasion?
   [Birthday] [Work anniversary] [Thank you] [Holiday] [Just because]

3. What are they into?
   [Type their interests, or pick: Coffee/Tea, Desk accessories, Foodie, Wellness, Tech]
```

**Rationale**: Insufficient context - asking questions is better than showing random products.

---

#### Example 4: Conflicting Signals → Clarify Intent

**User**: "unique birthday gift for mom who's hard to shop for, under $100, needs to be practical since she's downsizing"

**System Analysis**:
```typescript
{
  confidence: 0.65,
  criticalFieldsCovered: 3/4,
  ambiguities: [],
  intentSignals: {
    unique: true,      // CONFLICT
    practical: true,   // CONFLICT
    safe: true         // "hard to shop for"
  },
  lifeContext: { livingSituation: "downsizing" }
}
```

**System Response**:
```
I see your mom is downsizing, so you want something practical but also unique. Let me make sure I understand:

What matters most for this gift?
[Unique & special (practical is a bonus)]
[Practical first (but still thoughtful)]
[Both equally - something everyday but distinctive]

Also noting: hard to shop for. Should I play it safe or take a small creative risk?
[Safe bet] [Moderately creative] [Surprise her!]
```

**Rationale**: Conflicting intent signals - better to clarify than guess wrong.

---

#### Example 5: Ambiguous Interest → Refine

**User**: "christmas gift for nephew who loves music, $30-60"

**System Analysis**:
```typescript
{
  confidence: 0.58,
  criticalFieldsCovered: 4/4,
  ambiguities: [
    {
      field: "interest_specificity",
      issue: "music is broad - instrument player? listener? collector?"
    }
  ],
  enhancedInterests: {
    explicit: [{ interest: "music", level: "unknown" }]
  }
}
```

**System Response**:
```
Music gifts for your nephew - great! Quick question to narrow it down:

How does he engage with music?
[Plays an instrument] [Listens/collects (vinyl, merch)] [Makes music (production)] [Multiple/All of the above]

Also, how old is he?
[Under 13] [Teen 13-17] [Young adult 18-25] [Adult 25+]
```

**Rationale**: "Music" is too broad - a guitarist needs different gifts than a vinyl collector.

---

### 3.5 Hybrid Mode: Recommendations + Invitation to Refine

For borderline cases (confidence 0.6-0.7), we can do BOTH:

**System Response**:
```
Based on what you've told me, here are some ideas for your dad:

1. Premium Pour-Over Coffee Set ($58)
   Great for someone who enjoys the ritual of brewing

2. Coffee Subscription - 3 Months ($65)
   Discover new roasts monthly

3. Espresso Shot Glass Set ($35)
   Functional and fun for coffee lovers

Not quite right? I can refine these if you tell me:
- Is he more into hot coffee or espresso?
- Does he already have brewing equipment?
- Any specific coffee preferences (roast, origin)?
```

**Benefits**:
- Provides immediate value (impatient users can pick)
- Invites refinement (quality-focused users can iterate)
- Demonstrates understanding ("here's what I think I know")
- Natural conversation flow

---

## 4. Technical Implementation

### 4.1 New Agent: DialogueManager

**Location**: `/Volumes/Crucial X8/Code/Present-Agent2/src/services/agents/dialogue-manager.ts`

```typescript
export interface DialogueManagerInput {
  listenerOutput: ListenerOutput;
  memoryOutput?: MemoryOutput; // Optional: check if we've asked before
  conversationHistory?: ConversationTurn[];
}

export interface DialogueManagerOutput {
  mode: 'ask' | 'recommend' | 'hybrid';

  // When mode = 'ask'
  questions?: ClarifyingQuestion[];

  // When mode = 'hybrid'
  proceedWithRecommendations: boolean;
  questionsForRefinement?: ClarifyingQuestion[];

  // Context about the decision
  reasoning: string;
  confidenceAssessment: {
    overallConfidence: number;
    criticalFieldsCovered: string[];
    criticalFieldsMissing: string[];
    highImpactAmbiguities: string[];
  };
}

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
  priority: number; // 1 = highest
  impactOnConfidence: number; // How much this would improve confidence
}
```

#### Core Logic

```typescript
class DialogueManagerAgent extends BaseAgent<DialogueManagerInput, DialogueManagerOutput> {

  async process(input: DialogueManagerInput): Promise<DialogueManagerOutput> {
    const { listenerOutput, conversationHistory } = input;

    // 1. Assess current context quality
    const assessment = this.assessContext(listenerOutput);

    // 2. Check conversation history (don't ask same questions twice)
    const askedBefore = this.getAskedQuestions(conversationHistory);

    // 3. Generate potential clarifying questions
    const potentialQuestions = this.generateQuestions(listenerOutput, assessment);

    // 4. Filter out already-asked questions
    const newQuestions = potentialQuestions.filter(q =>
      !askedBefore.includes(q.field)
    );

    // 5. Decide mode
    const decision = this.decide(assessment, newQuestions);

    return decision;
  }

  private assessContext(listener: ListenerOutput): ConfidenceAssessment {
    const critical = {
      relationshipType: !!listener.recipient?.relationshipType,
      interests: (listener.interests?.length || 0) > 0,
      budget: !!listener.budget && listener.budget.max > 0,
      occasion: !!listener.occasion
    };

    const covered = Object.values(critical).filter(Boolean).length;
    const missing = Object.entries(critical)
      .filter(([_, present]) => !present)
      .map(([field]) => field);

    const highImpactAmbiguities = (listener.ambiguities || [])
      .filter(a => ['budget', 'interests', 'relationshipType'].includes(a.field))
      .map(a => a.field);

    return {
      overallConfidence: listener.confidence,
      criticalFieldsCovered: covered,
      criticalFieldsMissing: missing,
      highImpactAmbiguities
    };
  }

  private decide(
    assessment: ConfidenceAssessment,
    questions: ClarifyingQuestion[]
  ): DialogueManagerOutput {

    const { overallConfidence, criticalFieldsCovered } = assessment;

    // Decision tree based on research thresholds

    // HIGH CONFIDENCE: Recommend directly
    if (overallConfidence >= 0.7 && criticalFieldsCovered >= 3) {
      return {
        mode: 'recommend',
        proceedWithRecommendations: true,
        reasoning: 'High confidence with sufficient critical context'
      };
    }

    // MEDIUM CONFIDENCE: Hybrid mode
    if (overallConfidence >= 0.5 && overallConfidence < 0.7
        && criticalFieldsCovered >= 2) {
      const topQuestions = this.prioritizeQuestions(questions).slice(0, 2);
      return {
        mode: 'hybrid',
        proceedWithRecommendations: true,
        questionsForRefinement: topQuestions,
        reasoning: 'Medium confidence - show recommendations with refinement option'
      };
    }

    // LOW CONFIDENCE: Ask questions
    if (overallConfidence < 0.5 || criticalFieldsCovered < 2) {
      const topQuestions = this.prioritizeQuestions(questions).slice(0, 3);
      return {
        mode: 'ask',
        questions: topQuestions,
        proceedWithRecommendations: false,
        reasoning: 'Insufficient context - need more information'
      };
    }

    // Default: err on side of asking
    return {
      mode: 'ask',
      questions: this.prioritizeQuestions(questions).slice(0, 2),
      reasoning: 'Borderline confidence - gathering more context'
    };
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
    if (listener.interests.length === 0) {
      questions.push({
        id: 'interests',
        type: 'essential',
        field: 'interests',
        question: "What are they passionate about or interested in?",
        suggestedAnswers: [
          { label: "Food & cooking", value: "cooking" },
          { label: "Outdoor & nature", value: "outdoors" },
          { label: "Arts & crafts", value: "arts" },
          { label: "Tech & gaming", value: "tech" },
          { label: "Sports & fitness", value: "sports" },
          { label: "Music & entertainment", value: "music" }
        ],
        priority: 2,
        impactOnConfidence: 0.20
      });
    }

    // Compound interest refinement
    if (listener.interests.some(i => ['music', 'sports', 'art'].includes(i.toLowerCase()))) {
      const vague = listener.interests.find(i => ['music', 'sports', 'art'].includes(i.toLowerCase()));
      questions.push({
        id: `refine_${vague}`,
        type: 'refinement',
        field: 'interests',
        question: `You mentioned ${vague} - can you be more specific?`,
        suggestedAnswers: this.getRefinementOptionsFor(vague),
        priority: 4,
        impactOnConfidence: 0.12
      });
    }

    // Intent clarification (if conflicting)
    if (listener.intentSignals) {
      const conflicts = this.detectIntentConflicts(listener.intentSignals);
      if (conflicts.length > 0) {
        questions.push({
          id: 'intent_priority',
          type: 'intent',
          field: 'intentSignals',
          question: `I see you want both ${conflicts[0]} and ${conflicts[1]}. Which is more important?`,
          suggestedAnswers: [
            { label: `${conflicts[0]} first`, value: conflicts[0] },
            { label: `${conflicts[1]} first`, value: conflicts[1] },
            { label: "Both equally", value: 'both' }
          ],
          priority: 3,
          impactOnConfidence: 0.10
        });
      }
    }

    // Use detected ambiguities
    (listener.ambiguities || []).forEach((amb, idx) => {
      if (amb.suggestedClarification) {
        questions.push({
          id: `ambiguity_${idx}`,
          type: 'ambiguity',
          field: amb.field,
          question: amb.suggestedClarification,
          suggestedAnswers: this.generateAnswersForAmbiguity(amb),
          priority: 5,
          impactOnConfidence: 0.08
        });
      }
    });

    return questions;
  }

  private prioritizeQuestions(questions: ClarifyingQuestion[]): ClarifyingQuestion[] {
    return questions.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by confidence impact
      return b.impactOnConfidence - a.impactOnConfidence;
    });
  }
}
```

### 4.2 Modified Orchestrator Flow

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/src/services/orchestrator.ts`

```typescript
async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
  // Step 1: Extract context
  const listenerOutput = await this.listenerAgent.process({ ... });

  // Step 2: Recall memory
  const memoryOutput = await this.memoryAgent.process({ ... });

  // NEW Step 3: Dialogue Management Decision
  const dialogueDecision = await this.dialogueAgent.process({
    listenerOutput,
    memoryOutput,
    conversationHistory: this.getHistory(input.sessionId)
  });

  // Branch based on decision
  if (dialogueDecision.mode === 'ask') {
    // Return questions instead of recommendations
    return {
      mode: 'clarifying',
      questions: dialogueDecision.questions,
      partialContext: listenerOutput,
      reasoning: dialogueDecision.reasoning
    };
  }

  if (dialogueDecision.mode === 'hybrid') {
    // Continue to recommendations AND prepare refinement questions
    const recommendations = await this.continueRecommendationPipeline(memoryOutput);
    return {
      mode: 'recommendations_with_refinement',
      recommendations,
      refinementQuestions: dialogueDecision.questionsForRefinement
    };
  }

  // Normal flow: proceed to recommendations
  return this.continueRecommendationPipeline(memoryOutput);
}
```

### 4.3 Frontend Changes

#### A. Chat Interface Updates

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/frontend/app/page.tsx`

Add support for rendering questions:

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  recommendations?: Recommendation[];

  // NEW: Clarifying questions
  questions?: ClarifyingQuestion[];
  questionResponseHandler?: (answers: Record<string, any>) => void;
}
```

UI Component for questions:

```tsx
function ClarifyingQuestionBlock({ questions, onAnswer }) {
  const [answers, setAnswers] = useState({});

  return (
    <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
      <p className="text-sm font-medium">Help me find the perfect gift:</p>

      {questions.map(q => (
        <div key={q.id} className="space-y-2">
          <label className="text-sm font-medium">{q.question}</label>
          <div className="flex flex-wrap gap-2">
            {q.suggestedAnswers.map(answer => (
              <button
                key={answer.label}
                onClick={() => setAnswers({ ...answers, [q.id]: answer.value })}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border",
                  answers[q.id] === answer.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                {answer.label}
              </button>
            ))}
          </div>
          {answer.description && (
            <p className="text-xs text-muted-foreground">{answer.description}</p>
          )}
        </div>
      ))}

      <Button
        onClick={() => onAnswer(answers)}
        disabled={Object.keys(answers).length === 0}
      >
        Continue
      </Button>
    </div>
  );
}
```

#### B. Multi-Turn Conversation Handling

Track conversation turns in session:

```typescript
const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);

function handleQuestionResponse(answers: Record<string, any>) {
  // Append answers to conversation context
  const enrichedQuery = buildEnrichedQuery(originalQuery, answers);

  // Re-submit with enriched context
  handleSubmit(enrichedQuery, {
    previousContext: lastListenerOutput,
    clarifications: answers
  });
}
```

### 4.4 Backend API Changes

**File**: `/Volumes/Crucial X8/Code/Present-Agent2/src/server.ts` (or Next.js API route)

```typescript
// POST /api/chat
async function handleChat(req, res) {
  const { query, userId, sessionId, clarifications } = req.body;

  // If clarifications provided, merge with previous context
  const input = clarifications
    ? mergeWithClarifications(query, clarifications, sessionId)
    : { userQuery: query, userId, sessionId };

  const result = await orchestrator.execute(input);

  // Different response shapes based on mode
  if (result.mode === 'clarifying') {
    return res.json({
      type: 'questions',
      questions: result.questions,
      context: result.partialContext,
      reasoning: result.reasoning
    });
  }

  if (result.mode === 'recommendations_with_refinement') {
    return res.json({
      type: 'recommendations',
      recommendations: result.recommendations,
      refinementQuestions: result.refinementQuestions,
      intro: "Here are some ideas based on what you've told me..."
    });
  }

  // Normal recommendation response
  return res.json({
    type: 'recommendations',
    recommendations: result.recommendations,
    intro: result.intro
  });
}
```

### 4.5 Conversation State Management

Store conversation turns to avoid re-asking questions:

```typescript
interface ConversationTurn {
  turnNumber: number;
  userInput: string;
  listenerOutput: ListenerOutput;
  dialogueDecision: DialogueManagerOutput;
  askedQuestions: string[];  // Field IDs
  receivedAnswers: Record<string, any>;
  recommendationsShown: boolean;
}

// In Neo4j or session storage
CREATE (turn:ConversationTurn {
  sessionId: $sessionId,
  turnNumber: $turnNumber,
  timestamp: datetime(),
  askedQuestions: $askedQuestions,
  confidence: $confidence
})
-[:PART_OF]->(session:Session {id: $sessionId})
```

---

## 5. User Flows

### 5.1 Flow A: Vague Query → Questions → Recommendations

```
User: "gift for dad"

System (Analysis):
- Confidence: 0.18
- Missing: budget, interests, occasion
- Decision: ASK MODE

System (Response):
"I'd love to help find something great for your dad! To give you the
best recommendations, I need a bit more info:

1. What's your budget range?
   [Under $25] [$25-$50] [$50-$100] [Above $100]

2. What are his main interests or hobbies?
   [Type here, or pick: Sports, Tech, Outdoors, Food/Cooking, DIY/Tools]

3. What's the occasion?
   [Birthday] [Father's Day] [Just because] [Holiday]"

User: [Selects "$50-$100", types "grilling and craft beer", selects "Birthday"]

System (Re-Analysis):
- Confidence: 0.76
- Has: budget, interests, occasion, relationship
- Decision: RECOMMEND MODE

System (Response):
"Perfect! Here are some thoughtful birthday gifts for a grilling and
craft beer enthusiast:

1. Premium BBQ Spice Set with Beer Pairing Guide ($68)
   Combines both his passions...

2. Craft Beer Tasting Journal ($42)
   Track favorite brews and grilling experiments...

3. Cedar Grilling Planks + IPA Gift Box ($89)
   Complete grilling experience..."
```

### 5.2 Flow B: Detailed Query → Direct Recommendations

```
User: "Birthday gift for my 8-year-old nephew who's obsessed with
dinosaurs and loves building things with Lego, budget $40-60"

System (Analysis):
- Confidence: 0.84
- Has: relationship, age, interests (specific), budget, occasion
- Missing: None critical
- Decision: RECOMMEND MODE

System (Response):
"Great! I've found some awesome dinosaur and building gifts for your nephew:

1. Lego Creator 3-in-1 Dinosaur Set ($54)
   Build 3 different dinosaurs - perfect combo of his interests!

2. Dinosaur Excavation Kit ($38)
   Dig up and assemble T-Rex skeleton - building + learning

3. Magna-Tiles Dinosaur Expansion Set ($59)
   Magnetic building with dinosaur figures..."
```

### 5.3 Flow C: Medium Detail → Hybrid Mode

```
User: "Anniversary gift for wife who loves wine and reading, around $100"

System (Analysis):
- Confidence: 0.62
- Has: relationship, interests (vague), budget, occasion
- Ambiguity: What kind of wine? What genres of reading?
- Decision: HYBRID MODE

System (Response):
"Here are some thoughtful anniversary ideas combining her love of wine and reading:

1. Wine & Book Pairing Subscription Box ($95/month)
   Curated wine with matched book recommendations

2. Personalized Wine Journal + Bookmark Set ($78)
   Track tasting notes, includes leather bookmarks

3. Wine Country Novel Collection + Bottle ($105)
   Set in Napa, includes featured wine

---
Want more personalized picks? Quick questions:
- Red wine, white, or both? [Red] [White] [Both/Varied]
- Fiction or non-fiction reader? [Fiction] [Non-fiction] [Both]"
```

### 5.4 Flow D: Conflicting Intent → Clarify First

```
User: "Unique practical gift for mom who's downsizing, $50-100,
needs to be special but not clutter"

System (Analysis):
- Confidence: 0.68
- Has: relationship, budget, constraints
- Conflict: unique vs practical vs minimal
- Decision: ASK MODE (clarify intent before recommending)

System (Response):
"I understand you want something special for your mom as she's downsizing.
Let me make sure I get this right:

1. What matters most for this gift?
   [Uniqueness - something she won't find elsewhere]
   [Practical - useful in her daily life]
   [Both - practical but distinctive]

2. Since she's downsizing, what type of gift works best?
   [Consumable/Experience - no space needed]
   [Small but meaningful - takes little room]
   [Digital/Subscription - completely space-free]"

User: [Selects "Both - practical but distinctive", "Consumable/Experience"]

System (Response):
"Perfect! Here are some distinctive, space-free gifts:

1. Monthly Flower Delivery Service - 3 Months ($95)
   Fresh blooms, no storage needed, brightens her new space

2. Premium Olive Oil & Vinegar Tasting Set ($68)
   Gourmet, practical for cooking, beautifully packaged

3. Online Watercolor Class + Supplies Starter Kit ($89)
   Experience + minimal materials for a creative hobby..."
```

---

## 6. Acceptance Criteria

### 6.1 Functional Requirements

✅ **FR1: Confidence-Based Routing**
- [ ] System calculates confidence score for every query (existing)
- [ ] System routes to ASK mode when confidence < 0.5
- [ ] System routes to HYBRID mode when confidence 0.5-0.7
- [ ] System routes to RECOMMEND mode when confidence ≥ 0.7
- [ ] Routing logic accounts for critical field coverage (minimum 2/4)

✅ **FR2: Question Generation**
- [ ] System generates 1-3 prioritized questions when in ASK mode
- [ ] Questions include suggested answers (not open-ended)
- [ ] Essential questions (budget, interests) prioritized over refinement
- [ ] System never asks same question twice in a session
- [ ] Questions leverage existing ambiguities array from Listener

✅ **FR3: Multi-Turn Conversation**
- [ ] System stores conversation turns in session
- [ ] System merges clarification answers with original query
- [ ] System re-evaluates confidence after receiving clarifications
- [ ] System proceeds to recommendations once confidence threshold met
- [ ] Maximum 3 question rounds before forcing recommendations

✅ **FR4: Hybrid Mode**
- [ ] System shows recommendations when confidence 0.5-0.7
- [ ] System includes 1-2 refinement questions with recommendations
- [ ] User can accept recommendations OR answer questions for better results
- [ ] Refinement questions are optional, not blocking

✅ **FR5: Frontend Question UI**
- [ ] Questions render as selectable buttons (not text input)
- [ ] Multiple questions show in single response (max 3)
- [ ] User can select answers and submit all at once
- [ ] UI shows which questions are essential vs optional
- [ ] UI provides "Skip and show me anything" escape hatch

### 6.2 Quality Requirements

✅ **QR1: Improved Relevance**
- [ ] Recommendations after clarification have ≥ 7/10 relevance (vs current 4.3/10)
- [ ] Success rate ≥ 70% (vs current 33%)
- [ ] Interest match accuracy ≥ 80% (vs current 47%)

✅ **QR2: Human-Like Conversation**
- [ ] Questions sound natural, not robotic ("What's your budget?" not "Please specify budget parameter")
- [ ] System explains WHY it's asking ("To give you the best recommendations...")
- [ ] Tone is friendly, not interrogative
- [ ] System acknowledges user's input before asking questions

✅ **QR3: Efficiency**
- [ ] Average questions to recommendation: ≤ 2 rounds
- [ ] 80%+ of queries resolved in 1-2 turns
- [ ] Total time to final recommendations: < 45 seconds (including question answering)

✅ **QR4: Non-Regression**
- [ ] High-confidence queries (≥0.7) skip questions entirely (no added friction)
- [ ] Response time for direct recommendations unchanged
- [ ] Existing recommendation quality maintained for detailed queries

### 6.3 Edge Cases

✅ **EC1: User Ignores Questions**
- [ ] System provides "Show me anything" option
- [ ] After 3 ignored question prompts, system shows best-effort recommendations
- [ ] System explains these are "broad suggestions" due to limited context

✅ **EC2: User Provides Irrelevant Answers**
- [ ] System gracefully handles non-sensical selections
- [ ] System can re-ask with different phrasing if answer creates more ambiguity

✅ **EC3: User Answers "Other" for All Questions**
- [ ] System provides text input fallback for "Other" selections
- [ ] System integrates free-text answers back into Listener extraction

✅ **EC4: Infinite Loop Prevention**
- [ ] Maximum 3 rounds of questions per session
- [ ] After 3 rounds, system MUST show recommendations regardless of confidence
- [ ] System tracks asked questions to prevent repetition

✅ **EC5: User Starts Over Mid-Conversation**
- [ ] "Start new search" button clears conversation context
- [ ] New query creates new session ID
- [ ] Previous context not leaked into new search

---

## 7. Success Metrics

### 7.1 Primary Metrics (Must Improve)

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| **Recommendation Relevance** | 4.3/10 | ≥7.0/10 | Persona test scoring |
| **Success Rate** | 33% | ≥70% | % of tests meeting expectations |
| **Interest Match Accuracy** | 47% | ≥80% | % of recommendations matching stated interests |

### 7.2 Secondary Metrics (Track for Insights)

| Metric | Description | Target |
|--------|-------------|--------|
| **Question Engagement Rate** | % of users who answer when asked | ≥75% |
| **Avg Questions Per Session** | How many question rounds needed | ≤2.0 |
| **Confidence After Clarification** | Average confidence after Q&A | ≥0.75 |
| **Time to First Recommendation** | Including question answering | ≤45s |
| **Question Abandonment Rate** | % who bail when asked questions | ≤15% |

### 7.3 Qualitative Metrics

- **"Feels Human"** - Measure via user feedback: "This felt like talking to a knowledgeable friend" (agree/disagree)
- **"Understood My Needs"** - Post-recommendation survey: 1-5 scale
- **"Asked Smart Questions"** - When questions shown: "These questions made sense" (yes/no)

### 7.4 A/B Test Plan

**Control Group**: Current system (always recommends)
**Treatment Group**: New dialogue system

**Split**: 50/50 for 2 weeks

**Primary Success Criterion**:
- Treatment group shows ≥20% improvement in relevance score
- Treatment group success rate ≥60%

**Secondary Signals**:
- No increase in bounce rate (users leaving after questions)
- No degradation for high-confidence queries
- Positive sentiment in qualitative feedback

---

## 8. Technical Considerations

### 8.1 Performance Impact

**New Processing**:
- DialogueManager agent: ~200-500ms (LLM call for question generation)
- Question rendering: ~50ms frontend
- Answer merging: ~100ms

**Total Added Latency**: ~500-700ms per query

**Mitigation**:
- Cache common question templates
- Pre-generate questions for common gaps
- Parallelize DialogueManager with Memory agent (both read from Listener)

### 8.2 Database Schema Changes

**New Node**: ConversationTurn
```cypher
CREATE (turn:ConversationTurn {
  id: "turn-uuid",
  sessionId: "session-uuid",
  turnNumber: 1,
  timestamp: datetime(),
  mode: "ask",  // "ask" | "recommend" | "hybrid"
  askedQuestions: ["budget", "interests"],
  confidence: 0.45
})
```

**New Relationship**: ANSWERED
```cypher
(turn:ConversationTurn)-[:ANSWERED {
  questionId: "budget",
  answer: { min: 50, max: 100 },
  timestamp: datetime()
}]->(nextTurn:ConversationTurn)
```

### 8.3 Backward Compatibility

**Requirement**: Old clients should still work (graceful degradation)

**Approach**:
- API version header: `X-API-Version: 2.0`
- v1 API: Always returns recommendations (current behavior)
- v2 API: Returns questions when needed
- Frontend checks: If `questions` field present, render question UI; else render recommendations

### 8.4 Testing Strategy

**Unit Tests**:
- DialogueManager decision logic (confidence thresholds)
- Question generation for each gap type
- Question prioritization algorithm
- Conversation state merging

**Integration Tests**:
- Full orchestrator flow with DialogueManager
- Multi-turn conversation scenarios
- Answer merging with Listener re-extraction

**User Testing**:
- Persona framework extended with question answering
- Simulated users answer questions programmatically
- Measure improvement in final recommendation quality

---

## 9. Implementation Phases

### Phase 1: Core Dialogue Logic (Week 1)
**Goal**: Get basic ask/recommend routing working

- [ ] Create DialogueManagerAgent class
- [ ] Implement confidence-based decision logic
- [ ] Implement basic question generation (budget, interests)
- [ ] Integrate into Orchestrator
- [ ] Unit tests for DialogueManager

**Success**: CLI can detect low confidence and print questions (even if user can't answer yet)

### Phase 2: Question Templates & Prioritization (Week 1-2)
**Goal**: Comprehensive question coverage

- [ ] Create question templates for all critical fields
- [ ] Implement interest refinement logic (compound interests)
- [ ] Implement intent conflict detection
- [ ] Implement question prioritization algorithm
- [ ] Add conversation history tracking

**Success**: All identified gaps generate appropriate questions

### Phase 3: Frontend Question UI (Week 2)
**Goal**: Users can answer questions

- [ ] Create ClarifyingQuestionBlock component
- [ ] Implement multi-turn conversation state
- [ ] Add answer submission handling
- [ ] Update chat message types
- [ ] Style question UI (mobile-friendly)

**Success**: Users can answer questions and get refined recommendations

### Phase 4: Answer Integration & Re-Evaluation (Week 2-3)
**Goal**: Close the loop

- [ ] Implement answer merging with original query
- [ ] Re-run Listener with enriched context
- [ ] Track asked questions to prevent repetition
- [ ] Implement max rounds limit (3)
- [ ] Add "skip questions" escape hatch

**Success**: Answering questions measurably improves recommendation quality

### Phase 5: Hybrid Mode & Polish (Week 3)
**Goal**: Production-ready UX

- [ ] Implement hybrid mode (recommend + refine)
- [ ] Add conversational transitions ("Great! Now I can show you...")
- [ ] Implement recommendation confidence display
- [ ] Add refinement questions after recommendations
- [ ] Polish question phrasing (copywriting pass)

**Success**: Conversations feel natural and helpful

### Phase 6: Testing & Optimization (Week 4)
**Goal**: Validate improvement

- [ ] Run full persona test suite
- [ ] Measure improvement metrics
- [ ] A/B test with real users (if possible)
- [ ] Optimize question generation performance
- [ ] Add analytics tracking (question engagement, confidence improvement)

**Success**: Metrics show ≥20% improvement in relevance and success rate

---

## 10. Risks & Mitigations

### Risk 1: Users Hate Being Asked Questions
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Always provide "Show me anything" escape hatch
- Limit to maximum 3 questions per turn
- Skip questions entirely for high-confidence queries
- A/B test to measure engagement vs frustration
- Explain WHY we're asking ("To give you the best recommendations...")

### Risk 2: Questions Don't Actually Improve Recommendations
**Likelihood**: Low
**Impact**: Critical
**Mitigation**:
- Validate that answered questions increase confidence
- Measure recommendation quality before/after questions
- If no improvement, question generation logic is broken (needs iteration)
- Start with essential questions only (budget, interests) that we KNOW help

### Risk 3: Too Many Question Rounds (Interrogation Feel)
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Hard limit: 3 rounds maximum
- Prioritize questions by impact (ask highest-value first)
- Track question count and force recommendations if exceeded
- Use hybrid mode when possible (show + refine)

### Risk 4: Performance Degradation
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- DialogueManager is lightweight (mostly logic, one LLM call for templates)
- Parallelize with other agents
- Cache question templates
- Total added latency budget: <1 second

### Risk 5: Implementation Complexity
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Phase implementation (start with simple ask/recommend)
- Extensive unit tests for decision logic
- Clear acceptance criteria for each phase
- Can ship Phase 1-3 as v1, iterate on Phases 4-6

---

## 11. Open Questions & Decisions Needed

### Q1: Should We Use LLM for Question Generation or Templates?
**Options**:
A. Templates (faster, deterministic, cheaper)
B. LLM-generated (more natural, contextual)
C. Hybrid (templates + LLM refinement)

**Recommendation**: Start with A (templates), evaluate B if questions feel robotic

---

### Q2: How Do We Handle "I Don't Know" Answers?
**Example**: "What are they interested in?" → "I don't really know"

**Options**:
A. Treat as missing data, show broad recommendations
B. Ask follow-up: "What do you know about them?" (relationship, age, etc.)
C. Provide "Safe bet" archetype (universally appreciated gifts)

**Recommendation**: C for first version, add B in Phase 5

---

### Q3: Should Mobile UI Show Questions Differently?
**Consideration**: Mobile users may prefer simpler interactions

**Options**:
A. Same UI (button selections)
B. Voice input for answers
C. Swipeable cards for selections

**Recommendation**: A for MVP, consider C as enhancement

---

### Q4: Do We Allow Users to Go Back and Change Answers?
**Scenario**: User answered "Under $50" but realizes they want to spend more

**Options**:
A. No - would need to start new session
B. Yes - show "Edit my answers" button
C. Hybrid - allow edit only before recommendations shown

**Recommendation**: C for simplicity

---

### Q5: How Do We Measure "Human-Like" Objectively?
**Challenge**: Primary goal is subjective

**Options**:
A. User survey after interaction (1-5 scale: "Felt like talking to expert")
B. Conversation length as proxy (longer = more engaged)
C. Follow-up question engagement (users refining = trust)
D. Qualitative feedback analysis (sentiment)

**Recommendation**: A (direct) + C (behavioral proxy)

---

## 12. Appendices

### Appendix A: Research Sources

1. **Conversational AI UX Best Practices (2025)**
   - Source: ExoTel, Medium, AIMultiple
   - Key finding: Prioritize user intent over UI tasks, treat context as gold

2. **Microsoft Azure QnA Confidence Thresholds**
   - Source: Microsoft Learn
   - Key finding: 0.7+ strong, 0.3-0.7 partial, <0.3 not good

3. **Clarifying Questions in Conversational Search**
   - Source: ClariQ Workshop, arXiv
   - Key finding: AI should ask when ambiguous, not presume intent

4. **Prompt UX Patterns**
   - Source: Mario Hayashi blog
   - Key finding: Ask with suggested answers, state assumptions upfront

### Appendix B: Competitive Analysis

**How do competitors handle ambiguous queries?**

| Product | Approach | Our Opportunity |
|---------|----------|-----------------|
| **Amazon Gift Finder** | Shows broad results, relies on filtering | We ask smarter questions upfront |
| **Uncommon Goods Quiz** | 10-question quiz before ANY results | We ask only what we need (1-3 questions) |
| **Giftster** | User must fill form with all fields | We conversationally gather only gaps |
| **ChatGPT for Gifts** | Asks open-ended follow-ups repeatedly | We provide structured, quick options |

**Differentiation**: We balance automation with conversation - asking just enough to be relevant.

### Appendix C: Example Scenarios Matrix

| Query Detail Level | Confidence | Current Behavior | New Behavior | Improvement |
|-------------------|-----------|------------------|--------------|-------------|
| "gift for dad" | 0.18 | Shows random products (yoga mat, coffee) | Asks 3 questions (budget, interests, occasion) | ✅ Prevents bad recs |
| "gift for dad who grills, $50" | 0.58 | Shows OK products but misses nuance | Hybrid: Show + ask "Gas or charcoal grilling?" | ✅ Refines quality |
| "birthday gift for 8yo nephew who loves dinosaurs and Lego, $40-60" | 0.84 | Shows good results | Shows good results (no questions) | ✅ No added friction |
| "something special for mom" | 0.25 | Shows generic "special" gifts | Asks: "What makes it special? [Unique] [Personal] [Luxury] [Practical]" | ✅ Clarifies intent |

---

## 13. Success Criteria Summary

**This feature is successful if**:

1. **Quantitative**:
   - Recommendation relevance improves from 4.3/10 to ≥7.0/10
   - Success rate improves from 33% to ≥70%
   - Interest match accuracy improves from 47% to ≥80%
   - High-confidence queries (≥0.7) see no added latency

2. **Qualitative**:
   - Users describe the experience as "talking to a knowledgeable friend"
   - Questions feel helpful, not interrogative
   - System demonstrates understanding of user's situation

3. **Behavioral**:
   - ≥75% of users engage with questions when asked
   - ≤15% abandon after seeing questions
   - Average ≤2 question rounds to final recommendations

4. **Technical**:
   - No degradation in recommendation quality for detailed queries
   - System never asks same question twice
   - Added latency <1 second per query

---

## 14. Next Steps

**Immediate** (this week):
1. Review this spec with Engineering team
2. Validate confidence thresholds with data science review
3. Confirm technical approach for conversation state
4. Get design review for question UI mockups

**Short-term** (next sprint):
1. Implement Phase 1: Core dialogue logic
2. Set up A/B testing infrastructure
3. Create baseline metrics from current persona tests

**Medium-term** (this quarter):
1. Ship Phases 1-4 to production
2. Run A/B test with real users
3. Measure impact on core metrics
4. Iterate based on learnings

---

**Document Owner**: Product Manager Agent
**Engineering Lead**: TBD
**Design Lead**: TBD
**Target Ship Date**: TBD (estimated 4 weeks for full implementation)

---

## Feedback & Iteration

This spec is a living document. Please provide feedback on:
- Technical feasibility of proposed architecture
- UX concerns with question-based flow
- Missing edge cases or scenarios
- Alternative approaches worth considering

**Spec Version History**:
- v1.0 (2025-11-18): Initial draft for review
