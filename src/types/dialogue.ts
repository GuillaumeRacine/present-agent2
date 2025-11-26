/**
 * Dialogue Manager Type Definitions
 *
 * Types for the conversational UX improvement feature that enables
 * intelligent dialogue management based on confidence scoring.
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/specs/CONVERSATIONAL_UX_IMPROVEMENT_SPEC.md
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md
 */

import { ListenerOutput, MemoryOutput } from './agents';

// ============================================================================
// DialogueManager Agent Types (Discriminated Unions for Type Safety)
// ============================================================================

/**
 * Input to DialogueManager agent
 */
export interface DialogueManagerInput {
  /** Extracted context from Listener agent */
  listenerOutput: ListenerOutput;

  /** Recalled history from Memory agent */
  memoryOutput: MemoryOutput;

  /** Previous turns in this session (for deduplication) */
  conversationHistory?: ConversationTurn[];

  /** Override: force mode for testing */
  forcedMode?: 'ask' | 'recommend' | 'hybrid';
}

/**
 * Confidence assessment breakdown
 */
export interface ConfidenceAssessment {
  /** Overall confidence from Listener (0-1) */
  overallConfidence: number;

  /** Which critical fields are present */
  criticalFieldsCovered: string[];

  /** Which critical fields are missing */
  criticalFieldsMissing: string[];

  /** High-impact ambiguities from Listener */
  highImpactAmbiguities: string[];

  /** How many critical fields (0-4) */
  criticalFieldCount: number;
}

/**
 * DialogueManager output using discriminated unions for type safety
 *
 * Each mode has specific required/prohibited fields to prevent runtime errors
 */
export type DialogueManagerOutput =
  | {
      /** Ask mode: need clarifying questions */
      mode: 'ask';
      /** Questions to ask (required in ask mode) */
      questions: ClarifyingQuestion[];
      /** Should NOT proceed to recommendations */
      proceedWithRecommendations: false;
      /** Why this decision was made */
      reasoning: string;
      /** Detailed confidence breakdown */
      confidenceAssessment: ConfidenceAssessment;
      /** Performance tracking */
      decisionTimeMs: number;
      /** When decision was made */
      processedAt: Date;
    }
  | {
      /** Recommend mode: high confidence, proceed directly */
      mode: 'recommend';
      /** No questions in recommend mode */
      questions?: never;
      /** Should proceed to recommendations */
      proceedWithRecommendations: true;
      /** Why this decision was made */
      reasoning: string;
      /** Detailed confidence breakdown */
      confidenceAssessment: ConfidenceAssessment;
      /** Performance tracking */
      decisionTimeMs: number;
      /** When decision was made */
      processedAt: Date;
      /** Optional: reason for fallback (if error recovery) */
      fallbackReason?: string;
    }
  | {
      /** Hybrid mode: show recommendations AND offer refinement */
      mode: 'hybrid';
      /** Refinement questions (required in hybrid mode) */
      questionsForRefinement: ClarifyingQuestion[];
      /** Should proceed to recommendations */
      proceedWithRecommendations: true;
      /** Why this decision was made */
      reasoning: string;
      /** Detailed confidence breakdown */
      confidenceAssessment: ConfidenceAssessment;
      /** Performance tracking */
      decisionTimeMs: number;
      /** When decision was made */
      processedAt: Date;
    };

// ============================================================================
// Clarifying Question Types
// ============================================================================

/**
 * Types of clarifying questions
 */
export type QuestionType = 'essential' | 'refinement' | 'ambiguity' | 'intent' | 'constraint';

/**
 * Suggested answer option for a clarifying question
 */
export interface SuggestedAnswer {
  /** Display label for user ("Under $50") */
  label: string;

  /** Structured value to store ({ min: 0, max: 50 }) */
  value: any;

  /** Optional explanation of this answer */
  description?: string;
}

/**
 * A clarifying question with structured answers
 */
export interface ClarifyingQuestion {
  /** Unique identifier (e.g., 'budget', 'interests', 'intent_priority') */
  id: string;

  /** Question type (determines priority and impact) */
  type: QuestionType;

  /** Which ListenerOutput field this addresses */
  field: string;

  /** Natural language question text */
  question: string;

  /** Suggested answers (3-5 options) */
  suggestedAnswers: SuggestedAnswer[];

