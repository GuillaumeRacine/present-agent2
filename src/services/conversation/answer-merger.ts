/**
 * Answer Merger
 *
 * Merges clarification answers with previous context to create enriched context.
 * Calculates confidence boost and builds natural language query.
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md Section 3
 */

import { Driver } from 'neo4j-driver';
import {
  EnrichedContext,
  AnswerMergingError,
  ConversationTurn,
} from '../../types/dialogue';
import { ListenerOutput } from '../../types/agents';
import { logger } from '../../lib/logger';
import { getLastTurn } from './history';

// ============================================================================
// Answer Merging
// ============================================================================

/**
 * Merge clarification answers with previous context
 *
 * @param driver Neo4j driver for retrieving conversation history
 * @param sessionId Session identifier
 * @param originalQuery Original user query
 * @param answers Clarification answers from user
 * @returns Enriched context with merged answers
 */
export async function mergeWithClarifications(
  driver: Driver,
  sessionId: string,
  originalQuery: string,
  answers: Record<string, any>
): Promise<EnrichedContext> {
  try {
    logger.debug('Merging clarification answers', {
      sessionId,
      answersProvided: Object.keys(answers),
    });

    // 1. Retrieve last turn from conversation history
    const lastTurn = await getLastTurn(driver, sessionId);

    // FIXED: If no previous turn exists, create a minimal base context
    // This handles cases where clarifications are provided on the first request
    let previousContext: ListenerOutput;

    if (!lastTurn) {
      logger.warn('No previous context found, creating minimal base context', {
        sessionId,
      });

      // Create minimal base context to merge answers into
      previousContext = {
        recipient: {},
        occasion: {},
        budget: { min: null, max: null, flexibility: 'unspecified' },
        interests: [],
        values: {},
        constraints: {},
        enhancedConstraints: {},
        enhancedInterests: {},
        lifeContext: {},
        relationshipDepth: {},
        confidence: 0.3, // Low initial confidence
        extractedAt: new Date(),
      };
    } else {
      previousContext = lastTurn.listenerOutput;
    }

    // 2. Build enriched context (deep merge)
    const enrichedContext: ListenerOutput = {
      ...previousContext,
      extractedAt: new Date(),
    };

    // Track which clarifications were applied
    const clarificationsApplied: string[] = [];

    // 3. Apply answers to appropriate fields
    Object.entries(answers).forEach(([questionId, value]) => {
      applyAnswer(enrichedContext, questionId, value);
      clarificationsApplied.push(questionId);
    });

    // 4. Recalculate confidence with boost
    const confidenceBoost = calculateConfidenceBoost(answers);
    enrichedContext.confidence = Math.min(
      previousContext.confidence + confidenceBoost,
      1.0 // Cap at 1.0
    );

    // 5. Build natural language query for context
    const enrichedQuery = buildNaturalQuery(originalQuery, answers);

    logger.info('Answers merged successfully', {
      sessionId,
      clarificationsApplied,
      confidenceBoost,
      previousConfidence: previousContext.confidence,
      newConfidence: enrichedContext.confidence,
    });

    return {
      enrichedContext,
      enrichedQuery,
      confidenceBoost,
      clarificationsApplied,
      mergedAt: new Date(),
    };
  } catch (error) {
    logger.error('Failed to merge clarification answers', {
      error,
      sessionId,
      answersProvided: Object.keys(answers),
    });

    if (error instanceof AnswerMergingError) {
      throw error;
    }

    throw new AnswerMergingError('Failed to merge clarification answers', {
      sessionId,
      error,
    });
  }
}

// ============================================================================
// Answer Application Logic
// ============================================================================

/**
 * Apply a single answer to the enriched context
 */
