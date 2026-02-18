/**
 * Bar Raiser Agent Type Definitions
 *
 * The Bar Raiser is an 11th runtime agent that sits after Presenter,
 * evaluates the full output holistically via LLM, and can reject
 * and trigger a retry loop with structured feedback.
 */

import {
  ListenerOutput,
  MemoryOutput,
  RelationshipOutput,
  ConstraintsOutput,
  MeaningOutput,
  ExplorerOutput,
  ValidatorOutput,
  StorytellerOutput,
  PresenterOutput,
} from './agents';

// ============================================================================
// Bar Raiser Input/Output
// ============================================================================

export interface BarRaiserInput {
  /** Full execution trace from all 9 agents */
  executionTrace: {
    listener: ListenerOutput;
    memory: MemoryOutput;
    relationship?: RelationshipOutput;
    constraints?: ConstraintsOutput;
    meaning?: MeaningOutput;
    explorer?: ExplorerOutput;
    validator?: ValidatorOutput;
    storyteller?: StorytellerOutput;
    presenter?: PresenterOutput;
  };

  /** Final presenter output to evaluate */
  presenterOutput: PresenterOutput;

  /** Original user query */
  userQuery: string;

  /** Which attempt this is (0-indexed) */
  attemptNumber: number;

  /** Feedback from previous Bar Raiser evaluation (on retry) */
  previousFeedback?: BarRaiserFeedback;

  /** Session ID for tracking */
  sessionId: string;
}

export type BarRaiserVerdict = 'APPROVED' | 'REJECTED' | 'APPROVED_WITH_CONCERNS';

export interface BarRaiserOutput {
  /** Overall verdict */
  verdict: BarRaiserVerdict;

  /** 8-dimension quality scorecard */
  scorecard: QualityScorecard;

  /** Per-agent evaluations */
  agentEvaluations: AgentEvaluation[];

  /** Structured feedback for retry (only on REJECTED) */
  feedback?: BarRaiserFeedback;

  /** Overall quality score (0-100) */
  overallScore: number;

  /** Human-readable summary */
  summary: string;

  /** Critical failures detected */
  criticalFailures: string[];

  /** Attempt number this evaluation is for */
  attemptNumber: number;

  /** Timestamp */
  evaluatedAt: Date;
}

// ============================================================================
// Quality Scorecard (8 dimensions)
// ============================================================================

export interface QualityDimension {
  /** Score 0-100 */
  score: number;
  /** Why this score was given */
  reasoning: string;
  /** Evidence from the execution trace */
  evidence: string[];
}

export interface QualityScorecard {
  /** Do recommendations match the request? */
  relevance: QualityDimension;
  /** Specific to this person, not generic? */
  personalization: QualityDimension;
  /** Are explanations compelling? */
  storytellingQuality: QualityDimension;
  /** Good variety across recommendations? */
  diversity: QualityDimension;
  /** Would a real person buy these? */
  humanSanityCheck: QualityDimension;
  /** All items within stated budget? */
  budgetAdherence: QualityDimension;
  /** Do recs cover mentioned interests? */
  interestCoverage: QualityDimension;
  /** Does the set feel curated? */
  presentationCohesion: QualityDimension;
}

// ============================================================================
// Per-Agent Evaluation
// ============================================================================

export interface AgentEvaluation {
  /** Agent name */
  agentName: string;

  /** Rating 0-100 */
  rating: number;

  /** What signals went in */
  inputSignals: string[];

  /** What signals came out */
  outputSignals: string[];

  /** What signals were lost between input and output */
  lostSignals: string[];

  /** Information preservation score 0-1 */
  informationPreservation: number;

  /** Specific issues detected */
  issues: string[];
}

// ============================================================================
// Bar Raiser Feedback (retry guidance)
// ============================================================================

