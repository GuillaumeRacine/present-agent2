/**
 * Agent Workflow Type Definitions
 *
 * These types define the complete context passing chain between all 10 agents
 * in the recommendation workflow.
 */
import { GiftAttributes } from './gift-attributes';
import { BarRaiserOutput, BarRaiserFeedback, QualityScorecard } from './bar-raiser';

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

  // NEW: Enhanced emotional intelligence
  emotionalContext?: EmotionalContext;

  // Meta
  extractedAt: Date;
  confidence: number; // 0-1
}

/**
 * Enhanced emotional intelligence extraction for Listener Agent
 * Captures sentiment, urgency, relationship warmth, and life context
 */
export interface EmotionalContext {
  // Overall emotional sentiment
  sentiment: 'excited' | 'nostalgic' | 'stressed' | 'grateful' | 'neutral' | 'anxious' | 'joyful';
  sentimentStrength: number; // 0-1, confidence in sentiment detection

  // Urgency level and deadline information
  urgency: 'critical' | 'high' | 'medium' | 'low';
  deadline?: {
    type: 'explicit' | 'implicit'; // "need by Friday" vs "last minute"
    date?: string; // ISO date if explicit deadline mentioned
    timeframe?: string; // "this week", "by tomorrow", "no rush"
  };

  // Relationship warmth and quality
  relationshipWarmth: number; // 0-1 scale (0.2-0.4: distant, 0.5-0.7: neutral, 0.8-1.0: warm)
  relationshipQuality?: {
    indicators: string[]; // "my amazing mom", "difficult boss", "dear friend"
    sharedHistory?: string[]; // "we used to garden together", "college roommates"
    giftGivingPatterns?: string[]; // "I always get her jewelry", "first time gift"
  };

  // Gift importance and significance
  giftImportance: 'critical' | 'important' | 'nice-to-have';
  importanceReasons?: string[]; // Why this gift matters

  // Life milestones and transitions
  milestones?: Array<{
    type: 'birthday' | 'anniversary' | 'retirement' | 'graduation' | 'promotion' | 'achievement' | 'other';
    description: string; // "turning 50", "first Christmas together"
    significance: 'major' | 'moderate' | 'minor';
  }>;

  lifeTransitions?: Array<{
    type: 'retirement' | 'new_parent' | 'new_job' | 'relocation' | 'empty_nest' | 'health_change' | 'other';
    description: string; // "just retired", "expecting a baby"
    stage: 'recent' | 'current' | 'upcoming'; // Temporal context
    impact: 'major' | 'moderate' | 'minor'; // Life impact level
  }>;

  // Temporal and contextual signals
  temporalSignals?: {
    recentChanges?: string[]; // "recently started", "just moved"
    anticipatedEvents?: string[]; // "about to retire", "expecting"
    seasonalContext?: string; // "first winter", "holiday season"
  };
}

// ============================================================================
// 2. Memory Agent Types
// ============================================================================

export interface MemoryInput {
  userId: string;
  sessionId: string;
  listenerOutput: ListenerOutput;
}

/**
 * Gift pattern for cold start recommendations
 */
export interface GiftPattern {
  productIds: string[];
  relationshipType?: string;
  occasion?: string;
  avgRating?: number;
  popularity?: number;
  archetypes?: string[];
}

/**
 * Session-based profile for cold start users
 */
export interface SessionProfile {
  sessionId: string;
  interests: string[];
  values: string[];
  recipientContext?: {
    name?: string;
    relationshipType?: string;
    age?: number;
    gender?: string;
  };
  budget?: {
    min: number;
    max: number;
  };
  occasion?: string;
  confidence: number;
  timestamp: Date;
}

/**
 * Catalog-wide trend data
 */
export interface CatalogTrends {
  popularByRelationship: Record<string, string[]>; // relationship -> productIds
  trendingByOccasion: Record<string, string[]>; // occasion -> productIds
  highRatedPatterns: GiftPattern[];
  recentSuccesses: GiftPattern[]; // Last 30 days
}

/**
 * Cold start context and data source
 */
export interface ColdStartContext {
  source: 'collaborative' | 'trends' | 'defaults' | 'session';
  confidence: number;
  patterns: GiftPattern[];
  sessionProfile?: SessionProfile;
  explanation: string; // Why this cold start method was used
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
    source: 'past_purchases' | 'past_likes' | 'user_profile' | 'collaborative' | 'catalog_trends' | 'defaults';
  }>;

  // Enhanced recipient profile from RecipientLearner sub-agent
  enrichedRecipient?: any; // RecipientProfile from recipient.ts
  recipientKnowledgeDepth?: number;
  recipientKnowledgeGaps?: string[];

  // NEW: Enhanced giver profile from GiverProfiler sub-agent
  giverProfile?: any; // GiverProfile from giver.ts
  giverInsights?: any[]; // GiverInsight[] from giver.ts
  giverConfidence?: number;

  // NEW: Cold start context (populated when user has no/limited history)
  coldStartContext?: ColdStartContext;

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

/**
 * Gift value dimensions for value-based matching
 */