function applyAnswer(
  context: ListenerOutput,
  questionId: string,
  value: any
): void {
  // Budget answer
  if (questionId === 'budget') {
    context.budget = {
      min: value.min,
      max: value.max,
      flexibility: 'strict', // User explicitly specified
    };
    return;
  }

  // Interests answer
  if (questionId === 'interests') {
    const newInterest = {
      interest: value,
      level: 'enthusiast' as const, // User explicitly mentioned
      context: 'user clarification',
    };

    context.enhancedInterests = {
      ...context.enhancedInterests,
      explicit: [
        ...(context.enhancedInterests?.explicit || []),
        newInterest,
      ],
    };

    // Also add to simple interests array
    if (!context.interests.includes(value)) {
      context.interests.push(value);
    }
    return;
  }

  // Relationship answer
  if (questionId === 'relationship') {
    if (!context.recipient) {
      context.recipient = {};
    }
    context.recipient.relationshipType = value;
    return;
  }

  // Occasion answer
  if (questionId === 'occasion') {
    context.occasion = value;
    return;
  }

  // Recipient age answer
  if (questionId === 'recipient_age') {
    if (!context.recipient) {
      context.recipient = {};
    }
    context.recipient.age = value;
    return;
  }

  // Intent priority answer
  if (questionId === 'intent_priority') {
    if (!context.intentSignals) {
      context.intentSignals = {};
    }

    // Set primary intent based on answer
    if (value === 'practical') {
      context.intentSignals.practical = true;
    } else if (value === 'unique') {
      context.intentSignals.unique = true;
    } else if (value === 'meaningful') {
      context.intentSignals.sentimental = true;
    }
    return;
  }

  // Gift philosophy answer
  if (questionId === 'gift_philosophy') {
    if (!context.giftPhilosophy) {
      context.giftPhilosophy = {
        valuesMeaning: false,
        valuesPracticality: false,
        valuesExperience: false,
        valuesQuality: false,
        valuesUniqueness: false,
        valuesSustainability: false,
      };
    }

    if (value === 'practical') {
      context.giftPhilosophy.valuesPracticality = true;
    } else if (value === 'unique') {
      context.giftPhilosophy.valuesUniqueness = true;
    } else if (value === 'meaningful') {
      context.giftPhilosophy.valuesMeaning = true;
    } else if (value === 'quality') {
      context.giftPhilosophy.valuesQuality = true;
    }
    return;
  }

  // Space constraint answer
  if (questionId === 'space_constraint') {
    if (!context.enhancedConstraints) {
      context.enhancedConstraints = {};
    }
    context.enhancedConstraints.space = value;
    return;
  }

  // Urgency answer
  if (questionId === 'urgency') {
    if (context.occasion) {
      context.occasion.urgency = value;
    } else {
      context.occasion = {
        name: 'general',
        urgency: value,
      };
    }
    return;
  }

  // Refinement answers (refine_music, refine_sports, etc.)
  if (questionId.startsWith('refine_')) {
    const originalInterest = questionId.replace('refine_', '');

    // Replace vague interest with refined one
    context.interests = context.interests.map((i) =>
      i.toLowerCase() === originalInterest ? value : i
    );

    // Also update enhanced interests
    if (context.enhancedInterests?.explicit) {
      context.enhancedInterests.explicit = context.enhancedInterests.explicit.map((i) =>
        i.interest.toLowerCase() === originalInterest
          ? { ...i, interest: value, level: 'enthusiast' as const }
          : i
      );
    }
    return;
  }

  logger.warn('Unknown question ID, skipping answer application', {
    questionId,
    value,
  });
}

// ============================================================================
// Confidence Boost Calculation
// ============================================================================

/**
 * Confidence boost values for different answer types
 */
const CONFIDENCE_BOOST_VALUES = {
  budget: 0.15, // High impact
  interests: 0.2, // Highest impact
  relationship: 0.12, // Medium-high impact
  occasion: 0.1, // Medium impact
  recipient_age: 0.08,
  intent_priority: 0.08,
  gift_philosophy: 0.09,
  space_constraint: 0.05,
  urgency: 0.07,
  refine: 0.12, // Refinements
};

/**
 * Calculate confidence improvement from answers
 */
