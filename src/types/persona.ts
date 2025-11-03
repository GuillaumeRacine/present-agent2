/**
 * Persona Testing Framework
 *
 * Comprehensive types for simulating realistic gift-giving scenarios
 * to test relevance, personalization, and UX improvements.
 */

export interface TestPersona {
  // Gift Giver Profile
  id: string;
  name: string;
  demographics: PersonaDemographics;
  giftGivingStyle: GiftGivingStyle;
  psychographics: Psychographics;

  // Test Scenarios
  scenarios: GiftScenario[];

  // Evaluation Criteria
  expectations: PersonaExpectations;
}

export interface PersonaDemographics {
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  location: string;
  occupation: string;
  incomeLevel: 'low' | 'moderate' | 'comfortable' | 'high' | 'very-high';
  lifestage: 'student' | 'young-professional' | 'established' | 'family' | 'empty-nester' | 'retired';
  techSavviness: 'low' | 'moderate' | 'high' | 'expert';
}

export interface GiftGivingStyle {
  planningStyle: 'last-minute' | 'week-before' | 'planned' | 'early-planner';
  budgetApproach: 'strict' | 'flexible' | 'generous' | 'value-focused' | 'luxury-seeker';
  typicalBudgetRange: { min: number; max: number };
  decisionStyle: 'quick-decisive' | 'thoughtful' | 'analytical' | 'second-guesser';
  preferredGiftTypes: string[]; // 'practical', 'experiential', 'sentimental', 'funny', 'luxurious'
  riskTolerance: 'conservative' | 'moderate' | 'adventurous';
  personalizationImportance: 'low' | 'moderate' | 'high' | 'critical';
}

export interface Psychographics {
  values: string[]; // 'sustainability', 'quality', 'uniqueness', 'practicality', 'tradition'
  personality: string[]; // 'thoughtful', 'spontaneous', 'creative', 'analytical', 'empathetic'
  stressors: string[]; // 'time-pressure', 'budget-constraints', 'fear-of-disappointment'
  motivations: string[]; // 'show-love', 'impress', 'maintain-tradition', 'surprise-delight'
}

export interface GiftScenario {
  id: string;
  occasion: OccasionDetails;
  recipient: RecipientProfile;
  context: ScenarioContext;
  expectedQueryStyle: QueryStyle;
}

export interface OccasionDetails {
  type: string; // 'birthday', 'christmas', 'anniversary', 'graduation', 'thank-you', 'just-because'
  significance: 'milestone' | 'major' | 'regular' | 'casual';
  daysUntil: number;
  culturalContext?: string;
  pastGiftHistory?: PastGift[];
}

export interface RecipientProfile {
  name: string;
  relationship: string; // 'mom', 'dad', 'spouse', 'friend', 'colleague', 'sibling'
  relationshipDuration?: string; // 'new', '1-2years', '3-5years', '5-10years', '10+years'
  intimacyLevel: 'distant' | 'casual' | 'close' | 'very-close' | 'intimate';
  age?: number;
  gender?: string;
  interests: string[];
  values?: string[];
  lifestyle?: string[];
  recentLifeEvents?: string[]; // 'new-baby', 'promotion', 'moved', 'retired'
  knownDislikes?: string[];
  knowledgeLevel: 'know-very-well' | 'know-well' | 'know-moderately' | 'know-little' | 'just-met';
}

export interface ScenarioContext {
  timePressure: 'none' | 'low' | 'moderate' | 'high' | 'urgent';
  budgetFlexibility: 'fixed' | 'somewhat-flexible' | 'flexible' | 'no-limit';
  uncertaintyLevel: 'confident' | 'mostly-confident' | 'somewhat-uncertain' | 'very-uncertain';
  additionalConstraints?: string[]; // 'must-ship-quickly', 'needs-gift-wrap', 'eco-friendly-only'
  emotionalState: 'excited' | 'stressed' | 'worried' | 'neutral' | 'desperate';
  priorAttempts?: number; // How many times they've searched already
}

export interface QueryStyle {
  verbosity: 'brief' | 'moderate' | 'detailed' | 'very-detailed';
  specificityLevel: 'vague' | 'somewhat-specific' | 'specific' | 'very-specific';
  includesBudget: boolean;
  includesInterests: boolean;
  includesContext: boolean;
  includesConstraints: boolean;
  naturalness: 'formal' | 'conversational' | 'casual' | 'colloquial';
  clarityLevel: 'unclear' | 'somewhat-clear' | 'clear' | 'very-clear';
}

