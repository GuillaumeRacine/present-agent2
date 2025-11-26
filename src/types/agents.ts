/**
 * Agent Workflow Type Definitions
 *
 * These types define the complete context passing chain between all 10 agents
 * in the recommendation workflow.
 */

// ============================================================================
// 1. Listener Agent Types
// ============================================================================

export interface ListenerInput {
  userQuery: string;
  sessionId: string;
  userId?: string;
}

export interface ListenerOutput {
  // Original query (preserved for downstream agents)
  userQuery?: string;

  // Explicit facts extracted
  recipient?: {
    name?: string;
    relationshipType?: string; // 'parent', 'partner', 'friend', 'colleague', etc.
    age?: number;
    gender?: string;
    count?: number; // NEW: For plural recipients like "my parents"
  };
  occasion?: {
    name: string; // 'birthday', 'christmas', 'anniversary', etc.
    date?: string;
    urgency: 'immediate' | 'planned' | 'future';
    significance?: 'major_life_event' | 'annual_celebration' | 'small_gesture'; // NEW
  };
  budget?: {
    min: number;
    max: number;
    flexibility: 'strict' | 'flexible' | 'unspecified';
  };
  interests: string[]; // Explicit interests mentioned
  values?: string[]; // e.g., 'eco-friendly', 'local', 'handmade'
  constraints?: string[]; // Hard requirements: 'must be digital', 'no alcohol'

  // NEW: Enhanced constraints with structured data
  enhancedConstraints?: {
    budget?: {
      min: number;
      max: number;
      flexibility: 'strict' | 'flexible' | 'unspecified';
    };
    excluded?: string[]; // "no food", "no tech", "nothing flashy"
    required?: string[]; // "eco-friendly", "practical", "small"
    size?: 'small' | 'medium' | 'large' | null;
    timing?: 'urgent' | 'planned' | 'flexible';
    space?: 'minimal' | 'moderate' | 'no_constraint'; // "doesn't take space"
  };

  // NEW: Life context extraction
  lifeContext?: {
    recentEvents?: string[]; // "just retired", "new job", "moved", "new baby"
    lifeStage?: 'child' | 'teen' | 'young_adult' | 'young_professional' | 'parent' | 'midlife' | 'empty_nester' | 'retiree' | 'student';
    livingSituation?: 'apartment' | 'house' | 'dorm' | 'downsizing' | 'shared_space' | 'unknown';
    timeAvailability?: 'very_busy' | 'busy' | 'moderate' | 'lots_of_time' | 'unknown';
  };

  // NEW: Enhanced relationship depth
  relationshipDepth?: {
    type: 'parent' | 'partner' | 'sibling' | 'child' | 'friend' | 'coworker' | 'acquaintance' | 'boss' | 'client' | 'teacher';
    closeness: 'very_close' | 'close' | 'casual' | 'professional' | 'distant';
    duration?: 'new' | 'recent' | 'years' | 'lifetime';
    appropriateness?: {
      personalGifts: boolean;
      expensiveGifts: boolean;
      intimateGifts: boolean;
      humorousGifts: boolean;
    };
  };

  // NEW: Intent signals
  intentSignals?: {
    showThought: boolean; // "something special", "show I care"
    impress: boolean; // "wow them", "stand out"
    safe: boolean; // "can't go wrong", "appropriate"
    unique: boolean; // "different", "nobody else will give"
    lastMinute: boolean; // "urgent", "tomorrow", "forgot"
    sentimental: boolean; // "meaningful", "from the heart"
    practical: boolean; // "useful", "will use", "needs"
  };

  // NEW: Enhanced interest extraction
  enhancedInterests?: {
    explicit: Array<{
      interest: string;
      level?: 'casual' | 'enthusiast' | 'expert' | 'professional';
      context?: string; // "just started yoga", "coffee snob"
    }>;
    inferred: Array<{
      interest: string;
      inferredFrom: string;
      confidence: number;
    }>;
    antiInterests?: string[]; // "hates crowds", "doesn't like sweet things"
  };

  // NEW: Gift philosophy extraction
  giftPhilosophy?: {
    valuesMeaning: boolean; // "meaningful", "personal", "from the heart"
    valuesPracticality: boolean; // "useful", "will use", "needs"
    valuesExperience: boolean; // "memories", "experiences", "try new things"
    valuesQuality: boolean; // "nice", "quality", "well-made"
    valuesUniqueness: boolean; // "unique", "different", "one-of-a-kind"
    valuesSustainability: boolean; // "eco-friendly", "sustainable", "ethical"
  };