export interface BarRaiserFeedback {
  /** Guidance for Explorer on retry */
  explorerGuidance: {
    /** Interests that were mentioned but not covered */
    missedInterests: string[];
    /** Additional search queries to try */
    additionalSearchQueries: string[];
    /** How to adjust search strategy */
    searchDirection: 'broaden' | 'narrow' | 'pivot';
    /** Suggested product categories to explore */
    suggestedCategories?: string[];
    /** Budget enforcement override */
    budgetEnforcement?: {
      min: number;
      max: number;
      strict: boolean;
    };
  };

  /** Guidance for Validator on retry */
  validatorGuidance: {
    /** Threshold enforcement policy */
    thresholdPolicy: 'strict_only' | 'no_auto_lower' | 'current';
    /** Which checks to emphasize */
    emphasizeChecks: string[];
  };

  /** Guidance for Storyteller on retry */
  storytellerGuidance: {
    /** Elements that must be included in stories */
    requiredElements: string[];
    /** Issues with previous stories */
    previousIssues: string[];
  };

  /** Overall reason for rejection */
  rejectionReason: string;

  /** What specifically needs to improve */
  improvementAreas: string[];
}

// ============================================================================
// Quality Record (persisted to Neo4j for trending)
// ============================================================================

export interface QualityRecord {
  /** Unique ID */
  id: string;

  /** Session ID */
  sessionId: string;

  /** User query */
  userQuery: string;

  /** Timestamp */
  timestamp: Date;

  /** Verdict */
  verdict: BarRaiserVerdict;

  /** Overall score */
  overallScore: number;

  /** Individual dimension scores */
  relevanceScore: number;
  personalizationScore: number;
  storytellingScore: number;
  diversityScore: number;
  humanSanityScore: number;
  budgetAdherenceScore: number;
  interestCoverageScore: number;
  presentationCohesionScore: number;

  /** Number of attempts before final verdict */
  attemptsUsed: number;

  /** Whether thresholds were auto-lowered */
  thresholdsLowered: boolean;

  /** Number of recommendations returned */
  recommendationCount: number;

  /** Critical failures */
  criticalFailures: string[];

  /** Per-agent scores */
  agentScores: Record<string, number>;
}

// ============================================================================
// Quality Trend (aggregated stats)
// ============================================================================

export interface QualityTrend {
  /** Time period */
  period: string;

  /** Number of sessions evaluated */
  totalSessions: number;

  /** Approval rate */
  approvalRate: number;

  /** Rejected rate */
  rejectedRate: number;

  /** Approved with concerns rate */
  concernsRate: number;

  /** Average scores per dimension */
  avgScores: {
    overall: number;
    relevance: number;
    personalization: number;
    storytelling: number;
    diversity: number;
    humanSanity: number;
    budgetAdherence: number;
    interestCoverage: number;
    presentationCohesion: number;
  };

  /** Top failure reasons */
  topFailureReasons: Array<{ reason: string; count: number }>;

  /** Per-agent performance trends */
  agentPerformance: Record<string, { avgScore: number; avgInfoPreservation: number }>;

  /** Average attempts per session */
  avgAttempts: number;

  /** Threshold lowering frequency */
  thresholdLoweringRate: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BarRaiserConfig {
  /** Maximum retry attempts (default: 2) */
  maxRetries: number;

  /** Minimum score to pass (0-100, default: 60) */
  passThreshold: number;

  /** Block when Validator auto-lowers thresholds? (default: true) */
  blockOnThresholdLowering: boolean;

  /** LLM model for evaluation */
  evaluationModel: string;

  /** Temperature for evaluation LLM calls (default: 0.2) */
  evaluationTemperature: number;

  /** Whether Bar Raiser is enabled */
  enabled: boolean;
}

export const DEFAULT_BAR_RAISER_CONFIG: BarRaiserConfig = {
  maxRetries: 2,
  passThreshold: 60,
  blockOnThresholdLowering: true,
  evaluationModel: 'gpt-4o',
  evaluationTemperature: 0.2,
  enabled: true,
};