export interface PastGift {
  occasion: string;
  gift: string;
  reaction: 'loved' | 'liked' | 'neutral' | 'disappointed';
  whatWorked?: string;
  whatDidntWork?: string;
}

export interface PersonaExpectations {
  // What this persona values in recommendations
  mustHaves: string[]; // 'within-budget', 'matches-interests', 'unique', 'practical'
  dealBreakers: string[]; // 'too-expensive', 'too-generic', 'inappropriate', 'low-quality'

  // Quality thresholds
  minRelevanceScore: number; // 0-10
  minPersonalizationScore: number; // 0-10
  minConfidenceScore: number; // 0-1

  // UX expectations
  maxAcceptableResponseTime: number; // seconds
  needsExplanations: boolean;
  prefersVariety: boolean;
  wantsAlternatives: boolean;
}

// Test Results & Metrics
export interface PersonaTestResult {
  personaId: string;
  scenarioId: string;
  timestamp: Date;

  // Input
  generatedQuery: string;
  queryCharacteristics: QueryCharacteristics;

  // System Response
  responseTime: number;
  recommendations: TestRecommendation[];
  systemMetrics: SystemMetrics;

  // Evaluation
  relevanceScore: number; // 0-10 (persona's perspective)
  personalizationScore: number; // 0-10
  uxScore: number; // 0-10
  meetsExpectations: boolean;

  // Detailed Feedback
  whatWorked: string[];
  whatDidntWork: string[];
  suggestions: string[];

  // Metrics
  metrics: {
    interestMatchAccuracy: number;
    budgetAdherence: number;
    occasionAppropriateness: number;
    diversityScore: number;
    explanationQuality: number;
  };
}

export interface QueryCharacteristics {
  wordCount: number;
  hasExplicitBudget: boolean;
  hasRecipientAge: boolean;
  hasInterests: boolean;
  hasRelationship: boolean;
  hasOccasion: boolean;
  hasConstraints: boolean;
  clarityScore: number; // 0-1
}

export interface TestRecommendation {
  rank: number;
  product: {
    id: string;
    name: string;
    price: number;
    category: string;
  };
  scores: {
    hybrid: number;
    graph: number;
    vector: number;
  };
  reasoning: string;

  // Persona evaluation
  perceivedRelevance: number; // 0-10
  wouldConsider: boolean;
  notes?: string;
}

export interface SystemMetrics {
  totalTime: number;
  agentTimings: Record<string, number>;
  candidatesFound: number;
  candidatesValidated: number;
  graphTraversalSuccess: boolean;
  vectorSearchSuccess: boolean;
}

// Persona Simulator Output
export interface SimulatedQuery {
  query: string;
  persona: TestPersona;
  scenario: GiftScenario;
  expectedBehavior: {
    likelyToRefine: boolean;
    likelyToAskQuestions: boolean;
    likelyToSelectMultiple: boolean;
    decisionTimeEstimate: number; // seconds
  };
  groundTruth: {
    idealGiftCharacteristics: string[];
    redFlags: string[];
  };
}

// Batch Testing
export interface BatchTestConfig {
  personas: TestPersona[];
  runId: string;
  timestamp: Date;
  iterations: number;
  includeVariations: boolean; // Test same persona with variations
}

export interface BatchTestResults {
  config: BatchTestConfig;
  results: PersonaTestResult[];
  aggregateMetrics: AggregateMetrics;
  insights: TestInsights;
}

export interface AggregateMetrics {
  totalTests: number;
  avgRelevanceScore: number;
  avgPersonalizationScore: number;
  avgUXScore: number;
  avgResponseTime: number;
  successRate: number; // % meeting expectations

  // By category
  byPersonaType: Record<string, MetricsSummary>;
  byOccasionType: Record<string, MetricsSummary>;
  byBudgetRange: Record<string, MetricsSummary>;

  // Quality indicators
  interestMatchRate: number;
  budgetAdherenceRate: number;
  diversityScore: number;
}

export interface MetricsSummary {
  count: number;
  avgRelevance: number;
  avgPersonalization: number;
  avgUX: number;
  successRate: number;
}

export interface TestInsights {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  criticalIssues: string[];
  recommendations: string[];
  prioritizedImprovements: PrioritizedImprovement[];
}

export interface PrioritizedImprovement {
  area: string; // 'relevance', 'personalization', 'ux', 'performance'
  issue: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  affectedPersonas: string[];
  suggestedSolution: string;
  priority: number; // 1-10
}