  // NEW: Ambiguity detection
  ambiguities?: Array<{
    field: string;
    issue: string;
    suggestedClarification?: string;
  }>;

  // Inferred emotional context
  emotionalTone?: 'excited' | 'stressed' | 'casual' | 'formal' | 'urgent';
  confidenceLevel?: 'certain' | 'exploring' | 'confused';
  giftSignificance?: 'major' | 'moderate' | 'small_gesture';

  // Meta
  extractedAt: Date;
  confidence: number; // 0-1
}

// ============================================================================
// 2. Memory Agent Types
// ============================================================================

export interface MemoryInput {
  userId: string;
  sessionId: string;
  listenerOutput: ListenerOutput;
}

export interface MemoryOutput {
  // Pass through listener context
  listenerContext: ListenerOutput;

  // Recalled history
  pastConversations?: Array<{
    sessionId: string;
    timestamp: Date;
    query: string;
    recipientName?: string;
    occasion?: string;
    recommendationsGiven: number;
    outcomeKnown: boolean;
    outcome?: 'purchased' | 'liked' | 'dismissed';
  }>;

  pastRecipients?: Array<{
    recipientId: string;
    name?: string;
    relationshipType: string;
    giftsGivenCount: number;
    successfulGifts: string[]; // Product IDs
    preferredArchetypes?: string[];
    knownInterests: string[];
  }>;

  userPreferences?: {
    typicalBudgetRange?: { min: number; max: number };
    preferredVendors?: string[];
    avoidedCategories?: string[];
    valueAlignment?: string[]; // 'eco-friendly', 'local', etc.
  };

  // Patterns recognized
  recognizedPatterns?: Array<{
    pattern: string;
    confidence: number;
    source: 'past_purchases' | 'past_likes' | 'user_profile';
  }>;

  // Enhanced recipient profile from RecipientLearner sub-agent
  enrichedRecipient?: any; // RecipientProfile from recipient.ts
  recipientKnowledgeDepth?: number;
  recipientKnowledgeGaps?: string[];

  // NEW: Enhanced giver profile from GiverProfiler sub-agent
  giverProfile?: any; // GiverProfile from giver.ts
  giverInsights?: any[]; // GiverInsight[] from giver.ts
  giverConfidence?: number;

  // Meta
  recalledAt: Date;
}

// ============================================================================
// 3. Relationship Agent Types
// ============================================================================

export interface RelationshipInput {
  memoryContext: MemoryOutput;
}

export interface RelationshipOutput {
  // Pass through previous context
  memoryContext: MemoryOutput;

  // Relationship analysis
  relationshipAnalysis: {
    type: string; // 'parent', 'romantic_partner', 'close_friend', etc.
    intimacyLevel?: 'intimate' | 'close' | 'casual' | 'professional'; // FIXED: Added intimacyLevel
    closeness: 'intimate' | 'close' | 'casual' | 'professional';
    duration?: 'new' | 'established' | 'longtime';
    socialNorms: {
      appropriatePriceRange: { min: number; max: number };
      formalityLevel: 'formal' | 'casual' | 'playful';
      personalVsGeneric: 'highly_personal' | 'moderately_personal' | 'generic_ok';
    };
    riskTolerance: 'safe' | 'moderate' | 'bold'; // How adventurous can we be?
  };

  // Calibration recommendations
  calibration: {
    adjustedBudget?: { min: number; max: number };
    recommendedArchetypes: string[]; // Which gift archetypes fit this relationship
    avoidArchetypes: string[]; // Which to avoid
    personalizationLevel: 'high' | 'medium' | 'low';
  };

  // Meta
  analyzedAt: Date;
}

// ============================================================================
// 4. Constraints Agent Types
// ============================================================================

export interface ConstraintsInput {
  relationshipContext: RelationshipOutput;
}

export interface ConstraintsOutput {
  // Pass through previous context
  relationshipContext: RelationshipOutput;

  // Validated constraints
  hardConstraints: {
    budget: { min: number; max: number; isStrict: boolean };
    requiredAttributes?: string[]; // Must-haves: 'digital', 'ships_fast', etc.
    excludedAttributes?: string[]; // Must-nots: 'alcohol', 'fragile', etc.
    deliveryBy?: Date;
  };

  softPreferences: {
    preferredVendors?: string[];
    preferredCategories?: string[];
    valueAlignment?: string[]; // 'eco-friendly', 'local', 'handmade'
  };

  // Validation results
  validationStatus: 'all_valid' | 'conflicts_found' | 'impossible_constraints';
  conflicts?: Array<{
    constraint: string;
    issue: string;
    resolution?: string;
  }>;