export type GiftValueDimension =
  | 'practical'      // Useful, functional gifts
  | 'sentimental'    // Emotional, meaningful gifts
  | 'experiential'   // Experience-focused gifts
  | 'luxurious'      // Premium, indulgent gifts
  | 'creative'       // Artistic, unique gifts
  | 'educational';   // Learning-focused gifts

/**
 * Interest with strength/confidence scoring
 */
export interface ScoredInterest {
  interest: string;
  strength: number; // 0-1, how strongly this interest is associated
  source: 'explicit' | 'relationship' | 'occasion' | 'inferred'; // Where the interest came from
  confidence: number; // 0-1, confidence in this interest
}

/**
 * Multi-archetype weights for nuanced matching
 */
export interface ArchetypeWeights {
  [archetype: string]: number; // archetype name -> weight (0-1)
}

/**
 * Gift attribute alignment scoring
 */
export interface AttributeAlignment {
  attribute: string; // Attribute name from gift-attributes.ts
  desirability: number; // 0-1, how desirable this attribute is
  reason: string; // Why this attribute matters
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

    // NEW: Multi-archetype weights
    archetypeWeights?: ArchetypeWeights;

    // NEW: Value-based preferences
    valuePreferences?: {
      dimension: GiftValueDimension;
      strength: number; // 0-1
      inferredFrom: string; // Why we think this value matters
    }[];
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

    // NEW: Scored interests with confidence
    scoredInterests?: ScoredInterest[];

    // NEW: Attribute alignment hints
    desiredAttributes?: AttributeAlignment[];
  };

  // Meta
  identifiedAt: Date;
}

// ============================================================================
// 6. Explorer Agent Types (MOST CRITICAL)
// ============================================================================

export interface ExplorerInput {
  meaningContext: MeaningOutput;

  /** Bar Raiser feedback for retry attempts */
  barRaiserFeedback?: {
    /** Additional search queries to try */
    additionalSearchQueries: string[];
    /** Interests that were mentioned but not covered */
    missedInterests: string[];
    /** How to adjust search strategy */
    searchDirection: 'broaden' | 'narrow' | 'pivot';
    /** Suggested product categories to explore */
    suggestedCategories?: string[];
    /** Budget enforcement override */
    budgetEnforcement?: { min: number; max: number; strict: boolean };
  };

  /**
   * Quality expectations — tells Explorer what the Bar Raiser measures
   * so it can self-adjust its search strategy accordingly.
   */
  qualityExpectations?: {
    /** Target: recommendations must match user's stated interests */
    interestCoverage: string;
    /** Target: results should span different categories/prices/styles */
    diversity: string;
    /** Target: all products within budget constraints */
    budgetAdherence: string;
  };
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
    attributes?: Partial<GiftAttributes>;
    giftAttributes?: Partial<GiftAttributes>;
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
    matchedAttributes?: string[];
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

  /** Bar Raiser guidance for retry attempts */
  barRaiserGuidance?: {
    /** Threshold enforcement policy */
    thresholdPolicy: 'strict_only' | 'no_auto_lower' | 'current';
    /** Which checks to emphasize */
    emphasizeChecks: string[];
  };

  /**
   * Quality expectations — tells Validator what the Bar Raiser measures
   * so it can self-adjust its threshold decisions accordingly.
   */
  qualityExpectations?: {
    /** Target: would a real person buy these? Don't pass low-quality products */
    humanSanityCheck: string;
    /** Target: products must genuinely match stated interests, not just keywords */
    relevance: string;
    /** Target: don't auto-lower thresholds; fewer quality products > many bad ones */
    thresholdIntegrity: string;
  };
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

  /** Bar Raiser guidance for retry attempts */
  barRaiserGuidance?: {
    /** Elements that must be included in stories */
    requiredElements: string[];
    /** Issues with previous stories */
    previousIssues: string[];
  };

  /**
   * Quality expectations — tells Storyteller what the Bar Raiser measures
   * so it can craft stories that score well on evaluation.
   */
  qualityExpectations?: {
    /** Target: stories must connect product to recipient's specific interests/life */
    personalization: string;
    /** Target: explanations should be compelling, not generic filler */
    storytellingQuality: string;
    /** Target: each story should reference specific interests mentioned by the user */
    interestCoverage: string;
  };
}

export interface ProductStory {
  productId: string;
  reasoning: string; // 2-3 sentence personal explanation
  whyCopy?: string; // NEW: Concise 1-line "why this gift" reasoning

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
    attributes?: Partial<GiftAttributes>;
    giftAttributes?: Partial<GiftAttributes>;
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
      /** Unique ID linking this recommendation set to future feedback */
      recommendationId?: string;
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
        barRaiser?: BarRaiserOutput;
      };
      /** Quality scorecard from Bar Raiser evaluation */
      qualityScorecard?: QualityScorecard;
      /** Backward compatibility */
      finalRecommendations?: PresenterOutput;
      orchestratedAt?: Date;
    }
  | {
      /** Mode: Showing recommendations with refinement questions */
      mode: 'recommendations_with_refinement';
      /** Unique ID linking this recommendation set to future feedback */
      recommendationId?: string;
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
        barRaiser?: BarRaiserOutput;
      };
      /** Quality scorecard from Bar Raiser evaluation */
      qualityScorecard?: QualityScorecard;
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