export function calculateConfidenceBoost(answers: Record<string, any>): number {
  let boost = 0;

  Object.keys(answers).forEach((key) => {
    if (key === 'budget') {
      boost += CONFIDENCE_BOOST_VALUES.budget;
    } else if (key === 'interests') {
      boost += CONFIDENCE_BOOST_VALUES.interests;
    } else if (key === 'relationship') {
      boost += CONFIDENCE_BOOST_VALUES.relationship;
    } else if (key === 'occasion') {
      boost += CONFIDENCE_BOOST_VALUES.occasion;
    } else if (key === 'recipient_age') {
      boost += CONFIDENCE_BOOST_VALUES.recipient_age;
    } else if (key === 'intent_priority') {
      boost += CONFIDENCE_BOOST_VALUES.intent_priority;
    } else if (key === 'gift_philosophy') {
      boost += CONFIDENCE_BOOST_VALUES.gift_philosophy;
    } else if (key === 'space_constraint') {
      boost += CONFIDENCE_BOOST_VALUES.space_constraint;
    } else if (key === 'urgency') {
      boost += CONFIDENCE_BOOST_VALUES.urgency;
    } else if (key.startsWith('refine_')) {
      boost += CONFIDENCE_BOOST_VALUES.refine;
    }
  });

  // Cap total boost at 0.5 (don't over-inflate)
  return Math.min(boost, 0.5);
}

// ============================================================================
// Natural Query Building
// ============================================================================

/**
 * Build natural language query with answers
 */
export function buildNaturalQuery(
  original: string,
  answers: Record<string, any>
): string {
  let query = original;

  // Append budget
  if (answers.budget) {
    query += `, budget $${answers.budget.min}-$${answers.budget.max}`;
  }

  // Append interests
  if (answers.interests) {
    query += `, interested in ${answers.interests}`;
  }

  // Append occasion
  if (answers.occasion && answers.occasion.name) {
    query += `, for ${answers.occasion.name}`;
  }

  // Append relationship
  if (answers.relationship) {
    query += `, ${answers.relationship}`;
  }

  // Append age
  if (answers.recipient_age) {
    query += `, age ${answers.recipient_age}`;
  }

  // Append refinements
  Object.entries(answers).forEach(([key, value]) => {
    if (key.startsWith('refine_')) {
      const interest = key.replace('refine_', '');
      query += `, specifically ${value} (refined from ${interest})`;
    }
  });

  return query;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate that answers correspond to asked questions
 */
export function validateAnswersMatchQuestions(
  answers: Record<string, any>,
  askedQuestions: string[]
): boolean {
  const answerKeys = Object.keys(answers);

  // Check that all answer keys correspond to asked questions
  for (const key of answerKeys) {
    if (!askedQuestions.includes(key)) {
      logger.warn('Answer provided for question that was not asked', {
        answerId: key,
        askedQuestions,
      });
      return false;
    }
  }

  return true;
}

/**
 * Extract changed fields from answer merge
 */
export function extractChangedFields(
  originalContext: ListenerOutput,
  enrichedContext: ListenerOutput
): string[] {
  const changed: string[] = [];

  // Budget
  if (
    JSON.stringify(originalContext.budget) !==
    JSON.stringify(enrichedContext.budget)
  ) {
    changed.push('budget');
  }

  // Interests
  if (
    JSON.stringify(originalContext.interests) !==
    JSON.stringify(enrichedContext.interests)
  ) {
    changed.push('interests');
  }

  // Recipient
  if (
    JSON.stringify(originalContext.recipient) !==
    JSON.stringify(enrichedContext.recipient)
  ) {
    changed.push('recipient');
  }

  // Occasion
  if (
    JSON.stringify(originalContext.occasion) !==
    JSON.stringify(enrichedContext.occasion)
  ) {
    changed.push('occasion');
  }

  // Confidence
  if (originalContext.confidence !== enrichedContext.confidence) {
    changed.push('confidence');
  }

  return changed;
}