  // Meta
  validatedAt: Date;
}

// ============================================================================
// 5. Meaning Agent Types
// ============================================================================

export interface MeaningInput {
  constraintsContext: ConstraintsOutput;
}

export interface MeaningOutput {
  // Pass through previous context
  constraintsContext: ConstraintsOutput;

  // Meaning framework
  meaningFramework: {
    giftArchetype: string; // 'practical_luxury', 'experience', 'sentimental', etc.
    archetypeConfidence: number; // 0-1 confidence in archetype identification
    secondaryArchetype?: string; // Secondary archetype if applicable
    secondaryConfidence?: number; // 0-1 confidence in secondary archetype
    archetypeReasons: string[]; // Why this archetype was chosen
    emotionalMessage: string; // What this gift should communicate
    coreValues: string[]; // Values to align with
    personalRelevance: {
      connectsToInterests: string[];
      addressesNeeds?: string[];
      celebratesPersonality?: string;
    };
  };

  // What would resonate
  resonanceCriteria: {
    functionalNeeds?: string[]; // Practical utility
    aspirationalNeeds?: string[]; // What they aspire to
    emotionalNeeds?: string[]; // Comfort, joy, pride, etc.
    socialNeeds?: string[]; // Status, belonging, identity
  };

  // Enhanced constraints from meaning analysis
  constraints?: {
    explicitExclusions?: string[]; // User explicitly said "no X"
    implicitExclusions?: string[]; // Inferred exclusions (e.g., "no space" → exclude large items)
    requirements?: string[]; // Must-have attributes
    spaceConsiderations?: 'minimalist' | 'compact' | 'normal' | 'statement-piece';
    sustainabilityLevel?: 'required' | 'preferred' | 'neutral';
  };

  // Discovery hints for Explorer
  discoveryHints: {
    semanticQueries: string[]; // Natural language queries for vector search
    interestPathways: string[]; // Interests to traverse in graph (enhanced with compound interests)
    archetypeFilters: string[]; // Which archetypes to prioritize
  };

  // Meta
  identifiedAt: Date;
}

// ============================================================================
// 6. Explorer Agent Types (MOST CRITICAL)
// ============================================================================

export interface ExplorerInput {
  meaningContext: MeaningOutput;
}

export interface ProductCandidate {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    vendor: string;
    imageUrl?: string;
    url?: string;
  };

  // Scoring breakdown
  scores: {
    graphScore: number; // 0-1, from graph traversal
    vectorScore: number; // 0-1, from vector similarity
    hybridScore: number; // 0.6 * graph + 0.4 * vector
    confidenceScore: number; // How confident are we?
  };

  // Why this product
  matchReasons: {
    matchedInterests: string[];
    matchedValues: string[];
    matchedArchetype: string;
    socialProofCount?: number; // Similar users who liked this
    complementaryTo?: string[]; // If recipient has other interests
  };

  // Graph context
  graphContext?: {
    pathLength?: number; // How many hops from user/recipient interests?
    relationshipStrengths?: Record<string, number>;
  };
}

export interface ExplorerOutput {
  // Pass through previous context
  meaningContext: MeaningOutput;

  // Discovered candidates
  candidates: ProductCandidate[];

  // Search metadata
  searchMetadata: {
    totalEvaluated: number;
    diversityScore: number; // How diverse are the results?
    coverageScore: number; // How well do they cover different archetypes?
    avgConfidence: number;
  };

  // Meta
  exploredAt: Date;
  executionTimeMs: number;
}

// ============================================================================
// 7. Validator Agent Types
// ============================================================================

export interface ValidatorInput {
  explorerContext: ExplorerOutput;
  constraintsContext?: ConstraintsOutput; // Optional for backward compatibility
}

export interface ValidationResult {
  productId: string;
  passed: boolean;

  // Individual checks
  checks: {
    budgetCheck: { passed: boolean; score: number };
    constraintsCheck: { passed: boolean; violations: string[] };
    relevanceCheck: { passed: boolean; score: number };
    qualityCheck: { passed: boolean; issues: string[] };
    appropriatenessCheck: { passed: boolean; concerns: string[] };
    archetypeCheck: { passed: boolean; score: number; reason?: string };
    personalizationCheck: { passed: boolean; score: number; reason?: string };
    diversityCheck: { passed: boolean; score: number; reason?: string };
  };

