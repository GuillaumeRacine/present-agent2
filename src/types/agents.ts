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
  // Explicit facts extracted
  recipient?: {
    name?: string;
    relationshipType?: string; // 'parent', 'partner', 'friend', 'colleague', etc.
    age?: number;
    gender?: string;
  };
  occasion?: {
    name: string; // 'birthday', 'christmas', 'anniversary', etc.
    date?: string;
    urgency: 'immediate' | 'planned' | 'future';
  };
  budget?: {
    min: number;
    max: number;
    flexibility: 'strict' | 'flexible' | 'unspecified';
  };
  interests: string[]; // Explicit interests mentioned
  values?: string[]; // e.g., 'eco-friendly', 'local', 'handmade'
  constraints?: string[]; // Hard requirements: 'must be digital', 'no alcohol'

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

  // Discovery hints for Explorer
  discoveryHints: {
    semanticQueries: string[]; // Natural language queries for vector search
    interestPathways: string[]; // Interests to traverse in graph
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
  };

  // Overall verdict
  overallScore: number; // 0-1
  confidence: number; // How confident in this validation?

  // Reasons
  passReasons?: string[];
  failReasons?: string[];
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
}

export interface OrchestratorOutput {
  finalRecommendations: PresenterOutput;

  // Full execution trace (for debugging)
  executionTrace: {
    listener: ListenerOutput;
    memory: MemoryOutput;
    relationship: RelationshipOutput;
    constraints: ConstraintsOutput;
    meaning: MeaningOutput;
    explorer: ExplorerOutput;
    validator: ValidatorOutput;
    storyteller: StorytellerOutput;
    presenter: PresenterOutput;
  };

  // Performance metrics
  performance: {
    totalExecutionTimeMs: number;
    agentTimings: Record<string, number>;
  };

  // Meta
  orchestratedAt: Date;
}

// ============================================================================
// Agent Interface (Base)
// ============================================================================

export interface Agent<TInput, TOutput> {
  name: string;
  process(input: TInput): Promise<TOutput>;
}
