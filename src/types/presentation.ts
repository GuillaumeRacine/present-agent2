/**
 * Presentation Layer Type Definitions
 *
 * Types for the DialoguePresenter agent that converts raw JSON outputs
 * into warm, conversational, human-like interactions.
 *
 * Priority 1 UX improvement from validation report.
 */

import {
  DialogueManagerOutput,
  ClarifyingQuestion,
  ConfidenceAssessment,
} from './dialogue';
import { ListenerOutput } from './agents';

// ============================================================================
// User Context Detection
// ============================================================================

/**
 * Emotional state of the user (detected from query patterns)
 */
export type EmotionalState = 'excited' | 'stressed' | 'uncertain' | 'neutral';

/**
 * Time pressure level (from urgency indicators)
 */
export type TimePressure = 'urgent' | 'moderate' | 'low';

/**
 * Budget sensitivity (from budget range)
 */
export type BudgetSensitivity = 'high' | 'medium' | 'low';

/**
 * User confidence level (from query specificity)
 */
export type ConfidenceLevel = 'confident' | 'uncertain' | 'overwhelmed';

/**
 * Complete user context for personalized messaging
 */
export interface UserContext {
  /** Detected emotional state */
  emotionalState: EmotionalState;

  /** Time pressure level */
  timePressure: TimePressure;

  /** Budget sensitivity */
  budgetSensitivity: BudgetSensitivity;

  /** User's confidence level */
  confidenceLevel: ConfidenceLevel;

  /** Budget info for reference */
  budget?: { min: number; max: number };

  /** Interests for reference */
  interests?: string[];

  /** Recipient info for reference */
  recipient?: {
    relationshipType?: string;
    gender?: string;
    age?: number;
  };

  /** Occasion info for reference */
  occasion?: {
    name: string;
    date?: Date;
    daysUntil?: number;
  };
}

// ============================================================================
// DialoguePresenter Input/Output
// ============================================================================

/**
 * Input to DialoguePresenter agent
 */
export interface DialoguePresenterInput {
  /** Output from DialogueManager (ask/recommend/hybrid) */
  dialogueOutput: DialogueManagerOutput;

  /** User context for personalized messaging */
  userContext: UserContext;

  /** Previous conversation turns for transitions */
  conversationHistory?: ConversationHistoryItem[];

  /** Was escape hatch requested? */
  escapeHatchRequested?: boolean;
}

/**
 * Simplified conversation history item
 */
export interface ConversationHistoryItem {
  mode: 'ask' | 'recommend' | 'hybrid';
  askedQuestions: string[];
  userCorrected?: boolean;
}

/**
 * Output from DialoguePresenter agent
 */
export type DialoguePresenterOutput =
  | {
      /** Question presentation */
      type: 'questions';

      /** Natural language wrapper around questions */
      naturalLanguage: string;

      /** Structured questions for UI rendering */
      questions: ClarifyingQuestion[];

      /** Encouragement message (if applicable) */
      encouragement?: string;

      /** Show escape hatch? */
      showEscapeHatch: boolean;
    }
  | {
      /** Recommendation introduction */
      type: 'recommendations';

      /** Natural language transition and summary */
      naturalLanguage: string;

      /** Context summary for display */
      contextSummary?: ContextSummary;
    }
  | {
      /** Hybrid mode presentation */
      type: 'hybrid';

      /** Natural language transition */
      naturalLanguage: string;

      /** Refinement questions */
      refinementQuestions: ClarifyingQuestion[];

      /** Context summary */
      contextSummary?: ContextSummary;
    };

// ============================================================================
// Context Summary
// ============================================================================

/**
 * Summary of what the system learned from user
 */
export interface ContextSummary {
  items: ContextSummaryItem[];
}

/**
 * Individual context item
 */
export interface ContextSummaryItem {
  /** Icon/emoji for visual clarity */
  icon: string;

  /** Label (Budget, Interests, etc.) */
  label: string;

  /** Value to display */
  value: string;
}

// ============================================================================
// Message Templates
// ============================================================================

/**
 * Template parts for building natural language messages
 */
export interface MessageTemplate {
  /** Greeting based on context */
  greeting: string;

  /** Explanation of why we're asking */
  explanation: string;

  /** Closing encouragement */
  closing: string;

  /** Transition between turns */
  transition?: string;
}

/**
 * Escape hatch configuration
 */
export interface EscapeHatchConfig {
  /** Should escape hatch be shown? */
  show: boolean;

  /** Button text */
  buttonText: string;

  /** Optional explanation */
  explanation?: string;
}