  // Multi-dimensional scoring
  dimensionScores: {
    relevanceScore: number;        // 0-1: Hybrid + vector + interest match
    archetypeScore: number;        // 0-1: How well it matches desired archetype
    personalizationScore: number;  // 0-1: Quality of personalization
    diversityScore: number;        // 0-1: Contribution to diversity
  };

  // Overall verdict
  overallScore: number; // 0-1 (weighted average of dimension scores)
  confidence: number; // How confident in this validation?

  // Reasons
  passReasons?: string[];
  failReasons?: string[];

  // Analytics tracking
  rejectionCategory?: 'low_relevance' | 'archetype_mismatch' | 'poor_personalization' |
                      'duplicate' | 'quality_issues' | 'budget' | 'constraints';
}

export interface ValidatorOutput {
  // Pass through previous context
  explorerContext: ExplorerOutput;

  // Validated candidates
  validatedCandidates: ProductCandidate[];
  rejectedCandidates: Array<{
    candidate: ProductCandidate;
    validation: ValidationResult;
  }>;

  // Validation summary
  validationSummary: {
    totalCandidates: number;
    passed: number;
    rejected: number;
    avgValidationScore: number;

    // Quality metrics
    avgRelevanceScore: number;
    avgArchetypeScore: number;
    avgPersonalizationScore: number;
    diversityScore: number;

    // Rejection analytics
    rejectionsByCategory: Record<string, number>;
    thresholdsUsed: {
      hybridScore: number;
      interestMatch: number;
      archetypeMatch: number;
      personalizationScore: number;
    };
    thresholdsLowered: boolean;
  };

  // Meta
  validatedAt: Date;
}

// ============================================================================
// 8. Storyteller Agent Types
// ============================================================================

export interface StorytellerInput {
  validatorContext: ValidatorOutput;
}

export interface ProductStory {
  productId: string;
  reasoning: string; // 2-3 sentence personal explanation

  // Story structure
  storyElements: {
    connectionToRecipient: string; // How it connects to their interests/life
    emotionalResonance: string; // Why it would be meaningful
    practicalValue?: string; // What makes it useful/valuable
  };

  // Tone
  tone: 'warm' | 'enthusiastic' | 'thoughtful' | 'practical';
  personalizationLevel: 'high' | 'medium' | 'low';
}

export interface StorytellerOutput {
  // Pass through previous context
  validatorContext: ValidatorOutput;

  // Stories for each candidate
  stories: ProductStory[];

  // Meta
  craftedAt: Date;
  avgStoryLength: number;
}

// ============================================================================
// 9. Presenter Agent Types
// ============================================================================

export interface PresenterInput {
  storytellerContext: StorytellerOutput;
}

export interface FinalRecommendation {
  rank: number; // 1-5
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    vendor: string;
    imageUrl?: string;
    url?: string;
  };
  reasoning: string; // The personal story
  confidence: number; // 0-1
  tags?: string[]; // 'Best Match', 'Budget Friendly', 'Unique Find', etc.
}

export interface PresenterOutput {
  // Conversational framing
  conversationalIntro: string; // Warm introduction
  conversationalOutro: string; // What to do next / follow-up questions

  // Final recommendations
  recommendations: FinalRecommendation[];

  // Strategic ordering
  orderingStrategy: 'confidence_desc' | 'diversity_balanced' | 'price_varied';

  // Tone
  tone: 'friend' | 'advisor' | 'enthusiast';

  // Meta
  presentedAt: Date;
  totalRecommendations: number;
}

// ============================================================================
// 10. Learning Agent Types
// ============================================================================

export interface LearningInput {
  sessionId: string;
  userId: string;
  recommendationId: string;

  // User feedback
  userActions: {
    viewed: string[]; // Product IDs viewed
    clicked: string[]; // Product IDs clicked
    liked: string[]; // Product IDs liked/saved
    dismissed: string[]; // Product IDs dismissed
    purchased?: string[]; // Product IDs purchased
  };

  explicitFeedback?: {
    ratings?: Record<string, number>; // productId -> 1-5 stars
    comments?: Record<string, string>;
  };

  // Context at time of recommendation
  originalContext: PresenterOutput;
}

export interface GraphUpdate {
  updateType: 'create_node' | 'update_relationship' | 'update_property';
  cypherQuery: string;
  params: Record<string, any>;
  reasoning: string;
}

export interface LearnedPattern {
  patternType: string;
  description: string;
  confidence: number;
  examples?: string[];
}

export interface LearningOutput {
  // Updates to apply
  graphUpdates: GraphUpdate[];

  // Patterns recognized
  patternsLearned: LearnedPattern[];