  /** Priority (1 = highest, ask first) */
  priority: number;

  /** Estimated confidence boost if answered (0.0-1.0) */
  impactOnConfidence: number;

  /** Optional: Why we're asking this */
  rationale?: string;

  /** Optional: Contextual hint for attribute-aware framing (Phase 4) */
  contextHint?: string;
}

// ============================================================================
// Conversation State Types
// ============================================================================

/**
 * Represents a single turn in a conversation session
 * Stored in Neo4j for history tracking and deduplication
 */
export interface ConversationTurn {
  /** Unique turn identifier */
  id: string;

  /** Session this turn belongs to */
  sessionId: string;

  /** Turn number (1-indexed) */
  turnNumber: number;

  /** When this turn occurred */
  timestamp: Date;

  /** User's input for this turn */
  userInput: string;

  /** Extracted context from Listener */
  listenerOutput: ListenerOutput;

  /** DialogueManager's decision */
  dialogueDecision: DialogueManagerOutput;

  /** Question field IDs that were asked */
  askedQuestions: string[]; // ['budget', 'interests']

  /** Answers received (if any) */
  receivedAnswers?: Record<string, any>; // { budget: { min: 50, max: 100 } }

  /** Were recommendations shown in this turn? */
  recommendationsShown: boolean;

  /** Final confidence after this turn */
  confidence: number;

  /** How long this turn took to process */
  processingTimeMs: number;
}

/**
 * Complete conversation session
 */
export interface ConversationSession {
  /** Session identifier */
  sessionId: string;

  /** User who initiated session */
  userId: string;

  /** All turns in chronological order */
  turns: ConversationTurn[];

  /** Session start time */
  startedAt: Date;

  /** Session end time (when recommendations shown) */
  completedAt?: Date;

  /** Final outcome */
  outcome?: 'recommendations_shown' | 'abandoned' | 'timed_out' | 'error';

  /** Total session duration */
  totalDurationMs?: number;
}

/**
 * Conversation state machine states
 */
export enum ConversationState {
  INITIAL = 'initial',
  ASKED_QUESTIONS = 'asked_questions',
  RECEIVED_ANSWERS = 'received_answers',
  SHOWING_RECOMMENDATIONS = 'showing_recommendations',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// ============================================================================
// Answer Merging Types
// ============================================================================

/**
 * Enriched context after merging clarification answers
 */
export interface EnrichedContext {
  /** Enriched listener output */
  enrichedContext: ListenerOutput;

  /** Enriched query with answers appended */
  enrichedQuery: string;

  /** Confidence boost from answers */
  confidenceBoost: number;

  /** Which clarifications were applied */
  clarificationsApplied: string[];

  /** When context was enriched */
  mergedAt: Date;
}

// ============================================================================
// Question Template Metadata
// ============================================================================

/**
 * Metadata for question templates
 */
export interface QuestionTemplate {
  /** Template identifier */
  id: string;

  /** Question type */
  type: QuestionType;

  /** Field this question addresses */
  field: string;

  /** Template function to generate question */
  generate: () => ClarifyingQuestion;

  /** Condition when this question applies */
  condition: (listener: ListenerOutput) => boolean;

  /** Base priority (can be adjusted dynamically) */
  basePriority: number;
}

/**
 * Refinement options for vague interests
 */
export interface RefinementOptions {
  interest: string;
  options: SuggestedAnswer[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error for conversation-related issues
 */
export class ConversationError extends Error {
  constructor(
    message: string,
    public context: Record<string, any>
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

/**
 * Question generation failure
 */
export class QuestionGenerationError extends ConversationError {
  constructor(message: string, context: Record<string, any>) {
    super(message, context);
    this.name = 'QuestionGenerationError';
  }
}

/**
 * Conversation history retrieval failure
 */
export class ConversationHistoryError extends ConversationError {
  constructor(message: string, context: Record<string, any>) {
    super(message, context);
    this.name = 'ConversationHistoryError';
  }
}

/**
 * Answer merging failure
 */
export class AnswerMergingError extends ConversationError {
  constructor(message: string, context: Record<string, any>) {
    super(message, context);
    this.name = 'AnswerMergingError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ConversationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, context);
    this.name = 'ValidationError';
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Invalid state transition error
 */
export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}
