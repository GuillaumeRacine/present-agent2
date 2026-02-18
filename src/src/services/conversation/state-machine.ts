/**
 * Conversation State Machine
 *
 * Manages conversation state transitions with explicit validation.
 * Ensures that conversations follow valid state flows and prevents
 * invalid transitions.
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md Section 2
 */

import {
  ConversationSession,
  ConversationState,
  ConversationTurn,
  InvalidStateTransitionError,
} from '../../types/dialogue';
import { logger } from '../../lib/logger';

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  [ConversationState.INITIAL]: [
    ConversationState.ASKED_QUESTIONS,
    ConversationState.SHOWING_RECOMMENDATIONS,
  ],
  [ConversationState.ASKED_QUESTIONS]: [
    ConversationState.RECEIVED_ANSWERS,
    ConversationState.ABANDONED,
  ],
  [ConversationState.RECEIVED_ANSWERS]: [
    ConversationState.ASKED_QUESTIONS, // Can ask more questions
    ConversationState.SHOWING_RECOMMENDATIONS,
  ],
  [ConversationState.SHOWING_RECOMMENDATIONS]: [ConversationState.COMPLETED],
  [ConversationState.COMPLETED]: [],
  [ConversationState.ABANDONED]: [],
};

// ============================================================================
// State Machine Class
// ============================================================================

/**
 * Conversation state machine
 */
export class ConversationStateMachine {
  /**
   * Validate a state transition
   * @throws InvalidStateTransitionError if transition is invalid
   */
  validateTransition(from: ConversationState, to: ConversationState): void {
    const validTransitions = STATE_TRANSITIONS[from];

    if (!validTransitions.includes(to)) {
      throw new InvalidStateTransitionError(
        `Invalid transition from ${from} to ${to}. Valid: ${validTransitions.join(', ')}`
      );
    }
  }

  /**
   * Transition session to new state
   * @throws InvalidStateTransitionError if transition is invalid
   */
  transition(session: ConversationSession, to: ConversationState): void {
    const from = this.getCurrentState(session);

    logger.debug('ConversationStateMachine: Attempting transition', {
      sessionId: session.sessionId,
      from,
      to,
    });

    this.validateTransition(from, to);

    // Update session metadata based on new state
    switch (to) {
      case ConversationState.COMPLETED:
        session.completedAt = new Date();
        session.outcome = 'recommendations_shown';
        session.totalDurationMs = Date.now() - session.startedAt.getTime();
        break;

      case ConversationState.ABANDONED:
        session.completedAt = new Date();
        session.outcome = 'abandoned';
        session.totalDurationMs = Date.now() - session.startedAt.getTime();
        break;
    }

    logger.info('ConversationStateMachine: Transition successful', {
      sessionId: session.sessionId,
      from,
      to,
    });
  }

  /**
   * Get current state based on session data
   */
  getCurrentState(session: ConversationSession): ConversationState {
    // If session has outcome, it's terminal
    if (session.outcome === 'recommendations_shown') {
      return ConversationState.COMPLETED;
    }
    if (session.outcome === 'abandoned' || session.outcome === 'error') {
      return ConversationState.ABANDONED;
    }

    // No turns yet
    if (session.turns.length === 0) {
      return ConversationState.INITIAL;
    }

    // Check last turn
    const lastTurn = session.turns[session.turns.length - 1];

    if (lastTurn.recommendationsShown) {
      return ConversationState.SHOWING_RECOMMENDATIONS;
    }

    if (lastTurn.askedQuestions.length > 0) {
      if (lastTurn.receivedAnswers && Object.keys(lastTurn.receivedAnswers).length > 0) {
        return ConversationState.RECEIVED_ANSWERS;
      }
      return ConversationState.ASKED_QUESTIONS;
    }

    return ConversationState.INITIAL;
  }

  /**
   * Check if session can accept more questions
   */
  canAskQuestions(session: ConversationSession): boolean {
    const currentState = this.getCurrentState(session);
    const validStates = [
      ConversationState.INITIAL,
      ConversationState.RECEIVED_ANSWERS,
    ];
    return validStates.includes(currentState);
  }

  /**
   * Check if session should show recommendations
   */
  shouldShowRecommendations(session: ConversationSession): boolean {
    const currentState = this.getCurrentState(session);
    const validStates = [
      ConversationState.INITIAL,
      ConversationState.RECEIVED_ANSWERS,
      ConversationState.SHOWING_RECOMMENDATIONS,
    ];
    return validStates.includes(currentState);
  }

  /**
   * Check if session is terminal (completed or abandoned)
   */
  isTerminal(session: ConversationSession): boolean {
    const currentState = this.getCurrentState(session);
    return (
      currentState === ConversationState.COMPLETED ||
      currentState === ConversationState.ABANDONED
    );
  }

  /**
   * Get valid next states for current state
   */
  getValidNextStates(session: ConversationSession): ConversationState[] {
    const currentState = this.getCurrentState(session);
    return STATE_TRANSITIONS[currentState] || [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new conversation session
 */
export function createConversationSession(
  sessionId: string,
  userId: string
): ConversationSession {
  return {
    sessionId,
    userId,
    turns: [],
    startedAt: new Date(),
  };
}

/**
 * Add turn to session
 */
export function addTurnToSession(
  session: ConversationSession,
  turn: ConversationTurn
): void {
  session.turns.push(turn);

  logger.debug('ConversationStateMachine: Turn added to session', {
    sessionId: session.sessionId,
    turnNumber: turn.turnNumber,
    totalTurns: session.turns.length,
  });
}

/**
 * Get last turn from session
 */
export function getLastTurn(
  session: ConversationSession
): ConversationTurn | undefined {
  return session.turns[session.turns.length - 1];
}

/**
 * Check if max turns reached
 */
export function hasReachedMaxTurns(
  session: ConversationSession,
  maxTurns: number = 3
): boolean {
  return session.turns.length >= maxTurns;
}

/**
 * Get all asked question IDs from session
 */
export function getAllAskedQuestions(session: ConversationSession): string[] {
  const askedQuestions = new Set<string>();

  session.turns.forEach((turn) => {
    turn.askedQuestions.forEach((q) => askedQuestions.add(q));
  });

  return Array.from(askedQuestions);
}

/**
 * Get session duration in milliseconds
 */
export function getSessionDuration(session: ConversationSession): number {
  if (session.completedAt) {
    return session.completedAt.getTime() - session.startedAt.getTime();
  }
  return Date.now() - session.startedAt.getTime();
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const conversationStateMachine = new ConversationStateMachine();