  // Success metrics
  outcomes: {
    successfulRecommendations: number;
    totalRecommendations: number;
    avgConfidenceOfSuccessful: number;
  };

  // Meta
  learnedAt: Date;
  updatesApplied: number;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface OrchestratorInput {
  userQuery: string;
  userId: string;
  sessionId: string;

  /** NEW: Answers to previously asked questions */
  clarifications?: Record<string, any>;

  /** NEW: Original query before enrichment */
  originalQuery?: string;

  /** NEW: Previous context to merge with */
  previousContext?: ListenerOutput;
}

/**
 * Enhanced orchestrator output to support dialogue modes
 * Uses discriminated union for type safety
 */
export type OrchestratorOutput =
  | {
      /** Mode: Asking clarifying questions */
      mode: 'clarifying';
      /** Questions to ask user */
      questions: any[]; // ClarifyingQuestion[] from dialogue types
      /** Natural language presentation of questions (NEW - UX improvement) */
      naturalLanguage?: string;
      /** Encouragement message (NEW - UX improvement) */
      encouragement?: string;
      /** Show escape hatch? (NEW - UX improvement) */
      showEscapeHatch?: boolean;
      /** Partial context extracted so far */
      partialContext?: ListenerOutput;
      /** Why we're asking questions */
      reasoning?: string;
      /** Session identifier */
      sessionId: string;
      /** When processed */
      timestamp: Date;
      /** Performance metrics */
      performance: {
        totalExecutionTimeMs: number;
        agentTimings: Record<string, number>;
      };
      /** Execution trace for debugging */
      executionTrace?: {
        listener: ListenerOutput;
        memory: MemoryOutput;
        dialogueManager?: any; // DialogueManagerOutput
        dialoguePresenter?: any; // DialoguePresenterOutput
      };
    }
  | {
      /** Mode: Showing recommendations */
      mode: 'recommendations';
      /** Final recommendations */
      recommendations: PresenterOutput;
      /** Conversational intro */
      intro?: string;
      /** Natural language transition (NEW - UX improvement) */
      naturalLanguage?: string;
      /** Context summary (NEW - UX improvement) */
      contextSummary?: any; // ContextSummary from presentation types
      /** Session identifier */
      sessionId: string;
      /** When processed */
      timestamp: Date;
      /** Performance metrics */
      performance: {
        totalExecutionTimeMs: number;
        agentTimings: Record<string, number>;
      };
      /** Full execution trace */
      executionTrace: {
        listener: ListenerOutput;
        memory: MemoryOutput;
        dialogueManager?: any; // DialogueManagerOutput
        dialoguePresenter?: any; // DialoguePresenterOutput
        relationship?: RelationshipOutput;
        constraints?: ConstraintsOutput;
        meaning?: MeaningOutput;
        explorer?: ExplorerOutput;
        validator?: ValidatorOutput;
        storyteller?: StorytellerOutput;
        presenter?: PresenterOutput;
      };
      /** Backward compatibility */
      finalRecommendations?: PresenterOutput;
      orchestratedAt?: Date;
    }
  | {
      /** Mode: Showing recommendations with refinement questions */
      mode: 'recommendations_with_refinement';
      /** Final recommendations */
      recommendations: PresenterOutput;
      /** Refinement questions for better results */
      refinementQuestions?: any[]; // ClarifyingQuestion[]
      /** Conversational intro */
      intro?: string;
      /** Natural language transition (NEW - UX improvement) */
      naturalLanguage?: string;
      /** Context summary (NEW - UX improvement) */
      contextSummary?: any; // ContextSummary from presentation types
      /** Session identifier */
      sessionId: string;
      /** When processed */
      timestamp: Date;
      /** Performance metrics */
      performance: {
        totalExecutionTimeMs: number;
        agentTimings: Record<string, number>;
      };
      /** Full execution trace */
      executionTrace: {
        listener: ListenerOutput;
        memory: MemoryOutput;
        dialogueManager?: any; // DialogueManagerOutput
        relationship?: RelationshipOutput;
        constraints?: ConstraintsOutput;
        meaning?: MeaningOutput;
        explorer?: ExplorerOutput;
        validator?: ValidatorOutput;
        storyteller?: StorytellerOutput;
        presenter?: PresenterOutput;
      };
      /** Backward compatibility */
      finalRecommendations?: PresenterOutput;
      orchestratedAt?: Date;
    };

// ============================================================================
// Agent Interface (Base)
// ============================================================================

export interface Agent<TInput, TOutput> {
  name: string;
  process(input: TInput): Promise<TOutput>;
}
